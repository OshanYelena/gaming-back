import { Request, Response, NextFunction } from "express";
import { AdminProductsService } from "./admin.products.service";

export class AdminProductsController {
  private svc = new AdminProductsService();

  list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (res.locals.validated?.query ?? {}) as any;
      const out = await this.svc.list(q);
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await this.svc.get(String(req.params.id));
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  create = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const body = res.locals.validated?.body ?? {};
      const out = await this.svc.create(body);
      res.status(201).json(out);
    } catch (e) {
      next(e);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = res.locals.validated?.body ?? {};
      const out = await this.svc.update(String(req.params.id), body);
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  archive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await this.svc.archive(String(req.params.id));
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  listVariants = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await this.svc.listVariants(String(req.params.id));
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  createVariant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = res.locals.validated?.body ?? {};
      const out = await this.svc.createVariant(String(req.params.id), body);
      res.status(201).json(out);
    } catch (e) {
      next(e);
    }
  };

  updateVariant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = res.locals.validated?.body ?? {};
      const out = await this.svc.updateVariant(String(req.params.variantId), body);
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  updateVariantStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = res.locals.validated?.body ?? {};
      const out = await this.svc.updateVariantStock(String(req.params.variantId), body.stockQuantity);
      res.json(out);
    } catch (e) {
      next(e);
    }
  };
}