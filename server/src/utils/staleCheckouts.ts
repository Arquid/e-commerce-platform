import Order from "../models/Order";
import AuditLog from "../models/AuditLog";
import { STALE_CHECKOUT_AFTER_MS } from "../config/checkout";
import { closeCheckoutSession } from "./checkoutSession";
import { cancelPendingOrder, markPendingOrderPaid } from "./pendingOrders";
import { releaseOrderStock } from "./stock";

// Each run handles at most this many; a backlog is worked off over the next runs.
const BATCH_SIZE = 100;

export interface SweepSummary {
  cancelled: number;
  markedPaid: number;
  stockRepaired: number;
  failed: number;
}

// Normally Stripe tells us when a checkout expires or is paid (webhook) and
// that's all it takes to settle the order. If that message never arrives — the
// server was down, Stripe gave up retrying — the order would stay pending and
// its reserved stock would stay off sale indefinitely, or a paid order would
// never show as paid. This asks Stripe directly instead, for every order that
// has been pending long past the point its checkout page expired.
//
// Safe to run on several server instances at once and to run repeatedly: every
// change is an atomic update on an order that must still be pending, so only
// one run acts on a given order and the others find nothing left to do.
export async function sweepStaleCheckouts(now = Date.now()): Promise<SweepSummary> {
  const summary: SweepSummary = { cancelled: 0, markedPaid: 0, stockRepaired: 0, failed: 0 };

  const stale = await Order.find({
    status: "pending",
    stockHeld: true,
    createdAt: { $lt: new Date(now - STALE_CHECKOUT_AFTER_MS) },
  })
    .sort({ createdAt: 1 })
    .limit(BATCH_SIZE);

  for (const order of stale) {
    try {
      if (order.stripeSessionId && (await closeCheckoutSession(order.stripeSessionId)) === "already_paid") {
        if (await markPendingOrderPaid(order._id)) {
          summary.markedPaid++;
          await AuditLog.create({
            action: "payment.reconciled",
            targetType: "Order",
            targetId: order.id,
            details: { stripeSessionId: order.stripeSessionId },
          });
        }
        continue;
      }

      // The session is closed (or never existed), so nothing can be paid for
      // this order any more and it's safe to cancel.
      if (await cancelPendingOrder(order._id)) {
        summary.cancelled++;
        await AuditLog.create({
          action: "checkout.expired_cleanup",
          targetType: "Order",
          targetId: order.id,
          details: { reason: order.stripeSessionId ? "stripe_session_expired" : "no_stripe_session" },
        });
      }
    } catch (err) {
      // Typically Stripe being unreachable. Leave this order pending — it's
      // still stale, so the next run tries it again — and carry on with the rest.
      summary.failed++;
      console.error(`Could not settle stale checkout for order ${order.id}`, err);
    }
  }

  // A cancelled order should never still hold stock. It can if the server
  // stopped between marking the order cancelled and putting its stock back.
  const stuck = await Order.find({ status: "cancelled", stockHeld: true }).limit(BATCH_SIZE);
  for (const order of stuck) {
    try {
      if (await releaseOrderStock(order._id)) summary.stockRepaired++;
    } catch (err) {
      summary.failed++;
      console.error(`Could not return stock held by cancelled order ${order.id}`, err);
    }
  }

  return summary;
}
