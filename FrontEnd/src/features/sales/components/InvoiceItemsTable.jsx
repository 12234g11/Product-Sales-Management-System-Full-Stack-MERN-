import { useEffect, useState } from "react";
import { FiSave, FiTrash2 } from "react-icons/fi";
import {
  formatMoney,
  formatNumber,
  getAvailableReturnQty,
  isDraft,
} from "../utils/salesFormatters";

function EditableNumber({ value, min = 0, step = 1, disabled, onSave }) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <div
      className="d-grid gap-2 ms-auto"
      style={{ minWidth: 160, maxWidth: 180 }}
    >
      <input
        className="form-control form-control-sm text-center"
        type="number"
        min={min}
        step={step}
        value={local}
        disabled={disabled}
        onChange={(e) => setLocal(e.target.value)}
      />
      <button
        type="button"
        className="btn btn-sm btn-outline-primary w-100 d-inline-flex align-items-center justify-content-center gap-1"
        disabled={disabled}
        onClick={() => onSave(Number(local))}
      >
        <FiSave aria-hidden="true" />
        حفظ
      </button>
    </div>
  );
}

export default function InvoiceItemsTable({
  invoice,
  busy,
  onUpdateQty,
  onApplyItemDiscount,
  onRemoveItem,
}) {
  const draft = isDraft(invoice);
  const items = Array.isArray(invoice?.items) ? invoice.items : [];

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h5 className="m-0">أصناف الفاتورة</h5>
          <div className="small text-secondary">
            {draft
              ? "التعديل مسموح لأن الفاتورة ما زالت مسودة"
              : "الفاتورة مؤكدة وكل السطور أصبحت للقراءة فقط"}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-4 text-secondary">
            لا توجد أصناف داخل الفاتورة
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle table-hover">
              <thead>
                <tr>
                  <th className="text-end" style={{ minWidth: 220 }}>
                    الصنف
                  </th>
                  <th className="text-end" style={{ minWidth: 120 }}>
                    سعر البيع
                  </th>
                  <th className="text-end" style={{ minWidth: 190 }}>
                    الكمية
                  </th>
                  <th className="text-end" style={{ minWidth: 190 }}>
                    خصم الصنف %
                  </th>
                  <th className="text-end" style={{ minWidth: 110 }}>
                    تم إرجاع
                  </th>
                  <th className="text-end" style={{ minWidth: 130 }}>
                    المتاح للمرتجع
                  </th>
                  <th className="text-end" style={{ minWidth: 150 }}>
                    الإجمالي الصافي
                  </th>
                  <th className="text-end" style={{ minWidth: 110 }}>
                    إجراءات
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item._id || item.id}>
                    <td className="text-end">
                      <div className="fw-semibold">{item.productName}</div>
                      <div className="small text-secondary">
                        {item.productCategory || "بدون قسم"} • {item.productId}
                      </div>
                    </td>

                    <td className="text-end">{formatMoney(item.salePrice)}</td>

                    <td className="text-end" style={{ minWidth: 190 }}>
                      {draft ? (
                        <EditableNumber
                          value={item.quantity}
                          min={1}
                          disabled={busy}
                          onSave={(value) => onUpdateQty(item, value)}
                        />
                      ) : (
                        formatNumber(item.quantity)
                      )}
                    </td>

                    <td className="text-end" style={{ minWidth: 190 }}>
                      {draft ? (
                        <EditableNumber
                          value={item.itemDiscountPercent || 0}
                          min={0}
                          step={0.5}
                          disabled={busy}
                          onSave={(value) => onApplyItemDiscount(item, value)}
                        />
                      ) : (
                        formatNumber(item.itemDiscountPercent)
                      )}
                    </td>

                    <td className="text-end">
                      {formatNumber(item.returnedQty)}
                    </td>

                    <td className="text-end">
                      {formatNumber(getAvailableReturnQty(item))}
                    </td>

                    <td className="text-end fw-semibold">
                      {formatMoney((item.unitNetPrice || 0) * (item.quantity || 0))}
                    </td>

                    <td className="text-end">
                      {draft ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1"
                          disabled={busy}
                          onClick={() => onRemoveItem(item)}
                        >
                          <FiTrash2 aria-hidden="true" />
                          حذف
                        </button>
                      ) : (
                        <span className="text-secondary small">لا يوجد</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}