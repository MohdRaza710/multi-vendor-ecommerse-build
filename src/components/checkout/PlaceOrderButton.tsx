"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { placeOrder } from "@/actions/order";

export default function PlaceOrderButton() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");

    function handlePlaceOrder() {
        setError("");
        startTransition(async () => {
            try {
                const result = await placeOrder();
                if (result?.orderId) {
                    router.push(`/checkout/payments/${result.orderId}`);
                }
            } catch (err: unknown) {
                const message =
                    err instanceof Error
                        ? err.message
                        : "Something went wrong. Please try again.";
                setError(message);
            }
        });
    }

    return (
        <div>
            {error && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                    <p className="text-sm font-semibold text-red-400">
                        ❌ {error}
                    </p>
                </div>
            )}
            <button
                onClick={handlePlaceOrder}
                disabled={isPending}
                className="w-full rounded-xl bg-white py-3.5 font-black text-slate-950 transition hover:bg-slate-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isPending ? "Placing order…" : "Place order"}
            </button>
        </div>
    );
}