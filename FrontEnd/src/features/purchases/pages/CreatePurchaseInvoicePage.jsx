import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { purchasesApi } from "../api/purchasesApi";
import { suppliersApi } from "../../suppliers/api/suppliersApi";

export default function CreatePurchaseInvoicePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    invoiceCode: "",
    supplierInput: "",
    notes: "",
  });  

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = String(form.supplierInput || "").trim();

    if (!q) {
      setSupplierOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSuppliers(true);
      try {
        const rows = await suppliersApi.autoComplete(q);
        setSupplierOptions(Array.isArray(rows) ? rows : []);
      } catch {
        setSupplierOptions([]);
      } finally {
        setLoadingSuppliers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [form.supplierInput]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const payload = {
        invoiceCode: String(form.invoiceCode || "").trim(),
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

        <button className="btn btn-outline-secondary" onClick={() => navigate("/purchases")}>
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
                  value={form.invoiceCode}
                  onChange={(e) => setForm((f) => ({ ...f, invoiceCode: e.target.value }))}
                  required
                />
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
                  placeholder="اختر مورد موجود أو اكتب اسم مورد جديد"
                  required
                />

                {loadingSuppliers ? (
                  <div className="form-text">جاري البحث عن الموردين...</div>
                ) : null}

                {supplierOptions.length > 0 ? (
                  <div className="list-group position-absolute w-100 mt-1 shadow-sm" style={{ zIndex: 20 }}>
                    {supplierOptions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="list-group-item list-group-item-action text-end"
                        onClick={() => {
                          setSelectedSupplier(s);
                          setForm((f) => ({ ...f, supplierInput: s.name }));
                          setSupplierOptions([]);
                        }}
                      >
                        <div className="fw-semibold">{s.name}</div>
                        <div className="small text-secondary">{s.phone || "بدون رقم"}</div>
                      </button>
                    ))}
                  </div>
                ) : null}

                {selectedSupplier ? (
                  <div className="form-text text-success">
                    سيتم الإرسال بمعرّف المورد المختار.
                  </div>
                ) : (
                  <div className="form-text">
                    لو الاسم غير موجود، الباك هيعمل resolve/create تلقائيًا.
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
              <button type="submit" className="btn btn-primary" disabled={busy}>
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