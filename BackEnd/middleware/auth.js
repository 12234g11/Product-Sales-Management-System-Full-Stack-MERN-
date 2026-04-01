import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendError } from "../utils/jsend.js";

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return sendError(res, "Unauthorized: Missing token", 401);
    }

    if (!process.env.JWT_SECRET) {
      return sendError(res, "Server misconfigured: JWT_SECRET is missing", 500);
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return sendError(res, "Unauthorized: Invalid token", 401);
    }

    if (!payload?.userId || !payload?.workspaceId) {
      return sendError(res, "Unauthorized: Invalid token payload", 401);
    }

    const user = await User.findById(payload.userId).select("name role status workspaceId +tokenVersion");
    if (!user) {
      return sendError(res, "Unauthorized: User not found", 401);
    }

    if (user.status !== "active") {
      return sendError(res, "Forbidden: User is disabled", 403);
    }

    if (payload.workspaceId && String(payload.workspaceId) !== String(user.workspaceId)) {
      return sendError(res, "Unauthorized: Token workspace mismatch", 401);
    }

    if ((payload.tokenVersion ?? 0) !== user.tokenVersion) {
      return sendError(res, "Session expired, please login again", 401);
    }

    req.user = {
      userId: String(user._id),
      role: user.role,
      workspaceId: String(user.workspaceId),
      name: user.name,
    };

    next();
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export default auth;