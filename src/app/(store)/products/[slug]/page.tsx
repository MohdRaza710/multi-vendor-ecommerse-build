import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Star, Store } from "lucide-react";
import AddToCart from "@/components/AddToCart";
import AddToWishlist from "@/components/product/AddToWishlist";
import Link from "next/link";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const p = await prisma.product.findUnique({
        where: { slug },
        select: {
            name: true,
            shortDescription: true,
        },
    });

    return {
        title: p?.name,
        description: p?.shortDescription ?? p?.name,
    };
}

export default async function ProductPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const p = await prisma.product.findFirst({
        where: {
            slug,
            status: "PUBLISHED",
        },
        include: {
            images: {
                orderBy: {
                    sortOrder: "asc",
                },
            },

            variants: {
                where: {
                    isActive: true,
                },
            },

            inventory: true,

            seller: {
                include: {
                    store: true,
                },
            },

            category: true,

            reviews: {
                where: {
                    status: "APPROVED",
                },
                take: 8,
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    user: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
    });

    if (!p) {
        return notFound();
    }

    /*
     * Check whether the currently logged-in customer
     * already has this product in their wishlist.
     */
    const user = await getCurrentUser();

    let isWishlisted = false;

    if (user) {
        const wishlist = await prisma.wishlist.findUnique({
            where: {
                userId: user.id,
            },
            select: {
                items: {
                    where: {
                        productId: p.id,
                    },
                    select: {
                        id: true,
                    },
                    take: 1,
                },
            },
        });

        isWishlisted = (wishlist?.items.length ?? 0) > 0;
    }

    const stock = p.variants.length
        ? p.variants.reduce((total, variant) => total + variant.stock, 0)
        : (p.inventory?.quantity ?? 0);

    return (
        <main className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
            <div className="grid gap-10 lg:grid-cols-2">
                {/* Product Images */}
                <div>
                    <div className="aspect-square overflow-hidden rounded-3xl bg-white">
                        {p.images[0]?.url ? (
                            <img
                                src={p.images[0].url}
                                alt={p.name}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="grid h-full place-items-center text-slate-400">
                                No image
                            </div>
                        )}
                    </div>

                    <div className="mt-3 grid grid-cols-5 gap-3">
                        {p.images.slice(0, 5).map((image) => (
                            <img
                                key={image.id}
                                src={image.url}
                                alt={image.altText ?? p.name}
                                className="aspect-square rounded-xl object-cover"
                            />
                        ))}
                    </div>
                </div>

                {/* Product Information */}
                <div className="pt-2">
                    <Link
                        href={`/stores/${p.seller.store?.slug ?? p.seller.slug
                            }`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950"
                    >
                        <Store size={16} />
                        {p.seller.businessName}
                    </Link>

                    <h1 className="mt-4 text-4xl font-black tracking-tight">
                        {p.name}
                    </h1>

                    <div className="mt-4 flex items-center gap-2 text-sm">
                        <Star
                            size={16}
                            fill="currentColor"
                        />
                        {Number(p.rating).toFixed(1)} · {p.reviewCount} reviews
                    </div>

                    {/* Price */}
                    <div className="mt-7 flex items-end gap-3">
                        <span className="text-4xl font-black">
                            {money(p.price)}
                        </span>

                        {p.compareAtPrice &&
                            Number(p.compareAtPrice) > Number(p.price) ? (
                            <span className="pb-1 text-lg text-slate-400 line-through">
                                {money(p.compareAtPrice)}
                            </span>
                        ) : null}
                    </div>

                    <p className="mt-5 leading-7 text-slate-600">
                        {p.description}
                    </p>

                    {/* Purchase Box */}
                    <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex items-center justify-between">
                            <span className="font-bold">
                                Availability
                            </span>

                            <span
                                className={
                                    stock > 0
                                        ? "text-emerald-600"
                                        : "text-rose-600"
                                }
                            >
                                {stock > 0
                                    ? `${stock} in stock`
                                    : "Out of stock"}
                            </span>
                        </div>

                        <AddToCart
                            productId={p.id}
                            disabled={stock <= 0}
                        />

                        <AddToWishlist
                            productId={p.id}
                            initialWishlisted={isWishlisted}
                        />
                    </div>

                    {/* Seller */}
                    <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-950 p-5 text-white">
                        <div>
                            <p className="font-bold">
                                {p.seller.store?.name ??
                                    p.seller.businessName}
                            </p>

                            <p className="mt-1 text-sm text-slate-400">
                                Independent seller
                            </p>
                        </div>

                        <Link
                            href={`/stores/${p.seller.store?.slug ?? p.seller.slug
                                }`}
                            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950"
                        >
                            View store
                        </Link>
                    </div>
                </div>
            </div>

            {/* Reviews */}
            <section className="mt-14">
                <h2 className="text-2xl font-black">
                    Customer reviews
                </h2>

                <div className="mt-5 space-y-3">
                    {p.reviews.length ? (
                        p.reviews.map((review) => (
                            <article
                                key={review.id}
                                className="rounded-2xl border border-slate-200 bg-white p-5"
                            >
                                <div className="flex items-center justify-between">
                                    <b>{review.user.name}</b>

                                    <span className="text-sm">
                                        {"★".repeat(review.rating)}
                                    </span>
                                </div>

                                <p className="mt-3 text-slate-600">
                                    {review.comment}
                                </p>
                            </article>
                        ))
                    ) : (
                        <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
                            No approved reviews yet.
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}