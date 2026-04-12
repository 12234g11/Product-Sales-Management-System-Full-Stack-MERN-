import { useCallback, useEffect, useMemo, useState } from "react";
import { salesApi } from "../api/salesApi";
import {
  formatDateTime,
  formatMoney,
  formatNumber,
  normalizeApiError,
  stockStatusLabel,
} from "../utils/salesFormatters";

const initialFilters = {
  stockStatus: "",
  itemStatus: "",
  invoiceCode: "",
  search: "",
  cashierName: "",
  createdByName: "",
  productId: "",
  productName: "",
  category: "",
  from: "",
  to: "",
  days: "",
  page: 1,
  limit: 20,
};

export default function SaleReturnsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState({
    returns: [],
    pagination: { total: 0, page: 1, limit: 20 },
  });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryData, listData] = await Promise.all([
        salesApi.returnsSummary(filters),
        salesApi.listReturns(filters),
      ]);

      setSummary(summaryData || null);
      setData({
        returns: Array.isArray(listData?.returns) ? listData.returns : [],
        pagination: listData?.pagination || { total: 0, page: 1, limit: 20 },
      });
    } catch (err) {
      setError(normalizeApiError(err, "فشل تحميل المرتجعات"));
      setData({
        returns: [],
        pagination: { total: 0, page: 1, limit: Number(filters.limit || 20) },
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetails = async (row) => {
    try {
      const ret = await salesApi.getReturn(row.id || row._id);
      setSelected(ret);
    } catch (err) {
      setError(normalizeApiError(err, "فشل تحميل تفاصيل المرتجع"));
    }
  };

  const setField = (name, value) =>
    setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));

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

  return (
    <div className="container-fluid">
      <div className="mb-3">
        <h3 className="m-0 text-white">مرتجعات البيع</h3>
        <div className="text-white small mt-2">
          قائمة المرتجعات + الملخص + تفاصيل كل مرتجع.
        </div>
        <div className="text-white small">
          إجمالي النتائج: {formatNumber(pagination.total)}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-3">
        <div className="col-12 col-md-6 col-xl-3">
          <div className="card">
            <div className="card-body">
              <div className="small text-secondary">عدد المرتجعات</div>
              <div className="fs-4 fw-bold">{formatNumber(summary?.count)}</div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-xl-3">
          <div className="card">
            <div className="card-body">
              <div className="small text-secondary">إجمالي المرتجع</div>
              <div className="fs-4 fw-bold">
                {formatMoney(summary?.totalRefundAmount)}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-xl-3">
          <div className="card">
            <div className="card-body">
              <div className="small text-secondary">مرتجع رجع للمخزن</div>
              <div className="fs-4 fw-bold">
                {formatMoney(summary?.totalRefundRestocked)}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-xl-3">
          <div className="card">
            <div className="card-body">
              <div className="small text-secondary">مرتجع تالف</div>
              <div className="fs-4 fw-bold">
                {formatMoney(summary?.totalRefundDamaged)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-12 col-md-3">
              <label className="form-label">بحث</label>
              <input
                className="form-control"
                value={filters.search}
                onChange={(e) => setField("search", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">كود الفاتورة</label>
              <input
                className="form-control"
                value={filters.invoiceCode}
                onChange={(e) => setField("invoiceCode", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">اسم الكاشير</label>
              <input
                className="form-control"
                value={filters.cashierName}
                onChange={(e) => setField("cashierName", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">اسم المنفذ</label>
              <input
                className="form-control"
                value={filters.createdByName}
                onChange={(e) => setField("createdByName", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">حالة المخزون</label>
              <select
                className="form-select"
                value={filters.stockStatus}
                onChange={(e) => setField("stockStatus", e.target.value)}
              >
                <option value="">الكل</option>
                <option value="restocked">رجع للمخزن</option>
                <option value="damaged">تالف</option>
                <option value="mixed">مختلط</option>
              </select>
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">حالة العنصر</label>
              <select
                className="form-select"
                value={filters.itemStatus}
                onChange={(e) => setField("itemStatus", e.target.value)}
              >
                <option value="">الكل</option>
                <option value="restocked">رجع للمخزن</option>
                <option value="damaged">تالف</option>
              </select>
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">كود صنف</label>
              <input
                className="form-control"
                value={filters.productId}
                onChange={(e) => setField("productId", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">اسم صنف</label>
              <input
                className="form-control"
                value={filters.productName}
                onChange={(e) => setField("productName", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">قسم</label>
              <input
                className="form-control"
                value={filters.category}
                onChange={(e) => setField("category", e.target.value)}
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

            <div className="col-12 col-md-2">
              <label className="form-label">آخر عدد أيام</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={filters.days}
                onChange={(e) => setField("days", e.target.value)}
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">عدد العناصر</label>
              <select
                className="form-select"
                value={filters.limit}
                onChange={(e) => setLimit(e.target.value)}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">جاري التحميل...</div>
          ) : data.returns.length === 0 ? (
            <div className="text-center py-5 text-secondary">لا توجد مرتجعات</div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table align-middle table-hover text-nowrap">
                  <thead>
                    <tr>
                      <th className="text-end">الفاتورة</th>
                      <th className="text-end">الكاشير</th>
                      <th className="text-end">منفذ المرتجع</th>
                      <th className="text-end">النوع</th>
                      <th className="text-end">الحالة</th>
                      <th className="text-end">الكمية</th>
                      <th className="text-end">الإجمالي</th>
                      <th className="text-end">رجع للمخزن</th>
                      <th className="text-end">تالف</th>
                      <th className="text-end">التاريخ</th>
                      <th className="text-end">تفاصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.returns.map((row) => (
                      <tr key={row.id || row._id}>
                        <td className="text-end">
                          <div className="fw-semibold">{row.invoiceCode}</div>
                          <div className="small text-secondary">
                            {row.invoiceName || "-"}
                          </div>
                        </td>
                        <td className="text-end">{row.invoiceCashierName || "-"}</td>
                        <td className="text-end">{row.createdByName || "-"}</td>
                        <td className="text-end">
                          {row.type === "full" ? "كامل" : "جزئي"}
                        </td>
                        <td className="text-end">
                          {stockStatusLabel(row.stockStatus)}
                        </td>
                        <td className="text-end">
                          {formatNumber(row.totalReturnedQty)}
                        </td>
                        <td className="text-end fw-semibold">
                          {formatMoney(row.totalRefundAmount)}
                        </td>
                        <td className="text-end">
                          {formatMoney(row.totalRefundRestocked)}
                        </td>
                        <td className="text-end">
                          {formatMoney(row.totalRefundDamaged)}
                        </td>
                        <td className="text-end">
                          {formatDateTime(row.createdAt)}
                        </td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openDetails(row)}
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
                  </select>
                </div>

                <nav aria-label="Returns pagination">
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

      {selected && (
        <div className="card mt-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h5 className="m-0">تفاصيل المرتجع</h5>
                <div className="small text-secondary mt-1">
                  فاتورة: {selected.invoiceCode} • {selected.invoiceCashierName || "-"}
                </div>
              </div>
              <button
                className="btn btn-outline-secondary"
                onClick={() => setSelected(null)}
              >
                إغلاق
              </button>
            </div>

            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th className="text-end">الصنف</th>
                    <th className="text-end">الكمية</th>
                    <th className="text-end">سعر صافي الوحدة</th>
                    <th className="text-end">قيمة السطر</th>
                    <th className="text-end">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.items || []).map((item) => (
                    <tr key={item._id || item.id}>
                      <td className="text-end">
                        <div className="fw-semibold">{item.productName}</div>
                        <div className="small text-secondary">{item.productId}</div>
                      </td>
                      <td className="text-end">{formatNumber(item.qtyReturned)}</td>
                      <td className="text-end">{formatMoney(item.unitNetPrice)}</td>
                      <td className="text-end">
                        {formatMoney(item.lineRefundAmount)}
                      </td>
                      <td className="text-end">
                        {stockStatusLabel(item.returnStockStatus)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}