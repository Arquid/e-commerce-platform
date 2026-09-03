import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  stock: number;
  rating: number;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, index: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0},
    category: { type: String, required: true, index: true },
    imageUrl: { type: String, required: true},
    stock: { type: Number, required: true, default: 0 },
    rating: { type: Number, default: 0 }
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text" });

export default mongoose.model<IProduct>("Product", productSchema);