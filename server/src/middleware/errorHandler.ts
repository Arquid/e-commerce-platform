import { Request, Response, NextFunction } from "express";

export const notFound = (req: Request, res: Response) =>
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(err.statusCode || 500).json({ message: err.message || "Server error"});
};