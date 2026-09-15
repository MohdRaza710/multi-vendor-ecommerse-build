"use server";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function parseDecimal(
  value: FormDataEntryValue | null,
  fieldName: string,
  required = true,
) {
  const valueString = typeof value === "string" ? value.trim() : "";

  if (!valueString) {
    if (required) {
      throw new Error(`${fieldName} is required.`);
    }

    return null;
  }

  const decimal = new Prisma.Decimal(valueString);

  if (!decimal.isFinite() || decimal.isNegative()) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  return decimal;
}

function parseInteger(
  value: FormDataEntryValue | null,
  fieldName: string,
  defaultValue = 0,
) {
  const valueString = typeof value === "string" ? value.trim() : "";

  if (!valueString) {
    return defaultValue;
  }

  const number = Number(valueString);

  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  return number;
}

export async function updateProduct(
  productId: string,
  formData: FormData,
) {
  const user = await getCurrentUser();

  if (
    !user ||
    user.role !== "SELLER" ||
    !user.seller ||
    user.seller.status !== "APPROVED"
  ) {
    throw new Error("FORBIDDEN");
  }

  // --------------------------------------------------
  // Verify product belongs to the logged-in seller
  // --------------------------------------------------

  const existingProduct = await prisma.product.findFirst({
    where: {
      id: productId,
      sellerId: user.seller.id,
    },
    select: {
      id: true,
      sellerId: true,
    },
  });

  if (!existingProduct) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  // --------------------------------------------------
  // Read form values
  // --------------------------------------------------

  const name = String(formData.get("name") ?? "").trim();
  const description = String(
    formData.get("description") ?? "",
  ).trim();

  const shortDescriptionValue = String(
    formData.get("shortDescription") ?? "",
  ).trim();

  const shortDescription =
    shortDescriptionValue || null;

  const sku = String(formData.get("sku") ?? "").trim();

  const brandValue = String(
    formData.get("brand") ?? "",
  ).trim();

  const brand = brandValue || null;

  const categoryId = String(
    formData.get("categoryId") ?? "",
  ).trim();

  const status = String(
    formData.get("status") ?? "",
  ).trim();

  // --------------------------------------------------
  // Validate basic fields
  // --------------------------------------------------

  if (!name) {
    throw new Error("Product name is required.");
  }

  if (!description) {
    throw new Error("Description is required.");
  }

  if (!sku) {
    throw new Error("SKU is required.");
  }

  if (!categoryId) {
    throw new Error("Category is required.");
  }

  const validStatuses = [
    "DRAFT",
    "PUBLISHED",
    "OUT_OF_STOCK",
    "ARCHIVED",
  ] as const;

  if (
    !validStatuses.includes(
      status as (typeof validStatuses)[number],
    )
  ) {
    throw new Error("Invalid product status.");
  }

  // --------------------------------------------------
  // Prices
  // --------------------------------------------------

  const price = parseDecimal(
    formData.get("price"),
    "Price",
  );

  const compareAtPrice = parseDecimal(
    formData.get("compareAtPrice"),
    "Compare-at price",
    false,
  );

  const costPrice = parseDecimal(
    formData.get("costPrice"),
    "Cost price",
    false,
  );

  // --------------------------------------------------
  // Inventory
  // --------------------------------------------------

  const quantity = parseInteger(
    formData.get("quantity"),
    "Stock quantity",
  );

  const lowStockThreshold = parseInteger(
    formData.get("lowStockThreshold"),
    "Low stock threshold",
    5,
  );

  // --------------------------------------------------
  // Verify category exists
  // --------------------------------------------------

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!category) {
    throw new Error("CATEGORY_NOT_FOUND");
  }

  // --------------------------------------------------
  // Check SKU belongs to this product
  // --------------------------------------------------

  const skuExists = await prisma.product.findFirst({
    where: {
      sku,
      NOT: {
        id: productId,
      },
    },
    select: {
      id: true,
    },
  });

  if (skuExists) {
    throw new Error(
      "This SKU is already being used by another product.",
    );
  }

  // --------------------------------------------------
  // Update product + inventory atomically
  // --------------------------------------------------

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: {
        id: productId,
      },
      data: {
        name,
        description,
        shortDescription,
        sku,
        price,
        compareAtPrice,
        costPrice,
        brand,
        categoryId,
        status: status as
          | "DRAFT"
          | "PUBLISHED"
          | "OUT_OF_STOCK"
          | "ARCHIVED",
      },
    });

    // ------------------------------------------------
    // Update existing inventory or create it
    // ------------------------------------------------

    await tx.inventory.upsert({
      where: {
        productId,
      },
      update: {
        quantity,
        lowStockThreshold,
      },
      create: {
        productId,
        quantity,
        reservedQuantity: 0,
        lowStockThreshold,
      },
    });
  });

  // --------------------------------------------------
  // Refresh seller/storefront pages
  // --------------------------------------------------

  revalidatePath("/seller/products");
  revalidatePath(`/seller/product/${productId}/edit`);
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);

  redirect("/seller/products");
}

