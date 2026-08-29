import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";

export default async function AdminDashboard() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/auth/login");
    }

    if (user.role !== "ADMIN") {
        redirect("/");
    }

    const [
        customers,
        sellers,
        products,
        orders,
        commissions,
        pendingSellers,
    ] = await Promise.all([
        prisma.user.count({
            where: {
                role: "CUSTOMER",
            },
        }),

        prisma.seller.count(),

        prisma.product.count(),

        prisma.order.count(),

        prisma.commission.aggregate({
            _sum: {
                commissionAmount: true,
            },
        }),

        prisma.seller.count({
            where: {
                status: "PENDING",
            },
        }),
    ]);

    return (
        <main className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
            {/* HEADER */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
                        Administration
                    </p>

                    <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                        Platform overview
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Manage your marketplace, sellers, products and customers.
                    </p>
                </div>

                <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                    View Store
                </Link>
            </div>

            {/* STAT CARDS */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Stat
                    title="Platform Revenue"
                    value={money(commissions._sum.commissionAmount ?? 0)}
                />

                <Stat
                    title="Total Orders"
                    value={String(orders)}
                />

                <Stat
                    title="Customers"
                    value={String(customers)}
                />

                <Stat
                    title="Sellers"
                    value={String(sellers)}
                />

                {/* CLICKABLE PENDING SELLERS */}
                <Link
                    href="/admin/sellers"
                    className="group rounded-2xl border border-amber-200 bg-amber-50 p-5 transition duration-200 hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg"
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                                Pending Sellers
                            </p>

                            <p className="mt-2 text-3xl font-black text-amber-950">
                                {pendingSellers}
                            </p>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                            <span className="text-lg">!</span>
                        </div>
                    </div>

                    <p className="mt-3 text-xs font-semibold text-amber-700">
                        Review seller requests →
                    </p>
                </Link>
            </div>

            {/* MAIN CONTENT */}
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
                {/* PLATFORM ENTITIES */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                Marketplace
                            </p>

                            <h2 className="mt-1 text-xl font-black text-slate-950">
                                Platform entities
                            </h2>
                        </div>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                            Overview
                        </span>
                    </div>

                    <div className="mt-5 space-y-2 text-sm">
                        <Row
                            label="Products"
                            value={products}
                            href="/admin/products"
                        />

                        <Row
                            label="Sellers"
                            value={sellers}
                            href="/admin/sellers"
                        />

                        <Row
                            label="Customers"
                            value={customers}
                            href="/admin/users"
                        />

                        <Row
                            label="Orders"
                            value={orders}
                            href="/admin/orders"
                        />
                    </div>
                </section>

                {/* SELLER APPROVAL */}
                <section className="rounded-3xl bg-slate-950 p-6 text-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-400">
                                Seller Management
                            </p>

                            <h2 className="mt-2 text-2xl font-black">
                                Seller applications
                            </h2>
                        </div>

                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                            <span className="text-xl">👥</span>
                        </div>
                    </div>

                    <p className="mt-4 max-w-lg text-sm leading-6 text-slate-400">
                        Review sellers who have registered on the marketplace.
                        Approve sellers to allow them to publish and sell products.
                    </p>

                    <div className="mt-6 flex items-center justify-between rounded-2xl bg-white/5 p-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Waiting for approval
                            </p>

                            <p className="mt-1 text-2xl font-black">
                                {pendingSellers}
                            </p>
                        </div>

                        <Link
                            href="/admin/sellers"
                            className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-slate-200"
                        >
                            Manage Sellers
                        </Link>
                    </div>
                </section>
            </div>

            {/* QUICK ACTIONS */}
            <section className="mt-8">
                <div className="mb-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Administration
                    </p>

                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                        Quick actions
                    </h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <QuickAction
                        title="Manage Sellers"
                        description="Approve, reject or suspend sellers."
                        href="/admin/sellers"
                    />

                    <QuickAction
                        title="Manage Products"
                        description="Review and manage marketplace products."
                        href="/admin/products"
                    />

                    <QuickAction
                        title="Manage Orders"
                        description="View and manage all platform orders."
                        href="/admin/orders"
                    />

                    <QuickAction
                        title="Manage Users"
                        description="View and manage customer accounts."
                        href="/admin/users"
                    />
                </div>
            </section>

            {/* SECURITY */}
            <section className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
                            Security
                        </p>

                        <h2 className="mt-2 text-xl font-black text-emerald-950">
                            Centralized authorization enabled
                        </h2>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-800/70">
                            Server-side role and resource ownership checks protect
                            seller, customer and administrator data.
                        </p>
                    </div>

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        ✓
                    </div>
                </div>
            </section>
        </main>
    );
}

/* =========================
   STAT CARD
========================= */

function Stat({
    title,
    value,
}: {
    title: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {title}
            </p>

            <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                {value}
            </p>
        </div>
    );
}

/* =========================
   PLATFORM ROW
========================= */

function Row({
    label,
    value,
    href,
}: {
    label: string;
    value: number;
    href: string;
}) {
    return (
        <Link
            href={href}
            className="flex items-center justify-between rounded-xl bg-slate-50 p-3 transition hover:bg-slate-100"
        >
            <span className="font-medium text-slate-700">
                {label}
            </span>

            <div className="flex items-center gap-3">
                <b className="text-slate-950">
                    {value}
                </b>

                <span className="text-slate-400">
                    →
                </span>
            </div>
        </Link>
    );
}

/* =========================
   QUICK ACTION
========================= */

function QuickAction({
    title,
    description,
    href,
}: {
    title: string;
    description: string;
    href: string;
}) {
    return (
        <Link
            href={href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
        >
            <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-950">
                    {title}
                </h3>

                <span className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-950">
                    →
                </span>
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
            </p>
        </Link>
    );
}