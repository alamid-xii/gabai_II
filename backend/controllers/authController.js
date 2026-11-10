import bcrypt from "bcrypt";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { User, sequelize } from "../models/userModel.js";
import { PendingRegistration } from "../models/pendingRegistrationModel.js";
import { sendWelcomeEmail, sendOtpEmail } from "../services/emailService.js";
import { newGoogleProfile, profileUpdates, serializeUser } from "../services/userProfile.js";
import { authenticateRequest, createAccessToken } from "../services/authentication.js";
import { isValidPassword, normalizeAccountEmail, PASSWORD_POLICY_MESSAGE } from "../services/accountValidation.js";

try { await sequelize.authenticate(); } catch (err) { console.warn("DB unavailable at import (authController):", err.message); }

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
export const dashboardPage = async (req, res) => {
  try {
    await authenticateRequest(req, { allowSession: true });
    res.render("dashboard", { title: "Dashboard" });
  } catch { res.redirect('/login'); }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid email or password" });

    // Check account status (suspended / deactivated)
    if (user.isActive === false || user.isActive === 0 || user.isActive === '0') {
      return res.status(403).json({
        message: "Your account has been suspended or deactivated. Please contact an administrator.",
        isSuspended: true
      });
    }

    // Check email verification — only required for students
    if (user.role === 'student' && (!user.isVerified || user.isVerified === 0 || user.isVerified === '0')) {
      return res.status(403).json({
        message: "Please verify your email before logging in. Check your inbox for the verification link.",
        needsVerification: true,
        email: user.email
      });
    }

    const token = createAccessToken(user);
    req.session.userId = user.id;
    req.session.tokenVersion = Number(user.tokenVersion || 0);

    res.json({
      message: "Login successful",
      token,
      user: serializeUser(user),
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
        ...newGoogleProfile(profile),
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
      token: createAccessToken(user),
      user: serializeUser(user),
    };

    await new Promise((resolve, reject) => {
      req.session.regenerate((error) => error ? reject(error) : resolve());
    });
    req.session.userId = user.id;
    req.session.tokenVersion = Number(user.tokenVersion || 0);
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

export const consumeGoogleAuth = async (req, res) => {
  const authResult = req.session?.googleAuth;
  if (!authResult) return res.status(401).json({ message: "No Google sign-in is waiting to be completed." });
  try { await authenticateRequest(req, { allowSession: true }); }
  catch { return res.status(401).json({ message: 'Your session has expired. Please sign in again.' }); }
  delete req.session.googleAuth;
  req.session.save((error) => {
    if (error) return res.status(500).json({ message: "Could not complete Google sign-in." });
    res.json(authResult);
  });
};

export const registerUser = async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = normalizeAccountEmail(req.body.email);
    if (!email) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (!isValidPassword(password)) return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });

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

// Logout revokes this account's existing bearer tokens and sessions, including other devices.
export const logoutUser = async (req, res) => {
  try {
    let user;
    try { user = await authenticateRequest(req, { allowSession: true }); }
    catch (error) { if (!error.status) throw error; }
    if (user) await User.increment('tokenVersion', { where: { id: user.id } });
    const finish = err => {
      if (err) return res.status(500).json({ message: 'Logout failed' });
      res.clearCookie('connect.sid');
      return res.json({ message: 'Logout successful' });
    };
    if (req.session?.destroy) req.session.destroy(finish);
    else finish();
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
};

// GET /api/auth/me — validate the saved access token and return the current user
export const getCurrentUser = (req, res) => {
  if (req.session) {
    req.session.userId = req.user.id;
    req.session.tokenVersion = Number(req.user.tokenVersion || 0);
  }
  res.json({
    user: serializeUser(req.user),
  });
};

// PUT /api/auth/profile  — update own name and/or password
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { currentPassword, newPassword } = req.body;
    let user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const updates = profileUpdates(req.body, user);
    if (newPassword !== undefined) {
      if (typeof currentPassword !== 'string' || !currentPassword) return res.status(400).json({ error: 'Current password is required' });
      if (!isValidPassword(newPassword)) return res.status(400).json({ error: PASSWORD_POLICY_MESSAGE });
      const passwordHash = await bcrypt.hash(newPassword, 10);
      user = await sequelize.transaction(async transaction => {
        const current = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!current || !await bcrypt.compare(currentPassword, current.password)) throw Object.assign(new Error('Current password is incorrect'), { status: 400 });
        await current.update({ ...updates, password: passwordHash, tokenVersion: Number(current.tokenVersion || 0) + 1 }, { transaction });
        return current;
      });
      if (req.session) {
        req.session.userId = user.id;
        req.session.tokenVersion = Number(user.tokenVersion || 0);
      }
    } else {
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });
      await user.update(updates);
    }
    res.json({ message: 'Profile updated successfully', user: serializeUser(user), ...(newPassword !== undefined ? { token: createAccessToken(user) } : {}) });
  } catch (error) {
    if (!error.status) console.error('updateProfile error:', error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to update profile' });
  }
};
