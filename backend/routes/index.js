import { getAdmissionSettings, updateAdmissionSettings } from "../controllers/admissionSettingsController.js";
import { getSchoolProfile, updateSchoolProfile } from "../controllers/schoolProfileController.js";
import { getEnrollmentGuide, updateEnrollmentGuide } from "../controllers/enrollmentGuideController.js";
import { getPublicStats } from "../controllers/publicStatsController.js";
import { getSystemLogs, exportSystemLogsCSV } from "../controllers/systemLogController.js";

/*
    MIT License
    
    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    */
    
import express from "express";
import { buildingVoiceover } from "../controllers/buildingVoiceoverController.js";
import passwordResetRoutes from "./passwordResetRoutes.js";
import { homePage } from "../controllers/homeController.js";
import { loginPage, registerPage, forgotPasswordPage, dashboardPage, loginUser, registerUser, logoutUser, verifyEmail, resendVerification, startGoogleAuth, completeGoogleAuth, consumeGoogleAuth, getCurrentUser, updateProfile } from "../controllers/authController.js";
import { createChatLimiter } from "../services/chatGuardrails.js";
import { sendMessage, rateFeedback } from "../controllers/chatController.js";
import { getAllBuildings, getBuildingById, createBuilding, updateBuilding, deleteBuilding, upload } from "../controllers/buildingController.js";
import { requireAdmin, getDashboardStats, getAllFAQs, createFAQ, updateFAQ, deleteFAQ, getAllUsers, updateUser, deleteUser, resetUserPassword, toggleUserStatus } from "../controllers/adminController.js";
import { requireRegistrar, requireAdminOrRegistrar, authenticateToken } from "../middleware/auth.js";
import { sanitizeBody, validateLogin, validateRegister, validateFAQ } from "../middleware/validate.js";
import { getAllTeachers, createUser, assignTeacherToSection } from "../controllers/teacherController.js";
import {
  getGradingPeriods, setupGradingPeriods, openGradingPeriod, closeGradingPeriod,
  getStudentGrades, getSectionGrades
} from "../controllers/gradingController.js";
import {
  getClassSchedules, createClassSchedule, deleteClassSchedule, getStudentSchedule, downloadStudentSchedulePDF
} from "../controllers/scheduleController.js";
import enrollmentRoutes from "./enrollmentRoutes.js";
import adminEnrollmentRoutes from "./adminEnrollmentRoutes.js";
import registrarRoutes from "./registrarRoutes.js";
import subjectSelectionRoutes from "./subjectSelectionRoutes.js";
import sectionRoutes from "./sectionRoutes.js";
import teacherRoutes from "./teacherRoutes.js";
import {
  getPrograms, getSubjects, createSubject, updateSubject, deleteSubject,
  getSections, createSection, updateSection, deleteSection,
  getSchoolYears, getActiveSchoolYear, createSchoolYear, setActiveSchoolYear,
  closeSchoolYear
} from "../controllers/academicController.js";

const router = express.Router();
router.use("/api/auth", passwordResetRoutes);

// Public routes
router.get("/", homePage);
router.get("/login", loginPage);
router.post("/login", loginUser);
router.get("/register", registerPage);
router.post("/register", registerUser);
router.get("/forgot-password", forgotPasswordPage);
router.get("/logout", logoutUser);

// Auth API routes (for React frontend)
router.post("/api/auth/login", sanitizeBody, validateLogin, loginUser);
router.post("/api/auth/register", sanitizeBody, validateRegister, registerUser);
router.get("/api/auth/google", startGoogleAuth);
router.get("/api/auth/google/callback", completeGoogleAuth);
router.get("/api/auth/google/session", consumeGoogleAuth);
router.post("/api/auth/logout", logoutUser);
router.post("/api/auth/verify-otp", sanitizeBody, verifyEmail);
router.post("/api/auth/resend-verification", sanitizeBody, resendVerification);
router.get("/api/auth/me", authenticateToken, getCurrentUser);
router.put("/api/auth/profile", authenticateToken, sanitizeBody, updateProfile);

// Protected routes
router.get("/dashboard", dashboardPage);

// Chat API
const chatLimiter = createChatLimiter();
router.post("/api/chat/message", chatLimiter, sendMessage);
router.post("/api/chat/feedback", chatLimiter, rateFeedback);

// Public stats & settings API
router.get("/api/public-stats", getPublicStats);
router.get("/api/admission-settings", getAdmissionSettings);
router.put("/api/admin/admission-settings", requireAdmin, updateAdmissionSettings);
router.get("/api/school-profile", getSchoolProfile);
router.put("/api/admin/school-profile", requireAdmin, updateSchoolProfile);
router.get("/api/enrollment-guide", getEnrollmentGuide);
router.put("/api/admin/enrollment-guide", requireAdmin, updateEnrollmentGuide);
router.get("/api/buildings", getAllBuildings);
router.get("/api/buildings/:id", getBuildingById);

