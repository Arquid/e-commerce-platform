import { Response } from "express";
import Order, { IOrder } from "../models/Order";
import { stripe } from "../config/stripe";
import { AuthRequest } from "../middleware/auth";
import { logAdminAction } from "../utils/auditLog";
import { httpError } from "../utils/httpError";
import { releaseOrderStock } from "../utils/stock";

type OrderStatus = IOrder["status"];

// Admins only move orders forward through fulfilment, or cancel them. "paid"
// is deliberately unreachable from here: only a confirmed Stripe payment (the
// webhook) may set it, since that's also where stock gets decremented — a
// manual "paid" would skip that and make the webhook ignore the real payment.
const ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

// A pending order's Stripe Checkout page stays payable for up to 24h, so it
// has to be closed before the order is cancelled — otherwise the customer can
// still pay and be charged for an order that will never ship.
async function closeCheckoutSession(sessionId: string): Promise<"closed" | "already_paid"> {
  try {
    await stripe.checkout.sessions.expire(sessionId);
    return "closed";
  } catch (err) {
    // expire() also rejects a session that's already expired or completed;
    // check which one instead of guessing from the error message.
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status === "expired") return "closed";
    if (session.status === "complete") return "already_paid";
    throw err;
  }
}

export const getMyOrders = async (req: AuthRequest, res: Response) => {
  const { page, limit } = res.locals.query as { page: number; limit: number };
  const filter = { user: req.userId };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  res.json({ orders, total, page, pages: Math.ceil(total / limit) });
}

export const getOrderById = async (req: AuthRequest, res: Response) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.userId });
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json(order);
}

export const getAllOrders = async (_req: AuthRequest, res: Response) => {
  const { page, limit } = res.locals.query as { page: number; limit: number };

  const [orders, total] = await Promise.all([
    Order.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name email"),
    Order.countDocuments(),
  ]);

  res.json({ orders, total, page, pages: Math.ceil(total / limit) });
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  const to = req.body.status as OrderStatus;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  const from = order.status;
  if (!ADMIN_TRANSITIONS[from].includes(to)) {
    throw httpError(`Cannot change an order from "${from}" to "${to}"`, 400);
  }

  if (from === "pending" && order.stripeSessionId) {
    if ((await closeCheckoutSession(order.stripeSessionId)) === "already_paid") {
      throw httpError(
        "The customer has already paid for this order. It will show as paid once the payment is processed, and can be cancelled after that.",
        409
      );
    }
  }

  // Conditional on the status we validated against, so a concurrent change
  // (e.g. the webhook marking it paid) fails this update instead of being
  // silently overwritten by it.
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: from },
    { status: to },
    { returnDocument: "after" }
  );
  if (!updated) {
    throw httpError("This order was just changed by someone else — reload and try again.", 409);
  }

  // Covers both a reserved (pending) and a sold (paid) order — whichever
  // units this order actually took out of stock, and only those, go back.
  if (to === "cancelled") await releaseOrderStock(updated._id);

  await logAdminAction(req.userId as string, "order.status_update", "Order", updated.id, { from, to });

  res.json(updated);
};