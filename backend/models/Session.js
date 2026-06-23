import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    default: "Gemini",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const sessionSchema = new mongoose.Schema(
  {
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    summary: {
      type: String,
      default: "",
    },
    messages: [messageSchema],
    telemetry: {
      messageCount: {
        type: Number,
        default: 0,
      },
      searchCount: {
        type: Number,
        default: 0,
      },
      fallbackCount: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

const Session = mongoose.model("Session", sessionSchema);
export default Session;
