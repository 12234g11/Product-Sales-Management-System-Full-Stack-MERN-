import express from "express";
import auth from "../middleware/auth.js";
import { listStockMovements } from "../controllers/stockMovementController.js";

const router = express.Router();
router.use(auth);

// GET /api/stock-movements
router.get("/", listStockMovements);

export default router;