import { useEffect, useMemo, useState } from "react";

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

function movementTypeLabel(type) {
  const value = String(type || "").trim();

  if (value === "purchase") return "شراء";
  if (value === "sale") return "بيع";
  if (value === "sale_return") return "مرتجع بيع";
  if (value === "adjustment") return "تسوية";

  return value || "—";
}

function reasonLabel(reason) {
  const value = String(reason || "").trim();

  if (value === "inventory_count") return "جرد مخزون";
  if (value === "opening_balance") return "رصيد افتتاحي";
  if (value === "damaged") return "تالف";
  if (value === "correction") return "تصحيح";
  if (value === "other") return "أخرى";

  return value || "—";
}

function refTypeLabel(refType) {
  const value = String(refType || "").trim();

  if (!value) return "—";

  if (value === "manual_adjustment") return "تسوية يدوية";
  if (value === "PurchaseInvoice") return "فاتورة شراء";
  if (value === "SaleInvoice") return "فاتورة بيع";
  if (value === "SaleReturn") return "مرتجع بيع";

  return value;
}

export default function ProductMovementsModal({
  show,
  product,
  onClose,
  fetchMovements,
}) {
  const [filters, setFilters] = useState({
    type: "",
    direction: "",
    from: "",
    to: "",
    performedByName: "",
    refCode: "",
    q: "",
    limit: 10,
  });

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async (page = 1, nextFilters = filters) => {
    if (!product?.id) return;

    setLoading(true);
    setError("");

    try {
      const data = await fetchMovements(product.id, {
        ...nextFilters,
        page,
        limit: nextFilters.limit,
      });

      setRows(Array.isArray(data?.movements) ? data.movements : []);
      setPagination(
        data?.pagination || {
          page,
          limit: nextFilters.limit,
          total: 0,
        }
      );
    } catch (e) {
      setError(e.userMessage || "فشل تحميل الحركات");
      setRows([]);
      setPagination({ page: 1, limit: nextFilters.limit, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!show || !product?.id) return;
    load(1, filters);
  }, [show, product?.id]);

  const totalPages = useMemo(() => {
    const limit = Number(pagination.limit || filters.limit || 10);
    const total = Number(pagination.total || 0);
    return Math.max(1, Math.ceil(total / limit));
  }, [pagination, filters.limit]);

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
        <div className="modal-dialog modal-fullscreen-sm-down modal-xl" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h5 className="modal-title">حركات الصنف</h5>
                <div className="small text-secondary">
                  {product?.name} ({product?.id})
                </div>
              </div>

              <button
                type="button"
                className="btn-close ms-0 me-auto"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            <div className="modal-body">
              {error ? <div className="alert alert-danger">{error}</div> : null}

              <form
                className="card mb-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  load(1, filters);
                }}
              >
                <div className="card-body">
                  <div className="row g-2">
                    <div className="col-12 col-md-2">
                      <label className="form-label">النوع</label>
                      <select
                        className="form-select"
                        value={filters.type}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, type: e.target.value }))
                        }
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
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, direction: e.target.value }))
                        }
                      >
                        <option value="">الكل</option>
                        <option value="in">داخل</option>
                        <option value="out">خارج</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-2">
                      <label className="form-label">من</label>
                      <input
                        className="form-control"
                        type="date"
                        value={filters.from}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, from: e.target.value }))
                        }
                      />
                    </div>

                    <div className="col-12 col-md-2">
                      <label className="form-label">إلى</label>
                      <input
                        className="form-control"
                        type="date"
                        value={filters.to}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, to: e.target.value }))
                        }
                      />
                    </div>

                    <div className="col-12 col-md-2">
                      <label className="form-label">كود المرجع</label>
                      <input
                        className="form-control"
                        value={filters.refCode}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, refCode: e.target.value }))
                        }
                      />
                    </div>

                    <div className="col-12 col-md-2">
                      <label className="form-label">بواسطة</label>
                      <input
                        className="form-control"
                        value={filters.performedByName}
                        onChange={(e) =>
                          setFilters((f) => ({
                            ...f,
                            performedByName: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="col-12 col-md-8">
                      <label className="form-label">بحث</label>
                      <input
                        className="form-control"
                        value={filters.q}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, q: e.target.value }))
                        }
                        placeholder="اسم المنتج / السبب / الملاحظة ..."
                      />
                    </div>

                    <div className="col-12 col-md-2">
                      <label className="form-label">عدد الصفوف</label>
                      <select
                        className="form-select"
                        value={filters.limit}
                        onChange={(e) =>
                          setFilters((f) => ({
                            ...f,
                            limit: Number(e.target.value),
                          }))
                        }
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-2 d-flex gap-2 align-items-end">
                      <button className="btn btn-outline-primary w-100" type="submit">
                        بحث
                      </button>
                      <button
                        className="btn btn-outline-secondary w-100"
                        type="button"
                        onClick={() => {
                          const reset = {
                            type: "",
                            direction: "",
                            from: "",
                            to: "",
                            performedByName: "",
                            refCode: "",
                            q: "",
                            limit: 10,
                          };
                          setFilters(reset);
                          load(1, reset);
                        }}
                      >
                        الكل
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {loading ? (
                <div className="text-center py-4">جاري التحميل...</div>
              ) : rows.length === 0 ? (
                <div className="text-center py-4 text-secondary">لا توجد حركات</div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead>
                        <tr>
                          <th className="text-end">التاريخ</th>
                          <th className="text-end">النوع</th>
                          <th className="text-end">الفرق</th>
                          <th className="text-end">قبل</th>
                          <th className="text-end">بعد</th>
                          <th className="text-end">المرجع</th>
                          <th className="text-end">السبب/الملاحظة</th>
                          <th className="text-end">بواسطة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((m) => (
                          <tr key={m.id}>
                            <td className="text-end">{formatDate(m.createdAt)}</td>

                            <td className="text-end">{movementTypeLabel(m.type)}</td>

                            <td className="text-end">
                              <span
                                className={
                                  Number(m.qtyDelta) > 0
                                    ? "text-success fw-semibold"
                                    : "text-danger fw-semibold"
                                }
                              >
                                {Number(m.qtyDelta) > 0 ? "+" : ""}
                                {formatNumber(m.qtyDelta)}
                              </span>
                            </td>

                            <td className="text-end">{formatNumber(m.beforeQty)}</td>
                            <td className="text-end">{formatNumber(m.afterQty)}</td>

                            <td className="text-end">
                              {m.refType || m.refCode ? (
                                <>
                                  <div>{refTypeLabel(m.refType)}</div>
                                  <div className="small text-secondary">{m.refCode || "—"}</div>
                                </>
                              ) : (
                                "—"
                              )}
                            </td>

                            <td className="text-end">
                              <div>{reasonLabel(m.reason)}</div>
                              <div className="small text-secondary">{m.note || "—"}</div>
                            </td>

                            <td className="text-end">{m.performedByName || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                    <div className="small text-secondary">
                      الصفحة {pagination.page} من {totalPages} • الإجمالي{" "}
                      {formatNumber(pagination.total)}
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-outline-secondary"
                        disabled={pagination.page <= 1 || loading}
                        onClick={() => load(Number(pagination.page || 1) - 1, filters)}
                      >
                        السابق
                      </button>
                      <button
                        className="btn btn-outline-secondary"
                        disabled={pagination.page >= totalPages || loading}
                        onClick={() => load(Number(pagination.page || 1) + 1, filters)}
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
      </div>

      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}