import mongoose from "mongoose";
import PurchaseInvoice from "../models/PurchaseInvoice.js";
import Supplier from "../models/Supplier.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import StockMovement from "../models/StockMovement.js";
import { sendSuccess, sendFail, sendError } from "../utils/jsend.js";
import { clean } from "../utils/cleanResponseForPurchases.js";
import { recalcPurchaseTotals, round2 } from "../utils/purchaseTotals.js";
import { handleValidationError } from "../utils/handleValidationError.js";

const norm = (s) => String(s || "").trim().replace(/\s+/g, " ");
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ensureUserName = async (req) => {
  let n = String(req.user?.name || "").trim();
  if (n) return n;
  const u = await User.findById(req.user.userId).select("name");
  return u?.name || "";
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

const getNextNumericInvoiceCode = async ({ Model, workspaceId }) => {
  const last = await Model.findOne({
    workspaceId,
    invoiceCode: { $regex: /^\d+$/ },
  })
    .select("invoiceCode")
    .sort({ invoiceCode: -1 })
    .collation({ locale: "en", numericOrdering: true })
    .lean();

  const current = Number(last?.invoiceCode || 0);
  return String(Number.isFinite(current) && current >= 0 ? current + 1 : 1);
};

const resolveSupplier = async ({ workspaceId, supplierId, supplierName, reqUser }) => {
  const sid = supplierId ? String(supplierId).trim() : "";
  const sname = norm(supplierName);

  if (!sid && !sname) return { ok: false, error: { supplier: "supplierId or supplierName is required" } };

  if (sid) {
    if (!mongoose.Types.ObjectId.isValid(sid)) return { ok: false, error: { supplierId: "Invalid supplierId" } };
    const s = await Supplier.findOne({ _id: sid, workspaceId });
    if (!s) return { ok: false, error: { supplierId: "Supplier not found" } };
    if (!s.isActive) return { ok: false, error: { supplierId: "Supplier is archived" } };
    return { ok: true, supplierId: s._id, supplierName: s.name };
  }

  // supplierName only: find existing (case-insensitive), otherwise create
  const existing = await Supplier.findOne({
    workspaceId,
    name: { $regex: new RegExp(`^${escapeRegex(sname)}$`, "i") },
  });

  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      await existing.save();
    }
    return { ok: true, supplierId: existing._id, supplierName: existing.name };
  }

  const s = await Supplier.create({
    workspaceId,
    name: sname,
    phone: "",
    address: "",
    notes: "",
    isActive: true,
    createdByUserId: reqUser.userId,
    createdByName: reqUser.name,
  });

  return { ok: true, supplierId: s._id, supplierName: s.name };
};

// POST /api/purchases
const createPurchaseDraft = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;

    const allowed = ["invoiceCode", "supplierId", "supplierName", "notes"];
    const extra = Object.keys(req.body || {}).find((k) => !allowed.includes(k));
    if (extra) return sendFail(res, { message: `Field '${extra}' is not allowed` }, 400);

    const creatorName = await ensureUserName(req);
    if (!creatorName) return sendFail(res, { user: "User not found" }, 404);

    const sup = await resolveSupplier({
      workspaceId,
      supplierId: req.body.supplierId,
      supplierName: req.body.supplierName,
      reqUser: { userId: req.user.userId, name: creatorName },
    });
    if (!sup.ok) return sendFail(res, sup.error, 400);

    let lastDuplicateError = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const invoiceCode = await getNextNumericInvoiceCode({ Model: PurchaseInvoice, workspaceId });

      try {
        const inv = await PurchaseInvoice.create({
          workspaceId,
          invoiceCode,
          supplierId: sup.supplierId,
          supplierName: sup.supplierName,
          notes: norm(req.body.notes),
          status: "draft",
          createdByUserId: req.user.userId,
          createdByName: creatorName,
          items: [],
          subtotal: 0,
          totalAmount: 0,
          totalItemsQty: 0,
        });

        return sendSuccess(res, { invoice: clean(inv, { withItems: true }) }, 201);
      } catch (e) {
        if (e?.code === 11000) {
          lastDuplicateError = e;
          continue;
        }
        throw e;
      }
    }

    if (lastDuplicateError) {
      return sendFail(
        res,
        { invoiceCode: "تعذر توليد كود فاتورة غير مكرر، حاول مرة أخرى" },
        409
      );
    }

    return sendError(res, "تعذر إنشاء فاتورة الشراء", 500);
  } catch (error) {
    if (error?.code === 11000) return sendFail(res, { invoiceCode: "Invoice code already exists" }, 409);
    if (error?.name === "ValidationError") return sendFail(res, handleValidationError(error), 400);
    return sendError(res, error.message, 500);
  }
};

