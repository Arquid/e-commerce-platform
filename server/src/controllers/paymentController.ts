import { Request, Response } from "express";
import Stripe from "stripe";
import { stripe } from "../config/stripe";
import Order from "../models/Order";
import Product from "../models/Product";
import AuditLog from "../models/AuditLog";
import { AuthRequest } from "../middleware/auth";
import { httpError } from "../utils/httpError";
import { reserveStock, releaseReservation, releaseOrderStock } from "../utils/stock";
import { closeCheckoutSession } from "../utils/checkoutSession";

// Stripe requires at least 30 minutes; the extra minute absorbs the time
// between computing this and Stripe receiving the request.
const CHECKOUT_EXPIRY_SECONDS = 31 * 60;

// How long a pending order without a Stripe session counts as "still being
// created by another request" rather than abandoned.
const IN_FLIGHT_GRACE_MS = 2 * 60 * 1000;

// A customer has at most one open checkout. Stripe's "back" link returns them
// to the cart with their previous order still pending and its stock still
// reserved, so without this every retry reserved the items again — enough
// retries and the customer (or a script) held all of the stock.
async function abandonPreviousCheckouts(userId: string) {
  const pending = await Order.find({ user: userId, status: "pending" });
  for (const order of pending) {
    if (!order.stripeSessionId) {
      // No Stripe session yet: either another request of this customer's is
      // part-way through creating this very order, or it crashed there. A
      // young one is left alone — cancelling it would let that request go on
      // to hand out a payable checkout for a cancelled order — and the unique
      // index on pending orders makes the newer request wait its turn. Only an
      // old one is treated as abandoned.
      if (Date.now() - order.createdAt.getTime() < IN_FLIGHT_GRACE_MS) continue;
    } else {
      try {
        if ((await closeCheckoutSession(order.stripeSessionId)) === "already_paid") {
          // Paid moments ago and the webhook hasn't arrived yet. Stripe has
          // confirmed it, so record it as paid now (the webhook's own update
          // then finds nothing pending and does nothing) — leaving it pending
          // would also block this customer's next checkout.
          await Order.findOneAndUpdate({ _id: order._id, status: "pending" }, { status: "paid", paidAt: new Date() });
          continue;
        }
      } catch (err) {
        // Couldn't reach Stripe to close it. Cancelling it anyway could leave a
        // still-payable checkout attached to a cancelled order, so leave it to
        // expire on its own.
        console.error(`Could not close the previous checkout for order ${order.id}`, err);
        continue;
      }
    }
    const cancelled = await Order.findOneAndUpdate({ _id: order._id, status: "pending" }, { status: "cancelled" });
    if (cancelled) await releaseOrderStock(cancelled._id);
  }
}

function isDuplicateKeyError(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === 11000;
}

interface CheckoutItemInput {
  productId: string;
  quantity: number;
}

interface ShippingAddress {
  line1: string;
  city: string;
  postalCode: string;
  country: string;
}

export const createCheckoutSession = async (req: AuthRequest, res: Response) => {
  const { items, shippingAddress } = req.body as { items: CheckoutItemInput[]; shippingAddress: ShippingAddress };

  // Never trust a price or product name sent by the client — look up the
  // authoritative values in the database so a tampered request can't change
  // what gets charged.
  const products = await Product.find({ _id: { $in: items.map((i) => i.productId) } });

  const orderItems = items.map((i) => {
    const product = products.find((p) => p.id === i.productId);
    if (!product) throw httpError(`Product not found: ${i.productId}`, 400);
    return { product: product.id, name: product.name, price: product.price, quantity: i.quantity };
  });

  const totalAmount = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Before reserving, so units this customer already holds are available to
  // the checkout replacing it.
  await abandonPreviousCheckouts(req.userId as string);
  await reserveStock(orderItems);

  let orderId: string | undefined;
  try {
    const order = await Order.create({
      user: req.userId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      status: "pending",
      stockHeld: true,
    });
    orderId = order.id;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: orderItems.map((i) => ({
        price_data: {
          currency: "eur",
          product_data: { name: i.name },
          unit_amount: Math.round(i.price * 100)
        },
        quantity: i.quantity
      })),
      success_url: `${process.env.CLIENT_URL}/order-success?orderId=${order.id}`,
      cancel_url: `${process.env.CLIENT_URL}/cart`,
      metadata: { orderId: order.id },
      // Stock is reserved for as long as this page can still be paid, so
      // don't leave it open for Stripe's default 24h — an abandoned cart
      // would take those units off sale for a whole day.
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_EXPIRY_SECONDS,
    });

    order.stripeSessionId = session.id;
    await order.save();

    res.json({ url: session.url });
  } catch (err) {
    // Nothing can be paid for yet, so hand the reserved units straight back.
    await releaseReservation(orderItems);
    if (orderId) await Order.deleteOne({ _id: orderId });
    // Another checkout of this customer's won the race for their one pending
    // order (see the unique index on Order).
    if (isDuplicateKeyError(err)) {
      throw httpError("You already have a checkout in progress. Wait a moment, then try again.", 409);
    }
    throw err;
  }
};

// Stripe calls this endpoint directly (not the browser) to confirm payment.
export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET as string);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return res.status(400).send(`Webhook Error: ${message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    // Stock was already taken out at checkout, so paying only changes the
    // order's status. Matching on "pending" makes a redelivery a no-op.
    const order = await Order.findOneAndUpdate(
      { _id: session.metadata?.orderId, status: "pending" },
      { status: "paid", paidAt: new Date() }
    );
    if (!order) {
      // Money arrived for an order that was cancelled before it was ever
      // paid. Cancelling a pending order expires its Stripe session first,
      // so this shouldn't happen — but if it does, the customer has been
      // charged for an order that isn't going to ship, so it must not be
      // dropped silently. Setting paidAt in the same atomic update makes a
      // redelivery of this event a no-op instead of a duplicate entry.
      const flagged = await Order.findOneAndUpdate(
        { _id: session.metadata?.orderId, status: "cancelled", paidAt: { $exists: false } },
        { paidAt: new Date() }
      );
      if (flagged) {
        await AuditLog.create({
          action: "payment.received_for_cancelled_order",
          targetType: "Order",
          targetId: flagged.id,
          details: { stripeSessionId: session.id, amountTotal: session.amount_total },
        });
      }
    }
  } else if (event.type === "checkout.session.expired") {
    // The customer left checkout without paying. Only cancel if the order
    // never got paid through some other path, and give its reserved stock
    // back so the units are on sale again.
    const session = event.data.object as Stripe.Checkout.Session;
    const cancelled = await Order.findOneAndUpdate(
      { _id: session.metadata?.orderId, status: "pending" },
      { status: "cancelled" }
    );
    if (cancelled) await releaseOrderStock(cancelled._id);
  }

  res.json({ received: true });
};