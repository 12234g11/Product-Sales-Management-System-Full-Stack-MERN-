import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";

import AuthLayout from "../layouts/AuthLayout";
import AppLayout from "../layouts/AppLayout";

import LoginPage from "../features/auth/pages/LoginPage";
import SignupPage from "../features/auth/pages/SignupPage";

import DashboardPage from "../features/dashboard/pages/DashboardPage";
import ProductsPage from "../features/products/pages/ProductsPage";
import SalesPage from "../features/sales/pages/SalesPage";
import NewSalePage from "../features/sales/pages/NewSalePage";
import SaleReturnsPage from "../features/sales/pages/SaleReturnsPage";
import UsersPage from "../features/users/pages/UsersPage";

import NotFoundPage from "../pages/NotFoundPage";
import { useAuth } from "../App/providers/AuthProvider";
import LowStockProductsPage from "../features/products/pages/LowStockProductsPage";

import SuppliersPage from "../features/suppliers/pages/SuppliersPage";
import SupplierDetailsPage from "../features/suppliers/pages/SupplierDetailsPage";

import PurchaseInvoicesPage from "../features/purchases/pages/PurchaseInvoicesPage";
import CreatePurchaseInvoicePage from "../features/purchases/pages/CreatePurchaseInvoicePage";
import PurchaseInvoiceDetailsPage from "../features/purchases/pages/PurchaseInvoiceDetailsPage";

import StockMovementsPage from "../features/stock-movements/pages/StockMovementsPage";

function HomeRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return user?.role === "admin"
    ? <Navigate to="/dashboard" replace />
    : <Navigate to="/sales/new" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/low-stock" element={<LowStockProductsPage />} />

          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/suppliers/:id" element={<SupplierDetailsPage />} />

          <Route path="/purchases" element={<PurchaseInvoicesPage />} />
          <Route path="/purchases/new" element={<CreatePurchaseInvoicePage />} />
          <Route path="/purchases/:id" element={<PurchaseInvoiceDetailsPage />} />

          <Route path="/sales" element={<SalesPage />} />
          <Route path="/sales/new" element={<NewSalePage />} />
          <Route path="/sales/:id" element={<NewSalePage />} />
          <Route path="/sales/returns" element={<SaleReturnsPage />} />

          <Route path="/stock-movements" element={<StockMovementsPage />} />

          <Route element={<AdminRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}