const buildPurchaseFilters = (req) => {
  const workspaceId = req.user.workspaceId;

  const status = req.query.status ? String(req.query.status).trim() : "";
  const search = req.query.search ? String(req.query.search).trim() : "";
  const invoiceCode = req.query.invoiceCode ? String(req.query.invoiceCode).trim() : "";
  const supplierName = req.query.supplierName ? String(req.query.supplierName).trim() : "";
  const supplierId = req.query.supplierId ? String(req.query.supplierId).trim() : "";
  const createdByName = req.query.createdByName ? String(req.query.createdByName).trim() : "";
  const createdByUserId = req.query.createdByUserId ? String(req.query.createdByUserId).trim() : "";

  const minTotalAmount = req.query.minTotalAmount != null ? Number(req.query.minTotalAmount) : null;
  const maxTotalAmount = req.query.maxTotalAmount != null ? Number(req.query.maxTotalAmount) : null;

  const fromRaw = req.query.from ? String(req.query.from).trim() : "";
  const toRaw = req.query.to ? String(req.query.to).trim() : "";
  const daysRaw = req.query.days ? parseInt(String(req.query.days), 10) : null;

  const filters = { workspaceId };
  const andParts = [];

  if (status) {
    if (!["draft", "finalized", "cancelled"].includes(status)) {
      return { ok: false, error: { status: "status must be draft, finalized, or cancelled" } };
    }
    filters.status = status;
  }

  // ✅ invoiceCode filter = contains (AND with others)
  if (invoiceCode) {
    filters.invoiceCode = { $regex: new RegExp(escapeRegex(invoiceCode), "i") };
  }

  if (supplierId) {
    if (!mongoose.Types.ObjectId.isValid(supplierId)) return { ok: false, error: { supplierId: "Invalid supplierId" } };
    filters.supplierId = new mongoose.Types.ObjectId(supplierId);
  }

  if (supplierName) filters.supplierName = { $regex: new RegExp(escapeRegex(supplierName), "i") };
  if (createdByName) filters.createdByName = { $regex: new RegExp(escapeRegex(createdByName), "i") };

  if (createdByUserId) {
    if (!mongoose.Types.ObjectId.isValid(createdByUserId)) return { ok: false, error: { createdByUserId: "Invalid createdByUserId" } };
    filters.createdByUserId = new mongoose.Types.ObjectId(createdByUserId);
  }

  // ✅ search becomes AND across words
  if (search) {
    const terms = norm(search)
      .split(" ")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 6); // limit to avoid huge queries

    for (const term of terms) {
      const r = new RegExp(escapeRegex(term), "i");
      andParts.push({
        $or: [{ invoiceCode: { $regex: r } }, { supplierName: { $regex: r } }, { notes: { $regex: r } }],
      });
    }
  }

  if (minTotalAmount != null) {
    if (!Number.isFinite(minTotalAmount) || minTotalAmount < 0) return { ok: false, error: { minTotalAmount: "minTotalAmount must be a non-negative number" } };
    filters.totalAmount = { ...(filters.totalAmount || {}), $gte: minTotalAmount };
  }

  if (maxTotalAmount != null) {
    if (!Number.isFinite(maxTotalAmount) || maxTotalAmount < 0) return { ok: false, error: { maxTotalAmount: "maxTotalAmount must be a non-negative number" } };
    filters.totalAmount = { ...(filters.totalAmount || {}), $lte: maxTotalAmount };
  }

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

  if (andParts.length) {
    // ✅ AND the search terms with any existing conditions
    filters.$and = [...(filters.$and || []), ...andParts];
  }

  return { ok: true, filters };
};

