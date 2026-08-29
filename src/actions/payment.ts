"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

export async function processMockPayment(formData: FormData) {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/auth/login");
    }

    const orderId = formData.get("orderId");

    if (typeof orderId !== "string" || !orderId) {
        throw new Error("Invalid order.");
    }

    // --------------------------------------------------
    // Find order belonging to current customer
    // --------------------------------------------------

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
        throw new Error("Payment record not found.");
    }

    // --------------------------------------------------
    // Prevent duplicate payment
    // --------------------------------------------------

    if (order.payment.status === "PAID") {
        redirect(`/orders/${order.id}`);
    }

    // --------------------------------------------------
    // Mock payment processing
    // --------------------------------------------------

    const transactionId = `MOCK-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

    await prisma.$transaction(async (tx) => {
        // ----------------------------------------------
        // Mark payment as PAID
        // ----------------------------------------------

        await tx.payment.update({
            where: {
                id: order.payment!.id,
            },

            data: {
                status: "PAID",

                transactionId,

                amount: new Prisma.Decimal(
                    order.totalAmount
                ),

                currency: order.currency,

                provider: "MOCK",
            },
        });

        // ----------------------------------------------
        // Confirm main order
        // ----------------------------------------------

        await tx.order.update({
            where: {
                id: order.id,
            },

            data: {
                status: "CONFIRMED",
            },
        });

        // ----------------------------------------------
        // Confirm seller orders
        // ----------------------------------------------

        await tx.sellerOrder.updateMany({
            where: {
                orderId: order.id,

                status: "PENDING",
            },

            data: {
                status: "CONFIRMED",
            },
        });

        // ----------------------------------------------
        // Customer notification
        // ----------------------------------------------

        await tx.notification.create({
            data: {
                userId: user.id,

                type: "CONFIRMED",

                title: "Payment successful",

                message:
                    `Payment for order ${order.orderNumber} was successful.`,

                readAt: null,
            },
        });
    });

    redirect(`/orders/${order.id}`);
}