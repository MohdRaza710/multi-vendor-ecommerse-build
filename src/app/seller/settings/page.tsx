import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function SellerSettingsPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  if (
    user.role !== "SELLER" ||
    !user.seller
  ) {
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 lg:px-6">
      <h1 className="text-4xl font-black">
        Settings
      </h1>

      <p className="mt-2 text-slate-500">
        Your seller account settings.
      </p>

      <div className="mt-8 space-y-5">
        <section className="rounded-3xl border bg-white p-6">
          <h2 className="text-xl font-black">
            Account
          </h2>

          <div className="mt-5 space-y-4">
            <Info
              label="Name"
              value={user.name}
            />

            <Info
              label="Email"
              value={user.email}
            />

            <Info
              label="Role"
              value={user.role}
            />

            <Info
              label="Seller Status"
              value={user.seller.status}
            />
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-6">
          <h2 className="text-xl font-black">
            Commission
          </h2>

          <p className="mt-3 text-slate-500">
            Current platform commission rate
          </p>

          <p className="mt-2 text-3xl font-black">
            {Number(user.seller.commissionRate).toFixed(2)}%
          </p>

          <p className="mt-3 text-xs text-slate-400">
            Commission rates are controlled by the platform
            administrator.
          </p>
        </section>
      </div>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 font-bold">
        {value}
      </p>
    </div>
  );
}