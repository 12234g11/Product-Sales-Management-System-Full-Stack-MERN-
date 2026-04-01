// utils/receiptHtml.js

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
};

const pctFactor = (p) => {
  const n = Number(p);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 100) return 1;
  return n / 100;
};


const buildLines = (invoice) => {
  const lines = [];

  for (const it of invoice.items || []) {
    const qty = Number(it.quantity || 0);
    const price = Number(it.salePrice || 0);
    if (!Number.isFinite(qty) || !Number.isFinite(price) || qty <= 0 || price < 0) continue;

    const itemDiscPct = Number(it.itemDiscountPercent ?? 0);
    const itemDiscF = pctFactor(itemDiscPct);

    const lineSubtotal = round2(price * qty);
    const itemDiscountAmount = round2(lineSubtotal * itemDiscF);
    const lineAfterItem = round2(lineSubtotal - itemDiscountAmount);

    lines.push({
      productName: it.productName || String(it.productId || ""),
      qty,
      salePrice: round2(price),
      itemDiscountPercent: itemDiscPct,
      lineSubtotal,
      itemDiscountAmount,
      lineAfterItem,
    });
  }

  return lines;
};

export const renderReceiptHtml = (invoice) => {
  const lines = buildLines(invoice);

  const invDiscPct = Number(invoice.invoiceDiscountPercent ?? 0);
  const invDiscF = pctFactor(invDiscPct);

  const computedSubtotal = round2(lines.reduce((s, l) => s + l.lineSubtotal, 0));
  const subtotal = round2(Number(invoice.subtotal ?? computedSubtotal));

  const itemDiscountTotal = round2(lines.reduce((s, l) => s + l.itemDiscountAmount, 0));
  const afterItemDiscount = round2(subtotal - itemDiscountTotal);

  const storedTotalDiscountAmount = Number(invoice.totalDiscountAmount);
  const totalDiscountAmount = round2(
    Number.isFinite(storedTotalDiscountAmount) ? storedTotalDiscountAmount : round2(subtotal - Number(invoice.totalAmount ?? 0))
  );


  let invoiceDiscountAmount = round2(totalDiscountAmount - itemDiscountTotal);
  if (!Number.isFinite(invoiceDiscountAmount) || invoiceDiscountAmount < 0) {
    invoiceDiscountAmount = round2(afterItemDiscount * invDiscF);
  }

  const totalAmount = round2(Number(invoice.totalAmount ?? round2(afterItemDiscount - invoiceDiscountAmount)));

  const totalItemsQty = Number(
    invoice.totalItemsQty ?? lines.reduce((s, l) => s + Number(l.qty || 0), 0)
  );

  const title = process.env.RECEIPT_TITLE || "فاتورة بيع";
  const shopName = process.env.RECEIPT_SHOP_NAME || "";

  const isDraft = invoice.status === "draft";

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <style>
    @page { margin: 0; }
    html, body { padding: 0; margin: 0; }
    body {
      width: 80mm;
      font-family: Arial, "Noto Sans Arabic", "Noto Naskh Arabic", sans-serif;
      font-size: 11px;
      color: #000;
      direction: rtl;
    }
    .wrap { padding: 6mm 4mm; box-sizing: border-box; }
    .center { text-align: center; }
    .right { text-align: right; }
    .left { text-align: left; }
    .muted { opacity: 0.8; }
    .h1 { font-size: 14px; font-weight: 700; }
    .hr { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .row > div { flex: 1; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 3px 0; vertical-align: top; }
    th { font-weight: 700; border-bottom: 1px solid #000; padding-bottom: 4px; }
    .item-name { font-weight: 700; }
    .small { font-size: 10px; }
    .total { font-size: 13px; font-weight: 800; }
    .watermark {
      position: fixed;
      top: 38%;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 44px;
      font-weight: 800;
      opacity: 0.12;
      transform: rotate(-12deg);
      pointer-events: none;
    }
    .disc-amt { font-size: 10px; opacity: .85; }
  </style>
</head>
<body>
  ${isDraft ? `<div class="watermark">DRAFT</div>` : ``}
  <div class="wrap">
    <div class="center">
      ${shopName ? `<div class="h1">${shopName}</div>` : `<div class="h1">${title}</div>`}
      ${shopName ? `<div class="muted">${title}</div>` : ``}
    </div>

    <div class="hr"></div>

    <div class="row small">
      <div class="right">كود الفاتورة: <b>${invoice.invoiceCode || ""}</b></div>
      <div class="left">${invoice.status || ""}</div>
    </div>

    ${invoice.name ? `<div class="small">اسم الفاتورة: ${invoice.name}</div>` : ``}
    <div class="small">الكاشير: ${invoice.createdByName || ""}</div>
    <div class="small">تاريخ الإنشاء: ${fmtDate(invoice.createdAt)}</div>
    ${invoice.finalizedAt ? `<div class="small">تاريخ التأكيد: ${fmtDate(invoice.finalizedAt)}</div>` : ``}

    <div class="hr"></div>

    <table>
      <thead>
        <tr>
          <th class="right">الصنف</th>
          <th class="center">كم × سعر</th>
          <th class="center">خصم الصنف</th>
          <th class="left">صافي الصنف</th>
        </tr>
      </thead>
      <tbody>
        ${lines
          .map((l) => {
            const qtyPrice = `${l.qty} × ${l.salePrice}`;
            const discPct = l.itemDiscountPercent > 0 ? `${l.itemDiscountPercent}%` : "-";
            const discAmt = l.itemDiscountAmount > 0 ? `-${round2(l.itemDiscountAmount)}` : "";
            return `
            <tr>
              <td class="right">
                <div class="item-name">${l.productName}</div>
              </td>
              <td class="center">${qtyPrice}</td>
              <td class="center">
                <div>${discPct}</div>
                ${discAmt ? `<div class="disc-amt muted">${discAmt}</div>` : ``}
              </td>
              <td class="left"><b>${round2(l.lineAfterItem)}</b></td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>

    <div class="hr"></div>

    <div class="small row">
      <div class="right">عدد القطع</div>
      <div class="left"><b>${totalItemsQty}</b></div>
    </div>

    <div class="small row">
      <div class="right">الإجمالي قبل الخصم</div>
      <div class="left"><b>${round2(subtotal)}</b></div>
    </div>

    <div class="small row">
      <div class="right">خصم الأصناف</div>
      <div class="left"><b>${round2(itemDiscountTotal)}</b></div>
    </div>

    <div class="small row">
      <div class="right">الصافي بعد خصم الأصناف</div>
      <div class="left"><b>${round2(afterItemDiscount)}</b></div>
    </div>

    <div class="small row">
      <div class="right">خصم الفاتورة %</div>
      <div class="left"><b>${invDiscPct}%</b></div>
    </div>

    <div class="small row">
      <div class="right">خصم الفاتورة (قيمة)</div>
      <div class="left"><b>${round2(invoiceDiscountAmount)}</b></div>
    </div>

    <div class="small row">
      <div class="right">إجمالي الخصم</div>
      <div class="left"><b>${round2(itemDiscountTotal + invoiceDiscountAmount)}</b></div>
    </div>

    <div class="hr"></div>

    <div class="row total">
      <div class="right">الإجمالي</div>
      <div class="left">${round2(totalAmount)}</div>
    </div>

    <div class="hr"></div>

    <div class="center small muted">شكراً لزيارتكم</div>
  </div>
</body>
</html>`;
};