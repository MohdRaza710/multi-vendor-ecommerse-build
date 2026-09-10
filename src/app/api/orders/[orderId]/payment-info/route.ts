import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    try {
        const { orderId } = await params;
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                payment: { select: { status: true } },
                items: {
                    select: {
                        id: true,
                        productName: true,
                        sku: true,
                        quantity: true,
                        unitPrice: true,
                        totalPrice: true,
                    },
                },
                sellerGroups: {
                    include: {
                        seller: { select: { businessName: true } },
                    },
                },
            },
        });

        if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (order.userId !== user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        if (order.payment?.status === "PAID") return NextResponse.json({ error: "Already paid" }, { status: 400 });

        return NextResponse.json(order);
    } catch (err) {
        console.error("payment-info error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}