export function formatNumber(n) {
  return new Intl.NumberFormat("ar-EG").format(Number(n || 0));
}

export function formatMoney(n) {
  return new Intl.NumberFormat("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));
}

export function formatDateTime(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export function invoiceStatusLabel(status) {
  return (
    {
      draft: "مسودة",
      finalized: "مؤكدة",
      cancelled: "ملغاة",
    }[status] || status || "-"
  );
}

export function returnStatusLabel(status) {
  return (
    {
      none: "لا يوجد",
      partial: "جزئي",
      full: "كامل",
    }[status] || status || "-"
  );
}

export function stockStatusLabel(status) {
  return (
    {
      restocked: "رجع للمخزن",
      damaged: "تالف",
      mixed: "مختلط",
    }[status] || status || "-"
  );
}

export function isDraft(invoice) {
  return String(invoice?.status || "") === "draft";
}

export function isFinalized(invoice) {
  return String(invoice?.status || "") === "finalized";
}

export function canCreateReturn(invoice) {
  return isFinalized(invoice) && String(invoice?.returnStatus || "none") !== "full";
}

export function getAvailableReturnQty(item) {
  const sold = Number(item?.quantity || 0);
  const returned = Number(item?.returnedQty || 0);
  return Math.max(0, sold - returned);
}

function translateBackendError(message) {
  const msg = String(message || "").trim();
  if (!msg) return "";

  const exactMap = {
    "minTotalAmount must be a non-negative number": "الحد الأدنى للإجمالي يجب أن يكون رقمًا موجبًا أو صفر",
    "maxTotalAmount must be a non-negative number": "الحد الأقصى للإجمالي يجب أن يكون رقمًا موجبًا أو صفر",
    "status must be draft, finalized, or cancelled": "الحالة يجب أن تكون: مسودة أو مؤكدة أو ملغاة",
    "returnStatus must be none, partial, or full": "حالة المرتجع يجب أن تكون: لا يوجد أو جزئي أو كامل",
    "Invalid createdByUserId": "معرّف المنشئ غير صالح",
    "Invoice not found": "الفاتورة غير موجودة",
    "Invalid invoice id": "معرّف الفاتورة غير صالح",
    "Only finalized invoices can be printed": "يمكن طباعة الفاتورة المؤكدة فقط",
    "Only draft invoices can be finalized": "يمكن تأكيد الفاتورة وهي في حالة مسودة فقط",
    "Invoice has no items": "الفاتورة لا تحتوي على أصناف",
    "Product not found": "الصنف غير موجود",
    "quantity must be a positive integer": "الكمية يجب أن تكون رقمًا صحيحًا أكبر من صفر",
    "Stock changed. Please retry finalize.": "تم تغيير المخزون، حاول تأكيد البيع مرة أخرى",
    "Insufficient quantity in inventory": "الكمية المتاحة في المخزون غير كافية",
    "Invoice code already exists": "كود الفاتورة مستخدم بالفعل",
    "You can only edit items on draft invoices": "يمكن تعديل الأصناف فقط في الفاتورة المسودة",
    "You can only edit discounts on draft invoices": "يمكن تعديل الخصومات فقط في الفاتورة المسودة",
    "Item not found": "السطر المطلوب غير موجود",
  };

  if (exactMap[msg]) return exactMap[msg];

  if (msg.startsWith("Max allowed is ")) {
    return msg.replace("Max allowed is ", "الحد الأقصى المسموح هو ");
  }

  if (msg.startsWith("Product not found:")) {
    return msg.replace("Product not found:", "الصنف غير موجود:");
  }

  if (msg.includes("must be a valid number")) {
    return "القيمة المدخلة يجب أن تكون رقمًا صحيحًا";
  }

  if (msg.includes("must be between 0 and 100")) {
    return "القيمة يجب أن تكون بين 0 و 100";
  }

  return msg;
}

export function normalizeApiError(error, fallback = "حصل خطأ غير متوقع") {
  const rawMessage =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.data?.message ||
    error?.response?.data?.data?.invoiceDiscountPercent ||
    error?.response?.data?.data?.itemDiscountPercent ||
    error?.response?.data?.data?.quantity ||
    error?.response?.data?.data?.minTotalAmount ||
    error?.response?.data?.data?.maxTotalAmount ||
    error?.response?.data?.data?.status ||
    error?.response?.data?.data?.returnStatus ||
    error?.response?.data?.data?.createdByUserId ||
    error?.response?.data?.data?.invoiceCode ||
    error?.response?.data?.data?.productId ||
    error?.response?.data?.data?.itemId ||
    error?.userMessage ||
    error?.message ||
    fallback;

  return translateBackendError(rawMessage);
}