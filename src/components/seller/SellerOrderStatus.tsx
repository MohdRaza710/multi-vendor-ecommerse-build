"use client";

import { useState, useTransition } from "react";
import { updateSellerOrderStatus } from "@/actions/seller";

type Props = {
  sellerOrderId: string;
  currentStatus: string;
};

const statuses = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export default function SellerOrderStatus({
  sellerOrderId,
  currentStatus,
}: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function handleUpdate() {
    setMessage("");

    const formData = new FormData();

    // IMPORTANT:
    // This must be the actual string ID.
    formData.append("sellerOrderId", sellerOrderId);
    formData.append("status", status);

    startTransition(async () => {
      try {
        await updateSellerOrderStatus(formData);
        setMessage("Order status updated successfully.");
      } catch (error) {
        console.error(error);
        setMessage("Unable to update order status.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        disabled={isPending}
        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-slate-950"
      >
        {statuses.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={handleUpdate}
        disabled={isPending || status === currentStatus}
        className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? "Updating..." : "Update Status"}
      </button>

      {message && (
        <p className="text-sm font-medium text-slate-500">
          {message}
        </p>
      )}
    </div>
  );
}