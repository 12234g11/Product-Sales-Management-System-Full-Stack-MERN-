// utils/cleanResponseForInvoices.js

const cleanOne = (inv, { withItems }) => {
  const base = {
    id: inv._id,
    workspaceId: inv.workspaceId,
    invoiceCode: inv.invoiceCode,
    name: inv.name || "",
    status: inv.status,

    createdByUserId: inv.createdByUserId,
    createdByName: inv.createdByName,

    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,

    finalizedAt: inv.finalizedAt,
    finalizedByUserId: inv.finalizedByUserId || null,
    finalizedByName: inv.finalizedByName || "",

    subtotal: inv.subtotal,
    totalDiscountAmount: inv.totalDiscountAmount,
    totalAmount: inv.totalAmount,
    totalItemsQty: inv.totalItemsQty,
    invoiceDiscountPercent: inv.invoiceDiscountPercent,

    returnStatus: inv.returnStatus,
    totalRefundedAmount: inv.totalRefundedAmount,
  };

  if (!withItems) return base;

  return {
    ...base,
    items: (inv.items || []).map((it) => ({
      id: it._id,
      productId: it.productId,
      productName: it.productName,
      productCategory: it.productCategory || "",
      salePrice: it.salePrice,
      quantity: it.quantity,
      itemDiscountPercent: it.itemDiscountPercent,
      returnedQty: it.returnedQty,
      unitNetPrice: it.unitNetPrice,
    })),
  };
};

const clean = (input, opts = { withItems: false }) => {
  if (Array.isArray(input)) return input.map((x) => cleanOne(x, opts));
  if (!input) return input;
  return cleanOne(input, opts);
};

export { clean };