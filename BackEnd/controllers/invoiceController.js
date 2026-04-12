import mongoose from "mongoose";
import SaleInvoice from "../models/SaleInvoice.js";
import SaleReturn from "../models/SaleReturn.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import StockMovement from "../models/StockMovement.js";
import Workspace from "../models/Workspace.js";
import { sendSuccess, sendFail, sendError } from "../utils/jsend.js";
import { clean } from "../utils/cleanResponseForInvoices.js";
import { recalcInvoiceTotals, setInvoiceUnitNetPrices } from "../utils/invoiceTotals.js";
import { renderReceiptHtml } from "../utils/receiptHtml.js";

const norm = (s) => String(s || "").trim().replace(/\s+/g, " ");
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePercent = (value, fieldName) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return { ok: false, error: `${fieldName} must be a valid number` };
  if (n < 0 || n > 100) return { ok: false, error: `${fieldName} must be between 0 and 100` };
  return { ok: true, value: n };
};

const loadDiscountLimits = async (userId) => {
  const u = await User.findById(userId).select("role maxItemDiscountPercent maxInvoiceDiscountPercent");
  if (!u) return null;

  return {
    role: u.role,
    maxItemDiscountPercent: Number(u.maxItemDiscountPercent ?? 0),
    maxInvoiceDiscountPercent: Number(u.maxInvoiceDiscountPercent ?? 0),
  };
};

// POST /api/invoices
const createInvoiceDraft = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { invoiceCode, name } = req.body;

    const code = norm(invoiceCode);
    if (!code) return sendFail(res, { invoiceCode: "invoiceCode is required" }, 400);

    const exists = await SaleInvoice.findOne({ workspaceId, invoiceCode: code }).select("_id");
    if (exists) return sendFail(res, { invoiceCode: "Invoice code already exists" }, 409);

    // ✅ prefer middleware name (fallback to DB)
    let createdByName = String(req.user.name || "").trim();
    if (!createdByName) {
      const creator = await User.findById(req.user.userId).select("name");
      if (!creator) return sendFail(res, { user: "User not found" }, 404);
      createdByName = creator.name;
    }

    const inv = await SaleInvoice.create({
      workspaceId,
      invoiceCode: code,
      name: String(name || "").trim(),
      status: "draft",
      createdByUserId: req.user.userId,
      createdByName,
      items: [],
      invoiceDiscountPercent: 0,
      returnStatus: "none",
      totalRefundedAmount: 0,
    });

    recalcInvoiceTotals(inv);
    await inv.save();

    return sendSuccess(res, { invoice: clean(inv, { withItems: true }) }, 201);
  } catch (error) {
    if (error?.code === 11000) return sendFail(res, { invoiceCode: "Invoice code already exists" }, 409);
    if (error?.name === "ValidationError") return sendFail(res, { message: error.message }, 400);
    return sendError(res, error.message, 500);
  }
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