// ======================================================
// PAGE
// ======================================================

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const user = await getCurrentUser();

  if (
    !user ||
    user.role !== "SELLER" ||
    !user.seller ||
    user.seller.status !== "APPROVED"
  ) {
    redirect("/auth/login");
  }

  const { id } = await params;

  // --------------------------------------------------
  // Load product belonging to this seller
  // --------------------------------------------------

  const product = await prisma.product.findFirst({
    where: {
      id,
      sellerId: user.seller.id,
    },
    include: {
      inventory: true,
      category: true,
    },
  });

  if (!product) {
    notFound();
  }

  // --------------------------------------------------
  // Load active categories
  // --------------------------------------------------

  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
    },
  });

  const stockQuantity = product.inventory?.quantity ?? 0;

  const reservedQuantity =
    product.inventory?.reservedQuantity ?? 0;

  const lowStockThreshold =
    product.inventory?.lowStockThreshold ?? 5;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link
              href="/seller/products"
              className="transition hover:text-slate-950"
            >
              Products
            </Link>

            <span>/</span>

            <span>Edit product</span>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Seller dashboard
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Edit product
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Update your product information, pricing,
                category, and inventory.
              </p>
            </div>

            <Link
              href="/seller/products"
              className="inline-flex w-fit items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
            >
              ← Back to products
            </Link>
          </div>
        </div>

        {/* Form */}
        <form
          action={updateProduct.bind(null, product.id)}
          className="space-y-6"
        >
          {/* ==================================================
              BASIC INFORMATION
          ================================================== */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-950">
                Basic information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Update the main information customers see.
              </p>
            </div>

            <div className="grid gap-6">
              {/* Product name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Product name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={product.name}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                />
              </div>

              {/* Short description */}
              <div>
                <label
                  htmlFor="shortDescription"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Short description
                </label>

                <textarea
                  id="shortDescription"
                  name="shortDescription"
                  rows={3}
                  defaultValue={
                    product.shortDescription ?? ""
                  }
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                  placeholder="A short description of your product..."
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  name="description"
                  rows={7}
                  defaultValue={product.description}
                  required
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                  placeholder="Describe your product..."
                />
              </div>
            </div>
          </section>

          {/* ==================================================
              PRODUCT DETAILS
          ================================================== */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-950">
                Product details
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage SKU, brand, category, and product status.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* SKU */}
              <div>
                <label
                  htmlFor="sku"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  SKU
                </label>

                <input
                  id="sku"
                  name="sku"
                  type="text"
                  defaultValue={product.sku}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-950 uppercase outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                />

                <p className="mt-2 text-xs text-slate-500">
                  SKU must be unique across the marketplace.
                </p>
              </div>

              {/* Brand */}
              <div>
                <label
                  htmlFor="brand"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Brand
                </label>

                <input
                  id="brand"
                  name="brand"
                  type="text"
                  defaultValue={product.brand ?? ""}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                  placeholder="e.g. Samsung"
                />
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="categoryId"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Category
                </label>

                <select
                  id="categoryId"
                  name="categoryId"
                  defaultValue={product.categoryId}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                >
                  <option value="">
                    Select a category
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label
                  htmlFor="status"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Product status
                </label>

                <select
                  id="status"
                  name="status"
                  defaultValue={product.status}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                >
                  <option value="DRAFT">
                    Draft
                  </option>

                  <option value="PUBLISHED">
                    Published
                  </option>

                  <option value="OUT_OF_STOCK">
                    Out of stock
                  </option>

                  <option value="ARCHIVED">
                    Archived
                  </option>
                </select>
              </div>
            </div>
          </section>

          {/* ==================================================
              PRICING
          ================================================== */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-950">
                Pricing
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Update your selling price and optional cost
                information.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Price */}
              <div>
                <label
                  htmlFor="price"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Selling price
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    $
                  </span>

                  <input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={product.price.toString()}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-8 pr-4 text-sm font-medium text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                  />
                </div>
              </div>

              {/* Compare at */}
              <div>
                <label
                  htmlFor="compareAtPrice"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Compare-at price
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    $
                  </span>

                  <input
                    id="compareAtPrice"
                    name="compareAtPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={
                      product.compareAtPrice?.toString() ??
                      ""
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-8 pr-4 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                  />
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Optional original price.
                </p>
              </div>

              {/* Cost price */}
              <div>
                <label
                  htmlFor="costPrice"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Cost price
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    $
                  </span>

                  <input
                    id="costPrice"
                    name="costPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={
                      product.costPrice?.toString() ?? ""
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-8 pr-4 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                  />
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Optional internal cost.
                </p>
              </div>
            </div>
          </section>

          {/* ==================================================
              INVENTORY
          ================================================== */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-950">
                Inventory
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Update the available stock for this product.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Stock */}
              <div>
                <label
                  htmlFor="quantity"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Stock quantity
                </label>

                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={stockQuantity}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Current stock: {stockQuantity}
                </p>
              </div>

              {/* Reserved */}
              <div>
                <label
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Reserved stock
                </label>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                  {reservedQuantity}
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Reserved stock is managed by the order system.
                </p>
              </div>

              {/* Low stock threshold */}
              <div>
                <label
                  htmlFor="lowStockThreshold"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Low stock threshold
                </label>

                <input
                  id="lowStockThreshold"
                  name="lowStockThreshold"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={lowStockThreshold}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/10"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Alert level for low inventory.
                </p>
              </div>
            </div>

            {/* Stock warning */}
            {stockQuantity <= lowStockThreshold && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  Low stock warning
                </p>

                <p className="mt-1 text-sm text-amber-800">
                  This product is currently at or below its
                  low-stock threshold.
                </p>
              </div>
            )}
          </section>

          {/* ==================================================
              ACTIONS
          ================================================== */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/seller/products"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-7 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.99]"
            >
              Save product changes
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}