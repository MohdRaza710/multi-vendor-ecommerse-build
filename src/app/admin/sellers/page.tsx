import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";

type SearchParams = Promise<{
  search?: string;
  status?: string;
}>;

export default async function AdminSellersPage({
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

  const sellers = await prisma.seller.findMany({
    where: {
      ...(status
        ? {
          status: status as
            | "PENDING"
            | "APPROVED"
            | "REJECTED"
            | "SUSPENDED",
        }
        : {}),

      ...(search
        ? {
          OR: [
            {
              businessName: {
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
          phone: true,
        },
      },

      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },

      _count: {
        select: {
          products: true,
          orderGroups: true,
          sellerReviews: true,
          payouts: true,
        },
      },
    },
  });

  const allSellers = await prisma.seller.findMany({
    select: {
      status: true,
      commissionRate: true,
      orderGroups: {
        select: {
          sellerTotal: true,
        },
      },
      products: {
        select: {
          id: true,
        },
      },
    },
  });

  const totalSellers = allSellers.length;

  const pendingSellers = allSellers.filter(
    (seller) => seller.status === "PENDING"
  ).length;

  const approvedSellers = allSellers.filter(
    (seller) => seller.status === "APPROVED"
  ).length;

  const suspendedSellers = allSellers.filter(
    (seller) => seller.status === "SUSPENDED"
  ).length;

  const sellerRevenue = allSellers.reduce(
    (sum, seller) =>
      sum +
      seller.orderGroups.reduce(
        (sellerSum, order) =>
          sellerSum + Number(order.sellerTotal),
        0
      ),
    0
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
            Administration
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
            Sellers
          </h1>

          <p className="mt-2 text-slate-500">
            Manage marketplace sellers, stores and seller accounts.
          </p>
        </div>

        <Link
          href="/admin/dashboard"
          className="rounded-xl bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-slate-800"
        >
          ← Dashboard
        </Link>
      </div>

      {/* STATS */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total sellers"
          value={String(totalSellers)}
        />

        <Stat
          label="Pending approval"
          value={String(pendingSellers)}
        />

        <Stat
          label="Approved"
          value={String(approvedSellers)}
        />

        <Stat
          label="Seller revenue"
          value={money(sellerRevenue)}
        />
      </div>

      {/* FILTERS */}
      <form
        method="GET"
        className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_auto]">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search business, seller name or email..."
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-950"
          />

          <select
            name="status"
            defaultValue={status}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-slate-950"
          >
            <option value="">All seller statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          <button
            type="submit"
            className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Filter
          </button>
        </div>

        {(search || status) && (
          <div className="mt-4">
            <Link
              href="/admin/sellers"
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
          Showing {sellers.length} seller
          {sellers.length === 1 ? "" : "s"}
        </p>

        <p className="hidden text-sm font-semibold text-slate-400 sm:block">
          {suspendedSellers} suspended
        </p>
      </div>

      {/* SELLER LIST */}
      <div className="mt-4 space-y-4">
        {sellers.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-2xl">
              🏪
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-950">
              No sellers found
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Try changing your search or status filter.
            </p>
          </section>
        ) : (
          sellers.map((seller) => (
            <article
              key={seller.id}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
                {/* SELLER INFO */}
                <div className="flex min-w-0 gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-100 text-xl font-black text-slate-700">
                    {seller.businessName
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="truncate text-lg font-black text-slate-950">
                        {seller.businessName}
                      </h2>

                      <SellerStatusBadge
                        status={seller.status}
                      />
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {seller.user.name}
                    </p>

                    <p className="mt-1 truncate text-sm text-slate-400">
                      {seller.user.email}
                    </p>
                  </div>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-117.5">
                  <MiniStat
                    label="Products"
                    value={String(
                      seller._count.products
                    )}
                  />

                  <MiniStat
                    label="Orders"
                    value={String(
                      seller._count.orderGroups
                    )}
                  />

                  <MiniStat
                    label="Reviews"
                    value={String(
                      seller._count.sellerReviews
                    )}
                  />

                  <MiniStat
                    label="Commission"
                    value={`${Number(
                      seller.commissionRate
                    )}%`}
                  />
                </div>

                {/* ACTION */}
                <Link
                  href={`/admin/sellers/${seller.id}`}
                  className="shrink-0 rounded-xl bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  Manage →
                </Link>
              </div>

              {/* STORE */}
              <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
                <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="font-bold text-slate-700">
                      Store:
                    </span>{" "}
                    <span className="text-slate-500">
                      {seller.store?.name ??
                        "No store created"}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-400">
                    Joined{" "}
                    {formatDate(seller.createdAt)}
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

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

function SellerStatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    APPROVED: "bg-emerald-100 text-emerald-800",
    REJECTED: "bg-rose-100 text-rose-800",
    SUSPENDED: "bg-slate-200 text-slate-700",
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
  }).format(date);
}