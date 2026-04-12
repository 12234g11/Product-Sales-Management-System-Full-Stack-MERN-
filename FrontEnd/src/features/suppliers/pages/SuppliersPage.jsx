import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { suppliersApi } from "../api/suppliersApi";

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(dt);
}

function formatNumber(n) {
  return new Intl.NumberFormat("ar-EG").format(Number(n || 0));
}

function statusBadge(isActive) {
  return isActive ? "text-bg-success" : "text-bg-secondary";
}

function statusLabel(isActive) {
  return isActive ? "نشط" : "مؤرشف";
}

function SupplierFormModal({ show, busy, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    notes: "",
    isActive: true,
  });

  useEffect(() => {
    if (!show) return;
    setForm({
      name: "",
      phone: "",
      address: "",
      notes: "",
      isActive: true,
    });
  }, [show]);

  const submit = async (e) => {
    e.preventDefault();

    await onSubmit({
      name: String(form.name || "").trim(),
      phone: String(form.phone || "").trim(),
      address: String(form.address || "").trim(),
      notes: String(form.notes || "").trim(),
      isActive: Boolean(form.isActive),
    });
  };

  if (!show) return null;

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: "block" }}
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-dialog modal-fullscreen-sm-down modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">إضافة مورد جديد</h5>
              <button
                type="button"
                className="btn-close ms-0 me-auto"
                onClick={onClose}
                aria-label="Close"
                disabled={busy}
              />
            </div>

            <form onSubmit={submit}>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">اسم المورد</label>
                    <input
                      className="form-control"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">رقم الهاتف</label>
                    <input
                      className="form-control"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">العنوان</label>
                    <input
                      className="form-control"
                      value={form.address}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">ملاحظات</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>

                  <div className="col-12">
                    <div className="form-check">
                      <input
                        id="supplier-is-active-create"
                        className="form-check-input"
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, isActive: e.target.checked }))
                        }
                      />
                      <label htmlFor="supplier-is-active-create" className="form-check-label">
                        المورد نشط
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={busy}
                >
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? "جاري الحفظ..." : "حفظ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="modal-backdrop fade show" onClick={busy ? undefined : onClose} />
    </>
  );
}

const initialFilters = {
  search: "",
  name: "",
  phone: "",
  address: "",
  isActive: "",
  page: 1,
  limit: 20,
};

