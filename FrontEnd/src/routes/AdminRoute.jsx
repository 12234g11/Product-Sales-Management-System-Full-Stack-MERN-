import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../App/providers/AuthProvider";

export default function AdminRoute() {
  const { user } = useAuth();
  const role = user?.role;

  if (role !== "admin") {
    return <Navigate to="/sales/new" replace />;
  }
  return <Outlet />;
}
