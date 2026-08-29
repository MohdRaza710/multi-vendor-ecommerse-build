import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";

export default async function SellerCouponsPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  if (
    user.role !== "SELLER" ||
    !user.seller ||
    user.seller.status !== "APPROVED"
  ) {
    redirect("/seller/dashboard");
  }

  const coupons = await prisma.coupon.findMany({
    where: {
      sellerId: user.seller.id,
    },
    orderBy: {
      startsAt: "desc",
    },
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <h1 className="text-4xl font-black">
        Coupons
      </h1>

      <p className="mt-2 text-slate-500">
        Manage discounts for your store.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {coupons.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-12 text-center text-slate-500 md:col-span-2">
            No coupons created yet.
          </div>
        ) : (
          coupons.map((coupon) => (
            <div
              key={coupon.id}
              className="rounded-2xl border bg-white p-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">
                  {coupon.code}
                </h2>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                  {coupon.isActive
                    ? "Active"
                    : "Inactive"}
                </span>
              </div>

              <p className="mt-4 text-2xl font-black">
                {coupon.type === "PERCENTAGE"
                  ? `${coupon.value}% OFF`
                  : `${money(coupon.value)} OFF`}
              </p>

              <div className="mt-5 space-y-2 text-sm text-slate-500">
                <p>
                  Used: {coupon.usedCount}
                  {coupon.usageLimit
                    ? ` / ${coupon.usageLimit}`
                    : ""}
                </p>

                <p>
                  Expires:{" "}
                  {coupon.expiresAt.toLocaleDateString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}