// build filters for invoices list (like returns)
const buildInvoicesFilters = (req) => {
    const workspaceId = req.user.workspaceId;

    const status = req.query.status ? String(req.query.status).trim() : "";
    const returnStatus = req.query.returnStatus ? String(req.query.returnStatus).trim() : "";

    const excludeFullyReturned = String(req.query.excludeFullyReturned || "").toLowerCase() === "true";

    const search = req.query.search ? String(req.query.search).trim() : "";
    const invoiceCode = req.query.invoiceCode ? String(req.query.invoiceCode).trim() : "";

    const createdByName = req.query.createdByName ? String(req.query.createdByName).trim() : "";
    const createdByUserId = req.query.createdByUserId ? String(req.query.createdByUserId).trim() : "";

    const minTotalAmount = req.query.minTotalAmount != null ? Number(req.query.minTotalAmount) : null;
    const maxTotalAmount = req.query.maxTotalAmount != null ? Number(req.query.maxTotalAmount) : null;

    const fromRaw = req.query.from ? String(req.query.from).trim() : "";
    const toRaw = req.query.to ? String(req.query.to).trim() : "";
    const daysRaw = req.query.days ? parseInt(String(req.query.days), 10) : null;

    // ✅ item-level filters (product search)
    const productId = req.query.productId ? String(req.query.productId).trim() : "";
    const productName = req.query.productName ? String(req.query.productName).trim() : "";
    const category = req.query.category ? String(req.query.category).trim() : "";

    const filters = { workspaceId };

    // status
    if (status) {
        if (!["draft", "finalized", "cancelled"].includes(status)) {
            return { ok: false, error: { status: "status must be draft, finalized, or cancelled" } };
        }
        filters.status = status;
    }

    // returnStatus
    if (returnStatus) {
        if (!["none", "partial", "full"].includes(returnStatus)) {
            return { ok: false, error: { returnStatus: "returnStatus must be none, partial, or full" } };
        }
        filters.returnStatus = returnStatus;
    }

    // ✅ excludeFullyReturned should NOT override returnStatus
    if (excludeFullyReturned && !returnStatus) {
        filters.returnStatus = { $ne: "full" };
    }

    // exact invoiceCode (case-insensitive)
    if (invoiceCode) {
        filters.invoiceCode = { $regex: new RegExp(`^${escapeRegex(invoiceCode)}$`, "i") };
    }

    // search (invoiceCode OR name)
    if (search) {
        const regex = new RegExp(escapeRegex(search), "i");
        filters.$or = [{ invoiceCode: { $regex: regex } }, { name: { $regex: regex } }];
    }

    // createdByName
    if (createdByName) {
        filters.createdByName = { $regex: new RegExp(escapeRegex(createdByName), "i") };
    }

    // createdByUserId
    if (createdByUserId) {
        if (!mongoose.Types.ObjectId.isValid(createdByUserId)) {
            return { ok: false, error: { createdByUserId: "Invalid createdByUserId" } };
        }
        filters.createdByUserId = new mongoose.Types.ObjectId(createdByUserId);
    }

    // totalAmount range
    if (minTotalAmount != null) {
        if (!Number.isFinite(minTotalAmount) || minTotalAmount < 0) {
            return { ok: false, error: { minTotalAmount: "minTotalAmount must be a non-negative number" } };
        }
        filters.totalAmount = { ...(filters.totalAmount || {}), $gte: minTotalAmount };
    }

    if (maxTotalAmount != null) {
        if (!Number.isFinite(maxTotalAmount) || maxTotalAmount < 0) {
            return { ok: false, error: { maxTotalAmount: "maxTotalAmount must be a non-negative number" } };
        }
        filters.totalAmount = { ...(filters.totalAmount || {}), $lte: maxTotalAmount };
    }

    // date filter by createdAt (from/to OR days)
    let from = fromRaw ? parseDateStart(fromRaw) : null;
    let to = toRaw ? parseDateEnd(toRaw) : null;

    if (!from && !to && Number.isFinite(daysRaw) && daysRaw > 0) {
        const now = new Date();
        to = new Date(now);
        to.setHours(23, 59, 59, 999);
        from = new Date(now);
        from.setDate(from.getDate() - (daysRaw - 1));
        from.setHours(0, 0, 0, 0);
    }

    if (from || to) {
        filters.createdAt = {};
        if (from) filters.createdAt.$gte = from;
        if (to) filters.createdAt.$lte = to;
    }

    // ✅ items elemMatch (productId/productName/category)
    const elem = {};
    if (productId) elem.productId = { $regex: new RegExp(escapeRegex(productId), "i") };
    if (productName) elem.productName = { $regex: new RegExp(escapeRegex(productName), "i") };
    if (category) elem.productCategory = { $regex: new RegExp(escapeRegex(category), "i") };

    if (Object.keys(elem).length > 0) {
        filters.items = { $elemMatch: elem };
    }

    return { ok: true, filters };
};

// GET /api/invoices
const listInvoices = async (req, res) => {
    try {
        const built = buildInvoicesFilters(req);
        if (!built.ok) return sendFail(res, built.error, 400);

        const pageRaw = parseInt(req.query.page || "1", 10);
        const limitRaw = parseInt(req.query.limit || "50", 10);

        const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50;

        const total = await SaleInvoice.countDocuments(built.filters);

        const invoices = await SaleInvoice.find(built.filters)
            .select(
                "workspaceId invoiceCode name status createdByUserId createdByName createdAt updatedAt finalizedAt subtotal totalDiscountAmount totalAmount totalItemsQty invoiceDiscountPercent returnStatus totalRefundedAmount"
            )
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        return sendSuccess(res, {
            pagination: { page, limit, total },
            invoices: clean(invoices, { withItems: false }),
        });
    } catch (error) {
        return sendError(res, error.message, 500);
    }
};
// GET /api/invoices/:id
const getInvoiceById = async (req, res) => {
    try {
        const workspaceId = req.user.workspaceId;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) return sendFail(res, { id: "Invalid invoice id" }, 400);

        const inv = await SaleInvoice.findOne({ _id: id, workspaceId });
        if (!inv) return sendFail(res, { id: "Invoice not found" }, 404);

        return sendSuccess(res, { invoice: clean(inv, { withItems: true }) });
    } catch (error) {
        return sendError(res, error.message, 500);
    }
};

