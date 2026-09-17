import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export const validate =
  (schema: z.ZodType) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    req.body = result.data;
    next();
  };

// Express 5's req.query is a read-only getter, so a validated/coerced query
// (e.g. "page=2" as the number 2) can't be written back onto req.query like
// validate() does with req.body — it's stashed on res.locals.query instead.
export const validateQuery =
  (schema: z.ZodType) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    res.locals.query = result.data;
    next();
  };