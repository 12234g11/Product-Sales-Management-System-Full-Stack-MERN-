import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { purchasesApi } from "../api/purchasesApi";
import { productsApi } from "../../products/api/productsApi";

function formatNumber(n) {
  return new Intl.NumberFormat("ar-EG").format(Number(n || 0));
}

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(dt);
}

function statusLabel(status) {
  if (status === "draft") return "مسودة";
  if (status === "finalized") return "معتمدة";
  if (status === "cancelled") return "ملغية";
  return status || "—";
}

function statusBadge(status) {
  if (status === "draft") return "text-bg-warning";
  if (status === "finalized") return "text-bg-success";
  if (status === "cancelled") return "text-bg-danger";
  return "text-bg-secondary";
}

function AddPurchaseItemModal({ show, busy, error, onClose, onSubmit }) {
  const [useNewProduct, setUseNewProduct] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [productOptions, setProductOptions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [candidateProducts, setCandidateProducts] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [form, setForm] = useState({
    quantity: "1",
    purchasePrice: "",
    newProductId: "",
    newProductName: "",
    newProductCategory: "",
    newProductSalePrice: "",
    newProductMinStock: "0",
  });

  useEffect(() => {
    if (!show) return;

    setUseNewProduct(false);
    setProductQuery("");
    setProductOptions([]);
    setSelectedProduct(null);
    setCandidateProducts([]);
    setForm({
      quantity: "1",
      purchasePrice: "",
      newProductId: "",
      newProductName: "",
      newProductCategory: "",
      newProductSalePrice: "",
      newProductMinStock: "0",
    });
  }, [show]);

  useEffect(() => {
    if (!show || useNewProduct) return;

    const q = String(productQuery || "").trim();
    if (!q) {
      setProductOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingOptions(true);
      try {
        const rows = await productsApi.autoComplete(q);
        setProductOptions(Array.isArray(rows) ? rows : []);
      } catch {
        setProductOptions([]);
      } finally {
        setLoadingOptions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [show, useNewProduct, productQuery]);

  const submit = async (e) => {
    e.preventDefault();

    const payload = {
      quantity: Number(form.quantity),
    };

    if (useNewProduct) {
      payload.purchasePrice = Number(form.purchasePrice);
      payload.newProduct = {
        id: String(form.newProductId || "").trim(),
        name: String(form.newProductName || "").trim(),
        category: String(form.newProductCategory || "").trim(),
        salePrice: Number(form.newProductSalePrice),
        minStock: Number(form.newProductMinStock),
      };
    } else {
      if (selectedProduct?.id) {
        payload.productId = selectedProduct.id;
      } else {
        payload.name = String(productQuery || "").trim();
      }

      if (String(form.purchasePrice || "").trim() !== "") {
        payload.purchasePrice = Number(form.purchasePrice);
      }
    }

    try {
      await onSubmit(payload);
      setCandidateProducts([]);
    } catch (e2) {
      const candidates = e2?.response?.data?.data?.candidates;
      if (Array.isArray(candidates) && candidates.length > 0) {
        setCandidateProducts(candidates);
      }
    }
  };

  const submitCandidate = async (candidate) => {
    const payload = {
      productId: candidate.id,
      quantity: Number(form.quantity),
    };

    if (String(form.purchasePrice || "").trim() !== "") {
      payload.purchasePrice = Number(form.purchasePrice);
    }

    await onSubmit(payload);
    setCandidateProducts([]);
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
              <h5 className="modal-title">إضافة صنف</h5>
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
                {error ? <div className="alert alert-danger">{error}</div> : null}

                <div className="mb-3">
                  <div className="form-check form-switch">
                    <input
                      id="new-product-switch"
                      className="form-check-input"
                      type="checkbox"
                      checked={useNewProduct}
                      onChange={(e) => setUseNewProduct(e.target.checked)}
                    />
                    <label htmlFor="new-product-switch" className="form-check-label">
                      منتج جديد
                    </label>
                  </div>
                </div>

                {!useNewProduct ? (
                  <div className="row g-3">
                    <div className="col-12 position-relative">
                      <label className="form-label">اختيار صنف موجود</label>
                      <input
                        className="form-control"
                        value={productQuery}
                        onChange={(e) => {
                          setProductQuery(e.target.value);
                          if (selectedProduct && e.target.value !== selectedProduct.name) {
                            setSelectedProduct(null);
                          }
                        }}
                        placeholder="اكتب اسم أو كود المنتج"
                        required
                      />

                      {loadingOptions ? (
                        <div className="form-text">جاري البحث...</div>
                      ) : null}

                      {productOptions.length > 0 ? (
                        <div
                          className="list-group position-absolute w-100 mt-1 shadow-sm"
                          style={{ zIndex: 20 }}
                        >
                          {productOptions.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="list-group-item list-group-item-action text-end"
                              onClick={() => {
                                setSelectedProduct(p);
                                setProductQuery(p.name);
                                setProductOptions([]);
                              }}
                            >
                              <div className="fw-semibold">
                                {p.name} <span className="text-secondary">({p.id})</span>
                              </div>
                              <div className="small text-secondary">
                                {p.category} • شراء: {formatNumber(p.purchasePrice)} • بيع:{" "}
                                {formatNumber(p.salePrice)}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">الكمية</label>
                      <input
                        className="form-control"
                        type="number"
                        min={1}
                        step={1}
                        value={form.quantity}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, quantity: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">سعر الشراء (اختياري)</label>
                      <input
                        className="form-control"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.purchasePrice}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, purchasePrice: e.target.value }))
                        }
                      />
                      <div className="form-text">
                        لو سيبته فاضي، السيستم هياخد السعر الحالي من المنتج.
                      </div>
                    </div>

                    {candidateProducts.length > 0 ? (
                      <div className="col-12">
                        <div className="alert alert-warning mb-2">
                          يوجد أكثر من منتج بنفس الاسم. اختر المنتج الصحيح:
                        </div>

                        <div className="d-flex gap-2 flex-wrap">
                          {candidateProducts.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              className="btn btn-outline-primary"
                              disabled={busy}
                              onClick={() => submitCandidate(c)}
                            >
                              {c.name} ({c.id})
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label">كود المنتج</label>
                      <input
                        className="form-control"
                        value={form.newProductId}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, newProductId: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">اسم المنتج</label>
                      <input
                        className="form-control"
                        value={form.newProductName}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, newProductName: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">الفئة</label>
                      <input
                        className="form-control"
                        value={form.newProductCategory}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, newProductCategory: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">سعر البيع</label>
                      <input
                        className="form-control"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.newProductSalePrice}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, newProductSalePrice: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">الحد الأدنى</label>
                      <input
                        className="form-control"
                        type="number"
                        min={0}
                        step={1}
                        value={form.newProductMinStock}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, newProductMinStock: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">سعر الشراء</label>
                      <input
                        className="form-control"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.purchasePrice}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, purchasePrice: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">الكمية</label>
                      <input
                        className="form-control"
                        type="number"
                        min={1}
                        step={1}
                        value={form.quantity}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, quantity: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? "جاري الحفظ..." : "إضافة"}
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

function EditPurchaseItemModal({ show, item, busy, error, onClose, onSubmit }) {
  const [form, setForm] = useState({ quantity: "", purchasePrice: "" });

  useEffect(() => {
    if (!show || !item) return;
    setForm({
      quantity: String(item.quantity ?? ""),
      purchasePrice: String(item.purchasePrice ?? ""),
    });
  }, [show, item]);

  const submit = async (e) => {
    e.preventDefault();
    await onSubmit({
      quantity: Number(form.quantity),
      purchasePrice: Number(form.purchasePrice),
    });
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
        <div className="modal-dialog modal-fullscreen-sm-down" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">تعديل البند</h5>
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
                {error ? <div className="alert alert-danger">{error}</div> : null}

                <div className="mb-3">
                  <div className="fw-bold">{item?.productName}</div>
                  <div className="small text-secondary">{item?.productId}</div>
                </div>

                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">الكمية</label>
                    <input
                      className="form-control"
                      type="number"
                      min={1}
                      step={1}
                      value={form.quantity}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, quantity: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">سعر الشراء</label>
                    <input
                      className="form-control"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.purchasePrice}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, purchasePrice: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>
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

function ConfirmDeleteModal({ show, busy, item, onClose, onConfirm }) {
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
        <div className="modal-dialog modal-fullscreen-sm-down" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">حذف بند</h5>
              <button
                type="button"
                className="btn-close ms-0 me-auto"
                onClick={onClose}
                aria-label="Close"
                disabled={busy}
              />
            </div>

            <div className="modal-body">
              هل أنت متأكد أنك تريد حذف:
              <div className="mt-2 fw-bold">
                {item?.productName} <span className="text-secondary">({item?.productId})</span>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>
                إلغاء
              </button>
              <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>
                {busy ? "جاري الحذف..." : "حذف"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="modal-backdrop fade show" onClick={busy ? undefined : onClose} />
    </>
  );
}

export default function PurchaseInvoiceDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);

  const loadInvoice = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await purchasesApi.getById(id);
      setInvoice(data?.invoice || null);
    } catch (e) {
      setError(e.userMessage || "فشل تحميل الفاتورة");
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const isDraft = invoice?.status === "draft";

  const lineSummary = useMemo(() => {
    const rows = Array.isArray(invoice?.items) ? invoice.items : [];
    return rows.map((it) => ({
      ...it,
      lineTotal: Number(it.quantity || 0) * Number(it.purchasePrice || 0),
    }));
  }, [invoice]);

  const addItem = async (payload) => {
    setBusy(true);
    setError("");
    try {
      const data = await purchasesApi.addItem(id, payload);
      setInvoice(data?.invoice || invoice);
      setShowAdd(false);
      return data;
    } catch (e) {
      setError(e.userMessage || "فشل إضافة الصنف");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const updateItem = async (payload) => {
    if (!selectedItem?.id) return;

    setBusy(true);
    setError("");
    try {
      const data = await purchasesApi.updateItem(id, selectedItem.id, payload);
      setInvoice(data?.invoice || invoice);
      setShowEdit(false);
      setSelectedItem(null);
    } catch (e) {
      setError(e.userMessage || "فشل تعديل البند");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async () => {
    if (!selectedItem?.id) return;

    setBusy(true);
    setError("");
    try {
      const data = await purchasesApi.removeItem(id, selectedItem.id);
      setInvoice(data?.invoice || invoice);
      setShowDelete(false);
      setSelectedItem(null);
    } catch (e) {
      setError(e.userMessage || "فشل حذف البند");
    } finally {
      setBusy(false);
    }
  };

  const finalizeInvoice = async () => {
    const ok = window.confirm("هل أنت متأكد من اعتماد فاتورة الشراء؟");
    if (!ok) return;

    setBusy(true);
    setError("");
    try {
      const data = await purchasesApi.finalize(id);
      setInvoice(data?.invoice || invoice);
    } catch (e) {
      setError(e.userMessage || "فشل اعتماد الفاتورة");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-md-none mb-3">
        <div className="mb-2">
          <h3 className="m-0 text-white">تفاصيل فاتورة شراء</h3>
          <div className="text-white small">{invoice?.invoiceCode || "..."}</div>
        </div>

        <div className="d-grid gap-2">
          <button className="btn btn-outline-secondary" onClick={() => navigate("/purchases")}>
            رجوع
          </button>

          {isDraft ? (
            <>
              <button className="btn btn-primary" onClick={() => setShowAdd(true)} disabled={busy || loading}>
                إضافة صنف
              </button>
              <button className="btn btn-success" onClick={finalizeInvoice} disabled={busy || loading}>
                اعتماد الفاتورة
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="d-none d-md-flex flex-row-reverse justify-content-between align-items-center mb-3">
        <div>
          <h3 className="m-0 text-white">تفاصيل فاتورة شراء</h3>
          <div className="text-white small">{invoice?.invoiceCode || "..."}</div>
        </div>

        <div className="d-flex flex-row-reverse gap-2">
          <button className="btn btn-outline-secondary" onClick={() => navigate("/purchases")}>
            رجوع
          </button>

          {isDraft ? (
            <>
              <button className="btn btn-primary" onClick={() => setShowAdd(true)} disabled={busy || loading}>
                إضافة صنف
              </button>
              <button className="btn btn-success" onClick={finalizeInvoice} disabled={busy || loading}>
                اعتماد الفاتورة
              </button>
            </>
          ) : null}
        </div>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {loading ? (
        <div className="card">
          <div className="card-body text-center py-4">جاري التحميل...</div>
        </div>
      ) : !invoice ? (
        <div className="card">
          <div className="card-body text-center py-4 text-secondary">الفاتورة غير موجودة</div>
        </div>
      ) : (
        <>
          <div className="card mb-3">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <div className="small text-secondary">كود الفاتورة</div>
                  <div className="fw-semibold">{invoice.invoiceCode}</div>
                </div>

                <div className="col-12 col-md-4">
                  <div className="small text-secondary">المورد</div>
                  <div className="fw-semibold">{invoice.supplierName}</div>
                </div>

                <div className="col-12 col-md-4">
                  <div className="small text-secondary">الحالة</div>
                  <div>
                    <span className={`badge ${statusBadge(invoice.status)}`}>
                      {statusLabel(invoice.status)}
                    </span>
                  </div>
                </div>

                <div className="col-12">
                  <div className="small text-secondary">ملاحظات</div>
                  <div>{invoice.notes || "—"}</div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="small text-secondary">أُنشئت بواسطة</div>
                  <div>
                    {invoice.createdByName} • {formatDate(invoice.createdAt)}
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="small text-secondary">الاعتماد</div>
                  <div>
                    {invoice.finalizedByName || "—"} • {formatDate(invoice.finalizedAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              {lineSummary.length === 0 ? (
                <div className="text-center py-4 text-secondary">لا توجد أصناف داخل الفاتورة</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead>
                      <tr>
                        <th className="text-end">كود المنتج</th>
                        <th className="text-end">اسم المنتج</th>
                        <th className="text-end">الفئة</th>
                        <th className="text-end">سعر الشراء</th>
                        <th className="text-end">الكمية</th>
                        <th className="text-end">إجمالي السطر</th>
                        {isDraft ? <th className="text-end" style={{ width: 1 }}></th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {lineSummary.map((it) => (
                        <tr key={it.id}>
                          <td className="text-end fw-semibold">{it.productId}</td>
                          <td className="text-end">{it.productName}</td>
                          <td className="text-end">{it.productCategory}</td>
                          <td className="text-end">{formatNumber(it.purchasePrice)}</td>
                          <td className="text-end">{formatNumber(it.quantity)}</td>
                          <td className="text-end">{formatNumber(it.lineTotal)}</td>
                          {isDraft ? (
                            <td className="text-end">
                              <div className="d-flex gap-2 justify-content-end flex-wrap flex-md-nowrap">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => {
                                    setSelectedItem(it);
                                    setShowEdit(true);
                                  }}
                                  disabled={busy}
                                >
                                  تعديل
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => {
                                    setSelectedItem(it);
                                    setShowDelete(true);
                                  }}
                                  disabled={busy}
                                >
                                  حذف
                                </button>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <div className="small text-secondary">إجمالي عدد القطع</div>
                  <div className="fw-semibold">{formatNumber(invoice.totalItemsQty)}</div>
                </div>

                <div className="col-12 col-md-4">
                  <div className="small text-secondary">الإجمالي الفرعي</div>
                  <div className="fw-semibold">{formatNumber(invoice.subtotal)}</div>
                </div>

                <div className="col-12 col-md-4">
                  <div className="small text-secondary">الإجمالي الكلي</div>
                  <div className="fw-semibold">{formatNumber(invoice.totalAmount)}</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <AddPurchaseItemModal
        show={showAdd}
        busy={busy}
        error={error}
        onClose={() => setShowAdd(false)}
        onSubmit={addItem}
      />

      <EditPurchaseItemModal
        show={showEdit}
        item={selectedItem}
        busy={busy}
        error={error}
        onClose={() => setShowEdit(false)}
        onSubmit={updateItem}
      />

      <ConfirmDeleteModal
        show={showDelete}
        busy={busy}
        item={selectedItem}
        onClose={() => setShowDelete(false)}
        onConfirm={removeItem}
      />
    </div>
  );
}