// GET /api/invoices/:id/returns  => all return operations for this invoice
const getInvoiceReturns = async (req, res) => {
    try {
        const workspaceId = req.user.workspaceId;
        const { id: invoiceId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(invoiceId)) return sendFail(res, { id: "Invalid invoice id" }, 400);

        const inv = await SaleInvoice.findOne({ _id: invoiceId, workspaceId }).select(
            "invoiceCode name status createdAt finalizedAt createdByName returnStatus totalRefundedAmount totalAmount subtotal totalDiscountAmount invoiceDiscountPercent"
        );
        if (!inv) return sendFail(res, { id: "Invoice not found" }, 404);

        const returns = await SaleReturn.find({ workspaceId, invoiceId: inv._id })
            .sort({ createdAt: -1 });

        // return controller clean util has more details; but here we keep raw lean-ish
        return sendSuccess(res, {
            invoice: {
                id: inv._id,
                invoiceCode: inv.invoiceCode,
                name: inv.name || "",
                status: inv.status,
                createdAt: inv.createdAt,
                finalizedAt: inv.finalizedAt,
                createdByName: inv.createdByName,
                subtotal: inv.subtotal,
                totalDiscountAmount: inv.totalDiscountAmount,
                totalAmount: inv.totalAmount,
                invoiceDiscountPercent: inv.invoiceDiscountPercent,
                returnStatus: inv.returnStatus,
                totalRefundedAmount: inv.totalRefundedAmount,
            },
            returns,
        });
    } catch (error) {
        return sendError(res, error.message, 500);
    }
};

// POST /api/invoices/:id/items
const addInvoiceItem = async (req, res) => {
    try {
        const workspaceId = req.user.workspaceId;
        const { id: invoiceId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(invoiceId)) return sendFail(res, { id: "Invalid invoice id" }, 400);

        const allowed = ["productId", "id", "name", "quantity"];
        const extra = Object.keys(req.body).find((k) => !allowed.includes(k));
        if (extra) return sendFail(res, { message: `Field '${extra}' is not allowed` }, 400);

        let { productId, id, name, quantity } = req.body;

        const qty = Number(quantity);
        if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
            return sendFail(res, { quantity: "quantity must be a positive integer" }, 400);
        }

        const pid = norm(productId || id);
        const pname = name ? norm(name) : null;
        if (!pid && !pname) return sendFail(res, { message: "productId/id or name is required" }, 400);

        const inv = await SaleInvoice.findOne({ _id: invoiceId, workspaceId });
        if (!inv) return sendFail(res, { id: "Invoice not found" }, 404);

        if (inv.status !== "draft") {
            return sendFail(res, { status: "You can only edit items on draft invoices" }, 403);
        }

        let product = null;

        if (pid) {
            product = await Product.findOne({ workspaceId, id: pid });
            if (!product) return sendFail(res, { productId: "Product not found" }, 404);

            if (pname && norm(product.name).toLowerCase() !== pname.toLowerCase()) {
                return sendFail(res, { name: "Name does not match this product id" }, 400);
            }
        } else {
            const matches = await Product.find({
                workspaceId,
                name: { $regex: `^${escapeRegex(pname)}$`, $options: "i" },
            }).limit(5);

            if (matches.length === 0) return sendFail(res, { name: "Product not found" }, 404);

            if (matches.length > 1) {
                return sendFail(
                    res,
                    {
                        message: "Multiple products have the same name. Please choose one by productId.",
                        candidates: matches.map((p) => ({ id: p.id, name: p.name })),
                    },
                    409
                );
            }

            product = matches[0];
        }

        const existing = inv.items.find((it) => String(it.productId) === String(product.id));
        if (existing) {
            existing.quantity = Number(existing.quantity) + qty;
        } else {
            inv.items.push({
                productId: product.id,
                productName: product.name,
                productCategory: product.category || "",
                salePrice: Number(product.salePrice),
                quantity: qty,
                itemDiscountPercent: 0,
                returnedQty: 0,
                unitNetPrice: 0,
            });
        }

        recalcInvoiceTotals(inv);
        await inv.save();

        return sendSuccess(res, { invoice: clean(inv, { withItems: true }) });
    } catch (error) {
        if (error?.name === "ValidationError") return sendFail(res, { message: error.message }, 400);
        return sendError(res, error.message, 500);
    }
};

