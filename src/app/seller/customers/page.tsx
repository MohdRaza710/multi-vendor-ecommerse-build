import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SellerCustomersPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  if (
    user.role !== "SELLER" ||
    !user.seller ||
    user.seller.status !== "APPROVED"
  ) {
    redirect("/seller/dashboard");
  }

  const customers = await prisma.user.findMany({
    where: {
      orders: {
        some: {
          sellerGroups: {
            some: {
              sellerId: user.seller.id,
            },
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      _count: {
        select: {
          orders: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <h1 className="text-4xl font-black">
        Customers
      </h1>

      <p className="mt-2 text-slate-500">
        Customers who purchased from your store.
      </p>

      <div className="mt-8 overflow-hidden rounded-3xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="border-b bg-slate-50">
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Orders</th>
                <th className="px-6 py-4">Joined</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-6 py-4 font-bold">
                    {customer.name}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-500">
                    {customer.email}
                  </td>

                  <td className="px-6 py-4 font-bold">
                    {customer._count.orders}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-500">
                    {customer.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}