import express from "express";
import auth from "../middleware/auth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import {
  getSalesTrend,
  getStockStatus,
  getDashboardOverview,
} from "../controllers/dashboardController.js";

const router = express.Router();

router.use(auth, requireAdmin);

// GET /api/dashboard/charts/sales-trend
// filter (choose ONE):
//  - preset=today
//  - preset=last&days=30
//  - preset=since_creation
//  - from=YYYY-MM-DD&to=YYYY-MM-DD
//  - date=YYYY-MM-DD
router.get("/charts/sales-trend", getSalesTrend);

// GET /api/dashboard/charts/stock-status
// uses same filter logic as sales-trend (counts as-of end of range)
router.get("/charts/stock-status", getStockStatus);

// GET /api/dashboard/overview
// uses same filter logic (activity metrics filtered, inventory/users snapshot)
router.get("/overview", getDashboardOverview);

export default router;