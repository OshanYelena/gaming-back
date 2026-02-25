import { Request, Response, NextFunction } from "express";

type Role = "admin" | "moderator" | "customer";

export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const role = user.role as Role | undefined;
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
}