import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import { sendSuccess, sendFail, sendError } from "../utils/jsend.js";

// POST /api/users  (Admin only)
const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return sendFail(res, { message: "name, email, password are required" }, 400);
    }
    if (password.length < 6) {
      return sendFail(res, { password: "Password must be at least 6 characters" }, 400);
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedRole = role ? String(role).toLowerCase() : "user";

    if (!["admin", "user"].includes(normalizedRole)) {
      return sendFail(res, { role: "role must be admin or user" }, 400);
    }

    const workspace = await Workspace.findById(req.user.workspaceId).select("_id");
    if (!workspace) {
      return sendFail(res, { workspace: "Workspace not found" }, 404);
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return sendFail(res, { email: "Email already exists" }, 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      role: normalizedRole,
      status: "active",
      workspaceId: workspace._id,
      // discount limits defaults are handled in the schema
    });

    return sendSuccess(
      res,
      {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          workspaceId: newUser.workspaceId,
          maxItemDiscountPercent: newUser.maxItemDiscountPercent,
          maxInvoiceDiscountPercent: newUser.maxInvoiceDiscountPercent,
          createdAt: newUser.createdAt,
        },
      },
      201
    );
  } catch (error) {
    if (error?.code === 11000) {
      return sendFail(res, { email: "Email already exists" }, 409);
    }
    if (error?.name === "ValidationError") {
      return sendFail(res, { message: error.message }, 400);
    }
    return sendError(res, error.message, 500);
  }
};

const getUsers = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.user.workspaceId).select("ownerUserId");
    if (!workspace) {
      return sendFail(res, { workspace: "Workspace not found" }, 404);
    }

    const users = await User.find({ workspaceId: req.user.workspaceId })
      .select(
        "name email role status workspaceId createdAt maxItemDiscountPercent maxInvoiceDiscountPercent"
      )
      .sort({ createdAt: -1 });

    return sendSuccess(res, {
      ownerUserId: workspace.ownerUserId,
      count: users.length,
      users,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
// PATCH /api/users/:id/status  (Admin only)
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) return sendFail(res, { id: "User id is required" }, 400);
    if (!["active", "disabled"].includes(String(status))) {
      return sendFail(res, { status: "status must be active or disabled" }, 400);
    }

    if (String(id) === String(req.user.userId)) {
      return sendFail(res, { id: "You cannot change your own status" }, 400);
    }

    const workspace = await Workspace.findById(req.user.workspaceId).select("_id ownerUserId");
    if (!workspace) {
      return sendFail(res, { workspace: "Workspace not found" }, 404);
    }

    if (String(id) === String(workspace.ownerUserId)) {
      return sendFail(res, { message: "You cannot change the workspace owner status" }, 400);
    }

    const targetUser = await User.findById(id).select("role status workspaceId tokenVersion");
    if (!targetUser) return sendFail(res, { id: "User not found" }, 404);

    if (String(targetUser.workspaceId) !== String(req.user.workspaceId)) {
      return sendFail(res, { id: "User not in your workspace" }, 403);
    }

    if (targetUser.status === status) {
      return sendSuccess(res, { message: `User already ${status}` });
    }

    if (targetUser.role === "admin" && status === "disabled") {
      const activeAdminCount = await User.countDocuments({
        workspaceId: req.user.workspaceId,
        role: "admin",
        status: "active",
      });

      if (activeAdminCount <= 1) {
        return sendFail(res, { message: "You cannot disable the last admin in this workspace" }, 400);
      }
    }

    targetUser.status = status;
    targetUser.tokenVersion += 1;

    await targetUser.save();

    return sendSuccess(res, { message: `User status updated to ${status}` });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// PATCH /api/users/:id/discount-limits  (Admin only)
const updateUserDiscountLimits = async (req, res) => {
  try {
    const { id } = req.params;
    const { maxItemDiscountPercent, maxInvoiceDiscountPercent } = req.body;

    if (!id) return sendFail(res, { id: "User id is required" }, 400);

    const hasItem = maxItemDiscountPercent !== undefined;
    const hasInvoice = maxInvoiceDiscountPercent !== undefined;

    if (!hasItem && !hasInvoice) {
      return sendFail(
        res,
        { message: "Provide maxItemDiscountPercent and/or maxInvoiceDiscountPercent" },
        400
      );
    }

    const parsePercent = (value, fieldName) => {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        return { ok: false, error: `${fieldName} must be a valid number` };
      }
      if (n < 0 || n > 100) {
        return { ok: false, error: `${fieldName} must be between 0 and 100` };
      }
      return { ok: true, value: n };
    };

    let itemParsed = null;
    let invoiceParsed = null;

    if (hasItem) {
      itemParsed = parsePercent(maxItemDiscountPercent, "maxItemDiscountPercent");
      if (!itemParsed.ok) return sendFail(res, { maxItemDiscountPercent: itemParsed.error }, 400);
    }
    if (hasInvoice) {
      invoiceParsed = parsePercent(maxInvoiceDiscountPercent, "maxInvoiceDiscountPercent");
      if (!invoiceParsed.ok)
        return sendFail(res, { maxInvoiceDiscountPercent: invoiceParsed.error }, 400);
    }

    const workspace = await Workspace.findById(req.user.workspaceId).select("_id");
    if (!workspace) {
      return sendFail(res, { workspace: "Workspace not found" }, 404);
    }

    const targetUser = await User.findById(id).select(
      "workspaceId maxItemDiscountPercent maxInvoiceDiscountPercent name email role status"
    );
    if (!targetUser) return sendFail(res, { id: "User not found" }, 404);

    if (String(targetUser.workspaceId) !== String(req.user.workspaceId)) {
      return sendFail(res, { id: "User not in your workspace" }, 403);
    }

    if (hasItem) targetUser.maxItemDiscountPercent = itemParsed.value;
    if (hasInvoice) targetUser.maxInvoiceDiscountPercent = invoiceParsed.value;

    await targetUser.save();

    return sendSuccess(res, {
      message: "Discount limits updated",
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        status: targetUser.status,
        workspaceId: targetUser.workspaceId,
        maxItemDiscountPercent: targetUser.maxItemDiscountPercent,
        maxInvoiceDiscountPercent: targetUser.maxInvoiceDiscountPercent,
      },
    });
  } catch (error) {
    if (error?.name === "ValidationError") {
      return sendFail(res, { message: error.message }, 400);
    }
    return sendError(res, error.message, 500);
  }
};

