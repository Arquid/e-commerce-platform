import { Types } from "mongoose";
import Order from "../models/Order";
import { releaseOrderStock } from "./stock";

type OrderId = string | Types.ObjectId;

// Both only act on an order that is still pending, in one atomic update, so
// whichever of the webhook, an admin, the customer's next checkout or the
// stale-checkout sweeper gets there first wins and the rest find nothing to
// do. They return the order they changed, or null if someone else already had.

// Cancels a pending order and puts the stock it reserved back on sale.
export async function cancelPendingOrder(orderId: OrderId) {
  const cancelled = await Order.findOneAndUpdate({ _id: orderId, status: "pending" }, { status: "cancelled" });
  if (cancelled) await releaseOrderStock(cancelled._id);
  return cancelled;
}

// Records a payment Stripe has confirmed. The units stay reserved — they're sold.
export function markPendingOrderPaid(orderId: OrderId) {
  return Order.findOneAndUpdate({ _id: orderId, status: "pending" }, { status: "paid", paidAt: new Date() });
}
