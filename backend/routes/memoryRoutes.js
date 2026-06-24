import express from "express";
import { getMemoryContext, addMemory, deleteMemory, updateProfile } from "../controllers/memoryController.js";

const router = express.Router();

router.get("/context", getMemoryContext);
router.post("/", addMemory);
router.delete("/:id", deleteMemory);
router.put("/profile", updateProfile);

export default router;
