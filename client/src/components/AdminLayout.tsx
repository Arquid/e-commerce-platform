import { NavLink, Outlet } from "react-router-dom";

function tabClass({ isActive }: { isActive: boolean }) {
  return `px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
    isActive ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-900"
  }`;
}

export default function AdminLayout() {
  return (
    <div>
      <div className="mb-6 flex gap-2 border-b border-slate-200">
        <NavLink to="/admin/products" className={tabClass}>
          Products
        </NavLink>
        <NavLink to="/admin/orders" className={tabClass}>
          Orders
        </NavLink>
        <NavLink to="/admin/audit-log" className={tabClass}>
          Audit log
        </NavLink>
      </div>
      <Outlet />
    </div>
  );
}