// GET /api/purchases
const listPurchaseInvoices = async (req, res) => {
  try {
    const built = buildPurchaseFilters(req);
    if (!built.ok) return sendFail(res, built.error, 400);

    const pageRaw = parseInt(req.query.page || "1", 10);
    const limitRaw = parseInt(req.query.limit || "50", 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50;

    const total = await PurchaseInvoice.countDocuments(built.filters);

    const invoices = await PurchaseInvoice.find(built.filters)
      .select("workspaceId invoiceCode supplierId supplierName status createdByUserId createdByName createdAt updatedAt finalizedAt finalizedByUserId finalizedByName notes subtotal totalAmount totalItemsQty")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return sendSuccess(res, { pagination: { page, limit, total }, invoices: clean(invoices, { withItems: false }) });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// GET /api/purchases/:id
const getPurchaseInvoiceById = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) return sendFail(res, { id: "Invalid invoice id" }, 400);

    const inv = await PurchaseInvoice.findOne({ _id: id, workspaceId });
    if (!inv) return sendFail(res, { id: "Invoice not found" }, 404);

    await hydrateMissingItemSalePrices(inv, workspaceId);

    return sendSuccess(res, { invoice: clean(inv, { withItems: true }) });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const createProductFromNewProduct = async ({
  workspaceId,
  newProduct,
  purchasePriceFallback,
  salePriceFallback,
  baseProduct,
}) => {
  const allowed = ["id", "name", "category", "purchasePrice", "salePrice", "minStock"];
  const extra = Object.keys(newProduct || {}).find((k) => !allowed.includes(k));
  if (extra) return { ok: false, error: { message: `newProduct field '${extra}' is not allowed` } };

  const id = norm(newProduct.id);
  const name = norm(newProduct.name) || norm(baseProduct?.name);
  const category = norm(newProduct.category) || norm(baseProduct?.category);
  const salePriceRaw = newProduct.salePrice ?? salePriceFallback;
  const purchasePriceRaw = newProduct.purchasePrice ?? purchasePriceFallback;
  const salePrice = Number(salePriceRaw);
  const minStock = newProduct.minStock == null ? Number(baseProduct?.minStock || 0) : Number(newProduct.minStock);
  const pp = Number(purchasePriceRaw);

  if (!id) return { ok: false, error: { id: "newProduct.id is required" } };
  if (!name) return { ok: false, error: { name: "newProduct.name is required" } };
  if (!category) return { ok: false, error: { category: "newProduct.category is required" } };
  if (!Number.isFinite(pp) || pp < 0) return { ok: false, error: { purchasePrice: "purchasePrice must be >= 0 to create new product" } };
  if (!Number.isFinite(salePrice) || salePrice < 0) return { ok: false, error: { salePrice: "newProduct.salePrice must be >= 0" } };
  if (!Number.isFinite(minStock) || !Number.isInteger(minStock) || minStock < 0) return { ok: false, error: { minStock: "newProduct.minStock must be an integer >= 0" } };

  const exists = await Product.findOne({ workspaceId, id }).select("_id");
  if (exists) return { ok: false, error: { id: "Product ID already exists" } };

  const created = await Product.create({
    workspaceId,
    id,
    name,
    category,
    purchasePrice: round2(pp),
    salePrice: round2(salePrice),
    minStock,
    quantity: 0,
  });

  return { ok: true, product: created };
};

const readNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : Number.NaN;
};

const hydrateMissingItemSalePrices = async (inv, workspaceId) => {
  if (!inv?.items?.length) return inv;

  const missingIds = [
    ...new Set(
      inv.items
        .filter((it) => it.salePriceAtPurchase === null || it.salePriceAtPurchase === undefined)
        .map((it) => String(it.productId || ""))
        .filter(Boolean)
    ),
  ];

  if (missingIds.length === 0) return inv;

  const products = await Product.find({ workspaceId, id: { $in: missingIds } })
    .select("id salePrice")
    .lean();
  const salePriceMap = new Map(products.map((p) => [String(p.id), Number(p.salePrice || 0)]));

  let changed = false;
  for (const it of inv.items) {
    if (it.salePriceAtPurchase !== null && it.salePriceAtPurchase !== undefined) continue;

    const fallbackSalePrice =
      it.newSalePrice !== null && it.newSalePrice !== undefined
        ? Number(it.newSalePrice)
        : salePriceMap.get(String(it.productId));

    if (Number.isFinite(fallbackSalePrice) && fallbackSalePrice >= 0) {
      it.salePriceAtPurchase = round2(fallbackSalePrice);
      changed = true;
    }
  }

  if (changed && inv.status === "draft") {
    await inv.save().catch(() => {});
  }

  return inv;
};

// POST /api/purchases/:id/items
const addPurchaseItem = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { id: invoiceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) return sendFail(res, { id: "Invalid invoice id" }, 400);

    const allowed = [
      "productId",
      "id",
      "name",
      "quantity",
      "purchasePrice",
      "newSalePrice",
      "priceMode",
      "newProduct",
    ];
    const extra = Object.keys(req.body || {}).find((k) => !allowed.includes(k));
    if (extra) return sendFail(res, { message: `Field '${extra}' is not allowed` }, 400);

    const qty = Number(req.body.quantity);
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) return sendFail(res, { quantity: "quantity must be a positive integer" }, 400);

    const requestedPriceMode = norm(req.body.priceMode || "same");
    if (!["same", "new_product", "merge_update"].includes(requestedPriceMode)) {
      return sendFail(res, { priceMode: "priceMode must be same, new_product, or merge_update" }, 400);
    }

    const pid = norm(req.body.productId || req.body.id);
    const pname = req.body.name ? norm(req.body.name) : "";
    if (!pid && !pname && !req.body.newProduct) return sendFail(res, { message: "productId/id or name is required" }, 400);

    const inv = await PurchaseInvoice.findOne({ _id: invoiceId, workspaceId });
    if (!inv) return sendFail(res, { id: "Invoice not found" }, 404);
    if (inv.status !== "draft") return sendFail(res, { status: "You can only edit items on draft invoices" }, 403);

    let product = null;
    let baseProduct = null;

    if (pid) {
      product = await Product.findOne({ workspaceId, id: pid });
      baseProduct = product;
    } else if (pname) {
      const matches = await Product.find({ workspaceId, name: { $regex: `^${escapeRegex(pname)}$`, $options: "i" } }).limit(5);

      if (matches.length === 1) {
        product = matches[0];
        baseProduct = product;
      } else if (matches.length > 1) {
        return sendFail(
          res,
          { message: "Multiple products have the same name. Please choose one by productId.", candidates: matches.map((p) => ({ id: p.id, name: p.name })) },
          409
        );
      }
    }

    if (!product && req.body.newProduct) {
      const created = await createProductFromNewProduct({
        workspaceId,
        newProduct: req.body.newProduct,
        purchasePriceFallback: req.body.purchasePrice,
        salePriceFallback: req.body.newSalePrice,
      });
      if (!created.ok) return sendFail(res, created.error, 400);
      product = created.product;
      baseProduct = null;
    }

    if (!product) return sendFail(res, { product: "Product not found" }, 404);

    const purchasePriceInput = readNumberOrNull(req.body.purchasePrice);
    if (Number.isNaN(purchasePriceInput)) return sendFail(res, { purchasePrice: "purchasePrice must be a non-negative number" }, 400);

    const newSalePriceInput = readNumberOrNull(req.body.newSalePrice);
    if (Number.isNaN(newSalePriceInput)) return sendFail(res, { newSalePrice: "newSalePrice must be a non-negative number" }, 400);

    const pp = purchasePriceInput == null ? Number(product.purchasePrice) : Number(purchasePriceInput);
    if (!Number.isFinite(pp) || pp < 0) return sendFail(res, { purchasePrice: "purchasePrice must be a non-negative number" }, 400);

    const oldPurchasePrice = baseProduct ? Number(baseProduct.purchasePrice || 0) : null;
    const oldSalePrice = baseProduct ? Number(baseProduct.salePrice || 0) : null;
    const salePriceForComparison = newSalePriceInput == null ? Number(product.salePrice || 0) : Number(newSalePriceInput);
    if (!Number.isFinite(salePriceForComparison) || salePriceForComparison < 0) {
      return sendFail(res, { newSalePrice: "newSalePrice must be a non-negative number" }, 400);
    }

    const hasExistingProductPriceChange =
      Boolean(baseProduct) &&
      (round2(pp) !== round2(oldPurchasePrice) || round2(salePriceForComparison) !== round2(oldSalePrice));

    if (hasExistingProductPriceChange && requestedPriceMode === "same") {
      return sendFail(
        res,
        { priceMode: "يجب اختيار طريقة التعامل مع السعر الجديد قبل إضافة الصنف" },
        400
      );
    }

    let priceModeToStore = requestedPriceMode;

    if (!baseProduct && req.body.newProduct) {
      priceModeToStore = "new_product";
    }

    if (requestedPriceMode === "merge_update" && !baseProduct) {
      return sendFail(res, { priceMode: "merge_update is allowed only for existing products" }, 400);
    }

    if (requestedPriceMode === "merge_update") {
      if (newSalePriceInput == null) {
        return sendFail(res, { newSalePrice: "newSalePrice is required when priceMode=merge_update" }, 400);
      }
    }

    if (requestedPriceMode === "new_product" && baseProduct) {
      const created = await createProductFromNewProduct({
        workspaceId,
        newProduct: req.body.newProduct || {},
        purchasePriceFallback: pp,
        salePriceFallback: salePriceForComparison,
        baseProduct,
      });
      if (!created.ok) return sendFail(res, created.error, 400);
      product = created.product;
      priceModeToStore = "new_product";
    }

    const itemSalePrice = priceModeToStore === "merge_update" ? round2(salePriceForComparison) : null;
    const salePriceAtPurchase = round2(
      priceModeToStore === "merge_update"
        ? salePriceForComparison
        : Number(product.salePrice || 0)
    );

    const sameLine = inv.items.find(
      (it) =>
        String(it.productId) === String(product.id) &&
        Number(it.purchasePrice) === round2(pp) &&
        Number(it.salePriceAtPurchase || 0) === Number(salePriceAtPurchase || 0) &&
        String(it.priceMode || "same") === String(priceModeToStore) &&
        Number(it.newSalePrice || 0) === Number(itemSalePrice || 0)
    );

    if (sameLine) {
      sameLine.quantity = Number(sameLine.quantity) + qty;
    } else {
      inv.items.push({
        productId: product.id,
        productName: product.name,
        productCategory: product.category || "",
        purchasePrice: round2(pp),
        salePriceAtPurchase,
        quantity: qty,
        priceMode: priceModeToStore,
        newSalePrice: itemSalePrice,
        oldPurchasePriceSnapshot: oldPurchasePrice == null ? null : round2(oldPurchasePrice),
        oldSalePriceSnapshot: oldSalePrice == null ? null : round2(oldSalePrice),
      });
    }

    recalcPurchaseTotals(inv);
    await inv.save();

    return sendSuccess(res, { invoice: clean(inv, { withItems: true }) });
  } catch (error) {
    if (error?.code === 11000) return sendFail(res, { id: "Product ID already exists" }, 409);
    if (error?.name === "ValidationError") return sendFail(res, handleValidationError(error), 400);
    return sendError(res, error.message, 500);
  }
};

