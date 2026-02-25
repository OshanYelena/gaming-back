import { prisma } from "../../../config/prisma";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export class AdminImagesService {
  async listByProduct(productId: string) {
    const p = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!p) throw httpError(404, "Product not found");

    return prisma.productImage.findMany({
      where: { productId },
     orderBy: [{ sortOrder: "asc" }],
    });
  }

  async createForProduct(productId: string, data: any) {
    const p = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!p) throw httpError(404, "Product not found");

    if (data.variantId) {
      const v = await prisma.variant.findUnique({ where: { id: data.variantId }, select: { id: true, productId: true } });
      if (!v) throw httpError(400, "Invalid variantId");
      if (v.productId !== productId) throw httpError(409, "variantId does not belong to this product");
    }

    // auto sortOrder to end if not provided
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined) {
      const max = await prisma.productImage.aggregate({
        where: { productId },
        _max: { sortOrder: true },
      });
      sortOrder = (max._max.sortOrder ?? 0) + 1;
    }

    return prisma.productImage.create({
      data: {
        productId,
        url: data.url,
        altText: data.altText ?? null,
        sortOrder,
        variantId: data.variantId ?? null,
      },
    });
  }

  async update(imageId: string, patch: any) {
    const img = await prisma.productImage.findUnique({
      where: { id: imageId },
      select: { id: true, productId: true },
    });
    if (!img) throw httpError(404, "Image not found");

    if (patch.variantId !== undefined && patch.variantId !== null) {
      const v = await prisma.variant.findUnique({ where: { id: patch.variantId }, select: { id: true, productId: true } });
      if (!v) throw httpError(400, "Invalid variantId");
      if (v.productId !== img.productId) throw httpError(409, "variantId does not belong to this image's product");
    }

    try {
      return await prisma.productImage.update({
        where: { id: imageId },
        data: {
          ...patch,
          altText: patch.altText === undefined ? undefined : (patch.altText ?? null),
          variantId: patch.variantId === undefined ? undefined : (patch.variantId ?? null),
        },
      });
    } catch (e: any) {
      if (e?.code === "P2025") throw httpError(404, "Image not found");
      throw e;
    }
  }

  async remove(imageId: string) {
    try {
      await prisma.productImage.delete({ where: { id: imageId } });
      return { ok: true };
    } catch (e: any) {
      if (e?.code === "P2025") throw httpError(404, "Image not found");
      throw e;
    }
  }

  async reorder(productId: string, items: { imageId: string; sortOrder: number }[]) {
    const p = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!p) throw httpError(404, "Product not found");

    const ids = items.map((i) => i.imageId);
    const owned = await prisma.productImage.findMany({
      where: { id: { in: ids }, productId },
      select: { id: true },
    });

    if (owned.length !== ids.length) throw httpError(409, "One or more images do not belong to this product");

    await prisma.$transaction(
      items.map((i) =>
        prisma.productImage.update({
          where: { id: i.imageId },
          data: { sortOrder: i.sortOrder },
        })
      )
    );

    return { ok: true };
  }
}