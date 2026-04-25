import Product from "../models/Product.js";
import StockMovement from "../models/StockMovement.js";
import { handleValidationError } from "../utils/handleValidationError.js";
import { sendSuccess, sendFail, sendError } from "../utils/jsend.js";
import { clean } from "../utils/cleanResponseForProducts.js";

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const norm = (s) => String(s || "").trim().replace(/\s+/g, " ");

const cleanMovement = (m) => {
  const obj = m?.toObject ? m.toObject() : { ...m };
  if (!obj) return obj;
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

const createProduct = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;

    // ✅ allowlist to prevent external tampering
    const allowed = ["id", "name", "category", "purchasePrice", "salePrice", "quantity", "minStock", "createdAt"];
    const extra = Object.keys(req.body || {}).find((k) => !allowed.includes(k));
    if (extra) return sendFail(res, { message: `الحقل '${extra}' غير مسموح به` }, 400);

    const { id, name, category, purchasePrice, salePrice } = req.body;
    let { quantity, minStock, createdAt } = req.body;

    const pid = norm(id);
    if (!pid) return sendFail(res, { id: "كود المنتج مطلوب" }, 400);

    const existing = await Product.findOne({ workspaceId, id: pid }).select("_id");
    if (existing) return sendFail(res, { id: "كود المنتج مستخدم بالفعل" }, 409);

    // defaults
    const qty = quantity == null ? 0 : Number(quantity);
    const ms = minStock == null ? 0 : Number(minStock);

    const newProduct = new Product({
      workspaceId,
      id: pid,
      name: norm(name),
      category: norm(category),
      purchasePrice,
      salePrice,
      quantity: qty,
      minStock: ms,
    });

    // keep backward compatibility: allow setting createdAt if provided
    if (createdAt) {
      const d = new Date(createdAt);
      if (!Number.isNaN(d.getTime())) newProduct.createdAt = d;
    }

    await newProduct.save();
    return sendSuccess(res, clean(newProduct), 201);
  } catch (error) {
    if (error?.code === 11000) {
      return sendFail(res, { id: "كود المنتج مستخدم بالفعل" }, 409);
    }
    if (error.name === "ValidationError") {
      return sendFail(res, handleValidationError(error), 400);
    }
    return sendError(res, error.message);
  }
};

const getProducts = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const products = await Product.find({ workspaceId }).sort({ createdAt: -1 });
    return sendSuccess(res, clean(products));
  } catch (error) {
    return sendError(res, error.message);
  }
};

// ✅ per-product minStock (no global threshold)
const getLowStockProducts = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;

    const products = await Product.find({
      workspaceId,
      $or: [
        { quantity: 0 },
        {
          $expr: {
            $and: [
              { $gt: [{ $ifNull: ["$quantity", 0] }, 0] },
              { $gt: [{ $ifNull: ["$minStock", 0] }, 0] },
              { $lt: [{ $ifNull: ["$quantity", 0] }, { $ifNull: ["$minStock", 0] }] },
            ],
          },
        },
      ],
    }).sort({ quantity: 1, name: 1 });

    return sendSuccess(res, clean(products));
  } catch (error) {
    return sendError(res, error.message);
  }
};

const updateProduct = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { id } = req.params;

    // ✅ allowlist (important: quantity is NOT editable here)
    const allowed = ["id", "name", "category", "purchasePrice", "salePrice", "minStock"];
    const extra = Object.keys(req.body || {}).find((k) => !allowed.includes(k));
    if (extra) return sendFail(res, { message: `الحقل '${extra}' غير مسموح به` }, 400);

    const newId = req.body.id ? norm(req.body.id) : null;

    if (newId && newId !== id) {
      const exists = await Product.findOne({ workspaceId, id: newId }).select("_id");
      if (exists) return sendFail(res, { id: "كود المنتج الجديد مستخدم بالفعل" }, 409);
    }

    const patch = {};
    if (req.body.id != null) patch.id = newId;
    if (req.body.name != null) patch.name = norm(req.body.name);
    if (req.body.category != null) patch.category = norm(req.body.category);
    if (req.body.purchasePrice != null) patch.purchasePrice = req.body.purchasePrice;
    if (req.body.salePrice != null) patch.salePrice = req.body.salePrice;
    if (req.body.minStock != null) patch.minStock = req.body.minStock;

    const updatedProduct = await Product.findOneAndUpdate(
      { workspaceId, id: norm(id) },
      { $set: patch },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) return sendFail(res, { id: "المنتج غير موجود" }, 404);

    return sendSuccess(res, clean(updatedProduct));
  } catch (error) {
    if (error?.code === 11000) {
      return sendFail(res, { id: "كود المنتج الجديد مستخدم بالفعل" }, 409);
    }
    if (error.name === "ValidationError") {
      return sendFail(res, handleValidationError(error), 400);
    }
    return sendError(res, error.message);
  }
};

const deleteProduct = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { id } = req.params;

    const product = await Product.findOneAndDelete({ workspaceId, id: norm(id) });
    if (!product) return sendFail(res, { id: "المنتج غير موجود" }, 404);

    return sendSuccess(res, { message: "تم حذف المنتج بنجاح" });
  } catch (error) {
    return sendError(res, error.message);
  }
};

const searchProducts = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { id, name, category } = req.query;

    const filters = { workspaceId };
    if (id) filters.id = { $regex: id, $options: "i" };
    if (name) filters.name = { $regex: name, $options: "i" };
    if (category) filters.category = { $regex: category, $options: "i" };

    const products = await Product.find(filters).sort({ createdAt: -1 });
    return sendSuccess(res, clean(products));
  } catch (error) {
    return sendError(res, error.message);
  }
};

