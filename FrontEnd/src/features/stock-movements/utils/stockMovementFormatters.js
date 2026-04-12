export function formatNumber(n) {
  return new Intl.NumberFormat("ar-EG").format(Number(n || 0));
}

export function formatMoney(n) {
  return new Intl.NumberFormat("ar-EG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));
}

export function formatDateTime(d) {
  if (!d) return "—";

  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(dt);
}

export function normalizeApiError(error, fallback = "حدث خطأ غير متوقع") {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.userMessage ||
    error?.message ||
    fallback
  );
}

export function movementTypeLabel(type) {
  const value = String(type || "").trim().toLowerCase();

  if (value === "purchase") return "شراء";
  if (value === "sale") return "بيع";
  if (value === "sale_return") return "مرتجع بيع";
  if (value === "adjustment") return "تسوية";

  return type || "—";
}

export function movementDirectionLabel(qtyDelta) {
  const n = Number(qtyDelta || 0);
  if (n > 0) return "داخل";
  if (n < 0) return "خارج";
  return "—";
}

export function movementDirectionBadge(qtyDelta) {
  const n = Number(qtyDelta || 0);
  if (n > 0) return "text-bg-success";
  if (n < 0) return "text-bg-danger";
  return "text-bg-secondary";
}

export function movementTypeBadge(type) {
  const value = String(type || "").trim().toLowerCase();

  if (value === "purchase") return "text-bg-primary";
  if (value === "sale") return "text-bg-danger";
  if (value === "sale_return") return "text-bg-warning";
  if (value === "adjustment") return "text-bg-info";

  return "text-bg-secondary";
}

export function referenceTypeLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) return "—";

  if (normalized === "saleinvoice" || normalized === "sale_invoice") {
    return "فاتورة بيع";
  }

  if (normalized === "purchaseinvoice" || normalized === "purchase_invoice") {
    return "فاتورة شراء";
  }

  if (normalized === "salereturn" || normalized === "sale_return") {
    return "مرتجع بيع";
  }

  if (normalized === "manual_adjustment") {
    return "تسوية يدوية";
  }

  return value;
}

export function reasonLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) return "—";

  if (normalized === "inventory_count") return "جرد مخزني";
  if (normalized === "opening_balance") return "رصيد افتتاحي";
  if (normalized === "damaged") return "تالف";
  if (normalized === "correction") return "تصحيح";
  if (normalized === "other") return "أخرى";

  return value;
}

export function categoryLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) return "—";

  if (normalized === "general") return "عام";
  if (normalized === "uncategorized") return "غير مصنف";

  return value;
}