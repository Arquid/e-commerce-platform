import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../app/store";
import { logOut } from "../features/auth/authSlice";

export default function Navbar() {
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();

  const itemCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <nav className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight text-slate-900">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white text-sm">
            E
          </span>
          E-Shop
        </Link>

        <div className="flex items-center gap-6 text-sm font-medium text-slate-600">
          {user && (
            <Link to="/orders" className="hover:text-slate-900 transition-colors">
              Orders
            </Link>
          )}

          {user?.role === "admin" && (
            <Link to="/admin/products" className="hover:text-slate-900 transition-colors">
              Admin
            </Link>
          )}

          <Link
            to="/cart"
            className="relative flex items-center gap-1.5 hover:text-slate-900 transition-colors"
          >
            Cart
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-semibold text-white">
              {itemCount}
            </span>
          </Link>

          {user ? (
            <button
              onClick={() => dispatch(logOut())}
              className="hover:text-slate-900 transition-colors"
            >
              Log out
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="hover:text-slate-900 transition-colors">
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700 transition-colors"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
