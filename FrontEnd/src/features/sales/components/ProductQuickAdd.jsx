import { useEffect, useRef, useState } from "react";
import { productsApi } from "../../products/api/productsApi";
import { formatMoney, formatNumber } from "../utils/salesFormatters";

export default function ProductQuickAdd({ disabled, busy, onAdd, onError }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestionRefs = useRef([]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setSuggestions([]);
      setActiveIndex(-1);

      if (!debounced || disabled) return;

      setLoading(true);
      try {
        const data = await productsApi.autoComplete(debounced);
        if (!cancelled) {
          const rows = Array.isArray(data) ? data : [];
          setSuggestions(rows);
          setActiveIndex(rows.length > 0 ? 0 : -1);
        }
      } catch (error) {
        if (!cancelled) onError?.(error?.userMessage || "فشل تحميل الاقتراحات");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [debounced, disabled, onError]);

  useEffect(() => {
    if (activeIndex < 0) return;
    const el = suggestionRefs.current[activeIndex];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [activeIndex]);

  const pick = async (product) => {
    setSelected(product);
    setQuery(`${product.name} (${product.id})`);
    setSuggestions([]);
    setActiveIndex(-1);
    setQuantity(1);

    try {
      const filled = await productsApi.autoFill({ id: product.id });
      setSelected(filled || product);
    } catch (_) {
      setSelected(product);
    }
  };

  const clear = () => {
    setQuery("");
    setDebounced("");
    setSelected(null);
    setSuggestions([]);
    setActiveIndex(-1);
    setQuantity(1);
  };

  const handleInputKeyDown = async (e) => {
    if (!suggestions.length || disabled || busy) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => {
        if (prev < 0) return 0;
        return prev >= suggestions.length - 1 ? 0 : prev + 1;
      });
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => {
        if (prev < 0) return suggestions.length - 1;
        return prev <= 0 ? suggestions.length - 1 : prev - 1;
      });
      return;
    }

    if (e.key === "Enter" && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault();
      await pick(suggestions[activeIndex]);
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setSuggestions([]);
      setActiveIndex(-1);
    }
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!selected) {
      onError?.("اختار صنف الأول");
      return;
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      onError?.("الكمية لازم تكون رقم صحيح أكبر من 0");
      return;
    }

    await onAdd({ productId: selected.id, quantity: qty, product: selected });
    clear();
  };

  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div>
            <h5 className="m-0">إضافة صنف</h5>
            <div className="small text-secondary mt-1">
              ابحث بالاسم أو الكود ثم أضف الكمية.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={clear}
            disabled={disabled || busy}
          >
            مسح
          </button>
        </div>

        <form onSubmit={submit} className="d-grid gap-3">
          <div>
            <label className="form-label">بحث عن صنف</label>
            <input
              className="form-control"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              disabled={disabled || busy}
              autoComplete="off"
            />

            {loading && <div className="small text-secondary mt-2">جاري البحث...</div>}

            {suggestions.length > 0 && (
              <div className="list-group mt-2 shadow-sm">
                {suggestions.map((p, index) => {
                  const isActive = index === activeIndex;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      ref={(el) => {
                        suggestionRefs.current[index] = el;
                      }}
                      className={`list-group-item list-group-item-action text-end ${
                        isActive ? "active" : ""
                      }`}
                      onClick={() => pick(p)}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <div className="d-flex justify-content-between flex-row-reverse gap-2">
                        <div>
                          <div className="fw-semibold">{p.name}</div>
                          <div
                            className={`small ${
                              isActive ? "text-white-50" : "text-secondary"
                            }`}
                          >
                            {p.category || "بدون قسم"} • كود: {p.id}
                          </div>
                        </div>
                        <div
                          className={`small text-start ${
                            isActive ? "text-white" : "text-secondary"
                          }`}
                        >
                          <div>المتاح: {formatNumber(p.quantity)}</div>
                          <div>السعر: {formatMoney(p.salePrice)}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selected && (
            <div className="border rounded p-3 bg-body-tertiary">
              <div className="fw-bold">{selected.name}</div>
              <div className="small text-secondary mt-1">
                كود: {selected.id} • القسم: {selected.category || "-"}
              </div>
              <div className="row g-2 mt-2 small">
                <div className="col-6">سعر البيع: {formatMoney(selected.salePrice)}</div>
                <div className="col-6">المتاح: {formatNumber(selected.quantity)}</div>
              </div>
            </div>
          )}

          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-6">
              <label className="form-label">الكمية</label>
              <input
                className="form-control"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={disabled || busy || !selected}
              />
            </div>
            <div className="col-12 col-md-6">
              <button
                className="btn btn-primary w-100"
                disabled={disabled || busy || !selected}
              >
                {busy ? "جاري الإضافة..." : "إضافة"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}