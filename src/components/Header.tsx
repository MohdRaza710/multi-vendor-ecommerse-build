import Link from "next/link";
import { ShoppingBag, Store, UserCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";

export default async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-white">
            M
          </span>
          MarketHub
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          <Link href="/products" className="hover:text-slate-950">Shop</Link>
          <Link href="/stores" className="hover:text-slate-950">Stores</Link>
          <Link href="/categories" className="hover:text-slate-950">Categories</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/cart" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100">
            <ShoppingBag size={19} />
          </Link>
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href={user.role === "ADMIN" ? "/admin/dashboard" : user.role === "SELLER" ? "/seller/dashboard" : "/dashboard"}
                className="hidden rounded-xl px-3 py-2 text-sm font-semibold hover:bg-slate-100 sm:block"
              >
                Dashboard
              </Link>
              <form action={logoutAction}>
                <button className="hidden rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:block">
                  Logout
                </button>
              </form>
              <UserCircle className="text-slate-500 sm:hidden" />
            </div>
          ) : (
            <Link href="/auth/login" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
