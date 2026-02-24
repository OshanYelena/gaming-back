import { prisma } from "../../config/prisma";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export class ReviewsService {
  async createReview(args: { productId: string; userId: string; rating: number; title?: string; body?: string }) {
    const product = await prisma.product.findUnique({
      where: { id: args.productId },
      select: { id: true, status: true },
    });
    if (!product || product.status !== "active") throw httpError(404, "Product not found");

    // Prevent duplicate spam: one review per user per product (easy rule)
    const existing = await prisma.review.findFirst({
      where: { productId: args.productId, userId: args.userId },
      select: { id: true, status: true },
    });
    if (existing) throw httpError(409, "You already reviewed this product");

    // Verified purchase flag exists in your doc; our schema currently doesn’t have it.
    // We'll keep review.status = "pending" and approve later via admin.
    const review = await prisma.review.create({
      data: {
        productId: args.productId,
        userId: args.userId,
        rating: args.rating,
        title: args.title,
        body: args.body,
        status: "pending",
      },
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        status: true,
        createdAt: true,
      },
    });

    return review;
  }
}