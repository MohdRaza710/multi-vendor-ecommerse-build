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
 * Synchronizes:
 * - SellerOrder status
 * - Main Order status
 * - Customer tracking timeline
 * - Customer notification
 * - Seller audit log
 */
export async function updateSellerOrderStatus(formData: FormData) {
  const user = await getCurrentUser();

  if (!user || user.role !== "SELLER" || !user.seller) {
    throw new Error("FORBIDDEN");
  }

  const sellerOrderId = String(
    formData.get("sellerOrderId") || ""
  ).trim();

  const status = String(
    formData.get("status") || ""
  ).trim();

  if (!sellerOrderId) {
    throw new Error("Seller order ID is required.");
  }

  const validStatuses = [
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ] as const;

  if (!validStatuses.includes(status as any)) {
    throw new Error("Invalid order status.");
  }

  const newStatus = status as
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | "REFUNDED";

  const result = await prisma.$transaction(async (tx) => {
    // --------------------------------------------------
    // Find seller order
    // --------------------------------------------------

    const sellerOrder = await tx.sellerOrder.findUnique({
      where: {
        id: sellerOrderId,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            userId: true,
            status: true,
          },
        },
      },
    });

    if (!sellerOrder) {
      throw new Error("Seller order not found.");
    }

    // --------------------------------------------------
    // Verify seller ownership
    // --------------------------------------------------

    if (sellerOrder.sellerId !== user.seller!.id) {
      throw new Error("FORBIDDEN");
    }

    const previousStatus = sellerOrder.status;

    // Don't create duplicate updates
    if (previousStatus === newStatus) {
      return {
        orderId: sellerOrder.order.id,
        changed: false,
      };
    }

    // --------------------------------------------------
    // Update SellerOrder
    // --------------------------------------------------

    await tx.sellerOrder.update({
      where: {
        id: sellerOrderId,
      },
      data: {
        status: newStatus,
      },
    });

    // --------------------------------------------------
    // Get all seller orders for this customer order
    // --------------------------------------------------

    const allSellerOrders = await tx.sellerOrder.findMany({
      where: {
        orderId: sellerOrder.order.id,
      },
      select: {
        id: true,
        sellerId: true,
        status: true,
      },
    });

    const statuses = allSellerOrders.map(
      (sellerOrder) => sellerOrder.status
    );

    // --------------------------------------------------
    // Calculate main Order status
    // --------------------------------------------------

    let mainOrderStatus = sellerOrder.order.status;

    /*
     * ALL cancelled
     */
    if (
      statuses.length > 0 &&
      statuses.every(
        (status) => status === "CANCELLED"
      )
    ) {
      mainOrderStatus = "CANCELLED";
    }

    /*
     * ALL refunded
     */
    else if (
      statuses.length > 0 &&
      statuses.every(
        (status) => status === "REFUNDED"
      )
    ) {
      mainOrderStatus = "REFUNDED";
    }

    /*
     * ALL delivered
     */
    else if (
      statuses.length > 0 &&
      statuses.every(
        (status) => status === "DELIVERED"
      )
    ) {
      mainOrderStatus = "DELIVERED";
    }

    /*
     * At least one shipped
     */
    else if (
      statuses.some(
        (status) => status === "SHIPPED"
      )
    ) {
      mainOrderStatus = "SHIPPED";
    }

    /*
     * At least one processing
     */
    else if (
      statuses.some(
        (status) => status === "PROCESSING"
      )
    ) {
      mainOrderStatus = "PROCESSING";
    }

    /*
     * At least one confirmed
     */
    else if (
      statuses.some(
        (status) => status === "CONFIRMED"
      )
    ) {
      mainOrderStatus = "CONFIRMED";
    }

    /*
     * Otherwise pending
     */
    else {
      mainOrderStatus = "PENDING";
    }

    // --------------------------------------------------
    // Update main Order if necessary
    // --------------------------------------------------

    if (mainOrderStatus !== sellerOrder.order.status) {
      await tx.order.update({
        where: {
          id: sellerOrder.order.id,
        },
        data: {
          status: mainOrderStatus,
        },
      });

      // ------------------------------------------------
      // Customer tracking timeline
      // ------------------------------------------------

      await tx.orderTimeline.create({
        data: {
          orderId: sellerOrder.order.id,
          status: mainOrderStatus,
          title: getSellerStatusTitle(
            mainOrderStatus
          ),
          message: getSellerStatusMessage(
            mainOrderStatus
          ),
        },
      });

      // ------------------------------------------------
      // Customer notification
      // ------------------------------------------------

      await tx.notification.create({
        data: {
          userId: sellerOrder.order.userId,
          type: getSellerNotificationType(
            mainOrderStatus
          ),
          title: getSellerStatusTitle(
            mainOrderStatus
          ),
          message:
            `Your order ${sellerOrder.order.orderNumber} is now ${formatSellerStatus(
              mainOrderStatus
            )}.`,
        },
      });
    }

    // --------------------------------------------------
    // Create timeline event for seller-specific update
    // --------------------------------------------------

    await tx.orderTimeline.create({
      data: {
        orderId: sellerOrder.order.id,
        status: newStatus,
        title: `Seller order ${formatSellerStatus(
          newStatus
        )}`,
        message: `A seller has updated your order to ${formatSellerStatus(
          newStatus
        )}.`,
      },
    });

    // --------------------------------------------------
    // Customer notification for seller update
    // --------------------------------------------------

    await tx.notification.create({
      data: {
        userId: sellerOrder.order.userId,
        type: getSellerNotificationType(newStatus),
        title: getSellerStatusTitle(newStatus),
        message:
          `Your order ${sellerOrder.order.orderNumber} has been updated to ${formatSellerStatus(
            newStatus
          )}.`,
      },
    });

    // --------------------------------------------------
    // Seller audit log
    // --------------------------------------------------

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_SELLER_ORDER_STATUS",
        entityType: "SELLER_ORDER",
        entityId: sellerOrderId,
        metadata: {
          previousStatus,
          newStatus,
          orderId: sellerOrder.order.id,
          sellerId: user.seller!.id,
        },
      },
    });

    return {
      orderId: sellerOrder.order.id,
      changed: true,
      previousStatus,
      newStatus,
      mainOrderStatus,
    };
  });

  // --------------------------------------------------
  // Revalidate affected pages
  // --------------------------------------------------

  revalidatePath(`/seller/orders/${sellerOrderId}`);
  revalidatePath(`/seller/orders`); revalidatePath("/seller/dashboard");
  revalidatePath(`/orders/${result.orderId}`);
  revalidatePath(`/admin/orders/${result.orderId}`);

  return {
    success: true,
    ...result,
  };
}