const autoFillProduct = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { id, name } = req.query;

    if (!id && !name) {
      return sendFail(res, { message: "الكود أو الاسم مطلوب" }, 400);
    }
    if (id) {
      const product = await Product.findOne({ workspaceId, id: norm(id) });
      if (!product) return sendFail(res, { message: "المنتج غير موجود" }, 404);
      return sendSuccess(res, clean(product));
    }

    const qName = norm(name);

    const matches = await Product.find({
      workspaceId,
      name: { $regex: `^${escapeRegex(qName)}$`, $options: "i" },
    }).limit(5);

    if (matches.length === 0) {
      return sendFail(res, { message: "المنتج غير موجود" }, 404);
    }
    if (matches.length > 1) {
      return sendFail(
        res,
        {
          message: "يوجد أكثر من منتج بنفس الاسم، برجاء اختيار المنتج الصحيح.",
          candidates: clean(matches).map((p) => ({ id: p.id, name: p.name })),
        },
        409
      );
    }

    return sendSuccess(res, clean(matches[0]));
  } catch (error) {
    return sendError(res, error.message);
  }
};

const autoCompleteProducts = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { query } = req.query;

    if (!query) return sendSuccess(res, []);

    const regex = new RegExp(query, "i");

    const results = await Product.find({
      workspaceId,
      $or: [{ name: { $regex: regex } }, { id: { $regex: regex } }],
    })
      .limit(10)
      .sort({ name: 1 });

    return sendSuccess(res, clean(results));
  } catch (error) {
    return sendError(res, error.message);
  }
};

/**
 * PATCH /api/products/:id/adjust-stock
 * body:
 * - mode: "set" | "delta" (optional)
 * - newQuantity (required if mode=set)
 * - delta (required if mode=delta)
 * - reason (required)
 * - note (optional; required for correction/other)
 */
const adjustProductStock = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const productId = norm(req.params.id);

    const allowed = ["mode", "newQuantity", "delta", "reason", "note"];
    const extra = Object.keys(req.body || {}).find((k) => !allowed.includes(k));
    if (extra) return sendFail(res, { message: `الحقل '${extra}' غير مسموح به` }, 400);

    const reason = String(req.body.reason || "").trim();
    const note = String(req.body.note || "").trim();

    const allowedReasons = ["inventory_count", "opening_balance", "damaged", "correction", "other"];
    if (!reason || !allowedReasons.includes(reason)) {
      return sendFail(res, { reason: `سبب التسوية يجب أن يكون واحدًا من: ${allowedReasons.join(", ")}` }, 400);
    }

    if ((reason === "correction" || reason === "other") && !note) {
      return sendFail(res, { note: "الملاحظة مطلوبة عند اختيار سبب تصحيح أو أخرى" }, 400);
    }

    const product = await Product.findOne({ workspaceId, id: productId }).select("id name category quantity");
    if (!product) return sendFail(res, { id: "المنتج غير موجود" }, 404);

    const beforeQty = Number(product.quantity || 0);

    const mode = String(req.body.mode || "").trim().toLowerCase();

    let afterQty;
    let qtyDelta;

    if (mode === "delta" || (mode !== "set" && req.body.delta != null)) {
      const d = Number(req.body.delta);
      if (!Number.isFinite(d) || !Number.isInteger(d) || d === 0) {
        return sendFail(res, { delta: "مقدار الزيادة أو النقص يجب أن يكون رقمًا صحيحًا لا يساوي صفر" }, 400);
      }
      qtyDelta = d;
      afterQty = beforeQty + d;
    } else {
      const nq = Number(req.body.newQuantity);
      if (!Number.isFinite(nq) || !Number.isInteger(nq) || nq < 0) {
        return sendFail(res, { newQuantity: "الكمية الجديدة يجب أن تكون رقمًا صحيحًا أكبر من أو يساوي صفر" }, 400);
      }
      afterQty = nq;
      qtyDelta = afterQty - beforeQty;
      if (qtyDelta === 0) {
        return sendFail(res, { newQuantity: "الكمية الجديدة تساوي الكمية الحالية، أدخل كمية مختلفة للحفظ" }, 400);
      }
    }

    if (afterQty < 0) {
      return sendFail(res, { quantity: "الكمية الناتجة لا يمكن أن تكون أقل من صفر" }, 400);
    }

    // ✅ race-safe update (if quantity changed in between, return 409)
    const updated = await Product.findOneAndUpdate(
      { workspaceId, id: productId, quantity: beforeQty },
      { $set: { quantity: afterQty } },
      { new: true }
    );

    if (!updated) {
      return sendFail(res, { quantity: "تم تغيير المخزون، برجاء المحاولة مرة أخرى." }, 409);
    }

    const movement = await StockMovement.create({
      workspaceId,
      productId: product.id,
      productName: product.name,
      productCategory: product.category || "",
      type: "adjustment",
      qtyDelta,
      beforeQty,
      afterQty,
      refType: "manual_adjustment",
      refId: "",
      refCode: "",
      reason,
      note,
      performedByUserId: req.user.userId,
      performedByName: req.user.name || "",
    });

    return sendSuccess(res, {
      product: clean(updated),
      movement: cleanMovement(movement),
    });
  } catch (error) {
    return sendError(res, error.message);
  }
};


export {
  createProduct,
  getProducts,
  getLowStockProducts,
  updateProduct,
  deleteProduct,
  searchProducts,
  autoFillProduct,
  autoCompleteProducts,
  adjustProductStock,
};