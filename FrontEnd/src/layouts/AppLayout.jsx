import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../App/providers/AuthProvider";
import { Offcanvas } from "bootstrap";
import { useEffect, useState } from "react";
import { FaTruck } from "react-icons/fa";
import { FiEdit3, FiLogOut, FiMenu } from "react-icons/fi";
import { MdAssignmentReturn, MdDashboard, MdGroup, MdInventory2, MdLowPriority, MdPointOfSale, MdReceiptLong, MdShoppingCart, MdSwapHoriz } from "react-icons/md";
import AppFooter from "../components/AppFooter";
import EditWorkspaceNameModal from "../features/workspace/components/EditWorkspaceNameModal";
import { updateWorkspaceNameApi } from "../features/workspace/api/workspaceApi";
import { authStorage } from "../services/storage/authStorage";

function WorkspaceEditButton({ onClick, className = "" }) {
  return (
    <button
      type="button"
      className={`btn btn-link text-white p-0 border-0 d-inline-flex align-items-center justify-content-center ${className}`}
      onClick={onClick}
      title="تغيير اسم المحل"
      aria-label="تغيير اسم المحل"
      style={{ width: 28, height: 28, opacity: 0.9 }}
    >
      <FiEdit3 aria-hidden="true" />
    </button>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const role = user?.role;
  const location = useLocation();

  const initialWorkspaceName = user?.workspaceName || user?.workspace?.name || "Workspace";

  const [workspaceName, setWorkspaceName] = useState(initialWorkspaceName);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState("");

  const menu = [
    ...(role === "admin"
      ? [{ to: "/dashboard", label: "لوحة التحكم", end: true, icon: <MdDashboard /> }]
      : []),

    { to: "/products", label: "المنتجات", end: true, icon: <MdInventory2 /> },
    { to: "/suppliers", label: "الموردين", icon: <FaTruck /> },
    { to: "/purchases", label: "فواتير الشراء", icon: <MdShoppingCart /> },
    { to: "/sales/new", label: "إنشاء فاتورة بيع", end: true, icon: <MdPointOfSale /> },
    { to: "/sales", label: "فواتير البيع", end: true, icon: <MdReceiptLong /> },
    { to: "/sales/returns", label: "المرتجعات", end: true, icon: <MdAssignmentReturn /> },
    { to: "/stock-movements", label: "حركة المخزون", end: true, icon: <MdSwapHoriz /> },
    { to: "/products/low-stock", label: "مخزون منخفض", end: true, icon: <MdLowPriority /> },

    ...(role === "admin"
      ? [{ to: "/users", label: "المستخدمين", end: true, icon: <MdGroup /> }]
      : []),
  ];

  const linkClass = ({ isActive }) =>
    `nav-link app-nav-link ${isActive ? "active" : ""}`;

  const roleLabel = role === "admin" ? "مدير" : "عامل";
  const canRenameWorkspace = role === "admin";

  useEffect(() => {
    setWorkspaceName(initialWorkspaceName);
  }, [initialWorkspaceName]);

  const cleanupBackdrops = () => {
    document
      .querySelectorAll(".offcanvas-backdrop, .modal-backdrop")
      .forEach((el) => el.remove());

    document.body.classList.remove("modal-open");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("padding-right");
  };

  useEffect(() => {
    cleanupBackdrops();
  }, [location.pathname]);

  const closeMobileSidebar = () => {
    const el = document.getElementById("pmsSidebar");
    if (!el) return;

    const instance = Offcanvas.getInstance(el);

    if (instance) {
      el.addEventListener("hidden.bs.offcanvas", cleanupBackdrops, {
        once: true,
      });
      instance.hide();
    } else {
      cleanupBackdrops();
    }
  };

  const handleLogout = () => {
    closeMobileSidebar();
    logout();
  };

  const openRenameModal = () => {
    setRenameError("");
    setShowRenameModal(true);
  };

  const closeRenameModal = () => {
    if (renameLoading) return;
    setRenameError("");
    setShowRenameModal(false);
  };

  const persistWorkspaceName = (updatedName) => {
    const storedUser = authStorage.getUser();

    if (storedUser) {
      authStorage.setUser({
        ...storedUser,
        workspaceName: updatedName,
        workspace: {
          ...(storedUser.workspace || {}),
          name: updatedName,
        },
      });
    }

    const storedWorkspace = authStorage.getWorkspace();

    if (storedWorkspace) {
      authStorage.setWorkspace({
        ...storedWorkspace,
        name: updatedName,
      });
    }
  };

  const handleSaveWorkspaceName = async (newName) => {
    const trimmedName = String(newName || "").trim();

    if (!trimmedName) {
      setRenameError("اسم المحل مطلوب");
      return;
    }

    if (trimmedName.length < 2) {
      setRenameError("اسم المحل لازم يكون حرفين على الأقل");
      return;
    }

    if (trimmedName.length > 60) {
      setRenameError("اسم المحل لازم يكون 60 حرف بحد أقصى");
      return;
    }

    if (trimmedName === String(workspaceName || "").trim()) {
      setShowRenameModal(false);
      return;
    }

    setRenameLoading(true);
    setRenameError("");

    try {
      const workspace = await updateWorkspaceNameApi(trimmedName);
      const updatedName = workspace?.name || trimmedName;

      setWorkspaceName(updatedName);
      persistWorkspaceName(updatedName);
      setShowRenameModal(false);
    } catch (error) {
      setRenameError(error.userMessage || error.message || "تعذر تحديث اسم المحل");
    } finally {
      setRenameLoading(false);
    }
  };

  const openRenameModalFromSidebar = () => {
    const el = document.getElementById("pmsSidebar");
    if (!el) {
      openRenameModal();
      return;
    }

    const instance = Offcanvas.getInstance(el);

    if (!instance) {
      cleanupBackdrops();
      openRenameModal();
      return;
    }

    el.addEventListener(
      "hidden.bs.offcanvas",
      () => {
        cleanupBackdrops();
        openRenameModal();
      },
      { once: true }
    );

    instance.hide();
  };

  return (
    <div className="auth-bg-dark min-vh-100 d-flex flex-column" dir="rtl" data-bs-theme="dark">
      <header className="d-lg-none py-2">
        <div className="container d-flex align-items-center justify-content-between">
          <button
            className="btn btn-outline-secondary"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#pmsSidebar"
            aria-controls="pmsSidebar"
          >
            <FiMenu className="ms-1" aria-hidden="true" />
            القائمة
          </button>

          <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
            <div className="fw-bold text-white text-truncate">{workspaceName}</div>
            {canRenameWorkspace ? <WorkspaceEditButton onClick={openRenameModal} /> : null}
          </div>

          <button className="btn btn-outline-danger" onClick={handleLogout}>
            <FiLogOut className="ms-1" aria-hidden="true" />
            خروج
          </button>
        </div>
      </header>

      <div className="flex-grow-1">
        <div className="container-fluid py-3">
          <div className="row g-3">
            <aside className="col-lg-3 col-xl-2 d-none d-lg-block">
              <div className="glass-card position-relative p-3" style={{ minHeight: "calc(100vh - 24px)" }}>
                <div className="glass-inner">
                  <div className="mb-3">
                    <div className="d-flex align-items-center justify-content-between gap-2">
                      <div className="fw-bold fs-5 text-white text-truncate">{workspaceName}</div>
                      {canRenameWorkspace ? <WorkspaceEditButton onClick={openRenameModal} /> : null}
                    </div>

                    <div className="small text-white" style={{ opacity: 0.85 }}>
                      {user?.name || "مستخدم"} • {roleLabel}
                    </div>
                  </div>

                  <nav className="nav nav-pills flex-column gap-2">
                    {menu.map((m) => (
                      <NavLink
                        key={m.to}
                        to={m.to}
                        end={Boolean(m.end)}
                        className={linkClass}
                      >
                        <span className="app-nav-link-icon" aria-hidden="true">{m.icon}</span>
                        <span>{m.label}</span>
                      </NavLink>
                    ))}
                  </nav>

                  <div className="mt-3">
                    <button className="btn btn-outline-danger w-100" onClick={handleLogout}>
                      <FiLogOut className="ms-1" aria-hidden="true" />
                      تسجيل الخروج
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            <div
              className="offcanvas offcanvas-end d-lg-none"
              tabIndex="-1"
              id="pmsSidebar"
              aria-labelledby="pmsSidebarLabel"
            >
              <div className="offcanvas-header d-flex flex-row-reverse align-items-start justify-content-between gap-3">
                <div style={{ minWidth: 0, flexGrow: 1 }}>
                  <div className="d-flex align-items-center gap-2">
                    <div className="fw-bold text-white text-truncate" id="pmsSidebarLabel">
                      {workspaceName}
                    </div>

                    {canRenameWorkspace ? (
                      <WorkspaceEditButton
                        className="flex-shrink-0"
                        onClick={openRenameModalFromSidebar}
                      />
                    ) : null}
                  </div>

                  <div className="small text-white" style={{ opacity: 0.85 }}>
                    {user?.name || "مستخدم"} • {roleLabel}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-close btn-close-white flex-shrink-0 ms-2"
                  data-bs-dismiss="offcanvas"
                  aria-label="Close"
                />
              </div>

              <div className="offcanvas-body">
                <nav className="nav nav-pills flex-column gap-2">
                  {menu.map((m) => (
                    <NavLink
                      key={m.to}
                      to={m.to}
                      end={Boolean(m.end)}
                      className={linkClass}
                      onClick={closeMobileSidebar}
                    >
                      <span className="app-nav-link-icon" aria-hidden="true">{m.icon}</span>
                      <span>{m.label}</span>
                    </NavLink>
                  ))}
                </nav>

                <div className="mt-3">
                  <button className="btn btn-outline-danger w-100" onClick={handleLogout}>
                    <FiLogOut className="ms-1" aria-hidden="true" />
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            </div>

            <main className="col-12 col-lg-9 col-xl-10">
              <div className="glass-card position-relative p-3 p-md-4">
                <div className="glass-inner">
                  <Outlet />
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      <AppFooter version="v1.0.0" />

      <EditWorkspaceNameModal
        show={showRenameModal}
        currentName={workspaceName}
        loading={renameLoading}
        error={renameError}
        onClose={closeRenameModal}
        onSave={handleSaveWorkspaceName}
      />
    </div>
  );
}