import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { suppliersApi } from "../api/suppliersApi";

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(dt);
}

function statusBadge(isActive) {
  return isActive ? "text-bg-success" : "text-bg-secondary";
}

function statusLabel(isActive) {
  return isActive ? "نشط" : "مؤرشف";
}

export default function SupplierDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [supplier, setSupplier] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    notes: "",
    isActive: true,
  });

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadSupplier = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await suppliersApi.getById(id);
      const s = data || null;
      setSupplier(s);
      setForm({
        name: s?.name ?? "",
        phone: s?.phone ?? "",
        address: s?.address ?? "",
        notes: s?.notes ?? "",
        isActive: Boolean(s?.isActive),
      });
    } catch (e) {
      setError(e.userMessage || "فشل تحميل المورد");
      setSupplier(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupplier();
  }, [id]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const data = await suppliersApi.update(id, {
        name: String(form.name || "").trim(),
        phone: String(form.phone || "").trim(),
        address: String(form.address || "").trim(),
        notes: String(form.notes || "").trim(),
        isActive: Boolean(form.isActive),
      });

      setSupplier(data || supplier);
      setForm({
        name: data?.name ?? "",
        phone: data?.phone ?? "",
        address: data?.address ?? "",
        notes: data?.notes ?? "",
        isActive: Boolean(data?.isActive),
      });
    } catch (e2) {
      setError(e2.userMessage || "فشل تعديل المورد");
    } finally {
      setBusy(false);
    }
  };

  const archiveSupplier = async () => {
    const ok = window.confirm("هل أنت متأكد من أرشفة المورد؟");
    if (!ok) return;

    setBusy(true);
    setError("");

    try {
      const data = await suppliersApi.archive(id);
      setSupplier(data || supplier);
      setForm((f) => ({ ...f, isActive: false }));
    } catch (e) {
      setError(e.userMessage || "فشل أرشفة المورد");
    } finally {
      setBusy(false);
    }
  };

  const restoreSupplier = async () => {
    const ok = window.confirm("هل أنت متأكد من استرجاع المورد؟");
    if (!ok) return;

    setBusy(true);
    setError("");

    try {
      const data = await suppliersApi.restore(id);
      setSupplier(data || supplier);
      setForm((f) => ({ ...f, isActive: true }));
    } catch (e) {
      setError(e.userMessage || "فشل استرجاع المورد");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-md-none mb-3">
        <div className="mb-2">
          <h3 className="m-0 text-white">تفاصيل المورد</h3>
          <div className="text-white small">{supplier?.name || "..."}</div>
        </div>

        <div className="d-grid gap-2">
          <button className="btn btn-outline-secondary" onClick={() => navigate("/suppliers")}>
            رجوع
          </button>

          {supplier?.isActive ? (
            <button className="btn btn-outline-danger" onClick={archiveSupplier} disabled={busy || loading}>
              أرشفة
            </button>
          ) : (
            <button className="btn btn-outline-success" onClick={restoreSupplier} disabled={busy || loading}>
              استرجاع
            </button>
          )}
        </div>
      </div>

      <div className="d-none d-md-flex flex-row-reverse justify-content-between align-items-center mb-3">
        <div>
          <h3 className="m-0 text-white">تفاصيل المورد</h3>
          <div className="text-white small">{supplier?.name || "..."}</div>
        </div>

        <div className="d-flex flex-row-reverse gap-2">
          <button className="btn btn-outline-secondary" onClick={() => navigate("/suppliers")}>
            رجوع
          </button>

          {supplier?.isActive ? (
            <button className="btn btn-outline-danger" onClick={archiveSupplier} disabled={busy || loading}>
              أرشفة
            </button>
          ) : (
            <button className="btn btn-outline-success" onClick={restoreSupplier} disabled={busy || loading}>
              استرجاع
            </button>
          )}
        </div>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {loading ? (
        <div className="card">
          <div className="card-body text-center py-4">جاري التحميل...</div>
        </div>
      ) : !supplier ? (
        <div className="card">
          <div className="card-body text-center py-4 text-secondary">المورد غير موجود</div>
        </div>
      ) : (
        <>
          <div className="card mb-3">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <div className="small text-secondary">الحالة</div>
                  <div>
                    <span className={`badge ${statusBadge(form.isActive)}`}>
                      {statusLabel(form.isActive)}
                    </span>
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <div className="small text-secondary">أضيف بواسطة</div>
                  <div>{supplier.createdByName || "—"}</div>
                </div>

                <div className="col-12 col-md-4">
                  <div className="small text-secondary">تاريخ الإضافة</div>
                  <div>{formatDate(supplier.createdAt)}</div>
                </div>

                <div className="col-12 col-md-4">
                  <div className="small text-secondary">آخر تعديل</div>
                  <div>{formatDate(supplier.updatedAt)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <form onSubmit={save}>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">اسم المورد</label>
                    <input
                      className="form-control"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">رقم الهاتف</label>
                    <input
                      className="form-control"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">العنوان</label>
                    <input
                      className="form-control"
                      value={form.address}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">ملاحظات</label>
                    <textarea
                      className="form-control"
                      rows={5}
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>

                  <div className="col-12">
                    <div className="form-check">
                      <input
                        id="supplier-is-active-edit"
                        className="form-check-input"
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, isActive: e.target.checked }))
                        }
                      />
                      <label htmlFor="supplier-is-active-edit" className="form-check-label">
                        المورد نشط
                      </label>
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-2 mt-4 flex-wrap">
                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    {busy ? "جاري الحفظ..." : "حفظ التعديلات"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={loadSupplier}
                    disabled={busy}
                  >
                    إعادة تحميل
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}