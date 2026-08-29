"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

export default function AddToWishlist({
  productId,
  initialWishlisted = false,
}: {
  productId: string;
  initialWishlisted?: boolean;
}) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function toggleWishlist() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/wishlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error?.message ?? "Unable to update wishlist.");
        return;
      }

      setWishlisted(data.wishlisted);
      setMessage(data.message);
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={toggleWishlist}
        disabled={loading}
        aria-label={
          wishlisted ? "Remove from wishlist" : "Add to wishlist"
        }
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Heart
          size={18}
          className={wishlisted ? "fill-red-500 text-red-500" : ""}
        />

        {loading
          ? "Updating..."
          : wishlisted
            ? "In wishlist"
            : "Add to wishlist"}
      </button>

      {message && (
        <p className="mt-2 text-center text-sm text-slate-500">
          {message}
        </p>
      )}
    </div>
  );
}