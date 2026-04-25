import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { productsApi } from "../api/productsApi";
import AdjustStockModal from "../components/AdjustStockModal";
import ProductMovementsModal from "../components/ProductMovementsModal";
import { translateApiError } from "../../../services/http/errorMap";

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(n) {
  return new Intl.NumberFormat("ar-EG").format(Number(n || 0));
}

function statusInfo(product) {
  const qty = Number(product?.quantity || 0);
  const minStock = Number(product?.minStock || 0);

  if (qty <= 0) {
    return { label: "نفد المخزون", className: "text-bg-danger" };
  }
  if (minStock > 0 && qty < minStock) {
    return { label: "أقل من الحد الأدنى", className: "text-bg-warning" };
  }
  return { label: "متوفر", className: "text-bg-success" };
}

function ProductStatusBadge({ product }) {
  const info = statusInfo(product);
  return <span className={`badge ${info.className}`}>{info.label}</span>;
}

function ProductFormModal({ show, mode, initial, busy, onClose, onSubmit }) {
  const isEdit = mode === "edit";

  const [form, setForm] = useState({
    id: "",
    name: "",
    category: "",
    purchasePrice: "",
    salePrice: "",
    quantity: "",
    minStock: "",
  });

  useEffect(() => {
    if (!show) return;

    if (isEdit && initial) {
      setForm({
        id: initial.id ?? "",
        name: initial.name ?? "",
        category: initial.category ?? "",
        purchasePrice: String(initial.purchasePrice ?? ""),
        salePrice: String(initial.salePrice ?? ""),
        quantity: String(initial.quantity ?? 0),
        minStock: String(initial.minStock ?? 0),
      });
    } else {
      setForm({
        id: "",
        name: "",
        category: "",
        purchasePrice: "",
        salePrice: "",
        quantity: "0",
        minStock: "0",
      });
    }
  }, [show, isEdit, initial]);

  const purchaseNum = useMemo(() => toNumber(form.purchasePrice), [form.purchasePrice]);
  const saleNum = useMemo(() => toNumber(form.salePrice), [form.salePrice]);

  const showPriceWarning = useMemo(() => {
    if (String(form.purchasePrice).trim() === "") return false;
    if (String(form.salePrice).trim() === "") return false;
    return saleNum < purchaseNum;
  }, [form.purchasePrice, form.salePrice, saleNum, purchaseNum]);

  const lossAmount = useMemo(() => {
    if (!showPriceWarning) return 0;
    return purchaseNum - saleNum;
  }, [showPriceWarning, purchaseNum, saleNum]);

  const submit = async (e) => {
    e.preventDefault();

    const basePayload = {
      id: String(form.id).trim(),
      name: String(form.name).trim(),
      category: String(form.category).trim(),
      purchasePrice: toNumber(form.purchasePrice),
      salePrice: toNumber(form.salePrice),
      minStock: toNumber(form.minStock),
    };

    const payload = isEdit
      ? basePayload
      : {
        ...basePayload,
        quantity: toNumber(form.quantity),
      };

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
              <h5 className="modal-title">{isEdit ? "تعديل منتج" : "إضافة منتج"}</h5>
              <button
                type="button"
                className="btn-close ms-0 me-auto"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            <form onSubmit={submit}>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <label className="form-label">كود المنتج (ID)</label>
                    <input
                      className="form-control"
                      value={form.id}
                      onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                      required
                    />
                    {isEdit ? (
                      <div className="form-text">
                        تقدر تغيّر الكود لكن التعديل هيتم على المنتج الحالي.
                      </div>
                    ) : null}
                  </div>

                  <div className="col-12 col-md-8">
                    <label className="form-label">اسم المنتج</label>
                    <input
                      className="form-control"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">الفئة</label>
                    <input
                      className="form-control"
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label">الكمية</label>
                    <input
                      className="form-control"
                      type="number"
                      min={0}
                      value={form.quantity}
                      onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                      readOnly={isEdit}
                      required={!isEdit}
                    />
                    {isEdit ? (
                      <div className="form-text">
                        لا يمكن تعديل الكمية من هنا. استخدم تسوية المخزون.
                      </div>
                    ) : null}
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label">الحد الأدنى</label>
                    <input
                      className="form-control"
                      type="number"
                      min={0}
                      value={form.minStock}
                      onChange={(e) => setForm((f) => ({ ...f, minStock: e.target.value }))}
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

                  <div className="col-12 col-md-6">
                    <label className="form-label">سعر البيع</label>
                    <input
                      className={`form-control ${showPriceWarning ? "is-invalid" : ""}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.salePrice}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, salePrice: e.target.value }))
                      }
                      required
                    />
                    {showPriceWarning ? (
                      <>
                        <div className="invalid-feedback">سعر البيع أقل من سعر الشراء.</div>
                        <div className="alert alert-warning py-2 mt-2 mb-0">
                          ⚠️ تنبيه: سعر البيع أقل من سعر الشراء (فرق:{" "}
                          {formatNumber(lossAmount)}).
                        </div>
                      </>
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

      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

function ConfirmDeleteModal({ show, busy, product, onClose, onConfirm }) {
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
              <h5 className="modal-title">تأكيد الحذف</h5>
              <button
                type="button"
                className="btn-close ms-0 me-auto"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            <div className="modal-body">
              هل أنت متأكد أنك تريد حذف المنتج:
              <div className="mt-2">
                <span className="fw-bold">{product?.name}</span>{" "}
                <span className="text-secondary">({product?.id})</span>
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
              <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
                {busy ? "جاري الحذف..." : "حذف"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

const initialFilters = {
  id: "",
  name: "",
  category: "",
  page: 1,
  limit: 20,
};

export default function ProductsPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState(initialFilters);

  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState("create");
  const [editing, setEditing] = useState(null);
  const [originalId, setOriginalId] = useState("");

  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const [showAdjust, setShowAdjust] = useState(false);
  const [adjusting, setAdjusting] = useState(null);

  const [showMovements, setShowMovements] = useState(false);
  const [movementProduct, setMovementProduct] = useState(null);

  const [paginationState, setPaginationState] = useState({
    total: 0,
    page: 1,
    limit: 20,
  });

  const loadProducts = useCallback(async (nextFilters = initialFilters) => {
    setLoading(true);
    setError("");

    try {
      const res = await productsApi.list(nextFilters);
      const products = Array.isArray(res)
        ? res
        : Array.isArray(res?.products)
          ? res.products
          : Array.isArray(res?.items)
            ? res.items
            : [];

      setItems(products);
      setPaginationState(
        res?.pagination || {
          total: products.length,
          page: Number(nextFilters.page || 1),
          limit: Number(nextFilters.limit || 20),
        }
      );
    } catch (e) {
      setError(translateApiError(e, "فشل تحميل المنتجات"));
      setItems([]);
      setPaginationState({
        total: 0,
        page: 1,
        limit: Number(nextFilters.limit || 20),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const applySearchParams = (next) => {
    const params = {};

    if (String(next.id || "").trim()) params.id = String(next.id).trim();
    if (String(next.name || "").trim()) params.name = String(next.name).trim();
    if (String(next.category || "").trim()) params.category = String(next.category).trim();

    if (Number(next.page || 1) > 1) params.page = String(next.page);
    if (Number(next.limit || 20) !== 20) params.limit = String(next.limit);

    setSearchParams(params);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);

    const next = {
      id: urlParams.get("id") || "",
      name: urlParams.get("name") || "",
      category: urlParams.get("category") || "",
      page: Math.max(1, Number(urlParams.get("page") || 1)),
      limit: Math.max(1, Number(urlParams.get("limit") || 20)),
    };

    setFilters(next);
    loadProducts(next);
  }, [location.search, loadProducts]);

  const summary = useMemo(() => {
    const total = items.length;
    const units = items.reduce((sum, p) => sum + Number(p.quantity || 0), 0);
    const out = items.filter((p) => Number(p.quantity || 0) <= 0).length;
    const low = items.filter((p) => {
      const qty = Number(p.quantity || 0);
      const minStock = Number(p.minStock || 0);
      return qty > 0 && minStock > 0 && qty < minStock;
    }).length;

    return { total, units, out, low };
  }, [items]);

  const paging = useMemo(() => {
    const total = Math.max(0, Number(paginationState.total || 0));
    const page = Math.max(1, Number(paginationState.page || 1));
    const limit = Math.max(1, Number(paginationState.limit || filters.limit || 20));
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const startItem = total === 0 ? 0 : (safePage - 1) * limit + 1;
    const endItem = total === 0 ? 0 : Math.min(safePage * limit, total);

    return {
      total,
      page: safePage,
      limit,
      totalPages,
      startItem,
      endItem,
    };
  }, [paginationState, filters.limit]);

  const visiblePages = useMemo(() => {
    const pages = [];
    const maxVisible = 5;

    let start = Math.max(1, paging.page - 2);
    let end = Math.min(paging.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }

    return pages;
  }, [paging.page, paging.totalPages]);

  const onSearch = async (e) => {
    e.preventDefault();
    applySearchParams({ ...filters, page: 1 });
  };

  const onReset = async () => {
    applySearchParams(initialFilters);
  };

  const setPage = (page) => {
    const nextPage = Number(page);
    if (!Number.isFinite(nextPage)) return;
    if (nextPage < 1 || nextPage > paging.totalPages) return;
    if (nextPage === paging.page) return;

    applySearchParams({ ...filters, page: nextPage });
  };

  const setLimit = (limit) => {
    const nextLimit = Number(limit);
    if (!Number.isFinite(nextLimit) || nextLimit <= 0) return;

    applySearchParams({ ...filters, page: 1, limit: nextLimit });
  };

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    setOriginalId("");
    setShowForm(true);
  };

  const openEdit = (p) => {
    setMode("edit");
    setEditing(p);
    setOriginalId(p.id);
    setShowForm(true);
  };

  const submitForm = async (payload) => {
    setBusy(true);
    setError("");

    try {
      if (mode === "create") {
        await productsApi.create(payload);
      } else {
        await productsApi.update(originalId, payload);
      }

      setShowForm(false);
      await loadProducts(filters);
    } catch (e) {
      setError(translateApiError(e, mode === "create" ? "فشل إضافة المنتج" : "فشل تعديل المنتج"));
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const openDelete = (p) => {
    setDeleting(p);
    setShowDelete(true);
  };

  const confirmDelete = async () => {
    setBusy(true);
    setError("");

    try {
      await productsApi.remove(deleting.id);
      setShowDelete(false);
      setDeleting(null);
      await loadProducts(filters);
    } catch (e) {
      setError(translateApiError(e, "فشل حذف المنتج"));
    } finally {
      setBusy(false);
    }
  };

  const openAdjust = (p) => {
    setAdjusting(p);
    setShowAdjust(true);
  };

  const submitAdjust = async (payload) => {
    setBusy(true);
    setError("");

    try {
      await productsApi.adjustStock(adjusting.id, payload);
      setShowAdjust(false);
      setAdjusting(null);
      await loadProducts(filters);
    } catch (e) {
      setError(translateApiError(e, "فشل تسوية المخزون"));
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const openMovements = (p) => {
    setMovementProduct(p);
    setShowMovements(true);
  };

  return (
    <div className="container-fluid">
      <div className="d-md-none mb-3">
        <div className="mb-2">
          <h3 className="m-0 text-white">المنتجات</h3>
          <div className="text-white small">
            عدد المنتجات في الصفحة: {formatNumber(summary.total)} • إجمالي الوحدات في الصفحة:{" "}
            {formatNumber(summary.units)}
          </div>
          <div className="text-white small mt-1">
            أقل من الحد الأدنى في الصفحة: {formatNumber(summary.low)} • نفد المخزون في الصفحة:{" "}
            {formatNumber(summary.out)}
          </div>
          <div className="text-white small mt-1">
            إجمالي النتائج: {formatNumber(paging.total)}
          </div>
        </div>

        <div className="d-grid gap-2">
          <button className="btn btn-primary" onClick={openCreate}>
            إضافة منتج
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => loadProducts(filters)}
            disabled={loading}
          >
            تحديث
          </button>
        </div>
      </div>

      <div className="d-none d-md-flex flex-row-reverse justify-content-between align-items-center mb-3">
        <div>
          <h3 className="m-0 text-white">المنتجات</h3>
          <div className="text-white small">
            عدد المنتجات في الصفحة: {formatNumber(summary.total)} • إجمالي الوحدات في الصفحة:{" "}
            {formatNumber(summary.units)}
          </div>
          <div className="text-white small mt-1">
            أقل من الحد الأدنى في الصفحة: {formatNumber(summary.low)} • نفد المخزون في الصفحة:{" "}
            {formatNumber(summary.out)}
          </div>
          <div className="text-white small mt-1">
            إجمالي النتائج: {formatNumber(paging.total)}
          </div>
        </div>

        <div className="d-flex flex-row-reverse gap-2">
          <button className="btn btn-primary" onClick={openCreate}>
            إضافة منتج
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={() => loadProducts(filters)}
            disabled={loading}
          >
            تحديث
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <form className="card mb-3 d-md-none" onSubmit={onSearch}>
        <div className="card-body">
          <div className="d-grid gap-2">
            <div>
              <label className="form-label">بحث بالكود</label>
              <input
                className="form-control"
                value={filters.id}
                onChange={(e) => setFilters((f) => ({ ...f, id: e.target.value }))}
              />
            </div>

            <div>
              <label className="form-label">بحث بالاسم</label>
              <input
                className="form-control"
                value={filters.name}
                onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="form-label">الفئة</label>
              <input
                className="form-control"
                value={filters.category}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              />
            </div>

            <div>
              <label className="form-label">عدد العناصر</label>
              <select
                className="form-select"
                value={filters.limit}
                onChange={(e) => setLimit(e.target.value)}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>

            <div className="row g-2">
              <div className="col-6">
                <button className="btn btn-outline-primary w-100" type="submit" disabled={loading}>
                  بحث
                </button>
              </div>
              <div className="col-6">
                <button
                  className="btn btn-outline-secondary w-100"
                  type="button"
                  onClick={onReset}
                  disabled={loading}
                >
                  الكل
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      <form className="card mb-3 d-none d-md-block" onSubmit={onSearch}>
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-3">
              <label className="form-label">بحث بالكود</label>
              <input
                className="form-control"
                value={filters.id}
                onChange={(e) => setFilters((f) => ({ ...f, id: e.target.value }))}
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">بحث بالاسم</label>
              <input
                className="form-control"
                value={filters.name}
                onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">الفئة</label>
              <input
                className="form-control"
                value={filters.category}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">عدد العناصر</label>
              <select
                className="form-select"
                value={filters.limit}
                onChange={(e) => setLimit(e.target.value)}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>

            <div className="col-12 d-flex gap-2 flex-row-reverse mt-2">
              <button className="btn btn-outline-primary" type="submit" disabled={loading}>
                بحث
              </button>
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={onReset}
                disabled={loading}
              >
                الكل
              </button>
            </div>
          </div>
        </div>
      </form>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">جاري التحميل...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-4 text-secondary">لا توجد منتجات</div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th className="text-end">الكود</th>
                      <th className="text-end">الاسم</th>
                      <th className="text-end">الفئة</th>
                      <th className="text-end">الكمية</th>
                      <th className="text-end">الحد الأدنى</th>
                      <th className="text-end">شراء</th>
                      <th className="text-end">بيع</th>
                      <th className="text-end">الحالة</th>
                      <th className="text-end" style={{ width: 1 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => (
                      <tr key={p.id}>
                        <td className="text-end fw-semibold">{p.id}</td>
                        <td className="text-end">{p.name}</td>
                        <td className="text-end">{p.category}</td>
                        <td className="text-end">{formatNumber(p.quantity)}</td>
                        <td className="text-end">{formatNumber(p.minStock)}</td>
                        <td className="text-end">{formatNumber(p.purchasePrice)}</td>
                        <td className="text-end">{formatNumber(p.salePrice)}</td>
                        <td className="text-end">
                          <ProductStatusBadge product={p} />
                        </td>
                        <td className="text-end">
                          <div className="d-flex gap-2 justify-content-end flex-wrap flex-md-nowrap">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openEdit(p)}
                              disabled={busy}
                            >
                              تعديل
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning"
                              onClick={() => openAdjust(p)}
                              disabled={busy}
                            >
                              تسوية
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-info"
                              onClick={() => openMovements(p)}
                              disabled={busy}
                            >
                              السجل
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => openDelete(p)}
                              disabled={busy}
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-3">
                <div className="small text-secondary">
                  عرض {formatNumber(paging.startItem)} - {formatNumber(paging.endItem)} من{" "}
                  {formatNumber(paging.total)}
                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <label className="small text-secondary mb-0">عدد العناصر</label>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 90 }}
                    value={filters.limit}
                    onChange={(e) => setLimit(e.target.value)}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>

                <nav aria-label="Products pagination">
                  <ul className="pagination pagination-sm mb-0 flex-wrap">
                    <li className={`page-item ${paging.page <= 1 ? "disabled" : ""}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => setPage(paging.page - 1)}
                        disabled={paging.page <= 1}
                      >
                        السابق
                      </button>
                    </li>

                    {visiblePages[0] > 1 && (
                      <>
                        <li className="page-item">
                          <button type="button" className="page-link" onClick={() => setPage(1)}>
                            1
                          </button>
                        </li>
                        {visiblePages[0] > 2 && (
                          <li className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                        )}
                      </>
                    )}

                    {visiblePages.map((pageNumber) => (
                      <li
                        key={pageNumber}
                        className={`page-item ${paging.page === pageNumber ? "active" : ""}`}
                      >
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => setPage(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      </li>
                    ))}

                    {visiblePages[visiblePages.length - 1] < paging.totalPages && (
                      <>
                        {visiblePages[visiblePages.length - 1] < paging.totalPages - 1 && (
                          <li className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                        )}
                        <li className="page-item">
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => setPage(paging.totalPages)}
                          >
                            {paging.totalPages}
                          </button>
                        </li>
                      </>
                    )}

                    <li className={`page-item ${paging.page >= paging.totalPages ? "disabled" : ""}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => setPage(paging.page + 1)}
                        disabled={paging.page >= paging.totalPages}
                      >
                        التالي
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </>
          )}
        </div>
      </div>

      <ProductFormModal
        show={showForm}
        mode={mode}
        initial={editing}
        busy={busy}
        onClose={() => setShowForm(false)}
        onSubmit={submitForm}
      />

      <ConfirmDeleteModal
        show={showDelete}
        busy={busy}
        product={deleting}
        onClose={() => setShowDelete(false)}
        onConfirm={confirmDelete}
      />

      <AdjustStockModal
        show={showAdjust}
        product={adjusting}
        busy={busy}
        error={error}
        onClose={() => setShowAdjust(false)}
        onSubmit={submitAdjust}
      />

      <ProductMovementsModal
        show={showMovements}
        product={movementProduct}
        onClose={() => setShowMovements(false)}
        fetchMovements={productsApi.getMovements}
      />
    </div>
  );
}
