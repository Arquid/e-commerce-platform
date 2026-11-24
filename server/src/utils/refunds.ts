import Stripe from "stripe";
import { Types } from "mongoose";
import { stripe } from "../config/stripe";
import Order from "../models/Order";
import AuditLog from "../models/AuditLog";

type OrderId = string | Types.ObjectId;

export type RefundOutcome =
  // The money is back with the customer (now, or on an earlier attempt).
  | "refunded"
  // Nothing was charged for this order, so there is nothing to return.
  | "nothing_to_refund";

// Returns the card payment made for an order, in full. Safe to repeat: Stripe
// treats a second request with the same idempotency key as the first, and a
// payment that is already refunded counts as done — so a retry after a
// timeout, a crash or a sweeper run can never refund the customer twice.
// Throws if Stripe can't be reached or refuses, leaving the order untouched.
export async function refundOrder(orderId: OrderId): Promise<RefundOutcome> {
  const order = await Order.findById(orderId);
  if (!order) return "nothing_to_refund";

  let refundId: string | undefined;
  let outcome: RefundOutcome = "nothing_to_refund";

  if (order.stripeSessionId) {
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    const paymentIntent = session.payment_intent;
    if (session.payment_status === "paid" && paymentIntent) {
      try {
        const refund = await stripe.refunds.create(
          { payment_intent: typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id },
          { idempotencyKey: `refund-order-${order.id}` }
        );
        refundId = refund.id;
      } catch (err) {
        // Refunded already, e.g. by hand in the Stripe dashboard.
        if (!(err instanceof Stripe.errors.StripeError && err.code === "charge_already_refunded")) throw err;
      }
      outcome = "refunded";
    }
  }

  // The money has moved; failing to write that down must not look like a
  // failed refund. The order stays flagged, and the next retry — which Stripe
  // answers with the same refund — records it.
  try {
    await Order.updateOne(
      { _id: order._id, refundedAt: { $exists: false } },
      outcome === "refunded"
        ? { $set: { refundedAt: new Date(), refundId }, $unset: { refundPending: 1 } }
        : { $unset: { refundPending: 1 } }
    );
  } catch (err) {
    console.error(`Refund for order ${order.id} went through but could not be recorded`, err);
  }
  return outcome;
}

// Refunds a cancelled order that no admin is waiting on (a payment that arrived
// for an order cancelled before it was paid, or a refund an earlier attempt
// couldn't complete), and records it in the audit log as a system event.
export async function refundCancelledOrder(orderId: OrderId, reason: string): Promise<RefundOutcome> {
  const outcome = await refundOrder(orderId);
  if (outcome === "refunded") {
    await AuditLog.create({
      action: "payment.refunded",
      targetType: "Order",
      targetId: String(orderId),
      details: { reason },
    });
  }
  return outcome;
}
