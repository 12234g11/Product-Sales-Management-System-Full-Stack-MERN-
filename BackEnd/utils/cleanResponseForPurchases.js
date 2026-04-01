const cleanOne = (inv, { withItems }) => {
  const base = {
    id: inv._id,
    workspaceId: inv.workspaceId,
    invoiceCode: inv.invoiceCode,

    supplierId: inv.supplierId || null,
    supplierName: inv.supplierName,

    status: inv.status,

    createdByUserId: inv.createdByUserId,
    createdByName: inv.createdByName,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,

    finalizedAt: inv.finalizedAt,
    finalizedByUserId: inv.finalizedByUserId || null,
    finalizedByName: inv.finalizedByName || "",

    notes: inv.notes || "",

    subtotal: inv.subtotal,
    totalAmount: inv.totalAmount,
    totalItemsQty: inv.totalItemsQty,
  };

  if (!withItems) return base;

  return {
    ...base,
    items: (inv.items || []).map((it) => ({
      id: it._id,
      productId: it.productId,
      productName: it.productName,
      productCategory: it.productCategory || "",
      purchasePrice: it.purchasePrice,
      quantity: it.quantity,
    })),
  };
};

export const clean = (input, opts = { withItems: false }) => {
  if (Array.isArray(input)) return input.map((x) => cleanOne(x, opts));
  if (!input) return input;
  return cleanOne(input, opts);
};