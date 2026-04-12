import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { productsApi } from "../api/productsApi";
import AdjustStockModal from "../components/AdjustStockModal";

function formatNumber(n) {
  return new Intl.NumberFormat("ar-EG").format(Number(n || 0));
}

function statusInfo(product) {
  const qty = Number(product?.quantity || 0);
  const minStock = Number(product?.minStock || 0);

  if (qty <= 0) {
    return { label: "نفد المخزون", className: "bg-danger text-white" };
  }
  if (minStock > 0 && qty < minStock) {
    return { label: "أقل من الحد الأدنى", className: "bg-warning text-dark" };
  }
  return { label: "متوفر", className: "bg-success text-white" };
}

const initialFilters = {
  search: "",
  page: 1,
  limit: 20,
};

export default function LowStockProductsPage() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState(initialFilters);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [paginationState, setPaginationState] = useState({
    total: 0,
    page: 1,
    limit: 20,
  });

  const [showAdjust, setShowAdjust] = useState(false);
  const [adjusting, setAdjusting] = useState(null);

  const fetchLow = useCallback(async (nextFilters = filters) => {
    setLoading(true);
    setErr("");

    try {
      const res = await productsApi.getLowStock(nextFilters);

      setItems(Array.isArray(res?.products) ? res.products : []);
      setPaginationState(
        res?.pagination || {
          total: 0,
          page: Number(nextFilters.page || 1),
          limit: Number(nextFilters.limit || 20),
        }
      );
    } catch (e) {
      setErr(e.userMessage || "فشل تحميل المنتجات منخفضة المخزون");
      setItems([]);
      setPaginationState({
        total: 0,
        page: 1,
        limit: Number(nextFilters.limit || 20),
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLow(filters);
  }, [fetchLow, filters]);

  const summary = useMemo(() => {
    const out = items.filter((p) => Number(p.quantity || 0) <= 0).length;
    const low = items.length;
    return { out, low };
  }, [items]);

  const paging = useMemo(() => {
    const total = Math.max(0, Number(paginationState.total || 0));
    const page = Math.max(1, Number(paginationState.page || 1));
    const limit = Math.max(1, Number(paginationState.limit || filters.limit || 20));
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
  }, [paginationState, filters.limit]);

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

  const openAdjust = (product) => {
    setAdjusting(product);
    setShowAdjust(true);
  };

  const submitAdjust = async (payload) => {
    setBusy(true);
    setErr("");

    try {
      await productsApi.adjustStock(adjusting.id, payload);
      setShowAdjust(false);
      setAdjusting(null);
      await fetchLow(filters);
    } catch (e) {
      setErr(e.userMessage || "فشل تسوية المخزون");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const setField = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 1,
    }));
  };

  const onSearch = async (e) => {
    e.preventDefault();
    await fetchLow({ ...filters, page: 1 });
  };

  const onReset = async () => {
    setFilters(initialFilters);
  };

  const setPage = (page) => {
    const nextPage = Number(page);
    if (!Number.isFinite(nextPage)) return;
    if (nextPage < 1 || nextPage > paging.totalPages) return;
    if (nextPage === paging.page) return;

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
      <div className="d-md-none mb-3">
        <div className="mb-2">
          <h3 className="m-0 text-white">مخزون منخفض</h3>
          <div className="text-light mt-2 small">
            عدد المنتجات في الصفحة: {formatNumber(summary.low)} • نفد المخزون في الصفحة:{" "}
            {formatNumber(summary.out)}
          </div>
          <div className="text-light small mt-1">
            إجمالي النتائج: {formatNumber(paging.total)}
          </div>
        </div>

        <div className="d-grid gap-2">
          <button className="btn btn-outline-light" onClick={() => fetchLow(filters)} disabled={loading}>
            تحديث
          </button>
        </div>
      </div>

      <div className="d-none d-md-flex flex-row-reverse justify-content-between align-items-center mb-3">
        <div>
          <h3 className="m-0 text-white">مخزون منخفض</h3>
          <div className="text-light mt-2 small">
            عدد المنتجات في الصفحة: {formatNumber(summary.low)} • نفد المخزون في الصفحة:{" "}
            {formatNumber(summary.out)}
          </div>
          <div className="text-light small mt-1">
            إجمالي النتائج: {formatNumber(paging.total)}
          </div>
        </div>

        <div className="d-flex flex-row-reverse gap-2 align-items-center">
          <button className="btn btn-outline-light" onClick={() => fetchLow(filters)} disabled={loading}>
            تحديث
          </button>
        </div>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      <form className="card bg-dark border-secondary shadow-sm mb-3" onSubmit={onSearch}>
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-6">
              <label className="form-label text-light">بحث بالكود أو الاسم أو الفئة</label>
              <input
                className="form-control bg-dark text-white border-secondary"
                value={filters.search}
                onChange={(e) => setField("search", e.target.value)}
                placeholder="بحث بالكود أو الاسم أو الفئة"
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label text-light">عدد العناصر</label>
              <select
                className="form-select bg-dark text-white border-secondary"
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

            <div className="col-12 col-md-4">
              <div className="d-flex gap-2 flex-row-reverse">
                <button className="btn btn-outline-primary w-100" type="submit" disabled={loading}>
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

      <div className="card bg-dark border-secondary shadow-sm">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4 text-light">جاري التحميل...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-4 text-light">
              لا توجد منتجات منخفضة أو نافدة حاليًا
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th className="text-end text-light">الكود</th>
                      <th className="text-end text-light">الاسم</th>
                      <th className="text-end text-light">الفئة</th>
                      <th className="text-end text-light">الكمية</th>
                      <th className="text-end text-light">الحد الأدنى</th>
                      <th className="text-end text-light">سعر البيع</th>
                      <th className="text-end text-light">الحالة</th>
                      <th className="text-end text-light" style={{ width: 1 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => {
                      const info = statusInfo(p);
                      const out = Number(p.quantity || 0) <= 0;

                      return (
                        <tr
                          key={p.id}
                          style={
                            out
                              ? { backgroundColor: "rgba(220, 53, 69, 0.22)" }
                              : { backgroundColor: "rgba(255, 193, 7, 0.08)" }
                          }
                        >
                          <td className="text-end fw-semibold text-white">{p.id}</td>
                          <td className="text-end text-white">{p.name}</td>
                          <td className="text-end text-light">{p.category}</td>
                          <td className="text-end text-white">{formatNumber(p.quantity)}</td>
                          <td className="text-end text-light">{formatNumber(p.minStock)}</td>
                          <td className="text-end text-white">{formatNumber(p.salePrice)}</td>
                          <td className="text-end">
                            <span className={`badge ${info.className}`}>{info.label}</span>
                          </td>
                          <td className="text-end">
                            <div className="d-flex gap-2 justify-content-end flex-wrap flex-md-nowrap">
                              <button
                                type="button"
                                className="btn btn-sm btn-warning text-dark fw-semibold text-nowrap"
                                onClick={() => openAdjust(p)}
                                disabled={busy}
                              >
                                تسوية
                              </button>

                              <button
                                type="button"
                                className="btn btn-sm btn-primary fw-semibold text-nowrap"
                                onClick={() =>
                                  navigate(`/products?id=${encodeURIComponent(p.id)}`)
                                }
                              >
                                فتح المنتج
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="small text-light opacity-75 mt-3">
                  يتم عرض المنتجات النافدة أو الأقل من الحد الأدنى المحدد لكل منتج.
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-3">
                <div className="small text-light opacity-75">
                  عرض {formatNumber(paging.startItem)} - {formatNumber(paging.endItem)} من{" "}
                  {formatNumber(paging.total)}
                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <label className="small text-light opacity-75 mb-0">عدد العناصر</label>
                  <select
                    className="form-select form-select-sm bg-dark text-white border-secondary"
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

                <nav aria-label="Low stock pagination">
                  <ul className="pagination pagination-sm mb-0 flex-wrap">
                    <li className={`page-item ${paging.page <= 1 ? "disabled" : ""}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => setPage(paging.page - 1)}
                        disabled={paging.page <= 1}
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
                        className={`page-item ${paging.page === pageNumber ? "active" : ""}`}
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
                            onClick={() => setPage(paging.totalPages)}
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
                        onClick={() => setPage(paging.page + 1)}
                        disabled={paging.page >= paging.totalPages}
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

      <AdjustStockModal
        show={showAdjust}
        product={adjusting}
        busy={busy}
        error={err}
        onClose={() => setShowAdjust(false)}
        onSubmit={submitAdjust}
      />
    </div>
  );
}