export default function SuppliersPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [filters, setFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });

  const loadSuppliers = useCallback(async (nextFilters = initialFilters) => {
    setLoading(true);
    setError("");

    try {
      const params = {
        search: nextFilters.search || undefined,
        name: nextFilters.name || undefined,
        phone: nextFilters.phone || undefined,
        address: nextFilters.address || undefined,
        isActive: nextFilters.isActive || undefined,
        page: nextFilters.page,
        limit: nextFilters.limit,
      };

      const data = await suppliersApi.list(params);
      setItems(Array.isArray(data?.suppliers) ? data.suppliers : []);
      setPagination(
        data?.pagination || {
          page: nextFilters.page || 1,
          limit: nextFilters.limit || 20,
          total: 0,
        }
      );
    } catch (e) {
      setError(e.userMessage || "فشل تحميل الموردين");
      setItems([]);
      setPagination({
        page: 1,
        limit: Number(nextFilters.limit || 20),
        total: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers(initialFilters);
  }, [loadSuppliers]);

  const summary = useMemo(() => {
    const active = items.filter((x) => x.isActive).length;
    const archived = items.filter((x) => !x.isActive).length;
    return {
      active,
      archived,
      total: Number(pagination.total || 0),
    };
  }, [items, pagination.total]);

  const paging = useMemo(() => {
    const total = Math.max(0, Number(pagination.total || 0));
    const page = Math.max(1, Number(pagination.page || 1));
    const limit = Math.max(1, Number(pagination.limit || filters.limit || 20));
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const startItem = total === 0 ? 0 : (safePage - 1) * limit + 1;
    const endItem = total === 0 ? 0 : Math.min(safePage * limit, total);

    return {
      total,
      page: safePage,
      limit,
      totalPages,
      startItem,
      endItem,
    };
  }, [pagination, filters.limit]);

  const visiblePages = useMemo(() => {
    const pages = [];
    const maxVisible = 5;

    let start = Math.max(1, paging.page - 2);
    let end = Math.min(paging.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }

    return pages;
  }, [paging.page, paging.totalPages]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const onSearch = async (e) => {
    e.preventDefault();
    const next = { ...filters, page: 1 };
    setFilters(next);
    await loadSuppliers(next);
  };

  const onReset = async () => {
    setFilters(initialFilters);
    await loadSuppliers(initialFilters);
  };

  const goToPage = async (page) => {
    const nextPage = Number(page);
    if (!Number.isFinite(nextPage)) return;
    if (nextPage < 1 || nextPage > paging.totalPages) return;
    if (nextPage === paging.page) return;

    const next = { ...filters, page: nextPage };
    setFilters(next);
    await loadSuppliers(next);
  };

  const changeLimit = async (limit) => {
    const nextLimit = Number(limit);
    if (!Number.isFinite(nextLimit) || nextLimit <= 0) return;

    const next = { ...filters, page: 1, limit: nextLimit };
    setFilters(next);
    await loadSuppliers(next);
  };

  const createSupplier = async (payload) => {
    setBusy(true);
    setError("");

    try {
      await suppliersApi.create(payload);
      setShowCreate(false);

      const next = { ...filters, page: 1 };
      setFilters(next);
      await loadSuppliers(next);
    } catch (e) {
      setError(e.userMessage || "فشل إضافة المورد");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const toggleArchive = async (supplier) => {
    const actionText = supplier.isActive ? "أرشفة" : "استرجاع";
    const ok = window.confirm(`هل أنت متأكد من ${actionText} المورد؟`);
    if (!ok) return;

    setBusy(true);
    setError("");

    try {
      if (supplier.isActive) {
        await suppliersApi.archive(supplier.id);
      } else {
        await suppliersApi.restore(supplier.id);
      }
      await loadSuppliers(filters);
    } catch (e) {
      setError(e.userMessage || `فشل ${actionText} المورد`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-md-none mb-3">
        <div className="mb-2">
          <h3 className="m-0 text-white">الموردين</h3>
          <div className="text-white small">
            الإجمالي: {formatNumber(summary.total)} • نشط: {formatNumber(summary.active)} •
            مؤرشف: {formatNumber(summary.archived)}
          </div>
        </div>

        <div className="d-grid gap-2">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            إضافة مورد
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => loadSuppliers(filters)}
            disabled={loading}
          >
            تحديث
          </button>
        </div>
      </div>

      <div className="d-none d-md-flex flex-row-reverse justify-content-between align-items-center mb-3">
        <div>
          <h3 className="m-0 text-white">الموردين</h3>
          <div className="text-white small">
            الإجمالي: {formatNumber(summary.total)} • نشط: {formatNumber(summary.active)} •
            مؤرشف: {formatNumber(summary.archived)}
          </div>
        </div>

        <div className="d-flex flex-row-reverse gap-2">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            إضافة مورد
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => loadSuppliers(filters)}
            disabled={loading}
          >
            تحديث
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <form className="card mb-3 d-md-none" onSubmit={onSearch}>
        <div className="card-body">
          <div className="d-grid gap-2">
            <div>
              <label className="form-label">بحث عام</label>
              <input
                className="form-control"
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                placeholder="اسم / رقم / عنوان"
              />
            </div>

            <div>
              <label className="form-label">الاسم</label>
              <input
                className="form-control"
                value={filters.name}
                onChange={(e) => updateFilter("name", e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">رقم الهاتف</label>
              <input
                className="form-control"
                value={filters.phone}
                onChange={(e) => updateFilter("phone", e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">العنوان</label>
              <input
                className="form-control"
                value={filters.address}
                onChange={(e) => updateFilter("address", e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">الحالة</label>
              <select
                className="form-select"
                value={filters.isActive}
                onChange={(e) => updateFilter("isActive", e.target.value)}
              >
                <option value="">الكل</option>
                <option value="true">نشط</option>
                <option value="false">مؤرشف</option>
              </select>
            </div>

            <div>
              <label className="form-label">عدد العناصر</label>
              <select
                className="form-select"
                value={filters.limit}
                onChange={(e) => changeLimit(e.target.value)}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="row g-2">
              <div className="col-6">
                <button
                  className="btn btn-outline-primary w-100"
                  type="submit"
                  disabled={loading}
                >
                  بحث
                </button>
              </div>
              <div className="col-6">
                <button
                  className="btn btn-outline-secondary w-100"
                  type="button"
                  onClick={onReset}
                  disabled={loading}
                >
                  الكل
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      <form className="card mb-3 d-none d-md-block" onSubmit={onSearch}>
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-2">
              <label className="form-label">بحث عام</label>
              <input
                className="form-control"
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                placeholder="اسم / رقم / عنوان"
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">الاسم</label>
              <input
                className="form-control"
                value={filters.name}
                onChange={(e) => updateFilter("name", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">رقم الهاتف</label>
              <input
                className="form-control"
                value={filters.phone}
                onChange={(e) => updateFilter("phone", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">العنوان</label>
              <input
                className="form-control"
                value={filters.address}
                onChange={(e) => updateFilter("address", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-1">
              <label className="form-label">الحالة</label>
              <select
                className="form-select"
                value={filters.isActive}
                onChange={(e) => updateFilter("isActive", e.target.value)}
              >
                <option value="">الكل</option>
                <option value="true">نشط</option>
                <option value="false">مؤرشف</option>
              </select>
            </div>

            <div className="col-12 col-md-1">
              <label className="form-label">عدد</label>
              <select
                className="form-select"
                value={filters.limit}
                onChange={(e) => changeLimit(e.target.value)}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="col-12 col-md-2">
              <div className="d-flex gap-2 flex-row-reverse">
                <button
                  className="btn btn-outline-primary w-100"
                  type="submit"
                  disabled={loading}
                >
                  بحث
                </button>
                <button
                  className="btn btn-outline-secondary w-100"
                  type="button"
                  onClick={onReset}
                  disabled={loading}
                >
                  الكل
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">جاري التحميل...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-4 text-secondary">لا توجد موردين</div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th className="text-end">الاسم</th>
                      <th className="text-end">رقم الهاتف</th>
                      <th className="text-end">العنوان</th>
                      <th className="text-end">الحالة</th>
                      <th className="text-end">أضيف بواسطة</th>
                      <th className="text-end">تاريخ الإضافة</th>
                      <th className="text-end" style={{ width: 1 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((s) => (
                      <tr
                        key={s.id}
                        role="button"
                        onClick={() => navigate(`/suppliers/${s.id}`)}
                      >
                        <td className="text-end fw-semibold">{s.name}</td>
                        <td className="text-end">{s.phone || "—"}</td>
                        <td className="text-end">{s.address || "—"}</td>
                        <td className="text-end">
                          <span className={`badge ${statusBadge(s.isActive)}`}>
                            {statusLabel(s.isActive)}
                          </span>
                        </td>
                        <td className="text-end">{s.createdByName || "—"}</td>
                        <td className="text-end">{formatDate(s.createdAt)}</td>
                        <td className="text-end">
                          <div className="d-flex gap-2 justify-content-end flex-wrap flex-md-nowrap">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/suppliers/${s.id}`);
                              }}
                              disabled={busy}
                            >
                              فتح
                            </button>

                            <button
                              className={`btn btn-sm ${
                                s.isActive ? "btn-outline-danger" : "btn-outline-success"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleArchive(s);
                              }}
                              disabled={busy}
                            >
                              {s.isActive ? "أرشفة" : "استرجاع"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-3">
                <div className="small text-secondary">
                  عرض {formatNumber(paging.startItem)} - {formatNumber(paging.endItem)} من{" "}
                  {formatNumber(paging.total)}
                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <label className="small text-secondary mb-0">عدد العناصر</label>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 90 }}
                    value={filters.limit}
                    onChange={(e) => changeLimit(e.target.value)}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <nav aria-label="Suppliers pagination">
                  <ul className="pagination pagination-sm mb-0 flex-wrap">
                    <li className={`page-item ${paging.page <= 1 ? "disabled" : ""}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => goToPage(paging.page - 1)}
                        disabled={paging.page <= 1 || loading}
                      >
                        السابق
                      </button>
                    </li>

                    {visiblePages[0] > 1 && (
                      <>
                        <li className="page-item">
                          <button type="button" className="page-link" onClick={() => goToPage(1)}>
                            1
                          </button>
                        </li>
                        {visiblePages[0] > 2 && (
                          <li className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                        )}
                      </>
                    )}

                    {visiblePages.map((pageNumber) => (
                      <li
                        key={pageNumber}
                        className={`page-item ${paging.page === pageNumber ? "active" : ""}`}
                      >
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => goToPage(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      </li>
                    ))}

                    {visiblePages[visiblePages.length - 1] < paging.totalPages && (
                      <>
                        {visiblePages[visiblePages.length - 1] < paging.totalPages - 1 && (
                          <li className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                        )}
                        <li className="page-item">
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => goToPage(paging.totalPages)}
                          >
                            {paging.totalPages}
                          </button>
                        </li>
                      </>
                    )}

                    <li className={`page-item ${paging.page >= paging.totalPages ? "disabled" : ""}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => goToPage(paging.page + 1)}
                        disabled={paging.page >= paging.totalPages || loading}
                      >
                        التالي
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </>
          )}
        </div>
      </div>

      <SupplierFormModal
        show={showCreate}
        busy={busy}
        onClose={() => setShowCreate(false)}
        onSubmit={createSupplier}
      />
    </div>
  );
}