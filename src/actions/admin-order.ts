"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
    OrderStatus,
    PaymentStatus,
} from "@prisma/client";

async function requireAdmin() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/auth/login");
    }

    if (user.role !== "ADMIN") {
        throw new Error("FORBIDDEN");
    }

    return user;
}

/* --------------------------------------------------
   ORDER STATUS
-------------------------------------------------- */

export async function updateAdminOrderStatus(
    formData: FormData
) {
    const admin = await requireAdmin();

    const orderId = String(
        formData.get("orderId") || ""
    );

    const status = String(
        formData.get("status") || ""
    );

    if (!orderId) {
        throw new Error("Order ID is required.");
    }

    if (
        !Object.values(OrderStatus).includes(
            status as OrderStatus
        )
    ) {
        throw new Error("Invalid order status.");
    }

    const newStatus = status as OrderStatus;

    await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
            where: {
                id: orderId,
            },
            select: {
                id: true,
                orderNumber: true,
                userId: true,
                status: true,
            },
        });

        if (!order) {
            throw new Error("Order not found.");
        }

        // Update main order
        await tx.order.update({
            where: {
                id: orderId,
            },
            data: {
                status: newStatus,
            },
        });

        /*
         * Synchronize seller orders.
         *
         * We intentionally don't overwrite DELIVERED,
         * CANCELLED or REFUNDED seller orders when an
         * admin changes another general order status.
         */
        await tx.sellerOrder.updateMany({
            where: {
                orderId,
                status: {
                    notIn: [
                        "DELIVERED",
                        "CANCELLED",
                        "REFUNDED",
                    ],
                },
            },
            data: {
                status: newStatus,
            },
        });

        // Add permanent timeline event
        await tx.orderTimeline.create({
            data: {
                orderId,
                status: newStatus,
                title: getOrderStatusTitle(newStatus),
                message: getOrderStatusMessage(
                    newStatus
                ),
            },
        });

        // Customer notification
        await tx.notification.create({
            data: {
                userId: order.userId,
                type: getNotificationType(
                    newStatus
                ),
                title: `Order ${newStatus.toLowerCase()}`,
                message:
                    `Your order ${order.orderNumber} is now ${formatStatus(
                        newStatus
                    )}.`,
            },
        });

        // Admin audit log
        await tx.auditLog.create({
            data: {
                userId: admin.id,
                action: "UPDATE_ORDER_STATUS",
                entityType: "ORDER",
                entityId: orderId,
                metadata: {
                    previousStatus: order.status,
                    newStatus,
                },
            },
        });
    });

    redirect(`/admin/orders/${orderId}`);
}

/* --------------------------------------------------
   PAYMENT STATUS
-------------------------------------------------- */

export async function updateAdminPaymentStatus(
    formData: FormData
) {
    const admin = await requireAdmin();

    const orderId = String(
        formData.get("orderId") || ""
    );

    const status = String(
        formData.get("status") || ""
    );

    if (!orderId) {
        throw new Error("Order ID is required.");
    }

    if (
        !Object.values(PaymentStatus).includes(
            status as PaymentStatus
        )
    ) {
        throw new Error("Invalid payment status.");
    }

    const newStatus = status as PaymentStatus;

    await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
            where: {
                id: orderId,
            },
            select: {
                id: true,
                orderNumber: true,
                userId: true,
            },
        });

        if (!order) {
            throw new Error("Order not found.");
        }

        const payment =
            await tx.payment.findUnique({
                where: {
                    orderId,
                },
            });

        if (!payment) {
            throw new Error(
                "Payment record not found."
            );
        }

        await tx.payment.update({
            where: {
                orderId,
            },
            data: {
                status: newStatus,
            },
        });

        // Timeline event
        await tx.orderTimeline.create({
            data: {
                orderId,
                status: `PAYMENT_${newStatus}`,
                title: getPaymentTitle(newStatus),
                message:
                    getPaymentMessage(newStatus),
            },
        });

        // Customer notification
        await tx.notification.create({
            data: {
                userId: order.userId,
                type: "ORDER",
                title: getPaymentTitle(newStatus),
                message:
                    getPaymentMessage(newStatus),
            },
        });

        // Audit log
        await tx.auditLog.create({
            data: {
                userId: admin.id,
                action: "UPDATE_PAYMENT_STATUS",
                entityType: "PAYMENT",
                entityId: payment.id,
                metadata: {
                    previousStatus: payment.status,
                    newStatus,
                    orderId,
                },
            },
        });
    });

    redirect(`/admin/orders/${orderId}`);
}

/* --------------------------------------------------
   HELPERS
-------------------------------------------------- */

function formatStatus(
    status: OrderStatus
) {
    return status
        .toLowerCase()
        .replace("_", " ")
        .replace(/\b\w/g, (char) =>
            char.toUpperCase()
        );
}

function getOrderStatusTitle(
    status: OrderStatus
) {
    switch (status) {
        case "PENDING":
            return "Order placed";

        case "CONFIRMED":
            return "Order confirmed";

        case "PROCESSING":
            return "Order is being processed";

        case "SHIPPED":
            return "Order shipped";

        case "DELIVERED":
            return "Order delivered";

        case "CANCELLED":
            return "Order cancelled";

        case "REFUNDED":
            return "Order refunded";

        default:
            return "Order status updated";
    }
}

function getOrderStatusMessage(
    status: OrderStatus
) {
    switch (status) {
        case "PENDING":
            return "Your order has been placed and is waiting for confirmation.";

        case "CONFIRMED":
            return "Your order has been confirmed.";

        case "PROCESSING":
            return "Your order is currently being prepared.";

        case "SHIPPED":
            return "Your order has been shipped.";

        case "DELIVERED":
            return "Your order has been delivered.";

        case "CANCELLED":
            return "Your order has been cancelled.";

        case "REFUNDED":
            return "Your order has been refunded.";

        default:
            return "Your order status has been updated.";
    }
}

function getPaymentTitle(
    status: PaymentStatus
) {
    switch (status) {
        case "PENDING":
            return "Payment pending";

        case "PAID":
            return "Payment successful";

        case "FAILED":
            return "Payment failed";

        case "REFUNDED":
            return "Payment refunded";

        default:
            return "Payment status updated";
    }
}

function getPaymentMessage(
    status: PaymentStatus
) {
    switch (status) {
        case "PENDING":
            return "Your payment is currently pending.";

        case "PAID":
            return "Your payment has been successfully received.";

        case "FAILED":
            return "Your payment could not be completed.";

        case "REFUNDED":
            return "Your payment has been refunded.";

        default:
            return "Your payment status has been updated.";
    }
}

function getNotificationType(
    status: OrderStatus
) {
    switch (status) {
        case "CONFIRMED":
            return "CONFIRMED" as const;

        case "SHIPPED":
            return "SHIPPED" as const;

        case "DELIVERED":
            return "DELIVERED" as const;

        default:
            return "ORDER" as const;
    }
}