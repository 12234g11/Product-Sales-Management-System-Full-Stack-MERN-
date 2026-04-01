import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="auth-bg-dark min-vh-100 d-flex align-items-center justify-content-center p-3">
      <div className="auth-card p-4 w-100" style={{ maxWidth: 480 }}>
        <h2 className="h4 mb-3 text-center">نظام إدارة المخزون والمبيعات</h2>
        <Outlet />
      </div>
    </div>
  );
}
