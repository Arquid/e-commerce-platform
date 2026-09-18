import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth";
import { setAuthCookie, clearAuthCookie } from "../config/authCookie";

const signToken = (id: string, role: string) =>
  jwt.sign(
    { id, role },
    process.env.JWT_SECRET as string,
    { expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"] }
  );

export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  const exist = await User.findOne({ email });
  if (exist) return res.status(409).json({ message: "Email already in use" });

  const user = await User.create({ name, email, password});
  setAuthCookie(res, signToken(user.id, user.role));
  res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  setAuthCookie(res, signToken(user.id, user.role));
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
};

export const logout = (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
};

export const getMe = async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role});
};