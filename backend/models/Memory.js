import mongoose from "mongoose";

const memorySchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    importance: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    category: {
      type: String,
      default: "general",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add text indexing to support quick query lookups if searching memories later
memorySchema.index({ content: "text" });

const Memory = mongoose.model("Memory", memorySchema);
export default Memory;
