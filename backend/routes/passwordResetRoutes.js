import express from "express";
import { User, sequelize } from "../models/userModel.js";
import { PasswordReset } from "../models/passwordResetModel.js";
import { sendPasswordResetEmail } from "../services/emailService.js";
import { createPasswordResetHandlers } from "../controllers/passwordResetController.js";

const router = express.Router();
const handlers = createPasswordResetHandlers({ User, PasswordReset, sequelize, sendPasswordResetEmail });
// Bound abuse without retaining an unbounded collection of IP addresses.
const attempts = new Map();
const windowMs = 15 * 60 * 1000;
const cleanup = setInterval(() => {
  for (const [key, entry] of attempts) if (entry.until <= Date.now()) attempts.delete(key);
}, windowMs);
cleanup.unref();
router.use(["/forgot-password", "/reset-password"], (req, res, next) => {
  const key = req.ip;
  const now = Date.now();
  let entry = attempts.get(key);
  if (!entry || entry.until <= now) {
    if (attempts.size >= 10000 && !entry) return res.status(429).json({ message: "Please try again later." });
    entry = { count: 0, until: now + windowMs };
    attempts.set(key, entry);
  }
  if (++entry.count > 10) {
    res.set("Retry-After", String(Math.ceil((entry.until - now) / 1000)));
    return res.status(429).json({ message: "Too many password reset attempts. Please try again in 15 minutes." });
  }
  next();
});
router.post("/forgot-password", handlers.forgotPassword);
router.post("/reset-password", handlers.resetPassword);
export default router;
