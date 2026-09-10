import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    const { orderId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { payment: true },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.userId !== user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    if (order.payment?.status === "PAID") return NextResponse.json({ error: "Already paid" }, { status: 400 });

    if (order.payment) {
        await prisma.payment.update({
            where: { id: order.payment.id },
            data: { status: "PAID" },  // removed paidAt
        });
    } else {
        await prisma.payment.create({
            data: {
                orderId: order.id,
                provider: "MOCK",
                status: "PAID",
                amount: order.totalAmount,
                currency: order.currency,
                // removed paidAt
            },
        });
    } 

    await prisma.order.update({
        where: { id: order.id },
        data: { status: "CONFIRMED" },
    });

    return NextResponse.json({ success: true });
}