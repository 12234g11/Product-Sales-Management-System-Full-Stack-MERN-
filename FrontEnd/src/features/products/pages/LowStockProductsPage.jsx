import { useEffect, useMemo, useState } from "react";
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

export default function LowStockProductsPage() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [showAdjust, setShowAdjust] = useState(false);
  const [adjusting, setAdjusting] = useState(null);

  const fetchLow = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await productsApi.getLowStock();
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      setErr(e.userMessage || "فشل تحميل المنتجات منخفضة المخزون");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLow();
  }, []);

  const filteredItems = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return items;

    return items.filter((p) => {
      const id = String(p.id || "").toLowerCase();
      const name = String(p.name || "").toLowerCase();
      const category = String(p.category || "").toLowerCase();
      return id.includes(q) || name.includes(q) || category.includes(q);
    });
  }, [items, query]);

  const summary = useMemo(() => {
    const out = filteredItems.filter((p) => Number(p.quantity || 0) <= 0).length;
    const low = filteredItems.length;
    return { out, low };
  }, [filteredItems]);

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
      await fetchLow();
    } catch (e) {
      setErr(e.userMessage || "فشل تسوية المخزون");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-md-none mb-3">
        <div className="mb-2">
          <h3 className="m-0 text-white">مخزون منخفض</h3>
          <div className="text-light mt-2 small">
            إجمالي: {formatNumber(summary.low)} • نفد المخزون: {formatNumber(summary.out)}
          </div>
        </div>

        <div className="d-grid gap-2">
          <input
            className="form-control bg-dark text-white border-secondary"
            placeholder="بحث بالكود أو الاسم أو الفئة"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <button className="btn btn-outline-light" onClick={fetchLow} disabled={loading}>
            تحديث
          </button>
        </div>
      </div>

      <div className="d-none d-md-flex flex-row-reverse justify-content-between align-items-center mb-3">
        <div>
          <h3 className="m-0 text-white">مخزون منخفض</h3>
          <div className="text-light mt-2 small">
            إجمالي: {formatNumber(summary.low)} • نفد المخزون: {formatNumber(summary.out)}
          </div>
        </div>

        <div className="d-flex flex-row-reverse gap-2 align-items-center">
          <input
            className="form-control bg-dark text-white border-secondary"
            style={{ width: 320 }}
            placeholder="بحث بالكود أو الاسم أو الفئة"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <button className="btn btn-outline-light" onClick={fetchLow} disabled={loading}>
            تحديث
          </button>
        </div>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      <div className="card bg-dark border-secondary shadow-sm">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4 text-light">جاري التحميل...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-4 text-light">
              لا توجد منتجات منخفضة أو نافدة حاليًا
            </div>
          ) : (
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
                  {filteredItems.map((p) => {
                    const info = statusInfo(p);
                    const out = Number(p.quantity || 0) <= 0;

                    return (
                      <tr
                        key={p.id}
                        style={
                          out
                            ? {
                              backgroundColor: "rgba(220, 53, 69, 0.22)",
                            }
                            : {
                              backgroundColor: "rgba(255, 193, 7, 0.08)",
                            }
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
                              className="btn btn-sm btn-warning text-dark fw-semibold text-nowrap"
                              onClick={() => openAdjust(p)}
                              disabled={busy}
                            >
                              تسوية
                            </button>

                            <button
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