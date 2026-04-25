import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowRight, FiCheckCircle, FiPlusCircle, FiTrash2, FiX } from "react-icons/fi";
import { purchasesApi } from "../api/purchasesApi";
import { productsApi } from "../../products/api/productsApi";

function formatNumber(n) {
  return new Intl.NumberFormat("ar-EG").format(Number(n || 0));
}

function formatPercent(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "غير متاح";
  return `${new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(Number(n))}%`;
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

function priceModeLabel(mode) {
  if (mode === "new_product") return "منتج جديد";
  if (mode === "merge_update") return "دمج وتحديث السعر";
  return "نفس السعر";
}

function marginPercent(purchasePrice, salePrice) {
  const purchase = Number(purchasePrice || 0);
  const sale = Number(salePrice || 0);
  if (!Number.isFinite(purchase) || purchase <= 0) return null;
  return ((sale - purchase) / purchase) * 100;
}

function getItemSalePrice(it) {
  if (it?.salePriceAtPurchase !== null && it?.salePriceAtPurchase !== undefined) {
    return Number(it.salePriceAtPurchase);
  }

  if (it?.newSalePrice !== null && it?.newSalePrice !== undefined) {
    return Number(it.newSalePrice);
  }

  if (it?.oldSalePriceSnapshot !== null && it?.oldSalePriceSnapshot !== undefined) {
    return Number(it.oldSalePriceSnapshot);
  }

  return null;
}

function AddPurchaseItemModal({ show, busy, error, onClose, onSubmit }) {
  const [useNewProduct, setUseNewProduct] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [productOptions, setProductOptions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [candidateProducts, setCandidateProducts] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [localError, setLocalError] = useState("");
  const optionRefs = useRef([]);

  const [priceMode, setPriceMode] = useState("same");

  const [form, setForm] = useState({
    quantity: "1",
    purchasePrice: "",
    salePrice: "",
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
    setLoadingOptions(false);
    setActiveIndex(-1);
    setLocalError("");
    setPriceMode("same");
    setForm({
      quantity: "1",
      purchasePrice: "",
      salePrice: "",
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
      setActiveIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingOptions(true);
      try {
        const rows = await productsApi.autoComplete(q);
        const list = Array.isArray(rows) ? rows : [];
        setProductOptions(list);
        setActiveIndex(list.length ? 0 : -1);
      } catch {
        setProductOptions([]);
        setActiveIndex(-1);
      } finally {
        setLoadingOptions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [show, useNewProduct, productQuery]);

  useEffect(() => {
    if (activeIndex < 0) return;
    const el = optionRefs.current[activeIndex];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeIndex]);

  const pickProduct = async (p) => {
    let product = p;
    try {
      const filled = await productsApi.autoFill({ id: p.id });
      product = filled || p;
    } catch {
      product = p;
    }

    setSelectedProduct(product);
    setProductQuery(`${product.name} (${product.id})`);
    setProductOptions([]);
    setActiveIndex(-1);
    setCandidateProducts([]);
    setLocalError("");
    setPriceMode("same");
    setForm((f) => ({
      ...f,
      purchasePrice: String(product.purchasePrice ?? ""),
      salePrice: String(product.salePrice ?? ""),
      newProductName: product.name || "",
      newProductCategory: product.category || "",
      newProductSalePrice: String(product.salePrice ?? ""),
      newProductMinStock: String(product.minStock ?? 0),
    }));
  };

  const handleProductKeyDown = (e) => {
    if (!productOptions.length || busy) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev >= productOptions.length - 1 ? 0 : prev + 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? productOptions.length - 1 : prev - 1));
      return;
    }

    if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      pickProduct(productOptions[activeIndex]);
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setProductOptions([]);
      setActiveIndex(-1);
    }
  };

  const oldPurchasePrice = Number(selectedProduct?.purchasePrice || 0);
  const oldSalePrice = Number(selectedProduct?.salePrice || 0);
  const newPurchasePrice = Number(form.purchasePrice || 0);
  const newSalePrice = Number(form.salePrice || 0);
  const priceChanged =
    Boolean(selectedProduct) &&
    !useNewProduct &&
    (newPurchasePrice !== oldPurchasePrice || newSalePrice !== oldSalePrice);

  const oldMargin = marginPercent(oldPurchasePrice, oldSalePrice);
  const newMargin = marginPercent(newPurchasePrice, newSalePrice);

  const submit = async (e) => {
    e.preventDefault();
    setLocalError("");

    const qty = Number(form.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      setLocalError("الكمية يجب أن تكون رقمًا صحيحًا أكبر من صفر");
      return;
    }

    const payload = { quantity: qty };

    if (useNewProduct) {
      payload.priceMode = "new_product";
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

      if (selectedProduct?.id && priceChanged) {
        if (!priceMode || priceMode === "same") {
          setLocalError("اختار طريقة التعامل مع السعر الجديد قبل إضافة الصنف");
          return;
        }

        payload.priceMode = priceMode;
        payload.newSalePrice = Number(form.salePrice);

        if (priceMode === "new_product") {
          payload.newProduct = {
            id: String(form.newProductId || "").trim(),
            name: String(form.newProductName || selectedProduct.name || "").trim(),
            category: String(form.newProductCategory || selectedProduct.category || "").trim(),
            salePrice: Number(form.salePrice),
            minStock: Number(form.newProductMinStock || selectedProduct.minStock || 0),
          };
        }
      } else {
        payload.priceMode = "same";
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
      priceMode: "same",
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
              <h5 className="modal-title d-inline-flex align-items-center gap-2">
                <FiPlusCircle aria-hidden="true" />
                إضافة صنف
              </h5>
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
                {localError ? <div className="alert alert-danger">{localError}</div> : null}

                <div className="mb-3">
                  <div className="form-check form-switch">
                    <input
                      id="new-product-switch"
                      className="form-check-input"
                      type="checkbox"
                      checked={useNewProduct}
                      onChange={(e) => {
                        setUseNewProduct(e.target.checked);
                        setSelectedProduct(null);
                        setProductOptions([]);
                        setActiveIndex(-1);
                        setPriceMode(e.target.checked ? "new_product" : "same");
                      }}
                    />
                    <label htmlFor="new-product-switch" className="form-check-label">
                      منتج جديد بالكامل
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
                          setLocalError("");
                          if (selectedProduct && e.target.value !== `${selectedProduct.name} (${selectedProduct.id})`) {
                            setSelectedProduct(null);
                            setPriceMode("same");
                          }
                        }}
                        onKeyDown={handleProductKeyDown}
                        placeholder="اكتب اسم أو كود المنتج"
                        autoComplete="off"
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
                          {productOptions.map((p, index) => {
                            const active = index === activeIndex;

                            return (
                              <button
                                key={p.id}
                                type="button"
                                ref={(el) => {
                                  optionRefs.current[index] = el;
                                }}
                                className={`list-group-item list-group-item-action text-end ${active ? "active" : ""}`}
                                onClick={() => pickProduct(p)}
                                onMouseEnter={() => setActiveIndex(index)}
                              >
                                <div className="fw-semibold">
                                  {p.name} <span className={active ? "text-white-50" : "text-secondary"}>({p.id})</span>
                                </div>
                                <div className={`small ${active ? "text-white-50" : "text-secondary"}`}>
                                  {p.category || "بدون قسم"} • شراء: {formatNumber(p.purchasePrice)} • بيع: {formatNumber(p.salePrice)}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>

                    {selectedProduct ? (
                      <div className="col-12">
                        <div className="border rounded p-3 bg-body-tertiary">
                          <div className="fw-bold">{selectedProduct.name}</div>
                          <div className="small text-secondary mt-1">
                            الكود: {selectedProduct.id} • القسم: {selectedProduct.category || "-"}
                          </div>
                          <div className="row g-2 mt-2 small">
                            <div className="col-12 col-md-6">سعر الشراء الحالي: {formatNumber(oldPurchasePrice)}</div>
                            <div className="col-12 col-md-6">سعر البيع الحالي: {formatNumber(oldSalePrice)}</div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="col-12 col-md-4">
                      <label className="form-label">الكمية</label>
                      <input
                        className="form-control"
                        type="number"
                        min={1}
                        step={1}
                        value={form.quantity}
                        onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">سعر الشراء الجديد</label>
                      <input
                        className="form-control"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.purchasePrice}
                        onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                        placeholder={selectedProduct ? "" : "اختياري"}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label">سعر البيع الجديد</label>
                      <input
                        className="form-control"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.salePrice}
                        onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))}
                        disabled={!selectedProduct}
                      />
                    </div>

                    {priceChanged ? (
                      <div className="col-12">
                        <div className="alert alert-warning mb-3">
                          تم تغيير سعر الشراء أو البيع. اختر طريقة التعامل مع السعر الجديد قبل إضافة الصنف.
                        </div>

                        <div className="border rounded p-3 mb-3">
                          <div className="fw-bold mb-2">إدارة تغيير السعر</div>
                          <div className="row g-2">
                            <div className="col-12 col-md-6">
                              <div className="form-check">
                                <input
                                  id="price-mode-new-product"
                                  className="form-check-input"
                                  type="radio"
                                  name="priceMode"
                                  checked={priceMode === "new_product"}
                                  onChange={() => setPriceMode("new_product")}
                                />
                                <label className="form-check-label" htmlFor="price-mode-new-product">
                                  إضافة كمنتج جديد
                                </label>
                              </div>
                            </div>
                            <div className="col-12 col-md-6">
                              <div className="form-check">
                                <input
                                  id="price-mode-merge-update"
                                  className="form-check-input"
                                  type="radio"
                                  name="priceMode"
                                  checked={priceMode === "merge_update"}
                                  onChange={() => setPriceMode("merge_update")}
                                />
                                <label className="form-check-label" htmlFor="price-mode-merge-update">
                                  دمج وتحديث المنتج الحالي
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>

                        {priceMode === "new_product" ? (
                          <div className="border rounded p-3 mb-3">
                            <div className="fw-bold mb-2">بيانات المنتج الجديد</div>
                            <div className="row g-3">
                              <div className="col-12 col-md-6">
                                <label className="form-label">كود المنتج الجديد</label>
                                <input
                                  className="form-control"
                                  value={form.newProductId}
                                  onChange={(e) => setForm((f) => ({ ...f, newProductId: e.target.value }))}
                                  required
                                />
                              </div>
                              <div className="col-12 col-md-6">
                                <label className="form-label">اسم المنتج الجديد</label>
                                <input
                                  className="form-control"
                                  value={form.newProductName}
                                  onChange={(e) => setForm((f) => ({ ...f, newProductName: e.target.value }))}
                                  required
                                />
                              </div>
                              <div className="col-12 col-md-6">
                                <label className="form-label">القسم</label>
                                <input
                                  className="form-control"
                                  value={form.newProductCategory}
                                  onChange={(e) => setForm((f) => ({ ...f, newProductCategory: e.target.value }))}
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
                                  onChange={(e) => setForm((f) => ({ ...f, newProductMinStock: e.target.value }))}
                                  required
                                />
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {priceMode === "merge_update" ? (
                          <div className="alert alert-info mb-0">
                            <div className="fw-bold mb-2">ملاحظات قبل الدمج</div>
                            <div>سعر الشراء: {formatNumber(oldPurchasePrice)} ← {formatNumber(newPurchasePrice)}، الفرق: {formatNumber(newPurchasePrice - oldPurchasePrice)}</div>
                            <div>سعر البيع: {formatNumber(oldSalePrice)} ← {formatNumber(newSalePrice)}، الفرق: {formatNumber(newSalePrice - oldSalePrice)}</div>
                            <div>نسبة الربح القديمة: {formatPercent(oldMargin)}</div>
                            <div>نسبة الربح الجديدة: {formatPercent(newMargin)}</div>
                            <div className="fw-semibold mt-2">
                              تنبيه: الدمج سيحدث سعر المنتج الحالي لكل المخزون بعد اعتماد فاتورة الشراء.
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

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
                        onChange={(e) => setForm((f) => ({ ...f, newProductId: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">اسم المنتج</label>
                      <input
                        className="form-control"
                        value={form.newProductName}
                        onChange={(e) => setForm((f) => ({ ...f, newProductName: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">الفئة</label>
                      <input
                        className="form-control"
                        value={form.newProductCategory}
                        onChange={(e) => setForm((f) => ({ ...f, newProductCategory: e.target.value }))}
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
                        onChange={(e) => setForm((f) => ({ ...f, newProductSalePrice: e.target.value }))}
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
                        onChange={(e) => setForm((f) => ({ ...f, newProductMinStock: e.target.value }))}
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
                        onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
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
                        onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary d-inline-flex align-items-center gap-1" onClick={onClose} disabled={busy}>
                  <FiX aria-hidden="true" />
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary d-inline-flex align-items-center gap-1" disabled={busy}>
                  <FiPlusCircle aria-hidden="true" />
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
              <h5 className="modal-title d-inline-flex align-items-center gap-2">
                <FiTrash2 aria-hidden="true" />
                حذف بند
              </h5>
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
              <button className="btn btn-danger d-inline-flex align-items-center gap-1" onClick={onConfirm} disabled={busy}>
                <FiTrash2 aria-hidden="true" />
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
      salePriceForDisplay: getItemSalePrice(it),
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
          <button className="btn btn-outline-secondary d-inline-flex align-items-center justify-content-center gap-1" onClick={() => navigate("/purchases")}>
            <FiArrowRight aria-hidden="true" />
            رجوع
          </button>

          {isDraft ? (
            <>
              <button className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-1" onClick={() => setShowAdd(true)} disabled={busy || loading}>
                <FiPlusCircle aria-hidden="true" />
                إضافة صنف
              </button>
              <button className="btn btn-success d-inline-flex align-items-center justify-content-center gap-1" onClick={finalizeInvoice} disabled={busy || loading}>
                <FiCheckCircle aria-hidden="true" />
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
          <button className="btn btn-outline-secondary d-inline-flex align-items-center gap-1" onClick={() => navigate("/purchases")}>
            <FiArrowRight aria-hidden="true" />
            رجوع
          </button>

          {isDraft ? (
            <>
              <button className="btn btn-primary d-inline-flex align-items-center gap-1" onClick={() => setShowAdd(true)} disabled={busy || loading}>
                <FiPlusCircle aria-hidden="true" />
                إضافة صنف
              </button>
              <button className="btn btn-success d-inline-flex align-items-center gap-1" onClick={finalizeInvoice} disabled={busy || loading}>
                <FiCheckCircle aria-hidden="true" />
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
                        <th className="text-end">سعر البيع</th>
                        <th className="text-end">الكمية</th>
                        <th className="text-end">إجمالي السطر</th>
                        {isDraft ? <th className="text-end" style={{ width: 1 }}></th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {lineSummary.map((it) => (
                        <tr key={it.id}>
                          <td className="text-end fw-semibold">{it.productId}</td>
                          <td className="text-end">
                            <div>{it.productName}</div>
                            {it.priceMode && it.priceMode !== "same" ? (
                              <div className="small text-secondary">
                                {priceModeLabel(it.priceMode)}
                              </div>
                            ) : null}
                          </td>
                          <td className="text-end">{it.productCategory}</td>
                          <td className="text-end">{formatNumber(it.purchasePrice)}</td>
                          <td className="text-end">{it.salePriceForDisplay == null ? "—" : formatNumber(it.salePriceForDisplay)}</td>
                          <td className="text-end">{formatNumber(it.quantity)}</td>
                          <td className="text-end">{formatNumber(it.lineTotal)}</td>
                          {isDraft ? (
                            <td className="text-end">
                              <div className="d-flex gap-2 justify-content-end flex-wrap flex-md-nowrap">
                                <button
                                  className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1"
                                  onClick={() => {
                                    setSelectedItem(it);
                                    setShowDelete(true);
                                  }}
                                  disabled={busy}
                                >
                                  <FiTrash2 aria-hidden="true" />
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
