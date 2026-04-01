import mongoose from "mongoose";

const saleInvoiceItemSchema = new mongoose.Schema(
    {
        productId: { type: String, required: [true, "productId is required"], trim: true },
        productName: { type: String, required: [true, "productName is required"], trim: true },

        productCategory: { type: String, default: "", trim: true },

        salePrice: { type: Number, required: [true, "salePrice is required"], min: 0 },
        quantity: { type: Number, required: [true, "quantity is required"], min: 1 },

        itemDiscountPercent: { type: Number, default: 0, min: 0, max: 100 },

        returnedQty: { type: Number, default: 0, min: 0 },

        unitNetPrice: { type: Number, default: 0, min: 0 },
    },
    { _id: true }
);

const saleInvoiceSchema = new mongoose.Schema(
    {
        workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },

        invoiceCode: { type: String, required: [true, "Invoice code is required"], trim: true },
        name: { type: String, trim: true, default: "" },

        status: { type: String, enum: ["draft", "finalized", "cancelled"], default: "draft", index: true },

        createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        createdByName: { type: String, required: true, trim: true },

        finalizedAt: { type: Date, default: null },

        finalizedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
        finalizedByName: { type: String, default: "", trim: true },

        subtotal: { type: Number, default: 0, min: 0 },
        totalDiscountAmount: { type: Number, default: 0, min: 0 },
        totalAmount: { type: Number, default: 0, min: 0 },
        totalItemsQty: { type: Number, default: 0, min: 0 },

        invoiceDiscountPercent: { type: Number, default: 0, min: 0, max: 100 },

        returnStatus: { type: String, enum: ["none", "partial", "full"], default: "none", index: true },
        totalRefundedAmount: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true }
);

saleInvoiceSchema.add({
    items: { type: [saleInvoiceItemSchema], default: [] },
});

saleInvoiceSchema.index({ workspaceId: 1, invoiceCode: 1 }, { unique: true });

export default mongoose.model("SaleInvoice", saleInvoiceSchema);