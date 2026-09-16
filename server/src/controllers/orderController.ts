import { Response } from "express";
import Order from "../models/Order";
import { AuthRequest } from "../middleware/auth";
import { logAdminAction } from "../utils/auditLog";

export const getMyOrders = async (req: AuthRequest, res: Response) => {
  const orders = await Order.find({ user: req.userId }).sort({ createdAt: -1 });
  res.json(orders);
}

export const getOrderById = async (req: AuthRequest, res: Response) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.userId });
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json(order);
}

export const getAllOrders = async (_req: AuthRequest, res: Response) => {
  const orders = await Order.find().sort({ createdAt: -1 }).populate("user", "name email");
  res.json(orders);
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  const previous = await Order.findById(req.params.id);
  if (!previous) return res.status(404).json({ message: "Order not found" });

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { returnDocument: "after" }
  );
  if (!order) return res.status(404).json({ message: "Order not found" });

  await logAdminAction(req.userId as string, "order.status_update", "Order", order.id, {
    from: previous.status,
    to: order.status,
  });

  res.json(order);
};