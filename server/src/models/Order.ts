import mongoose, { Schema, Document, Types } from "mongoose";

interface OrderItem {
  product: Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
}

export interface IOrder extends Document {
  user: Types.ObjectId;
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: { line1: string; city: string; postalCode: string; country: string };
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  stripeSessionId?: string;
  paidAt?: Date;
  stockHeld: boolean;
  createdAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: String,
        quantity: Number,
        price: Number,
      },
    ],
    totalAmount: { type: Number, required: true },
    shippingAddress: {
      line1: String, city: String, postalCode: String, country: String,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    stripeSessionId: String,
    // Set only when Stripe confirms payment — lets the webhook tell "a
    // cancelled order that was never paid just received money" apart from a
    // redelivered event for an order that was paid and cancelled later.
    paidAt: Date,
    // True while this order's items are taken out of product stock — from
    // checkout (reserved) through payment (sold) — until the order is
    // cancelled or its checkout expires. Stock is only ever put back by
    // flipping this to false, so it can't be returned twice, or returned for
    // units the order never actually took.
    stockHeld: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// A customer can have at most one pending order. Checking for an existing one
// in application code isn't enough: two requests arriving together both see
// none and both create one, reserving the stock twice. The database enforces
// it atomically instead — the loser of the race gets a duplicate-key error.
orderSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { status: "pending" } });

export default mongoose.model<IOrder>("Order", orderSchema);