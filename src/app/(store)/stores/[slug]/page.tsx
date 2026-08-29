import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";

export default async function StorePage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const store = await prisma.store.findFirst({
		where: {
			slug,
			isActive: true,
			seller: { status: "APPROVED" },
		},
		include: {
			seller: {
				include: {
					products: {
						where: { status: "PUBLISHED" },
						include: {
							images: { where: { isPrimary: true }, take: 1 },
							seller: { select: { businessName: true, slug: true } },
						},
						orderBy: { createdAt: "desc" },
					},
				},
			},
		},
	});

	if (!store) return notFound();

	return (
		<main>
			<section className="bg-slate-950 text-white">
				<div className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
					<p className="text-sm text-slate-400">STORE</p>
					<h1 className="mt-2 text-5xl font-black">{store.name}</h1>
					<p className="mt-4 max-w-2xl text-slate-300">
						{store.description ?? "An independent store on MarketHub."}
					</p>
				</div>
			</section>

			<section className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
				<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
					{store.seller.products.map((product) => (
						<ProductCard key={product.id} product={product} />
					))}
				</div>
			</section>
		</main>
	);
}
