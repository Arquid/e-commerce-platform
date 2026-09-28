import { Types } from "mongoose";
import Order from "../models/Order";
import Product from "../models/Product";
import { httpError } from "./httpError";

interface StockItem {
  product: string | Types.ObjectId;
  quantity: number;
  name: string;
}

function putBack(items: StockItem[]) {
  return Promise.all(
    items.map((item) => Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }))
  );
}

// Takes the items out of stock at checkout, before the customer pays, so two
// customers can never both buy the last unit. Each decrement only matches if
// enough stock is left, so a sold-out item fails atomically instead of going
// negative — and anything already reserved for this checkout is put back.
export async function reserveStock(items: StockItem[]) {
  const reserved: StockItem[] = [];
  for (const item of items) {
    const result = await Product.updateOne(
      { _id: item.product, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } }
    );
    if (result.modifiedCount === 0) {
      await putBack(reserved);
      const available = (await Product.findById(item.product))?.stock ?? 0;
      throw httpError(`Not enough stock for "${item.name}" (${available} available)`, 400);
    }
    reserved.push(item);
  }
}

// Undoes a reservation for a checkout that failed before an order held it.
export const releaseReservation = putBack;

// Returns an order's items to stock — once. The stockHeld flag is cleared in
// the same atomic update that decides whether to return anything, so a
// cancel racing a checkout expiry (or any repeat) can't return stock twice,
// and an order that never held stock can't return any.
export async function releaseOrderStock(orderId: string | Types.ObjectId) {
  const order = await Order.findOneAndUpdate({ _id: orderId, stockHeld: true }, { stockHeld: false });
  if (order) await putBack(order.items);
}
