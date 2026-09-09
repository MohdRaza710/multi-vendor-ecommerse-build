"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function processMockPayment(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const orderId = formData.get("orderId");
  const amount = formData.get("amount");

  if (typeof orderId !== "string" || !orderId.trim()) {
    throw new Error("Invalid order.");
  }

  if (typeof amount !== "string" || !amount.trim()) {
    throw new Error("Please enter the payment amount.");
  }

  let enteredAmount: Prisma.Decimal;

  try {
    enteredAmount = new Prisma.Decimal(amount.trim());
  } catch {
    throw new Error("Invalid payment amount.");
  }

  if (!enteredAmount.isFinite()) {
    throw new Error("Invalid payment amount.");
  }

  if (enteredAmount.isNegative()) {
    throw new Error("Payment amount cannot be negative.");
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: user.id,
    },
    include: {
      payment: true,
    },
  });

  if (!order) {
    throw new Error("Order not found.");
  }

  if (!order.payment) {
    throw new Error("Payment record not found for this order.");
  }

  // If payment has already been completed, simply open the order.
  if (order.payment.status === "PAID") {
    redirect(`/orders/${order.id}`);
  }

  // Only pending orders can be paid through this mock payment flow.
  if (order.status !== "PENDING") {
    throw new Error(
      `This order cannot be paid because its current status is ${order.status}.`,
    );
  }

  if (order.payment.status !== "PENDING") {
    throw new Error(
      `This payment cannot be processed because its current status is ${order.payment.status}.`,
    );
  }

  // Compare Decimal values directly.
  // This avoids JavaScript floating-point problems with money.
  if (!enteredAmount.eq(order.totalAmount)) {
    throw new Error(
      `Payment amount must exactly match ${order.totalAmount.toFixed(2)} ${order.currency}.`,
    );
  }

  const transactionId = `MOCK-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase()}`;

  await prisma.$transaction(async (tx) => {
    // Update the payment only if it is still pending.
    // This prevents the same payment from being processed twice
    // by simultaneous requests.
    const paymentUpdate = await tx.payment.updateMany({
      where: {
        id: order.payment!.id,
        status: "PENDING",
      },
      data: {
        status: "PAID",
        transactionId,
        amount: order.totalAmount,
        currency: order.currency,
        provider: "MOCK",
      },
    });

    if (paymentUpdate.count !== 1) {
      throw new Error("Payment has already been processed.");
    }

    // Confirm the main order.
    await tx.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: "CONFIRMED",
      },
    });

    // Confirm all seller orders belonging to this order.
    await tx.sellerOrder.updateMany({
      where: {
        orderId: order.id,
        status: "PENDING",
      },
      data: {
        status: "CONFIRMED",
      },
    });

    // Add an order timeline entry.
    await tx.orderTimeline.create({
      data: {
        orderId: order.id,
        status: "CONFIRMED",
        title: "Payment confirmed",
        message: `Mock payment of ${order.totalAmount.toFixed(2)} ${order.currency} was successfully confirmed.`,
      },
    });

    // Notify the customer.
    await tx.notification.create({
      data: {
        userId: user.id,
        type: "CONFIRMED",
        title: "Payment successful",
        message: `Your payment for order ${order.orderNumber} was successfully confirmed.`,
      },
    });
  });

  redirect(`/orders/${order.id}`);
}