import { Link, useSearchParams } from "react-router-dom";

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");

  return (
    <div className="mx-auto max-w-md py-8 text-center">
      <div className="rounded-xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600">
          ✓
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-slate-900">Thank you for your order!</h1>
        {orderId && (
          <p className="mt-2 text-sm text-slate-500">
            Order number <span className="font-medium text-slate-700">#{orderId.slice(-6)}</span>
          </p>
        )}
        <p className="mt-2 text-sm text-slate-500">You'll receive a confirmation once payment is processed.</p>
        <Link
          to="/orders"
          className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          View order history
        </Link>
      </div>
    </div>
  );
}
