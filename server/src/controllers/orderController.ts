import { Response } from "express";
import Order from "../models/Order";
import { AuthRequest } from "../middleware/auth";

export const getMyOrders = async (req: AuthRequest, res: Response) => {
  const orders = await Order.find({ user: req.userId }).sort({ createdAt: -1 });
  res.json(orders);
}

export const getOrderById = async (req: AuthRequest, res: Response) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.userId });
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json(order);
}