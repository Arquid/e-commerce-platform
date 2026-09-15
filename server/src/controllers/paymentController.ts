import { Request, Response } from "express";
import { stripe } from "../config/stripe";
import Order from "../models/Order";
import Product from "../models/Product";
import { AuthRequest } from "../middleware/auth";

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
    if (!product) {
      const error = new Error(`Product not found: ${i.productId}`) as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
    }
    return { product: product.id, name: product.name, price: product.price, quantity: i.quantity };
  });

  const totalAmount = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const order = await Order.create({
    user: req.userId,
    items: orderItems,
    totalAmount,
    shippingAddress,
    status: "pending"
  });

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
  } else if (event.type === "checkout.session.expired") {
    // The customer left checkout without paying; Stripe sends this ~24h later.
    // Only cancel if the order never got paid through some other path.
    const session = event.data.object as any;
    await Order.findOneAndUpdate(
      { _id: session.metadata.orderId, status: "pending" },
      { status: "cancelled" }
    );
  }

  res.json({ received: true });
};