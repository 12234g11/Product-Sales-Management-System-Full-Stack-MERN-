import mongoose from "mongoose";

const saleReturnItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, trim: true },
    productName: { type: String, required: true, trim: true },
    productCategory: { type: String, default: "", trim: true },

    qtyReturned: { type: Number, required: true, min: 1 },

    // ✅ breakdown for frontend clarity
    salePrice: { type: Number, required: true, min: 0 },
    itemDiscountPercent: { type: Number, required: true, min: 0, max: 100 },
    invoiceDiscountPercent: { type: Number, required: true, min: 0, max: 100 },

    unitNetPrice: { type: Number, required: true, min: 0 },         // after discounts
    unitDiscountAmount: { type: Number, required: true, min: 0 },    // salePrice - unitNetPrice

    lineRefundAmount: { type: Number, required: true, min: 0 },

    returnStockStatus: { type: String, enum: ["restocked", "damaged"], required: true },
  },
  { _id: true }
);

const saleReturnSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },

    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "SaleInvoice", required: true, index: true },
    invoiceCode: { type: String, required: true, trim: true, index: true },
    invoiceName: { type: String, default: "", trim: true },

    invoiceCreatedAt: { type: Date, default: null },
    invoiceFinalizedAt: { type: Date, default: null },
    invoiceCashierName: { type: String, default: "", trim: true },

    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    createdByName: { type: String, required: true, trim: true },

    type: { type: String, enum: ["full", "partial"], required: true },

    totalRefundAmount: { type: Number, required: true, min: 0 },
    totalRefundRestocked: { type: Number, required: true, min: 0 },
    totalRefundDamaged: { type: Number, required: true, min: 0 },
    totalReturnedQty: { type: Number, required: true, min: 0 },

    stockStatus: { type: String, enum: ["restocked", "damaged", "mixed"], required: true },

    items: { type: [saleReturnItemSchema], default: [] },
  },
  { timestamps: true }
);

saleReturnSchema.index({ workspaceId: 1, createdAt: -1 });

export default mongoose.model("SaleReturn", saleReturnSchema);