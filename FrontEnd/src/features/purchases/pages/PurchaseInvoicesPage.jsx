import { useEffect, useMemo, useState } from "react";
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

export default function PurchaseInvoicesPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
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
    limit: 10,
  });

  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  const load = async (nextFilters = filters) => {
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
      setPagination(data?.pagination || { page: 1, limit: nextFilters.limit, total: 0 });
    } catch (e) {
      setError(e.userMessage || "فشل تحميل فواتير الشراء");
      setItems([]);
      setPagination({ page: 1, limit: filters.limit, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filters);
  }, []);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(Number(pagination.total || 0) / Number(pagination.limit || 10)));
  }, [pagination]);

  const onSearch = async (e) => {
    e.preventDefault();
    const next = { ...filters, page: 1 };
    setFilters(next);
    await load(next);
  };

  const onReset = async () => {
    const reset = {
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
      limit: 10,
    };
    setFilters(reset);
    await load(reset);
  };

  const goToPage = async (page) => {
    const next = { ...filters, page };
    setFilters(next);
    await load(next);
  };

  const changeLimit = async (limit) => {
    const next = { ...filters, page: 1, limit };
    setFilters(next);
    await load(next);
  };

  return (
    <div className="container-fluid">
      <div className="d-md-none mb-3">
        <div className="mb-2">
          <h3 className="m-0 text-white">فواتير الشراء</h3>
          <div className="text-white small">
            الإجمالي: {formatNumber(pagination.total)}
          </div>
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
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
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
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="كود الفاتورة / المورد / الملاحظات"
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">كود الفاتورة</label>
              <input
                className="form-control"
                value={filters.invoiceCode}
                onChange={(e) => setFilters((f) => ({ ...f, invoiceCode: e.target.value }))}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">اسم المورد</label>
              <input
                className="form-control"
                value={filters.supplierName}
                onChange={(e) => setFilters((f) => ({ ...f, supplierName: e.target.value }))}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">معرّف المورد</label>
              <input
                className="form-control"
                value={filters.supplierId}
                onChange={(e) => setFilters((f) => ({ ...f, supplierId: e.target.value }))}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">أُنشئت بواسطة</label>
              <input
                className="form-control"
                value={filters.createdByName}
                onChange={(e) => setFilters((f) => ({ ...f, createdByName: e.target.value }))}
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">من</label>
              <input
                className="form-control"
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">إلى</label>
              <input
                className="form-control"
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">آخر X يوم</label>
              <input
                className="form-control"
                type="number"
                min={1}
                value={filters.days}
                onChange={(e) => setFilters((f) => ({ ...f, days: e.target.value }))}
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
                onChange={(e) =>
                  setFilters((f) => ({ ...f, minTotalAmount: e.target.value }))
                }
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
                onChange={(e) =>
                  setFilters((f) => ({ ...f, maxTotalAmount: e.target.value }))
                }
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">عدد الصفوف</label>
              <select
                className="form-select"
                value={filters.limit}
                onChange={(e) => changeLimit(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
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

              <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                <div className="small text-secondary">
                  الصفحة {pagination.page} من {totalPages} • الإجمالي {formatNumber(pagination.total)}
                </div>

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-outline-secondary"
                    disabled={pagination.page <= 1 || loading}
                    onClick={() => goToPage(Number(pagination.page || 1) - 1)}
                  >
                    السابق
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    disabled={pagination.page >= totalPages || loading}
                    onClick={() => goToPage(Number(pagination.page || 1) + 1)}
                  >
                    التالي
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}