import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const connectDB = async () => {
  try {
    // Attempt local connection first, with a short timeout
    const conn = await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/jarvis", {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`[DATABASE] Local database connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[DATABASE WARNING] Local MongoDB not found. Falling back to In-Memory MongoDB...`);
    try {
      const mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri);
      console.log(`[DATABASE] In-memory database connected at: ${uri}`);
    } catch (memError) {
      console.error(`[DATABASE ERROR] In-memory DB failed: ${memError.message}`);
      process.exit(1);
    }
  }
};

export default connectDB;
