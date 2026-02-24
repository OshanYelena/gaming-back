import { prisma } from "../../config/prisma";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export class AddressesService {
  async list(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
  }

  async create(userId: string, input: any) {
    const makeDefault = !!input.isDefault;

    return prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      } else {
        // If no addresses exist yet, auto-set first address as default.
        const count = await tx.address.count({ where: { userId } });
        if (count === 0) input.isDefault = true;
      }

      const created = await tx.address.create({
        data: {
          userId,
          label: input.label,
          fullName: input.fullName,
          phone: input.phone,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          country: input.country,
          isDefault: !!input.isDefault,
        },
      });

      return created;
    });
  }

  async update(userId: string, addressId: string, input: any) {
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!existing) throw httpError(404, "Address not found");

    const updated = await prisma.address.update({
      where: { id: addressId },
      data: input,
    });

    return updated;
  }

  async remove(userId: string, addressId: string) {
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!existing) throw httpError(404, "Address not found");

    return prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id: addressId } });

      // If deleted address was default, promote newest address to default (if any)
      if (existing.isDefault) {
        const newest = await tx.address.findFirst({
          where: { userId },
          orderBy: { updatedAt: "desc" },
        });
        if (newest) {
          await tx.address.update({
            where: { id: newest.id },
            data: { isDefault: true },
          });
        }
      }

      return { ok: true };
    });
  }

  async setDefault(userId: string, addressId: string) {
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!existing) throw httpError(404, "Address not found");

    return prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });

      const updated = await tx.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });

      return updated;
    });
  }
}