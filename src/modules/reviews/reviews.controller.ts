import { Request, Response, NextFunction } from "express";
import { ReviewsService } from "./reviews.service";

function getUserId(req: Request) {
  return (req as any).user?.sub as string;
}

export class ReviewsController {
  private svc = new ReviewsService();

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      const productId = String(req.params.id);
      const { rating, title, body } = req.body;

      const out = await this.svc.createReview({ productId, userId, rating, title, body });
      res.status(201).json(out);
    } catch (e) {
      next(e);
    }
  };
}
