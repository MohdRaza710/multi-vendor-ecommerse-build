import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateInventory } from "@/actions/seller";

export default async function SellerInventoryPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (
    user.role !== "SELLER" ||
    !user.seller
  ) {
    redirect("/");
  }

  if (user.seller.status !== "APPROVED") {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
          <h1 className="text-3xl font-black text-amber-900">
            Seller account pending approval
          </h1>

          <p className="mt-3 text-sm text-amber-800">
            Your seller account must be approved by an
            administrator before you can manage inventory.
          </p>

          <Link
            href="/seller/dashboard"
            className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const products = await prisma.product.findMany({
    where: {
      sellerId: user.seller.id,
    },

    orderBy: {
      updatedAt: "desc",
    },

    include: {
      inventory: true,

      images: {
        where: {
          isPrimary: true,
        },

        take: 1,

        select: {
          url: true,
        },
      },

      variants: {
        where: {
          isActive: true,
        },

        select: {
          stock: true,
        },
      },
    },
  });

  // --------------------------------------------------
  // Inventory statistics
  // --------------------------------------------------

  const totalProducts = products.length;

  const outOfStock = products.filter(
    (product) =>
      product.status === "OUT_OF_STOCK" ||
      (
        product.inventory &&
        product.inventory.quantity <= 0
      )
  ).length;

  const lowStock = products.filter((product) => {
    if (!product.inventory) return false;

    const available =
      product.inventory.quantity -
      product.inventory.reservedQuantity;

    return (
      available > 0 &&
      available <=
      product.inventory.lowStockThreshold
    );
  }).length;

  const totalUnits = products.reduce(
    (sum, product) =>
      sum +
      (product.inventory?.quantity ?? 0),
    0
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Seller dashboard
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
            Inventory
          </h1>

          <p className="mt-2 text-slate-500">
            Manage stock levels for your products.
          </p>
        </div>

        <Link
          href="/seller/dashboard"
          className="rounded-xl bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white hover:bg-slate-800"
        >
          Back to dashboard
        </Link>
      </div>

      {/* Statistics */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          title="Products"
          value={String(totalProducts)}
        />

        <Stat
          title="Total units"
          value={String(totalUnits)}
        />

        <Stat
          title="Low stock"
          value={String(lowStock)}
        />

        <Stat
          title="Out of stock"
          value={String(outOfStock)}
        />
      </div>

      {/* Inventory table */}
      <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-xl font-black text-slate-950">
            Product inventory
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Update stock quantities for your products.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-xl font-black text-slate-950">
              No products yet
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Create a product first to manage its inventory.
            </p>

            <Link
              href="/seller/products"
              className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
            >
              Manage products
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {products.map((product) => {
              const quantity =
                product.inventory?.quantity ?? 0;

              const reserved =
                product.inventory?.reservedQuantity ?? 0;

              const available =
                Math.max(0, quantity - reserved);

              const threshold =
                product.inventory
                  ?.lowStockThreshold ?? 5;

              const isOutOfStock =
                available <= 0 ||
                product.status === "OUT_OF_STOCK";

              const isLowStock =
                !isOutOfStock &&
                available <= threshold;

              return (
                <div
                  key={product.id}
                  className="p-6"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    {/* Product */}
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                        {product.images[0]?.url ? (
                          <img
                            src={product.images[0].url}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full place-items-center text-xs text-slate-400">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-black text-slate-950">
                          {product.name}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          SKU: {product.sku}
                        </p>

                        <StatusBadge
                          status={
                            product.status
                          }
                          isLowStock={
                            isLowStock
                          }
                        />
                      </div>
                    </div>

                    {/* Inventory information */}
                    <div className="grid grid-cols-3 gap-4 lg:min-w-[360px]">
                      <InventoryStat
                        label="Stock"
                        value={quantity}
                      />

                      <InventoryStat
                        label="Reserved"
                        value={reserved}
                      />

                      <InventoryStat
                        label="Available"
                        value={available}
                        highlight={
                          isOutOfStock
                            ? "danger"
                            : isLowStock
                              ? "warning"
                              : "normal"
                        }
                      />
                    </div>

                    {/* Update form */}
                    <form
                      action={updateInventory}
                      className="flex flex-col gap-2 sm:flex-row sm:items-end"
                    >
                      <input
                        type="hidden"
                        name="productId"
                        value={product.id}
                      />

                      <div>
                        <label
                          htmlFor={`stock-${product.id}`}
                          className="mb-1 block text-xs font-bold text-slate-600"
                        >
                          New stock
                        </label>

                        <input
                          id={`stock-${product.id}`}
                          name="quantity"
                          type="number"
                          min="0"
                          defaultValue={quantity}
                          required
                          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-950 sm:w-32"
                        />
                      </div>

                      <button
                        type="submit"
                        className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                      >
                        Update stock
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

// --------------------------------------------------
// Components
// --------------------------------------------------

function Stat({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

function InventoryStat({
  label,
  value,
  highlight = "normal",
}: {
  label: string;
  value: number;
  highlight?: "normal" | "warning" | "danger";
}) {
  const valueClass =
    highlight === "danger"
      ? "text-rose-600"
      : highlight === "warning"
        ? "text-amber-600"
        : "text-slate-950";

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-black ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
  isLowStock,
}: {
  status: string;
  isLowStock: boolean;
}) {
  if (status === "OUT_OF_STOCK") {
    return (
      <span className="mt-2 inline-block rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700">
        Out of stock
      </span>
    );
  }

  if (isLowStock) {
    return (
      <span className="mt-2 inline-block rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
        Low stock
      </span>
    );
  }

  return (
    <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
      {status === "PUBLISHED"
        ? "In stock"
        : status}
    </span>
  );
}