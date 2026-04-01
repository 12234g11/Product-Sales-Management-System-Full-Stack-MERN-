import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import { sendSuccess, sendError } from "../utils/jsend.js";

const signToken = ({ userId, role, workspaceId, tokenVersion }) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing in .env");
  }

  return jwt.sign(
    { userId, role, workspaceId, tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

const register = async (req, res) => {
  let workspace = null;
  let adminUser = null;

  try {
    const { workspaceName, name, email, password } = req.body;

    if (!workspaceName || !name || !email || !password) {
      return sendError(res, "workspaceName, name, email, password are required", 400);
    }
    if (password.length < 6) {
      return sendError(res, "Password must be at least 6 characters", 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return sendError(res, "Email already exists", 409);

    // 1) create workspace
    workspace = await Workspace.create({ name: workspaceName.trim() });

    // 2) create admin user
    const passwordHash = await bcrypt.hash(password, 10);

    adminUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "admin",
      status: "active",
      workspaceId: workspace._id,
      tokenVersion: 0,
    });

    // 3) set owner
    workspace.ownerUserId = adminUser._id;
    await workspace.save();

    // 4) token
    const token = signToken({
      userId: adminUser._id,
      role: adminUser.role,
      workspaceId: adminUser.workspaceId,
      tokenVersion: adminUser.tokenVersion ?? 0,
    });


    return sendSuccess(
      res,
      {
        token,
        user: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          workspaceId: adminUser.workspaceId,
          workspaceName: workspace.name,
        },


      },
      201
    );
  } catch (error) {
    try {
      if (adminUser?._id) await User.deleteOne({ _id: adminUser._id });
      if (workspace?._id) await Workspace.deleteOne({ _id: workspace._id });
    } catch (_) { }

    if (error?.code === 11000) return sendError(res, "Email already exists", 409);

    if (error?.name === "ValidationError") {
      const msg = Object.values(error.errors)?.[0]?.message || "Validation error";
      return sendError(res, msg, 400);
    }

    return sendError(res, error.message, 500);
  }
};


const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, "email and password are required", 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+passwordHash +tokenVersion"
    );
    if (!user) return sendError(res, "Invalid credentials", 401);
    if (user.status !== "active") return sendError(res, "User is disabled", 403);

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return sendError(res, "Invalid credentials", 401);

    const ws = user.workspaceId
      ? await Workspace.findById(user.workspaceId).select("name")
      : null;

    const token = signToken({
      userId: user._id,
      role: user.role,
      workspaceId: user.workspaceId,
      tokenVersion: user.tokenVersion ?? 0,
    });

    return sendSuccess(res, {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspaceId: user.workspaceId,
        workspaceName: ws?.name || null,
      },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const logout = async (req, res) => {
  try {
    await User.updateOne({ _id: req.user.userId }, { $inc: { tokenVersion: 1 } });
    return sendSuccess(res, { message: "Logged out successfully" });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
export { login, register, logout };
