import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Wiping catalog tables...");

  // ✅ Child -> Parent order
  // Adjust if you have extra tables related to products (images, reviews, cart, order items, etc.)
  await prisma.$transaction([
    // If you have product images model, uncomment:
    // prisma.productImage.deleteMany({}),

    // Cart/order tables often reference variants/products - wipe them too if needed:
    // prisma.orderItem.deleteMany({}),
    // prisma.cartItem.deleteMany({}),
    // prisma.wishlistItem.deleteMany({}),
    // prisma.review.deleteMany({}),

    prisma.variant.deleteMany({}),
    prisma.product.deleteMany({}),
    prisma.category.deleteMany({}),
  ]);

  console.log("✅ Done. Categories, products, variants deleted.");
}

main()
  .catch((e) => {
    console.error("❌ Wipe failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });