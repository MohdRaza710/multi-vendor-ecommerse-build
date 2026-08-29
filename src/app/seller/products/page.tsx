import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
} from "lucide-react";
import {
  deleteProduct,
  publishProduct,
  unpublishProduct,
} from "@/actions/seller";

export default async function SellerProductsPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  if (
    user.role !== "SELLER" ||
    !user.seller ||
    user.seller.status !== "APPROVED"
  ) {
    redirect("/seller/dashboard");
  }

  const products = await prisma.product.findMany({
    where: {
      sellerId: user.seller.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      category: {
        select: {
          name: true,
        },
      },
      inventory: true,
      images: {
        where: {
          isPrimary: true,
        },
        take: 1,
      },
    },
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Seller
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Products
          </h1>

          <p className="mt-2 text-slate-500">
            Manage your products and inventory.
          </p>
        </div>

        <Link
          href="/seller/products/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
        >
          <Plus size={18} />
          Add Product
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border bg-white">
        {products.length === 0 ? (
          <div className="p-16 text-center">
            <Package className="mx-auto text-slate-400" size={40} />

            <h2 className="mt-4 text-xl font-black">
              No products yet
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Add your first product to start selling.
            </p>

            <Link
              href="/seller/products/new"
              className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
            >
              Create Product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 overflow-hidden rounded-xl bg-slate-100">
                          {product.images[0] ? (
                            <img
                              src={product.images[0].url}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>

                        <div>
                          <p className="font-bold">
                            {product.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            SKU: {product.sku}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm">
                      {product.category.name}
                    </td>

                    <td className="px-6 py-4 font-bold">
                      {money(product.price)}
                    </td>

                    <td className="px-6 py-4">
                      {product.inventory?.quantity ?? 0}
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                        {product.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/seller/products/${product.id}/edit`}
                          className="rounded-lg border p-2 hover:bg-slate-50"
                        >
                          <Pencil size={16} />
                        </Link>

                        {product.status === "PUBLISHED" ? (
                          <form action={unpublishProduct}>
                            <input
                              type="hidden"
                              name="productId"
                              value={product.id}
                            />

                            <button
                              className="rounded-lg border px-3 py-2 text-xs font-bold hover:bg-slate-50"
                            >
                              Unpublish
                            </button>
                          </form>
                        ) : (
                          <form action={publishProduct}>
                            <input
                              type="hidden"
                              name="productId"
                              value={product.id}
                            />

                            <button
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                            >
                              Publish
                            </button>
                          </form>
                        )}

                        <form action={deleteProduct}>
                          <input
                            type="hidden"
                            name="productId"
                            value={product.id}
                          />

                          <button
                            className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}