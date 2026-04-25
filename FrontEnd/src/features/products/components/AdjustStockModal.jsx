import { useEffect, useMemo, useState } from "react";
import { translateApiError } from "../../../services/http/errorMap";

const REASONS = [
  { value: "inventory_count", label: "جرد مخزون" },
  { value: "opening_balance", label: "رصيد افتتاحي" },
  { value: "damaged", label: "تالف" },
  { value: "correction", label: "تصحيح" },
  { value: "other", label: "أخرى" },
];

export default function AdjustStockModal({
  show,
  product,
  busy,
  error,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState({
    mode: "set",
    newQuantity: "",
    delta: "",
    reason: "inventory_count",
    note: "",
  });

  useEffect(() => {
    if (!show) return;
    setForm({
      mode: "set",
      newQuantity: String(product?.quantity ?? 0),
      delta: "",
      reason: "inventory_count",
      note: "",
    });
  }, [show, product]);

  const noteRequired = useMemo(
    () => form.reason === "correction" || form.reason === "other",
    [form.reason]
  );

  const translatedError = useMemo(
    () => (error ? translateApiError(error) : ""),
    [error]
  );

  const submit = async (e) => {
    e.preventDefault();

    const payload = {
      mode: form.mode,
      reason: form.reason,
      note: String(form.note || "").trim(),
    };

    if (form.mode === "delta") {
      payload.delta = Number(form.delta);
    } else {
      payload.newQuantity = Number(form.newQuantity);
    }

    await onSubmit(payload);
  };

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
        <div className="modal-dialog modal-fullscreen-sm-down modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">تسوية مخزون</h5>
              <button
                type="button"
                className="btn-close ms-0 me-auto"
                onClick={onClose}
                aria-label="Close"
                disabled={busy}
              />
            </div>

            <form onSubmit={submit}>
              <div className="modal-body">
                <div className="mb-3">
                  <div className="fw-bold">{product?.name}</div>
                  <div className="text-secondary small">
                    {product?.id} • الكمية الحالية: {Number(product?.quantity || 0)}
                  </div>
                </div>

                {translatedError ? <div className="alert alert-danger">{translatedError}</div> : null}

                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label d-block">وضع التعديل</label>

                    <div className="d-flex gap-3 flex-wrap">
                      <div className="form-check">
                        <input
                          id="adjust-mode-set"
                          className="form-check-input"
                          type="radio"
                          checked={form.mode === "set"}
                          onChange={() => setForm((f) => ({ ...f, mode: "set" }))}
                        />
                        <label htmlFor="adjust-mode-set" className="form-check-label">
                          تحديد كمية جديدة
                        </label>
                      </div>

                      <div className="form-check">
                        <input
                          id="adjust-mode-delta"
                          className="form-check-input"
                          type="radio"
                          checked={form.mode === "delta"}
                          onChange={() => setForm((f) => ({ ...f, mode: "delta" }))}
                        />
                        <label htmlFor="adjust-mode-delta" className="form-check-label">
                          زيادة / نقص بالمقدار
                        </label>
                      </div>
                    </div>
                  </div>

                  {form.mode === "set" ? (
                    <div className="col-12 col-md-6">
                      <label className="form-label">الكمية الجديدة</label>
                      <input
                        className="form-control"
                        type="number"
                        min={0}
                        step={1}
                        value={form.newQuantity}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, newQuantity: e.target.value }))
                        }
                        required
                      />
                    </div>
                  ) : (
                    <div className="col-12 col-md-6">
                      <label className="form-label">الفرق (+ / -)</label>
                      <input
                        className="form-control"
                        type="number"
                        step={1}
                        value={form.delta}
                        onChange={(e) => setForm((f) => ({ ...f, delta: e.target.value }))}
                        required
                      />
                      <div className="form-text">مثال: 5 أو -3</div>
                    </div>
                  )}

                  <div className="col-12 col-md-6">
                    <label className="form-label">السبب</label>
                    <select
                      className="form-select"
                      value={form.reason}
                      onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                      required
                    >
                      {REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label">
                      ملاحظة {noteRequired ? <span className="text-danger">*</span> : null}
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={form.note}
                      onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                      required={noteRequired}
                    />
                    {noteRequired ? (
                      <div className="form-text">
                        الملاحظة مطلوبة في حالة التصحيح أو أخرى.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={busy}
                >
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? "جاري الحفظ..." : "حفظ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="modal-backdrop fade show" onClick={busy ? undefined : onClose} />
    </>
  );
}
