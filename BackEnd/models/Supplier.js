import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    name: { type: String, required: [true, "Supplier name is required"], trim: true },
    phone: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },

    isActive: { type: Boolean, default: true },

    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    createdByName: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

supplierSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export default mongoose.model("Supplier", supplierSchema);