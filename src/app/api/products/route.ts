  import { prisma } from "@/lib/prisma";
  import { apiError, apiSuccess } from "@/lib/errors";
  import { getCurrentUser } from "@/lib/auth";
  import { productSchema } from "@/validations/product";
  import { slugify } from "@/lib/slug";

  export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const category = searchParams.get("category");
    const seller = searchParams.get("seller");
    const sort = searchParams.get("sort") ?? "newest";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(48, Math.max(1, Number(searchParams.get("limit") ?? 24)));
    const where = { status: "PUBLISHED" as const, seller: { status: "APPROVED" as const, ...(seller ? { slug: seller } : {}) }, ...(category ? { category: { slug: category } } : {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }, { sku: { contains: q, mode: "insensitive" as const } }, { brand: { contains: q, mode: "insensitive" as const } }] } : {}) };
    const orderBy = sort === "price_asc" ? { price: "asc" as const } : sort === "price_desc" ? { price: "desc" as const } : sort === "rating" ? { rating: "desc" as const } : { createdAt: "desc" as const };
    const [items, total] = await prisma.$transaction([prisma.product.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, select: { id: true, name: true, slug: true, price: true, compareAtPrice: true, rating: true, reviewCount: true, brand: true, images: { where: { isPrimary: true }, take: 1 }, seller: { select: { businessName: true, slug: true } } } }), prisma.product.count({ where })]);
    return apiSuccess({ items, page, limit, total, totalPages: Math.ceil(total / limit) });
  }

  export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== "SELLER" || !user.seller || user.seller.status !== "APPROVED") return apiError("FORBIDDEN", "Only approved sellers can create products.", 403);
    try {
      const input = productSchema.parse(await request.json());
      const product = await prisma.product.create({ data: { sellerId: user.seller.id, categoryId: input.categoryId, name: input.name, slug: `${slugify(input.name)}-${Date.now()}`, description: input.description, shortDescription: input.shortDescription, sku: input.sku, price: input.price, compareAtPrice: input.compareAtPrice, brand: input.brand, status: "DRAFT", inventory: { create: { quantity: input.stock } }, ...(input.image ? { images: { create: { url: input.image, altText: input.name, isPrimary: true } } } : {}) }, include: { inventory: true } });
      return apiSuccess(product, 201);
    } catch (error) { return apiError("VALIDATION_ERROR", error instanceof Error ? error.message : "Invalid product data."); }
  }
