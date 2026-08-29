import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Star } from "lucide-react";

export default async function SellerReviewsPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  if (
    user.role !== "SELLER" ||
    !user.seller ||
    user.seller.status !== "APPROVED"
  ) {
    redirect("/seller/dashboard");
  }

  const reviews = await prisma.review.findMany({
    where: {
      product: {
        sellerId: user.seller.id,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      product: {
        select: {
          name: true,
        },
      },
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 lg:px-6">
      <h1 className="text-4xl font-black">
        Reviews
      </h1>

      <p className="mt-2 text-slate-500">
        Customer reviews for your products.
      </p>

      <div className="mt-8 space-y-4">
        {reviews.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-12 text-center text-slate-500">
            No reviews yet.
          </div>
        ) : (
          reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-2xl border bg-white p-6"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <div>
                  <h2 className="font-black">
                    {review.product.name}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    By {review.user.name}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Star
                    size={16}
                    fill="currentColor"
                  />

                  <span className="font-bold">
                    {review.rating}/5
                  </span>
                </div>
              </div>

              {review.title && (
                <h3 className="mt-5 font-bold">
                  {review.title}
                </h3>
              )}

              <p className="mt-2 leading-7 text-slate-600">
                {review.comment}
              </p>

              <span className="mt-4 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                {review.status}
              </span>
            </article>
          ))
        )}
      </div>
    </main>
  );
}