import { Request, Response, NextFunction } from "express";
import { ProductsService } from "./products.service";

export class ProductsController {
  private svc = new ProductsService();

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await this.svc.list(req.query);
      res.json(out);
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

  variants = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await this.svc.listVariants(String(req.params.id));
      if (!out) return res.status(404).json({ error: "Product not found" });
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  reviews = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await this.svc.listReviews(String(req.params.id), req.query);
      if (!out) return res.status(404).json({ error: "Product not found" });
      res.json(out);
    } catch (e) {
      next(e);
    }
  };
}
