import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/jarvis");
    console.log(`[DATABASE] Local database connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[DATABASE ERROR] Connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
