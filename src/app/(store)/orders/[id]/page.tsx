import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

type OrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OrderPage({
  params,
}: OrderPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: {
      id,
      userId: user.id,
    },

    include: {
      // --------------------------------------------------
      // Order items
      // --------------------------------------------------
      items: {
        include: {
          product: {
            select: {
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
        },
      },

      // --------------------------------------------------
      // Seller orders
      // --------------------------------------------------
      sellerGroups: {
        orderBy: {
          createdAt: "asc",
        },

        include: {
          seller: {
            select: {
              businessName: true,
            },
          },

          items: {
            include: {
              product: {
                select: {
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
            },
          },
        },
      },

      // --------------------------------------------------
      // Payment
      // --------------------------------------------------
      payment: true,

      // --------------------------------------------------
      // Customer tracking timeline
      // --------------------------------------------------
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
    <main className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Link
            href="/orders"
            className="text-sm font-bold text-slate-500 hover:text-slate-950"
          >
            ← Back to orders
          </Link>

          <p className="mt-6 text-sm font-bold uppercase tracking-widest text-slate-500">
            Order
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
            {order.orderNumber}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Placed on{" "}
            {formatDate(order.createdAt)}
          </p>
        </div>

        <StatusBadge status={order.status} />
      </div>

      {/* ==================================================
          ORDER TRACKING TIMELINE
      ================================================== */}

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Tracking
          </p>

          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Order timeline
          </h2>
        </div>

        {order.orderTimeline.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
            Your order timeline will appear here as your order progresses.
          </div>
        ) : (
          <div className="mt-8">
            {order.orderTimeline.map((event, index) => {
              const isLast =
                index === order.orderTimeline.length - 1;

              return (
                <div
                  key={event.id}
                  className="relative flex gap-4"
                >
                  {/* Timeline line */}
                  {!isLast && (
                    <div className="absolute left-[11px] top-7 h-full w-px bg-slate-200" />
                  )}

                  {/* Timeline dot */}
                  <div className="relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950">
                    <div className="h-2 w-2 rounded-full bg-white" />
                  </div>

                  {/* Event */}
                  <div
                    className={`min-w-0 flex-1 ${isLast ? "pb-1" : "pb-8"
                      }`}
                  >
                    <div className="flex flex-col justify-between gap-1 sm:flex-row">
                      <h3 className="font-bold text-slate-950">
                        {event.title}
                      </h3>

                      <time className="text-xs text-slate-400">
                        {formatDate(event.createdAt)}
                      </time>
                    </div>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {event.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ==================================================
          PAYMENT INFORMATION
      ================================================== */}

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
              Payment
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Payment information
            </h2>
          </div>

          <PaymentBadge
            status={order.payment?.status ?? "PENDING"}
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <InfoCard
            label="Provider"
            value={order.payment?.provider ?? "N/A"}
          />

          <InfoCard
            label="Amount"
            value={money(order.payment?.amount ?? order.totalAmount)}
          />

          <InfoCard
            label="Currency"
            value={order.payment?.currency ?? order.currency}
          />
        </div>
      </section>

      {/* ==================================================
          MULTI-SELLER ORDERS
      ================================================== */}

      <section className="mt-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Fulfillment
          </p>

          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Seller orders
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Each seller processes their products separately.
          </p>
        </div>

        <div className="mt-6 space-y-5">
          {order.sellerGroups.map((sellerOrder) => (
            <section
              key={sellerOrder.id}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Seller header */}
              <div className="border-b border-slate-200 bg-slate-50 p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Seller
                    </p>

                    <h3 className="mt-1 text-xl font-black text-slate-950">
                      {sellerOrder.seller.businessName}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {sellerOrder.items.length}{" "}
                      {sellerOrder.items.length === 1
                        ? "product"
                        : "products"}
                    </p>
                  </div>

                  <StatusBadge
                    status={sellerOrder.status}
                  />
                </div>
              </div>

              {/* Seller products */}
              <div className="divide-y divide-slate-100">
                {sellerOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      {/* Image */}
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                        {item.product?.images?.[0]?.url ? (
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

                      {/* Product info */}
                      <div className="min-w-0">
                        {item.product?.slug ? (
                          <Link
                            href={`/products/${item.product.slug}`}
                            className="font-bold text-slate-950 hover:underline"
                          >
                            {item.productName}
                          </Link>
                        ) : (
                          <p className="font-bold text-slate-950">
                            {item.productName}
                          </p>
                        )}

                        <p className="mt-1 text-sm text-slate-500">
                          SKU: {item.sku}
                        </p>

                        <p className="text-sm text-slate-500">
                          Quantity: {item.quantity}
                        </p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="shrink-0 text-left sm:text-right">
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

              {/* Seller totals */}
              <div className="border-t border-slate-200 bg-slate-50 p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500">
                    Seller subtotal
                  </span>

                  <span className="font-black text-slate-950">
                    {money(sellerOrder.subtotal)}
                  </span>
                </div>
              </div>
            </section>
          ))}
        </div>
      </section>

      {/* ==================================================
          ALL ORDER ITEMS
      ================================================== */}

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Summary
          </p>

          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Order summary
          </h2>
        </div>

        <div className="mt-6 space-y-4">
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
            value={money(order.discountAmount)}
          />

          <SummaryRow
            label="Tax"
            value={money(order.taxAmount)}
          />

          <div className="border-t border-slate-200 pt-5">
            <div className="flex justify-between gap-4 text-xl font-black text-slate-950">
              <span>Total</span>

              <span>
                {money(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          ORDER INFORMATION
      ================================================== */}

      <section className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Order information
          </p>

          <div className="mt-5 space-y-4">
            <InfoRow
              label="Order number"
              value={order.orderNumber}
            />

            <InfoRow
              label="Order status"
              value={formatStatus(order.status)}
            />

            <InfoRow
              label="Items"
              value={`${order.items.length}`}
            />

            <InfoRow
              label="Currency"
              value={order.currency}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Need help?
          </p>

          <h3 className="mt-2 text-xl font-black text-slate-950">
            Questions about your order?
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            If you have an issue with your order, contact the store support
            team and include your order number.
          </p>

          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-950">
              Order #{order.orderNumber}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Keep this number for your records.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ======================================================
   STATUS BADGE
====================================================== */

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
      className={`inline-flex w-fit rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide ${styles[status] ??
        "bg-slate-100 text-slate-700"
        }`}
    >
      {formatStatus(status)}
    </span>
  );
}

/* ======================================================
   PAYMENT BADGE
====================================================== */

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
      className={`inline-flex w-fit rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide ${styles[status] ??
        "bg-slate-100 text-slate-700"
        }`}
    >
      {formatStatus(status)}
    </span>
  );
}

/* ======================================================
   INFO CARD
====================================================== */

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

/* ======================================================
   INFO ROW
====================================================== */

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-right text-sm font-bold text-slate-950">
        {value}
      </span>
    </div>
  );
}

/* ======================================================
   SUMMARY ROW
====================================================== */

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="font-bold text-slate-950">
        {value}
      </span>
    </div>
  );
}

/* ======================================================
   FORMAT STATUS
====================================================== */

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

/* ======================================================
   FORMAT DATE
====================================================== */

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}