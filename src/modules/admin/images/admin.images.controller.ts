import { Request, Response, NextFunction } from "express";
import { AdminImagesService } from "./admin.images.service";

export class AdminImagesController {
  private svc = new AdminImagesService();

  listByProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await this.svc.listByProduct(String(req.params.id));
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  createForProduct = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const body = res.locals.validated?.body ?? {};
      const productId = String(res.locals.validated?.params?.id);
      const out = await this.svc.createForProduct(productId, body);
      res.status(201).json(out);
    } catch (e) {
      next(e);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = res.locals.validated?.body ?? {};
      const out = await this.svc.update(String(req.params.imageId), body);
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await this.svc.remove(String(req.params.imageId));
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  reorder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = res.locals.validated?.body ?? {};
      const productId = String(req.params.id);
      const out = await this.svc.reorder(productId, body.items);
      res.json(out);
    } catch (e) {
      next(e);
    }
  };
}