 import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { productSchema } from "@/validations/product";
import { slugify } from "@/lib/slug";

async function createProduct(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (
    !user ||
    user.role !== "SELLER" ||
    !user.seller ||
    user.seller.status !== "APPROVED"
  ) {
    throw new Error("FORBIDDEN");
  }

  const data = productSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
    shortDescription: formData.get("shortDescription") || undefined,
    categoryId: formData.get("categoryId"),
    price: formData.get("price"),
    compareAtPrice:
      formData.get("compareAtPrice") || undefined,
    sku: formData.get("sku"),
    brand: formData.get("brand") || undefined,
    stock: formData.get("stock") || 0,
    image: formData.get("image") || undefined,
  });

  const slug = `${slugify(data.name)}-${Date.now()}`;

  await prisma.product.create({
    data: {
      sellerId: user.seller.id,
      categoryId: data.categoryId,
      name: data.name,
      slug,
      description: data.description,
      shortDescription: data.shortDescription,
      sku: data.sku,
      price: data.price,
      compareAtPrice: data.compareAtPrice,
      brand: data.brand,
      status: "DRAFT",

      inventory: {
        create: {
          quantity: data.stock,
          lowStockThreshold: 5,
        },
      },

      ...(data.image
        ? {
            images: {
              create: {
                url: data.image,
                altText: data.name,
                isPrimary: true,
              },
            },
          }
        : {}),
    },
  });

  redirect("/seller/products");
}

export default async function NewProductPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  if (
    user.role !== "SELLER" ||
    !user.seller ||
    user.seller.status !== "APPROVED"
  ) {
    redirect("/seller/dashboard");
  }

  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 lg:px-6">
      <Link
        href="/seller/products"
        className="text-sm font-bold text-slate-500 hover:text-slate-950"
      >
        ← Back to products
      </Link>

      <h1 className="mt-5 text-4xl font-black">
        Add Product
      </h1>

      <p className="mt-2 text-slate-500">
        Create a new product for your store.
      </p>

      <form
        action={createProduct}
        className="mt-8 space-y-6 rounded-3xl border bg-white p-6"
      >
        <Field label="Product Name" name="name" required />

        <Field
          label="SKU"
          name="sku"
          required
        />

        <Field
          label="Brand"
          name="brand"
        />

        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Price"
            name="price"
            type="number"
            step="0.01"
            required
          />

          <Field
            label="Compare At Price"
            name="compareAtPrice"
            type="number"
            step="0.01"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Stock"
            name="stock"
            type="number"
            min="0"
            required
          />

          <div>
            <label className="text-sm font-bold">
              Category
            </label>

            <select
              name="categoryId"
              required
              className="mt-2 w-full rounded-xl border px-4 py-3"
            >
              <option value="">Select category</option>

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
        </div>

        <Field
          label="Short Description"
          name="shortDescription"
        />

        <div>
          <label className="text-sm font-bold">
            Description
          </label>

          <textarea
            name="description"
            required
            rows={7}
            className="mt-2 w-full rounded-xl border px-4 py-3"
          />
        </div>

        <Field
          label="Product Image URL"
          name="image"
          type="url"
        />

        <button
          type="submit"
          className="w-full rounded-xl bg-slate-950 px-5 py-3 font-bold text-white"
        >
          Create Product
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  step,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  step?: string;
  min?: string;
}) {
  return (
    <div>
      <label className="text-sm font-bold">
        {label}
      </label>

      <input
        name={name}
        type={type}
        required={required}
        step={step}
        min={min}
        className="mt-2 w-full rounded-xl border px-4 py-3"
      />
    </div>
  );
}