import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

export const notFound = (req: Request, res: Response) =>
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });

interface HttpError extends Error {
  statusCode?: number;
}

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // A malformed id in a URL or request body (e.g. /products/abc) is the
  // caller's mistake, not a server fault.
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid value for ${err.path}` });
  }
  console.error(err);
  const httpError = err instanceof Error ? (err as HttpError) : undefined;
  res.status(httpError?.statusCode || 500).json({ message: httpError?.message || "Server error" });
};