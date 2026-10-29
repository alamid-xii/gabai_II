import jwt from "jsonwebtoken";
import { SystemLog } from "../models/systemLogModel.js";
import { User } from "../models/userModel.js";
import { sequelize } from "../models/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "emc-secret-key-2025";

const SENSITIVE_KEYS = new Set([
  "password",
  "newPassword",
  "currentPassword",
  "confirmPassword",
  "token",
  "otp",
  "verificationToken",
  "studentSignature",
  "parentGuardianSignature",
]);

export function sanitizePayload(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 3) return "[Truncated]";
  if (Array.isArray(value)) {
    return value.slice(0, 15).map((item) => sanitizePayload(item, depth + 1));
  }
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(k)) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = sanitizePayload(v, depth + 1);
      }
    }
    return out;
  }
  if (typeof value === "string" && value.length > 300) {
    return `${value.slice(0, 300)}...`;
  }
  return value;
}

export function extractClientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "127.0.0.1";
}

export function classifyAuditEvent({ method, path, statusCode, reqBody = {}, resBody = {}, actor }) {
  const cleanPath = (path || "").split("?")[0];
  const isErrorStatus = statusCode >= 400;
  const errMsg = resBody?.message || resBody?.error || null;
  const actorLabel = actor?.name || actor?.email || reqBody?.email || "User";

  let category = "system_settings";
  let action = `${method}_${cleanPath.replace(/^\/api\//, "").replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase()}`;
  let severity = statusCode >= 500 ? "error" : statusCode >= 400 ? "warning" : "info";
  let description = `${actorLabel} performed ${method} ${cleanPath}`;
  let targetType = null;
  let targetId = null;

  // ── 1. AUTHENTICATION ────────────────────────────────────────────────────────
  if (cleanPath.startsWith("/api/auth") || cleanPath === "/login" || cleanPath === "/register" || cleanPath === "/logout") {
    category = "auth";
    targetType = "user";

    if (cleanPath.endsWith("/login")) {
      action = isErrorStatus ? "LOGIN_FAILED" : "USER_LOGIN";
      severity = isErrorStatus ? "warning" : "success";
      const targetEmail = resBody?.user?.email || reqBody?.email || actorLabel;
      targetId = resBody?.user?.id ? String(resBody.user.id) : targetEmail;
      description = isErrorStatus
        ? `Failed login attempt for "${targetEmail}" (${errMsg || `HTTP ${statusCode}`})`
        : `${resBody?.user?.name || targetEmail} (${resBody?.user?.role || "user"}) logged in successfully`;
    } else if (cleanPath.endsWith("/register")) {
      action = isErrorStatus ? "REGISTER_FAILED" : "USER_REGISTER";
      severity = isErrorStatus ? "warning" : "info";
      targetId = reqBody?.email || null;
      description = isErrorStatus
        ? `Registration failed for "${reqBody?.email || "unknown"}" (${errMsg || `HTTP ${statusCode}`})`
        : `New student registration initiated for ${reqBody?.name || reqBody?.email || "applicant"}`;
    } else if (cleanPath.endsWith("/verify-otp")) {
      action = isErrorStatus ? "OTP_VERIFY_FAILED" : "EMAIL_VERIFIED";
      severity = isErrorStatus ? "warning" : "success";
      targetId = reqBody?.email || null;
      description = isErrorStatus
        ? `Email OTP verification failed for "${reqBody?.email || "unknown"}" (${errMsg || "Invalid OTP"})`
        : `Email address verified via OTP for ${reqBody?.email || actorLabel}`;
    } else if (cleanPath.endsWith("/resend-verification")) {
      action = "OTP_RESENT";
      severity = isErrorStatus ? "warning" : "info";
      targetId = reqBody?.email || null;
      description = `Verification OTP resent to ${reqBody?.email || actorLabel}`;
    } else if (cleanPath.endsWith("/logout")) {
      action = "USER_LOGOUT";
      severity = "info";
      targetId = actor?.id ? String(actor.id) : null;
      description = `${actorLabel} logged out`;
    } else if (cleanPath.endsWith("/profile")) {
      action = "PROFILE_UPDATED";
      severity = isErrorStatus ? "warning" : "success";
      targetId = actor?.id ? String(actor.id) : null;
      description = isErrorStatus
        ? `${actorLabel} failed to update profile (${errMsg || `HTTP ${statusCode}`})`
        : `${actorLabel} updated their account profile${reqBody?.newPassword ? " and password" : ""}`;
    } else if (cleanPath.includes("forgot-password") || cleanPath.includes("reset-password")) {
      action = cleanPath.includes("reset") ? "PASSWORD_RESET_COMPLETED" : "PASSWORD_RESET_REQUESTED";
      severity = isErrorStatus ? "warning" : "info";
      targetId = reqBody?.email || null;
      description = cleanPath.includes("reset")
        ? `Password reset completed${reqBody?.email ? ` for ${reqBody.email}` : ""}`
        : `Password reset requested for ${reqBody?.email || "account"}`;
    }
  }

  // ── 2. SSC EXAM & APPLICATION ────────────────────────────────────────────────
  else if (cleanPath.includes("ssc")) {
    category = "ssc";
    targetType = "enrollment";
    const idMatch = cleanPath.match(/\/enrollments\/(\d+)/);
    targetId = idMatch ? idMatch[1] : (resBody?.enrollmentId ? String(resBody.enrollmentId) : null);

    if (cleanPath.endsWith("/ssc-application")) {
      action = "SSC_APPLICATION_SUBMITTED";
      severity = isErrorStatus ? "warning" : "success";
      description = isErrorStatus
        ? `${actorLabel} failed to submit SSC application (${errMsg})`
        : `${actorLabel} submitted a Special Science Class (SSC) application (Grade 6 Avg: ${reqBody?.grade6Average || "N/A"})`;
    } else if (cleanPath.endsWith("/bulk-ssc-schedule")) {
      action = "SSC_BULK_SCHEDULED";
      severity = isErrorStatus ? "warning" : "success";
      description = isErrorStatus
        ? `${actorLabel} failed to bulk-schedule SSC exams (${errMsg})`
        : `${actorLabel} bulk-scheduled ${resBody?.scheduled ?? reqBody?.ids?.length ?? 0} student(s) for the SSC exam on ${reqBody?.examDate || "scheduled date"}`;
    } else if (cleanPath.endsWith("/ssc-schedule")) {
      action = "SSC_EXAM_SCHEDULED";
      severity = isErrorStatus ? "warning" : "info";
      const studentName = resBody?.enrollment ? `${resBody.enrollment.firstName || ""} ${resBody.enrollment.familyName || ""}`.trim() : `Enrollment #${targetId}`;
      description = isErrorStatus
        ? `${actorLabel} failed to schedule SSC exam for Enrollment #${targetId} (${errMsg})`
        : `${actorLabel} scheduled SSC entrance exam for ${studentName || `Enrollment #${targetId}`} on ${reqBody?.examDate || "N/A"}`;
    } else if (cleanPath.endsWith("/ssc-result")) {
      action = "SSC_RESULT_RECORDED";
      severity = isErrorStatus ? "warning" : "success";
      const studentName = resBody?.enrollment ? `${resBody.enrollment.firstName || ""} ${resBody.enrollment.familyName || ""}`.trim() : `Enrollment #${targetId}`;
      description = isErrorStatus
        ? `${actorLabel} failed to record SSC result for Enrollment #${targetId} (${errMsg})`
        : `${actorLabel} recorded SSC exam score (${reqBody?.examScore}) for ${studentName || `Enrollment #${targetId}`} — Result: ${(resBody?.sscResult || "recorded").toUpperCase()}`;
    } else if (cleanPath.endsWith("/ssc-choice")) {
      action = "SSC_CHOICE_MADE";
      severity = isErrorStatus ? "warning" : "success";
      description = `${actorLabel} selected "${reqBody?.choice || "SSC"}" class placement for Enrollment #${targetId}`;
    }
  }

  // ── 3. ENROLLMENTS & REGISTRAR WORKFLOW ──────────────────────────────────────
  else if (
    cleanPath.startsWith("/api/enrollments") ||
    cleanPath.startsWith("/api/registrar/enrollments") ||
    cleanPath.startsWith("/api/admin/enrollments")
  ) {
    category = "enrollment";
    targetType = "enrollment";
    const idMatch = cleanPath.match(/\/enrollments\/(\d+)/);
    targetId = idMatch ? idMatch[1] : (resBody?.enrollment?.id ? String(resBody.enrollment.id) : null);
    const enrollmentObj = resBody?.enrollment;
    const studentLabel = enrollmentObj?.firstName
      ? `${enrollmentObj.firstName} ${enrollmentObj.familyName || ""}`.trim() + (enrollmentObj.studentNumber ? ` (${enrollmentObj.studentNumber})` : "")
      : targetId ? `Enrollment #${targetId}` : "enrollment";

    if (cleanPath.endsWith("/verify")) {
      action = "ENROLLMENT_VERIFIED";
      severity = isErrorStatus ? "warning" : "info";
      description = isErrorStatus
        ? `${actorLabel} could not verify ${studentLabel} (${errMsg})`
        : `${actorLabel} verified enrollment application for ${studentLabel}`;
    } else if (cleanPath.endsWith("/approve")) {
      action = "ENROLLMENT_APPROVED";
      severity = isErrorStatus ? "warning" : "success";
      const secAssigned = resBody?.sectionAssignment?.section?.code || enrollmentObj?.sectionName;
      description = isErrorStatus
        ? `${actorLabel} could not approve ${studentLabel} (${errMsg})`
        : `${actorLabel} approved enrollment for ${studentLabel}${secAssigned ? ` and assigned to section ${secAssigned}` : ""}`;
    } else if (cleanPath.endsWith("/bulk-approve")) {
      action = "BULK_ENROLLMENT_APPROVED";
      severity = isErrorStatus ? "warning" : "success";
      description = isErrorStatus
        ? `${actorLabel} failed bulk enrollment approval (${errMsg})`
        : `${actorLabel} bulk-approved ${resBody?.count ?? 0} verified enrollment(s)`;
    } else if (cleanPath.endsWith("/return")) {
      action = "ENROLLMENT_RETURNED";
      severity = "warning";
      description = isErrorStatus
        ? `${actorLabel} failed to return ${studentLabel} (${errMsg})`
        : `${actorLabel} returned enrollment for ${studentLabel} with remarks: "${reqBody?.remarks || "Needs correction"}"`;
    } else if (cleanPath.endsWith("/reject")) {
      action = "ENROLLMENT_REJECTED";
      severity = "warning";
      description = isErrorStatus
        ? `${actorLabel} failed to reject ${studentLabel} (${errMsg})`
        : `${actorLabel} rejected enrollment for ${studentLabel} (Reason: "${reqBody?.comment || "Rejected"}")`;
    } else if (cleanPath.endsWith("/life-status")) {
      action = "LIFE_STATUS_UPDATED";
      severity = ["dropped", "transferred_out", "retained"].includes(reqBody?.lifeStatus) ? "warning" : "info";
      description = isErrorStatus
        ? `${actorLabel} failed to update life status for ${studentLabel} (${errMsg})`
        : `${actorLabel} updated student life status of ${studentLabel} to "${reqBody?.lifeStatus}" (Reason: "${reqBody?.reason || "N/A"}")`;
    } else if (cleanPath.endsWith("/assign-section")) {
      category = "section";
      action = method === "DELETE" ? "SECTION_REMOVED" : "SECTION_ASSIGNED";
      severity = isErrorStatus ? "warning" : "success";
      description = method === "DELETE"
        ? `${actorLabel} removed ${studentLabel} from their assigned section`
        : `${actorLabel} assigned ${studentLabel} to section ${resBody?.section?.code || reqBody?.sectionId || ""}`;
    } else if (cleanPath.endsWith("/submit")) {
      action = "ENROLLMENT_SUBMITTED";
      severity = isErrorStatus ? "warning" : "success";
      description = isErrorStatus
        ? `${actorLabel} failed to submit enrollment #${targetId} (${errMsg})`
        : `${actorLabel} submitted enrollment application for ${studentLabel} (${enrollmentObj?.educationLevel || ""} ${enrollmentObj?.gradeLevel || ""})`;
    } else if (cleanPath.endsWith("/resubmit")) {
      action = "ENROLLMENT_RESUBMITTED";
      severity = isErrorStatus ? "warning" : "success";
      description = isErrorStatus
        ? `${actorLabel} failed to resubmit enrollment #${targetId} (${errMsg})`
        : `${actorLabel} resubmitted returned enrollment application for ${studentLabel}`;
    } else if (cleanPath.includes("/documents")) {
      action = method === "DELETE" ? "DOCUMENT_DELETED" : "DOCUMENT_UPLOADED";
      severity = isErrorStatus ? "warning" : "info";
      const docCount = Array.isArray(resBody?.documents) ? resBody.documents.length : 1;
      description = method === "DELETE"
        ? `${actorLabel} removed a credential document from Enrollment #${targetId}`
        : `${actorLabel} uploaded ${docCount} credential document(s) for Enrollment #${targetId}`;
    } else if (cleanPath.endsWith("/bulk-export")) {
      action = "BULK_PDF_EXPORT";
      severity = "info";
      description = `${actorLabel} exported ${reqBody?.ids?.length || 0} enrollment PDF(s) as a ZIP archive`;
    } else if (method === "POST" && cleanPath === "/api/enrollments") {
      action = "ENROLLMENT_DRAFT_SAVED";
      severity = isErrorStatus ? "warning" : "info";
      description = isErrorStatus
        ? `${actorLabel} failed to save enrollment draft (${errMsg})`
        : `${actorLabel} created/saved enrollment draft for ${reqBody?.firstName || ""} ${reqBody?.familyName || ""} (${reqBody?.educationLevel || ""} ${reqBody?.gradeLevel || ""})`;
    } else if (cleanPath.endsWith("/profile-sections")) {
      action = "STUDENT_PROFILE_SECTIONS_UPDATED";
      severity = isErrorStatus ? "warning" : "success";
      description = isErrorStatus
        ? `${actorLabel} failed to update Personal/Family profile sections (${errMsg})`
        : `${actorLabel} updated their Personal / Family profile information for ${studentLabel}`;
    } else if (method === "PUT" && idMatch) {
      action = "ENROLLMENT_UPDATED";
      severity = isErrorStatus ? "warning" : "info";
      description = `${actorLabel} updated enrollment details for ${studentLabel}`;
    } else if (method === "DELETE" && idMatch) {
      action = "ENROLLMENT_DELETED";
      severity = "warning";
      description = `${actorLabel} deleted Enrollment #${targetId}`;
    }
  }

  // ── 4. SECTION MANAGEMENT ────────────────────────────────────────────────────
  else if (cleanPath.includes("/sections")) {
    category = "section";
    targetType = "section";
    const secMatch = cleanPath.match(/\/sections\/(\d+)/);
    targetId = secMatch ? secMatch[1] : (resBody?.id ? String(resBody.id) : null);

    if (cleanPath.endsWith("/auto-assign")) {
      action = "SECTION_AUTO_ASSIGN_ALL";
      severity = isErrorStatus ? "warning" : "success";
      description = `${actorLabel} triggered automatic section assignment for unassigned students`;
    } else if (cleanPath.endsWith("/assign-teacher")) {
      action = "ADVISER_ASSIGNED";
      severity = isErrorStatus ? "warning" : "success";
      description = `${actorLabel} assigned section adviser for Section #${targetId}`;
    } else if (cleanPath.endsWith("/subject-teachers")) {
      action = "SUBJECT_TEACHER_UPDATED";
      severity = isErrorStatus ? "warning" : "success";
      description = `${actorLabel} updated instructor/schedule for subject ${reqBody?.subjectCode || ""} in Section #${targetId}`;
    } else if (cleanPath.includes("/students/")) {
      const stuMatch = cleanPath.match(/\/students\/(\d+)/);
      targetType = "enrollment";
      targetId = stuMatch ? stuMatch[1] : targetId;
      action = method === "DELETE" ? "SECTION_STUDENT_REMOVED" : "SECTION_STUDENT_MOVED";
      severity = isErrorStatus ? "warning" : "info";
      description = method === "DELETE"
        ? `${actorLabel} removed Enrollment #${targetId} from their section`
        : `${actorLabel} assigned/moved Enrollment #${targetId} to Section #${reqBody?.sectionId || ""}`;
    } else if (method === "POST") {
      action = "SECTION_CREATED";
      severity = isErrorStatus ? "warning" : "success";
      description = isErrorStatus
        ? `${actorLabel} failed to create section "${reqBody?.code || ""}" (${errMsg})`
        : `${actorLabel} created section "${resBody?.code || reqBody?.code}" (${reqBody?.course || ""} Grade ${reqBody?.yearLevel || ""}, Cap: ${reqBody?.capacity || 40})`;
    } else if (method === "PUT") {
      action = "SECTION_UPDATED";
      severity = isErrorStatus ? "warning" : "info";
      description = `${actorLabel} updated section "${resBody?.code || reqBody?.code || `#${targetId}`}"`;
    } else if (method === "DELETE") {
      action = "SECTION_DELETED";
      severity = "warning";
      description = `${actorLabel} deactivated/deleted Section #${targetId}`;
    }
  }

  // ── 5. CLASS SCHEDULES ───────────────────────────────────────────────────────
  else if (cleanPath.startsWith("/api/academic/schedules")) {
    category = "schedule";
    targetType = "schedule";
    const idMatch = cleanPath.match(/\/schedules\/(\d+)/);
    targetId = idMatch ? idMatch[1] : (resBody?.schedule?.id ? String(resBody.schedule.id) : null);

    if (method === "POST") {
      action = isErrorStatus ? "SCHEDULE_CONFLICT_OR_ERROR" : "SCHEDULE_CREATED";
      severity = isErrorStatus ? "warning" : "success";
      description = isErrorStatus
        ? `${actorLabel} encountered a schedule conflict/error for ${reqBody?.sectionName || "section"} (${errMsg})`
        : `${actorLabel} scheduled "${reqBody?.subjectName}" for ${reqBody?.sectionName} (${reqBody?.startTime}–${reqBody?.endTime}, Teacher: ${reqBody?.teacherName || "N/A"})`;
    } else if (method === "DELETE") {
      action = "SCHEDULE_DELETED";
      severity = "warning";
      description = `${actorLabel} deleted class schedule entry #${targetId}`;
    }
  }

  // ── 6. GRADING & TEACHER GRADE ENTRY ─────────────────────────────────────────
  else if (cleanPath.includes("/grading-periods") || cleanPath.startsWith("/api/teacher/grades")) {
    category = "grading";
    if (cleanPath.startsWith("/api/teacher/grades")) {
      targetType = "enrollment_subject";
      const idMatch = cleanPath.match(/\/grades\/(\d+)/);
      targetId = idMatch ? idMatch[1] : null;
      action = "GRADE_SAVED";
      severity = isErrorStatus ? "warning" : "success";
      description = isErrorStatus
        ? `${actorLabel} failed to save ${reqBody?.quarter || ""} grade (${errMsg})`
        : `Teacher ${actorLabel} recorded ${reqBody?.quarter || "quarter"} grade (${reqBody?.grade ?? "cleared"}) for student subject record #${targetId}`;
    } else {
      targetType = "grading_period";
      const idMatch = cleanPath.match(/\/grading-periods\/(\d+)/);
      targetId = idMatch ? idMatch[1] : null;
      if (cleanPath.endsWith("/setup")) {
        action = "GRADING_PERIODS_INITIALIZED";
        severity = "info";
        description = `${actorLabel} initialized grading periods (Q1–Q3) for school year ${reqBody?.schoolYear || "active year"}`;
      } else if (cleanPath.endsWith("/open")) {
        action = "GRADING_PERIOD_OPENED";
        severity = "success";
        description = `${actorLabel} opened grading period ${resBody?.period?.quarter || `#${targetId}`} (${resBody?.period?.schoolYear || ""}) for teacher grade entry`;
      } else if (cleanPath.endsWith("/close")) {
        action = "GRADING_PERIOD_CLOSED";
        severity = "warning";
        description = `${actorLabel} closed and locked grading period ${resBody?.period?.quarter || `#${targetId}`} (${resBody?.period?.schoolYear || ""})`;
      }
    }
  }

  // ── 7. USER MANAGEMENT (ADMIN) ───────────────────────────────────────────────
  else if (cleanPath.startsWith("/api/admin/users")) {
    category = "user_management";
    targetType = "user";
    const idMatch = cleanPath.match(/\/users\/(\d+)/);
    targetId = idMatch ? idMatch[1] : (resBody?.id ? String(resBody.id) : null);

    if (cleanPath.endsWith("/create")) {
      action = "USER_CREATED";
      severity = isErrorStatus ? "warning" : "success";
      description = isErrorStatus
        ? `${actorLabel} failed to create staff account for "${reqBody?.email || ""}" (${errMsg})`
        : `${actorLabel} created new ${reqBody?.role || "staff"} account for ${reqBody?.name || reqBody?.email}`;
    } else if (cleanPath.endsWith("/status")) {
      action = "USER_STATUS_TOGGLED";
      severity = resBody?.isActive === false ? "warning" : "info";
      description = resBody?.message || `${actorLabel} toggled account status for User #${targetId}`;
    } else if (cleanPath.endsWith("/reset-password")) {
      action = "USER_PASSWORD_RESET";
      severity = "warning";
      description = resBody?.message || `${actorLabel} reset password for User #${targetId}`;
    } else if (method === "PUT") {
      action = "USER_UPDATED";
      severity = isErrorStatus ? "warning" : "info";
      description = `${actorLabel} updated user account ${resBody?.name || reqBody?.name || `#${targetId}`} (Role: ${resBody?.role || reqBody?.role || "unchanged"})`;
    } else if (method === "DELETE") {
      action = "USER_DELETED";
      severity = "warning";
      description = isErrorStatus
        ? `${actorLabel} failed to delete User #${targetId} (${errMsg})`
        : `${actorLabel} permanently deleted user account #${targetId}`;
    }
  }

  // ── 8. ACADEMIC SETUP (SUBJECTS & SCHOOL YEARS) ──────────────────────────────
  else if (cleanPath.startsWith("/api/admin/academic")) {
    category = "academic";
    if (cleanPath.includes("/subjects")) {
      targetType = "subject";
      const idMatch = cleanPath.match(/\/subjects\/(\d+)/);
      targetId = idMatch ? idMatch[1] : (resBody?.code || reqBody?.code || null);
      if (method === "POST") {
        action = "SUBJECT_CREATED";
        severity = isErrorStatus ? "warning" : "success";
        description = `${actorLabel} added curriculum subject "${reqBody?.code || ""} — ${reqBody?.description || ""}" (${reqBody?.programCode || ""} Grade ${reqBody?.gradeLevel || ""})`;
      } else if (method === "PUT") {
        action = "SUBJECT_UPDATED";
        severity = "info";
        description = `${actorLabel} updated curriculum subject "${resBody?.code || reqBody?.code || `#${targetId}`}"`;
      } else if (method === "DELETE") {
        action = "SUBJECT_DELETED";
        severity = "warning";
        description = `${actorLabel} deactivated curriculum subject #${targetId}`;
      }
    } else if (cleanPath.includes("/school-years") || cleanPath.includes("/close-school-year")) {
      targetType = "school_year";
      const idMatch = cleanPath.match(/\/school-years\/(\d+)/);
      targetId = idMatch ? idMatch[1] : (reqBody?.year || null);
      if (cleanPath.endsWith("/close-school-year")) {
        action = "SCHOOL_YEAR_CLOSED";
        severity = "warning";
        description = `${actorLabel} closed the active school year (${resBody?.completed ?? 0} student record(s) marked as completed)`;
      } else if (cleanPath.endsWith("/activate")) {
        action = "SCHOOL_YEAR_ACTIVATED";
        severity = "success";
        description = `${actorLabel} activated School Year #${targetId}`;
      } else if (method === "POST") {
        action = "SCHOOL_YEAR_CREATED";
        severity = isErrorStatus ? "warning" : "success";
        description = `${actorLabel} created School Year "${reqBody?.year || ""}"`;
      }
    }
  }

  // ── 9. CAMPUS BUILDINGS, FAQS, & SYSTEM SETTINGS ─────────────────────────────
  else if (cleanPath.includes("/buildings")) {
    category = "system_settings";
    targetType = "building";
    const idMatch = cleanPath.match(/\/buildings\/(\d+)/);
    targetId = idMatch ? idMatch[1] : (resBody?.id ? String(resBody.id) : null);
    if (cleanPath.includes("/voiceover")) {
      action = cleanPath.endsWith("/publish") ? "VOICEOVER_PUBLISHED" : "VOICEOVER_GENERATED";
      severity = isErrorStatus ? "warning" : "info";
      description = `${actorLabel} ${cleanPath.endsWith("/publish") ? "published" : "generated"} 360° narration voiceover for Building #${targetId}`;
    } else if (method === "POST") {
      action = "BUILDING_CREATED";
      severity = "success";
      description = `${actorLabel} added campus building "${resBody?.name || reqBody?.name || ""}"`;
    } else if (method === "PUT") {
      action = "BUILDING_UPDATED";
      severity = "info";
      description = `${actorLabel} updated campus building "${resBody?.name || reqBody?.name || `#${targetId}`}"`;
    } else if (method === "DELETE") {
      action = "BUILDING_DELETED";
      severity = "warning";
      description = `${actorLabel} removed campus building #${targetId}`;
    }
  } else if (cleanPath.includes("/faqs")) {
    category = "system_settings";
    targetType = "faq";
    const idMatch = cleanPath.match(/\/faqs\/(\d+)/);
    targetId = idMatch ? idMatch[1] : (resBody?.id ? String(resBody.id) : null);
    action = method === "POST" ? "FAQ_CREATED" : method === "PUT" ? "FAQ_UPDATED" : "FAQ_DELETED";
    severity = method === "DELETE" ? "warning" : "info";
    description = `${actorLabel} ${method === "POST" ? "created" : method === "PUT" ? "updated" : "deleted"} chatbot FAQ ${reqBody?.question ? `"${reqBody.question.slice(0, 60)}"` : `#${targetId}`}`;
  } else if (cleanPath.includes("/admission-settings")) {
    category = "system_settings";
    targetType = "settings";
    targetId = "admission_policy";
    action = "ADMISSION_SETTINGS_UPDATED";
    severity = isErrorStatus ? "warning" : "info";
    description = `${actorLabel} updated school admission policy & document requirements (Revision #${resBody?.revision || ""})`;
  } else if (cleanPath.includes("/school-profile")) {
    category = "system_settings";
    targetType = "settings";
    targetId = "school_profile";
    action = "SCHOOL_PROFILE_UPDATED";
    severity = isErrorStatus ? "warning" : "info";
    description = `${actorLabel} updated School Profile & Contact Information`;
  } else if (cleanPath.includes("/enrollment-guide")) {
    category = "system_settings";
    targetType = "settings";
    targetId = "enrollment_guide";
    action = "ENROLLMENT_GUIDE_UPDATED";
    severity = isErrorStatus ? "warning" : "info";
    description = `${actorLabel} updated the Public Enrollment Guide`;
  }

  return {
    category,
    action,
    severity,
    description,
    targetType,
    targetId: targetId ? String(targetId) : null,
    details: JSON.stringify(
      sanitizePayload({
        request: reqBody && Object.keys(reqBody).length ? reqBody : undefined,
        response: resBody && typeof resBody === "object"
          ? {
              message: resBody.message,
              error: resBody.error,
              status: resBody.enrollment?.status,
              studentNumber: resBody.enrollment?.studentNumber,
              section: resBody.sectionAssignment?.section?.code || resBody.section?.code || resBody.enrollment?.sectionName,
              sscResult: resBody.sscResult,
              sscClass: resBody.sscClass,
            }
          : undefined,
      })
    ),
  };
}

