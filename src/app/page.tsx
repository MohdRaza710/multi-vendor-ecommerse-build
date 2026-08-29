import Link from "next/link";
import { ArrowRight, ShieldCheck, Store, Truck, Zap } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const products = await prisma.product.findMany({
    where: { status: "PUBLISHED", seller: { status: "APPROVED" } },
    take: 8,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      compareAtPrice: true,
      rating: true,
      reviewCount: true,
      images: { where: { isPrimary: true }, take: 1 },
      seller: { select: { businessName: true, slug: true } },
    },
  });
  const categories = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    take: 6,
    orderBy: { name: "asc" },
  });
  return (
    <main>
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 lg:grid-cols-[1.1fr_.9fr] lg:px-6 lg:py-28">
          <div>
            <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
              ONE MARKET · MANY STORES
            </span>
            <h1 className="mt-6 max-w-3xl text-5xl font-black tracking-[-0.04em] sm:text-6xl">
              Everything you need, from sellers you can trust.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              A modern marketplace connecting independent stores with customers through one seamless shopping experience.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-slate-950">
                Explore products <ArrowRight size={18} />
              </Link>
              <Link href="/auth/register?role=SELLER" className="rounded-xl border border-white/15 px-5 py-3 font-bold hover:bg-white/5">
                Start selling
              </Link>
            </div>
          </div>
          <div className="relative min-h-[330px] rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/[.02] p-5 shadow-2xl">
            <div className="absolute inset-5 rounded-[1.5rem] bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.18),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(99,102,241,.4),transparent_40%)]" />
            <div className="relative grid h-full grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <Store size={25} />
                <p className="mt-14 text-3xl font-black">100+</p>
                <p className="text-sm text-slate-300">independent stores</p>
              </div>
              <div className="mt-12 rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <Zap size={25} />
                <p className="mt-14 text-3xl font-black">24/7</p>
                <p className="text-sm text-slate-300">always-on shopping</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Feature icon={<ShieldCheck />} title="Secure checkout" text="Validated prices, inventory and orders on the server." />
          <Feature icon={<Truck />} title="Multi-vendor orders" text="Shop multiple stores in one checkout." />
          <Feature icon={<Store />} title="Independent sellers" text="Discover stores and products in one place." />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-20 lg:px-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Curated for you</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Latest products</h2>
          </div>
          <Link href="/products" className="text-sm font-bold">View all →</Link>
        </div>
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Browse</p>
              <h2 className="mt-2 text-3xl font-black">Popular categories</h2>
            </div>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <Link key={c.id} href={`/products?category=${c.slug}`} className="group rounded-2xl border border-slate-200 p-6 hover:border-slate-950">
                <p className="text-lg font-bold">{c.name}</p>
                <p className="mt-2 text-sm text-slate-500">Explore products →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100">{icon}</div>
      <h3 className="mt-4 font-bold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}
