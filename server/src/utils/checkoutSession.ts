import { stripe } from "../config/stripe";

// A pending order's Stripe Checkout page stays payable until it expires, so it
// has to be closed before the order is cancelled — otherwise the customer can
// still pay and be charged for an order that will never ship.
export async function closeCheckoutSession(sessionId: string): Promise<"closed" | "already_paid"> {
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
