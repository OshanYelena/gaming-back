import { Request, Response, NextFunction } from "express";
import { AdminDashboardService } from "./admin.dashboard.service";

export class AdminDashboardController {
  private svc = new AdminDashboardService();

  summary = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (res.locals.validated?.query ?? {}) as any;
      const out = await this.svc.summary(q.days);
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  timeseries = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (res.locals.validated?.query ?? {}) as any;
      const out = await this.svc.timeseries(q.days);
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  topSkus = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (res.locals.validated?.query ?? {}) as any;
      const out = await this.svc.topSkus(q.days, q.limit);
      res.json(out);
    } catch (e) {
      next(e);
    }
  };
}