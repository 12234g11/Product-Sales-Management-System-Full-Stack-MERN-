import { sendError } from "../utils/jsend.js";

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return sendError(res, "Unauthorized", 401);
  }

  if (req.user.role !== "admin") {
    return sendError(res, "Forbidden: Admins only", 403);
  }

  next();
};

export default requireAdmin;