// Admin API (protected)
router.get("/api/admin/stats", requireAdmin, getDashboardStats);
router.get("/api/admin/system-logs", requireAdmin, getSystemLogs);
router.get("/api/admin/system-logs/export", requireAdmin, exportSystemLogsCSV);
router.get("/api/admin/faqs", requireAdmin, getAllFAQs);
router.post("/api/admin/faqs", requireAdmin, sanitizeBody, validateFAQ, createFAQ);
router.put("/api/admin/faqs/:id", requireAdmin, sanitizeBody, validateFAQ, updateFAQ);
router.delete("/api/admin/faqs/:id", requireAdmin, deleteFAQ);
router.get("/api/admin/users", requireAdmin, getAllUsers);
router.post("/api/admin/users/create", requireAdmin, sanitizeBody, createUser);
router.put("/api/admin/users/:id", requireAdmin, updateUser);
router.put("/api/admin/users/:id/status", requireAdmin, toggleUserStatus);
router.post("/api/admin/users/:id/reset-password", requireAdmin, resetUserPassword);
router.delete("/api/admin/users/:id", requireAdmin, deleteUser);
router.get("/api/admin/teachers", authenticateToken, requireAdminOrRegistrar, getAllTeachers);
router.get("/api/academic/teachers", authenticateToken, requireAdminOrRegistrar, getAllTeachers);
router.put("/api/admin/sections/:id/assign-teacher", authenticateToken, requireAdminOrRegistrar, sanitizeBody, assignTeacherToSection);
router.post("/api/admin/buildings", requireAdmin, upload.single("photo360"), createBuilding);
router.put("/api/admin/buildings/:id", requireAdmin, upload.single("photo360"), updateBuilding);
router.delete("/api/admin/buildings/:id", requireAdmin, deleteBuilding);
router.get("/api/admin/buildings/:id/voiceover", requireAdmin, buildingVoiceover.get);
router.post("/api/admin/buildings/:id/voiceover/generate", requireAdmin, buildingVoiceover.generate);
router.put("/api/admin/buildings/:id/voiceover/publish", requireAdmin, buildingVoiceover.publish);

// Enrollment API (protected)
router.use("/api/enrollments", enrollmentRoutes);

// Subject Selection API (protected)
router.use("/api/enrollments", subjectSelectionRoutes);

// Admin Enrollment API (protected - admin only)
router.use("/api/admin", adminEnrollmentRoutes);

// Registrar API (protected - registrar only)
router.use("/api/registrar", registrarRoutes);

// Section Management API (protected - admin or registrar)
router.use("/api/admin/sections", sectionRoutes);
router.use("/api/registrar/sections", sectionRoutes);

// Teacher API (protected - teacher only)
router.use("/api/teacher", teacherRoutes);

// Academic API - public read, admin write
router.get("/api/academic/programs", getPrograms);
router.get("/api/academic/subjects", getSubjects);
router.get("/api/academic/school-years", getSchoolYears);
router.get("/api/academic/school-years/active", getActiveSchoolYear);
router.post("/api/admin/academic/subjects", requireAdmin, createSubject);
router.put("/api/admin/academic/subjects/:id", requireAdmin, updateSubject);
router.delete("/api/admin/academic/subjects/:id", requireAdmin, deleteSubject);
router.get("/api/admin/academic/sections", requireAdmin, getSections);
router.post("/api/admin/academic/sections", requireAdmin, createSection);
router.put("/api/admin/academic/sections/:id", requireAdmin, updateSection);
router.delete("/api/admin/academic/sections/:id", requireAdmin, deleteSection);
router.post("/api/admin/academic/school-years", requireAdmin, createSchoolYear);
router.put("/api/admin/academic/school-years/:id/activate", requireAdmin, setActiveSchoolYear);
router.post("/api/admin/academic/close-school-year", requireAdmin, closeSchoolYear);

// ── Grading Period API (admin) ────────────────────────────────────────────────
router.get("/api/admin/grading-periods", requireAdmin, getGradingPeriods);
router.post("/api/admin/grading-periods/setup", requireAdmin, setupGradingPeriods);
router.put("/api/admin/grading-periods/:id/open", requireAdmin, openGradingPeriod);
router.put("/api/admin/grading-periods/:id/close", requireAdmin, closeGradingPeriod);

// ── Section grades view (admin/registrar) ─────────────────────────────────────
router.get("/api/admin/sections/:sectionId/grades", authenticateToken, requireAdminOrRegistrar, getSectionGrades);

// ── Class schedules ──────────────────────────────────────────────────────────
router.get("/api/academic/schedules", authenticateToken, getClassSchedules);
router.post("/api/academic/schedules", authenticateToken, requireAdminOrRegistrar, sanitizeBody, createClassSchedule);
router.delete("/api/academic/schedules/:id", authenticateToken, requireAdminOrRegistrar, deleteClassSchedule);

// ── Student schedule ─────────────────────────────────────────────────────────
router.get("/api/student/my-schedule", authenticateToken, getStudentSchedule);
router.get("/api/student/my-schedule/pdf", authenticateToken, downloadStudentSchedulePDF);

export default router;
