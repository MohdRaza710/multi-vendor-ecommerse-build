import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { money } from "@/lib/format";

export default async function OrdersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const orders = await prisma.order.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      items: {
        select: {
          id: true,
          productName: true,
          quantity: true,
          totalPrice: true,
        },
      },
      sellerGroups: {
        select: {
          id: true,
          seller: {
            select: {
              businessName: true,
            },
          },
        },
      },
      payment: {
        select: {
          status: true,
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
      {/* Header */}
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
          Account
        </p>

        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
          My orders
        </h1>

        <p className="mt-2 text-slate-500">
          View and track all of your orders.
        </p>
      </div>

      {/* Orders */}
      <div className="mt-8 space-y-5">
        {orders.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-2xl">
              📦
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-950">
              No orders yet
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Your orders will appear here after you make a purchase.
            </p>

            <Link
              href="/products"
              className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Start shopping
            </Link>
          </section>
        ) : (
          orders.map((order) => {
            const sellerNames = order.sellerGroups
              .map((group) => group.seller.businessName)
              .filter(Boolean);

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Top */}
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-black text-slate-950">
                        {order.orderNumber}
                      </h2>

                      <StatusBadge status={order.status} />
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Total
                    </p>

                    <p className="mt-1 text-xl font-black text-slate-950">
                      {money(order.totalAmount)}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Products
                    </p>

                    <p className="mt-1 font-bold text-slate-950">
                      {order.items.length}{" "}
                      {order.items.length === 1 ? "item" : "items"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Sellers
                    </p>

                    <p className="mt-1 font-bold text-slate-950">
                      {sellerNames.length}{" "}
                      {sellerNames.length === 1
                        ? "seller"
                        : "sellers"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Payment
                    </p>

                    <PaymentBadge
                      status={order.payment?.status ?? "PENDING"}
                    />
                  </div>
                </div>

                {/* Product preview */}
                {order.items.length > 0 && (
                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Items
                    </p>

                    <div className="mt-2 space-y-1">
                      {order.items.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between gap-4 text-sm"
                        >
                          <span className="truncate text-slate-600">
                            {item.productName} × {item.quantity}
                          </span>

                          <span className="shrink-0 font-semibold text-slate-950">
                            {money(item.totalPrice)}
                          </span>
                        </div>
                      ))}

                      {order.items.length > 3 && (
                        <p className="pt-1 text-xs font-semibold text-slate-400">
                          + {order.items.length - 3} more items
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-5 flex items-center justify-end">
                  <span className="text-sm font-bold text-slate-600">
                    View order →
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}

function StatusBadge({
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
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        styles[status] ?? "bg-slate-100 text-slate-700"
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
    PENDING: "bg-amber-100 text-amber-800",
    PAID: "bg-emerald-100 text-emerald-800",
    FAILED: "bg-rose-100 text-rose-800",
    REFUNDED: "bg-slate-200 text-slate-700",
  };

  return (
    <span
      className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-bold ${
        styles[status] ?? "bg-slate-100 text-slate-700"
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