// PATCH /api/invoices/:id/items/:itemId
const updateInvoiceItemQty = async (req, res) => {
    try {
        const workspaceId = req.user.workspaceId;
        const { id: invoiceId, itemId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(invoiceId)) return sendFail(res, { id: "Invalid invoice id" }, 400);
        if (!mongoose.Types.ObjectId.isValid(itemId)) return sendFail(res, { itemId: "Invalid item id" }, 400);

        const allowed = ["quantity"];
        const extra = Object.keys(req.body).find((k) => !allowed.includes(k));
        if (extra) return sendFail(res, { message: `Field '${extra}' is not allowed` }, 400);

        const qty = Number(req.body.quantity);
        if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) {
            return sendFail(res, { quantity: "quantity must be a positive integer" }, 400);
        }

        const inv = await SaleInvoice.findOne({ _id: invoiceId, workspaceId });
        if (!inv) return sendFail(res, { id: "Invoice not found" }, 404);

        if (inv.status !== "draft") {
            return sendFail(res, { status: "You can only edit items on draft invoices" }, 403);
        }

        const item = inv.items.id(itemId);
        if (!item) return sendFail(res, { itemId: "Item not found" }, 404);

        item.quantity = qty;

        recalcInvoiceTotals(inv);
        await inv.save();

        return sendSuccess(res, { invoice: clean(inv, { withItems: true }) });
    } catch (error) {
        if (error?.name === "ValidationError") return sendFail(res, { message: error.message }, 400);
        return sendError(res, error.message, 500);
    }
};

// DELETE /api/invoices/:id/items/:itemId
const removeInvoiceItem = async (req, res) => {
    try {
        const workspaceId = req.user.workspaceId;
        const { id: invoiceId, itemId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(invoiceId)) return sendFail(res, { id: "Invalid invoice id" }, 400);
        if (!mongoose.Types.ObjectId.isValid(itemId)) return sendFail(res, { itemId: "Invalid item id" }, 400);

        const inv = await SaleInvoice.findOne({ _id: invoiceId, workspaceId });
        if (!inv) return sendFail(res, { id: "Invoice not found" }, 404);

        if (inv.status !== "draft") {
            return sendFail(res, { status: "You can only edit items on draft invoices" }, 403);
        }

        const item = inv.items.id(itemId);
        if (!item) return sendFail(res, { itemId: "Item not found" }, 404);

        item.deleteOne();

        recalcInvoiceTotals(inv);
        await inv.save();

        return sendSuccess(res, { invoice: clean(inv, { withItems: true }) });
    } catch (error) {
        return sendError(res, error.message, 500);
    }
};

// PATCH /api/invoices/:id/discount
const applyInvoiceDiscount = async (req, res) => {
    try {
        const workspaceId = req.user.workspaceId;
        const { id: invoiceId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(invoiceId)) return sendFail(res, { id: "Invalid invoice id" }, 400);

        const allowed = ["invoiceDiscountPercent"];
        const extra = Object.keys(req.body).find((k) => !allowed.includes(k));
        if (extra) return sendFail(res, { message: `Field '${extra}' is not allowed` }, 400);

        const parsed = parsePercent(req.body.invoiceDiscountPercent, "invoiceDiscountPercent");
        if (!parsed.ok) return sendFail(res, { invoiceDiscountPercent: parsed.error }, 400);

        const inv = await SaleInvoice.findOne({ _id: invoiceId, workspaceId });
        if (!inv) return sendFail(res, { id: "Invoice not found" }, 404);

        if (inv.status !== "draft") {
            return sendFail(res, { status: "You can only edit discounts on draft invoices" }, 403);
        }

        const limits = await loadDiscountLimits(req.user.userId);
        if (!limits) return sendFail(res, { user: "User not found" }, 404);

        if (limits.role !== "admin" && parsed.value > limits.maxInvoiceDiscountPercent) {
            return sendFail(res, { invoiceDiscountPercent: `Max allowed is ${limits.maxInvoiceDiscountPercent}%` }, 403);
        }

        inv.invoiceDiscountPercent = parsed.value;

        recalcInvoiceTotals(inv);
        await inv.save();

        return sendSuccess(res, { invoice: clean(inv, { withItems: true }) });
    } catch (error) {
        if (error?.name === "ValidationError") return sendFail(res, { message: error.message }, 400);
        return sendError(res, error.message, 500);
    }
};

