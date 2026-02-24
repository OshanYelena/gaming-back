import { Request, Response, NextFunction } from "express";
import { WishlistService } from "./wishlist.service";

function getUserId(req: Request): string | undefined {
  return (req as any).user?.sub;
}

export class WishlistController {
  private svc = new WishlistService();

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
      const out = await this.svc.list(userId);
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  add = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
      const { productId, variantId } = req.body;
      const out = await this.svc.add(userId, productId, variantId);
      res.status(201).json(out);
    } catch (e) {
      next(e);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
      const out = await this.svc.remove(userId, String(req.params.productId));
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  moveToCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
      const out = await this.svc.moveToCart(userId, String(req.params.productId));
      res.json(out);
    } catch (e) {
      next(e);
    }
  };
}
