import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Please login to add products to your wishlist.",
          },
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const productId = body.productId;

    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PRODUCT",
            message: "A valid product is required.",
          },
        },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: "Product not found.",
          },
        },
        { status: 404 }
      );
    }

    if (product.status !== "PUBLISHED") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PRODUCT_UNAVAILABLE",
            message: "This product is not available.",
          },
        },
        { status: 400 }
      );
    }

    const wishlist = await prisma.wishlist.upsert({
      where: {
        userId: user.id,
      },
      create: {
        userId: user.id,
      },
      update: {},
    });

    const existingItem = await prisma.wishlistItem.findFirst({
      where: {
        wishlistId: wishlist.id,
        productId: product.id,
      },
    });

    if (existingItem) {
      await prisma.wishlistItem.delete({
        where: {
          id: existingItem.id,
        },
      });

      return NextResponse.json({
        success: true,
        wishlisted: false,
        message: "Removed from wishlist.",
      });
    }

    await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId: product.id,
      },
    });

    return NextResponse.json({
      success: true,
      wishlisted: true,
      message: "Added to wishlist.",
    });
  } catch (error) {
    console.error("Wishlist error:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "WISHLIST_ERROR",
          message: "Unable to update wishlist.",
        },
      },
      { status: 500 }
    );
  }
} 