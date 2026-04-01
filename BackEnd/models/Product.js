import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    id: {
      type: String,
      required: [true, "Product ID is required"],
      trim: true,
    },

    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },

    category: {
      type: String,
      required: [true, "Product category is required"],
      trim: true,
    },

    purchasePrice: {
      type: Number,
      required: [true, "Purchase price is required"],
      min: [0, "Purchase price cannot be negative"],
    },

    salePrice: {
      type: Number,
      required: [true, "Sale price is required"],
      min: [0, "Sale price cannot be negative"],
    },


    minStock: {
      type: Number,
      default: 0,
      min: [0, "minStock cannot be negative"],
    },

    quantity: {
      type: Number,
      default: 0,
      min: [0, "Quantity cannot be negative"],
    },
  },
  { timestamps: true }
);

productSchema.index({ workspaceId: 1, id: 1 }, { unique: true });

const Product = mongoose.model("Product", productSchema);
export default Product;