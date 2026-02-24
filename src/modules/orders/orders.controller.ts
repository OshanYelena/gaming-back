import { Request, Response, NextFunction } from "express";
import { OrdersService } from "./orders.service";
import { getSessionId } from "../../middleware/guestSession";

function getUserId(req: Request): string | undefined {
  return (req as any).user?.sub;
}

export class OrdersController {
  private svc = new OrdersService();

  checkoutValidate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await this.svc.checkoutValidate(getUserId(req), getSessionId(req));
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  paymentIntent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await this.svc.createPaymentIntent(getUserId(req), getSessionId(req), req.body.currency);
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await this.svc.createOrder(getUserId(req), getSessionId(req), req.body);
      res.status(201).json(out);
    } catch (e) {
      next(e);
    }
  };

  listMine = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
      const out = await this.svc.listMyOrders(userId, req.query);
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  getMine = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
      const out = await this.svc.getMyOrder(userId, String(req.params.id));
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  cancelMine = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
      const out = await this.svc.cancelMyOrder(userId, String(req.params.id));
      res.json(out);
    } catch (e) {
      next(e);
    }
  };

  trackGuest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawEmail = req.query.email;
      const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;
      const out = await this.svc.trackGuestOrder(String(req.params.orderNumber), String(email));
      res.json(out);
    } catch (e) {
      next(e);
    }
  };
}
