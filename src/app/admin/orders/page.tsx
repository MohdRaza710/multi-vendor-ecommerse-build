import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminOrdersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/");
  }

  const orders = await prisma.order.findMany({
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
              slug: true,
              status: true,
            },
          },
        },
      },

      items: {
        select: {
          id: true,
          productId: true,
          productName: true,
          sku: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,

          product: {
            select: {
              slug: true,
              status: true,
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
  });

  const totalRevenue = orders.reduce(
    (sum, order) => sum + Number(order.totalAmount),
    0
  );

  const paidOrders = orders.filter(
    (order) => order.payment?.status === "PAID"
  ).length;

  const pendingPayments = orders.filter(
    (order) => order.payment?.status === "PENDING"
  ).length;

  const cancelledOrders = orders.filter(
    (order) => order.status === "CANCELLED"
  ).length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Administration
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
            Orders
          </h1>

          <p className="mt-2 text-slate-500">
            View and monitor every order placed on the platform.
          </p>
        </div>

        <Link
          href="/admin/dashboard"
          className="rounded-xl bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white hover:bg-slate-800"
        >
          Back to dashboard
        </Link>
      </div>

      {/* Statistics */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          title="Total orders"
          value={String(orders.length)}
        />

        <Stat
          title="Total revenue"
          value={money(totalRevenue)}
        />

        <Stat
          title="Paid orders"
          value={String(paidOrders)}
        />

        <Stat
          title="Pending payments"
          value={String(pendingPayments)}
        />
      </div>

      {/* Orders */}
      <div className="mt-8 space-y-5">
        {orders.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <h2 className="text-2xl font-black text-slate-950">
              No orders yet
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Orders placed by customers will appear here.
            </p>
          </section>
        ) : (
          orders.map((order) => (
            <section
              key={order.id}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Order Header */}
              <div className="border-b border-slate-200 p-6">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-black text-slate-950">
                        {order.orderNumber}
                      </h2>

                      <OrderStatusBadge status={order.status} />

                      <PaymentStatusBadge
                        status={order.payment?.status ?? "PENDING"}
                      />
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="text-left lg:text-right">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Total
                    </p>

                    <p className="mt-1 text-2xl font-black text-slate-950">
                      {money(order.totalAmount)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer + Sellers */}
              <div className="grid gap-6 border-b border-slate-200 p-6 lg:grid-cols-2">
                {/* Customer */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Customer
                  </p>

                  <div className="mt-3 rounded-2xl bg-slate-50 p-4">
                    <p className="font-black text-slate-950">
                      {order.user.name}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {order.user.email}
                    </p>
                  </div>
                </div>

                {/* Sellers */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Sellers
                  </p>

                  <div className="mt-3 space-y-2">
                    {order.sellerGroups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
                      >
                        <div>
                          <p className="font-bold text-slate-950">
                            {group.seller.businessName}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Seller order status: {group.status}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            group.seller.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {group.seller.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Products */}
              <div>
                <div className="border-b border-slate-200 px-6 py-4">
                  <h3 className="font-black text-slate-950">
                    Products
                  </h3>
                </div>

                <div className="divide-y divide-slate-100">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        {/* Product Image */}
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
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

                        {/* Product Info */}
                        <div>
                          <Link
                            href={`/products/${item.product.slug}`}
                            className="font-bold text-slate-950 hover:underline"
                          >
                            {item.productName}
                          </Link>

                          <p className="mt-1 text-sm text-slate-500">
                            SKU: {item.sku}
                          </p>

                          <p className="text-sm text-slate-500">
                            Quantity: {item.quantity}
                          </p>
                        </div>
                      </div>

                      {/* Product Price */}
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
              </div>

              {/* Order Summary */}
              <div className="border-t border-slate-200 bg-slate-50 p-6">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <Summary
                    label="Subtotal"
                    value={money(order.subtotal)}
                  />

                  <Summary
                    label="Shipping"
                    value={money(order.shippingAmount)}
                  />

                  <Summary
                    label="Tax"
                    value={money(order.taxAmount)}
                  />

                  <Summary
                    label="Total"
                    value={money(order.totalAmount)}
                    strong
                  />
                </div>
              </div>

              {/* Payment Information */}
              <div className="border-t border-slate-200 p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Payment
                    </p>

                    <p className="mt-1 font-bold text-slate-950">
                      {order.payment?.provider ?? "Mock payment"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Amount:{" "}
                      {money(order.payment?.amount ?? order.totalAmount)}
                    </p>
                  </div>

                  <PaymentStatusBadge
                    status={order.payment?.status ?? "PENDING"}
                  />
                </div>
              </div>
            </section>
          ))
        )}
      </div>

      {/* Small summary */}
      {orders.length > 0 && (
        <div className="mt-6 text-right text-sm text-slate-500">
          {cancelledOrders} cancelled{" "}
          {cancelledOrders === 1 ? "order" : "orders"}
        </div>
      )}
    </main>
  );
}

function Stat({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

function Summary({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 ${
          strong
            ? "text-xl font-black text-slate-950"
            : "font-bold text-slate-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function OrderStatusBadge({
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

function PaymentStatusBadge({
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
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        styles[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      Payment: {status}
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