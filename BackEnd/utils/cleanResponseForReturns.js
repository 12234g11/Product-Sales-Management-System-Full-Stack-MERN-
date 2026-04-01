// utils/cleanResponseForReturns.js
const cleanOne = (ret, { withItems }) => {
  const base = {
    id: ret._id,
    workspaceId: ret.workspaceId,

    invoiceId: ret.invoiceId,
    invoiceCode: ret.invoiceCode,
    invoiceName: ret.invoiceName || "",
    invoiceCreatedAt: ret.invoiceCreatedAt || null,
    invoiceFinalizedAt: ret.invoiceFinalizedAt || null,
    invoiceCashierName: ret.invoiceCashierName || "",

    createdByUserId: ret.createdByUserId,
    createdByName: ret.createdByName,

    type: ret.type,

    totalRefundAmount: ret.totalRefundAmount,
    totalRefundRestocked: ret.totalRefundRestocked,
    totalRefundDamaged: ret.totalRefundDamaged,
    totalReturnedQty: ret.totalReturnedQty,

    stockStatus: ret.stockStatus,

    createdAt: ret.createdAt,
    updatedAt: ret.updatedAt,
  };

  if (!withItems) return base;

  return {
    ...base,
    items: (ret.items || []).map((it) => ({
      id: it._id,
      productId: it.productId,
      productName: it.productName,
      productCategory: it.productCategory || "",

      qtyReturned: it.qtyReturned,

      salePrice: it.salePrice,
      itemDiscountPercent: it.itemDiscountPercent,
      invoiceDiscountPercent: it.invoiceDiscountPercent,

      unitNetPrice: it.unitNetPrice,
      unitDiscountAmount: it.unitDiscountAmount,

      lineRefundAmount: it.lineRefundAmount,
      returnStockStatus: it.returnStockStatus,
    })),
  };
};

const clean = (input, opts = { withItems: false }) => {
  if (Array.isArray(input)) return input.map((x) => cleanOne(x, opts));
  if (!input) return input;
  return cleanOne(input, opts);
};

export { clean };