import { useGetAllOrdersQuery, useUpdateOrderStatusMutation } from "../features/orders/ordersApiSlice";
import type { OrderStatus } from "../features/orders/ordersApiSlice";

const statusOptions: OrderStatus[] = ["pending", "paid", "shipped", "delivered", "cancelled"];

const statusStyles: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  paid: "bg-blue-50 text-blue-700",
  shipped: "bg-indigo-50 text-indigo-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

export default function AdminOrdersPage() {
  const { data: orders, isLoading } = useGetAllOrdersQuery();
  const [updateOrderStatus] = useUpdateOrderStatusMutation();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Manage orders</h1>

      {isLoading && <p className="text-sm text-slate-500">Loading orders...</p>}

      {!isLoading && orders?.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-500">
          No orders yet.
        </p>
      )}

      {!isLoading && orders && orders.length > 0 && (
        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {orders.map((o) => (
            <div key={o._id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-[12rem] flex-1">
                <p className="font-medium text-slate-900">Order #{o._id.slice(-6)}</p>
                <p className="text-sm text-slate-500">
                  {typeof o.user === "object" ? `${o.user.name} · ${o.user.email}` : o.user}
                </p>
                <p className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</p>
              </div>

              <span className="font-medium text-slate-900">{o.totalAmount.toFixed(2)} €</span>

              <select
                value={o.status}
                onChange={(e) => updateOrderStatus({ id: o._id, status: e.target.value as OrderStatus })}
                className={`rounded-full border-0 px-3 py-1 text-xs font-medium capitalize focus:outline-none focus:ring-2 focus:ring-blue-200 ${statusStyles[o.status]}`}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
