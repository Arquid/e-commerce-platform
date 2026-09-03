import { Request, Response } from "express";
import { stripe } from "../config/stripe";
import Order from "../models/Order";
import { AuthRequest } from "../middleware/auth";

export const createCheckoutSession = async (req: AuthRequest, res: Response) => {
  const { items, shippingAddress } = req.body // items: [{ productId, name, price, quantity }]
  const totalAmount = items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);

  const order = await Order.create({
    user: req.userId,
    items: items.map((i: any) => ({ product: i.productId, name: i.name, quantity: i.quantity, price: i.price })),
    totalAmount,
    shippingAddress,
    status: "pending"
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: items.map((i: any) => ({
      price_data: {
        currency: "eur",
        product_data: { name: i.name },
        unit_amount: Math.round(i.price * 100)
      },
      quantity: i.quantity
    })),
    success_url: `${process.env.CLIENT_URL}/order-success?orderId=${order.id}`,
    cancel_url: `${process.env.CLIENT_URL}/cart`,
    metadata: { orderId: order.id }
  });

  order.stripeSessionId = session.id;
  await order.save();

  res.json({ url: session.url });
};

// Stripe calls this endpoint directly (not the browser) to confirm payment.
export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET as string);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    await Order.findByIdAndUpdate(session.metadata.orderId, { status: "paid" });
  }

  res.json({ received: true });
};