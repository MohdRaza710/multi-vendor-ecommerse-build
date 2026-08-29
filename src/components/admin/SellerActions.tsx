"use client";

import {
  approveSeller,
  rejectSeller,
  suspendSeller,
  reactivateSeller,
} from "@/actions/seller";
import { useTransition } from "react";

type Props = {
  sellerId: string;
  status: string;
};

export default function SellerActions({ sellerId, status }: Props) {
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      await action();
    });
  }

  if (status === "PENDING") {
    return (
      <div className="flex justify-end gap-2">
        <button
          disabled={pending}
          onClick={() => run(() => approveSeller(sellerId))}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          Approve
        </button>

        <button
          disabled={pending}
          onClick={() => run(() => rejectSeller(sellerId))}
          className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    );
  }

  if (status === "APPROVED") {
    return (
      <button
        disabled={pending}
        onClick={() => run(() => suspendSeller(sellerId))}
        className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        Suspend
      </button>
    );
  }

  if (status === "SUSPENDED" || status === "REJECTED") {
    return (
      <button
        disabled={pending}
        onClick={() => run(() => reactivateSeller(sellerId))}
        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        Reactivate
      </button>
    );
  }

  return null;
}