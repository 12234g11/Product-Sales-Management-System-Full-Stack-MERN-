import { formatDateTime, invoiceStatusLabel } from "../utils/salesFormatters";

export default function InvoiceHeaderCard({
  draftForm,
  onDraftChange,
  onCreateDraft,
  invoice,
  busy,
  creating,
}) {
  const isCreated = Boolean(invoice?._id || invoice?.id);

  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div>
            <h5 className="m-0">بيانات الفاتورة</h5>
            <div className="text-secondary small mt-1">
              ابدأ بمسودة جديدة ثم أضف الأصناف والخصومات وبعدها أكد البيع.
            </div>
          </div>
          {isCreated && (
            <span className={`badge ${invoice?.status === "draft" ? "text-bg-warning" : "text-bg-success"}`}>
              {invoiceStatusLabel(invoice?.status)}
            </span>
          )}
        </div>

        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label">كود الفاتورة *</label>
            <input
              className="form-control"
              name="invoiceCode"
              value={draftForm.invoiceCode}
              onChange={onDraftChange}
              disabled={isCreated || busy}
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">اسم الفاتورة</label>
            <input
              className="form-control"
              name="name"
              value={draftForm.name}
              onChange={onDraftChange}
              disabled={isCreated || busy}
            />
          </div>
        </div>

        {!isCreated ? (
          <div className="mt-3">
            <button className="btn btn-primary" onClick={onCreateDraft} disabled={creating || busy}>
              {creating ? "جاري إنشاء المسودة..." : "إنشاء مسودة"}
            </button>
          </div>
        ) : (
          <div className="row g-3 mt-1">
            <div className="col-12 col-md-4">
              <div className="border rounded p-3 bg-body-tertiary h-100">
                <div className="small text-secondary">الكود</div>
                <div className="fw-bold">{invoice.invoiceCode}</div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="border rounded p-3 bg-body-tertiary h-100">
                <div className="small text-secondary">الكاشير</div>
                <div className="fw-bold">{invoice.createdByName || "-"}</div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="border rounded p-3 bg-body-tertiary h-100">
                <div className="small text-secondary">تاريخ الإنشاء</div>
                <div className="fw-bold">{formatDateTime(invoice.createdAt) || "-"}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
