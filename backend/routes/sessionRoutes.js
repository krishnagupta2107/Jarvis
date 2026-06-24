import express from "express";
import {
  getSessions,
  createSession,
  addMessage,
  closeSession,
  clapStatusCheck,
} from "../controllers/sessionController.js";

const router = express.Router();

router.get("/", getSessions);
router.post("/", createSession);
router.post("/:sessionId/message", addMessage);
router.post("/:sessionId/close", closeSession);
router.get("/clap-check", clapStatusCheck);

export default router;