/**
 * Resolve actor details from req.user, Authorization header, or login response body
 */
async function resolveActor(req, resBody) {
  if (req.user) {
    let email = req.user.email || null;
    let name = req.user.name || null;
    let role = req.user.role || "student";
    if ((!email || !name) && req.user.id) {
      try {
        const dbUser = await User.findByPk(req.user.id, { attributes: ["id", "name", "email", "role"] });
        if (dbUser) {
          email = email || dbUser.email;
          name = name || dbUser.name;
          role = req.user.role || dbUser.role || "student";
        }
      } catch (_) {}
    }
    return {
      id: req.user.id || null,
      name: name || email || "User",
      email,
      role,
    };
  }
  if (resBody?.user && typeof resBody.user === "object") {
    return {
      id: resBody.user.id || null,
      name: resBody.user.name || resBody.user.email || "User",
      email: resBody.user.email || null,
      role: resBody.user.role || "student",
    };
  }
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET);
      const uid = decoded?.id || decoded?.userId;
      if (uid) {
        const dbUser = await User.findByPk(uid, { attributes: ["id", "name", "email", "role"] });
        if (dbUser) {
          return {
            id: dbUser.id,
            name: dbUser.name || dbUser.email,
            email: dbUser.email,
            role: dbUser.role || "student",
          };
        }
        if (decoded.email) {
          return {
            id: uid,
            name: decoded.name || decoded.email,
            email: decoded.email,
            role: decoded.role || "student",
          };
        }
      }
    } catch (_) {}
  }
  if (req.session?.userId) {
    try {
      const dbUser = await User.findByPk(req.session.userId, { attributes: ["id", "name", "email", "role"] });
      if (dbUser) {
        return {
          id: dbUser.id,
          name: dbUser.name || dbUser.email,
          email: dbUser.email,
          role: dbUser.role || "student",
        };
      }
    } catch (_) {}
  }
  if (req.body?.email) {
    return {
      id: null,
      name: req.body.name || req.body.email,
      email: req.body.email,
      role: "guest",
    };
  }
  return {
    id: null,
    name: "System / Guest",
    email: null,
    role: "guest",
  };
}