// PATCH /api/purchases/:id/items/:itemId
const updatePurchaseItem = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { id: invoiceId, itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) return sendFail(res, { id: "Invalid invoice id" }, 400);
    if (!mongoose.Types.ObjectId.isValid(itemId)) return sendFail(res, { itemId: "Invalid item id" }, 400);

    const allowed = ["quantity", "purchasePrice"];
    const extra = Object.keys(req.body || {}).find((k) => !allowed.includes(k));
    if (extra) return sendFail(res, { message: `Field '${extra}' is not allowed` }, 400);

    if (req.body.quantity == null && req.body.purchasePrice == null) return sendFail(res, { message: "quantity or purchasePrice is required" }, 400);

    const inv = await PurchaseInvoice.findOne({ _id: invoiceId, workspaceId });
    if (!inv) return sendFail(res, { id: "Invoice not found" }, 404);
    if (inv.status !== "draft") return sendFail(res, { status: "You can only edit items on draft invoices" }, 403);

    const it = inv.items.id(itemId);
    if (!it) return sendFail(res, { itemId: "Item not found" }, 404);

    if (req.body.quantity != null) {
      const qty = Number(req.body.quantity);
      if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty <= 0) return sendFail(res, { quantity: "quantity must be a positive integer" }, 400);
      it.quantity = qty;
    }

    if (req.body.purchasePrice != null) {
      const pp = Number(req.body.purchasePrice);
      if (!Number.isFinite(pp) || pp < 0) return sendFail(res, { purchasePrice: "purchasePrice must be a non-negative number" }, 400);
      it.purchasePrice = round2(pp);
    }

    recalcPurchaseTotals(inv);
    await inv.save();

    return sendSuccess(res, { invoice: clean(inv, { withItems: true }) });
  } catch (error) {
    if (error?.name === "ValidationError") return sendFail(res, handleValidationError(error), 400);
    return sendError(res, error.message, 500);
  }
};

