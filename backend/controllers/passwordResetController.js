import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { Op } from "sequelize";

const genericMessage = "If an eligible account exists, a password reset link has been sent. Check your inbox and spam folder. Google accounts should continue with Google.";
const digest = (token) => crypto.createHash("sha256").update(token).digest("hex");

export function createPasswordResetHandlers({ User, PasswordReset, sequelize, sendPasswordResetEmail }) {
  return {
    async forgotPassword(req, res) {
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Enter a valid email address." });
      }
      try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
          return res.status(503).json({ message: "Password reset email is unavailable. Please contact the administrator." });
        }
        const user = await User.findOne({ where: { email } });
        if (user && user.authProvider !== "google" && user.isActive) {
          const token = crypto.randomBytes(32).toString("hex");
          const tokenHash = digest(token);
          await PasswordReset.upsert({ userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) });
          const baseUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
          const sent = await sendPasswordResetEmail(user, `${baseUrl}/reset-password?token=${token}`);
          if (!sent) {
            await PasswordReset.destroy({ where: { userId: user.id, tokenHash } });
            console.error("Password reset email delivery failed.");
          }
        }
        return res.json({ message: genericMessage });
      } catch (error) {
        console.error("Password reset request failed:", error.message);
        return res.status(500).json({ message: "Unable to request a password reset. Please try again later." });
      }
    },
    async resetPassword(req, res) {
      const { token, password } = req.body || {};
      if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
        return res.status(400).json({ message: "This reset link is invalid or has expired. Please request a new one." });
      }
      if (typeof password !== "string" || password.length < 12 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || Buffer.byteLength(password, "utf8") > 72) {
        return res.status(400).json({ message: "Use at least 12 characters, 1 uppercase letter and 1 number (maximum 72 bytes)." });
      }
      try {
        const passwordHash = await bcrypt.hash(password, 10);
        const changed = await sequelize.transaction(async (transaction) => {
          const reset = await PasswordReset.findOne({
            where: { tokenHash: digest(token), expiresAt: { [Op.gt]: new Date() } },
            transaction, lock: transaction.LOCK.UPDATE,
          });
          if (!reset) return false;
          const user = await User.findByPk(reset.userId, { transaction, lock: transaction.LOCK.UPDATE });
          if (!user || user.authProvider === "google" || !user.isActive) return false;
          await user.update({ password: passwordHash }, { transaction });
          await reset.destroy({ transaction });
          return true;
        });
        if (!changed) return res.status(400).json({ message: "This reset link is invalid or has expired. Please request a new one." });
        return res.json({ message: "Your password has been reset. You can now log in with your new password." });
      } catch (error) {
        console.error("Password reset failed:", error.message);
        return res.status(500).json({ message: "Unable to reset your password. Please try again later." });
      }
    },
  };
}
