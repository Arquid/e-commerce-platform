import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../app/store";
import { removeItem, updateQuantity } from "../features/cart/cartSlice";
import { useCreateCheckoutSessionMutation } from "../features/orders/ordersApiSlice";

export default function CartPage() {
  const items = useSelector((s: RootState) => s.cart.items);
  const dispatch = useDispatch();
  const [createCheckoutSession, { isLoading }] = useCreateCheckoutSessionMutation();

  const [address, setAddress] = useState({ line1: "", city: "", postalCode: "", country: "" });
  const [checkoutFailed, setCheckoutFailed] = useState(false);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleCheckout = async (e: FormEvent) => {
    e.preventDefault();
    setCheckoutFailed(false);
    try {
      const res = await createCheckoutSession({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddress: address,
      }).unwrap();
      window.location.href = res.url; // redirect to Stripe Checkout
    } catch {
      setCheckoutFailed(true);
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-16 text-center">
        <p className="font-medium text-slate-900">Your cart is empty</p>
        <p className="mt-1 text-sm text-slate-500">Add some products to get started.</p>
        <Link
          to="/"
          className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Your cart</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {items.map((i) => (
            <div key={i.productId} className="flex items-center gap-4 p-4">
              <img src={i.imageUrl} alt={i.name} className="h-16 w-16 rounded-md object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{i.name}</p>
                <p className="text-sm text-slate-500">{i.price.toFixed(2)} € each</p>
              </div>

              <div className="flex items-center rounded-md border border-slate-300">
                <button
                  type="button"
                  onClick={() =>
                    dispatch(updateQuantity({ productId: i.productId, quantity: Math.max(1, i.quantity - 1) }))
                  }
                  className="px-2.5 py-1 text-slate-500 hover:bg-slate-100"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm tabular-nums">{i.quantity}</span>
                <button
                  type="button"
                  onClick={() => dispatch(updateQuantity({ productId: i.productId, quantity: i.quantity + 1 }))}
                  className="px-2.5 py-1 text-slate-500 hover:bg-slate-100"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <span className="w-20 text-right font-medium text-slate-900">
                {(i.price * i.quantity).toFixed(2)} €
              </span>

              <button
                type="button"
                onClick={() => dispatch(removeItem(i.productId))}
                className="text-sm text-slate-400 hover:text-red-600 transition-colors"
                aria-label="Remove item"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleCheckout} className="h-fit rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Shipping address</h2>
          <div className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Address
              <input
                required
                value={address.line1}
                onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              City
              <input
                required
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Postal code
                <input
                  required
                  value={address.postalCode}
                  onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Country
                <input
                  required
                  value={address.country}
                  onChange={(e) => setAddress({ ...address, country: e.target.value })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
          </div>

          <div className="mt-5 flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span>{total.toFixed(2)} €</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-slate-200 pt-4 text-lg font-semibold text-slate-900">
            <span>Total</span>
            <span>{total.toFixed(2)} €</span>
          </div>

          {checkoutFailed && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              Could not start checkout. One or more items may be out of stock — try adjusting the quantities.
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-5 w-full rounded-lg bg-emerald-600 py-3 font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Redirecting to payment..." : "Proceed to checkout"}
          </button>
        </form>
      </div>
    </div>
  );
}