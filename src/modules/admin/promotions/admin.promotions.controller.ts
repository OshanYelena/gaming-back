import { Request, Response, NextFunction } from "express";
import { AdminPromotionsService } from "./admin.promotions.service";

export class AdminPromotionsController {
  private svc = new AdminPromotionsService();

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

  disable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await this.svc.disable(String(req.params.id));
      res.json(out);
    } catch (e) {
      next(e);
    }
  };
}