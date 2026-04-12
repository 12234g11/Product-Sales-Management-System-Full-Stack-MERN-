import { useEffect, useMemo, useState } from "react";
import {
  formatMoney,
  formatNumber,
  getAvailableReturnQty,
  returnStatusLabel,
  stockStatusLabel,
} from "../utils/salesFormatters";

const DEFAULT_ITEM_STATUS = "restocked";

export default function CreateReturnModal({ show, invoice, busy, onClose, onSubmit }) {
  const [mode, setMode] = useState("partial");
  const [defaultStockStatus, setDefaultStockStatus] = useState("restocked");
  const [lines, setLines] = useState({});
  const [lineErrors, setLineErrors] = useState({});
  const [formError, setFormError] = useState("");

  const items = Array.isArray(invoice?.items) ? invoice.items : [];

  const availableItems = useMemo(
    () => items.filter((item) => getAvailableReturnQty(item) > 0),
    [items]
  );

  useEffect(() => {
    if (!show) return;
    setMode("partial");
    setDefaultStockStatus("restocked");
    setLines({});
    setLineErrors({});
    setFormError("");
  }, [show, invoice]);

  if (!show) return null;

  const getItemKey = (item) => item._id || item.id;

  const validateSingleLine = (item, rawValue) => {
    const max = getAvailableReturnQty(item);
    const value = Number(rawValue);

    if (rawValue === "" || rawValue == null) return "";
    if (!Number.isFinite(value)) return "أدخل رقم صحيح";
    if (!Number.isInteger(value)) return "الكمية لازم تكون رقم صحيح";
    if (value < 0) return "الكمية لا يمكن أن تكون أقل من 0";
    if (value > max) return `الكمية المتاحة للإرجاع ${formatNumber(max)} فقط`;

    return "";
  };

  const updateLine = (item, patch) => {
    const key = getItemKey(item);

    setLines((prev) => {
      const nextLine = {
        qtyReturned: prev[key]?.qtyReturned ?? 0,
        returnStockStatus:
          prev[key]?.returnStockStatus || DEFAULT_ITEM_STATUS,
        productId: item.productId,
        ...patch,
      };

      if (patch.qtyReturned !== undefined) {
        const errorMessage = validateSingleLine(item, patch.qtyReturned);
        setLineErrors((prevErrors) => ({
          ...prevErrors,
          [key]: errorMessage,
        }));
      }

      return {
        ...prev,
        [key]: nextLine,
      };
    });

    setFormError("");
  };

  const validatePartialForm = () => {
    const nextErrors = {};
    let hasAnyQty = false;

    for (const item of availableItems) {
      const key = getItemKey(item);
      const entry = lines[key];
      const rawQty = entry?.qtyReturned ?? 0;
      const qtyReturned = Number(rawQty);

      if (qtyReturned > 0) hasAnyQty = true;

      const errorMessage = validateSingleLine(item, rawQty);
      if (errorMessage) {
        nextErrors[key] = errorMessage;
      }
    }

    setLineErrors(nextErrors);

    if (!hasAnyQty) {
      setFormError("أدخل كمية مرتجع على الأقل لصنف واحد");
      return false;
    }

    if (Object.values(nextErrors).some(Boolean)) {
      setFormError("راجع الكميات المدخلة، يوجد صنف بكمية أكبر من المتاح");
      return false;
    }

    setFormError("");
    return true;
  };

  const handleSubmit = () => {
    if (mode === "full") {
      onSubmit({
        invoiceId: invoice.id || invoice._id,
        type: "full",
        defaultStockStatus,
      });
      return;
    }

    if (!validatePartialForm()) return;

    const payloadItems = availableItems
      .map((item) => {
        const entry = lines[getItemKey(item)];
        const qtyReturned = Number(entry?.qtyReturned || 0);
        if (!qtyReturned) return null;

        return {
          productId: item.productId,
          qtyReturned,
          returnStockStatus:
            entry?.returnStockStatus || DEFAULT_ITEM_STATUS,
        };
      })
      .filter(Boolean);

    onSubmit({
      invoiceId: invoice.id || invoice._id,
      type: "partial",
      items: payloadItems,
    });
  };

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: "block" }}
        tabIndex="-1"
        aria-modal="true"
        role="dialog"
      >
        <div className="modal-dialog modal-xl modal-fullscreen-md-down">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">إنشاء مرتجع</h5>
              <button
                className="btn-close ms-0 me-auto"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            <div className="modal-body">
              <div className="alert alert-light border">
                <div className="fw-semibold">الفاتورة: {invoice?.invoiceCode}</div>
                <div className="small text-secondary mt-1">
                  حالة المرتجع الحالية: {returnStatusLabel(invoice?.returnStatus)} •
                  إجمالي المسترد: {formatMoney(invoice?.totalRefundedAmount)}
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">نوع المرتجع</label>
                  <select
                    className="form-select"
                    value={mode}
                    onChange={(e) => {
                      setMode(e.target.value);
                      setLineErrors({});
                      setFormError("");
                    }}
                  >
                    <option value="partial">مرتجع جزئي</option>
                    <option value="full">مرتجع كامل</option>
                  </select>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">الحالة الافتراضية</label>
                  <select
                    className="form-select"
                    value={defaultStockStatus}
                    onChange={(e) => setDefaultStockStatus(e.target.value)}
                  >
                    <option value="restocked">{stockStatusLabel("restocked")}</option>
                    <option value="damaged">{stockStatusLabel("damaged")}</option>
                  </select>
                </div>
              </div>

              {formError && (
                <div className="alert alert-danger py-2">{formError}</div>
              )}

              {mode === "partial" && (
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th className="text-end">الصنف</th>
                        <th className="text-end">المباع</th>
                        <th className="text-end">تم إرجاع</th>
                        <th className="text-end">المتاح</th>
                        <th className="text-end">الكمية المرتجعة</th>
                        <th className="text-end">الحالة</th>
                      </tr>
                    </thead>

                    <tbody>
                      {availableItems.map((item) => {
                        const key = getItemKey(item);
                        const entry = lines[key] || {
                          qtyReturned: 0,
                          returnStockStatus: DEFAULT_ITEM_STATUS,
                        };
                        const max = getAvailableReturnQty(item);
                        const errorMessage = lineErrors[key] || "";

                        return (
                          <tr key={key}>
                            <td className="text-end">
                              <div className="fw-semibold">{item.productName}</div>
                              <div className="small text-secondary">
                                {item.productId}
                              </div>
                            </td>

                            <td className="text-end">{formatNumber(item.quantity)}</td>
                            <td className="text-end">{formatNumber(item.returnedQty)}</td>
                            <td className="text-end fw-semibold">{formatNumber(max)}</td>

                            <td className="text-end" style={{ minWidth: 180 }}>
                              <input
                                className={`form-control ${errorMessage ? "is-invalid" : ""}`}
                                type="number"
                                min="0"
                                max={max}
                                value={entry.qtyReturned}
                                onChange={(e) =>
                                  updateLine(item, { qtyReturned: e.target.value })
                                }
                              />
                              {errorMessage && (
                                <div className="invalid-feedback d-block text-end">
                                  {errorMessage}
                                </div>
                              )}
                            </td>

                            <td className="text-end" style={{ minWidth: 160 }}>
                              <select
                                className="form-select"
                                value={entry.returnStockStatus}
                                onChange={(e) =>
                                  updateLine(item, {
                                    returnStockStatus: e.target.value,
                                  })
                                }
                              >
                                <option value="restocked">رجع للمخزن</option>
                                <option value="damaged">تالف</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-outline-secondary"
                onClick={onClose}
                disabled={busy}
              >
                إلغاء
              </button>

              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={busy}
              >
                {busy
                  ? "جاري الإنشاء..."
                  : mode === "full"
                  ? "تأكيد المرتجع الكامل"
                  : "إنشاء المرتجع"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}