/**
 * Express middleware that automatically records state-changing API requests into system_logs
 */
export function auditLoggerMiddleware(req, res, next) {
  const method = req.method?.toUpperCase();
  const urlPath = (req.originalUrl || req.url || "").split("?")[0];

  // Only audit mutating API calls; skip public chat messages to avoid noise
  const shouldAudit =
    ["POST", "PUT", "PATCH", "DELETE"].includes(method) &&
    urlPath.startsWith("/api/") &&
    !urlPath.startsWith("/api/chat/");

  if (!shouldAudit) return next();

  let capturedBody = null;
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    capturedBody = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    (async () => {
      try {
        const actor = await resolveActor(req, capturedBody);
        const classified = classifyAuditEvent({
          method,
          path: urlPath,
          statusCode: res.statusCode,
          reqBody: req.body || {},
          resBody: capturedBody || {},
          actor,
        });

        await SystemLog.create({
          userId: actor.id,
          userName: actor.name,
          userEmail: actor.email,
          userRole: actor.role,
          category: classified.category,
          action: classified.action,
          severity: classified.severity,
          description: classified.description,
          targetType: classified.targetType,
          targetId: classified.targetId,
          ipAddress: extractClientIp(req),
          method,
          endpoint: urlPath,
          statusCode: res.statusCode,
          details: classified.details,
        });
      } catch (err) {
        console.warn("SystemLog write warning:", err.message);
      }
    })();
  });

  next();
}

