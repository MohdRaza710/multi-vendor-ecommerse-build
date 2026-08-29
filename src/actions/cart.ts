"use server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { cartItemSchema } from "@/validations/cart";

export async function addToCartAction(input: unknown) {
  const user = await requireAuth();
  const data = cartItemSchema.parse(input);
  const product = await prisma.product.findFirst({
    where: {
      id: data.productId,
      status: "PUBLISHED",
      seller: { status: "APPROVED" },
    },
    include: { inventory: true, variants: true },
  });
  if (!product) throw new Error("PRODUCT_NOT_FOUND");
  const variant = data.variantId
    ? product.variants.find((v) => v.id === data.variantId && v.isActive)
    : null;
  const available = variant
    ? variant.stock
    : (product.inventory?.quantity ?? 0) -
      (product.inventory?.reservedQuantity ?? 0);
  if (available < data.quantity) throw new Error("INSUFFICIENT_STOCK");
  const cart = await prisma.cart.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });
  const price = variant?.price ?? product.price;
  const existing = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId: data.productId,
      variantId: data.variantId ?? null,
    },
  });
  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: {
        quantity: Math.min(existing.quantity + data.quantity, available),
        price,
      },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: data.productId,
        variantId: data.variantId,
        quantity: data.quantity,
        price,
      },
    });
  }
}
