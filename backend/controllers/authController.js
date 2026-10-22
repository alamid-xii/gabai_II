import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { User, sequelize } from "../models/userModel.js";
import { PendingRegistration } from "../models/pendingRegistrationModel.js";
import { sendWelcomeEmail, sendOtpEmail } from "../services/emailService.js";

try { await sequelize.authenticate(); } catch (err) { console.warn("DB unavailable at import (authController):", err.message); }

const JWT_SECRET = process.env.JWT_SECRET || "emc-secret-key-2025";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const googleCallbackUrl = () => process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/auth/google/callback";
const googleLoginUrl = (params) => `${FRONTEND_URL.replace(/\/+$/, "")}/login?${new URLSearchParams(params)}`;

const createGoogleOAuthClient = () => new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  googleCallbackUrl(),
);

export const loginPage = (req, res) => res.render("login", { title: "Login" });
export const registerPage = (req, res) => res.render("register", { title: "Register" });
export const forgotPasswordPage = (req, res) => res.render("forgotpassword", { title: "Forgot Password" });
export const dashboardPage = (req, res) => {
  if (!req.session.userId) return res.redirect("/login");
  res.render("dashboard", { title: "Dashboard" });
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid email or password" });

    // Check email verification — only required for students
    if (user.role === 'student' && (!user.isVerified || user.isVerified === 0 || user.isVerified === '0')) {
      return res.status(403).json({
        message: "Please verify your email before logging in. Check your inbox for the verification link.",
        needsVerification: true,
        email: user.email
      });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    req.session.userId = user.id;

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

export const startGoogleAuth = (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(googleLoginUrl({ google: "error", message: "Google sign-in is not configured on the server." }));
  }

  const mode = req.query.mode;
  if (!['login', 'signup'].includes(mode)) {
    return res.redirect(googleLoginUrl({ google: "error", message: "Choose Google login or Google sign-up to continue." }));
  }

  const state = crypto.randomBytes(32).toString("hex");
  req.session.googleOAuthState = state;
  req.session.googleOAuthMode = mode;
  req.session.save((error) => {
    if (error) {
      return res.redirect(googleLoginUrl({ google: "error", message: "Could not start Google sign-in. Please try again." }));
    }

    const authorizationUrl = createGoogleOAuthClient().generateAuthUrl({
      access_type: "online",
      prompt: "select_account",
      scope: ["openid", "email", "profile"],
      state,
    });
    res.redirect(authorizationUrl);
  });
};

export const completeGoogleAuth = async (req, res) => {
  const fail = (message) => res.redirect(googleLoginUrl({ google: "error", message }));

  try {
    if (req.query.error) return fail("Google sign-in was cancelled or denied.");

    const expectedState = req.session?.googleOAuthState;
    const mode = req.session?.googleOAuthMode;
    const receivedState = typeof req.query.state === "string" ? req.query.state : "";
    delete req.session.googleOAuthState;
    delete req.session.googleOAuthMode;
    if (!expectedState || !receivedState || expectedState.length !== receivedState.length ||
        !crypto.timingSafeEqual(Buffer.from(expectedState), Buffer.from(receivedState))) {
      return fail("Google sign-in could not be verified. Please try again.");
    }
    if (!['login', 'signup'].includes(mode)) {
      return fail("Choose Google login or Google sign-up to continue.");
    }
    if (!req.query.code || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return fail("Google sign-in is not configured correctly.");
    }

    const oauthClient = createGoogleOAuthClient();
    const { tokens } = await oauthClient.getToken(String(req.query.code));
    if (!tokens.id_token) return fail("Google did not return a verified identity.");

    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || profile.email_verified !== true) {
      return fail("A verified Google email address is required.");
    }

    const email = profile.email.toLowerCase();
    const result = await sequelize.transaction(async (transaction) => {
      const googleAccount = await User.findOne({
        where: { googleId: profile.sub },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const emailAccount = await User.findOne({
        where: { email },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (mode === 'login') {
        if (!googleAccount || googleAccount.authProvider !== 'google') {
          return {
            error: emailAccount
              ? "This account was registered with email and password. Please log in using your password."
              : "This Google account is not registered yet. Please sign up with Google first.",
          };
        }
        if (googleAccount.isActive === false || googleAccount.isActive === 0) {
          return { error: "This account is disabled. Please contact an administrator." };
        }
        return { user: googleAccount };
      }

      if (googleAccount) {
        return { error: "This Google account is already registered. Please log in with Google instead." };
      }
      if (emailAccount) {
        return {
          error: emailAccount.authProvider === 'password'
            ? "This email is already registered with a password. Please log in using your email and password."
            : "This email is already registered with another sign-in method.",
        };
      }

      const pending = await PendingRegistration.findOne({ where: { email }, transaction, lock: transaction.LOCK.UPDATE });
      const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
      const user = await User.create({
        name: profile.name || pending?.name || email.split("@")[0],
        email,
        password: randomPassword,
        authProvider: 'google',
        googleId: profile.sub,
        isVerified: true,
        verificationToken: null,
        verificationExpires: null,
      }, { transaction });

      if (pending) await pending.destroy({ transaction });
      return { user };
    });

    if (result.error) return fail(result.error);
    const user = result.user;
    const authResult = {
      token: jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" }),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };

    await new Promise((resolve, reject) => {
      req.session.regenerate((error) => error ? reject(error) : resolve());
    });
    req.session.userId = user.id;
    req.session.googleAuth = authResult;
    await new Promise((resolve, reject) => {
      req.session.save((error) => error ? reject(error) : resolve());
    });

    res.redirect(googleLoginUrl({ google: "success" }));
  } catch (error) {
    console.error("Google sign-in error:", error.message);
    fail("Google sign-in failed. Please try again.");
  }
};

export const consumeGoogleAuth = (req, res) => {
  const authResult = req.session?.googleAuth;
  if (!authResult) return res.status(401).json({ message: "No Google sign-in is waiting to be completed." });

  delete req.session.googleAuth;
  req.session.save((error) => {
    if (error) return res.status(500).json({ message: "Could not complete Google sign-in." });
    res.json(authResult);
  });
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ message: "Email already registered" });
    const hashed = await bcrypt.hash(password, 10);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const [pendingRegistration] = await PendingRegistration.upsert({
      name,
      email,
      password: hashed,
      verificationToken: otp,
      verificationExpires: otpExpires,
    });

    // Send OTP email
    const emailSent = await sendOtpEmail(pendingRegistration, otp);

    res.status(201).json({
      message: emailSent
        ? "Registration successful! A 6-digit OTP has been sent to your email."
        : "Registration successful, but the verification email could not be sent. Please check the email configuration or request a new OTP later.",
      requiresVerification: true,
      emailSent,
      email,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// POST /api/auth/verify-otp
export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP are required." });

    const result = await sequelize.transaction(async (transaction) => {
      const pending = await PendingRegistration.findOne({
        where: { email },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!pending) {
        const legacyUser = await User.findOne({
          where: { email },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!legacyUser) return { status: 400, message: "No pending registration found with that email." };
        if (legacyUser.isVerified) return { success: true, alreadyVerified: true, user: legacyUser };
        if (!legacyUser.verificationToken || legacyUser.verificationToken !== otp.trim()) {
          return { status: 400, message: "Incorrect OTP. Please try again." };
        }
        if (legacyUser.verificationExpires && new Date(legacyUser.verificationExpires) < new Date()) {
          return { status: 400, message: "OTP has expired. Please request a new one." };
        }
        legacyUser.isVerified = true;
        legacyUser.verificationToken = null;
        legacyUser.verificationExpires = null;
        await legacyUser.save({ transaction });
        return { success: true, user: legacyUser };
      }

      if (!pending.verificationToken || pending.verificationToken !== otp.trim()) {
        return { status: 400, message: "Incorrect OTP. Please try again." };
      }
      if (pending.verificationExpires && new Date(pending.verificationExpires) < new Date()) {
        return { status: 400, message: "OTP has expired. Please request a new one." };
      }

      const user = await User.create({
        name: pending.name,
        email: pending.email,
        password: pending.password,
        isVerified: true,
        verificationToken: null,
        verificationExpires: null,
      }, { transaction });
      await pending.destroy({ transaction });
      return { success: true, user };
    });

    if (!result.success) {
      return res.status(result.status).json({ success: false, message: result.message });
    }

    if (!result.alreadyVerified) {
      try { await sendWelcomeEmail(result.user); } catch (_) {}
    }

    res.json({ success: true, message: "Email verified successfully! You can now log in." });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ success: false, message: "Server error during verification." });
  }
};

// POST /api/auth/resend-verification
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const pending = await PendingRegistration.findOne({ where: { email } });
    const user = pending || await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "No account found with that email" });
    if (user.isVerified) return res.status(400).json({ message: "This account is already verified" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.verificationToken = otp;
    user.verificationExpires = otpExpires;
    await user.save();

    const emailSent = await sendOtpEmail(user, otp);
    if (!emailSent) {
      return res.status(503).json({ message: "The verification email could not be sent. Please try again later." });
    }
    res.json({ message: "A new OTP has been sent to your email." });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ message: "Failed to resend OTP." });
  }
};

export const logoutUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: "Logout failed" });
    res.clearCookie("connect.sid");
    res.json({ message: "Logout successful" });
  });
};

// GET /api/auth/me — validate the saved access token and return the current user
export const getCurrentUser = (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
};

// PUT /api/auth/profile  — update own name and/or password
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { name, currentPassword, newPassword } = req.body;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const updates = {};

    // Update display name
    if (name !== undefined) {
      const trimmed = (name || "").trim();
      if (!trimmed) return res.status(400).json({ error: "Name cannot be empty" });
      if (trimmed.length > 100) return res.status(400).json({ error: "Name is too long" });
      updates.name = trimmed;
    }

    // Change password
    if (newPassword !== undefined) {
      if (!currentPassword) return res.status(400).json({ error: "Current password is required" });
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) return res.status(400).json({ error: "Current password is incorrect" });
      if (newPassword.length < 8) return res.status(400).json({ error: "New password must be at least 8 characters" });
      updates.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    await user.update(updates);

    res.json({
      message: "Profile updated successfully",
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("updateProfile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};