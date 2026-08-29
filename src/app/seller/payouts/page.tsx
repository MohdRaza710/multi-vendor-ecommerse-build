import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";

export default async function SellerPayoutsPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  if (
    user.role !== "SELLER" ||
    !user.seller ||
    user.seller.status !== "APPROVED"
  ) {
    redirect("/seller/dashboard");
  }

  const [earnings, payouts] = await Promise.all([
    prisma.commission.aggregate({
      where: {
        sellerId: user.seller.id,
      },
      _sum: {
        sellerAmount: true,
      },
    }),

    prisma.payout.findMany({
      where: {
        sellerId: user.seller.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const totalEarned = Number(
    earnings._sum.sellerAmount ?? 0
  );

  const totalPaid = payouts
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const available = totalEarned - totalPaid;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <h1 className="text-4xl font-black">
        Payouts
      </h1>

      <p className="mt-2 text-slate-500">
        View your earnings and payout history.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Stat
          title="Total Earned"
          value={money(totalEarned)}
        />

        <Stat
          title="Paid Out"
          value={money(totalPaid)}
        />

        <Stat
          title="Available Balance"
          value={money(available)}
        />
      </div>

      <section className="mt-8 overflow-hidden rounded-3xl border bg-white">
        <div className="border-b p-6">
          <h2 className="text-xl font-black">
            Payout History
          </h2>
        </div>

        <div className="divide-y">
          {payouts.length === 0 ? (
            <p className="p-8 text-center text-slate-500">
              No payouts yet.
            </p>
          ) : (
            payouts.map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between p-5"
              >
                <div>
                  <p className="font-bold">
                    {payout.reference ??
                      "Payout"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {payout.createdAt.toLocaleDateString()}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-black">
                    {money(payout.amount)}
                  </p>

                  <span className="text-xs font-bold text-slate-500">
                    {payout.status}
                  </span>
                </div>
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
    <div className="rounded-2xl border bg-white p-6">
      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-black">
        {value}
      </p>
    </div>
  );
}