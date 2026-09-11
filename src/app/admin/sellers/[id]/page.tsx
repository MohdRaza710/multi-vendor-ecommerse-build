import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { approveSellerForm, rejectSellerForm, suspendSellerForm, reactivateSellerForm } from "@/actions/seller";

import { prisma } from "@/lib/prisma";
import { updatePayoutStatus } from "@/actions/admin-payout";

interface SellerDetailPageProps {
    params: Promise<{
        id: string;
    }>;
}

function money(value: Prisma.Decimal | number | string | null | undefined) {
    return `$${Number(value ?? 0).toFixed(2)}`;
}

function sellerStatusClass(status: string) {
    switch (status) {
        case "APPROVED":
            return "bg-green-100 text-green-700";

        case "REJECTED":
            return "bg-red-100 text-red-700";

        case "SUSPENDED":
            return "bg-orange-100 text-orange-700";

        default:
            return "bg-yellow-100 text-yellow-700";
    }
}

function payoutStatusClass(status: string) {
    switch (status) {
        case "PAID":
            return "bg-green-100 text-green-700";

        case "PROCESSING":
            return "bg-blue-100 text-blue-700";

        case "FAILED":
            return "bg-red-100 text-red-700";

        default:
            return "bg-yellow-100 text-yellow-700";
    }
}

function orderStatusClass(status: string) {
    switch (status) {
        case "DELIVERED":
            return "bg-green-100 text-green-700";

        case "SHIPPED":
            return "bg-blue-100 text-blue-700";

        case "CANCELLED":
        case "REFUNDED":
            return "bg-red-100 text-red-700";

        case "PROCESSING":
            return "bg-purple-100 text-purple-700";

        case "CONFIRMED":
            return "bg-cyan-100 text-cyan-700";

        default:
            return "bg-yellow-100 text-yellow-700";
    }
}

function productStatusClass(status: string) {
    switch (status) {
        case "PUBLISHED":
            return "bg-green-100 text-green-700";

        case "OUT_OF_STOCK":
            return "bg-orange-100 text-orange-700";

        case "ARCHIVED":
            return "bg-gray-100 text-gray-600";

        default:
            return "bg-yellow-100 text-yellow-700";
    }
}

function formatDate(date: Date) {
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(date);
}

