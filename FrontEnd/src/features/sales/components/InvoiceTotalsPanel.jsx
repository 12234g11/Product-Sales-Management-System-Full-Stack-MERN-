import { FiCheckCircle, FiPrinter, FiSave } from "react-icons/fi";
import { formatMoney, formatNumber, returnStatusLabel } from "../utils/salesFormatters";

export default function InvoiceTotalsPanel({
  invoice,
  discountValue,
  onDiscountChange,
  onApplyDiscount,
  discountBusy,
  disabled,
  onFinalize,
  finalizeBusy,
  onPrint,
}) {
  const hasItems = Number(invoice?.totalItemsQty || 0) > 0;
  const showPrint = invoice?.status === "finalized";

  return (
    <div className="card h-100">
      <div className="card-body">
        <h5 className="mb-3">ملخص الفاتورة</h5>

        <div className="d-grid gap-2 mb-4">
          <div className="d-flex justify-content-between">
            <span className="text-secondary">الإجمالي قبل الخصم</span>
            <strong>{formatMoney(invoice?.subtotal)}</strong>
          </div>

          <div className="d-flex justify-content-between">
            <span className="text-secondary">إجمالي الخصومات</span>
            <strong>{formatMoney(invoice?.totalDiscountAmount)}</strong>
          </div>

          <div className="d-flex justify-content-between">
            <span className="text-secondary">الإجمالي النهائي</span>
            <strong>{formatMoney(invoice?.totalAmount)}</strong>
          </div>

          <div className="d-flex justify-content-between">
            <span className="text-secondary">إجمالي الكميات</span>
            <strong>{formatNumber(invoice?.totalItemsQty)}</strong>
          </div>

          <div className="d-flex justify-content-between">
            <span className="text-secondary">خصم الفاتورة %</span>
            <strong>{formatNumber(invoice?.invoiceDiscountPercent)}</strong>
          </div>

          <div className="d-flex justify-content-between">
            <span className="text-secondary">حالة المرتجع</span>
            <strong>{returnStatusLabel(invoice?.returnStatus)}</strong>
          </div>
        </div>

        <div className="border-top pt-3">
          <label className="form-label">خصم الفاتورة بالكامل %</label>
          <div className="input-group mb-3">
            <input
              type="number"
              className="form-control"
              min="0"
              max="100"
              value={discountValue}
              onChange={onDiscountChange}
              disabled={disabled || discountBusy}
            />
            <button
              className="btn btn-outline-primary"
              onClick={onApplyDiscount}
              disabled={disabled || discountBusy}
            >
<FiSave className="ms-1" aria-hidden="true" />
              {discountBusy ? "جاري التطبيق..." : "تطبيق"}
            </button>
          </div>
        </div>

        <div className="d-grid gap-2">
          <button
            className="btn btn-success"
            onClick={onFinalize}
            disabled={disabled || !hasItems || finalizeBusy}
          >
<FiCheckCircle className="ms-1" aria-hidden="true" />
            {finalizeBusy ? "جاري التأكيد..." : "تأكيد البيع"}
          </button>

          {showPrint && (
            <button className="btn btn-info fw-bold" onClick={onPrint}>
<FiPrinter className="ms-1" aria-hidden="true" />
              طباعة الفاتورة PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
}