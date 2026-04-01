import { useEffect, useMemo, useState } from "react";
import { productsApi } from "../../products/api/productsApi";
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

export default function NewSalePage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(null);

  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [todaySales, setTodaySales] = useState([]);
  const [loadingToday, setLoadingToday] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // load suggestions
  useEffect(() => {
    let canceled = false;

    async function run() {
      setErr("");
      setSuggestions([]);
      if (!debounced) return;

      try {
        const res = await productsApi.autoComplete(debounced);
        if (!canceled) setSuggestions(Array.isArray(res) ? res : []);
      } catch (e) {
        if (!canceled) setErr(e.userMessage || "فشل البحث عن المنتج");
      }
    }

    run();
    return () => {
      canceled = true;
    };
  }, [debounced]);

  const refreshToday = async () => {
    setLoadingToday(true);
    try {
      const res = await salesApi.getToday();
      setTodaySales(Array.isArray(res) ? res : []);
    } catch (e) {
    } finally {
      setLoadingToday(false);
    }
  };

  useEffect(() => {
    refreshToday();
  }, []);

  const maxQty = useMemo(() => Number(selected?.quantity || 0), [selected]);

  const choose = async (p) => {
    setSelected(p);
    setQuery(`${p.name} (${p.id})`);
    setSuggestions([]);
    setQty(1);
    setErr("");
    setOk("");
  };

  const clearSelection = () => {
    setSelected(null);
    setQuery("");
    setSuggestions([]);
    setQty(1);
    setErr("");
    setOk("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");

    if (!selected) {
      setErr("اختار منتج الأول");
      return;
    }

    const q = Number(qty);
    if (!Number.isInteger(q) || q <= 0) {
      setErr("الكمية لازم تكون رقم صحيح أكبر من 0");
      return;
    }
    if (q > maxQty) {
      setErr("الكمية المطلوبة أكبر من المتاح في المخزون");
      return;
    }

    setBusy(true);
    try {
      const sale = await salesApi.create({ id: selected.id, quantity: q });
      try {
        const updated = await productsApi.autoFill({ id: selected.id });
        setSelected(updated);
      } catch (_) {}

      setOk(`تم تسجيل البيع بنجاح ✅ (الإجمالي: ${formatNumber(sale?.totalPrice)})`);
      await refreshToday();
      setQty(1);
    } catch (e2) {
      setErr(e2.userMessage || "فشل تسجيل البيع");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-md-none mb-3">
        <div className="mb-2">
          <h3 className="m-0 text-white">بيع جديد</h3>
          <div className="text-white small mt-2">اختار منتج وسجّل بيع سريع</div>
        </div>

        <button className="btn btn-outline-secondary w-100" onClick={clearSelection}>
          مسح
        </button>
      </div>
      <div className="d-none d-md-flex flex-row-reverse justify-content-between align-items-center mb-3">
        <div>
          <h3 className="m-0 text-white">بيع جديد</h3>
          <div className="text-white small mt-2">اختار منتج وسجّل بيع سريع</div>
        </div>

        <button className="btn btn-outline-secondary" onClick={clearSelection}>
          مسح
        </button>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}
      {ok && <div className="alert alert-success">{ok}</div>}

      <div className="row g-3">
        {/* Sale Form */}
        <div className="col-12 col-lg-6">
          <div className="card">
            <div className="card-body">
              <form onSubmit={submit} className="d-grid gap-3">
                <div>
                  <label className="form-label">بحث عن منتج (اسم أو كود)</label>
                  <input
                    className="form-control"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="مثال: P001 أو زيت"
                    autoComplete="off"
                  />

                  {/* Suggestions */}
                  {suggestions.length > 0 && (
                    <div className="list-group mt-2">
                      {suggestions.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          className="list-group-item list-group-item-action d-flex justify-content-between flex-row-reverse"
                          onClick={() => choose(p)}
                        >
                          <div>
                            <div className="fw-semibold">{p.name}</div>
                            <div className="small text-secondary">
                              {p.category} • كود: {p.id}
                            </div>
                          </div>
                          <div className="text-end small">
                            <div>المتاح: {formatNumber(p.quantity)}</div>
                            <div>سعر البيع: {formatNumber(p.salePrice)}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected product info */}
                {selected && (
                  <div className="border rounded p-3 bg-body-tertiary">
                    <div className="d-flex justify-content-between flex-row-reverse flex-wrap gap-2">
                      <div>
                        <div className="fw-bold">{selected.name}</div>
                        <div className="small text-secondary">
                          {selected.category} • كود: {selected.id}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="small text-secondary">سعر البيع</div>
                        <div className="fw-bold">{formatNumber(selected.salePrice)}</div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between flex-row-reverse flex-wrap gap-2 mt-2">
                      <div className="small text-secondary">
                        المتاح بالمخزون:{" "}
                        <span className="fw-semibold">{formatNumber(selected.quantity)}</span>
                      </div>
                      <div className="small text-secondary">
                        سعر الشراء: {formatNumber(selected.purchasePrice)}
                      </div>
                    </div>
                  </div>
                )}

                <div className="row g-2 align-items-end">
                  <div className="col-12 col-md-6">
                    <label className="form-label">الكمية</label>
                    <input
                      className="form-control"
                      type="number"
                      min={1}
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      disabled={!selected}
                    />
                    {selected && <div className="form-text">الحد الأقصى: {formatNumber(maxQty)}</div>}
                  </div>

                  <div className="col-12 col-md-6">
                    <button className="btn btn-primary w-100" disabled={busy || !selected}>
                      {busy ? "جاري التسجيل..." : "تسجيل البيع"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card">
            <div className="card-body">
              <div className="d-md-none mb-2">
                <div className="mb-2">
                  <h5 className="m-0">مبيعات اليوم</h5>
                </div>
                <button className="btn btn-sm btn-outline-primary w-100" onClick={refreshToday}>
                  تحديث
                </button>
              </div>

              <div className="d-none d-md-flex flex-row-reverse justify-content-between align-items-center mb-2">
                <h5 className="m-0">مبيعات اليوم</h5>
                <button className="btn btn-sm btn-outline-primary" onClick={refreshToday}>
                  تحديث
                </button>
              </div>

              {loadingToday ? (
                <div className="text-center py-4">جاري التحميل...</div>
              ) : todaySales.length === 0 ? (
                <div className="text-center py-4 text-secondary">لا توجد مبيعات اليوم</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle text-nowrap">
                    <thead>
                      <tr>
                        <th className="text-end">المنتج</th>
                        <th className="text-end">الكمية</th>
                        <th className="text-end">الإجمالي</th>
                        <th className="text-end">الوقت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todaySales.slice(0, 10).map((s, idx) => (
                        <tr key={(s.saleId || s._id || idx) + ""}>
                          <td className="text-end">
                            <div className="fw-semibold">{s.name}</div>
                            <div className="small text-secondary">{s.id}</div>
                          </td>
                          <td className="text-end">{formatNumber(s.quantity)}</td>
                          <td className="text-end">{formatNumber(s.totalPrice)}</td>
                          <td className="text-end small text-secondary">{formatDateTime(s.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
