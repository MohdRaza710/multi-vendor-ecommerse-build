import Link from "next/link";
import { Star } from "lucide-react";
import { money } from "@/lib/format";

type Product = {
	id: string;
	name: string;
	slug: string;
	price: any;
	compareAtPrice: any;
	rating: any;
	reviewCount: number;
	images: { url: string }[];
	seller: { businessName: string; slug: string };
};

export default function ProductCard({ product }: { product: Product }) {
	return (
		<Link
			href={`/products/${product.slug}`}
			className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-xl"
		>
			<div className="aspect-4/3 overflow-hidden bg-slate-100">
				{product.images[0]?.url ? (
					<img
						src={product.images[0].url}
						alt={product.name}
						className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
					/>
				) : (
					<div className="grid h-full place-items-center text-sm text-slate-400">
						No image
					</div>
				)}
			</div>
			<div className="p-4">
				<p className="mb-1 text-xs font-medium text-slate-500">
					{product.seller.businessName}
				</p>
				<h3 className="line-clamp-2 min-h-11 font-semibold text-slate-950">
					{product.name}
				</h3>
				<div className="mt-3 flex items-center gap-2">
					<span className="text-lg font-black">{money(product.price)}</span>
					{product.compareAtPrice &&
					Number(product.compareAtPrice) > Number(product.price) ? (
						<span className="text-xs text-slate-400 line-through">
							{money(product.compareAtPrice)}
						</span>
					) : null}
				</div>
				<div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
					<Star size={13} fill="currentColor" /> {Number(product.rating).toFixed(1)} (
					{product.reviewCount})
				</div>
			</div>
		</Link>
	);
}
