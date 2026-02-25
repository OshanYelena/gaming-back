import { Request, Response, NextFunction } from "express";
import { AdminInventoryService } from "./admin.inventory.service";

export class AdminInventoryController {
  private svc = new AdminInventoryService();

  list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (res.locals.validated?.query ?? {}) as any;
      const out = await this.svc.list(q);
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  lowStock = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (res.locals.validated?.query ?? {}) as any;
      const out = await this.svc.lowStock(q);
      res.json(out);
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

  bulkSet = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const body = res.locals.validated?.body ?? {};
      const out = await this.svc.bulkSet(body.items);
      res.json(out);
    } catch (e) {
      next(e);
    }
  };
}