/**
 * Repair any existing system_logs rows that have a blank/null userEmail by resolving
 * from the linked user account, enrollment record, or active Registrar/Admin account.
 */
async function repairBlankLogEmails(users, userMap, nameMap, defaultAdmin, defaultRegistrar) {
  try {
    const [blankLogs] = await sequelize.query(
      `SELECT id, userId, userName, userRole, targetType, targetId, details
       FROM system_logs
       WHERE userEmail IS NULL OR TRIM(userEmail) = ''`
    ).catch(() => [[]]);

    if (!blankLogs || blankLogs.length === 0) return;

    for (const log of blankLogs) {
      let resolvedEmail = null;
      let resolvedName = log.userName;
      let resolvedId = log.userId;

      // 1. Check by userId
      if (log.userId && userMap.has(Number(log.userId))) {
        const u = userMap.get(Number(log.userId));
        resolvedEmail = u.email;
        if (!resolvedName || ["Registrar", "Registrar / Admin", "Admin / Registrar", "User"].includes(resolvedName)) {
          resolvedName = u.name || u.email;
        }
      }

      // 2. Check by exact userName match
      if (!resolvedEmail && log.userName && nameMap.has(log.userName.trim().toLowerCase())) {
        const u = nameMap.get(log.userName.trim().toLowerCase());
        resolvedEmail = u.email;
        resolvedId = resolvedId || u.id;
      }

      // 2b. If target is an enrollment, check the enrollment's userId
      if (!resolvedEmail && log.targetType === "enrollment" && log.targetId) {
        try {
          const [[er]] = await sequelize.query(
            `SELECT userId, verified_by, approved_by FROM enrollment_records WHERE id = ? LIMIT 1`,
            { replacements: [log.targetId] }
          );
          if (er) {
            const candidateId = log.userRole === "student" ? er.userId : (er.approved_by || er.verified_by);
            if (candidateId && userMap.has(Number(candidateId))) {
              const u = userMap.get(Number(candidateId));
              resolvedEmail = u.email;
              resolvedId = resolvedId || u.id;
            }
          }
        } catch (_) {}
      }

      // 3. Check details JSON for email
      if (!resolvedEmail && log.details) {
        try {
          const parsed = typeof log.details === "string" ? JSON.parse(log.details) : log.details;
          const detailEmail = parsed?.email || parsed?.request?.email || parsed?.response?.email;
          if (detailEmail) resolvedEmail = detailEmail;
        } catch (_) {}
      }

      // 4. Fallback for historical/seeded Registrar or Admin actions
      if (!resolvedEmail) {
        if (log.userRole === "registrar" && defaultRegistrar?.email) {
          resolvedEmail = defaultRegistrar.email;
          resolvedId = resolvedId || defaultRegistrar.id;
          if (!resolvedName || ["Registrar", "Registrar / Admin"].includes(resolvedName)) {
            resolvedName = defaultRegistrar.name || defaultRegistrar.email;
          }
        } else if (log.userRole === "admin" && defaultAdmin?.email) {
          resolvedEmail = defaultAdmin.email;
          resolvedId = resolvedId || defaultAdmin.id;
          if (!resolvedName || ["Admin", "Admin / Registrar", "Registrar / Admin"].includes(resolvedName)) {
            resolvedName = defaultAdmin.name || defaultAdmin.email;
          }
        } else if (defaultAdmin?.email && ["system", "teacher"].includes(log.userRole)) {
          resolvedEmail = defaultAdmin.email;
        }
      }

      if (resolvedEmail) {
        await sequelize.query(
          `UPDATE system_logs SET userEmail = ?, userName = ?, userId = COALESCE(userId, ?) WHERE id = ?`,
          { replacements: [resolvedEmail, resolvedName, resolvedId || null, log.id] }
        ).catch(() => {});
      }
    }
  } catch (err) {
    console.warn("repairBlankLogEmails warning:", err.message);
  }
}

