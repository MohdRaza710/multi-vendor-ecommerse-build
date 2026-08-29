"use client";

import Link from "next/link";
import { deleteProduct } from "@/actions/product";
import { useTransition } from "react";

export default function ProductActions({
  productId,
}: {
  productId: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to archive this product?"
    );

    if (!confirmed) return;

    startTransition(async () => {
      await deleteProduct(productId);
    });
  }

  return (
    <div className="flex justify-end gap-2">
      <Link
        href={`/seller/products/${productId}/edit`}
        className="rounded-lg border px-3 py-2 text-xs font-bold hover:bg-slate-50"
      >
        Edit
      </Link>

      <button
        disabled={pending}
        onClick={handleDelete}
        className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        {pending ? "..." : "Delete"}
      </button>
    </div>
  );
}