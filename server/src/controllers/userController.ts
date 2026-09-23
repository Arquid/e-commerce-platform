import { Response } from "express";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth";
import { logAdminAction } from "../utils/auditLog";

export const getUsers = async (_req: AuthRequest, res: Response) => {
  const { page, limit } = res.locals.query as { page: number; limit: number };

  const [users, total] = await Promise.all([
    User.find()
      .select("name email role createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(),
  ]);

  res.json({ users, total, page, pages: Math.ceil(total / limit) });
};

export const updateUserRole = async (req: AuthRequest, res: Response) => {
  // An admin can promote/demote any other user, but never their own role —
  // this is the only check needed to guarantee there's always at least one
  // admin left (the person making the change), without having to count how
  // many admins currently exist.
  if (req.params.id === req.userId) {
    const error = new Error("You cannot change your own role") as Error & { statusCode: number };
    error.statusCode = 400;
    throw error;
  }

  const previous = await User.findById(req.params.id);
  if (!previous) return res.status(404).json({ message: "User not found" });

  const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { returnDocument: "after" });
  if (!user) return res.status(404).json({ message: "User not found" });

  await logAdminAction(req.userId as string, "user.role_update", "User", user.id, {
    email: user.email,
    from: previous.role,
    to: user.role,
  });

  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
};