/**
 * Backfill historical events from existing database tables when system_logs is empty
 * so the Admin System Logs page immediately shows full historical context.
 */
export async function backfillSystemLogs() {
  try {
    // Fetch all users so we can map every student, teacher, registrar, and admin
    const [users] = await sequelize.query(
      `SELECT id, name, email, role, isActive, createdAt FROM users ORDER BY id ASC`
    ).catch(() => [[]]);

    const userMap = new Map();
    const nameMap = new Map();
    for (const u of users || []) {
      userMap.set(Number(u.id), u);
      if (u.name) nameMap.set(u.name.trim().toLowerCase(), u);
    }

    const defaultAdmin = (users || []).find((u) => u.role === "admin" && u.email) || {
      id: null,
      name: "System Administrator",
      email: "admin@school.edu.ph",
      role: "admin",
    };
    const defaultRegistrar = (users || []).find((u) => u.role === "registrar" && u.email) || defaultAdmin;

    const existingCount = await SystemLog.count();
    if (existingCount > 0) {
      await repairBlankLogEmails(users || [], userMap, nameMap, defaultAdmin, defaultRegistrar);
      return;
    }

    const entries = [];

    // 1. Existing Users
    for (const u of (users || []).slice(0, 300)) {
      entries.push({
        userId: u.id,
        userName: u.name || u.email,
        userEmail: u.email,
        userRole: u.role || "student",
        category: u.role === "student" ? "auth" : "user_management",
        action: u.role === "student" ? "USER_REGISTER" : "USER_CREATED",
        severity: "info",
        description: u.role === "student"
          ? `Student account registered for ${u.name || u.email}`
          : `Staff account (${u.role}) provisioned for ${u.name || u.email}`,
        targetType: "user",
        targetId: String(u.id),
        ipAddress: "127.0.0.1",
        method: "POST",
        endpoint: u.role === "student" ? "/api/auth/register" : "/api/admin/users/create",
        statusCode: 201,
        details: JSON.stringify({ email: u.email, role: u.role, isActive: Boolean(u.isActive) }),
        createdAt: u.createdAt || new Date(),
        updatedAt: u.createdAt || new Date(),
      });
    }

    // 2. Existing Enrollments (Submissions, Verifications, Approvals, Returns, Rejections, Life Status)
    const [enrollments] = await sequelize.query(
      `SELECT id, userId, firstName, familyName, studentNumber, educationLevel, gradeLevel, strand,
              sectionName, status, lifeStatus, lifeStatusReason, lifeStatusDate, lifeStatusUpdatedBy,
              sscApplied, sscExamDate, sscExamScore, sscResult, sscClass,
              verified_by, verified_at, registrar_remarks,
              approved_by, approved_at, admin_comments,
              academicYear, createdAt, updatedAt
       FROM enrollment_records
       ORDER BY createdAt ASC
       LIMIT 300`
    ).catch(() => [[]]);

    for (const er of enrollments || []) {
      const studentUser = userMap.get(Number(er.userId));
      const studentFullName = `${er.firstName || ""} ${er.familyName || ""}`.trim() || studentUser?.name || `Student #${er.userId}`;
      const studentEmail = studentUser?.email || nameMap.get(studentFullName.toLowerCase())?.email || null;
      const studentTag = er.studentNumber ? `${studentFullName} (${er.studentNumber})` : studentFullName;

      // Submission log
      if (er.status !== "draft") {
        entries.push({
          userId: er.userId || null,
          userName: studentFullName,
          userEmail: studentEmail,
          userRole: "student",
          category: er.sscApplied ? "ssc" : "enrollment",
          action: er.sscApplied && !er.firstName ? "SSC_APPLICATION_SUBMITTED" : "ENROLLMENT_SUBMITTED",
          severity: "info",
          description: er.sscApplied && !er.firstName
            ? `${studentFullName} submitted a Special Science Class (SSC) pre-application`
            : `${studentFullName} submitted an enrollment application for ${er.educationLevel || "JHS"} ${er.gradeLevel || ""} (${er.academicYear || "Active SY"})`,
          targetType: "enrollment",
          targetId: String(er.id),
          ipAddress: "127.0.0.1",
          method: "POST",
          endpoint: `/api/enrollments/${er.id}/submit`,
          statusCode: 200,
          details: JSON.stringify({
            educationLevel: er.educationLevel,
            gradeLevel: er.gradeLevel,
            strand: er.strand,
            academicYear: er.academicYear,
          }),
          createdAt: er.createdAt || new Date(),
          updatedAt: er.createdAt || new Date(),
        });
      }

      // SSC Exam result log
      if (er.sscApplied && er.sscResult) {
        const verifier = userMap.get(Number(er.verified_by)) || defaultRegistrar;
        entries.push({
          userId: verifier.id || er.verified_by || null,
          userName: verifier.name,
          userEmail: verifier.email,
          userRole: verifier.role || "registrar",
          category: "ssc",
          action: "SSC_RESULT_RECORDED",
          severity: er.sscResult === "passed" ? "success" : "info",
          description: `${verifier.name} recorded SSC entrance exam result for ${studentFullName} — Score: ${er.sscExamScore ?? "N/A"} (${er.sscResult.toUpperCase()}, Class: ${er.sscClass || "Regular"})`,
          targetType: "enrollment",
          targetId: String(er.id),
          ipAddress: "127.0.0.1",
          method: "PUT",
          endpoint: `/api/registrar/enrollments/${er.id}/ssc-result`,
          statusCode: 200,
          details: JSON.stringify({ sscExamScore: er.sscExamScore, sscResult: er.sscResult, sscClass: er.sscClass }),
          createdAt: er.verified_at || er.updatedAt || new Date(),
          updatedAt: er.verified_at || er.updatedAt || new Date(),
        });
      }

      // Verification or Return log
      if (er.verified_at || er.status === "verified" || er.status === "returned") {
        const verifier = userMap.get(Number(er.verified_by)) || defaultRegistrar;
        const isReturned = er.status === "returned";
        entries.push({
          userId: verifier.id || er.verified_by || null,
          userName: verifier.name,
          userEmail: verifier.email,
          userRole: verifier.role || "registrar",
          category: "enrollment",
          action: isReturned ? "ENROLLMENT_RETURNED" : "ENROLLMENT_VERIFIED",
          severity: isReturned ? "warning" : "info",
          description: isReturned
            ? `${verifier.name} returned enrollment application for ${studentTag} with remarks: "${er.registrar_remarks || "Please review credentials"}"`
            : `${verifier.name} verified enrollment documents and details for ${studentTag}`,
          targetType: "enrollment",
          targetId: String(er.id),
          ipAddress: "127.0.0.1",
          method: "POST",
          endpoint: `/api/registrar/enrollments/${er.id}/${isReturned ? "return" : "verify"}`,
          statusCode: 200,
          details: JSON.stringify({ remarks: er.registrar_remarks, status: er.status }),
          createdAt: er.verified_at || er.updatedAt || new Date(),
          updatedAt: er.verified_at || er.updatedAt || new Date(),
        });
      }

      // Approval or Rejection log
      if (er.approved_at || ["approved", "enrolled", "active", "completed", "rejected"].includes(er.status)) {
        const approver = userMap.get(Number(er.approved_by)) || userMap.get(Number(er.verified_by)) || defaultRegistrar;
        const isRejected = er.status === "rejected";
        entries.push({
          userId: approver.id || er.approved_by || null,
          userName: approver.name,
          userEmail: approver.email,
          userRole: approver.role || "registrar",
          category: "enrollment",
          action: isRejected ? "ENROLLMENT_REJECTED" : "ENROLLMENT_APPROVED",
          severity: isRejected ? "warning" : "success",
          description: isRejected
            ? `${approver.name} rejected enrollment application for ${studentTag} (${er.admin_comments || "Rejected"})`
            : `${approver.name} approved enrollment for ${studentTag}${er.sectionName ? ` and assigned to section ${er.sectionName}` : ""}`,
          targetType: "enrollment",
          targetId: String(er.id),
          ipAddress: "127.0.0.1",
          method: "POST",
          endpoint: `/api/registrar/enrollments/${er.id}/${isRejected ? "reject" : "approve"}`,
          statusCode: 200,
          details: JSON.stringify({
            studentNumber: er.studentNumber,
            sectionName: er.sectionName,
            status: er.status,
            comments: er.admin_comments || er.registrar_remarks,
          }),
          createdAt: er.approved_at || er.updatedAt || new Date(),
          updatedAt: er.approved_at || er.updatedAt || new Date(),
        });
      }

      // Life Status update log (dropped / transferred_out / retained)
      if (["dropped", "transferred_out", "retained"].includes(er.lifeStatus)) {
        const staff = userMap.get(Number(er.lifeStatusUpdatedBy)) || defaultRegistrar;
        entries.push({
          userId: staff.id || er.lifeStatusUpdatedBy || null,
          userName: staff.name,
          userEmail: staff.email,
          userRole: staff.role || "registrar",
          category: "enrollment",
          action: "LIFE_STATUS_UPDATED",
          severity: "warning",
          description: `${staff.name} updated life status of ${studentTag} to "${er.lifeStatus}" (Reason: "${er.lifeStatusReason || "Recorded"}")`,
          targetType: "enrollment",
          targetId: String(er.id),
          ipAddress: "127.0.0.1",
          method: "PUT",
          endpoint: `/api/registrar/enrollments/${er.id}/life-status`,
          statusCode: 200,
          details: JSON.stringify({
            lifeStatus: er.lifeStatus,
            reason: er.lifeStatusReason,
            date: er.lifeStatusDate,
          }),
          createdAt: er.updatedAt || new Date(),
          updatedAt: er.updatedAt || new Date(),
        });
      }
    }

    // 3. Existing Sections
    const [sections] = await sequelize.query(
      `SELECT id, code, course, yearLevel, strand, schoolYear, capacity, instructor, createdAt FROM sections WHERE isActive = 1 LIMIT 100`
    ).catch(() => [[]]);

    for (const sec of sections || []) {
      entries.push({
        userId: defaultAdmin.id || null,
        userName: defaultAdmin.name,
        userEmail: defaultAdmin.email,
        userRole: defaultAdmin.role || "admin",
        category: "section",
        action: "SECTION_CREATED",
        severity: "info",
        description: `Created section "${sec.code}" for ${sec.course} Grade ${sec.yearLevel}${sec.strand ? ` (${sec.strand})` : ""} — School Year ${sec.schoolYear}`,
        targetType: "section",
        targetId: String(sec.id),
        ipAddress: "127.0.0.1",
        method: "POST",
        endpoint: "/api/admin/sections",
        statusCode: 201,
        details: JSON.stringify({
          code: sec.code,
          course: sec.course,
          yearLevel: sec.yearLevel,
          strand: sec.strand,
          capacity: sec.capacity,
          adviser: sec.instructor,
        }),
        createdAt: sec.createdAt || new Date(),
        updatedAt: sec.createdAt || new Date(),
      });
    }

    if (entries.length > 0) {
      await SystemLog.bulkCreate(entries);
    }
  } catch (err) {
    console.warn("SystemLog backfill warning:", err.message);
  }
}

