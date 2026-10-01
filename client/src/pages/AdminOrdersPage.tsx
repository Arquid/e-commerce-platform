import { useState } from "react";
import { useGetAllOrdersQuery, useUpdateOrderStatusMutation } from "../features/orders/ordersApiSlice";
import type { OrderStatus } from "../features/orders/ordersApiSlice";
import Pagination from "../components/Pagination";
import { getErrorMessage } from "../utils/errorMessage";

// Mirrors the server's allowed transitions (orderController.ts) so the menu
// only offers moves that will succeed — the server is what enforces them.
// "paid" is never offered: only a confirmed Stripe payment can set it.
const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  pending: ["cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const statusStyles: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  paid: "bg-blue-50 text-blue-700",
  shipped: "bg-indigo-50 text-indigo-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetAllOrdersQuery({ page, limit: 10 });
  const [updateOrderStatus] = useUpdateOrderStatusMutation();
  const [failure, setFailure] = useState<{ orderId: string; message: string } | null>(null);

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    setFailure(null);
    try {
      await updateOrderStatus({ id: orderId, status }).unwrap();
    } catch (err) {
      setFailure({ orderId, message: getErrorMessage(err, "Update failed — try again") });
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Manage orders</h1>

      {isLoading && <p className="text-sm text-slate-500">Loading orders...</p>}

      {!isLoading && data?.orders.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-500">
          No orders yet.
        </p>
      )}

      {!isLoading && data && data.orders.length > 0 && (
        <>
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {data.orders.map((o) => (
              <div key={o._id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-[12rem] flex-1">
                  <p className="font-medium text-slate-900">Order #{o._id.slice(-6)}</p>
                  <p className="text-sm text-slate-500">
                    {o.user && typeof o.user === "object" ? `${o.user.name} · ${o.user.email}` : o.user}
                  </p>
                  <p className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</p>
                </div>

                <span className="font-medium text-slate-900">{o.totalAmount.toFixed(2)} €</span>

                <div className="flex flex-col items-end gap-1">
                  <select
                    value={o.status}
                    disabled={nextStatuses[o.status].length === 0}
                    onChange={(e) => handleStatusChange(o._id, e.target.value as OrderStatus)}
                    className={`rounded-full border-0 px-3 py-1 text-xs font-medium capitalize focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed ${statusStyles[o.status]}`}
                  >
                    {[o.status, ...nextStatuses[o.status]].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {failure?.orderId === o._id && (
                    <span className="max-w-xs text-right text-xs text-red-600">{failure.message}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Pagination page={page} pages={data.pages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
