import { Request, Response, NextFunction } from "express";
import { CartService } from "./cart.service";
import { getSessionId } from "../../middleware/guestSession";

function getUserId(req: Request): string | undefined {
    return (req as any).user?.sub;
}

export class CartController {
    private svc = new CartService();

    get = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const out = await this.svc.getCart(getUserId(req), getSessionId(req));
            res.json(out);
        } catch (e) {
            next(e);
        }
    };

    addItem = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { variant_id, quantity } = req.body;
            const out = await this.svc.addItem(getUserId(req), getSessionId(req), variant_id, quantity);
            res.status(201).json(out);
        } catch (e) {
            next(e);
        }
    };

    updateItem = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const out = await this.svc.updateItem(
                getUserId(req),
                getSessionId(req),
                String(req.params.id),
                req.body.quantity
            );
            res.json(out);
        } catch (e) {
            next(e);
        }
    };

    removeItem = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const out = await this.svc.removeItem(
                getUserId(req),
                getSessionId(req),
                String(req.params.id)
            );
            res.json(out);
        } catch (e) {
            next(e);
        }
    };

    clear = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const out = await this.svc.clearCart(getUserId(req), getSessionId(req));
            res.json(out);
        } catch (e) {
            next(e);
        }
    };

    applyCoupon = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const out = await this.svc.applyCoupon(getUserId(req), getSessionId(req), req.body.code);
            res.json(out);
        } catch (e) {
            next(e);
        }
    };

    removeCoupon = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const out = await this.svc.removeCoupon(getUserId(req), getSessionId(req));
            res.json(out);
        } catch (e) {
            next(e);
        }
    };

    merge = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = getUserId(req);
            const sessionId = getSessionId(req);
            if (!userId) return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
            if (!sessionId) return next(Object.assign(new Error("Missing session_id"), { status: 400 }));

            const out = await this.svc.mergeGuestIntoUser(userId, sessionId);
            res.json(out);
        } catch (e) {
            next(e);
        }
    };
}
