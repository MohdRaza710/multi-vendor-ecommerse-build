import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
export async function requireSellerResource(sellerId: string) {
	const user = await requireRole("SELLER");
	if (!user.seller || user.seller.id !== sellerId) throw new Error("FORBIDDEN");
	return user.seller;
}

export async function requireProductOwner(productId: string) {
	const user = await requireRole("SELLER");
	const product = await prisma.product.findUnique({
		where: { id: productId },
		select: { sellerId: true },
	});
	if (!product || !user.seller || product.sellerId !== user.seller.id) {
		throw new Error("FORBIDDEN");
	}
	return product;
}
