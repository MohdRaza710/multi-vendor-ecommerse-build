import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";

import {
    updateAdminOrderStatus,
    updateAdminPaymentStatus,
} from "@/actions/admin-order";

export default async function AdminOrderDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/auth/login");
    }

    if (user.role !== "ADMIN") {
        redirect("/");
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
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
                },
            },

            address: true,

            payment: true,

            items: {
                orderBy: {
                    productName: "asc",
                },

                include: {
                    product: {
                        select: {
                            id: true,
                            slug: true,
                            images: {
                                where: {
                                    isPrimary: true,
                                },
                                take: 1,
                                select: {
                                    url: true,
                                },
                            },
                        },
                    },

                    sellerOrder: {
                        include: {
                            seller: {
                                select: {
                                    id: true,
                                    businessName: true,
                                    slug: true,
                                    status: true,
                                },
                            },
                        },
                    },
                },
            },

            sellerGroups: {
                orderBy: {
                    createdAt: "asc",
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

                    items: {
                        select: {
                            id: true,
                            productName: true,
                            sku: true,
                            quantity: true,
                            unitPrice: true,
                            totalPrice: true,
                        },
                    },
                },
            },
            orderTimeline: {
                orderBy: {
                    createdAt: "asc",
                },
            },
        },
    });

    if (!order) {
        notFound();
    }

    return (
        <main className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
            {/* HEADER */}
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                <div>
                    <Link
                        href="/admin/orders"
                        className="text-sm font-bold text-slate-500 hover:text-slate-950"
                    >
                        ← Back to orders
                    </Link>

                    <p className="mt-6 text-sm font-bold uppercase tracking-widest text-slate-500">
                        Admin order management
                    </p>

                    <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                        {order.orderNumber}
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Placed{" "}
                        {formatDate(order.createdAt)}
                    </p>
                </div>

                <StatusBadge status={order.status} />
            </div>

            {/* TOP INFORMATION */}
            <div className="mt-8 grid gap-5 lg:grid-cols-3">
                {/* CUSTOMER */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Customer
                    </p>

                    <h2 className="mt-3 text-xl font-black text-slate-950">
                        {order.user.name}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        {order.user.email}
                    </p>

                    {order.user.phone && (
                        <p className="mt-1 text-sm text-slate-500">
                            {order.user.phone}
                        </p>
                    )}

                    <Link
                        href={`/admin/customers/${order.user.id}`}
                        className="mt-5 inline-block text-sm font-bold text-slate-950 hover:underline"
                    >
                        View customer →
                    </Link>
                </section>

                {/* PAYMENT */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Payment
                    </p>

                    {order.payment ? (
                        <>
                            <div className="mt-3 flex items-center justify-between">
                                <h2 className="text-xl font-black text-slate-950">
                                    {order.payment.provider}
                                </h2>

                                <PaymentBadge
                                    status={order.payment.status}
                                />
                            </div>

                            <p className="mt-3 text-sm text-slate-500">
                                Amount
                            </p>

                            <p className="mt-1 text-xl font-black">
                                {money(order.payment.amount)}
                            </p>

                            {order.payment.transactionId && (
                                <p className="mt-3 break-all text-xs text-slate-500">
                                    Transaction:{" "}
                                    {order.payment.transactionId}
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="mt-4 text-sm text-rose-500">
                            No payment record found.
                        </p>
                    )}
                </section>

                {/* ORDER TOTAL */}
                <section className="rounded-3xl bg-slate-950 p-6 text-white">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Order total
                    </p>

                    <p className="mt-3 text-4xl font-black">
                        {money(order.totalAmount)}
                    </p>

                    <p className="mt-2 text-sm text-slate-400">
                        {order.items.length} product
                        {order.items.length === 1 ? "" : "s"}
                    </p>
                </section>
            </div>

            {/* ADMIN CONTROLS */}
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
                {/* ORDER STATUS */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Order status
                    </p>

                    <h2 className="mt-2 text-xl font-black">
                        Manage order status
                    </h2>

                    <form
                        action={updateAdminOrderStatus}
                        className="mt-5 flex flex-col gap-3 sm:flex-row"
                    >
                        <input
                            type="hidden"
                            name="orderId"
                            value={order.id}
                        />

                        <select
                            name="status"
                            defaultValue={order.status}
                            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-slate-950"
                        >
                            <option value="PENDING">
                                Pending
                            </option>

                            <option value="CONFIRMED">
                                Confirmed
                            </option>

                            <option value="PROCESSING">
                                Processing
                            </option>

                            <option value="SHIPPED">
                                Shipped
                            </option>

                            <option value="DELIVERED">
                                Delivered
                            </option>

                            <option value="CANCELLED">
                                Cancelled
                            </option>

                            <option value="REFUNDED">
                                Refunded
                            </option>
                        </select>

                        <button
                            type="submit"
                            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                        >
                            Update status
                        </button>
                    </form>
                </section>

                {/* PAYMENT STATUS */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Payment status
                    </p>

                    <h2 className="mt-2 text-xl font-black">
                        Manage payment
                    </h2>

                    {order.payment ? (
                        <form
                            action={updateAdminPaymentStatus}
                            className="mt-5 flex flex-col gap-3 sm:flex-row"
                        >
                            <input
                                type="hidden"
                                name="orderId"
                                value={order.id}
                            />

                            <select
                                name="status"
                                defaultValue={order.payment.status}
                                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-slate-950"
                            >
                                <option value="PENDING">
                                    Pending
                                </option>

                                <option value="PAID">
                                    Paid
                                </option>

                                <option value="FAILED">
                                    Failed
                                </option>

                                <option value="REFUNDED">
                                    Refunded
                                </option>
                            </select>

                            <button
                                type="submit"
                                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                            >
                                Update payment
                            </button>
                        </form>
                    ) : (
                        <p className="mt-4 text-sm text-slate-500">
                            This order does not have a payment record.
                        </p>
                    )}
                </section>
            </div>

            {/* SHIPPING ADDRESS */}
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Shipping address
                </p>

                {order.address ? (
                    <div className="mt-4 grid gap-1 text-sm text-slate-700">
                        <p className="font-bold">
                            {order.address.fullName}
                        </p>

                        <p>{order.address.phone}</p>

                        <p>{order.address.line1}</p>

                        {order.address.line2 && (
                            <p>{order.address.line2}</p>
                        )}

                        <p>
                            {order.address.city}
                            {order.address.state
                                ? `, ${order.address.state}`
                                : ""}
                        </p>

                        {order.address.postalCode && (
                            <p>{order.address.postalCode}</p>
                        )}

                        <p>{order.address.country}</p>
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-slate-500">
                        No shipping address was attached to this order.
                    </p>
                )}
            </section>

            {/* PRODUCTS */}
            <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Products
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                        Order items
                    </h2>
                </div>

                <div className="divide-y divide-slate-100">
                    {order.items.map((item) => (
                        <div
                            key={item.id}
                            className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center"
                        >
                            {/* IMAGE */}
                            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                                {item.product.images[0]?.url ? (
                                    <img
                                        src={item.product.images[0].url}
                                        alt={item.productName}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="grid h-full place-items-center text-xs text-slate-400">
                                        No image
                                    </div>
                                )}
                            </div>

                            {/* PRODUCT */}
                            <div className="min-w-0 flex-1">
                                <Link
                                    href={`/products/${item.product.slug}`}
                                    className="font-black text-slate-950 hover:underline"
                                >
                                    {item.productName}
                                </Link>

                                <p className="mt-1 text-sm text-slate-500">
                                    SKU: {item.sku}
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                    Quantity: {item.quantity}
                                </p>

                                <div className="mt-2">
                                    <SellerBadge
                                        name={
                                            item.sellerOrder.seller
                                                .businessName
                                        }
                                    />
                                </div>
                            </div>

                            {/* PRICE */}
                            <div className="text-left sm:text-right">
                                <p className="font-black text-slate-950">
                                    {money(item.totalPrice)}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    {money(item.unitPrice)} each
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* SELLERS */}
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Multi-seller order
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                        Seller breakdown
                    </h2>
                </div>

                <div className="divide-y divide-slate-100">
                    {order.sellerGroups.map((sellerOrder) => (
                        <div
                            key={sellerOrder.id}
                            className="p-6"
                        >
                            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                                <div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h3 className="text-lg font-black">
                                            {
                                                sellerOrder.seller
                                                    .businessName
                                            }
                                        </h3>

                                        <StatusBadge
                                            status={sellerOrder.status}
                                        />
                                    </div>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Seller subtotal:{" "}
                                        <span className="font-bold text-slate-950">
                                            {money(
                                                sellerOrder.subtotal
                                            )}
                                        </span>
                                    </p>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Commission:{" "}
                                        <span className="font-bold text-slate-950">
                                            {money(
                                                sellerOrder.commission
                                            )}
                                        </span>
                                    </p>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Seller earnings:{" "}
                                        <span className="font-bold text-emerald-600">
                                            {money(
                                                sellerOrder.sellerTotal
                                            )}
                                        </span>
                                    </p>
                                </div>

                                <Link
                                    href={`/admin/sellers/${sellerOrder.seller.id}`}
                                    className="text-sm font-bold text-slate-950 hover:underline"
                                >
                                    View seller →
                                </Link>
                            </div>

                            {/* SELLER PRODUCTS */}
                            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Products from this seller
                                </p>

                                <div className="mt-3 space-y-2">
                                    {sellerOrder.items.map(
                                        (item) => (
                                            <div
                                                key={item.id}
                                                className="flex justify-between gap-4 text-sm"
                                            >
                                                <div>
                                                    <p className="font-semibold">
                                                        {item.productName}
                                                    </p>

                                                    <p className="text-xs text-slate-500">
                                                        Qty {item.quantity} ·{" "}
                                                        {item.sku}
                                                    </p>
                                                </div>

                                                <p className="font-bold">
                                                    {money(
                                                        item.totalPrice
                                                    )}
                                                </p>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ORDER TIMELINE */}
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Order history
                    </p>

                    <h2 className="mt-2 text-2xl font-black text-slate-950">
                        Order timeline
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Complete history of status and payment updates.
                    </p>
                </div>

                <div className="p-6">
                    {order.orderTimeline.length === 0 ? (
                        <div className="rounded-2xl bg-slate-50 p-6 text-center">
                            <p className="font-bold text-slate-700">
                                No timeline events yet.
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                Timeline events will appear when the order changes.
                            </p>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="absolute left-[15px] top-3 bottom-3 w-px bg-slate-200" />

                            <div className="space-y-7">
                                {order.orderTimeline.map((event, index) => (
                                    <div
                                        key={event.id}
                                        className="relative flex gap-4"
                                    >
                                        {/* DOT */}
                                        <div className="relative z-10 mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border-4 border-white bg-slate-950 shadow-sm">
                                            <span className="h-2 w-2 rounded-full bg-white" />
                                        </div>

                                        {/* CONTENT */}
                                        <div className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="font-black text-slate-950">
                                                            {event.title}
                                                        </h3>

                                                        <TimelineBadge
                                                            status={event.status}
                                                        />
                                                    </div>

                                                    {event.message && (
                                                        <p className="mt-2 text-sm leading-6 text-slate-600">
                                                            {event.message}
                                                        </p>
                                                    )}
                                                </div>

                                                <time className="shrink-0 text-xs font-semibold text-slate-400">
                                                    {formatDate(event.createdAt)}
                                                </time>
                                            </div>

                                            {index ===
                                                order.orderTimeline.length - 1 && (
                                                    <p className="mt-3 text-xs font-bold text-emerald-600">
                                                        Current latest event
                                                    </p>
                                                )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ORDER SUMMARY */}
            <section className="mt-6 ml-auto max-w-md rounded-3xl bg-slate-950 p-6 text-white">
                <h2 className="text-xl font-black">
                    Order summary
                </h2>

                <div className="mt-6 space-y-3 text-sm">
                    <SummaryRow
                        label="Subtotal"
                        value={money(order.subtotal)}
                    />

                    <SummaryRow
                        label="Shipping"
                        value={money(order.shippingAmount)}
                    />

                    <SummaryRow
                        label="Discount"
                        value={`-${money(
                            order.discountAmount
                        )}`}
                    />

                    <SummaryRow
                        label="Tax"
                        value={money(order.taxAmount)}
                    />
                </div>

                <div className="my-6 border-t border-slate-700" />

                <div className="flex justify-between text-xl font-black">
                    <span>Total</span>

                    <span>
                        {money(order.totalAmount)}
                    </span>
                </div>
            </section>
        </main>
    );
}

/* ---------------------------------------------
   Components
--------------------------------------------- */

function SummaryRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="flex justify-between">
            <span className="text-slate-400">
                {label}
            </span>

            <span>{value}</span>
        </div>
    );
}

function SellerBadge({
    name,
}: {
    name: string;
}) {
    return (
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            Seller: {name}
        </span>
    );
}

function StatusBadge({
    status,
}: {
    status: string;
}) {
    const styles: Record<string, string> = {
        PENDING:
            "bg-amber-100 text-amber-800",

        CONFIRMED:
            "bg-blue-100 text-blue-800",

        PROCESSING:
            "bg-indigo-100 text-indigo-800",

        SHIPPED:
            "bg-purple-100 text-purple-800",

        DELIVERED:
            "bg-emerald-100 text-emerald-800",

        CANCELLED:
            "bg-rose-100 text-rose-800",

        REFUNDED:
            "bg-slate-200 text-slate-700",
    };

    return (
        <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status] ??
                "bg-slate-100 text-slate-700"
                }`}
        >
            {status}
        </span>
    );
}

function PaymentBadge({
    status,
}: {
    status: string;
}) {
    const styles: Record<string, string> = {
        PENDING:
            "bg-amber-100 text-amber-800",

        PAID:
            "bg-emerald-100 text-emerald-800",

        FAILED:
            "bg-rose-100 text-rose-800",

        REFUNDED:
            "bg-slate-200 text-slate-700",
    };

    return (
        <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status] ??
                "bg-slate-100 text-slate-700"
                }`}
        >
            {status}
        </span>
    );
}

function formatDate(date: Date) {
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

function TimelineBadge({
    status,
}: {
    status: string;
}) {
    const styles: Record<string, string> = {
        PENDING: "bg-amber-100 text-amber-800",
        CONFIRMED: "bg-blue-100 text-blue-800",
        PROCESSING: "bg-indigo-100 text-indigo-800",
        SHIPPED: "bg-purple-100 text-purple-800",
        DELIVERED: "bg-emerald-100 text-emerald-800",
        CANCELLED: "bg-rose-100 text-rose-800",
        REFUNDED: "bg-slate-200 text-slate-700",

        PAYMENT_PENDING: "bg-amber-100 text-amber-800",
        PAYMENT_PAID: "bg-emerald-100 text-emerald-800",
        PAYMENT_FAILED: "bg-rose-100 text-rose-800",
        PAYMENT_REFUNDED: "bg-slate-200 text-slate-700",
    };

    return (
        <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${styles[status] ?? "bg-slate-100 text-slate-700"
                }`}
        >
            {status.replaceAll("_", " ")}
        </span>
    );
}