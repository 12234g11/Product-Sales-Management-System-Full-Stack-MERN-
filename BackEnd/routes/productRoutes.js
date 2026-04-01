import express from "express";
import auth from "../middleware/auth.js";
import {
  createProduct,
  getProducts,
  getLowStockProducts,
  updateProduct,
  deleteProduct,
  searchProducts,
  autoCompleteProducts,
  autoFillProduct,
  adjustProductStock,
} from "../controllers/productController.js";

import { listMovementsForProduct } from "../controllers/stockMovementController.js";

const router = express.Router();
router.use(auth);

// Products CRUD
router.post("/", createProduct);
router.get("/", getProducts);

router.get("/low-stock", getLowStockProducts);
router.get("/search", searchProducts);
router.get("/auto-complete", autoCompleteProducts);
router.get("/auto-fill", autoFillProduct);
router.get("/:id/movements", listMovementsForProduct);
router.patch("/:id/adjust-stock", adjustProductStock);

router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;