import { PrismaClient, Role, SellerStatus, ProductStatus, CouponType, PaymentStatus, OrderStatus, ReviewStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
const img = (n: number) =>
    `https://images.unsplash.com/photo-${[
        "1496181133206-80ce9b88a853",
        "1523275335684-37898b6baf30",
        "1505740420928-5e560c06d30e",
        "1542291026-7eec264c27ff",
        "1523275335684-37898b6baf30",
        "1511707171634-5f897ff02aa9",
    ][n % 6]}?auto=format&fit=crop&w=900&q=80`;
async function main() {
    const password = await bcrypt.hash("DevPassword123!", 12);
    const admin = await prisma.user.upsert({ where: { email: "admin@example.com" }, update: {}, create: { name: "Platform Admin", email: "admin@example.com", passwordHash: password, role: Role.ADMIN } });
    const categoryNames = ["Electronics", "Fashion", "Home & Living", "Beauty", "Sports", "Accessories", "Computers", "Mobile Phones", "Audio", "Outdoor"];
    const categories = [] as { id: string }[];
    for (const name of categoryNames) { categories.push(await prisma.category.upsert({ where: { slug: name.toLowerCase().replaceAll(" ", "-") }, update: {}, create: { name, slug: name.toLowerCase().replaceAll(" ", "-") } })); }
    const sellers = [] as { id: string }[];
    for (let i = 1; i <= 3; i++) { const u = await prisma.user.upsert({ where: { email: `seller${i}@example.com` }, update: {}, create: { name: `Seller ${i}`, email: `seller${i}@example.com`, passwordHash: password, role: Role.SELLER } }); const s = await prisma.seller.upsert({ where: { userId: u.id }, update: { status: SellerStatus.APPROVED }, create: { userId: u.id, businessName: `Store ${i}`, slug: `store-${i}`, status: SellerStatus.APPROVED, store: { create: { name: `Store ${i}`, slug: `store-${i}`, description: `Independent seller ${i} on MarketHub.` } } } }); sellers.push(s); }
    for (let i = 1; i <= 10; i++)await prisma.user.upsert({ where: { email: `customer${i}@example.com` }, update: {}, create: { name: `Customer ${i}`, email: `customer${i}@example.com`, passwordHash: password, role: Role.CUSTOMER, cart: { create: {} }, wishlist: { create: {} } } });
    for (let i = 1; i <= 36; i++) { const seller = sellers[(i - 1) % 3]; const category = categories[(i - 1) % categories.length]; const price = (29 + i * 7.5).toFixed(2); await prisma.product.upsert({ where: { sku: `DEMO-${i}` }, update: {}, create: { sellerId: seller.id, categoryId: category.id, name: `MarketHub Product ${i}`, slug: `markethub-product-${i}`, description: `A realistic development product used to exercise the multi-vendor storefront, inventory and order flows. Product ${i} is intentionally fictional.`, shortDescription: "Development sample product", sku: `DEMO-${i}`, price, compareAtPrice: (Number(price) + 25).toFixed(2), brand: `Brand ${((i - 1) % 5) + 1}`, status: ProductStatus.PUBLISHED, rating: 4 + (i % 10) / 10, reviewCount: i % 7, images: { create: { url: img(i), altText: `MarketHub Product ${i}`, isPrimary: true } }, inventory: { create: { quantity: 20 + i, lowStockThreshold: 5 } } } }); }
    await prisma.coupon.upsert({ where: { code: "WELCOME10" }, update: {}, create: { code: "WELCOME10", type: CouponType.PERCENTAGE, value: 10, maximumDiscount: 50, startsAt: new Date(Date.now() - 86400000), expiresAt: new Date(Date.now() + 30 * 86400000), isActive: true } });
    console.log({ admin: admin.email, seededProducts: 36, sellerAccounts: 3, customerAccounts: 10 });
}
main().finally(() => prisma.$disconnect());
