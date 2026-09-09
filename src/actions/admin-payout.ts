"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  return user;
}

const allowedStatuses = [
  "PENDING",
  "PROCESSING",
  "PAID",
  "FAILED",
] as const;

type PayoutStatus = (typeof allowedStatuses)[number];

export async function updatePayoutStatus(formData: FormData) {
  const admin = await requireAdmin();

  const payoutId = String(formData.get("payoutId") ?? "");
  const nextStatus = String(formData.get("status") ?? "") as PayoutStatus;

  if (!payoutId) {
    throw new Error("Payout ID is required");
  }

  if (!allowedStatuses.includes(nextStatus)) {
    throw new Error("Invalid payout status");
  }

  const payout = await prisma.payout.findUnique({
    where: {
      id: payoutId,
    },
    include: {
      seller: {
        select: {
          id: true,
          businessName: true,
          userId: true,
        },
      },
    },
  });

  if (!payout) {
    throw new Error("Payout not found");
  }

  // Prevent modifying an already completed payout.
  if (payout.status === "PAID") {
    throw new Error("A paid payout cannot be modified");
  }

  // Validate status transitions.
  const validTransitions: Record<PayoutStatus, PayoutStatus[]> = {
    PENDING: ["PROCESSING", "FAILED"],
    PROCESSING: ["PAID", "FAILED"],
    FAILED: ["PROCESSING"],
    PAID: [],
  };

  if (!validTransitions[payout.status].includes(nextStatus)) {
    throw new Error(
      `Cannot change payout from ${payout.status} to ${nextStatus}`,
    );
  }

  const processedAt =
    nextStatus === "PAID" ? new Date() : payout.processedAt;

  await prisma.$transaction([
    prisma.payout.update({
      where: {
        id: payoutId,
      },
      data: {
        status: nextStatus,
        processedAt,
      },
    }),

    prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "UPDATE_PAYOUT_STATUS",
        entityType: "Payout",
        entityId: payout.id,
        metadata: {
          sellerId: payout.seller.id,
          sellerName: payout.seller.businessName,
          previousStatus: payout.status,
          newStatus: nextStatus,
          amount: payout.amount.toString(),
        },
      },
    }),
  ]);

  revalidatePath("/admin/payouts");
  revalidatePath(`/admin/sellers/${payout.seller.id}`);

  redirect(`/admin/sellers/${payout.seller.id}`);
}