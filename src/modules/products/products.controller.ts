import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/prisma";
import { ProductsService } from "./products.service";

export class ProductsController {
  private svc = new ProductsService();

  /**
   * GET /api/v1/products
   * Supports:
   *  - category (uuid)
   *  - category_slug (slug or name)  ✅ new
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q: any = { ...(req.query as any) };

      // If frontend passes category_slug, translate it into category UUID
      if (q.category_slug && !q.category) {
        const token = String(q.category_slug).trim();
        const cat = await prisma.category.findFirst({
          where: {
            OR: [
              { slug: token },
              { name: { equals: token, mode: "insensitive" } },
            ],
          },
          select: { id: true },
        });

        if (cat) q.category = cat.id;
        delete q.category_slug;
      }

      const out = await this.svc.list(q);
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  /**
   * ✅ GET /api/v1/products/category/:category
   * :category = slug (recommended) OR name (URL encoded)
   */
  listByCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = String((req.params as any).category ?? "").trim();

      const cat = await prisma.category.findFirst({
        where: {
          OR: [
            { slug: token },
            { name: { equals: token, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, slug: true },
      });

      if (!cat) return res.status(404).json({ error: "Category not found" });

      const out = await this.svc.list({ ...(req.query as any), category: cat.id });
      res.json({ category: cat, ...out });
    } catch (e) {
      next(e);
    }
  };

  getBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await this.svc.getBySlug(String(req.params.slug));
      if (!out) return res.status(404).json({ error: "Product not found" });
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  // --- admin-ish CRUD (unchanged) ---
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await this.svc.create(req.body);
      res.status(201).json(out);
    } catch (e) {
      next(e);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
       const out = await this.svc.update(String(req.params.id), req.query);
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
         const out = await this.svc.remove(String(req.params.id));
      res.json(out);
    } catch (e) {
      next(e);
    }
  };
}