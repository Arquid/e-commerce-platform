import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AUTH_COOKIE_NAME } from "../config/authCookie";
import User from "../models/User";

export interface AuthRequest extends Request {
  userId?: string;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// The role is read from the database on every admin request, never from the
// token. A token stays valid for days, so a role baked into it would keep an
// admin who has since been demoted (or deleted) able to use admin endpoints
// until it expired — including demoting whoever demoted them.
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = await User.findById(req.userId).select("role");
  if (!user) return res.status(401).json({ message: "Not authenticated" });
  if (user.role !== "admin") return res.status(403).json({ message: "Admin only" });
  next();
};
