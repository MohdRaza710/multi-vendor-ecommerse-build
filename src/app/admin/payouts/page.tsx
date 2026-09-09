import Link from "next/link";
import { Prisma, PayoutStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

interface AdminPayoutsPageProps {
    searchParams: Promise<{
        search?: string;
        status?: string;
    }>;
}

function money(value: Prisma.Decimal | number | string) {
    return `$${Number(value).toFixed(2)}`;
}

function statusClass(status: PayoutStatus) {
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

export default async function AdminPayoutsPage({
    searchParams,
}: AdminPayoutsPageProps) {
    const params = await searchParams;

    const search = params.search?.trim() || "";
    const status = params.status || "";

    const payouts = await prisma.payout.findMany({
        where: {
            ...(status
                ? {
                    status: status as PayoutStatus,
                }
                : {}),

            ...(search
                ? {
                    OR: [
                        {
                            reference: {
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
                            seller: {
                                user: {
                                    name: {
                                        contains: search,
                                        mode: "insensitive",
                                    },
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
                    user: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
            },
        },
    });

    const stats = await prisma.payout.groupBy({
        by: ["status"],
        _count: {
            _all: true,
        },
        _sum: {
            amount: true,
        },
    });

    const statMap = Object.fromEntries(
        stats.map((item) => [
            item.status,
            {
                count: item._count._all,
                amount: Number(item._sum.amount ?? 0),
            },
        ]),
    );

    const totalPayouts = payouts.reduce(
        (sum, payout) => sum + Number(payout.amount),
        0,
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Seller Payouts
                </h1>

                <p className="mt-2 text-sm text-black/60">
                    Review and manage seller payout requests.
                </p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-2xl border bg-white p-5">
                    <p className="text-sm text-black/50">Total Results</p>
                    <p className="mt-2 text-2xl font-bold">{payouts.length}</p>
                </div>

                <div className="rounded-2xl border bg-white p-5">
                    <p className="text-sm text-black/50">Pending</p>
                    <p className="mt-2 text-2xl font-bold">
                        {statMap.PENDING?.count ?? 0}
                    </p>
                    <p className="text-xs text-black/50">
                        {money(statMap.PENDING?.amount ?? 0)}
                    </p>
                </div>

                <div className="rounded-2xl border bg-white p-5">
                    <p className="text-sm text-black/50">Processing</p>
                    <p className="mt-2 text-2xl font-bold">
                        {statMap.PROCESSING?.count ?? 0}
                    </p>
                    <p className="text-xs text-black/50">
                        {money(statMap.PROCESSING?.amount ?? 0)}
                    </p>
                </div>

                <div className="rounded-2xl border bg-white p-5">
                    <p className="text-sm text-black/50">Paid</p>
                    <p className="mt-2 text-2xl font-bold">
                        {statMap.PAID?.count ?? 0}
                    </p>
                    <p className="text-xs text-black/50">
                        {money(statMap.PAID?.amount ?? 0)}
                    </p>
                </div>

                <div className="rounded-2xl border bg-white p-5">
                    <p className="text-sm text-black/50">Failed</p>
                    <p className="mt-2 text-2xl font-bold">
                        {statMap.FAILED?.count ?? 0}
                    </p>
                    <p className="text-xs text-black/50">
                        {money(statMap.FAILED?.amount ?? 0)}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <form
                method="GET"
                className="flex flex-col gap-3 rounded-2xl border bg-white p-4 md:flex-row"
            >
                <input
                    name="search"
                    defaultValue={search}
                    placeholder="Search seller or reference..."
                    className="h-11 flex-1 rounded-xl border px-4 outline-none focus:ring-2 focus:ring-black/10"
                />

                <select
                    name="status"
                    defaultValue={status}
                    className="h-11 rounded-xl border px-4 outline-none"
                >
                    <option value="">All statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="PAID">Paid</option>
                    <option value="FAILED">Failed</option>
                </select>

                <button
                    type="submit"
                    className="h-11 rounded-xl bg-black px-5 text-sm font-medium text-white"
                >
                    Filter
                </button>

                <Link
                    href="/admin/payouts"
                    className="flex h-11 items-center justify-center rounded-xl border px-5 text-sm font-medium"
                >
                    Reset
                </Link>
            </form>

            {/* Payout table */}
            <div className="overflow-hidden rounded-2xl border bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                        <thead className="border-b bg-black/[0.02]">
                            <tr className="text-left text-sm">
                                <th className="px-6 py-4 font-medium">Seller</th>
                                <th className="px-6 py-4 font-medium">Amount</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Reference</th>
                                <th className="px-6 py-4 font-medium">Created</th>
                                <th className="px-6 py-4 text-right font-medium">
                                    Action
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y">
                            {payouts.map((payout) => (
                                <tr
                                    key={payout.id}
                                    className="transition hover:bg-black/[0.015]"
                                >
                                    <td className="px-6 py-5">
                                        <Link
                                            href={`/admin/sellers/${payout.seller.id}`}
                                            className="font-semibold hover:underline"
                                        >
                                            {payout.seller.businessName}
                                        </Link>

                                        <p className="mt-1 text-xs text-black/50">
                                            {payout.seller.user.name}
                                        </p>

                                        <p className="text-xs text-black/40">
                                            {payout.seller.user.email}
                                        </p>
                                    </td>

                                    <td className="px-6 py-5 font-semibold">
                                        {money(payout.amount)}
                                    </td>

                                    <td className="px-6 py-5">
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                                payout.status,
                                            )}`}
                                        >
                                            {payout.status}
                                        </span>
                                    </td>

                                    <td className="px-6 py-5 text-sm text-black/60">
                                        {payout.reference || "—"}
                                    </td>

                                    <td className="px-6 py-5 text-sm text-black/60">
                                        {new Date(payout.createdAt).toLocaleDateString()}
                                    </td>

                                    <td className="px-6 py-5 text-right">
                                        <Link
                                            href={`/admin/sellers/${payout.seller.id}`}
                                            className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-black/[0.03]"
                                        >
                                            View Seller
                                        </Link>
                                    </td>
                                </tr>
                            ))}

                            {payouts.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-6 py-16 text-center text-sm text-black/50"
                                    >
                                        No payouts found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="text-sm text-black/50">
                Current filtered payout volume:{" "}
                <span className="font-semibold text-black">
                    {money(totalPayouts)}
                </span>
            </div>
        </div>
    );
}