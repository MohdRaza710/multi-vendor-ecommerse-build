import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Store } from "lucide-react";
export default async function StoresPage() {
	const stores = await prisma.store.findMany({
		where: { isActive: true, seller: { status: "APPROVED" } },
		include: { seller: { select: { businessName: true, _count: { select: { products: true } } } } },
		orderBy: { name: "asc" },
	});

	return (
		<main className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
			<p className="text-sm font-bold uppercase tracking-widest text-slate-500">Independent commerce</p>
			<h1 className="mt-2 text-4xl font-black">Stores</h1>
			<div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
				{stores.map((s) => (
					<Link href={`/stores/${s.slug}`} key={s.id} className="rounded-3xl border bg-white p-6 hover:-translate-y-1 hover:shadow-xl">
						<div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100"><Store /></div>
						<h2 className="mt-5 text-xl font-black">{s.name}</h2>
						<p className="mt-2 line-clamp-2 text-sm text-slate-500">{s.description ?? "Discover this independent seller."}</p>
						<p className="mt-5 text-sm font-semibold">{s.seller._count.products} products →</p>
					</Link>
				))}
			</div>
		</main>
	);
}
