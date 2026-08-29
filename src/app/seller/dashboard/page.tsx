import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";
import {
  Package,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Star,
  Store,
  ArrowRight,
} from "lucide-react";

export default async function SellerDashboard() {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  if (user.role !== "SELLER" || !user.seller) {
    redirect("/");
  }

  const seller = user.seller;

  const [
    productCount,
    orderCount,
    revenue,
    lowStock,
    reviewStats,
    recentOrders,
  ] = await Promise.all([
    prisma.product.count({
      where: {
        sellerId: seller.id,
      },
    }),

    prisma.sellerOrder.count({
      where: {
        sellerId: seller.id,
      },
    }),

    prisma.commission.aggregate({
      where: {
        sellerId: seller.id,
      },
      _sum: {
        sellerAmount: true,
      },
    }),

    prisma.inventory.count({
      where: {
        product: {
          sellerId: seller.id,
        },
        quantity: {
          lte: 5,
        },
      },
    }),

    prisma.product.aggregate({
      where: {
        sellerId: seller.id,
      },
      _avg: {
        rating: true,
      },
    }),

    prisma.sellerOrder.findMany({
      where: {
        sellerId: seller.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
    }),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Seller Dashboard
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            {seller.store?.name ?? seller.businessName}
          </h1>

          <p className="mt-2 text-slate-500">
            Manage your store, products and sales.
          </p>
        </div>

        <span
          className={`rounded-full px-4 py-2 text-xs font-black uppercase ${
            seller.status === "APPROVED"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {seller.status}
        </span>
      </div>

      {seller.status !== "APPROVED" && (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-black text-amber-900">
            Your seller account is awaiting approval
          </h2>

          <p className="mt-1 text-sm text-amber-800">
            You will be able to sell products after an administrator approves
            your seller account.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          icon={<Package size={20} />}
          title="Products"
          value={String(productCount)}
        />

        <Stat
          icon={<ShoppingCart size={20} />}
          title="Orders"
          value={String(orderCount)}
        />

        <Stat
          icon={<DollarSign size={20} />}
          title="Revenue"
          value={money(revenue._sum.sellerAmount ?? 0)}
        />

        <Stat
          icon={<AlertTriangle size={20} />}
          title="Low Stock"
          value={String(lowStock)}
        />

        <Stat
          icon={<Star size={20} />}
          title="Rating"
          value={Number(reviewStats._avg.rating ?? 0).toFixed(1)}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border bg-white p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">Recent Orders</h2>
              <p className="mt-1 text-sm text-slate-500">
                Your latest seller orders.
              </p>
            </div>

            <Link
              href="/seller/orders"
              className="text-sm font-bold hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {recentOrders.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                No orders yet.
              </div>
            ) : (
              recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/seller/orders/${order.id}`}
                  className="flex items-center justify-between rounded-2xl border p-4 transition hover:bg-slate-50"
                >
                  <div>
                    <p className="font-bold">
                      #{order.order.orderNumber}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {order.status}
                    </p>
                  </div>

                  <ArrowRight size={18} />
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-slate-950 p-6 text-white">
          <Store size={24} />

          <h2 className="mt-5 text-2xl font-black">
            Manage your store
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Add products, manage inventory and keep your storefront updated.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <QuickLink href="/seller/products" text="Manage products" />
            <QuickLink href="/seller/products/new" text="Add product" />
            <QuickLink href="/seller/store" text="Store settings" />
            <QuickLink href="/seller/orders" text="Manage orders" />
            <QuickLink href="/seller/inventory" text="Manage inventory" />
            <QuickLink href="/seller/analytics" text="Manage analytics" />
            <QuickLink href="/seller/reviews" text="Reviews" />
            <QuickLink href="/seller/payouts" text="Payouts" />
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-center gap-3 text-slate-500">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>

      <p className="mt-3 text-2xl font-black">{value}</p>
    </div>
  );
}

function QuickLink({
  href,
  text,
}: {
  href: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/15"
    >
      {text}
      <ArrowRight size={16} />
    </Link>
  );
}