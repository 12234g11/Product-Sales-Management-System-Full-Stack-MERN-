import mongoose from "mongoose";
import SaleReturn from "../models/SaleReturn.js";
import SaleInvoice from "../models/SaleInvoice.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { sendSuccess, sendFail, sendError } from "../utils/jsend.js";
import { clean } from "../utils/cleanResponseForReturns.js";
import { round2 } from "../utils/invoiceTotals.js";

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getReturnStatusForInvoice = (invoiceDoc) => {
  const items = invoiceDoc.items || [];
  if (items.length === 0) return "none";

  let anyReturned = false;
  let allReturned = true;

  for (const it of items) {
    const sold = Number(it.quantity || 0);
    const returned = Number(it.returnedQty || 0);
    if (returned > 0) anyReturned = true;
    if (returned < sold) allReturned = false;
  }

  if (!anyReturned) return "none";
  return allReturned ? "full" : "partial";
};

const buildReturnItemsFromBody = (invoiceDoc, bodyItems) => {
  const map = new Map((invoiceDoc.items || []).map((it) => [String(it.productId), it]));

  const result = [];
  for (const bi of bodyItems) {
    const productId = String(bi.productId || "").trim();
    const qtyReturned = Number(bi.qtyReturned);
    const returnStockStatus = String(bi.returnStockStatus || "").trim();

    if (!productId) return { ok: false, error: { productId: "productId is required" } };
    if (!Number.isFinite(qtyReturned) || !Number.isInteger(qtyReturned) || qtyReturned <= 0) {
      return { ok: false, error: { qtyReturned: "qtyReturned must be a positive integer" } };
    }
    if (!["restocked", "damaged"].includes(returnStockStatus)) {
      return { ok: false, error: { returnStockStatus: "returnStockStatus must be restocked or damaged" } };
    }

    const invItem = map.get(productId);
    if (!invItem) return { ok: false, error: { productId: `Product ${productId} not found in invoice` } };

    const sold = Number(invItem.quantity || 0);
    const alreadyReturned = Number(invItem.returnedQty || 0);
    const available = sold - alreadyReturned;

    if (qtyReturned > available) {
      return {
        ok: false,
        error: { qtyReturned: "qtyReturned exceeds available return quantity", productId, sold, alreadyReturned, available, requested: qtyReturned },
      };
    }

    const salePrice = Number(invItem.salePrice || 0);
    const itemDisc = Number(invItem.itemDiscountPercent || 0);
    const invDisc = Number(invoiceDoc.invoiceDiscountPercent || 0);

    let unitNet = Number(invItem.unitNetPrice || 0);
    if (!Number.isFinite(unitNet) || unitNet < 0) unitNet = 0;
    if (unitNet === 0) unitNet = salePrice; // fallback

    const unitDiscountAmount = round2(Math.max(0, salePrice - unitNet));
    const lineRefundAmount = round2(unitNet * qtyReturned);

    result.push({
      productId,
      productName: invItem.productName,
      productCategory: invItem.productCategory || "",

      qtyReturned,

      salePrice,
      itemDiscountPercent: round2(itemDisc),
      invoiceDiscountPercent: round2(invDisc),

      unitNetPrice: unitNet,
      unitDiscountAmount,

      lineRefundAmount,

      returnStockStatus,
      _invoiceItemId: invItem._id,
    });
  }

  return { ok: true, items: result };
};