// DELETE /api/users/:id  (Admin only) => Hard Delete
const deleteUserPermanently = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return sendFail(res, { id: "User id is required" }, 400);

    if (String(id) === String(req.user.userId)) {
      return sendFail(res, { id: "You cannot delete your own account" }, 400);
    }

    const workspace = await Workspace.findById(req.user.workspaceId).select("_id ownerUserId");
    if (!workspace) {
      return sendFail(res, { workspace: "Workspace not found" }, 404);
    }

    if (String(id) === String(workspace.ownerUserId)) {
      return sendFail(res, { message: "You cannot delete the workspace owner" }, 400);
    }

    const targetUser = await User.findById(id).select("role workspaceId status");
    if (!targetUser) return sendFail(res, { id: "User not found" }, 404);

    if (String(targetUser.workspaceId) !== String(req.user.workspaceId)) {
      return sendFail(res, { id: "User not in your workspace" }, 403);
    }

    if (targetUser.role === "admin") {
      const activeAdminCount = await User.countDocuments({
        workspaceId: req.user.workspaceId,
        role: "admin",
        status: "active",
      });

      if (targetUser.status === "active" && activeAdminCount <= 1) {
        return sendFail(res, { message: "You cannot delete the last active admin in this workspace" }, 400);
      }
    }

    await User.deleteOne({ _id: id });

    return sendSuccess(res, { message: "User deleted permanently" });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export {
  createUser,
  getUsers,
  updateUserStatus,
  updateUserDiscountLimits,
  deleteUserPermanently,
};