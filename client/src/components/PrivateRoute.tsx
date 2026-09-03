import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../app/store";

export default function PrivateRoute() {
  const token = useSelector((state: RootState) => state.auth.token);
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
