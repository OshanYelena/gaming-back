import { prisma } from "../../../config/prisma";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function isUniqueViolation(e: any) {
  return e?.code === "P2002";
}

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
  sortOrder: number;
};

function buildTree(rows: CategoryRow[]) {
  const byId = new Map<string, any>();
  const roots: any[] = [];

  for (const r of rows) byId.set(r.id, { ...r, children: [] });

  for (const r of rows) {
    const node = byId.get(r.id);
    if (r.parentId && byId.has(r.parentId)) {
      byId.get(r.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRec = (nodes: any[]) => {
    nodes.sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name));
    for (const n of nodes) sortRec(n.children);
  };
  sortRec(roots);

  return roots;
}

export class AdminCategoriesService {
  async list(opts: { tree: boolean }) {
    const rows = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        imageUrl: true,
        sortOrder: true,
      },
    });

    if (opts.tree) return buildTree(rows as any);
    return rows;
  }

  async get(id: string) {
    const cat = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { select: { id: true, name: true, slug: true } },
        products: { select: { id: true } },
      },
    });
    if (!cat) throw httpError(404, "Category not found");
    return {
      ...cat,
      productsCount: cat.products.length,
      products: undefined,
    };
  }

  async create(data: any) {
    if (data.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: data.parentId }, select: { id: true } });
      if (!parent) throw httpError(400, "Invalid parentId");
    }

    try {
      return await prisma.category.create({
        data: {
          name: data.name,
          slug: data.slug,
          parentId: data.parentId ?? null,
          imageUrl: data.imageUrl ?? null,
          sortOrder: data.sortOrder ?? 0,
        },
      });
    } catch (e: any) {
      if (isUniqueViolation(e)) throw httpError(409, "Category slug already exists");
      throw e;
    }
  }

  async update(id: string, patch: any) {
    if (patch.parentId !== undefined) {
      if (patch.parentId === id) throw httpError(400, "parentId cannot equal category id");

      if (patch.parentId) {
        const parent = await prisma.category.findUnique({ where: { id: patch.parentId }, select: { id: true } });
        if (!parent) throw httpError(400, "Invalid parentId");
      }
    }

    try {
      return await prisma.category.update({
        where: { id },
        data: {
          ...patch,
          parentId: patch.parentId === undefined ? undefined : (patch.parentId ?? null),
          imageUrl: patch.imageUrl === undefined ? undefined : (patch.imageUrl ?? null),
        },
      });
    } catch (e: any) {
      if (e?.code === "P2025") throw httpError(404, "Category not found");
      if (isUniqueViolation(e)) throw httpError(409, "Category slug already exists");
      throw e;
    }
  }

  async remove(id: string) {
    const [childrenCount, productsCount] = await Promise.all([
      prisma.category.count({ where: { parentId: id } }),
      prisma.product.count({ where: { categoryId: id } }),
    ]);

    if (childrenCount > 0) throw httpError(409, "Category has child categories. Remove/move them first.");
    if (productsCount > 0) throw httpError(409, "Category has products assigned. Reassign products first.");

    try {
      await prisma.category.delete({ where: { id } });
      return { ok: true };
    } catch (e: any) {
      if (e?.code === "P2025") throw httpError(404, "Category not found");
      throw e;
    }
  }
}