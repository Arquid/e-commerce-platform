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
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>("Order", orderSchema);