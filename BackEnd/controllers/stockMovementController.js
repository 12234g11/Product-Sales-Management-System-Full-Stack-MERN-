import mongoose from "mongoose";
import StockMovement from "../models/StockMovement.js";
import { sendSuccess, sendFail, sendError } from "../utils/jsend.js";

const norm = (s) => String(s || "").trim().replace(/\s+/g, " ");
const escapeRegex = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const cleanMovement = (m) => {
  const obj = m?.toObject ? m.toObject() : { ...m };
  if (!obj) return obj;
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

/**
 * build filters (AND between params)
 * supported:
 *  - type=purchase|sale|sale_return|adjustment
 *  - productId (exact/case-insensitive)
 *  - refType, refCode
 *  - performedByName
 *  - performedByUserId
 *  - reason
 *  - direction=in|out  (qtyDelta >0 / <0)
 *  - from/to (createdAt)
 *  - q=words (AND across words; each word can match any of several fields)
 */
const buildMovementFilters = (req, productIdFromParam = "") => {
  const workspaceId = req.user.workspaceId;

  const type = norm(req.query.type);
  const productId = productIdFromParam ? norm(productIdFromParam) : norm(req.query.productId);

  const refType = norm(req.query.refType);
  const refCode = norm(req.query.refCode);

  const performedByName = norm(req.query.performedByName);
  const performedByUserId = norm(req.query.performedByUserId);

  const reason = norm(req.query.reason);
  const direction = norm(req.query.direction); // in|out

  const q = norm(req.query.q);

  const fromRaw = norm(req.query.from);
  const toRaw = norm(req.query.to);

  const filters = { workspaceId };
  const andParts = [];

  if (type) {
    const allowed = ["purchase", "sale", "sale_return", "adjustment"];
    if (!allowed.includes(type)) {
      return { ok: false, error: { type: `type must be one of: ${allowed.join(", ")}` } };
    }
    filters.type = type;
  }

  // productId exact (case-insensitive)
  if (productId) {
    filters.productId = { $regex: new RegExp(`^${escapeRegex(productId)}$`, "i") };
  }

  if (refType) filters.refType = { $regex: new RegExp(escapeRegex(refType), "i") };
  if (refCode) filters.refCode = { $regex: new RegExp(escapeRegex(refCode), "i") };

  if (performedByName) filters.performedByName = { $regex: new RegExp(escapeRegex(performedByName), "i") };

  if (performedByUserId) {
    if (!mongoose.Types.ObjectId.isValid(performedByUserId)) {
      return { ok: false, error: { performedByUserId: "Invalid performedByUserId" } };
    }
    filters.performedByUserId = new mongoose.Types.ObjectId(performedByUserId);
  }

  if (reason) filters.reason = { $regex: new RegExp(escapeRegex(reason), "i") };

  if (direction) {
    if (!["in", "out"].includes(direction)) {
      return { ok: false, error: { direction: "direction must be 'in' or 'out'" } };
    }
    filters.qtyDelta = direction === "in" ? { $gt: 0 } : { $lt: 0 };
  }

  const from = fromRaw ? parseDateStart(fromRaw) : null;
  const to = toRaw ? parseDateEnd(toRaw) : null;
  if ((fromRaw && !from) || (toRaw && !to)) {
    return { ok: false, error: { date: "Invalid from/to date" } };
  }

  if (from || to) {
    filters.createdAt = {};
    if (from) filters.createdAt.$gte = from;
    if (to) filters.createdAt.$lte = to;
  }

  // q search AND across words
  if (q) {
    const terms = q
      .split(" ")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 6);

    for (const term of terms) {
      const r = new RegExp(escapeRegex(term), "i");
      andParts.push({
        $or: [
          { productId: { $regex: r } },
          { productName: { $regex: r } },
          { productCategory: { $regex: r } },
          { refType: { $regex: r } },
          { refCode: { $regex: r } },
          { performedByName: { $regex: r } },
          { reason: { $regex: r } },
          { note: { $regex: r } },
        ],
      });
    }
  }

  if (andParts.length) {
    filters.$and = [...(filters.$and || []), ...andParts];
  }

  return { ok: true, filters };
};

// GET /api/stock-movements
const listStockMovements = async (req, res) => {
  try {
    const built = buildMovementFilters(req);
    if (!built.ok) return sendFail(res, built.error, 400);

    const pageRaw = parseInt(req.query.page || "1", 10);
    const limitRaw = parseInt(req.query.limit || "50", 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 50;

    const total = await StockMovement.countDocuments(built.filters);

    const rows = await StockMovement.find(built.filters)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return sendSuccess(res, {
      pagination: { page, limit, total },
      movements: rows.map(cleanMovement),
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// GET /api/products/:id/movements  (Shortcut)
const listMovementsForProduct = async (req, res) => {
  try {
    const productId = norm(req.params.id);

    const built = buildMovementFilters(req, productId);
    if (!built.ok) return sendFail(res, built.error, 400);

    const pageRaw = parseInt(req.query.page || "1", 10);
    const limitRaw = parseInt(req.query.limit || "50", 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 50;

    const total = await StockMovement.countDocuments(built.filters);

    const rows = await StockMovement.find(built.filters)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return sendSuccess(res, {
      pagination: { page, limit, total },
      movements: rows.map(cleanMovement),
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export { listStockMovements, listMovementsForProduct };