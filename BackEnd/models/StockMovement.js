import mongoose from "mongoose";

const stockMovementSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    productId: { type: String, required: true, trim: true, index: true },
    productName: { type: String, required: true, trim: true },
    productCategory: { type: String, default: "", trim: true },

    type: {
      type: String,
      enum: ["purchase", "sale", "sale_return", "adjustment"],
      required: true,
      index: true,
    },

    qtyDelta: { type: Number, required: true },

    beforeQty: { type: Number, required: true, min: 0 },
    afterQty: { type: Number, required: true, min: 0 },

    refType: { type: String, default: "", trim: true },
    refId: { type: String, default: "", trim: true },
    refCode: { type: String, default: "", trim: true },

    reason: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },

    performedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    performedByName: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

stockMovementSchema.index({ workspaceId: 1, productId: 1, createdAt: -1 });
stockMovementSchema.index({ workspaceId: 1, createdAt: -1 });

export default mongoose.model("StockMovement", stockMovementSchema);