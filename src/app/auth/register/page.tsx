import { registerAction } from "@/actions/auth";
import Link from "next/link";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const role =
    params.role === "SELLER" ? "SELLER" : "CUSTOMER";

  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md items-center px-4 py-12">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
          Create account
        </p>

        <h1 className="mt-2 text-3xl font-black">
          Join MarketHub
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Choose how you want to use MarketHub.
        </p>

        {/* Account Type */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/auth/register?role=CUSTOMER"
            className={`rounded-xl border px-4 py-3 text-center text-sm font-bold transition ${
              role === "CUSTOMER"
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Customer
          </Link>

          <Link
            href="/auth/register?role=SELLER"
            className={`rounded-xl border px-4 py-3 text-center text-sm font-bold transition ${
              role === "SELLER"
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Seller
          </Link>
        </div>

        {role === "SELLER" && (
          <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-bold">Seller account</p>
            <p className="mt-1">
              Your seller account will require admin approval before
              you can publish products.
            </p>
          </div>
        )}

        <form action={registerAction} className="mt-7 space-y-4">
          <input
            type="hidden"
            name="role"
            value={role}
          />

          {/* Full Name */}
          <label className="block text-sm font-semibold">
            Full name

            <input
              name="name"
              required
              className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-slate-950"
              placeholder="Your name"
            />
          </label>

          {/* Email */}
          <label className="block text-sm font-semibold">
            Email

            <input
              name="email"
              type="email"
              required
              className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-slate-950"
              placeholder="you@example.com"
            />
          </label>

          {/* Password */}
          <label className="block text-sm font-semibold">
            Password

            <input
              name="password"
              type="password"
              minLength={8}
              required
              className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-slate-950"
              placeholder="At least 8 characters"
            />

            <span className="mt-1 block text-xs font-normal text-slate-400">
              Use at least 8 characters.
            </span>
          </label>

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-950 py-3 font-bold text-white transition hover:bg-slate-800"
          >
            Create{" "}
            {role === "SELLER"
              ? "seller"
              : "customer"}{" "}
            account
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already registered?{" "}
          <Link
            className="font-bold text-slate-950 hover:underline"
            href="/auth/login"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}