function formatSellerStatus(
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | "REFUNDED"
) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

function getSellerStatusTitle(
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | "REFUNDED"
) {
  switch (status) {
    case "PENDING":
      return "Order pending";

    case "CONFIRMED":
      return "Order confirmed";

    case "PROCESSING":
      return "Order processing";

    case "SHIPPED":
      return "Order shipped";

    case "DELIVERED":
      return "Order delivered";

    case "CANCELLED":
      return "Order cancelled";

    case "REFUNDED":
      return "Order refunded";

    default:
      return "Order status updated";
  }
}

function getSellerStatusMessage(
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | "REFUNDED"
) {
  switch (status) {
    case "PENDING":
      return "Your order is waiting for confirmation.";

    case "CONFIRMED":
      return "Your order has been confirmed by the seller.";

    case "PROCESSING":
      return "Your order is currently being prepared.";

    case "SHIPPED":
      return "Your order has been shipped.";

    case "DELIVERED":
      return "Your order has been delivered.";

    case "CANCELLED":
      return "Your order has been cancelled.";

    case "REFUNDED":
      return "Your order has been refunded.";

    default:
      return "Your order status has been updated.";
  }
}

function getSellerNotificationType(
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | "REFUNDED"
) {
  switch (status) {
    case "CONFIRMED":
      return "CONFIRMED" as const;

    case "SHIPPED":
      return "SHIPPED" as const;

    case "DELIVERED":
      return "DELIVERED" as const;

    default:
      return "ORDER" as const;
  }
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