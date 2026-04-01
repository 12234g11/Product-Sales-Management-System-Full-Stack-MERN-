import { useEffect, useMemo, useState, useCallback } from "react";
import { salesApi } from "../api/salesApi";

function formatNumber(n) {
  return new Intl.NumberFormat("ar-EG").format(Number(n || 0));
}

function formatDateTime(d) {
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(d));
  } catch {
    return "";
  }
}

function getSaleId(s) {
  return s?.saleId || s?._id || s?.id;
}

function ConfirmDeleteModal({ show, busy, sale, onClose, onConfirm }) {
  if (!show) return null;

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: "block" }}
        tabIndex="-1"
        aria-modal="true"
        role="dialog"
      >
        <div className="modal-dialog modal-fullscreen-sm-down" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">تأكيد الحذف</h5>
              <button
                className="btn-close ms-0 me-auto"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            <div className="modal-body">
              هل أنت متأكد أنك تريد حذف عملية البيع دي؟
              <div className="mt-2">
                <span className="fw-bold">{sale?.name}</span>{" "}
                <span className="text-secondary">({sale?.id})</span>
              </div>
              <div className="small text-secondary mt-2">
                سيتم إعادة الكمية للمخزون تلقائيًا.
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-outline-secondary"
                onClick={onClose}
                disabled={busy}
              >
                إلغاء
              </button>
              <button
                className="btn btn-danger"
                onClick={onConfirm}
                disabled={busy}
              >
                {busy ? "جاري الحذف..." : "حذف"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

export default function SalesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [view, setView] = useState(
    () => localStorage.getItem("pms_sales_view") || "today"
  );
  const [lastSearchParams, setLastSearchParams] = useState(null);

  const [filters, setFilters] = useState({
    id: "",
    name: "",
    category: "",
    date: "",
    startDate: "",
    endDate: "",
  });

  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await salesApi.getAll();
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      setErr(e.userMessage || "فشل تحميل المبيعات");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadToday = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await salesApi.getToday();
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      setErr(e.userMessage || "فشل تحميل مبيعات اليوم");
    } finally {
      setLoading(false);
    }
  }, []);

  const runSearch = useCallback(async (params) => {
    setLoading(true);
    setErr("");
    try {
      const res = await salesApi.search(params);
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      setErr(e.userMessage || "فشل البحث");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "all") loadAll();
    else loadToday();
  }, [view, loadAll, loadToday]);

  const setViewPersist = (nextView) => {
    localStorage.setItem("pms_sales_view", nextView);
    setView(nextView);
  };

  const onTodayClick = () => {
    setLastSearchParams(null);
    setViewPersist("today");
  };

  const onAllClick = () => {
    setLastSearchParams(null);
    setViewPersist("all");
  };

  const onSearch = async (e) => {
    e.preventDefault();

    const params = {
      id: filters.id || undefined,
      name: filters.name || undefined,
      category: filters.category || undefined,
      date: filters.date || undefined,
      startDate: filters.date ? undefined : filters.startDate || undefined,
      endDate: filters.date ? undefined : filters.endDate || undefined,
    };

    setView("search");
    setLastSearchParams(params);
    await runSearch(params);
  };

  const openDelete = (sale) => {
    setDeleting(sale);
    setShowDelete(true);
  };

  const refreshCurrentView = async () => {
    if (view === "all") return loadAll();
    if (view === "today") return loadToday();
    if (view === "search" && lastSearchParams) return runSearch(lastSearchParams);
    return loadToday();
  };

  const confirmDelete = async () => {
    const saleId = getSaleId(deleting);
    if (!saleId) {
      setErr("لا يمكن حذف هذه العملية (saleId غير موجود في الرد)");
      setShowDelete(false);
      return;
    }

    setBusy(true);
    setErr("");
    try {
      await salesApi.remove(saleId);
      await refreshCurrentView();
      setShowDelete(false);
    } catch (e) {
      setErr(e.userMessage || "فشل الحذف");
    } finally {
      setBusy(false);
    }
  };

  const totalRevenue = useMemo(
    () => items.reduce((sum, s) => sum + Number(s.totalPrice || 0), 0),
    [items]
  );

  return (
    <div className="container-fluid">
      <div className="d-md-none mb-3">
        <div className="mb-2">
          <h3 className="m-0 text-white">المبيعات</h3>
          <div className="text-white mt-2 small">
            عدد العمليات: {formatNumber(items.length)} • الإجمالي: {formatNumber(totalRevenue)}
          </div>
        </div>

        <div className="row g-2">
          <div className="col-6">
            <button
              className={`btn w-100 ${
                view === "today" ? "btn-primary" : "btn-outline-primary"
              }`}
              onClick={onTodayClick}
              disabled={loading}
            >
              اليوم
            </button>
          </div>

          <div className="col-6">
            <button
              className={`btn w-100 ${
                view === "all" ? "btn-secondary" : "btn-outline-secondary"
              }`}
              onClick={onAllClick}
              disabled={loading}
            >
              كل المبيعات
            </button>
          </div>
        </div>
      </div>

      <div className="d-none d-md-flex flex-row-reverse justify-content-between align-items-center mb-3">
        <div>
          <h3 className="m-0 text-white">المبيعات</h3>
          <div className="text-white mt-2 small">
            عدد العمليات: {formatNumber(items.length)} • الإجمالي:{" "}
            {formatNumber(totalRevenue)}
          </div>
        </div>

        <div className="d-flex flex-row-reverse gap-2">
          <button
            className={`btn ${view === "today" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={onTodayClick}
            disabled={loading}
          >
            اليوم
          </button>

          <button
            className={`btn ${view === "all" ? "btn-secondary" : "btn-outline-secondary"}`}
            onClick={onAllClick}
            disabled={loading}
          >
            كل المبيعات
          </button>
        </div>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}
      <form className="card mb-3 d-md-none" onSubmit={onSearch}>
        <div className="card-body">
          <div className="d-grid gap-2">
            <div>
              <label className="form-label">كود المنتج</label>
              <input
                className="form-control"
                value={filters.id}
                onChange={(e) => setFilters((f) => ({ ...f, id: e.target.value }))}
              />
            </div>

            <div>
              <label className="form-label">اسم المنتج</label>
              <input
                className="form-control"
                value={filters.name}
                onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="form-label">الفئة</label>
              <input
                className="form-control"
                value={filters.category}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              />
            </div>

            <div>
              <label className="form-label">تاريخ (يوم واحد)</label>
              <input
                className="form-control"
                type="date"
                value={filters.date}
                onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
              />
            </div>

            <div className="row g-2">
              <div className="col-6">
                <label className="form-label">من</label>
                <input
                  className="form-control"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, startDate: e.target.value }))
                  }
                  disabled={Boolean(filters.date)}
                />
              </div>

              <div className="col-6">
                <label className="form-label">إلى</label>
                <input
                  className="form-control"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, endDate: e.target.value }))
                  }
                  disabled={Boolean(filters.date)}
                />
              </div>
            </div>

            <div className="row g-2">
              <div className="col-6">
                <button className="btn btn-outline-primary w-100" disabled={loading}>
                  بحث
                </button>
              </div>
              <div className="col-6">
                <button
                  type="button"
                  className="btn btn-outline-secondary w-100"
                  disabled={loading}
                  onClick={() => {
                    setFilters({ id: "", name: "", category: "", date: "", startDate: "", endDate: "" });
                    onTodayClick();
                  }}
                >
                  مسح
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
      <form className="card mb-3 d-none d-md-block" onSubmit={onSearch}>
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-3">
              <label className="form-label">كود المنتج</label>
              <input
                className="form-control"
                value={filters.id}
                onChange={(e) => setFilters((f) => ({ ...f, id: e.target.value }))}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">اسم المنتج</label>
              <input
                className="form-control"
                value={filters.name}
                onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">الفئة</label>
              <input
                className="form-control"
                value={filters.category}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              />
            </div>

            <div className="col-12 col-md-3">
              <div className="row g-2">
                <div className="col-6 col-md-6">
                  <button className="btn btn-outline-primary w-100" disabled={loading}>
                    بحث
                  </button>
                </div>
                <div className="col-6 col-md-6">
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-100"
                    disabled={loading}
                    onClick={() => {
                      setFilters({ id: "", name: "", category: "", date: "", startDate: "", endDate: "" });
                      onTodayClick();
                    }}
                  >
                    مسح
                  </button>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">تاريخ (يوم واحد)</label>
              <input
                className="form-control"
                type="date"
                value={filters.date}
                onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">من</label>
              <input
                className="form-control"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                disabled={Boolean(filters.date)}
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">إلى</label>
              <input
                className="form-control"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                disabled={Boolean(filters.date)}
              />
            </div>
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">جاري التحميل...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-4 text-secondary">لا توجد بيانات</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th className="text-end">المنتج</th>
                    <th className="text-end">الكمية</th>
                    <th className="text-end">سعر البيع</th>
                    <th className="text-end">الإجمالي</th>
                    <th className="text-end">التاريخ</th>
                    <th className="text-end">إجراءات</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((s, idx) => (
                    <tr key={(getSaleId(s) || idx) + ""}>
                      <td className="text-end">
                        <div className="fw-semibold">{s.name}</div>
                        <div className="small text-secondary">{s.id}</div>
                      </td>

                      <td className="text-end">{formatNumber(s.quantity)}</td>
                      <td className="text-end">{formatNumber(s.salePrice)}</td>
                      <td className="text-end fw-semibold">{formatNumber(s.totalPrice)}</td>
                      <td className="text-end small text-secondary">{formatDateTime(s.createdAt)}</td>

                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-danger w-100 w-md-auto"
                          onClick={() => openDelete(s)}
                          disabled={busy || !getSaleId(s)}
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmDeleteModal
        show={showDelete}
        busy={busy}
        sale={deleting}
        onClose={() => setShowDelete(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
