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

type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

const allowedStatuses: ReviewStatus[] = [
    "PENDING",
    "APPROVED",
    "REJECTED",
];

async function recalculateSellerRating(sellerId: string) {
    const result = await prisma.sellerReview.aggregate({
        where: {
            sellerId,
            status: "APPROVED",
        },
        _avg: {
            rating: true,
        },
    });

    // Seller model currently does not have a rating field,
    // so there is nothing to update here.
    //
    // We still calculate the value so this function can later
    // be extended if a rating field is added to Seller.
    return result._avg.rating ?? 0;
}

export async function updateSellerReviewStatus(
    formData: FormData,
) {
    const admin = await requireAdmin();

    const reviewId = String(formData.get("reviewId") ?? "");
    const status = String(formData.get("status") ?? "") as ReviewStatus;

    if (!reviewId) {
        throw new Error("Review ID is required");
    }

    if (!allowedStatuses.includes(status)) {
        throw new Error("Invalid review status");
    }

    const review = await prisma.sellerReview.findUnique({
        where: {
            id: reviewId,
        },
        include: {
            seller: {
                select: {
                    id: true,
                    businessName: true,
                },
            },
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    if (!review) {
        throw new Error("Seller review not found");
    }

    const previousStatus = review.status;

    if (previousStatus === status) {
        redirect(`/admin/sellers/${review.seller.id}`);
    }

    await prisma.$transaction([
        prisma.sellerReview.update({
            where: {
                id: reviewId,
            },
            data: {
                status,
            },
        }),

        prisma.auditLog.create({
            data: {
                userId: admin.id,
                action: "UPDATE_SELLER_REVIEW_STATUS",
                entityType: "SellerReview",
                entityId: review.id,
                metadata: {
                    sellerId: review.seller.id,
                    sellerName: review.seller.businessName,
                    reviewerId: review.user.id,
                    reviewerName: review.user.name,
                    previousStatus,
                    newStatus: status,
                    rating: review.rating,
                },
            },
        }),
    ]);

    await recalculateSellerRating(review.seller.id);

    revalidatePath("/admin/seller-reviews");
    revalidatePath(`/admin/sellers/${review.seller.id}`);

    redirect(`/admin/sellers/${review.seller.id}`);
}