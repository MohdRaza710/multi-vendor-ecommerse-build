import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";

type SearchParams = Promise<{
  search?: string;
  status?: string;
  payment?: string;
}>;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/");
  }

  const params = await searchParams;

  const search = params.search?.trim() || "";
  const status = params.status || "";
  const paymentStatus = params.payment || "";

  const orders = await prisma.order.findMany({
    where: {
      ...(status
        ? {
          status: status as
            | "PENDING"
            | "CONFIRMED"
            | "PROCESSING"
            | "SHIPPED"
            | "DELIVERED"
            | "CANCELLED"
            | "REFUNDED",
        }
        : {}),

      ...(search
        ? {
          OR: [
            {
              orderNumber: {
                contains: search,
                mode: "insensitive",
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

      ...(paymentStatus
        ? {
          payment: {
            status: paymentStatus as
              | "PENDING"
              | "PAID"
              | "FAILED"
              | "REFUNDED",
          },
        }
        : {}),
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

      payment: {
        select: {
          status: true,
          provider: true,
          amount: true,
          currency: true,
        },
      },

      sellerGroups: {
        include: {
          seller: {
            select: {
              id: true,
              businessName: true,
              status: true,
            },
          },
        },
      },

      items: {
        select: {
          id: true,
          productName: true,
          quantity: true,
          totalPrice: true,
        },
      },
    },
  });

  const allOrders = await prisma.order.findMany({
    select: {
      totalAmount: true,
      status: true,
      payment: {
        select: {
          status: true,
        },
      },
    },
  });

  const totalRevenue = allOrders.reduce(
    (sum, order) => sum + Number(order.totalAmount),
    0
  );

  const paidOrders = allOrders.filter(
    (order) => order.payment?.status === "PAID"
  ).length;

  const pendingOrders = allOrders.filter(
    (order) => order.status === "PENDING"
  ).length;

  const processingOrders = allOrders.filter(
    (order) =>
      order.status === "PROCESSING" ||
      order.status === "CONFIRMED"
  ).length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
            Administration
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
            Orders
          </h1>

          <p className="mt-2 text-slate-500">
            Manage and monitor all customer orders.
          </p>
        </div>

        <Link
          href="/admin/dashboard"
          className="rounded-xl bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-slate-800"
        >
          ← Dashboard
        </Link>
      </div>

      {/* STATISTICS */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total orders"
          value={String(allOrders.length)}
        />

        <Stat
          label="Revenue"
          value={money(totalRevenue)}
        />

        <Stat
          label="Paid orders"
          value={String(paidOrders)}
        />

        <Stat
          label="Pending"
          value={String(pendingOrders)}
        />
      </div>

      {/* FILTERS */}
      <form
        method="GET"
        className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px_auto]">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search order, customer or email..."
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-950"
          />

          <select
            name="status"
            defaultValue={status}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-slate-950"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          <select
            name="payment"
            defaultValue={paymentStatus}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-slate-950"
          >
            <option value="">All payments</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          <button
            type="submit"
            className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Filter
          </button>
        </div>

        {(search || status || paymentStatus) && (
          <div className="mt-4">
            <Link
              href="/admin/orders"
              className="text-sm font-bold text-slate-500 hover:text-slate-950"
            >
              Clear filters
            </Link>
          </div>
        )}
      </form>

      {/* RESULTS */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-500">
          Showing {orders.length} order
          {orders.length === 1 ? "" : "s"}
        </p>

        <p className="hidden text-sm font-semibold text-slate-400 sm:block">
          {processingOrders} active processing
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {orders.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-2xl">
              📦
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-950">
              No orders found
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Try changing your search or filters.
            </p>
          </section>
        ) : (
          orders.map((order) => (
            <article
              key={order.id}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              {/* TOP */}
              <div className="flex flex-col justify-between gap-5 border-b border-slate-100 p-6 lg:flex-row lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-black text-slate-950">
                      {order.orderNumber}
                    </h2>

                    <StatusBadge status={order.status} />

                    <PaymentBadge
                      status={
                        order.payment?.status ??
                        "PENDING"
                      }
                    />
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {formatDate(order.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-left lg:text-right">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Total
                    </p>

                    <p className="mt-1 text-2xl font-black text-slate-950">
                      {money(order.totalAmount)}
                    </p>
                  </div>

                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    View
                  </Link>
                </div>
              </div>

              {/* BODY */}
              <div className="grid gap-6 p-6 lg:grid-cols-3">
                {/* CUSTOMER */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Customer
                  </p>

                  <p className="mt-2 font-black text-slate-950">
                    {order.user.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {order.user.email}
                  </p>
                </div>

                {/* SELLERS */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Sellers
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {order.sellerGroups.map((group) => (
                      <span
                        key={group.id}
                        className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700"
                      >
                        {group.seller.businessName}
                      </span>
                    ))}
                  </div>
                </div>

                {/* ITEMS */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Items
                  </p>

                  <p className="mt-2 font-black text-slate-950">
                    {order.items.reduce(
                      (sum, item) =>
                        sum + item.quantity,
                      0
                    )}{" "}
                    item
                    {order.items.reduce(
                      (sum, item) =>
                        sum + item.quantity,
                      0
                    ) === 1
                      ? ""
                      : "s"}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {order.items.length} product
                    {order.items.length === 1
                      ? ""
                      : "s"}
                  </p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
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
      className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status] ?? "bg-slate-100 text-slate-700"
        }`}
    >
      {formatStatus(status)}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    PAID: "bg-emerald-100 text-emerald-800",
    FAILED: "bg-rose-100 text-rose-800",
    REFUNDED: "bg-slate-200 text-slate-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status] ?? "bg-slate-100 text-slate-700"
        }`}
    >
      Payment: {formatStatus(status)}
    </span>
  );
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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