"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Make sure the current user is an admin.
 */
async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }

  return user;
}

/**
 * Approve a pending seller.
 */
export async function approveSeller(sellerId: string) {
  const admin = await requireAdmin();

  const seller = await prisma.seller.findUnique({
    where: {
      id: sellerId,
    },
  });

  if (!seller) {
    throw new Error("SELLER_NOT_FOUND");
  }

  if (seller.status === "APPROVED") {
    throw new Error("SELLER_ALREADY_APPROVED");
  }

  await prisma.seller.update({
    where: {
      id: sellerId,
    },
    data: {
      status: "APPROVED",
    },
  });

  // Create notification for seller if Notification model exists.
  try {
    await prisma.notification.create({
      data: {
        userId: seller.userId,
        type: "SYSTEM",
        title: "Seller account approved",
        message:
          "Your seller account has been approved. You can now create and sell products.",
      },
    });
  } catch {
    // Notification failure should not prevent seller approval.
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/sellers");
  revalidatePath("/seller/dashboard");

  return {
    success: true,
    message: "Seller approved successfully.",
  };
}

/**
 * Reject a pending seller.
 */
export async function rejectSeller(sellerId: string) {
  const admin = await requireAdmin();

  const seller = await prisma.seller.findUnique({
    where: {
      id: sellerId,
    },
  });

  if (!seller) {
    throw new Error("SELLER_NOT_FOUND");
  }

  await prisma.seller.update({
    where: {
      id: sellerId,
    },
    data: {
      status: "REJECTED",
    },
  });

  try {
    await prisma.notification.create({
      data: {
        userId: seller.userId,
        type: "SYSTEM",
        title: "Seller application rejected",
        message:
          "Your seller application has been rejected by the administrator.",
      },
    });
  } catch {
    // Ignore notification failure.
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/sellers");
  revalidatePath("/seller/dashboard");

  return {
    success: true,
    message: "Seller rejected successfully.",
  };
}

/**
 * Suspend an approved seller.
 */
export async function suspendSeller(sellerId: string) {
  const admin = await requireAdmin();

  const seller = await prisma.seller.findUnique({
    where: {
      id: sellerId,
    },
  });

  if (!seller) {
    throw new Error("SELLER_NOT_FOUND");
  }

  await prisma.seller.update({
    where: {
      id: sellerId,
    },
    data: {
      status: "SUSPENDED",
    },
  });

  try {
    await prisma.notification.create({
      data: {
        userId: seller.userId,
        type: "SYSTEM",
        title: "Seller account suspended",
        message:
          "Your seller account has been suspended by the administrator.",
      },
    });
  } catch {
    // Ignore notification failure.
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/sellers");
  revalidatePath("/seller/dashboard");

  return {
    success: true,
    message: "Seller suspended successfully.",
  };
}

/**
 * Reactivate a rejected or suspended seller.
 */
export async function reactivateSeller(sellerId: string) {
  const admin = await requireAdmin();

  const seller = await prisma.seller.findUnique({
    where: {
      id: sellerId,
    },
  });

  if (!seller) {
    throw new Error("SELLER_NOT_FOUND");
  }

  await prisma.seller.update({
    where: {
      id: sellerId,
    },
    data: {
      status: "APPROVED",
    },
  });

  try {
    await prisma.notification.create({
      data: {
        userId: seller.userId,
        type: "SYSTEM",
        title: "Seller account reactivated",
        message:
          "Your seller account has been reactivated. You can continue selling products.",
      },
    });
  } catch {
    // Ignore notification failure.
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/sellers");
  revalidatePath("/seller/dashboard");

  return {
    success: true,
    message: "Seller reactivated successfully.",
  };
}

/**
 * Update seller order status.
 *
 * Keep this function if your existing seller order page
 * already uses it.
 */
export async function updateSellerOrderStatus(formData: FormData) {
  const user = await getCurrentUser();

  if (!user || user.role !== "SELLER" || !user.seller) {
    throw new Error("FORBIDDEN");
  }

  if (user.seller.status !== "APPROVED") {
    throw new Error("SELLER_NOT_APPROVED");
  }

  const rawSellerOrderId = formData.get("sellerOrderId");
  const rawStatus = formData.get("status");

  // Make absolutely sure we received strings
  if (
    typeof rawSellerOrderId !== "string" ||
    !rawSellerOrderId.trim()
  ) {
    throw new Error("INVALID_SELLER_ORDER_ID");
  }

  if (typeof rawStatus !== "string") {
    throw new Error("INVALID_STATUS");
  }

  const allowedStatuses = [
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ] as const;

  if (!allowedStatuses.includes(rawStatus as any)) {
    throw new Error("INVALID_ORDER_STATUS");
  }

  const sellerOrderId = rawSellerOrderId.trim();

  // Make sure this order belongs to the logged-in seller
  const sellerOrder = await prisma.sellerOrder.findUnique({
    where: {
      id: sellerOrderId,
    },
    select: {
      id: true,
      sellerId: true,
      status: true,
    },
  });

  if (!sellerOrder) {
    throw new Error("SELLER_ORDER_NOT_FOUND");
  }

  if (sellerOrder.sellerId !== user.seller.id) {
    throw new Error("FORBIDDEN");
  }

  await prisma.sellerOrder.update({
    where: {
      id: sellerOrderId,
    },
    data: {
      status: rawStatus as
        | "PENDING"
        | "CONFIRMED"
        | "PROCESSING"
        | "SHIPPED"
        | "DELIVERED"
        | "CANCELLED",
    },
  });

  revalidatePath("/seller/orders");
  revalidatePath("/seller/dashboard");
}

export async function updateStore(formData: FormData) {
  const user = await getCurrentUser();

  if (!user || user.role !== "SELLER" || !user.seller) {
    throw new Error("FORBIDDEN");
  }

  const seller = await prisma.seller.findUnique({
    where: {
      id: user.seller.id,
    },
    include: {
      store: true,
    },
  });

  if (!seller) {
    throw new Error("SELLER_NOT_FOUND");
  }

  if (!seller.store) {
    throw new Error("STORE_NOT_FOUND");
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const logo = String(formData.get("logo") ?? "").trim();
  const banner = String(formData.get("banner") ?? "").trim();
  const contactEmail = String(
    formData.get("contactEmail") ?? ""
  ).trim();
  const contactPhone = String(
    formData.get("contactPhone") ?? ""
  ).trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!name) {
    throw new Error("STORE_NAME_REQUIRED");
  }

  if (name.length > 160) {
    throw new Error("STORE_NAME_TOO_LONG");
  }

  await prisma.store.update({
    where: {
      id: seller.store.id,
    },
    data: {
      name,
      description: description || null,
      logo: logo || null,
      banner: banner || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      address: address || null,
    },
  });

  revalidatePath("/seller/store");
  revalidatePath("/seller/dashboard");
  revalidatePath(`/stores/${seller.store.slug}`);

  return {
    success: true,
    message: "Store updated successfully.",
  };
}

/**
 * Delete a seller's product
 */
export async function deleteProduct(formData: FormData) {
  const user = await getCurrentUser();

  if (!user || user.role !== "SELLER" || !user.seller) {
    throw new Error("FORBIDDEN");
  }

  const productId = String(formData.get("productId") ?? "").trim();

  if (!productId) {
    throw new Error("PRODUCT_ID_REQUIRED");
  }

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
    select: {
      id: true,
      sellerId: true,
    },
  });

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  if (product.sellerId !== user.seller.id) {
    throw new Error("FORBIDDEN");
  }

  await prisma.product.delete({
    where: {
      id: productId,
    },
  });

  revalidatePath("/seller/products");
  revalidatePath("/seller/dashboard");
  revalidatePath("/products");

  return {
    success: true,
    message: "Product deleted successfully.",
  };
}

/**
 * Publish a seller's product
 */
export async function publishProduct(formData: FormData) {
  const user = await getCurrentUser();

  if (!user || user.role !== "SELLER" || !user.seller) {
    throw new Error("FORBIDDEN");
  }

  if (user.seller.status !== "APPROVED") {
    throw new Error("SELLER_NOT_APPROVED");
  }

  const productId = String(formData.get("productId") ?? "").trim();

  if (!productId) {
    throw new Error("PRODUCT_ID_REQUIRED");
  }

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
    select: {
      id: true,
      sellerId: true,
      status: true,
    },
  });

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  if (product.sellerId !== user.seller.id) {
    throw new Error("FORBIDDEN");
  }

  await prisma.product.update({
    where: {
      id: productId,
    },
    data: {
      status: "PUBLISHED",
    },
  });

  revalidatePath("/seller/products");
  revalidatePath("/seller/dashboard");
  revalidatePath("/products");

  return {
    success: true,
    message: "Product published successfully.",
  };
}


