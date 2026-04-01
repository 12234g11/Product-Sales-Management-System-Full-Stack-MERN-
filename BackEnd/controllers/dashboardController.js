// controllers/dashboardController.js
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Workspace from "../models/Workspace.js";
import SaleInvoice from "../models/SaleInvoice.js";
import PurchaseInvoice from "../models/PurchaseInvoice.js";
import SaleReturn from "../models/SaleReturn.js";
import StockMovement from "../models/StockMovement.js";
import User from "../models/User.js";
import { sendSuccess, sendFail, sendError } from "../utils/jsend.js";

// ------------------------------
// Date Range (Dashboard Filter)
// Supported:
//  - preset=today
//  - preset=last&days=7
//  - preset=since_creation
//  - from=YYYY-MM-DD&to=YYYY-MM-DD
//  - date=YYYY-MM-DD
// Rule: choose ONE mode only.
// ------------------------------

const pad2 = (n) => String(n).padStart(2, "0");

const mongoTz = () => {
  // Use server's local timezone offset (e.g. +02:00)
  const mins = -new Date().getTimezoneOffset();
  const sign = mins >= 0 ? "+" : "-";
  const abs = Math.abs(mins);
  const hh = Math.floor(abs / 60);
  const mm = abs % 60;
  return `${sign}${pad2(hh)}:${pad2(mm)}`;
};

const parseDateOnlyLocal = (raw) => {
  const s = String(raw || "").trim();
  if (!s) return null;

  // YYYY-MM-DD
  const m1 = s.match(/^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})$/);
  if (m1) {
    const y = Number(m1[1]);
    const mo = Number(m1[2]);
    const d = Number(m1[3]);
    const dt = new Date(y, mo - 1, d);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  }

  // DD/MM/YYYY (fallback)
  const m2 = s.match(/^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})$/);
  if (m2) {
    const d = Number(m2[1]);
    const mo = Number(m2[2]);
    const y = Number(m2[3]);
    const dt = new Date(y, mo - 1, d);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  }

  return null;
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const fmtDateLabel = (d) => {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = pad2(x.getMonth() + 1);
  const day = pad2(x.getDate());
  return `${y}-${m}-${day}`;
};

const resolveDashboardRange = async (req, opts = {}) => {
  const defaultMode = opts.defaultMode || "today";
  const defaultDays = Number.isFinite(opts.defaultDays) ? opts.defaultDays : 30;

  const presetRaw = String(req.query.preset || "").trim();
  const daysRaw = req.query.days != null ? parseInt(String(req.query.days), 10) : null;
  const fromRaw = String(req.query.from || "").trim();
  const toRaw = String(req.query.to || "").trim();
  const dateRaw = String(req.query.date || "").trim();

  const hasPreset = Boolean(presetRaw);
  const hasRange = Boolean(fromRaw || toRaw);
  const hasDate = Boolean(dateRaw);

  const modesUsed = [hasPreset, hasRange, hasDate].filter(Boolean).length;
  if (modesUsed > 1) {
    return {
      ok: false,
      code: 400,
      error: { filter: "Choose only one filter mode: preset OR (from/to) OR date" },
    };
  }

  const now = new Date();
  let mode = defaultMode;
  let from = null;
  let to = null;
  let label = "";

  if (hasDate) {
    const d = parseDateOnlyLocal(dateRaw);
    if (!d) return { ok: false, code: 400, error: { date: "Invalid date" } };
    mode = "date";
    from = startOfDay(d);
    to = endOfDay(d);
    label = fmtDateLabel(d);
  } else if (hasRange) {
    const f = fromRaw ? parseDateOnlyLocal(fromRaw) : null;
    const t = toRaw ? parseDateOnlyLocal(toRaw) : null;
    if ((fromRaw && !f) || (toRaw && !t)) {
      return { ok: false, code: 400, error: { date: "Invalid from/to" } };
    }
    mode = "range";
    from = f ? startOfDay(f) : null;
    to = t ? endOfDay(t) : null;
    if (from && to && from > to) {
      return { ok: false, code: 400, error: { date: "from must be <= to" } };
    }
    label = `${from ? fmtDateLabel(from) : "..."} إلى ${to ? fmtDateLabel(to) : "..."}`;
  } else {
    // Backward-compat: if only days=... was sent, treat as preset=last
    const preset = hasPreset
      ? presetRaw
      : (Number.isFinite(daysRaw) && daysRaw > 0 ? "last" : defaultMode);

    if (preset === "today") {
      mode = "today";
      from = startOfDay(now);
      to = endOfDay(now);
      label = "today";
    } else if (preset === "last") {
      mode = "last";
      const days = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : defaultDays;
      if (!Number.isFinite(days) || days <= 0) {
        return { ok: false, code: 400, error: { days: "days must be a positive integer" } };
      }
      const end = endOfDay(now);
      const start = startOfDay(now);
      start.setDate(start.getDate() - (days - 1));
      from = start;
      to = end;
      label = `آخر ${days} يوم`;
    } else if (preset === "since_creation") {
      mode = "since_creation";
      let createdAt = opts.workspaceCreatedAt || null;
      if (!createdAt) {
        const ws = await Workspace.findById(req.user.workspaceId, { createdAt: 1 }).lean();
        createdAt = ws?.createdAt || null;
      }
      if (!createdAt) createdAt = new Date(0);
      from = startOfDay(createdAt);
      to = endOfDay(now);
      label = "منذ الإنشاء";
    } else {
      return { ok: false, code: 400, error: { preset: "preset must be one of: today, last, since_creation" } };
    }
  }

  if (!from) from = startOfDay(now);
  if (!to) to = endOfDay(now);

  return {
    ok: true,
    range: { mode, from, to, label, timezone: mongoTz() },
  };
};

