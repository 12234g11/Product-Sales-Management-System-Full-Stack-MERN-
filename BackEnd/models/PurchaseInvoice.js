import mongoose from "mongoose";

const purchaseItemSchema = new mongoose.Schema(
    {
        productId: { type: String, required: [true, "productId is required"], trim: true },
        productName: { type: String, required: [true, "productName is required"], trim: true },
        productCategory: { type: String, default: "", trim: true },

        purchasePrice: { type: Number, required: [true, "purchasePrice is required"], min: 0 },
        quantity: { type: Number, required: [true, "quantity is required"], min: 1 },
    },
    { _id: true }
);

const purchaseInvoiceSchema = new mongoose.Schema(
    {
        workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },

        invoiceCode: { type: String, required: [true, "Invoice code is required"], trim: true },

        supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null, index: true },
        supplierName: { type: String, required: [true, "Supplier name is required"], trim: true },

        status: { type: String, enum: ["draft", "finalized", "cancelled"], default: "draft", index: true },

        createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        createdByName: { type: String, required: true, trim: true },

        finalizedAt: { type: Date, default: null },
        finalizedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
        finalizedByName: { type: String, default: "", trim: true },

        notes: { type: String, default: "", trim: true },

        subtotal: { type: Number, default: 0, min: 0 },
        totalAmount: { type: Number, default: 0, min: 0 },
        totalItemsQty: { type: Number, default: 0, min: 0 },

        items: { type: [purchaseItemSchema], default: [] },
    },
    { timestamps: true }
);

purchaseInvoiceSchema.index({ workspaceId: 1, invoiceCode: 1 }, { unique: true });

export default mongoose.model("PurchaseInvoice", purchaseInvoiceSchema);