export async function unpublishProduct(formData: FormData) {
  const user = await getCurrentUser();

  if (!user || user.role !== "SELLER" || !user.seller) {
    throw new Error("FORBIDDEN");
  }

  const productId = String(formData.get("productId") ?? "").trim();

  if (!productId) {
    throw new Error("PRODUCT_ID_REQUIRED");
  }

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
    select: {
      id: true,
      sellerId: true,
      status: true,
    },
  });

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  if (product.sellerId !== user.seller.id) {
    throw new Error("FORBIDDEN");
  }

  await prisma.product.update({
    where: {
      id: productId,
    },
    data: {
      status: "DRAFT",
    },
  });

  revalidatePath("/seller/products");
  revalidatePath("/seller/dashboard");
  revalidatePath("/products");

  return {
    success: true,
    message: "Product unpublished successfully.",
  };
}

export async function updateInventory(
  formData: FormData
) {
  const user = await getCurrentUser();

  if (
    !user ||
    user.role !== "SELLER" ||
    !user.seller
  ) {
    throw new Error("FORBIDDEN");
  }

  if (user.seller.status !== "APPROVED") {
    throw new Error(
      "Seller account is not approved."
    );
  }

  const productId =
    String(
      formData.get("productId") ?? ""
    ).trim();

  const quantity = Number(
    formData.get("quantity")
  );

  if (!productId) {
    throw new Error(
      "Product ID is required."
    );
  }

  if (
    !Number.isInteger(quantity) ||
    quantity < 0
  ) {
    throw new Error(
      "Inventory quantity must be a non-negative integer."
    );
  }

  // Make sure the product belongs to this seller
  const product =
    await prisma.product.findFirst({
      where: {
        id: productId,
        sellerId: user.seller.id,
      },

      select: {
        id: true,
        status: true,
      },
    });

  if (!product) {
    throw new Error(
      "Product not found or access denied."
    );
  }

  // Update or create inventory
  const inventory =
    await prisma.inventory.upsert({
      where: {
        productId,
      },

      update: {
        quantity,
      },

      create: {
        productId,
        quantity,
      },
    });

  // Automatically update product status
  if (quantity === 0) {
    await prisma.product.update({
      where: {
        id: productId,
      },

      data: {
        status: "OUT_OF_STOCK",
      },
    });
  } else if (
    product.status === "OUT_OF_STOCK"
  ) {
    await prisma.product.update({
      where: {
        id: productId,
      },

      data: {
        status: "PUBLISHED",
      },
    });
  }

  return {
    success: true,
    inventory,
  };
}