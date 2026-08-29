import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/errors";
import { randomBytes } from "node:crypto";

export async function GET() { try { const user = await requireAuth(); const orders = await prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { items: true, sellerGroups: { include: { seller: { select: { businessName: true, slug: true } } } }, payment: true } }); return apiSuccess(orders); } catch (e) { return apiError("UNAUTHORIZED", "Please log in first.", 401); } }

export async function POST() {
  try {
    const user = await requireAuth();
    const cart = await prisma.cart.findUnique({ where: { userId: user.id }, include: { items: { include: { product: { include: { inventory: true, seller: true } }, variant: true } } } });
    if (!cart || cart.items.length === 0) return apiError("EMPTY_CART", "Your cart is empty.");
    const order = await prisma.$transaction(async tx => {
      const grouped = new Map<string, typeof cart.items>();
      for (const item of cart.items) { const list = grouped.get(item.product.sellerId) ?? []; list.push(item); grouped.set(item.product.sellerId, list); }
      let subtotal = 0;
      const sellerTotals = new Map<string, number>();
      for (const item of cart.items) { const available = item.variant ? item.variant.stock : (item.product.inventory?.quantity ?? 0) - (item.product.inventory?.reservedQuantity ?? 0); if (available < item.quantity) throw new Error(`INSUFFICIENT_STOCK:${item.product.name}`); subtotal += Number(item.price) * item.quantity; sellerTotals.set(item.product.sellerId, (sellerTotals.get(item.product.sellerId) ?? 0) + Number(item.price) * item.quantity); }
      const created = await tx.order.create({ data: { userId: user.id, orderNumber: `MVE-${Date.now()}-${randomBytes(2).toString("hex").toUpperCase()}`, subtotal, totalAmount: subtotal, payment: { create: { provider: "mock", amount: subtotal, status: "PAID" } } } });
      for (const [sellerId, items] of grouped) {
        const seller = await tx.seller.findUniqueOrThrow({ where: { id: sellerId } });
        const sellerSubtotal = sellerTotals.get(sellerId)!;
        const commission = sellerSubtotal * Number(seller.commissionRate) / 100;
        const group = await tx.sellerOrder.create({ data: { orderId: created.id, sellerId, subtotal: sellerSubtotal, commission, sellerTotal: sellerSubtotal - commission } });
        for (const item of items) {
          await tx.orderItem.create({ data: { orderId: created.id, sellerOrderId: group.id, productId: item.productId, variantId: item.variantId, productName: item.product.name, sku: item.variant?.sku ?? item.product.sku, quantity: item.quantity, unitPrice: item.price, totalPrice: Number(item.price) * item.quantity } });
          if (item.variantId) await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { decrement: item.quantity } } });
          else await tx.inventory.update({ where: { productId: item.productId }, data: { quantity: { decrement: item.quantity } } });
        }
      }
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    });
    return apiSuccess(order, 201);
  } catch (e) { const message = e instanceof Error ? e.message : "Unable to create order"; return apiError(message.startsWith("INSUFFICIENT_STOCK") ? "INSUFFICIENT_STOCK" : "ORDER_CREATE_FAILED", message.replace("INSUFFICIENT_STOCK:", ""), 400); }
}
