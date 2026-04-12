import {
  formatDateTime,
  formatMoney,
  returnStatusLabel,
  stockStatusLabel,
} from "../utils/salesFormatters";

export default function InvoiceReturnsSection({
  data = {},
  onOpenCreateReturn,
  canCreateReturn,
}) {
  const rows = Array.isArray(data?.returns) ? data.returns : [];
  const invoice = data?.invoice || {};

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div>
            <h5 className="m-0">المرتجعات على الفاتورة</h5>
            <div className="small text-secondary mt-1">
              حالة المرتجع: {returnStatusLabel(invoice?.returnStatus)} • إجمالي المسترد:{" "}
              {formatMoney(invoice.totalRefundedAmount)}
            </div>
          </div>

          {canCreateReturn && (
            <button className="btn btn-outline-primary" onClick={onOpenCreateReturn}>
              عمل مرتجع
            </button>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-3 text-secondary">
            لا توجد مرتجعات على هذه الفاتورة
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle table-hover">
              <thead>
                <tr>
                  <th className="text-end">التاريخ</th>
                  <th className="text-end">النوع</th>
                  <th className="text-end">الحالة</th>
                  <th className="text-end">الكمية</th>
                  <th className="text-end">المبلغ</th>
                  <th className="text-end">المنشئ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((ret) => (
                  <tr key={ret._id || ret.id}>
                    <td className="text-end">{formatDateTime(ret.createdAt)}</td>
                    <td className="text-end">{ret.type === "full" ? "كامل" : "جزئي"}</td>
                    <td className="text-end">{stockStatusLabel(ret.stockStatus)}</td>
                    <td className="text-end">{ret.totalReturnedQty}</td>
                    <td className="text-end">{formatMoney(ret.totalRefundAmount)}</td>
                    <td className="text-end">{ret.createdByName || "-"}</td>
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