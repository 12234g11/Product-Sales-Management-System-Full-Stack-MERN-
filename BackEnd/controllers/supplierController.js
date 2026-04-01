import mongoose from "mongoose";
import Supplier from "../models/Supplier.js";
import User from "../models/User.js";
import { sendSuccess, sendFail, sendError } from "../utils/jsend.js";
import { handleValidationError } from "../utils/handleValidationError.js";
import { clean } from "../utils/cleanResponseForSuppliers.js";

const norm = (s) => String(s || "").trim().replace(/\s+/g, " ");
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ensureCreatorName = async (req) => {
  let createdByName = String(req.user?.name || "").trim();
  if (createdByName) return createdByName;
  const u = await User.findById(req.user.userId).select("name");
  return u?.name || "";
};

// POST /api/suppliers
const createSupplier = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;

    const allowed = ["name", "phone", "address", "notes", "isActive"];
    const extra = Object.keys(req.body || {}).find((k) => !allowed.includes(k));
    if (extra) return sendFail(res, { message: `Field '${extra}' is not allowed` }, 400);

    const name = norm(req.body.name);
    if (!name) return sendFail(res, { name: "Supplier name is required" }, 400);

    const exists = await Supplier.findOne({
      workspaceId,
      name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
    }).select("_id");
    if (exists) return sendFail(res, { name: "Supplier already exists" }, 409);

    const createdByName = await ensureCreatorName(req);
    if (!createdByName) return sendFail(res, { user: "User name not found" }, 404);

    const s = await Supplier.create({
      workspaceId,
      name,
      phone: norm(req.body.phone),
      address: norm(req.body.address),
      notes: norm(req.body.notes),
      isActive: req.body.isActive == null ? true : Boolean(req.body.isActive),
      createdByUserId: req.user.userId,
      createdByName,
    });

    return sendSuccess(res, clean(s), 201);
  } catch (error) {
    if (error?.code === 11000) return sendFail(res, { name: "Supplier already exists" }, 409);
    if (error?.name === "ValidationError") return sendFail(res, handleValidationError(error), 400);
    return sendError(res, error.message, 500);
  }
};

// GET /api/suppliers
const listSuppliers = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;

    const nameQ = norm(req.query.name);
    const phoneQ = norm(req.query.phone);
    const addressQ = norm(req.query.address);

    const search = norm(req.query.search);

    const isActiveRaw = String(req.query.isActive || "").trim().toLowerCase();

    const filters = { workspaceId };
    if (isActiveRaw === "true") filters.isActive = true;
    if (isActiveRaw === "false") filters.isActive = false;

    if (nameQ) filters.name = { $regex: new RegExp(escapeRegex(nameQ), "i") };
    if (phoneQ) filters.phone = { $regex: new RegExp(escapeRegex(phoneQ), "i") };
    if (addressQ) filters.address = { $regex: new RegExp(escapeRegex(addressQ), "i") };

    if (search && !nameQ && !phoneQ && !addressQ) {
      const r = new RegExp(escapeRegex(search), "i");
      filters.$or = [{ name: { $regex: r } }, { phone: { $regex: r } }, { address: { $regex: r } }];
    }

    const pageRaw = parseInt(req.query.page || "1", 10);
    const limitRaw = parseInt(req.query.limit || "50", 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 50;

    const total = await Supplier.countDocuments(filters);
    const rows = await Supplier.find(filters)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return sendSuccess(res, { pagination: { page, limit, total }, suppliers: clean(rows) });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// GET /api/suppliers/:id
const getSupplierById = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return sendFail(res, { id: "Invalid supplier id" }, 400);

    const s = await Supplier.findOne({ _id: id, workspaceId });
    if (!s) return sendFail(res, { id: "Supplier not found" }, 404);

    return sendSuccess(res, clean(s));
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// PUT /api/suppliers/:id
const updateSupplier = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return sendFail(res, { id: "Invalid supplier id" }, 400);

    const allowed = ["name", "phone", "address", "notes", "isActive"];
    const extra = Object.keys(req.body || {}).find((k) => !allowed.includes(k));
    if (extra) return sendFail(res, { message: `Field '${extra}' is not allowed` }, 400);

    const patch = {};

    if (req.body.name != null) {
      const name = norm(req.body.name);
      if (!name) return sendFail(res, { name: "Supplier name is required" }, 400);

      const exists = await Supplier.findOne({
        workspaceId,
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
      }).select("_id");
      if (exists) return sendFail(res, { name: "Supplier name already exists" }, 409);

      patch.name = name;
    }

    if (req.body.phone != null) patch.phone = norm(req.body.phone);
    if (req.body.address != null) patch.address = norm(req.body.address);
    if (req.body.notes != null) patch.notes = norm(req.body.notes);
    if (req.body.isActive != null) patch.isActive = Boolean(req.body.isActive);

    const s = await Supplier.findOneAndUpdate({ _id: id, workspaceId }, { $set: patch }, { new: true, runValidators: true });
    if (!s) return sendFail(res, { id: "Supplier not found" }, 404);

    return sendSuccess(res, clean(s));
  } catch (error) {
    if (error?.code === 11000) return sendFail(res, { name: "Supplier name already exists" }, 409);
    if (error?.name === "ValidationError") return sendFail(res, handleValidationError(error), 400);
    return sendError(res, error.message, 500);
  }
};

// DELETE /api/suppliers/:id (archive)
const archiveSupplier = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return sendFail(res, { id: "Invalid supplier id" }, 400);

    const s = await Supplier.findOneAndUpdate({ _id: id, workspaceId }, { $set: { isActive: false } }, { new: true });
    if (!s) return sendFail(res, { id: "Supplier not found" }, 404);

    return sendSuccess(res, clean(s));
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
// PATCH /api/suppliers/:id/restore  => unarchive
const restoreSupplier = async (req, res) => {
  const workspaceId = req.user.workspaceId;
  const { id } = req.params;

  const s = await Supplier.findOneAndUpdate(
    { _id: id, workspaceId },
    { $set: { isActive: true } },
    { new: true, runValidators: true }
  );

  if (!s) return sendFail(res, { id: "Supplier not found" }, 404);
  return sendSuccess(res, clean(s));
};
// GET /api/suppliers/auto-complete?query=...
const autoCompleteSuppliers = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const query = norm(req.query.query);
    if (!query) return sendSuccess(res, []);

    const r = new RegExp(escapeRegex(query), "i");
    const rows = await Supplier.find({ workspaceId, isActive: true, name: { $regex: r } }).sort({ name: 1 }).limit(10);

    return sendSuccess(res, clean(rows));
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export { createSupplier, listSuppliers, getSupplierById, updateSupplier, archiveSupplier, restoreSupplier,autoCompleteSuppliers };