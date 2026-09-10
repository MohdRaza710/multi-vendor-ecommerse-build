"use client";

import Link from "next/link";
import { use, useEffect, useState, useTransition } from "react";  // add `use`
import { useRouter } from "next/navigation";


interface OrderItem {
    id: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

interface SellerGroup {
    id: string;
    seller: { businessName: string };
}

interface Order {
    id: string;
    orderNumber: string;
    totalAmount: number;
    currency: string;
    userId: string;
    items: OrderItem[];
    sellerGroups: SellerGroup[];
    payment: { status: string } | null;
}

function money(amount: number | string) {
    return `$${Number(amount).toFixed(2)}`;
}

export default function PaymentPage({
    params,
}: {
    params: Promise<{ orderId: string }>;  // change to Promise
}) {
    const { orderId } = use(params);  // unwrap with use()
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [enteredAmount, setEnteredAmount] = useState("");
    const [error, setError] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        fetch(`/api/orders/${orderId}/payment-info`)
            .then(async (r) => {
                const text = await r.text();
                return text ? JSON.parse(text) : {};
            })
            .then((data) => {
                if (data.error) {
                    router.replace("/orders");
                } else {
                    setOrder(data);
                }
            })
            .catch((err) => {
                console.error("Failed to load payment info:", err);
                router.replace("/orders");
            })
            .finally(() => setLoading(false));
    }, [orderId, router]);

    function handlePay() {
        setError("");
        if (!order) return;

        const entered = parseFloat(enteredAmount);
        const required = Number(order.totalAmount);

        if (isNaN(entered) || entered <= 0) {
            setError("Please enter a valid amount.");
            return;
        }

        if (Math.abs(entered - required) > 0.001) {
            setError(
                `Payment declined. You entered ${money(entered)} but the order total is ${money(required)}. Please enter the exact amount.`
            );
            return;
        }

        startTransition(async () => {
            try {
                const res = await fetch(`/api/orders/${order.id}/confirm-payment`, {
                    method: "POST",
                });

                const text = await res.text();
                const data = text ? JSON.parse(text) : {};

                if (data.success) {
                    setShowSuccess(true);
                } else {
                    setError(data.error ?? "Payment failed. Please try again.");
                }
            } catch (err) {
                console.error(err);
                setError("Something went wrong. Please try again.");
            }
        });
    }

    if (loading) {
        return (
            <main className="mx-auto max-w-2xl px-4 py-24 text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
                <p className="mt-4 text-slate-500">Loading payment details…</p>
            </main>
        );
    }

    if (!order) return null;

    return (
        <main className="mx-auto max-w-2xl px-4 py-12 lg:px-6">
            {/* Success popup */}
            {showSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="mx-4 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
                            ✅
                        </div>
                        <h2 className="mt-5 text-2xl font-black text-slate-950">
                            Payment successful!
                        </h2>
                        <p className="mt-2 text-slate-500">
                            Your order{" "}
                            <span className="font-mono font-semibold text-slate-800">
                                {order.orderNumber}
                            </span>{" "}
                            has been confirmed.
                        </p>
                        <p className="mt-1 text-2xl font-black text-green-600">
                            {money(order.totalAmount)}
                        </p>
                        <button
                            onClick={() => router.push(`/orders/${order.id}`)}
                            className="mt-6 w-full rounded-xl bg-slate-950 py-3 font-bold text-white transition hover:bg-slate-800"
                        >
                            View order
                        </button>
                    </div>
                </div>
            )}

            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
                Payment
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                Complete payment
            </h1>
            <p className="mt-2 text-slate-500">
                Order{" "}
                <span className="font-mono font-semibold text-slate-800">
                    {order.orderNumber}
                </span>
            </p>

            {/* Order summary */}
            <section className="mt-8 rounded-2xl border bg-white p-6">
                <h2 className="font-bold text-slate-950">Order summary</h2>
                <ul className="mt-4 divide-y">
                    {order.items.map((item) => (
                        <li
                            key={item.id}
                            className="flex justify-between py-3 text-sm"
                        >
                            <div>
                                <p className="font-medium text-slate-900">
                                    {item.productName}
                                </p>
                                <p className="text-xs text-slate-500">
                                    SKU: {item.sku} · Qty: {item.quantity}
                                </p>
                            </div>
                            <span className="font-semibold text-slate-800">
                                {money(item.totalPrice)}
                            </span>
                        </li>
                    ))}
                </ul>
                <div className="mt-4 flex justify-between border-t pt-4 text-lg font-black text-slate-950">
                    <span>Total</span>
                    <span>{money(order.totalAmount)}</span>
                </div>
            </section>

            {/* Sellers */}
            {order.sellerGroups.length > 0 && (
                <section className="mt-4 rounded-2xl border bg-white p-6">
                    <h2 className="font-bold text-slate-950">Fulfilled by</h2>
                    <ul className="mt-3 space-y-1 text-sm text-slate-600">
                        {order.sellerGroups.map((g) => (
                            <li key={g.id}>· {g.seller.businessName}</li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Payment input */}
            <section className="mt-6 rounded-2xl bg-slate-950 p-6 text-white">
                <h2 className="font-bold">Enter payment amount</h2>
                <p className="mt-1 text-sm text-slate-400">
                    Enter the exact order total to confirm your payment.
                </p>

                <div className="mt-5">
                    <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Amount (USD)
                    </label>
                    <div className="mt-2 flex items-center rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
                        <span className="mr-2 text-lg font-bold text-slate-400">
                            $
                        </span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={Number(order.totalAmount).toFixed(2)}
                            value={enteredAmount}
                            onChange={(e) => {
                                setEnteredAmount(e.target.value);
                                setError("");
                            }}
                            className="flex-1 bg-transparent text-lg font-mono text-white outline-none placeholder:text-slate-600"
                        />
                    </div>
                </div>

                {error && (
                    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                        <p className="text-sm font-semibold text-red-400">
                            ❌ {error}
                        </p>
                    </div>
                )}

                <button
                    onClick={handlePay}
                    disabled={isPending || !enteredAmount}
                    className="mt-6 w-full rounded-xl bg-white py-3 font-bold text-slate-950 transition hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPending ? "Processing…" : `Pay ${money(order.totalAmount)}`}
                </button>
            </section>

            <p className="mt-4 text-center text-sm text-slate-400">
                <Link
                    href="/orders"
                    className="underline underline-offset-2 hover:text-slate-300"
                >
                    Cancel and view orders
                </Link>
            </p>
        </main>
    );
}