// DELETE /api/purchases/:id/items/:itemId
const removePurchaseItem = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { id: invoiceId, itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) return sendFail(res, { id: "Invalid invoice id" }, 400);
    if (!mongoose.Types.ObjectId.isValid(itemId)) return sendFail(res, { itemId: "Invalid item id" }, 400);

    const inv = await PurchaseInvoice.findOne({ _id: invoiceId, workspaceId });
    if (!inv) return sendFail(res, { id: "Invoice not found" }, 404);
    if (inv.status !== "draft") return sendFail(res, { status: "You can only edit items on draft invoices" }, 403);

    const it = inv.items.id(itemId);
    if (!it) return sendFail(res, { itemId: "Item not found" }, 404);

    it.deleteOne();
    recalcPurchaseTotals(inv);
    await inv.save();

    return sendSuccess(res, { invoice: clean(inv, { withItems: true }) });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// POST /api/purchases/:id/finalize
const finalizePurchaseInvoice = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { id: invoiceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) return sendFail(res, { id: "Invalid invoice id" }, 400);

    const inv = await PurchaseInvoice.findOne({ _id: invoiceId, workspaceId });
    if (!inv) return sendFail(res, { id: "Invoice not found" }, 404);
    if (inv.status !== "draft") return sendFail(res, { status: "Only draft invoices can be finalized" }, 403);
    if (!inv.items || inv.items.length === 0) return sendFail(res, { items: "Invoice has no items" }, 400);

    recalcPurchaseTotals(inv);

    const performerName = await ensureUserName(req);
    if (!performerName) return sendFail(res, { user: "User not found" }, 404);

    const applied = [];
    const movementIds = [];

    try {
      for (const it of inv.items) {
        const q = Number(it.quantity);
        const isMergeUpdate = String(it.priceMode || "same") === "merge_update";

        const before = await Product.findOne({ workspaceId, id: String(it.productId) }).select(
          "id name category quantity purchasePrice salePrice"
        );

        if (!before) throw new Error(`PRODUCT_NOT_FOUND:${it.productId}`);

        const update = isMergeUpdate
          ? {
              $inc: { quantity: q },
              $set: {
                purchasePrice: round2(it.purchasePrice),
                salePrice: round2(it.newSalePrice),
              },
            }
          : { $inc: { quantity: q } };

        const p = await Product.findOneAndUpdate(
          { workspaceId, id: String(it.productId) },
          update,
          { new: true, runValidators: true }
        ).select("id name category quantity");

        if (!p) throw new Error(`PRODUCT_NOT_FOUND:${it.productId}`);

        const afterQty = Number(p.quantity || 0);
        const beforeQty = afterQty - q;

        const mv = await StockMovement.create({
          workspaceId,
          productId: p.id,
          productName: p.name,
          productCategory: p.category || "",
          type: "purchase",
          qtyDelta: q,
          beforeQty,
          afterQty,
          refType: "PurchaseInvoice",
          refId: String(inv._id),
          refCode: String(inv.invoiceCode || ""),
          reason: "",
          note: "",
          performedByUserId: req.user.userId,
          performedByName: performerName,
        });

        movementIds.push(String(mv._id));
        applied.push({
          productId: String(it.productId),
          qty: q,
          priceMode: isMergeUpdate ? "merge_update" : "same",
          oldPurchasePrice: Number(before.purchasePrice || 0),
          oldSalePrice: Number(before.salePrice || 0),
        });
      }
    } catch (e) {
      if (movementIds.length > 0) await StockMovement.deleteMany({ _id: { $in: movementIds } }).catch(() => {});
      for (const a of applied) {
        const rollbackUpdate = a.priceMode === "merge_update"
          ? {
              $inc: { quantity: -a.qty },
              $set: { purchasePrice: a.oldPurchasePrice, salePrice: a.oldSalePrice },
            }
          : { $inc: { quantity: -a.qty } };
        await Product.updateOne({ workspaceId, id: a.productId }, rollbackUpdate).catch(() => {});
      }

      const msg = String(e?.message || "");
      if (msg.startsWith("PRODUCT_NOT_FOUND:")) return sendFail(res, { productId: `Product not found: ${msg.split(":")[1]}` }, 404);
      return sendError(res, e.message, 500);
    }

    inv.status = "finalized";
    inv.finalizedAt = new Date();
    inv.finalizedByUserId = req.user.userId;
    inv.finalizedByName = performerName;

    try {
      await inv.save();
    } catch (e) {
      if (movementIds.length > 0) await StockMovement.deleteMany({ _id: { $in: movementIds } }).catch(() => {});
      for (const a of applied) {
        const rollbackUpdate = a.priceMode === "merge_update"
          ? {
              $inc: { quantity: -a.qty },
              $set: { purchasePrice: a.oldPurchasePrice, salePrice: a.oldSalePrice },
            }
          : { $inc: { quantity: -a.qty } };
        await Product.updateOne({ workspaceId, id: a.productId }, rollbackUpdate).catch(() => {});
      }
      return sendError(res, e.message, 500);
    }

    return sendSuccess(res, { invoice: clean(inv, { withItems: true }) });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export {
  createPurchaseDraft,
  listPurchaseInvoices,
  getPurchaseInvoiceById,
  addPurchaseItem,
  updatePurchaseItem,
  removePurchaseItem,
  finalizePurchaseInvoice,
};
