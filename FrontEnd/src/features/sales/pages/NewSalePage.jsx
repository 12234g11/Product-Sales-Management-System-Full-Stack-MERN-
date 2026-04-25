import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import CreateReturnModal from "../components/CreateReturnModal";
import InvoiceHeaderCard from "../components/InvoiceHeaderCard";
import InvoiceItemsTable from "../components/InvoiceItemsTable";
import InvoiceReturnsSection from "../components/InvoiceReturnsSection";
import InvoiceTotalsPanel from "../components/InvoiceTotalsPanel";
import ProductQuickAdd from "../components/ProductQuickAdd";
import { salesApi } from "../api/salesApi";
import { canCreateReturn, isDraft, normalizeApiError } from "../utils/salesFormatters";

export default function NewSalePage() {
  const navigate = useNavigate();
  const { id: invoiceIdParam } = useParams();
  const [searchParams] = useSearchParams();

  const invoiceIdFromQuery = searchParams.get("invoiceId") || "";
  const activeInvoiceId = invoiceIdParam || invoiceIdFromQuery || "";

  const [draftForm, setDraftForm] = useState({ invoiceCode: "يتم توليده تلقائيًا", name: "" });
  const [invoice, setInvoice] = useState(null);
  const [invoiceReturns, setInvoiceReturns] = useState({ invoice: null, returns: [] });

  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [itemBusy, setItemBusy] = useState(false);
  const [discountBusy, setDiscountBusy] = useState(false);
  const [finalizeBusy, setFinalizeBusy] = useState(false);
  const [returnBusy, setReturnBusy] = useState(false);

  const [invoiceDiscountInput, setInvoiceDiscountInput] = useState(0);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const clearFlash = () => {
    setError("");
    setSuccess("");
  };

  const loadInvoice = useCallback(async (invoiceId) => {
    if (!invoiceId) return;

    setLoadingInvoice(true);
    clearFlash();

    try {
      const data = await salesApi.getInvoice(invoiceId);
      setInvoice(data);
      setInvoiceDiscountInput(data?.invoiceDiscountPercent || 0);

      try {
        const returnsData = await salesApi.getInvoiceReturns(invoiceId);
        setInvoiceReturns(returnsData || { invoice: null, returns: [] });
      } catch {
        setInvoiceReturns({ invoice: null, returns: [] });
      }
    } catch (err) {
      setError(normalizeApiError(err, "فشل تحميل الفاتورة"));
    } finally {
      setLoadingInvoice(false);
    }
  }, []);

  useEffect(() => {
    if (activeInvoiceId) {
      loadInvoice(activeInvoiceId);
    } else {
      setInvoice(null);
      setInvoiceReturns({ invoice: null, returns: [] });
      setInvoiceDiscountInput(0);
    }
  }, [activeInvoiceId, loadInvoice]);

  const syncInvoiceState = useCallback(
    async (nextInvoice, message = "") => {
      setInvoice(nextInvoice);
      setInvoiceDiscountInput(nextInvoice?.invoiceDiscountPercent || 0);

      if (message) setSuccess(message);

      const id = nextInvoice?.id || nextInvoice?._id;
      if (!id) return;

      if (String(activeInvoiceId) !== String(id)) {
        navigate(`/sales/${id}`, { replace: true });
      }

      try {
        const returnsData = await salesApi.getInvoiceReturns(id);
        setInvoiceReturns(returnsData || { invoice: null, returns: [] });
      } catch {
        setInvoiceReturns({ invoice: nextInvoice, returns: [] });
      }
    },
    [activeInvoiceId, navigate]
  );

  const onDraftChange = (e) => {
    clearFlash();
    setDraftForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateDraft = async () => {
    clearFlash();

    setCreatingDraft(true);
    try {
      const created = await salesApi.createDraft({
        name: draftForm.name.trim(),
      });
      await syncInvoiceState(created, "تم إنشاء المسودة بنجاح");
    } catch (err) {
      setError(normalizeApiError(err, "فشل إنشاء المسودة"));
    } finally {
      setCreatingDraft(false);
    }
  };

  const handleAddItem = async ({ productId, quantity }) => {
    if (!invoice?.id && !invoice?._id) {
      setError("أنشئ مسودة أولاً");
      return;
    }

    setItemBusy(true);
    clearFlash();

    try {
      const updated = await salesApi.addItem(invoice.id || invoice._id, {
        productId,
        quantity,
      });
      await syncInvoiceState(updated, "تمت إضافة الصنف بنجاح");
    } catch (err) {
      const candidates = err?.response?.data?.data?.candidates;
      if (Array.isArray(candidates) && candidates.length) {
        const names = candidates.map((c) => `${c.name} (${c.id})`).join(" - ");
        setError(`يوجد أكثر من صنف بنفس الاسم. اختر بالكود مباشرة: ${names}`);
      } else {
        setError(normalizeApiError(err, "فشل إضافة الصنف"));
      }
    } finally {
      setItemBusy(false);
    }
  };

  const handleUpdateQty = async (item, quantity) => {
    setItemBusy(true);
    clearFlash();

    try {
      const updated = await salesApi.updateItemQty(
        invoice.id || invoice._id,
        item._id || item.id,
        quantity
      );
      await syncInvoiceState(updated, "تم تعديل الكمية");
    } catch (err) {
      setError(normalizeApiError(err, "فشل تعديل الكمية"));
    } finally {
      setItemBusy(false);
    }
  };

  const handleApplyItemDiscount = async (item, value) => {
    setItemBusy(true);
    clearFlash();

    try {
      const updated = await salesApi.applyItemDiscount(
        invoice.id || invoice._id,
        item._id || item.id,
        value
      );
      await syncInvoiceState(updated, "تم تطبيق خصم الصنف");
    } catch (err) {
      setError(normalizeApiError(err, "فشل تطبيق خصم الصنف"));
    } finally {
      setItemBusy(false);
    }
  };

  const handleRemoveItem = async (item) => {
    setItemBusy(true);
    clearFlash();

    try {
      const updated = await salesApi.removeItem(
        invoice.id || invoice._id,
        item._id || item.id
      );
      await syncInvoiceState(updated, "تم حذف السطر");
    } catch (err) {
      setError(normalizeApiError(err, "فشل حذف الصنف"));
    } finally {
      setItemBusy(false);
    }
  };

  const handleApplyInvoiceDiscount = async () => {
    setDiscountBusy(true);
    clearFlash();

    try {
      const updated = await salesApi.applyInvoiceDiscount(
        invoice.id || invoice._id,
        invoiceDiscountInput
      );
      await syncInvoiceState(updated, "تم تطبيق خصم الفاتورة");
    } catch (err) {
      setError(normalizeApiError(err, "فشل تطبيق خصم الفاتورة"));
    } finally {
      setDiscountBusy(false);
    }
  };

  const handleFinalize = async () => {
    setFinalizeBusy(true);
    clearFlash();

    try {
      const updated = await salesApi.finalizeInvoice(invoice.id || invoice._id);
      await syncInvoiceState(updated, "تم تأكيد البيع بنجاح");
    } catch (err) {
      setError(normalizeApiError(err, "فشل تأكيد البيع"));
    } finally {
      setFinalizeBusy(false);
    }
  };

  const handleCreateReturn = async (payload) => {
    setReturnBusy(true);
    clearFlash();

    try {
      await salesApi.createReturn(payload);
      setShowReturnModal(false);
      setSuccess("تم إنشاء المرتجع بنجاح");
      await loadInvoice(invoice.id || invoice._id);
    } catch (err) {
      setError(normalizeApiError(err, "فشل إنشاء المرتجع"));
    } finally {
      setReturnBusy(false);
    }
  };

  const busy =
    creatingDraft || itemBusy || finalizeBusy || discountBusy || returnBusy;

  const draftMode = isDraft(invoice);

  const returnsData = useMemo(() => {
    if (!invoice) return { invoice: null, returns: [] };

    return {
      invoice: invoiceReturns.invoice || invoice,
      returns: invoiceReturns.returns || [],
    };
  }, [invoice, invoiceReturns]);

  return (
    <div className="container-fluid">
      <div className="mb-3">
        <h3 className="m-0 text-white">
          {invoice ? `فاتورة بيع: ${invoice.invoiceCode}` : "فاتورة بيع جديدة"}
        </h3>
        <div className="text-white small mt-2">
          إنشاء مسودة، إضافة الأصناف، تطبيق الخصومات، تأكيد البيع، ثم الطباعة والمرتجعات.
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loadingInvoice ? (
        <div className="card">
          <div className="card-body text-center py-5">جاري تحميل الفاتورة...</div>
        </div>
      ) : (
        <div className="row g-3">
          <div className="col-12">
            <InvoiceHeaderCard
              draftForm={draftForm}
              onDraftChange={onDraftChange}
              onCreateDraft={handleCreateDraft}
              invoice={invoice}
              busy={busy}
              creating={creatingDraft}
            />
          </div>

          <div className="col-12 col-xl-8">
            <div className="row g-3">
              <div className="col-12">
                <ProductQuickAdd
                  disabled={!invoice || !draftMode}
                  busy={itemBusy}
                  onAdd={handleAddItem}
                  onError={(msg) => setError(msg)}
                />
              </div>

              <div className="col-12">
                <InvoiceItemsTable
                  invoice={invoice}
                  busy={itemBusy}
                  onUpdateQty={handleUpdateQty}
                  onApplyItemDiscount={handleApplyItemDiscount}
                  onRemoveItem={handleRemoveItem}
                />
              </div>

              {invoice && (
                <div className="col-12">
                  <InvoiceReturnsSection
                    data={returnsData}
                    onOpenCreateReturn={() => setShowReturnModal(true)}
                    canCreateReturn={canCreateReturn(invoice)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="col-12 col-xl-4">
            <InvoiceTotalsPanel
              invoice={invoice || {}}
              discountValue={invoiceDiscountInput}
              onDiscountChange={(e) => setInvoiceDiscountInput(e.target.value)}
              onApplyDiscount={handleApplyInvoiceDiscount}
              discountBusy={discountBusy}
              disabled={!invoice || !draftMode}
              onFinalize={handleFinalize}
              finalizeBusy={finalizeBusy}
              onPrint={() => salesApi.openReceipt(invoice.id || invoice._id)}
            />
          </div>
        </div>
      )}

      <CreateReturnModal
        show={showReturnModal}
        invoice={invoice}
        busy={returnBusy}
        onClose={() => !returnBusy && setShowReturnModal(false)}
        onSubmit={handleCreateReturn}
      />
    </div>
  );
}