import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";

export default async function SellerAnalyticsPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  if (
    user.role !== "SELLER" ||
    !user.seller ||
    user.seller.status !== "APPROVED"
  ) {
    redirect("/seller/dashboard");
  }

  const sellerId = user.seller.id;

  const [
    revenue,
    orders,
    products,
    ratings,
  ] = await Promise.all([
    prisma.commission.aggregate({
      where: {
        sellerId,
      },
      _sum: {
        grossAmount: true,
        commissionAmount: true,
        sellerAmount: true,
      },
    }),

    prisma.sellerOrder.groupBy({
      by: ["status"],
      where: {
        sellerId,
      },
      _count: {
        id: true,
      },
    }),

    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        sellerOrder: {
          sellerId,
        },
      },
      _sum: {
        quantity: true,
        totalPrice: true,
      },
      orderBy: {
        _sum: {
          totalPrice: "desc",
        },
      },
      take: 10,
    }),

    prisma.product.aggregate({
      where: {
        sellerId,
      },
      _avg: {
        rating: true,
      },
    }),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <h1 className="text-4xl font-black">
        Analytics
      </h1>

      <p className="mt-2 text-slate-500">
        Overview of your store performance.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <Stat
          title="Gross Sales"
          value={money(
            revenue._sum.grossAmount ?? 0
          )}
        />

        <Stat
          title="Commission"
          value={money(
            revenue._sum.commissionAmount ?? 0
          )}
        />

        <Stat
          title="Seller Revenue"
          value={money(
            revenue._sum.sellerAmount ?? 0
          )}
        />

        <Stat
          title="Average Rating"
          value={Number(
            ratings._avg.rating ?? 0
          ).toFixed(1)}
        />
      </div>

      <section className="mt-8 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-black">
          Order Status
        </h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {orders.map((item) => (
            <div
              key={item.status}
              className="rounded-2xl bg-slate-50 p-5"
            >
              <p className="text-sm text-slate-500">
                {item.status}
              </p>

              <p className="mt-2 text-2xl font-black">
                {item._count.id}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border bg-white p-6">
        <h2 className="text-xl font-black">
          Top Products
        </h2>

        <div className="mt-5 space-y-3">
          {products.length === 0 ? (
            <p className="text-sm text-slate-500">
              No sales data yet.
            </p>
          ) : (
            products.map((product, index) => (
              <div
                key={product.productId}
                className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
              >
                <span className="font-bold">
                  #{index + 1} Product
                </span>

                <span className="text-sm font-bold">
                  {product._sum.quantity ?? 0} sold
                </span>

                <span className="font-black">
                  {money(
                    product._sum.totalPrice ?? 0
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
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
    <div className="rounded-2xl border bg-white p-5">
      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-black">
        {value}
      </p>
    </div>
  );
}