const parseDateStart = (s) => {
  const d = new Date(String(s));
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const parseDateEnd = (s) => {
  const d = new Date(String(s));
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
};

const buildReturnsFilters = (req) => {
  const workspaceId = req.user.workspaceId;

  const stockStatus = req.query.stockStatus ? String(req.query.stockStatus).trim() : "";
  const itemStatus = req.query.itemStatus ? String(req.query.itemStatus).trim() : "";

  const invoiceId = req.query.invoiceId ? String(req.query.invoiceId).trim() : "";
  const invoiceCode = req.query.invoiceCode ? String(req.query.invoiceCode).trim() : "";
  const search = req.query.search ? String(req.query.search).trim() : "";

  const productId = req.query.productId ? String(req.query.productId).trim() : "";
  const productName = req.query.productName ? String(req.query.productName).trim() : "";
  const category = req.query.category ? String(req.query.category).trim() : "";

  const createdByUserId = req.query.createdByUserId ? String(req.query.createdByUserId).trim() : "";
  const createdByName = req.query.createdByName ? String(req.query.createdByName).trim() : "";
  const cashierName = req.query.cashierName ? String(req.query.cashierName).trim() : "";

  const fromRaw = req.query.from ? String(req.query.from).trim() : "";
  const toRaw = req.query.to ? String(req.query.to).trim() : "";
  const daysRaw = req.query.days ? parseInt(String(req.query.days), 10) : null;

  const filters = { workspaceId };

  if (stockStatus) {
    if (!["restocked", "damaged", "mixed"].includes(stockStatus)) {
      return { ok: false, error: { stockStatus: "stockStatus must be restocked, damaged, or mixed" } };
    }
    filters.stockStatus = stockStatus;
  }

  if (invoiceId) {
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) return { ok: false, error: { invoiceId: "Invalid invoiceId" } };
    filters.invoiceId = new mongoose.Types.ObjectId(invoiceId);
  }

  if (invoiceCode) {
    const r = new RegExp(`^${escapeRegex(invoiceCode)}$`, "i");
    filters.invoiceCode = { $regex: r };
  }

  if (search) {
    const r = new RegExp(escapeRegex(search), "i");
    filters.$or = [{ invoiceCode: { $regex: r } }, { invoiceName: { $regex: r } }];
  }

  if (cashierName) filters.invoiceCashierName = { $regex: new RegExp(escapeRegex(cashierName), "i") };

  if (createdByUserId) {
    if (!mongoose.Types.ObjectId.isValid(createdByUserId)) return { ok: false, error: { createdByUserId: "Invalid createdByUserId" } };
    filters.createdByUserId = new mongoose.Types.ObjectId(createdByUserId);
  }

  if (createdByName) filters.createdByName = { $regex: new RegExp(escapeRegex(createdByName), "i") };

  let from = fromRaw ? parseDateStart(fromRaw) : null;
  let to = toRaw ? parseDateEnd(toRaw) : null;

  if (!from && !to && Number.isFinite(daysRaw) && daysRaw > 0) {
    const now = new Date();
    to = new Date(now); to.setHours(23, 59, 59, 999);
    from = new Date(now); from.setDate(from.getDate() - (daysRaw - 1)); from.setHours(0, 0, 0, 0);
  }

  if (from || to) {
    filters.createdAt = {};
    if (from) filters.createdAt.$gte = from;
    if (to) filters.createdAt.$lte = to;
  }

  const elem = {};
  if (productId) elem.productId = { $regex: new RegExp(escapeRegex(productId), "i") };
  if (productName) elem.productName = { $regex: new RegExp(escapeRegex(productName), "i") };
  if (category) elem.productCategory = { $regex: new RegExp(escapeRegex(category), "i") };

  // ✅ damaged-only view even if return is mixed
  if (itemStatus) {
    if (!["restocked", "damaged"].includes(itemStatus)) return { ok: false, error: { itemStatus: "itemStatus must be restocked or damaged" } };
    elem.returnStockStatus = itemStatus;
  }

  if (Object.keys(elem).length > 0) filters.items = { $elemMatch: elem };

  return { ok: true, filters };
};

