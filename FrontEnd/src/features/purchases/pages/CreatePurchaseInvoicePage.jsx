import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowRight, FiPlusCircle } from "react-icons/fi";
import { purchasesApi } from "../api/purchasesApi";
import { suppliersApi } from "../../suppliers/api/suppliersApi";

export default function CreatePurchaseInvoicePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    supplierInput: "",
    notes: "",
  });

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [activeSupplierIndex, setActiveSupplierIndex] = useState(-1);
  const supplierOptionRefs = useRef([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = String(form.supplierInput || "").trim();

    if (!q) {
      setSupplierOptions([]);
      setActiveSupplierIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSuppliers(true);
      try {
        const rows = await suppliersApi.autoComplete(q);
        const list = Array.isArray(rows) ? rows : [];
        setSupplierOptions(list);
        setActiveSupplierIndex(list.length ? 0 : -1);
      } catch {
        setSupplierOptions([]);
        setActiveSupplierIndex(-1);
      } finally {
        setLoadingSuppliers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [form.supplierInput]);

  useEffect(() => {
    if (activeSupplierIndex < 0) return;
    const el = supplierOptionRefs.current[activeSupplierIndex];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeSupplierIndex]);

  const pickSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setForm((f) => ({ ...f, supplierInput: supplier.name }));
    setSupplierOptions([]);
    setActiveSupplierIndex(-1);
  };

  const handleSupplierKeyDown = (e) => {
    if (!supplierOptions.length || busy) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSupplierIndex((prev) => (prev >= supplierOptions.length - 1 ? 0 : prev + 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSupplierIndex((prev) => (prev <= 0 ? supplierOptions.length - 1 : prev - 1));
      return;
    }

    if (e.key === "Enter" && activeSupplierIndex >= 0) {
      e.preventDefault();
      pickSupplier(supplierOptions[activeSupplierIndex]);
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setSupplierOptions([]);
      setActiveSupplierIndex(-1);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const payload = {
        notes: String(form.notes || "").trim(),
      };

      if (selectedSupplier?.id) {
        payload.supplierId = selectedSupplier.id;
      } else {
        payload.supplierName = String(form.supplierInput || "").trim();
      }

      const data = await purchasesApi.create(payload);
      navigate(`/purchases/${data?.invoice?.id}`);
    } catch (e) {
      setError(e.userMessage || "فشل إنشاء فاتورة الشراء");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-md-none mb-3">
        <h3 className="m-0 text-white">إنشاء فاتورة شراء</h3>
      </div>

      <div className="d-none d-md-flex flex-row-reverse justify-content-between align-items-center mb-3">
        <h3 className="m-0 text-white">إنشاء فاتورة شراء</h3>

        <button className="btn btn-outline-secondary d-inline-flex align-items-center gap-1" onClick={() => navigate("/purchases")}> 
          <FiArrowRight aria-hidden="true" />
          رجوع
        </button>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="card">
        <div className="card-body">
          <form onSubmit={submit}>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label">كود الفاتورة</label>
                <input
                  className="form-control"
                  value="يتم توليده تلقائيًا"
                  disabled
                  readOnly
                />
                <div className="form-text">
                  سيتم إنشاء الكود تلقائيًا من الباك إند داخل نفس مساحة العمل.
                </div>
              </div>

              <div className="col-12 col-md-6 position-relative">
                <label className="form-label">المورد</label>
                <input
                  className="form-control"
                  value={form.supplierInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((f) => ({ ...f, supplierInput: value }));
                    if (selectedSupplier && value !== selectedSupplier.name) {
                      setSelectedSupplier(null);
                    }
                  }}
                  onKeyDown={handleSupplierKeyDown}
                  placeholder="اختر مورد موجود أو اكتب اسم مورد جديد"
                  autoComplete="off"
                  required
                />

                {loadingSuppliers ? (
                  <div className="form-text">جاري البحث عن الموردين...</div>
                ) : null}

                {supplierOptions.length > 0 ? (
                  <div className="list-group position-absolute w-100 mt-1 shadow-sm" style={{ zIndex: 20 }}>
                    {supplierOptions.map((s, index) => {
                      const active = index === activeSupplierIndex;

                      return (
                        <button
                          key={s.id}
                          type="button"
                          ref={(el) => {
                            supplierOptionRefs.current[index] = el;
                          }}
                          className={`list-group-item list-group-item-action text-end ${active ? "active" : ""}`}
                          onClick={() => pickSupplier(s)}
                          onMouseEnter={() => setActiveSupplierIndex(index)}
                        >
                          <div className="fw-semibold">{s.name}</div>
                          <div className={`small ${active ? "text-white-50" : "text-secondary"}`}>
                            {s.phone || "بدون رقم"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {selectedSupplier ? (
                  <div className="form-text text-success">
                    سيتم الإرسال بمعرّف المورد المختار.
                  </div>
                ) : (
                  <div className="form-text">
                    لو الاسم غير موجود هيتم إنشاء المورد تلقائيا.
                  </div>
                )}
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
            </div>

            <div className="d-flex gap-2 mt-4 flex-wrap">
              <button type="submit" className="btn btn-primary d-inline-flex align-items-center gap-1" disabled={busy}>
                <FiPlusCircle aria-hidden="true" />
                {busy ? "جاري الإنشاء..." : "إنشاء الفاتورة"}
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={busy}
                onClick={() => navigate("/purchases")}
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
