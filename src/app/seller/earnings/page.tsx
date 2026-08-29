import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";

export default async function SellerEarningsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== "SELLER" || !user.seller) {
    redirect("/");
  }

  const seller = user.seller;

  const commissions = await prisma.commission.findMany({
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
          status: true,
          createdAt: true,
        },
      },
      orderItem: {
        select: {
          productName: true,
          sku: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
        },
      },
    },
  });

  // --------------------------------------------------
  // Earnings calculations
  // --------------------------------------------------

  const totalGross = commissions.reduce(
    (sum, commission) => sum + Number(commission.grossAmount),
    0
  );

  const totalCommission = commissions.reduce(
    (sum, commission) =>
      sum + Number(commission.commissionAmount),
    0
  );

  const totalEarnings = commissions.reduce(
    (sum, commission) =>
      sum + Number(commission.sellerAmount),
    0
  );

  const deliveredEarnings = commissions
    .filter(
      (commission) =>
        commission.order.status === "DELIVERED"
    )
    .reduce(
      (sum, commission) =>
        sum + Number(commission.sellerAmount),
      0
    );

  const pendingEarnings = commissions
    .filter(
      (commission) =>
        commission.order.status !== "DELIVERED" &&
        commission.order.status !== "CANCELLED" &&
        commission.order.status !== "REFUNDED"
    )
    .reduce(
      (sum, commission) =>
        sum + Number(commission.sellerAmount),
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
            Earnings
          </h1>

          <p className="mt-2 text-slate-500">
            Track your sales, commissions, and seller earnings.
          </p>
        </div>

        <Link
          href="/seller/dashboard"
          className="rounded-xl bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white hover:bg-slate-800"
        >
          Back to dashboard
        </Link>
      </div>

      {/* Summary */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          title="Gross sales"
          value={money(totalGross)}
        />

        <Stat
          title="Platform commission"
          value={money(totalCommission)}
        />

        <Stat
          title="Your earnings"
          value={money(totalEarnings)}
          highlight
        />

        <Stat
          title="Delivered"
          value={money(deliveredEarnings)}
        />

        <Stat
          title="Pending"
          value={money(pendingEarnings)}
        />
      </div>

      {/* Commission information */}
      <section className="mt-8 rounded-3xl bg-slate-950 p-6 text-white">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Your commission rate
            </p>

            <p className="mt-2 text-4xl font-black">
              {Number(seller.commissionRate)}%
            </p>
          </div>

          <div className="max-w-2xl">
            <p className="text-sm leading-6 text-slate-400">
              The platform commission is automatically deducted from
              your product sales. Your seller earnings represent the
              amount remaining after the platform commission.
            </p>
          </div>
        </div>
      </section>

      {/* Earnings history */}
      <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-xl font-black text-slate-950">
            Earnings history
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Every commission generated from your orders.
          </p>
        </div>

        {commissions.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-xl font-black text-slate-950">
              No earnings yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              When customers purchase your products and commission
              records are created, your earnings will appear here.
            </p>

            <Link
              href="/seller/products"
              className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              Manage products
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Order
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Product
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Gross
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Commission
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Earnings
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {commissions.map((commission) => (
                    <tr
                      key={commission.id}
                      className="hover:bg-slate-50"
                    >
                      {/* Order */}
                      <td className="px-6 py-5">
                        <p className="font-bold text-slate-950">
                          {commission.order.orderNumber}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(commission.createdAt)}
                        </p>
                      </td>

                      {/* Product */}
                      <td className="px-6 py-5">
                        <p className="font-semibold text-slate-950">
                          {commission.orderItem.productName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          SKU: {commission.orderItem.sku}
                        </p>

                        <p className="text-xs text-slate-500">
                          Quantity: {commission.orderItem.quantity}
                        </p>
                      </td>

                      {/* Gross */}
                      <td className="px-6 py-5 font-semibold text-slate-950">
                        {money(commission.grossAmount)}
                      </td>

                      {/* Commission */}
                      <td className="px-6 py-5">
                        <p className="font-semibold text-rose-600">
                          -{money(commission.commissionAmount)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {Number(commission.commissionRate)}%
                        </p>
                      </td>

                      {/* Seller earnings */}
                      <td className="px-6 py-5">
                        <p className="font-black text-emerald-600">
                          {money(commission.sellerAmount)}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-5">
                        <StatusBadge
                          status={commission.order.status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 md:hidden">
              {commissions.map((commission) => (
                <div
                  key={commission.id}
                  className="p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-black text-slate-950">
                        {commission.order.orderNumber}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(commission.createdAt)}
                      </p>
                    </div>

                    <StatusBadge
                      status={commission.order.status}
                    />
                  </div>

                  <div className="mt-5">
                    <p className="font-bold text-slate-950">
                      {commission.orderItem.productName}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      SKU: {commission.orderItem.sku}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Quantity: {commission.orderItem.quantity}
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-slate-500">
                        Gross
                      </p>

                      <p className="mt-1 font-bold">
                        {money(commission.grossAmount)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Commission
                      </p>

                      <p className="mt-1 font-bold text-rose-600">
                        -{money(commission.commissionAmount)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        You earn
                      </p>

                      <p className="mt-1 font-black text-emerald-600">
                        {money(commission.sellerAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Stat({
  title,
  value,
  highlight = false,
}: {
  title: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">
        {title}
      </p>

      <p
        className={`mt-2 text-3xl font-black ${
          highlight
            ? "text-emerald-600"
            : "text-slate-950"
        }`}
      >
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
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        styles[status] ??
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
  }).format(date);
}