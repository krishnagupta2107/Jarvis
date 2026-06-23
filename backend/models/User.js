import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    pinHash: {
      type: String,
      required: true,
    },
    authorizedDevices: {
      type: [String],
      default: [],
    },
    profile: {
      name: {
        type: String,
        default: "Krishna Gupta",
      },
      preferences: {
        type: String,
        default: "",
      },
      facts: {
        type: String,
        default: "",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Mongoose Pre-Save middleware to automatically hash the PIN before saving
userSchema.pre("save", async function (next) {
  // Only hash the PIN if it has been modified or is new
  if (!this.isModified("pinHash")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.pinHash = await bcrypt.hash(this.pinHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to safely verify user pin inputs on login requests
userSchema.methods.comparePin = async function (enteredPin) {
  try {
    return await bcrypt.compare(enteredPin, this.pinHash);
  } catch (error) {
    return false;
  }
};

const User = mongoose.model("User", userSchema);
export default User;
