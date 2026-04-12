import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { purchasesApi } from "../api/purchasesApi";

function formatNumber(n) {
  return new Intl.NumberFormat("ar-EG").format(Number(n || 0));
}

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(dt);
}

function statusLabel(status) {
  if (status === "draft") return "مسودة";
  if (status === "finalized") return "معتمدة";
  if (status === "cancelled") return "ملغية";
  return status || "—";
}

function statusBadge(status) {
  if (status === "draft") return "text-bg-warning";
  if (status === "finalized") return "text-bg-success";
  if (status === "cancelled") return "text-bg-danger";
  return "text-bg-secondary";
}

const initialFilters = {
  status: "",
  search: "",
  invoiceCode: "",
  supplierName: "",
  supplierId: "",
  createdByName: "",
  from: "",
  to: "",
  days: "",
  minTotalAmount: "",
  maxTotalAmount: "",
  page: 1,
  limit: 20,
};

export default function PurchaseInvoicesPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });

  const load = useCallback(async (nextFilters = initialFilters) => {
    setLoading(true);
    setError("");

    try {
      const params = {
        status: nextFilters.status || undefined,
        search: nextFilters.search || undefined,
        invoiceCode: nextFilters.invoiceCode || undefined,
        supplierName: nextFilters.supplierName || undefined,
        supplierId: nextFilters.supplierId || undefined,
        createdByName: nextFilters.createdByName || undefined,
        from: nextFilters.from || undefined,
        to: nextFilters.to || undefined,
        days: nextFilters.days || undefined,
        minTotalAmount: nextFilters.minTotalAmount || undefined,
        maxTotalAmount: nextFilters.maxTotalAmount || undefined,
        page: nextFilters.page,
        limit: nextFilters.limit,
      };

      const data = await purchasesApi.list(params);

      setItems(Array.isArray(data?.invoices) ? data.invoices : []);
      setPagination(
        data?.pagination || {
          page: nextFilters.page || 1,
          limit: nextFilters.limit || 20,
          total: 0,
        }
      );
    } catch (e) {
      setError(e.userMessage || "فشل تحميل فواتير الشراء");
      setItems([]);
      setPagination({
        page: 1,
        limit: Number(filters.limit || 20),
        total: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [filters.limit]);

  useEffect(() => {
    load(initialFilters);
  }, [load]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(Number(pagination.total || 0) / Number(pagination.limit || 20)));
  }, [pagination]);

  const currentPage = Math.max(1, Number(pagination.page || 1));
  const totalItems = Math.max(0, Number(pagination.total || 0));
  const currentLimit = Math.max(1, Number(pagination.limit || 20));

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * currentLimit + 1;
  const endItem = totalItems === 0 ? 0 : Math.min(currentPage * currentLimit, totalItems);

  const visiblePages = useMemo(() => {
    const pages = [];
    const maxVisible = 5;

    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }

    return pages;
  }, [currentPage, totalPages]);

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
    await load(next);
  };

  const onReset = async () => {
    setFilters(initialFilters);
    await load(initialFilters);
  };

  const goToPage = async (page) => {
    const nextPage = Number(page);
    if (!Number.isFinite(nextPage)) return;
    if (nextPage < 1 || nextPage > totalPages) return;
    if (nextPage === currentPage) return;

    const next = { ...filters, page: nextPage };
    setFilters(next);
    await load(next);
  };

  const changeLimit = async (limit) => {
    const nextLimit = Number(limit);
    if (!Number.isFinite(nextLimit) || nextLimit <= 0) return;

    const next = { ...filters, page: 1, limit: nextLimit };
    setFilters(next);
    await load(next);
  };

  return (
    <div className="container-fluid">
      <div className="d-md-none mb-3">
        <div className="mb-2">
          <h3 className="m-0 text-white">فواتير الشراء</h3>
          <div className="text-white small">الإجمالي: {formatNumber(pagination.total)}</div>
        </div>

        <div className="d-grid gap-2">
          <button className="btn btn-primary" onClick={() => navigate("/purchases/new")}>
            إنشاء فاتورة شراء
          </button>
          <button className="btn btn-outline-secondary" onClick={() => load(filters)} disabled={loading}>
            تحديث
          </button>
        </div>
      </div>

      <div className="d-none d-md-flex flex-row-reverse justify-content-between align-items-center mb-3">
        <div>
          <h3 className="m-0 text-white">فواتير الشراء</h3>
          <div className="text-white small">الإجمالي: {formatNumber(pagination.total)}</div>
        </div>

        <div className="d-flex flex-row-reverse gap-2">
          <button className="btn btn-primary" onClick={() => navigate("/purchases/new")}>
            إنشاء فاتورة شراء
          </button>
          <button className="btn btn-outline-secondary" onClick={() => load(filters)} disabled={loading}>
            تحديث
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <form className="card mb-3" onSubmit={onSearch}>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-12 col-md-2">
              <label className="form-label">الحالة</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => updateFilter("status", e.target.value)}
              >
                <option value="">الكل</option>
                <option value="draft">مسودة</option>
                <option value="finalized">معتمدة</option>
                <option value="cancelled">ملغية</option>
              </select>
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">بحث عام</label>
              <input
                className="form-control"
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                placeholder="كود الفاتورة / المورد / الملاحظات"
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">كود الفاتورة</label>
              <input
                className="form-control"
                value={filters.invoiceCode}
                onChange={(e) => updateFilter("invoiceCode", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">اسم المورد</label>
              <input
                className="form-control"
                value={filters.supplierName}
                onChange={(e) => updateFilter("supplierName", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">معرّف المورد</label>
              <input
                className="form-control"
                value={filters.supplierId}
                onChange={(e) => updateFilter("supplierId", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">أُنشئت بواسطة</label>
              <input
                className="form-control"
                value={filters.createdByName}
                onChange={(e) => updateFilter("createdByName", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">من</label>
              <input
                className="form-control"
                type="date"
                value={filters.from}
                onChange={(e) => updateFilter("from", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">إلى</label>
              <input
                className="form-control"
                type="date"
                value={filters.to}
                onChange={(e) => updateFilter("to", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">آخر X يوم</label>
              <input
                className="form-control"
                type="number"
                min={1}
                value={filters.days}
                onChange={(e) => updateFilter("days", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">أقل إجمالي</label>
              <input
                className="form-control"
                type="number"
                min={0}
                step="0.01"
                value={filters.minTotalAmount}
                onChange={(e) => updateFilter("minTotalAmount", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">أعلى إجمالي</label>
              <input
                className="form-control"
                type="number"
                min={0}
                step="0.01"
                value={filters.maxTotalAmount}
                onChange={(e) => updateFilter("maxTotalAmount", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-2">
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

            <div className="col-12 col-md-4 d-flex gap-2 align-items-end flex-row-reverse">
              <button className="btn btn-outline-primary w-100" type="submit" disabled={loading}>
                بحث
              </button>
              <button className="btn btn-outline-secondary w-100" type="button" onClick={onReset} disabled={loading}>
                الكل
              </button>
            </div>
          </div>
        </div>
      </form>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">جاري التحميل...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-4 text-secondary">لا توجد فواتير شراء</div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th className="text-end">كود الفاتورة</th>
                      <th className="text-end">المورد</th>
                      <th className="text-end">الحالة</th>
                      <th className="text-end">إجمالي الكمية</th>
                      <th className="text-end">الإجمالي</th>
                      <th className="text-end">أُنشئت بواسطة</th>
                      <th className="text-end">تاريخ الإنشاء</th>
                      <th className="text-end">تاريخ الاعتماد</th>
                      <th className="text-end">اعتمدت بواسطة</th>
                      <th className="text-end" style={{ width: 1 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((inv) => (
                      <tr
                        key={inv.id}
                        role="button"
                        onClick={() => navigate(`/purchases/${inv.id}`)}
                      >
                        <td className="text-end fw-semibold">{inv.invoiceCode}</td>
                        <td className="text-end">{inv.supplierName}</td>
                        <td className="text-end">
                          <span className={`badge ${statusBadge(inv.status)}`}>
                            {statusLabel(inv.status)}
                          </span>
                        </td>
                        <td className="text-end">{formatNumber(inv.totalItemsQty)}</td>
                        <td className="text-end">{formatNumber(inv.totalAmount)}</td>
                        <td className="text-end">{inv.createdByName}</td>
                        <td className="text-end">{formatDate(inv.createdAt)}</td>
                        <td className="text-end">{formatDate(inv.finalizedAt)}</td>
                        <td className="text-end">{inv.finalizedByName || "—"}</td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/purchases/${inv.id}`);
                            }}
                          >
                            فتح
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-3">
                <div className="small text-secondary">
                  عرض {formatNumber(startItem)} - {formatNumber(endItem)} من {formatNumber(totalItems)}
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

                <nav aria-label="Purchase pagination">
                  <ul className="pagination pagination-sm mb-0 flex-wrap">
                    <li className={`page-item ${currentPage <= 1 ? "disabled" : ""}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage <= 1 || loading}
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
                        className={`page-item ${currentPage === pageNumber ? "active" : ""}`}
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

                    {visiblePages[visiblePages.length - 1] < totalPages && (
                      <>
                        {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                          <li className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                        )}
                        <li className="page-item">
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => goToPage(totalPages)}
                          >
                            {totalPages}
                          </button>
                        </li>
                      </>
                    )}

                    <li className={`page-item ${currentPage >= totalPages ? "disabled" : ""}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= totalPages || loading}
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
    </div>
  );
}