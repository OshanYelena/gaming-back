import { Request, Response, NextFunction } from "express";
import { AdminCategoriesService } from "./admin.categories.service";

export class AdminCategoriesController {
  private svc = new AdminCategoriesService();

  list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (res.locals.validated?.query ?? {}) as any;
      const out = await this.svc.list({ tree: Boolean(q.tree) });
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

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await this.svc.remove(String(req.params.id));
      res.json(out);
    } catch (e) {
      next(e);
    }
  };
}