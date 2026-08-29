import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, ShoppingCart, Trash2, Store } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function WishlistPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/auth/login");
    }

    const wishlist = await prisma.wishlist.findUnique({
        where: {
            userId: user.id,
        },
        include: {
            items: {
                include: {
                    product: {
                        include: {
                            images: {
                                orderBy: {
                                    sortOrder: "asc",
                                },
                            },
                            seller: {
                                select: {
                                    businessName: true,
                                    slug: true,
                                    store: {
                                        select: {
                                            name: true,
                                            slug: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    });

    const items = wishlist?.items ?? [];

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
                {/* Header */}
                <div className="mb-10">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                            <Heart className="h-6 w-6" />
                        </div>

                        <div>
                            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
                                Your account
                            </p>

                            <h1 className="text-3xl font-black text-slate-900 md:text-4xl">
                                Wishlist
                            </h1>
                        </div>
                    </div>

                    <p className="mt-3 text-slate-500">
                        Products you saved for later.
                    </p>
                </div>

                {/* Empty wishlist */}
                {items.length === 0 ? (
                    <div className="rounded-3xl border bg-white px-6 py-20 text-center shadow-sm">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                            <Heart className="h-9 w-9 text-slate-400" />
                        </div>

                        <h2 className="mt-6 text-2xl font-black text-slate-900">
                            Your wishlist is empty
                        </h2>

                        <p className="mx-auto mt-3 max-w-md text-slate-500">
                            Save products you love and come back to them whenever you are
                            ready to buy.
                        </p>

                        <Link
                            href="/products"
                            className="mt-7 inline-flex items-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
                        >
                            Browse Products
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Wishlist count */}
                        <div className="mb-5 flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-500">
                                {items.length} {items.length === 1 ? "item" : "items"}
                            </p>

                            <Link
                                href="/products"
                                className="text-sm font-bold text-slate-900 hover:underline"
                            >
                                Continue Shopping
                            </Link>
                        </div>

                        {/* Products */}
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {items.map((item) => {
                                const product = item.product;

                                const primaryImage =
                                    product.images.find((image) => image.isPrimary)?.url ??
                                    product.images[0]?.url ??
                                    "/placeholder-product.png";

                                const storeName =
                                    product.seller.store?.name ??
                                    product.seller.businessName;

                                const storeSlug =
                                    product.seller.store?.slug ??
                                    product.seller.slug;

                                return (
                                    <article
                                        key={item.id}
                                        className="group overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                                    >
                                        {/* Image */}
                                        <Link
                                            href={`/products/${product.slug}`}
                                            className="relative block aspect-square overflow-hidden bg-slate-100"
                                        >
                                            <img
                                                src={primaryImage}
                                                alt={product.images[0]?.altText ?? product.name}
                                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                            />

                                            {/* Wishlist badge */}
                                            <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur">
                                                <Heart className="h-4 w-4 fill-current text-red-500" />
                                            </div>
                                        </Link>

                                        {/* Content */}
                                        <div className="p-5">
                                            {/* Seller */}
                                            <Link
                                                href={`/stores/${storeSlug}`}
                                                className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900"
                                            >
                                                <Store className="h-3.5 w-3.5" />
                                                {storeName}
                                            </Link>

                                            {/* Product */}
                                            <Link href={`/products/${product.slug}`}>
                                                <h2 className="line-clamp-2 min-h-[3.5rem] text-lg font-black text-slate-900 hover:underline">
                                                    {product.name}
                                                </h2>
                                            </Link>

                                            {/* Rating */}
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-sm font-bold">
                                                    ★ {Number(product.rating).toFixed(1)}
                                                </span>

                                                <span className="text-xs text-slate-400">
                                                    ({product.reviewCount}{" "}
                                                    {product.reviewCount === 1 ? "review" : "reviews"})
                                                </span>
                                            </div>

                                            {/* Price */}
                                            <div className="mt-4 flex items-center gap-2">
                                                <span className="text-xl font-black text-slate-900">
                                                    ${Number(product.price).toFixed(2)}
                                                </span>

                                                {product.compareAtPrice && (
                                                    <span className="text-sm text-slate-400 line-through">
                                                        ${Number(product.compareAtPrice).toFixed(2)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
                                                <Link
                                                    href={`/products/${product.slug}`}
                                                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
                                                >
                                                    <ShoppingCart className="h-4 w-4" />
                                                    View Product
                                                </Link>

                                                <button
                                                    type="button"
                                                    disabled
                                                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-300"
                                                    title="Remove from wishlist"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}