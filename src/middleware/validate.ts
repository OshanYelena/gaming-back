import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
      headers: req.headers,
    });

    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }

    // ✅ Don't do: req.query = ..., req.params = ...
    // Express 5 may expose them as getter-only.

    // We CAN safely replace req.body (usually writable)
    if ((result.data as any).body) {
      req.body = (result.data as any).body;
    }

    // Put everything else in res.locals (safe, standard)
    res.locals.validated = result.data;

    next();
  };
}