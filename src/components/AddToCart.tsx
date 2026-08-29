"use client";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import AddToWishlist from "./product/AddToWishlist";
export default function AddToCart({
    productId,
    disabled,
}: {
    productId: string;
    disabled?: boolean;
}) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    async function add() {
        setLoading(true);
        setMessage("");
        const r = await fetch("/api/cart/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId, quantity: 1 }),
        });
        const d = await r.json();
        setLoading(false);
        setMessage(r.ok ? "Added to cart" : d.error?.message ?? "Unable to add");
    }

    return (
        <div className="mt-5">
            <button
                disabled={disabled || loading}
                onClick={add}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
                <ShoppingBag size={18} />
                {loading ? "Adding…" : disabled ? "Out of stock" : "Add to cart"}
            </button>   
            {message && (
                <p className="mt-2 text-center text-sm text-slate-500">{message}</p>
            )}
        </div>
    );
}
