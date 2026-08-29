"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function deleteProduct(productId: string) {
  const user = await getCurrentUser();

  if (
    !user ||
    user.role !== "SELLER" ||
    !user.seller ||
    user.seller.status !== "APPROVED"
  ) {
    throw new Error("FORBIDDEN");
  }

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      sellerId: user.seller.id,
    },
    select: {
      id: true,
    },
  });

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  await prisma.product.update({
    where: {
      id: product.id,
    },
    data: {
      status: "ARCHIVED",
    },
  });

  revalidatePath("/seller/products");
  revalidatePath("/products");
}