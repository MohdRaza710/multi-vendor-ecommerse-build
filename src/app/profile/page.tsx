import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const roleLabel =
    user.role === "SELLER"
      ? "Seller"
      : user.role === "ADMIN"
        ? "Administrator"
        : "Customer";

  const statusLabel = user.isActive ? "Active" : "Inactive";

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 lg:px-6">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
          Account
        </p>

        <h1 className="mt-2 text-4xl font-black text-slate-900">
          Profile
        </h1>

        <p className="mt-2 text-slate-500">
          Manage your account information.
        </p>
      </div>

      {/* Profile Header */}
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-slate-900 text-2xl font-black text-white">
            {user.name?.charAt(0).toUpperCase() || "U"}
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900">
              {user.name}
            </h2>

            <p className="text-sm text-slate-500">
              {user.email}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase">
                {roleLabel}
              </span>

              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                  user.isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="grid gap-6 pt-6 md:grid-cols-2">
          <div>
            <label className="text-sm font-bold text-slate-700">
              Full Name
            </label>

            <div className="mt-2 rounded-xl border bg-slate-50 px-4 py-3">
              {user.name}
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">
              Email
            </label>

            <div className="mt-2 rounded-xl border bg-slate-50 px-4 py-3">
              {user.email}
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">
              Account Role
            </label>

            <div className="mt-2 rounded-xl border bg-slate-50 px-4 py-3">
              {roleLabel}
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">
              Account Status
            </label>

            <div className="mt-2 rounded-xl border bg-slate-50 px-4 py-3">
              {statusLabel}
            </div>
          </div>
        </div>

        {/* Seller Information */}
        {user.role === "SELLER" && user.seller && (
          <div className="mt-8 border-t pt-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
                  Seller Account
                </p>

                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  {user.seller.store?.name ??
                    user.seller.businessName}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Seller status:{" "}
                  <span className="font-bold">
                    {user.seller.status}
                  </span>
                </p>
              </div>

              <Link
                href="/seller/dashboard"
                className="rounded-xl bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Open Seller Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}