function formatDateTime(date: Date) {
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

export default async function AdminSellerDetailPage({
    params,
}: SellerDetailPageProps) {
    const { id } = await params;

    const seller = await prisma.seller.findUnique({
        where: {
            id,
        },

        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    avatar: true,
                    isActive: true,
                    emailVerified: true,
                    createdAt: true,
                    updatedAt: true,
                },
            },

            store: true,

            products: {
                orderBy: {
                    createdAt: "desc",
                },
                take: 8,
                include: {
                    category: {
                        select: {
                            name: true,
                        },
                    },
                    images: {
                        where: {
                            isPrimary: true,
                        },
                        take: 1,
                        select: {
                            url: true,
                            altText: true,
                        },
                    },
                    inventory: {
                        select: {
                            quantity: true,
                            reservedQuantity: true,
                            lowStockThreshold: true,
                        },
                    },
                    _count: {
                        select: {
                            reviews: true,
                            orderItems: true,
                        },
                    },
                },
            },

            orderGroups: {
                orderBy: {
                    createdAt: "desc",
                },
                take: 10,
                include: {
                    order: {
                        select: {
                            id: true,
                            orderNumber: true,
                            status: true,
                            totalAmount: true,
                            currency: true,
                            createdAt: true,
                            user: {
                                select: {
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                    },
                },
            },

            commissions: {
                orderBy: {
                    createdAt: "desc",
                },
                take: 100,
                select: {
                    id: true,
                    grossAmount: true,
                    commissionAmount: true,
                    sellerAmount: true,
                    commissionRate: true,
                    createdAt: true,
                },
            },

            payouts: {
                orderBy: {
                    createdAt: "desc",
                },
                take: 20,
                select: {
                    id: true,
                    amount: true,
                    status: true,
                    reference: true,
                    processedAt: true,
                    createdAt: true,
                },
            },

            sellerReviews: {
                orderBy: {
                    createdAt: "desc",
                },
                take: 10,
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
            },

            _count: {
                select: {
                    products: true,
                    orderGroups: true,
                    commissions: true,
                    payouts: true,
                    sellerReviews: true,
                    coupons: true,
                },
            },
        },
    });

    if (!seller) {
        notFound();
    }

    /*
     * Financial calculations
     */

    const totalGross = seller.commissions.reduce(
        (sum, commission) => sum + Number(commission.grossAmount),
        0,
    );

    const totalCommission = seller.commissions.reduce(
        (sum, commission) => sum + Number(commission.commissionAmount),
        0,
    );

    const totalSellerEarnings = seller.commissions.reduce(
        (sum, commission) => sum + Number(commission.sellerAmount),
        0,
    );

    const totalPaidOut = seller.payouts
        .filter((payout) => payout.status === "PAID")
        .reduce((sum, payout) => sum + Number(payout.amount), 0);

    const pendingPayout = seller.payouts
        .filter(
            (payout) =>
                payout.status === "PENDING" || payout.status === "PROCESSING",
        )
        .reduce((sum, payout) => sum + Number(payout.amount), 0);

    const availableBalance = Math.max(
        0,
        totalSellerEarnings - totalPaidOut - pendingPayout,
    );

    const averageRating =
        seller.sellerReviews.length > 0
            ? seller.sellerReviews.reduce(
                (sum, review) => sum + review.rating,
                0,
            ) / seller.sellerReviews.length
            : 0;

    return (
        <div className="space-y-8">
            {/* ========================================================= */}
            {/* HEADER */}
            {/* ========================================================= */}

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="mb-3 flex items-center gap-2 text-sm text-black/50">
                        <Link
                            href="/admin/sellers"
                            className="hover:text-black hover:underline"
                        >
                            Sellers
                        </Link>

                        <span>/</span>

                        <span>{seller.businessName}</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border bg-black/3 text-xl font-bold">
                            {seller.logo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={seller.logo}
                                    alt={seller.businessName}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                seller.businessName.charAt(0).toUpperCase()
                            )}
                        </div>

                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-3xl font-bold tracking-tight">
                                    {seller.businessName}
                                </h1>

                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${sellerStatusClass(
                                        seller.status,
                                    )}`}
                                >
                                    {seller.status}
                                </span>
                            </div>

                            <p className="mt-1 text-sm text-black/50">
                                @{seller.slug}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/admin/sellers"
                        className="rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:bg-black/3"
                    >
                        ← Back to Sellers
                    </Link>

                    {seller.store && (
                        <Link
                            href={`/store/${seller.store.slug}`}
                            target="_blank"
                            className="rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:bg-black/3"
                        >
                            View Store ↗
                        </Link>
                    )}

                    {(seller.status === "PENDING" || seller.status === "REJECTED") && (
                        <form action={approveSellerForm}>
                            <input type="hidden" name="sellerId" value={seller.id} />
                            <button
                                type="submit"
                                className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                            >
                                ✓ Approve
                            </button>
                        </form>
                    )}

                    {seller.status === "PENDING" && (
                        <form action={rejectSellerForm}>
                            <input type="hidden" name="sellerId" value={seller.id} />
                            <button
                                type="submit"
                                className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                            >
                                ✗ Reject
                            </button>
                        </form>
                    )}

                    {seller.status === "APPROVED" && (
                        <form action={suspendSellerForm}>
                            <input type="hidden" name="sellerId" value={seller.id} />
                            <button
                                type="submit"
                                className="rounded-xl border border-orange-200 px-4 py-2.5 text-sm font-semibold text-orange-600 transition hover:bg-orange-50"
                            >
                                ⊘ Suspend
                            </button>
                        </form>
                    )}

                    {seller.status === "SUSPENDED" && (
                        <form action={reactivateSellerForm}>
                            <input type="hidden" name="sellerId" value={seller.id} />
                            <button
                                type="submit"
                                className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                            >
                                ↺ Reactivate
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* ========================================================= */}
            {/* ACCOUNT / STORE OVERVIEW */}
            {/* ========================================================= */}

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Seller account */}
                <section className="rounded-2xl border bg-white p-6">
                    <div className="mb-5">
                        <h2 className="text-lg font-bold">Seller Account</h2>
                        <p className="mt-1 text-sm text-black/50">
                            Seller account and contact information.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-black/40">
                                Account Name
                            </p>
                            <p className="mt-1 font-medium">{seller.user.name}</p>
                        </div>

                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-black/40">
                                Email
                            </p>
                            <p className="mt-1 break-all font-medium">
                                {seller.user.email}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-black/40">
                                Phone
                            </p>
                            <p className="mt-1 font-medium">
                                {seller.user.phone || seller.phone || "Not provided"}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${seller.user.isActive
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                    }`}
                            >
                                {seller.user.isActive ? "Account Active" : "Account Disabled"}
                            </span>

                            <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${seller.user.emailVerified
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                                    }`}
                            >
                                {seller.user.emailVerified
                                    ? "Email Verified"
                                    : "Email Not Verified"}
                            </span>
                        </div>

                        <div className="border-t pt-4 text-xs text-black/50">
                            Joined {formatDate(seller.user.createdAt)}
                        </div>
                    </div>
                </section>

                {/* Store */}
                <section className="rounded-2xl border bg-white p-6">
                    <div className="mb-5">
                        <h2 className="text-lg font-bold">Store</h2>
                        <p className="mt-1 text-sm text-black/50">
                            Seller storefront information.
                        </p>
                    </div>

                    {seller.store ? (
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-black/40">
                                    Store Name
                                </p>
                                <p className="mt-1 font-medium">{seller.store.name}</p>
                            </div>

                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-black/40">
                                    Store Slug
                                </p>
                                <p className="mt-1 font-medium">
                                    /store/{seller.store.slug}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-black/40">
                                    Contact Email
                                </p>
                                <p className="mt-1">
                                    {seller.store.contactEmail || "Not provided"}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-black/40">
                                    Contact Phone
                                </p>
                                <p className="mt-1">
                                    {seller.store.contactPhone || "Not provided"}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${seller.store.isActive
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                        }`}
                                >
                                    {seller.store.isActive ? "Store Active" : "Store Inactive"}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-black/50">
                            This seller does not have a store yet.
                        </div>
                    )}
                </section>
            </div>

            {/* ========================================================= */}
            {/* FINANCIAL STATS */}
            {/* ========================================================= */}

            <section>
                <div className="mb-4">
                    <h2 className="text-xl font-bold">Financial Overview</h2>
                    <p className="mt-1 text-sm text-black/50">
                        Seller earnings and payout information.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-2xl border bg-white p-5">
                        <p className="text-sm text-black/50">Gross Sales</p>
                        <p className="mt-2 text-2xl font-bold">
                            {money(totalGross)}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-white p-5">
                        <p className="text-sm text-black/50">Commission</p>
                        <p className="mt-2 text-2xl font-bold">
                            {money(totalCommission)}
                        </p>

                        <p className="mt-1 text-xs text-black/40">
                            Rate: {Number(seller.commissionRate).toFixed(2)}%
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-white p-5">
                        <p className="text-sm text-black/50">Seller Earnings</p>
                        <p className="mt-2 text-2xl font-bold">
                            {money(totalSellerEarnings)}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-white p-5">
                        <p className="text-sm text-black/50">Paid Out</p>
                        <p className="mt-2 text-2xl font-bold">
                            {money(totalPaidOut)}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-white p-5">
                        <p className="text-sm text-black/50">Available Balance</p>
                        <p className="mt-2 text-2xl font-bold">
                            {money(availableBalance)}
                        </p>

                        {pendingPayout > 0 && (
                            <p className="mt-1 text-xs text-black/40">
                                {money(pendingPayout)} in pending payouts
                            </p>
                        )}
                    </div>
                </div>
            </section>

            {/* ========================================================= */}
            {/* SELLER STATS */}
            {/* ========================================================= */}

            <section>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="rounded-2xl border bg-white p-5">
                        <p className="text-sm text-black/50">Products</p>
                        <p className="mt-2 text-2xl font-bold">
                            {seller._count.products}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-white p-5">
                        <p className="text-sm text-black/50">Orders</p>
                        <p className="mt-2 text-2xl font-bold">
                            {seller._count.orderGroups}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-white p-5">
                        <p className="text-sm text-black/50">Reviews</p>
                        <p className="mt-2 text-2xl font-bold">
                            {seller._count.sellerReviews}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-white p-5">
                        <p className="text-sm text-black/50">Coupons</p>
                        <p className="mt-2 text-2xl font-bold">
                            {seller._count.coupons}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-white p-5">
                        <p className="text-sm text-black/50">Seller Rating</p>
                        <p className="mt-2 text-2xl font-bold">
                            {averageRating > 0
                                ? `${averageRating.toFixed(1)} / 5`
                                : "No rating"}
                        </p>
                    </div>
                </div>
            </section>

            {/* ========================================================= */}
            {/* PRODUCTS */}
            {/* ========================================================= */}

            <section className="rounded-2xl border bg-white">
                <div className="flex flex-col gap-3 border-b p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-bold">Products</h2>
                        <p className="mt-1 text-sm text-black/50">
                            Recently added products from this seller.
                        </p>
                    </div>

                    <span className="text-sm text-black/50">
                        {seller._count.products} total
                    </span>
                </div>

                <div className="divide-y">
                    {seller.products.map((product) => {
                        const stock =
                            product.inventory?.quantity ?? 0;

                        const reserved =
                            product.inventory?.reservedQuantity ?? 0;

                        const availableStock = Math.max(
                            0,
                            stock - reserved,
                        );

                        return (
                            <div
                                key={product.id}
                                className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between"
                            >
                                <div className="flex min-w-0 items-center gap-4">
                                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-black/[0.03]">
                                        {product.images[0]?.url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={product.images[0].url}
                                                alt={
                                                    product.images[0].altText ||
                                                    product.name
                                                }
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-xs text-black/30">
                                                No image
                                            </div>
                                        )}
                                    </div>

                                    <div className="min-w-0">
                                        <h3 className="truncate font-semibold">
                                            {product.name}
                                        </h3>

                                        <p className="mt-1 text-xs text-black/40">
                                            SKU: {product.sku}
                                        </p>

                                        <p className="mt-1 text-xs text-black/50">
                                            {product.category.name}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-6">
                                    <div>
                                        <p className="text-xs text-black/40">
                                            Price
                                        </p>
                                        <p className="font-semibold">
                                            {money(product.price)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-black/40">
                                            Stock
                                        </p>
                                        <p
                                            className={`font-semibold ${availableStock <=
                                                (product.inventory?.lowStockThreshold ?? 5)
                                                ? "text-orange-600"
                                                : ""
                                                }`}
                                        >
                                            {availableStock}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-black/40">
                                            Reviews
                                        </p>
                                        <p className="font-semibold">
                                            {product._count.reviews}
                                        </p>
                                    </div>

                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${productStatusClass(
                                            product.status,
                                        )}`}
                                    >
                                        {product.status}
                                    </span>

                                    <Link
                                        href={`/admin/products/${product.id}`}
                                        className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-black/[0.03]"
                                    >
                                        View
                                    </Link>
                                </div>
                            </div>
                        );
                    })}

                    {seller.products.length === 0 && (
                        <div className="p-12 text-center text-sm text-black/50">
                            This seller has no products yet.
                        </div>
                    )}
                </div>
            </section>

            {/* ========================================================= */}
            {/* RECENT ORDERS */}
            {/* ========================================================= */}

            <section className="rounded-2xl border bg-white">
                <div className="flex flex-col gap-3 border-b p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-bold">Recent Orders</h2>
                        <p className="mt-1 text-sm text-black/50">
                            Latest orders containing this seller&apos;s products.
                        </p>
                    </div>

                    <span className="text-sm text-black/50">
                        {seller._count.orderGroups} total orders
                    </span>
                </div>

                <div className="divide-y">
                    {seller.orderGroups.map((group) => (
                        <div
                            key={group.id}
                            className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between"
                        >
                            <div>
                                <Link
                                    href={`/admin/orders/${group.order.id}`}
                                    className="font-semibold hover:underline"
                                >
                                    #{group.order.orderNumber}
                                </Link>

                                <p className="mt-1 text-sm text-black/50">
                                    {group.order.user.name}
                                </p>

                                <p className="text-xs text-black/40">
                                    {group.order.user.email}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-6">
                                <div>
                                    <p className="text-xs text-black/40">
                                        Seller Subtotal
                                    </p>

                                    <p className="font-semibold">
                                        {money(group.subtotal)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-black/40">
                                        Seller Earnings
                                    </p>

                                    <p className="font-semibold">
                                        {money(group.sellerTotal)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-black/40">
                                        Date
                                    </p>

                                    <p className="text-sm">
                                        {formatDate(group.createdAt)}
                                    </p>
                                </div>

                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${orderStatusClass(
                                        group.status,
                                    )}`}
                                >
                                    {group.status}
                                </span>
                            </div>
                        </div>
                    ))}

                    {seller.orderGroups.length === 0 && (
                        <div className="p-12 text-center text-sm text-black/50">
                            This seller has no orders yet.
                        </div>
                    )}
                </div>
            </section>

            {/* ========================================================= */}
            {/* PAYOUTS */}
            {/* ========================================================= */}

            <section className="rounded-2xl border bg-white">
                <div className="flex flex-col gap-3 border-b p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-bold">Seller Payouts</h2>
                        <p className="mt-1 text-sm text-black/50">
                            Review and manage this seller&apos;s payout requests.
                        </p>
                    </div>

                    <Link
                        href="/admin/payouts"
                        className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-black/[0.03]"
                    >
                        View All Payouts
                    </Link>
                </div>

                <div className="divide-y">
                    {seller.payouts.map((payout) => (
                        <div
                            key={payout.id}
                            className="p-6"
                        >
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <p className="text-xl font-bold">
                                        {money(payout.amount)}
                                    </p>

                                    <p className="mt-1 text-sm text-black/50">
                                        Created {formatDateTime(payout.createdAt)}
                                    </p>

                                    {payout.processedAt && (
                                        <p className="mt-1 text-xs text-black/40">
                                            Processed{" "}
                                            {formatDateTime(payout.processedAt)}
                                        </p>
                                    )}

                                    {payout.reference && (
                                        <p className="mt-1 text-xs text-black/40">
                                            Reference: {payout.reference}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${payoutStatusClass(
                                            payout.status,
                                        )}`}
                                    >
                                        {payout.status}
                                    </span>

                                    {/* PENDING */}
                                    {payout.status === "PENDING" && (
                                        <>
                                            <form action={updatePayoutStatus}>
                                                <input
                                                    type="hidden"
                                                    name="payoutId"
                                                    value={payout.id}
                                                />

                                                <input
                                                    type="hidden"
                                                    name="status"
                                                    value="PROCESSING"
                                                />

                                                <button
                                                    type="submit"
                                                    className="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-black/80"
                                                >
                                                    Process
                                                </button>
                                            </form>

                                            <form action={updatePayoutStatus}>
                                                <input
                                                    type="hidden"
                                                    name="payoutId"
                                                    value={payout.id}
                                                />

                                                <input
                                                    type="hidden"
                                                    name="status"
                                                    value="FAILED"
                                                />

                                                <button
                                                    type="submit"
                                                    className="rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                                                >
                                                    Fail
                                                </button>
                                            </form>
                                        </>
                                    )}

                                    {/* PROCESSING */}
                                    {payout.status === "PROCESSING" && (
                                        <>
                                            <form action={updatePayoutStatus}>
                                                <input
                                                    type="hidden"
                                                    name="payoutId"
                                                    value={payout.id}
                                                />

                                                <input
                                                    type="hidden"
                                                    name="status"
                                                    value="PAID"
                                                />

                                                <button
                                                    type="submit"
                                                    className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-green-700"
                                                >
                                                    Mark Paid
                                                </button>
                                            </form>

                                            <form action={updatePayoutStatus}>
                                                <input
                                                    type="hidden"
                                                    name="payoutId"
                                                    value={payout.id}
                                                />

                                                <input
                                                    type="hidden"
                                                    name="status"
                                                    value="FAILED"
                                                />

                                                <button
                                                    type="submit"
                                                    className="rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                                                >
                                                    Fail
                                                </button>
                                            </form>
                                        </>
                                    )}

                                    {/* FAILED */}
                                    {payout.status === "FAILED" && (
                                        <form action={updatePayoutStatus}>
                                            <input
                                                type="hidden"
                                                name="payoutId"
                                                value={payout.id}
                                            />

                                            <input
                                                type="hidden"
                                                name="status"
                                                value="PROCESSING"
                                            />

                                            <button
                                                type="submit"
                                                className="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-black/80"
                                            >
                                                Retry
                                            </button>
                                        </form>
                                    )}

                                    {/* PAID */}
                                    {payout.status === "PAID" && (
                                        <span className="text-xs font-medium text-black/40">
                                            Completed
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {seller.payouts.length === 0 && (
                        <div className="p-12 text-center text-sm text-black/50">
                            No payouts have been created for this seller.
                        </div>
                    )}
                </div>
            </section>

            {/* ========================================================= */}
            {/* SELLER REVIEWS */}
            {/* ========================================================= */}

            <section className="rounded-2xl border bg-white">
                <div className="border-b p-6">
                    <h2 className="text-lg font-bold">Seller Reviews</h2>
                    <p className="mt-1 text-sm text-black/50">
                        Recent customer reviews for this seller.
                    </p>
                </div>

                <div className="divide-y">
                    {seller.sellerReviews.map((review) => (
                        <div
                            key={review.id}
                            className="p-6"
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="font-semibold">
                                        {review.user.name}
                                    </p>

                                    <p className="text-xs text-black/40">
                                        {review.user.email}
                                    </p>
                                </div>

                                <div className="text-left sm:text-right">
                                    <p className="font-semibold">
                                        {"★".repeat(review.rating)}
                                        {"☆".repeat(Math.max(0, 5 - review.rating))}
                                    </p>

                                    <p className="mt-1 text-xs text-black/40">
                                        {formatDate(review.createdAt)}
                                    </p>
                                </div>
                            </div>

                            <p className="mt-4 text-sm leading-6 text-black/70">
                                {review.comment}
                            </p>

                            <div className="mt-4">
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${review.status === "APPROVED"
                                        ? "bg-green-100 text-green-700"
                                        : review.status === "REJECTED"
                                            ? "bg-red-100 text-red-700"
                                            : "bg-yellow-100 text-yellow-700"
                                        }`}
                                >
                                    {review.status}
                                </span>
                            </div>
                        </div>
                    ))}

                    {seller.sellerReviews.length === 0 && (
                        <div className="p-12 text-center text-sm text-black/50">
                            This seller has no reviews yet.
                        </div>
                    )}
                </div>
            </section>

            {/* ========================================================= */}
            {/* SELLER DESCRIPTION */}
            {/* ========================================================= */}

            <section className="rounded-2xl border bg-white p-6">
                <h2 className="text-lg font-bold">Seller Description</h2>

                <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-black/65">
                    {seller.description || "No seller description provided."}
                </div>
            </section>

            {/* ========================================================= */}
            {/* METADATA */}
            {/* ========================================================= */}

            <section className="rounded-2xl border bg-white p-6">
                <h2 className="text-lg font-bold">Seller Metadata</h2>

                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-black/40">
                            Seller ID
                        </p>

                        <p className="mt-1 break-all font-mono text-xs">
                            {seller.id}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-black/40">
                            User ID
                        </p>

                        <p className="mt-1 break-all font-mono text-xs">
                            {seller.user.id}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-black/40">
                            Created
                        </p>

                        <p className="mt-1 text-sm">
                            {formatDateTime(seller.createdAt)}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-black/40">
                            Last Updated
                        </p>

                        <p className="mt-1 text-sm">
                            {formatDateTime(seller.updatedAt)}
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}