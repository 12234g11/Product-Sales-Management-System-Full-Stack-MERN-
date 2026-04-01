import express from "express";
import auth from "../middleware/auth.js";
import {
  createPurchaseDraft,
  listPurchaseInvoices,
  getPurchaseInvoiceById,
  addPurchaseItem,
  updatePurchaseItem,
  removePurchaseItem,
  finalizePurchaseInvoice,
} from "../controllers/purchaseController.js";

const router = express.Router();
router.use(auth);

router.post("/", createPurchaseDraft);
router.get("/", listPurchaseInvoices);

router.get("/:id", getPurchaseInvoiceById);

router.post("/:id/items", addPurchaseItem);
router.patch("/:id/items/:itemId", updatePurchaseItem);
router.delete("/:id/items/:itemId", removePurchaseItem);

router.post("/:id/finalize", finalizePurchaseInvoice);

export default router;