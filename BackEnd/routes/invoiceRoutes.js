import express from "express";
import auth from "../middleware/auth.js";
import {
  createInvoiceDraft,
  listInvoices,
  getInvoiceById,
  getInvoiceReturns,
  addInvoiceItem,
  updateInvoiceItemQty,
  removeInvoiceItem,
  applyInvoiceDiscount,
  applyInvoiceItemDiscount,
  finalizeInvoice,
  printReceiptPdf,
} from "../controllers/invoiceController.js";

const router = express.Router();

router.use(auth);

router.post("/", createInvoiceDraft);
router.get("/", listInvoices);

router.get("/:id", getInvoiceById);
router.get("/:id/returns", getInvoiceReturns);

router.post("/:id/items", addInvoiceItem);
router.patch("/:id/items/:itemId", updateInvoiceItemQty);
router.delete("/:id/items/:itemId", removeInvoiceItem);

router.patch("/:id/discount", applyInvoiceDiscount);
router.patch("/:id/items/:itemId/discount", applyInvoiceItemDiscount);

router.post("/:id/finalize", finalizeInvoice);

router.get("/:id/receipt.pdf", printReceiptPdf);

export default router;