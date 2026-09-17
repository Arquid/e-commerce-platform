import { useState } from "react";
import { Link } from "react-router-dom";
import { useGetMyOrdersQuery } from "../features/orders/ordersApiSlice";
import Pagination from "../components/Pagination";

const statusStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  paid: "bg-blue-50 text-blue-700",
  shipped: "bg-indigo-50 text-indigo-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

export default function OrderHistoryPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetMyOrdersQuery({ page, limit: 10 });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Order history</h1>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      )}

      {!isLoading && data?.orders.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-16 text-center">
          <p className="font-medium text-slate-900">No orders yet</p>
          <p className="mt-1 text-sm text-slate-500">Your past orders will show up here.</p>
          <Link
            to="/"
            className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Browse products
          </Link>
        </div>
      )}

      {!isLoading && data && data.orders.length > 0 && (
        <>
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {data.orders.map((o) => (
              <div key={o._id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium text-slate-900">Order #{o._id.slice(-6)}</p>
                  <p className="text-sm text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusStyles[o.status] ?? "bg-slate-100 text-slate-700"}`}
                >
                  {o.status}
                </span>
                <span className="font-semibold text-slate-900">{o.totalAmount.toFixed(2)} €</span>
              </div>
            ))}
          </div>

          <Pagination page={page} pages={data.pages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