/**
 * GET /api/dashboard/charts/sales-trend
 */
const getSalesTrend = async (req, res) => {
  try {
    const built = await resolveDashboardRange(req, { defaultMode: "last", defaultDays: 30 });
    if (!built.ok) return sendFail(res, built.error, built.code || 400);

    const { from: start, to: end, timezone } = built.range;
    const workspaceId = new mongoose.Types.ObjectId(req.user.workspaceId);
    const tz = timezone;

    const salesRows = await SaleInvoice.aggregate([
      {
        $match: {
          workspaceId,
          status: "finalized",
          finalizedAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$finalizedAt", timezone: tz } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, label: "$_id", revenue: 1, orders: 1 } },
    ]);

    const returnRows = await SaleReturn.aggregate([
      {
        $match: {
          workspaceId,
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: tz } },
          refunds: { $sum: "$totalRefundAmount" },
          returns: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, label: "$_id", refunds: 1, returns: 1 } },
    ]);

    const map = new Map();

    for (const r of salesRows) {
      map.set(r.label, {
        label: r.label,
        revenue: Number(r.revenue || 0),
        orders: Number(r.orders || 0),
        refunds: 0,
        returns: 0,
        netRevenue: Number(r.revenue || 0),
      });
    }

    for (const r of returnRows) {
      const cur =
        map.get(r.label) || ({
          label: r.label,
          revenue: 0,
          orders: 0,
          refunds: 0,
          returns: 0,
          netRevenue: 0,
        });

      cur.refunds = Number(r.refunds || 0);
      cur.returns = Number(r.returns || 0);
      cur.netRevenue = Number(cur.revenue || 0) - Number(cur.refunds || 0);

      map.set(r.label, cur);
    }

    // fill missing days
    const filled = [];
    const cursor = startOfDay(start);
    const endDay = startOfDay(end);
    while (cursor <= endDay) {
      const label = fmtDateLabel(cursor);
      const row = map.get(label) || {
        label,
        revenue: 0,
        orders: 0,
        refunds: 0,
        returns: 0,
        netRevenue: 0,
      };
      row.netRevenue = Number(row.revenue || 0) - Number(row.refunds || 0);
      filled.push(row);
      cursor.setDate(cursor.getDate() + 1);
    }

    return sendSuccess(res, {
      meta: { mode: built.range.mode, label: built.range.label, from: built.range.from, to: built.range.to },
      series: filled,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * GET /api/dashboard/charts/stock-status
 * stock status as-of end date (to)
 * uses per-product minStock
 */
const getStockStatus = async (req, res) => {
  try {
    const workspaceId = new mongoose.Types.ObjectId(req.user.workspaceId);

    const built = await resolveDashboardRange(req, { defaultMode: "today" });
    if (!built.ok) return sendFail(res, built.error, built.code || 400);

    const asOf = built.range.to;

    const products = await Product.find(
      { workspaceId },
      { id: 1, quantity: 1, minStock: 1, createdAt: 1 }
    ).lean();

    const eligible = products.filter((p) => !p.createdAt || new Date(p.createdAt) <= asOf);

    // reverse movements AFTER asOf to get quantity as-of asOf
    const afterRows = await StockMovement.aggregate([
      {
        $match: {
          workspaceId,
          createdAt: { $gt: asOf },
        },
      },
      {
        $group: {
          _id: "$productId",
          sumAfter: { $sum: "$qtyDelta" },
        },
      },
    ]);

    const afterMap = new Map(afterRows.map((r) => [String(r._id), Number(r.sumAfter || 0)]));

    let outOfStock = 0;
    let belowMin = 0;
    let inStock = 0;
    let noMinStock = 0;

    for (const p of eligible) {
      const curQty = Number(p.quantity || 0);
      const sumAfter = afterMap.get(String(p.id)) || 0;
      const qtyAsOf = curQty - sumAfter;

      const ms = Number(p.minStock || 0);
      if (ms <= 0) noMinStock++;

      if (qtyAsOf <= 0) outOfStock++;
      else if (ms > 0 && qtyAsOf < ms) belowMin++;
      else inStock++;
    }

    return sendSuccess(res, {
      meta: { mode: built.range.mode, label: built.range.label, from: built.range.from, to: built.range.to, asOf },
      series: [
        { label: "Out of Stock", value: outOfStock },
        { label: "Below Min Stock", value: belowMin },
        { label: "In Stock", value: inStock },
      ],
      extra: { noMinStock },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * GET /api/dashboard/overview
 */
const getDashboardOverview = async (req, res) => {
  try {
    const workspaceId = new mongoose.Types.ObjectId(req.user.workspaceId);

    const workspace = await Workspace.findById(req.user.workspaceId, { createdAt: 1, name: 1 }).lean();
    const workspaceCreatedAt = workspace?.createdAt || null;

    const built = await resolveDashboardRange(req, { defaultMode: "today", workspaceCreatedAt });
    if (!built.ok) return sendFail(res, built.error, built.code || 400);

    const { from: start, to: end } = built.range;

    // ---- Inventory snapshot (NOW) ----
    const products = await Product.find(
      { workspaceId },
      { purchasePrice: 1, salePrice: 1, quantity: 1, minStock: 1, category: 1 }
    ).lean();

    const productsCount = products.length;
    const categoriesSet = new Set();

    let totalStockUnits = 0;
    let inventoryPurchaseValue = 0;
    let inventorySaleValue = 0;
    let belowMinStockCount = 0;
    let outOfStockCount = 0;
    let noMinStockCount = 0;

    for (const p of products) {
      const q = Number(p.quantity || 0);
      const buy = Number(p.purchasePrice || 0);
      const sell = Number(p.salePrice || 0);
      const ms = Number(p.minStock || 0);
      const cat = String(p.category || "").trim();
      if (cat) categoriesSet.add(cat);

      totalStockUnits += q;
      inventoryPurchaseValue += buy * q;
      inventorySaleValue += sell * q;

      if (ms <= 0) noMinStockCount++;
      if (q === 0) outOfStockCount++;
      else if (ms > 0 && q < ms) belowMinStockCount++;
    }

    const categoriesCount = categoriesSet.size;
    const inventoryPotentialProfit = inventorySaleValue - inventoryPurchaseValue;
    const inStockCount = Math.max(0, productsCount - outOfStockCount - belowMinStockCount);

    // ---- Sales (filtered by range) ----
    const [salesAgg] = await SaleInvoice.aggregate([
      {
        $match: {
          workspaceId,
          status: "finalized",
          finalizedAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          salesInvoicesCount: { $sum: 1 },
          salesRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    // ---- Returns (filtered by range) ----
    const [returnsAgg] = await SaleReturn.aggregate([
      { $match: { workspaceId, createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          returnsCount: { $sum: 1 },
          refundTotal: { $sum: "$totalRefundAmount" },
          refundRestockedTotal: { $sum: "$totalRefundRestocked" },
          refundDamagedTotal: { $sum: "$totalRefundDamaged" },
          returnedQtyTotal: { $sum: "$totalReturnedQty" },
        },
      },
    ]);

    // ---- Purchases (filtered by range) ----
    const [purchasesAgg] = await PurchaseInvoice.aggregate([
      {
        $match: {
          workspaceId,
          status: "finalized",
          finalizedAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          purchaseInvoicesCount: { $sum: 1 },
          purchaseSpend: { $sum: "$totalAmount" },
        },
      },
    ]);

    // ---- Users snapshot ----
    const [usersAgg] = await User.aggregate([
      { $match: { workspaceId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          admins: { $sum: { $cond: [{ $eq: ["$role", "admin"] }, 1, 0] } },
          workers: { $sum: { $cond: [{ $eq: ["$role", "user"] }, 1, 0] } },
          active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
          disabled: { $sum: { $cond: [{ $eq: ["$status", "disabled"] }, 1, 0] } },
        },
      },
    ]);

    const salesInvoicesCount = Number(salesAgg?.salesInvoicesCount || 0);
    const salesRevenue = Number(salesAgg?.salesRevenue || 0);

    const returnsCount = Number(returnsAgg?.returnsCount || 0);
    const refundTotal = Number(returnsAgg?.refundTotal || 0);
    const refundRestockedTotal = Number(returnsAgg?.refundRestockedTotal || 0);
    const refundDamagedTotal = Number(returnsAgg?.refundDamagedTotal || 0);
    const returnedQtyTotal = Number(returnsAgg?.returnedQtyTotal || 0);

    const netRevenue = salesRevenue - refundTotal;

    const purchaseInvoicesCount = Number(purchasesAgg?.purchaseInvoicesCount || 0);
    const purchaseSpend = Number(purchasesAgg?.purchaseSpend || 0);

    const usersTotal = Number(usersAgg?.total || 0);
    const adminsCount = Number(usersAgg?.admins || 0);
    const workersCount = Number(usersAgg?.workers || 0);
    const activeUsersCount = Number(usersAgg?.active || 0);
    const disabledUsersCount = Number(usersAgg?.disabled || 0);

    // ---- Realized Profit (Estimated) ----
    const soldPerProduct = await SaleInvoice.aggregate([
      {
        $match: {
          workspaceId,
          status: "finalized",
          finalizedAt: { $gte: start, $lte: end },
        },
      },
      { $unwind: "$items" },
      { $group: { _id: "$items.productId", soldQty: { $sum: "$items.quantity" } } },
    ]);

    const restockedReturnsPerProduct = await SaleReturn.aggregate([
      { $match: { workspaceId, createdAt: { $gte: start, $lte: end } } },
      { $unwind: "$items" },
      { $match: { "items.returnStockStatus": "restocked" } },
      { $group: { _id: "$items.productId", restockedQty: { $sum: "$items.qtyReturned" } } },
    ]);

    const soldMap = new Map(soldPerProduct.map((r) => [String(r._id), Number(r.soldQty || 0)]));
    const restockedMap = new Map(restockedReturnsPerProduct.map((r) => [String(r._id), Number(r.restockedQty || 0)]));

    const allProductIds = [...new Set([...soldMap.keys(), ...restockedMap.keys()])];

    const costProducts = await Product.find(
      { workspaceId, id: { $in: allProductIds } },
      { id: 1, purchasePrice: 1 }
    ).lean();

    const costMap = new Map(costProducts.map((p) => [String(p.id), Number(p.purchasePrice || 0)]));

    let cogsEstimated = 0;
    for (const pid of allProductIds) {
      const soldQty = soldMap.get(pid) || 0;
      const restockedQty = restockedMap.get(pid) || 0;
      const netOutQty = soldQty - restockedQty;
      const unitCost = costMap.get(pid) || 0;
      cogsEstimated += unitCost * netOutQty;
    }

    const realizedProfitEstimated = netRevenue - cogsEstimated;

    return sendSuccess(res, {
      meta: {
        workspaceCreatedAt,
        generatedAt: new Date(),
        mode: built.range.mode,
        label: built.range.label,
        from: built.range.from,
        to: built.range.to,
      },
      inventory: {
        productsCount,
        categoriesCount,
        totalStockUnits,
        inventoryPurchaseValue,
        inventorySaleValue,
        inventoryPotentialProfit,
        outOfStockCount,
        belowMinStockCount,
        inStockCount,
        noMinStockCount,
      },
      sales: { salesInvoicesCount, salesRevenue, netRevenue },
      purchases: { purchaseInvoicesCount, purchaseSpend },
      returns: { returnsCount, refundTotal, refundRestockedTotal, refundDamagedTotal, returnedQtyTotal },
      profit: { inventoryPotentialProfit, cogsEstimated, realizedProfitEstimated },
      users: { usersTotal, adminsCount, workersCount, activeUsersCount, disabledUsersCount },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export { getSalesTrend, getStockStatus, getDashboardOverview };