import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import Product from "../models/Product.js";
import SaleInvoice from "../models/SaleInvoice.js";
import SaleReturn from "../models/SaleReturn.js";
import { sendSuccess, sendFail, sendError } from "../utils/jsend.js";

const norm = (s) => String(s || "").trim().replace(/\s+/g, " ");

export const deleteMyWorkspace = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    if (!workspaceId) return sendError(res, "Workspace not found for this user", 404);

    const ws = await Workspace.findById(workspaceId).select("ownerUserId");
    if (!ws) return sendError(res, "Workspace not found", 404);

    // owner 
    if (String(ws.ownerUserId) !== String(req.user.userId)) {
      return sendError(res, "Only workspace owner can delete it", 403);
    }

    // 1) Delete returns (depend on invoices)
    await SaleReturn.deleteMany({ workspaceId });

    // 2) Delete invoices
    await SaleInvoice.deleteMany({ workspaceId });

    // 3) Delete products
    await Product.deleteMany({ workspaceId });

    // 4) Delete users
    await User.deleteMany({ workspaceId });

    // 5) Delete workspace
    await Workspace.deleteOne({ _id: workspaceId });

    return sendSuccess(res, { message: "Workspace deleted permanently" });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

//  PATCH /api/workspaces/name  (admin only)
export const updateMyWorkspaceName = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    if (!workspaceId) return sendError(res, "Workspace not found for this user", 404);

    const allowed = ["name", "workspaceName"];
    const extra = Object.keys(req.body || {}).find((k) => !allowed.includes(k));
    if (extra) return sendFail(res, { message: `Field '${extra}' is not allowed` }, 400);

    const newName = norm(req.body.name || req.body.workspaceName);
    if (!newName) return sendFail(res, { name: "Workspace name is required" }, 400);
    if (newName.length < 2) return sendFail(res, { name: "Workspace name must be at least 2 characters" }, 400);
    if (newName.length > 60) return sendFail(res, { name: "Workspace name must be at most 60 characters" }, 400);

    const ws = await Workspace.findByIdAndUpdate(
      workspaceId,
      { $set: { name: newName } },
      { new: true, runValidators: true }
    ).select("name ownerUserId createdAt updatedAt");

    if (!ws) return sendError(res, "Workspace not found", 404);

    return sendSuccess(res, {
      workspace: {
        id: ws._id,
        name: ws.name,
        ownerUserId: ws.ownerUserId,
        createdAt: ws.createdAt,
        updatedAt: ws.updatedAt,
      },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
