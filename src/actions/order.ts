"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

export async function placeOrder() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  // --------------------------------------------------
  // Get customer's cart
  // --------------------------------------------------

  const cart = await prisma.cart.findUnique({
    where: {
      userId: user.id,
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              seller: true,
              inventory: true,
            },
          },
          variant: true,
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    redirect("/cart");
  }

  // --------------------------------------------------
  // Basic validation
  // --------------------------------------------------

  for (const item of cart.items) {
    const product = item.product;

    if (product.status !== "PUBLISHED") {
      throw new Error(
        `Product "${product.name}" is no longer available.`
      );
    }

    if (!product.seller || product.seller.status !== "APPROVED") {
      throw new Error(
        `Seller for "${product.name}" is no longer available.`
      );
    }

    if (item.quantity <= 0) {
      throw new Error(
        `Invalid quantity for "${product.name}".`
      );
    }

    if (!product.inventory) {
      throw new Error(
        `Product "${product.name}" is currently out of stock.`
      );
    }

    const availableStock =
      product.inventory.quantity -
      product.inventory.reservedQuantity;

    if (availableStock < item.quantity) {
      throw new Error(
        `Not enough stock available for "${product.name}". Available: ${availableStock}.`
      );
    }
  }

  // --------------------------------------------------
  // Calculate order totals
  // --------------------------------------------------

  const subtotal = cart.items.reduce(
    (sum, item) =>
      sum + Number(item.price) * item.quantity,
    0
  );

  const shippingAmount = 0;
  const discountAmount = 0;
  const taxAmount = 0;

  const totalAmount =
    subtotal +
    shippingAmount +
    taxAmount -
    discountAmount;

  // --------------------------------------------------
  // Generate order number
  // --------------------------------------------------

  const orderNumber = `MVE-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase()}`;

  // --------------------------------------------------
  // Create order transaction
  // --------------------------------------------------

  const order = await prisma.$transaction(async (tx) => {
    // ----------------------------------------------
    // Group cart items by seller
    // ----------------------------------------------

    const sellerGroups = new Map<
      string,
      typeof cart.items
    >();

    for (const item of cart.items) {
      const sellerId = item.product.sellerId;

      const existingItems =
        sellerGroups.get(sellerId) ?? [];

      existingItems.push(item);

      sellerGroups.set(
        sellerId,
        existingItems
      );
    }

    // ----------------------------------------------
    // Create main order
    // ----------------------------------------------

    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        userId: user.id,

        status: "PENDING",

        subtotal: new Prisma.Decimal(subtotal),

        shippingAmount: new Prisma.Decimal(
          shippingAmount
        ),

        discountAmount: new Prisma.Decimal(
          discountAmount
        ),

        taxAmount: new Prisma.Decimal(
          taxAmount
        ),

        totalAmount: new Prisma.Decimal(
          totalAmount
        ),

        currency: "USD",
      },
    });

    // ----------------------------------------------
    // Create seller orders
    // ----------------------------------------------

    for (const [
      sellerId,
      items,
    ] of sellerGroups.entries()) {
      const sellerSubtotal = items.reduce(
        (sum, item) =>
          sum +
          Number(item.price) * item.quantity,
        0
      );

      // Get current seller information
      const seller = await tx.seller.findUnique({
        where: {
          id: sellerId,
        },

        select: {
          id: true,
          commissionRate: true,
          status: true,
        },
      });

      if (!seller) {
        throw new Error("Seller not found.");
      }

      if (seller.status !== "APPROVED") {
        throw new Error(
          "Seller is not approved."
        );
      }

      // --------------------------------------------
      // Commission calculation
      // --------------------------------------------

      const commissionRate =
        Number(seller.commissionRate);

      const commissionAmount =
        sellerSubtotal *
        (commissionRate / 100);

      const sellerTotal =
        sellerSubtotal -
        commissionAmount;

      // --------------------------------------------
      // Create SellerOrder
      // --------------------------------------------

      const sellerOrder =
        await tx.sellerOrder.create({
          data: {
            orderId: newOrder.id,

            sellerId: seller.id,

            status: "PENDING",

            subtotal:
              new Prisma.Decimal(
                sellerSubtotal
              ),

            commission:
              new Prisma.Decimal(
                commissionAmount
              ),

            sellerTotal:
              new Prisma.Decimal(
                sellerTotal
              ),
          },
        });

      // --------------------------------------------
      // Create OrderItems
      // --------------------------------------------

      for (const item of items) {
        const itemTotal =
          Number(item.price) *
          item.quantity;

        const itemCommission =
          itemTotal *
          (commissionRate / 100);

        const itemSellerAmount =
          itemTotal -
          itemCommission;

        const orderItem =
          await tx.orderItem.create({
            data: {
              orderId:
                newOrder.id,

              sellerOrderId:
                sellerOrder.id,

              productId:
                item.productId,

              variantId:
                item.variantId ?? null,

              productName:
                item.product.name,

              sku:
                item.variant?.sku ??
                item.product.sku,

              quantity:
                item.quantity,

              unitPrice:
                new Prisma.Decimal(
                  item.price
                ),

              totalPrice:
                new Prisma.Decimal(
                  itemTotal
                ),
            },
          });

        // ------------------------------------------
        // Create Commission
        // ------------------------------------------

        await tx.commission.create({
          data: {
            orderId:
              newOrder.id,

            sellerId:
              seller.id,

            orderItemId:
              orderItem.id,

            grossAmount:
              new Prisma.Decimal(
                itemTotal
              ),

            commissionRate:
              new Prisma.Decimal(
                commissionRate
              ),

            commissionAmount:
              new Prisma.Decimal(
                itemCommission
              ),

            sellerAmount:
              new Prisma.Decimal(
                itemSellerAmount
              ),
          },
        });

        // ------------------------------------------
        // ATOMIC INVENTORY UPDATE
        // ------------------------------------------
        //
        // This prevents overselling when multiple
        // customers order the same product at once.
        //
        // We only decrement if enough stock exists.
        // ------------------------------------------

        const updatedInventory =
          await tx.inventory.updateMany({
            where: {
              productId:
                item.productId,

              quantity: {
                gte: item.quantity,
              },
            },

            data: {
              quantity: {
                decrement:
                  item.quantity,
              },
            },
          });

        // If no inventory row was updated,
        // another order may have taken the stock.
        if (updatedInventory.count !== 1) {
          throw new Error(
            `Not enough stock available for "${item.product.name}".`
          );
        }

        // ------------------------------------------
        // Check remaining inventory
        // ------------------------------------------

        const remainingInventory =
          await tx.inventory.findUnique({
            where: {
              productId:
                item.productId,
            },

            select: {
              quantity: true,
            },
          });

        // Automatically mark product as OUT_OF_STOCK
        if (
          remainingInventory &&
          remainingInventory.quantity <= 0
        ) {
          await tx.product.update({
            where: {
              id: item.productId,
            },

            data: {
              status:
                "OUT_OF_STOCK",
            },
          });
        }
      }
    }

    // ----------------------------------------------
    // Create mock payment
    // ----------------------------------------------

    await tx.payment.create({
      data: {
        orderId:
          newOrder.id,

        provider:
          "MOCK",

        amount:
          new Prisma.Decimal(
            totalAmount
          ),

        currency:
          "USD",

        status:
          "PENDING",
      },
    });

    // ----------------------------------------------
    // Clear customer's cart
    // ----------------------------------------------

    await tx.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });

    // ----------------------------------------------
    // Create customer notification
    // ----------------------------------------------

    await tx.notification.create({
      data: {
        userId:
          user.id,

        type:
          "ORDER",

        title:
          "Order placed",

        message:
          `Your order ${orderNumber} has been placed successfully.`,

        readAt:
          null,
      },
    });

    return newOrder;
  });

  // ----------------------------------------------
  // Redirect to order page
  // ----------------------------------------------

  redirect(
    `/orders/${order.id}`
  );
}