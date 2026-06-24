import express from "express";
import { checkSetup, verifyDevice, register, login } from "../controllers/authController.js";

const router = express.Router();

router.get("/setup-status", checkSetup);
router.post("/verify-device", verifyDevice);
router.post("/register", register);
router.post("/login", login);

export default router;
