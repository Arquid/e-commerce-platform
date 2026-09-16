import { Request, Response, NextFunction } from "express";

export const notFound = (req: Request, res: Response) =>
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });

interface HttpError extends Error {
  statusCode?: number;
}

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const httpError = err instanceof Error ? (err as HttpError) : undefined;
  res.status(httpError?.statusCode || 500).json({ message: httpError?.message || "Server error" });
};