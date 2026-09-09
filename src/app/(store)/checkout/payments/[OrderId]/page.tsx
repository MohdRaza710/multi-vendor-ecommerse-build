import Link from "next/link";
import { redirect } from "next/navigation";

import { processMockPayment } from "@/actions/payment";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";

type PaymentPageProps = {
    params: Promise<{
        orderId: string;
    }>;
};

export default async function PaymentPage({
    params,
}: PaymentPageProps) {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/auth/login");
    }

    const { orderId } = await params;

    const order = await prisma.order.findFirst({
        where: {
            id: orderId,
            userId: user.id,
        },
        include: {
            payment: true,
            items: {
                include: {
                    product: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
    });

    if (!order) {
        redirect("/orders");
    }

    if (!order.payment) {
        redirect(`/orders/${order.id}`);
    }

    if (order.payment.status === "PAID") {
        redirect(`/orders/${order.id}`);
    }

    const totalAmount = Number(order.totalAmount);

    return (
        <main className="mx-auto max-w-2xl px-4 py-12 lg:px-6">
            {/* Header */}
            <div className="mb-8 text-center">
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Payment
                </p>

                <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                    Complete your payment
                </h1>

                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
                    Enter the exact amount shown below to confirm your order.
                </p>
            </div>

            {/* Payment Card */}
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                {/* Order Summary Header */}
                <div className="bg-slate-950 p-7 text-white">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                                Order number
                            </p>

                            <p className="mt-1 text-lg font-semibold">
                                {order.orderNumber}
                            </p>
                        </div>

                        <span className="inline-flex w-fit rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
                            Payment Pending
                        </span>
                    </div>

                    <div className="mt-7 border-t border-white/10 pt-6">
                        <p className="text-sm text-slate-400">
                            Amount to pay
                        </p>

                        <p className="mt-1 text-4xl font-bold tracking-tight">
                            {money(totalAmount)}
                        </p>

                        <p className="mt-2 text-sm text-slate-400">
                            Currency: {order.currency}
                        </p>
                    </div>
                </div>

                {/* Payment Form */}
                <div className="p-7">
                    {/* Exact Amount Notice */}
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                        <p className="font-semibold text-blue-950">
                            Enter the exact order amount
                        </p>

                        <p className="mt-1 text-sm leading-6 text-blue-800">
                            To complete this mock payment, enter exactly:
                        </p>

                        <p className="mt-3 text-2xl font-bold text-blue-950">
                            {money(totalAmount)}
                        </p>
                    </div>

                    <form action={processMockPayment} className="mt-6 space-y-5">
                        {/* Order ID */}
                        <input
                            type="hidden"
                            name="orderId"
                            value={order.id}
                        />

                        <div>
                            <label
                                htmlFor="amount"
                                className="mb-2 block text-sm font-semibold text-slate-900"
                            >
                                Payment amount
                            </label>

                            <div className="relative">
                                <input
                                    id="amount"
                                    name="amount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    required
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-lg font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                                />
                            </div>

                            <p className="mt-2 text-xs leading-5 text-slate-500">
                                The amount must exactly match the order total.
                            </p>
                        </div>

                        <button
                            type="submit"
                            className="w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.99]"
                        >
                            Confirm Payment
                        </button>
                    </form>

                    {/* Mock Payment Information */}
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-sm font-semibold text-slate-900">
                            Mock payment
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-600">
                            This is a development payment system. No credit card
                            or external payment provider is required.
                        </p>
                    </div>

                    {/* Back to Order */}
                    <div className="mt-6 text-center">
                        <Link
                            href={`/orders/${order.id}`}
                            className="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
                        >
                            ← View order
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}