// utils/invoiceTotals.js

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const round6 = (n) => Math.round((Number(n) + Number.EPSILON) * 1_000_000) / 1_000_000;

const pctToFactor = (p) => {
  const n = Number(p);
  if (!Number.isFinite(n)) return 0;
  if (n <= 0) return 0;
  if (n >= 100) return 1;
  return n / 100;
};

const computeTotalsInternal = (invoiceDoc) => {
  const invDiscPct = Number(invoiceDoc.invoiceDiscountPercent ?? 0);
  const invoiceDiscFactor = pctToFactor(invDiscPct);

  let subtotal = 0;
  let totalItemsQty = 0;

  let itemsDiscountTotal = 0;
  let netAfterItemsDiscountTotal = 0;

  const perItem = [];

  for (const it of invoiceDoc.items || []) {
    const qty = Number(it.quantity || 0);
    const price = Number(it.salePrice || 0);
    if (!Number.isFinite(qty) || !Number.isFinite(price) || qty <= 0 || price < 0) continue;

    const lineSubtotal = round2(price * qty);
    const itemDiscPct = Number(it.itemDiscountPercent ?? 0);
    const itemDiscFactor = pctToFactor(itemDiscPct);

    const lineItemDiscount = round2(lineSubtotal * itemDiscFactor);
    const lineNetAfterItem = round2(lineSubtotal - lineItemDiscount);

    subtotal = round2(subtotal + lineSubtotal);
    itemsDiscountTotal = round2(itemsDiscountTotal + lineItemDiscount);
    netAfterItemsDiscountTotal = round2(netAfterItemsDiscountTotal + lineNetAfterItem);
    totalItemsQty += qty;

    perItem.push({
      item: it,
      qty,
      lineSubtotal,
      lineItemDiscount,
      lineNetAfterItem,
    });
  }

  const invoiceDiscountAmount = round2(netAfterItemsDiscountTotal * invoiceDiscFactor);
  const totalAmount = round2(netAfterItemsDiscountTotal - invoiceDiscountAmount);
  const totalDiscountAmount = round2(itemsDiscountTotal + invoiceDiscountAmount);

  return {
    subtotal,
    totalItemsQty,
    itemsDiscountTotal,
    netAfterItemsDiscountTotal,
    invoiceDiscountAmount,
    totalDiscountAmount,
    totalAmount,
    perItem,
  };
};


export const recalcInvoiceTotals = (invoiceDoc) => {
  const t = computeTotalsInternal(invoiceDoc);

  invoiceDoc.subtotal = t.subtotal;
  invoiceDoc.totalDiscountAmount = t.totalDiscountAmount;
  invoiceDoc.totalAmount = t.totalAmount;
  invoiceDoc.totalItemsQty = t.totalItemsQty;

  return t;
};


export const setInvoiceUnitNetPrices = (invoiceDoc) => {
  const t = computeTotalsInternal(invoiceDoc);

  const baseTotal = t.netAfterItemsDiscountTotal;
  const invoiceDisc = t.invoiceDiscountAmount;

  if (!t.perItem.length) return;

  let remainingDisc = invoiceDisc;
  let remainingBase = baseTotal;

  for (let i = 0; i < t.perItem.length; i++) {
    const p = t.perItem[i];
    const isLast = i === t.perItem.length - 1;

    let share = 0;

    if (baseTotal > 0 && invoiceDisc > 0) {
      if (isLast) {
        share = remainingDisc;
      } else {
        // share rounded to 2 decimals, and we keep remainder for last item
        share = round2(invoiceDisc * (p.lineNetAfterItem / baseTotal));
        // ensure we don't exceed remaining due to rounding
        if (share > remainingDisc) share = remainingDisc;
      }
    }

    const lineFinalNet = round2(p.lineNetAfterItem - share);
    const unitNet = p.qty > 0 ? round6(lineFinalNet / p.qty) : 0;

    p.item.unitNetPrice = unitNet;

    // update remainders
    if (!isLast) {
      remainingDisc = round2(remainingDisc - share);
      remainingBase = round2(remainingBase - p.lineNetAfterItem);
      if (remainingDisc < 0) remainingDisc = 0;
      if (remainingBase < 0) remainingBase = 0;
    }
  }

  // also keep totals consistent
  recalcInvoiceTotals(invoiceDoc);
};
export { round2, round6 };