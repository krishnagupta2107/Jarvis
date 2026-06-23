import express from "express";

const router = express.Router();

router.get("/status", (req, res) => {
  res.json({ status: "online", module: "ai" });
});

export default router;
