export const round2 = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
};

export const recalcPurchaseTotals = (inv) => {
  let subtotal = 0;
  let totalItemsQty = 0;

  for (const it of inv.items || []) {
    const qty = Number(it.quantity || 0);
    const price = Number(it.purchasePrice || 0);
    if (qty > 0 && price >= 0) {
      subtotal += qty * price;
      totalItemsQty += qty;
    }
  }

  inv.subtotal = round2(subtotal);
  inv.totalItemsQty = totalItemsQty;
  inv.totalAmount = round2(inv.subtotal);
};