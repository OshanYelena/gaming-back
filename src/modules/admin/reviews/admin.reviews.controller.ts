import { Request, Response, NextFunction } from "express";
import { AdminReviewsService } from "./admin.reviews.service";

export class AdminReviewsController {
  private svc = new AdminReviewsService();

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

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = res.locals.validated?.body ?? {};
      const out = await this.svc.updateStatus(String(req.params.id), body.status);
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