// POST /api/returns
const createReturn = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { invoiceId, type, items, defaultStockStatus } = req.body;

    if (!invoiceId || !mongoose.Types.ObjectId.isValid(invoiceId)) {
      return sendFail(res, { invoiceId: "Valid invoiceId is required" }, 400);
    }

    const inv = await SaleInvoice.findOne({ _id: invoiceId, workspaceId });
    if (!inv) return sendFail(res, { invoiceId: "Invoice not found" }, 404);

    if (inv.status !== "finalized") {
      return sendFail(res, { status: "Returns are allowed only for finalized invoices" }, 403);
    }

    const creator = await User.findById(req.user.userId).select("name");
    if (!creator) return sendFail(res, { user: "User not found" }, 404);

    let returnType = String(type || "").trim();
    if (returnType && !["full", "partial"].includes(returnType)) {
      return sendFail(res, { type: "type must be full or partial" }, 400);
    }

    let bodyItems = Array.isArray(items) ? items : null;

    // full without items => return all remaining
    if (!bodyItems) {
      returnType = returnType || "full";
      const defStatus = ["restocked", "damaged"].includes(String(defaultStockStatus || "restocked"))
        ? String(defaultStockStatus || "restocked")
        : "restocked";

      bodyItems = (inv.items || [])
        .map((it) => {
          const sold = Number(it.quantity || 0);
          const returned = Number(it.returnedQty || 0);
          const available = sold - returned;
          if (available <= 0) return null;
          return { productId: it.productId, qtyReturned: available, returnStockStatus: defStatus };
        })
        .filter(Boolean);
    } else {
      returnType = returnType || "partial";
      if (bodyItems.length === 0) return sendFail(res, { items: "items cannot be empty" }, 400);
    }

    const built = buildReturnItemsFromBody(inv, bodyItems);
    if (!built.ok) return sendFail(res, built.error, 400);

    const returnItems = built.items;

    const hasRestocked = returnItems.some((x) => x.returnStockStatus === "restocked");
    const hasDamaged = returnItems.some((x) => x.returnStockStatus === "damaged");
    const stockStatus = hasRestocked && hasDamaged ? "mixed" : hasRestocked ? "restocked" : "damaged";

    const totalRefundAmount = round2(returnItems.reduce((s, x) => s + x.lineRefundAmount, 0));
    const totalRefundRestocked = round2(returnItems.filter((x) => x.returnStockStatus === "restocked").reduce((s, x) => s + x.lineRefundAmount, 0));
    const totalRefundDamaged = round2(returnItems.filter((x) => x.returnStockStatus === "damaged").reduce((s, x) => s + x.lineRefundAmount, 0));
    const totalReturnedQty = returnItems.reduce((s, x) => s + x.qtyReturned, 0);

    // 1) Restock products first (rollback safe)
    const restockApplied = [];
    try {
      for (const it of returnItems) {
        if (it.returnStockStatus !== "restocked") continue;

        const p = await Product.findOneAndUpdate(
          { workspaceId, id: String(it.productId) },
          { $inc: { quantity: it.qtyReturned } },
          { new: true }
        );

        if (!p) throw new Error(`PRODUCT_NOT_FOUND:${it.productId}`);
        restockApplied.push({ productId: String(it.productId), qty: it.qtyReturned });
      }
    } catch (e) {
      for (const r of restockApplied) {
        await Product.updateOne({ workspaceId, id: r.productId }, { $inc: { quantity: -r.qty } });
      }
      const msg = String(e?.message || "");
      if (msg.startsWith("PRODUCT_NOT_FOUND:")) return sendFail(res, { productId: `Product not found: ${msg.split(":")[1]}` }, 404);
      return sendError(res, e.message, 500);
    }

    // 2) Update invoice returnedQty + returnStatus + totalRefundedAmount
    const invoiceChanges = [];
    for (const it of returnItems) {
      const invItem = inv.items.id(it._invoiceItemId);
      invItem.returnedQty = Number(invItem.returnedQty || 0) + it.qtyReturned;
      invoiceChanges.push({ _invoiceItemId: it._invoiceItemId, qty: it.qtyReturned });
    }

    inv.totalRefundedAmount = round2(Number(inv.totalRefundedAmount || 0) + totalRefundAmount);
    inv.returnStatus = getReturnStatusForInvoice(inv);

    try {
      await inv.save();
    } catch (e) {
      for (const ch of invoiceChanges) {
        const invItem = inv.items.id(ch._invoiceItemId);
        if (invItem) invItem.returnedQty = Math.max(0, Number(invItem.returnedQty || 0) - ch.qty);
      }
      inv.totalRefundedAmount = round2(Math.max(0, Number(inv.totalRefundedAmount || 0) - totalRefundAmount));
      inv.returnStatus = getReturnStatusForInvoice(inv);
      await inv.save().catch(() => {});

      for (const r of restockApplied) {
        await Product.updateOne({ workspaceId, id: r.productId }, { $inc: { quantity: -r.qty } });
      }
      return sendError(res, e.message, 500);
    }

    // 3) Create SaleReturn record
    try {
      const ret = await SaleReturn.create({
        workspaceId,

        invoiceId: inv._id,
        invoiceCode: inv.invoiceCode,
        invoiceName: inv.name || "",
        invoiceCreatedAt: inv.createdAt || null,
        invoiceFinalizedAt: inv.finalizedAt || null,
        invoiceCashierName: inv.createdByName || "",

        createdByUserId: req.user.userId,
        createdByName: creator.name,

        type: returnType,

        totalRefundAmount,
        totalRefundRestocked,
        totalRefundDamaged,
        totalReturnedQty,

        stockStatus,

        items: returnItems.map((x) => ({
          productId: x.productId,
          productName: x.productName,
          productCategory: x.productCategory || "",

          qtyReturned: x.qtyReturned,

          salePrice: x.salePrice,
          itemDiscountPercent: x.itemDiscountPercent,
          invoiceDiscountPercent: x.invoiceDiscountPercent,

          unitNetPrice: x.unitNetPrice,
          unitDiscountAmount: x.unitDiscountAmount,

          lineRefundAmount: x.lineRefundAmount,
          returnStockStatus: x.returnStockStatus,
        })),
      });

      return sendSuccess(res, { return: clean(ret, { withItems: true }) }, 201);
    } catch (e) {
      // rollback invoice + products
      for (const ch of invoiceChanges) {
        const invItem = inv.items.id(ch._invoiceItemId);
        if (invItem) invItem.returnedQty = Math.max(0, Number(invItem.returnedQty || 0) - ch.qty);
      }
      inv.totalRefundedAmount = round2(Math.max(0, Number(inv.totalRefundedAmount || 0) - totalRefundAmount));
      inv.returnStatus = getReturnStatusForInvoice(inv);
      await inv.save().catch(() => {});

      for (const r of restockApplied) {
        await Product.updateOne({ workspaceId, id: r.productId }, { $inc: { quantity: -r.qty } });
      }

      return sendError(res, e.message, 500);
    }
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// GET /api/returns
const listReturns = async (req, res) => {
  try {
    const built = buildReturnsFilters(req);
    if (!built.ok) return sendFail(res, built.error, 400);

    const pageRaw = parseInt(req.query.page || "1", 10);
    const limitRaw = parseInt(req.query.limit || "50", 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50;

    const total = await SaleReturn.countDocuments(built.filters);

    const returns = await SaleReturn.find(built.filters)
      .select(
        "workspaceId invoiceId invoiceCode invoiceName invoiceCreatedAt invoiceFinalizedAt invoiceCashierName createdByUserId createdByName type totalRefundAmount totalRefundRestocked totalRefundDamaged totalReturnedQty stockStatus createdAt updatedAt"
      )
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return sendSuccess(res, {
      pagination: { page, limit, total },
      returns: clean(returns, { withItems: false }),
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// GET /api/returns/:id
const getReturnById = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) return sendFail(res, { id: "Invalid return id" }, 400);

    const ret = await SaleReturn.findOne({ _id: id, workspaceId });
    if (!ret) return sendFail(res, { id: "Return not found" }, 404);

    return sendSuccess(res, { return: clean(ret, { withItems: true }) });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// GET /api/returns/summary?days=30&itemStatus=damaged&from=...&to=...
const returnsSummary = async (req, res) => {
  try {
    const built = buildReturnsFilters(req);
    if (!built.ok) return sendFail(res, built.error, 400);

    const match = { ...built.filters };
    match.workspaceId = new mongoose.Types.ObjectId(req.user.workspaceId);

    const agg = await SaleReturn.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalRefundAmount: { $sum: "$totalRefundAmount" },
          totalRefundRestocked: { $sum: "$totalRefundRestocked" },
          totalRefundDamaged: { $sum: "$totalRefundDamaged" },
          totalReturnedQty: { $sum: "$totalReturnedQty" },
        },
      },
    ]);

    const row = agg[0] || {
      count: 0,
      totalRefundAmount: 0,
      totalRefundRestocked: 0,
      totalRefundDamaged: 0,
      totalReturnedQty: 0,
    };

    return sendSuccess(res, {
      summary: {
        count: row.count,
        totalRefundAmount: round2(row.totalRefundAmount),
        totalRefundRestocked: round2(row.totalRefundRestocked),
        totalRefundDamaged: round2(row.totalRefundDamaged),
        totalReturnedQty: row.totalReturnedQty,
      },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export { createReturn, listReturns, getReturnById, returnsSummary };