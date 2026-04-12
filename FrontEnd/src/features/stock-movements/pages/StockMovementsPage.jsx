import { useCallback, useEffect, useMemo, useState } from "react";
import { stockMovementsApi } from "../api/stockMovementsApi";
import {
  categoryLabel,
  formatDateTime,
  formatNumber,
  movementDirectionBadge,
  movementDirectionLabel,
  movementTypeBadge,
  movementTypeLabel,
  normalizeApiError,
  reasonLabel,
  referenceTypeLabel,
} from "../utils/stockMovementFormatters";

const initialFilters = {
  q: "",
  type: "",
  direction: "",
  productId: "",
  refType: "",
  refCode: "",
  performedByName: "",
  reason: "",
  from: "",
  to: "",
  page: 1,
  limit: 20,
};

export default function StockMovementsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState({
    movements: [],
    pagination: { total: 0, page: 1, limit: 20 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadMovements = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await stockMovementsApi.list(filters);

      setData({
        movements: Array.isArray(res?.movements) ? res.movements : [],
        pagination: res?.pagination || { total: 0, page: 1, limit: 20 },
      });
    } catch (err) {
      setError(normalizeApiError(err, "فشل تحميل حركة المخزون"));
      setData({
        movements: [],
        pagination: { total: 0, page: 1, limit: Number(filters.limit || 20) },
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const totals = useMemo(() => {
    const rows = data.movements || [];

    return {
      count: rows.length,
      qtyIn: rows
        .filter((x) => Number(x.qtyDelta || 0) > 0)
        .reduce((sum, x) => sum + Number(x.qtyDelta || 0), 0),
      qtyOut: rows
        .filter((x) => Number(x.qtyDelta || 0) < 0)
        .reduce((sum, x) => sum + Math.abs(Number(x.qtyDelta || 0)), 0),
    };
  }, [data.movements]);

  const pagination = useMemo(() => {
    const raw = data?.pagination || {};
    const total = Math.max(0, Number(raw.total) || 0);
    const page = Math.max(1, Number(raw.page) || 1);
    const limit = Math.max(1, Number(raw.limit) || Number(filters.limit) || 20);
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
  }, [data.pagination, filters.limit]);

  const visiblePages = useMemo(() => {
    const pages = [];
    const maxVisible = 5;

    let start = Math.max(1, pagination.page - 2);
    let end = Math.min(pagination.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }

    return pages;
  }, [pagination.page, pagination.totalPages]);

  const setField = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
  };

  const setPage = (page) => {
    const nextPage = Number(page);
    if (!Number.isFinite(nextPage)) return;
    if (nextPage < 1 || nextPage > pagination.totalPages) return;
    if (nextPage === pagination.page) return;

    setFilters((prev) => ({ ...prev, page: nextPage }));
  };

  const setLimit = (limit) => {
    const nextLimit = Number(limit);
    if (!Number.isFinite(nextLimit) || nextLimit <= 0) return;

    setFilters((prev) => ({
      ...prev,
      limit: nextLimit,
      page: 1,
    }));
  };

  const resetFilters = () => setFilters(initialFilters);

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h3 className="m-0 text-white">حركة المخزون</h3>
          <div className="text-white mt-2 small">
            عدد السجلات في الصفحة: {formatNumber(totals.count)} •
            وارد الصفحة: {formatNumber(totals.qtyIn)} •
            صادر الصفحة: {formatNumber(totals.qtyOut)}
          </div>
          <div className="text-white small">
            إجمالي النتائج: {formatNumber(pagination.total)}
          </div>
        </div>

        <button className="btn btn-outline-secondary" onClick={loadMovements} disabled={loading}>
          تحديث
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-12 col-md-3">
              <label className="form-label">بحث</label>
              <input
                className="form-control"
                value={filters.q}
                onChange={(e) => setField("q", e.target.value)}
                placeholder="كود الصنف / الاسم / المرجع / السبب / الملاحظة"
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">نوع الحركة</label>
              <select
                className="form-select"
                value={filters.type}
                onChange={(e) => setField("type", e.target.value)}
              >
                <option value="">الكل</option>
                <option value="purchase">شراء</option>
                <option value="sale">بيع</option>
                <option value="sale_return">مرتجع بيع</option>
                <option value="adjustment">تسوية</option>
              </select>
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">الاتجاه</label>
              <select
                className="form-select"
                value={filters.direction}
                onChange={(e) => setField("direction", e.target.value)}
              >
                <option value="">الكل</option>
                <option value="in">داخل</option>
                <option value="out">خارج</option>
              </select>
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">كود الصنف</label>
              <input
                className="form-control"
                value={filters.productId}
                onChange={(e) => setField("productId", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">نوع المرجع</label>
              <select
                className="form-select"
                value={filters.refType}
                onChange={(e) => setField("refType", e.target.value)}
              >
                <option value="">الكل</option>
                <option value="SaleInvoice">فاتورة بيع</option>
                <option value="PurchaseInvoice">فاتورة شراء</option>
                <option value="SaleReturn">مرتجع بيع</option>
                <option value="manual_adjustment">تسوية يدوية</option>
              </select>
            </div>

            <div className="col-12 col-md-1">
              <label className="form-label">كود المرجع</label>
              <input
                className="form-control"
                value={filters.refCode}
                onChange={(e) => setField("refCode", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">نفذت بواسطة</label>
              <input
                className="form-control"
                value={filters.performedByName}
                onChange={(e) => setField("performedByName", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">السبب</label>
              <input
                className="form-control"
                value={filters.reason}
                onChange={(e) => setField("reason", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">من</label>
              <input
                type="date"
                className="form-control"
                value={filters.from}
                onChange={(e) => setField("from", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">إلى</label>
              <input
                type="date"
                className="form-control"
                value={filters.to}
                onChange={(e) => setField("to", e.target.value)}
              />
            </div>

            <div className="col-12 d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <label className="small text-secondary mb-0">عدد العناصر</label>
                <select
                  className="form-select"
                  style={{ width: 110 }}
                  value={filters.limit}
                  onChange={(e) => setLimit(e.target.value)}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>

              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary" onClick={resetFilters}>
                  مسح
                </button>
                <button className="btn btn-outline-primary" onClick={loadMovements} disabled={loading}>
                  تحديث
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">جاري التحميل...</div>
          ) : data.movements.length === 0 ? (
            <div className="text-center py-5 text-secondary">لا توجد حركات مخزون</div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle text-nowrap">
                  <thead>
                    <tr>
                      <th className="text-end">الصنف</th>
                      <th className="text-end">النوع</th>
                      <th className="text-end">الاتجاه</th>
                      <th className="text-end">الكمية</th>
                      <th className="text-end">قبل</th>
                      <th className="text-end">بعد</th>
                      <th className="text-end">المرجع</th>
                      <th className="text-end">السبب</th>
                      <th className="text-end">المنفذ</th>
                      <th className="text-end">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.movements.map((row) => (
                      <tr key={row.id || row._id}>
                        <td className="text-end">
                          <div className="fw-semibold">{row.productName || "-"}</div>
                          <div className="small text-secondary">{row.productId || "-"}</div>
                          <div className="small text-secondary">
                            {categoryLabel(row.productCategory)}
                          </div>
                        </td>

                        <td className="text-end">
                          <span className={`badge ${movementTypeBadge(row.type)}`}>
                            {movementTypeLabel(row.type)}
                          </span>
                        </td>

                        <td className="text-end">
                          <span className={`badge ${movementDirectionBadge(row.qtyDelta)}`}>
                            {movementDirectionLabel(row.qtyDelta)}
                          </span>
                        </td>

                        <td className="text-end fw-semibold">
                          {Number(row.qtyDelta || 0) > 0 ? "+" : ""}
                          {formatNumber(row.qtyDelta)}
                        </td>

                        <td className="text-end">{formatNumber(row.beforeQty)}</td>
                        <td className="text-end">{formatNumber(row.afterQty)}</td>

                        <td className="text-end">
                          <div>{referenceTypeLabel(row.refType)}</div>
                          <div className="small text-secondary">{row.refCode || "-"}</div>
                        </td>

                        <td className="text-end">
                          <div>{reasonLabel(row.reason)}</div>
                          <div className="small text-secondary">{row.note || "-"}</div>
                        </td>

                        <td className="text-end">{row.performedByName || "-"}</td>
                        <td className="text-end">{formatDateTime(row.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-3">
                <div className="small text-secondary">
                  عرض {formatNumber(pagination.startItem)} - {formatNumber(pagination.endItem)} من{" "}
                  {formatNumber(pagination.total)}
                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <label className="small text-secondary mb-0">عدد العناصر</label>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 90 }}
                    value={filters.limit}
                    onChange={(e) => setLimit(e.target.value)}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>

                <nav aria-label="Stock movements pagination">
                  <ul className="pagination pagination-sm mb-0 flex-wrap">
                    <li className={`page-item ${pagination.page <= 1 ? "disabled" : ""}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => setPage(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                      >
                        السابق
                      </button>
                    </li>

                    {visiblePages[0] > 1 && (
                      <>
                        <li className="page-item">
                          <button type="button" className="page-link" onClick={() => setPage(1)}>
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
                        className={`page-item ${pagination.page === pageNumber ? "active" : ""}`}
                      >
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => setPage(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      </li>
                    ))}

                    {visiblePages[visiblePages.length - 1] < pagination.totalPages && (
                      <>
                        {visiblePages[visiblePages.length - 1] < pagination.totalPages - 1 && (
                          <li className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                        )}
                        <li className="page-item">
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => setPage(pagination.totalPages)}
                          >
                            {pagination.totalPages}
                          </button>
                        </li>
                      </>
                    )}

                    <li
                      className={`page-item ${
                        pagination.page >= pagination.totalPages ? "disabled" : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => setPage(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
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