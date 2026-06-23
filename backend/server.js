import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

// Import router files
import authRoutes from "./routes/authRoutes.js";
import memoryRoutes from "./routes/memoryRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

// Load configuration parameters from environment (.env)
dotenv.config();

// Establish connection to local MongoDB database
connectDB();

const app = express();

// Standard MERN Middleware setup
app.use(cors());
app.use(express.json());

// Cyberpunk themed request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[SERVER] ${req.method} ${req.originalUrl} - status: ${res.statusCode} - duration: ${duration}ms`
    );
  });
  next();
});

// Root route checking API health
app.get("/api/health", (req, res) => {
  res.json({
    status: "active",
    system: "J.A.R.V.I.S Core API",
    time: new Date().toISOString(),
  });
});

// Mount modular sub-routes
app.use("/api/auth", authRoutes);
app.use("/api/memories", memoryRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/ai", aiRoutes);

// Define PORT and bind server listener
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🤖 J.A.R.V.I.S SYSTEM STATUS: ONLINE`);
  console.log(`🖥️  COORDINATOR BIND PORT: http://localhost:${PORT}`);
  console.log(`=================================================\n`);
});