// PATCH /api/invoices/:id/items/:itemId/discount
const applyInvoiceItemDiscount = async (req, res) => {
    try {
        const workspaceId = req.user.workspaceId;
        const { id: invoiceId, itemId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(invoiceId)) return sendFail(res, { id: "Invalid invoice id" }, 400);
        if (!mongoose.Types.ObjectId.isValid(itemId)) return sendFail(res, { itemId: "Invalid item id" }, 400);

        const allowed = ["itemDiscountPercent"];
        const extra = Object.keys(req.body).find((k) => !allowed.includes(k));
        if (extra) return sendFail(res, { message: `Field '${extra}' is not allowed` }, 400);

        const parsed = parsePercent(req.body.itemDiscountPercent, "itemDiscountPercent");
        if (!parsed.ok) return sendFail(res, { itemDiscountPercent: parsed.error }, 400);

        const inv = await SaleInvoice.findOne({ _id: invoiceId, workspaceId });
        if (!inv) return sendFail(res, { id: "Invoice not found" }, 404);

        if (inv.status !== "draft") {
            return sendFail(res, { status: "You can only edit discounts on draft invoices" }, 403);
        }

        const item = inv.items.id(itemId);
        if (!item) return sendFail(res, { itemId: "Item not found" }, 404);

        const limits = await loadDiscountLimits(req.user.userId);
        if (!limits) return sendFail(res, { user: "User not found" }, 404);

        if (limits.role !== "admin" && parsed.value > limits.maxItemDiscountPercent) {
            return sendFail(res, { itemDiscountPercent: `Max allowed is ${limits.maxItemDiscountPercent}%` }, 403);
        }

        item.itemDiscountPercent = parsed.value;

        recalcInvoiceTotals(inv);
        await inv.save();

        return sendSuccess(res, { invoice: clean(inv, { withItems: true }) });
    } catch (error) {
        if (error?.name === "ValidationError") return sendFail(res, { message: error.message }, 400);
        return sendError(res, error.message, 500);
    }
};

