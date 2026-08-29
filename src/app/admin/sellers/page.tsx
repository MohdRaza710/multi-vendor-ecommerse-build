import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SellerActions from "@/components/admin/SellerActions";

export default async function AdminSellersPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");
  if (user.role !== "ADMIN") redirect("/");

  const sellers = await prisma.seller.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          createdAt: true,
          isActive: true,
        },
      },
      store: {
        select: {
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
          Administration
        </p>

        <h1 className="mt-2 text-4xl font-black text-slate-950">
          Seller Management
        </h1>

        <p className="mt-2 text-slate-500">
          Review seller applications and control seller access.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-sm font-bold">Seller</th>
                <th className="px-6 py-4 text-sm font-bold">Store</th>
                <th className="px-6 py-4 text-sm font-bold">Products</th>
                <th className="px-6 py-4 text-sm font-bold">Status</th>
                <th className="px-6 py-4 text-sm font-bold">Joined</th>
                <th className="px-6 py-4 text-right text-sm font-bold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {sellers.map((seller) => (
                <tr key={seller.id} className="hover:bg-slate-50">
                  <td className="px-6 py-5">
                    <p className="font-bold text-slate-950">
                      {seller.user.name}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {seller.user.email}
                    </p>
                  </td>

                  <td className="px-6 py-5">
                    <p className="font-semibold">
                      {seller.store?.name ?? seller.businessName}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      /stores/{seller.store?.slug ?? seller.slug}
                    </p>
                  </td>

                  <td className="px-6 py-5 font-semibold">
                    {seller._count.products}
                  </td>

                  <td className="px-6 py-5">
                    <StatusBadge status={seller.status} />
                  </td>

                  <td className="px-6 py-5 text-sm text-slate-500">
                    {seller.createdAt.toLocaleDateString()}
                  </td>

                  <td className="px-6 py-5">
                    <SellerActions
                      sellerId={seller.id}
                      status={seller.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!sellers.length && (
            <div className="p-12 text-center text-slate-500">
              No seller applications found.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    APPROVED: "bg-emerald-100 text-emerald-800",
    REJECTED: "bg-rose-100 text-rose-800",
    SUSPENDED: "bg-slate-200 text-slate-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${styles[status] ?? "bg-slate-100"}`}
    >
      {status}
    </span>
  );
}