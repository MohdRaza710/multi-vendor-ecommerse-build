import Link from "next/link";
import { Prisma, ReviewStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { updateSellerReviewStatus } from "@/actions/admin-seller-review";

interface SellerReviewsPageProps {
    searchParams: Promise<{
        search?: string;
        status?: string;
    }>;
}

function formatDate(date: Date) {
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(date);
}

function statusClass(status: ReviewStatus) {
    switch (status) {
        case "APPROVED":
            return "bg-green-100 text-green-700";

        case "REJECTED":
            return "bg-red-100 text-red-700";

        default:
            return "bg-yellow-100 text-yellow-700";
    }
}

export default async function SellerReviewsPage({
    searchParams,
}: SellerReviewsPageProps) {
    const params = await searchParams;

    const search = params.search?.trim() || "";
    const status = params.status || "";

    const reviews = await prisma.sellerReview.findMany({
        where: {
            ...(status
                ? {
                    status: status as ReviewStatus,
                }
                : {}),

            ...(search
                ? {
                    OR: [
                        {
                            comment: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                        {
                            seller: {
                                businessName: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                        },
                        {
                            user: {
                                name: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                        },
                        {
                            user: {
                                email: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                        },
                    ],
                }
                : {}),
        },

        orderBy: {
            createdAt: "desc",
        },

        include: {
            seller: {
                select: {
                    id: true,
                    businessName: true,
                    slug: true,
                    status: true,
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

    const stats = await prisma.sellerReview.groupBy({
        by: ["status"],
        _count: {
            _all: true,
        },
    });

    const statMap = Object.fromEntries(
        stats.map((item) => [
            item.status,
            item._count._all,
        ]),
    );

    return (
        <div className="space-y-8">
            {/* Header */}

            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Seller Reviews
                </h1>

                <p className="mt-2 text-sm text-black/50">
                    Moderate customer reviews submitted for sellers.
                </p>
            </div>

            {/* Stats */}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border bg-white p-5">
                    <p className="text-sm text-black/50">
                        Total Reviews
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                        {reviews.length}
                    </p>
                </div>

                <div className="rounded-2xl border bg-white p-5">
                    <p className="text-sm text-black/50">
                        Pending
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                        {statMap.PENDING ?? 0}
                    </p>
                </div>

                <div className="rounded-2xl border bg-white p-5">
                    <p className="text-sm text-black/50">
                        Approved
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                        {statMap.APPROVED ?? 0}
                    </p>
                </div>

                <div className="rounded-2xl border bg-white p-5">
                    <p className="text-sm text-black/50">
                        Rejected
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                        {statMap.REJECTED ?? 0}
                    </p>
                </div>
            </div>

            {/* Filters */}

            <form
                method="GET"
                className="flex flex-col gap-3 rounded-2xl border bg-white p-4 md:flex-row"
            >
                <input
                    type="text"
                    name="search"
                    defaultValue={search}
                    placeholder="Search seller or customer..."
                    className="h-11 flex-1 rounded-xl border px-4 outline-none focus:ring-2 focus:ring-black/10"
                />

                <select
                    name="status"
                    defaultValue={status}
                    className="h-11 rounded-xl border px-4 outline-none"
                >
                    <option value="">
                        All statuses
                    </option>

                    <option value="PENDING">
                        Pending
                    </option>

                    <option value="APPROVED">
                        Approved
                    </option>

                    <option value="REJECTED">
                        Rejected
                    </option>
                </select>

                <button
                    type="submit"
                    className="h-11 rounded-xl bg-black px-5 text-sm font-medium text-white"
                >
                    Filter
                </button>

                <Link
                    href="/admin/seller-reviews"
                    className="flex h-11 items-center justify-center rounded-xl border px-5 text-sm font-medium hover:bg-black/[0.03]"
                >
                    Reset
                </Link>
            </form>

            {/* Reviews */}

            <section className="overflow-hidden rounded-2xl border bg-white">
                <div className="divide-y">
                    {reviews.map((review) => (
                        <article
                            key={review.id}
                            className="p-6"
                        >
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                {/* Review information */}

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <Link
                                            href={`/admin/sellers/${review.seller.id}`}
                                            className="font-semibold hover:underline"
                                        >
                                            {review.seller.businessName}
                                        </Link>

                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                                review.status,
                                            )}`}
                                        >
                                            {review.status}
                                        </span>
                                    </div>

                                    <div className="mt-3 flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05] text-sm font-bold">
                                            {review.user.name
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>

                                        <div>
                                            <p className="text-sm font-semibold">
                                                {review.user.name}
                                            </p>

                                            <p className="text-xs text-black/40">
                                                {review.user.email}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Rating */}

                                    <div className="mt-4">
                                        <span className="text-lg tracking-wide">
                                            {"★".repeat(review.rating)}
                                            {"☆".repeat(
                                                Math.max(0, 5 - review.rating),
                                            )}
                                        </span>

                                        <span className="ml-2 text-sm font-medium text-black/50">
                                            {review.rating}/5
                                        </span>
                                    </div>

                                    {/* Comment */}

                                    <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-black/70">
                                        {review.comment}
                                    </p>

                                    <p className="mt-4 text-xs text-black/40">
                                        Submitted {formatDate(review.createdAt)}
                                    </p>
                                </div>

                                {/* Actions */}

                                <div className="flex shrink-0 flex-wrap gap-2">
                                    {review.status !== "APPROVED" && (
                                        <form
                                            action={updateSellerReviewStatus}
                                        >
                                            <input
                                                type="hidden"
                                                name="reviewId"
                                                value={review.id}
                                            />

                                            <input
                                                type="hidden"
                                                name="status"
                                                value="APPROVED"
                                            />

                                            <button
                                                type="submit"
                                                className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-green-700"
                                            >
                                                Approve
                                            </button>
                                        </form>
                                    )}

                                    {review.status !== "REJECTED" && (
                                        <form
                                            action={updateSellerReviewStatus}
                                        >
                                            <input
                                                type="hidden"
                                                name="reviewId"
                                                value={review.id}
                                            />

                                            <input
                                                type="hidden"
                                                name="status"
                                                value="REJECTED"
                                            />

                                            <button
                                                type="submit"
                                                className="rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                                            >
                                                Reject
                                            </button>
                                        </form>
                                    )}

                                    {review.status !== "PENDING" && (
                                        <form
                                            action={updateSellerReviewStatus}
                                        >
                                            <input
                                                type="hidden"
                                                name="reviewId"
                                                value={review.id}
                                            />

                                            <input
                                                type="hidden"
                                                name="status"
                                                value="PENDING"
                                            />

                                            <button
                                                type="submit"
                                                className="rounded-lg border px-4 py-2 text-xs font-semibold transition hover:bg-black/[0.03]"
                                            >
                                                Set Pending
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}

                    {reviews.length === 0 && (
                        <div className="p-16 text-center">
                            <p className="font-semibold">
                                No seller reviews found
                            </p>

                            <p className="mt-1 text-sm text-black/50">
                                Try changing your search or filters.
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}