// POST /api/invoices/:id/finalize
const finalizeInvoice = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { id: invoiceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) return sendFail(res, { id: "Invalid invoice id" }, 400);

    const inv = await SaleInvoice.findOne({ _id: invoiceId, workspaceId });
    if (!inv) return sendFail(res, { id: "Invoice not found" }, 404);

    if (inv.status !== "draft") return sendFail(res, { status: "Only draft invoices can be finalized" }, 403);
    if (!inv.items || inv.items.length === 0) return sendFail(res, { items: "Invoice has no items" }, 400);

    const productIds = [...new Set(inv.items.map((it) => String(it.productId)))];

    const products = await Product.find({ workspaceId, id: { $in: productIds } })
      .select("id name quantity")
      .lean();

    const map = new Map(products.map((p) => [String(p.id), p]));

    for (const it of inv.items) {
      const p = map.get(String(it.productId));
      if (!p) return sendFail(res, { productId: `Product not found: ${it.productId}` }, 404);
      if (Number(it.quantity) > Number(p.quantity)) {
        return sendFail(
          res,
          { quantity: "Insufficient quantity in inventory", productId: p.id, productName: p.name, available: p.quantity, requested: it.quantity },
          400
        );
      }
    }

    const updated = [];
    const movementIds = [];

    try {
      for (const it of inv.items) {
        const q = Number(it.quantity);

        const updatedProduct = await Product.findOneAndUpdate(
          { workspaceId, id: String(it.productId), quantity: { $gte: q } },
          { $inc: { quantity: -q } },
          { new: true }
        ).select("id name category quantity");

        if (!updatedProduct) throw new Error("STOCK_RACE");

        const afterQty = Number(updatedProduct.quantity || 0);
        const beforeQty = afterQty + q;

        const mv = await StockMovement.create({
          workspaceId,
          productId: updatedProduct.id,
          productName: updatedProduct.name,
          productCategory: updatedProduct.category || "",
          type: "sale",
          qtyDelta: -q,
          beforeQty,
          afterQty,
          refType: "SaleInvoice",
          refId: String(inv._id),
          refCode: String(inv.invoiceCode || ""),
          reason: "",
          note: "",
          performedByUserId: req.user.userId,
          performedByName: req.user.name || inv.createdByName || "",
        });

        movementIds.push(String(mv._id));
        updated.push({ id: String(it.productId), qty: q });
      }
    } catch (e) {
      for (const u of updated) {
        await Product.updateOne({ workspaceId, id: u.id }, { $inc: { quantity: u.qty } });
      }
      if (movementIds.length > 0) {
        await StockMovement.deleteMany({ _id: { $in: movementIds } }).catch(() => {});
      }

      if (String(e?.message) === "STOCK_RACE") return sendFail(res, { quantity: "Stock changed. Please retry finalize." }, 409);
      return sendError(res, e.message, 500);
    }

    setInvoiceUnitNetPrices(inv);

    inv.status = "finalized";
    inv.finalizedAt = new Date();
    inv.finalizedByUserId = req.user.userId;
    inv.finalizedByName = req.user.name || inv.createdByName || "";

    try {
      await inv.save();
    } catch (e) {
      for (const u of updated) {
        await Product.updateOne({ workspaceId, id: u.id }, { $inc: { quantity: u.qty } });
      }
      if (movementIds.length > 0) {
        await StockMovement.deleteMany({ _id: { $in: movementIds } }).catch(() => {});
      }
      return sendError(res, e.message, 500);
    }

    return sendSuccess(res, { invoice: clean(inv, { withItems: true }) });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// GET /api/invoices/:id/receipt.pdf
const printReceiptPdf = async (req, res) => {
    try {
        const workspaceId = req.user.workspaceId;
        const { id: invoiceId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
            return sendFail(res, { id: "Invalid invoice id" }, 400);
        }

        const inv = await SaleInvoice.findOne({ _id: invoiceId, workspaceId });
        if (!inv) return sendFail(res, { id: "Invoice not found" }, 404);

        if (inv.status !== "finalized") {
            return sendFail(res, { status: "Only finalized invoices can be printed" }, 403);
        }

        const workspace = await Workspace.findById(workspaceId).select("name").lean();

        const html = renderReceiptHtml(inv, {
            shopName: workspace?.name || process.env.RECEIPT_SHOP_NAME || "",
            title: "فاتورة بيع",
        });

        let puppeteer;
        try {
            const mod = await import("puppeteer");
            puppeteer = mod.default;
        } catch (e) {
            return sendError(res, "Puppeteer is not installed. Run: npm i puppeteer", 500);
        }

        const browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        });

        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 420, height: 800, deviceScaleFactor: 2 });
            await page.setContent(html, { waitUntil: "load" });

            const heightPx = await page.evaluate(() => {
                const body = document.body;
                const html = document.documentElement;
                return Math.max(
                    body.scrollHeight,
                    body.offsetHeight,
                    html.clientHeight,
                    html.scrollHeight,
                    html.offsetHeight
                );
            });

            const pdfBuffer = await page.pdf({
                printBackground: true,
                width: "80mm",
                height: `${Math.ceil(heightPx + 20)}px`,
                margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
                pageRanges: "1",
            });

            const safeName = String(inv.invoiceCode || inv._id).replace(/[^\w\-]+/g, "_");
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename="${safeName}.pdf"`);

            return res.status(200).send(pdfBuffer);
        } finally {
            await browser.close();
        }
    } catch (error) {
        return sendError(res, error.message, 500);
    }
};

export {
    createInvoiceDraft,
    listInvoices,
    getInvoiceById,
    getInvoiceReturns,
    addInvoiceItem,
    updateInvoiceItemQty,
    removeInvoiceItem,
    applyInvoiceDiscount,
    applyInvoiceItemDiscount,
    finalizeInvoice,
    printReceiptPdf,
};