import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { money } from "@/lib/format";
import SellerOrderStatus from "@/components/seller/SellerOrderStatus";
import Link from "next/link";

export default async function SellerOrdersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "SELLER" || !user.seller) {
    redirect("/");
  }

  const seller = user.seller;

  const orders = await prisma.sellerOrder.findMany({
    where: {
      sellerId: seller.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          status: true,
          user: {
            select: {
              name: true,
              email: true,
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

  const pendingOrders = orders.filter(
    (order) => order.status === "PENDING"
  ).length;

  const processingOrders = orders.filter(
    (order) =>
      order.status === "CONFIRMED" ||
      order.status === "PROCESSING"
  ).length;

  const shippedOrders = orders.filter(
    (order) =>
      order.status === "SHIPPED" ||
      order.status === "DELIVERED"
  ).length;

  const totalSales = orders.reduce(
    (sum, order) => sum + Number(order.subtotal),
    0
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Seller dashboard
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
            Orders
          </h1>

          <p className="mt-2 text-slate-500">
            Manage orders containing your products.
          </p>
        </div>

        <Link
          href="/seller/dashboard"
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
          title="Pending"
          value={String(pendingOrders)}
        />

        <Stat
          title="Processing"
          value={String(processingOrders)}
        />

        <Stat
          title="Sales"
          value={money(totalSales)}
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
              Orders containing your products will appear here.
            </p>

            <Link
              href="/seller/products"
              className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
            >
              Manage products
            </Link>
          </section>
        ) : (
          orders.map((order) => (
            <section
              key={order.id}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Order header */}
              <div className="border-b border-slate-200 p-6">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-black text-slate-950">
                        {order.order.orderNumber}
                      </h2>

                      <StatusBadge status={order.status} />
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="text-left lg:text-right">
                    <p className="text-sm text-slate-500">
                      Customer
                    </p>

                    <p className="mt-1 font-bold text-slate-950">
                      {order.order.user.name}
                    </p>

                    <p className="text-sm text-slate-500">
                      {order.order.user.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Products */}
              <div className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      {/* Product image */}
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

              {/* Order totals */}
              <div className="border-t border-slate-200 bg-slate-50 p-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Order subtotal
                    </p>

                    <p className="mt-1 text-xl font-black">
                      {money(order.subtotal)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Platform commission
                    </p>

                    <p className="mt-1 text-xl font-black">
                      {money(order.commission)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Your earnings
                    </p>

                    <p className="mt-1 text-xl font-black text-emerald-600">
                      {money(order.sellerTotal)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status controls */}
              <div className="border-t border-slate-200 p-6">
                <div className="mb-3">
                  <h3 className="font-bold text-slate-950">
                    Update order status
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Change the status as you process this order.
                  </p>
                </div>

                <SellerOrderStatus
                  sellerOrderId={order.id}
                  currentStatus={order.status}
                />
              </div>
            </section>
          ))
        )}
      </div>
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
      className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status] ?? "bg-slate-100 text-slate-700"}`}
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