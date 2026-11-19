import crypto from "node:crypto";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

function createTransporter() {
  const pass = process.env.EMAIL_PASSWORD?.replace(/\s+/g, "");
  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : port === 465;
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      pool: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass,
      },
    });
  }

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    pool: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass,
    },
  });
}

const transporter = createTransporter();

const SCHOOL_NAME = "Eastern Mindoro College, Inc.";
const SCHOOL_ADDRESS = "Vicente Ylagan St., Bagong Bayan II, Bongabong, Oriental Mindoro 5211";
const SCHOOL_CONTACT_EMAIL = process.env.SCHOOL_CONTACT_EMAIL || "emc_1945@yahoo.com";

function getFromAddress() {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  if (process.env.EMAIL_USER) return `"GabAI - Eastern Mindoro College" <${process.env.EMAIL_USER}>`;
  return undefined;
}

function getReplyToAddress() {
  return process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER || SCHOOL_CONTACT_EMAIL;
}

function getBaseUrl() {
  return (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtmlToText(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|tr|li)>/gi, "\n")
    .replace(/<\/td>\s*<td[^>]*>/gi, ": ")
    .replace(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&bull;/g, "-")
    .replace(/&mdash;/g, "-")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Shared HTML wrapper ───────────────────────────────────────────────────────
function wrap(title, body, preheader = "") {
  const safeTitle = escapeHtml(title);
  const safePreheader = escapeHtml(preheader || title);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f0;font-family:Arial,Helvetica,sans-serif;color:#333333;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${safePreheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f0;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:10px;border:1px solid #e5e7eb;">
          <tr>
            <td style="background-color:#001840;padding:24px 32px;text-align:center;border-radius:10px 10px 0 0;">
              <h1 style="color:#F5C400;margin:0;font-size:22px;font-weight:bold;">GabAI</h1>
              <p style="color:#FFDC5F;margin:4px 0 0;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;">${SCHOOL_NAME}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <h2 style="color:#001840;margin:0 0 16px;font-size:18px;line-height:1.3;">${safeTitle}</h2>
              ${body}
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9f9f5;padding:18px 32px;border-top:1px solid #e5e7eb;text-align:center;border-radius:0 0 10px 10px;">
              <p style="color:#666666;font-size:12px;margin:0;">${SCHOOL_NAME} &bull; ${SCHOOL_ADDRESS}</p>
              <p style="color:#888888;font-size:11px;margin:6px 0 0;">You received this notification because you have an account on the GabAI Student Portal. For assistance, contact ${escapeHtml(SCHOOL_CONTACT_EMAIL)}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(text, url) {
  const safeUrl = escapeHtml(url);
  const safeText = escapeHtml(text);
  return `
    <p style="margin:20px 0;">
      <a href="${safeUrl}" style="display:inline-block;background-color:#102A71;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">${safeText}</a>
    </p>
    <p style="color:#666666;font-size:12px;line-height:1.5;margin:0 0 16px;word-break:break-all;">
      Portal link: <a href="${safeUrl}" style="color:#102A71;text-decoration:underline;">${safeUrl}</a>
    </p>`;
}

function info(label, value) {
  return `<tr><td style="padding:6px 10px;color:#555555;font-size:13px;width:150px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 10px;color:#001840;font-size:13px;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td></tr>`;
}

function buildText(title, lines) {
  return [
    `GabAI - ${SCHOOL_NAME}`,
    title,
    "=".repeat(Math.min(title.length, 60)),
    "",
    ...lines.filter((line) => line !== null && line !== undefined),
    "",
    "--",
    SCHOOL_NAME,
    SCHOOL_ADDRESS,
    `Support: ${SCHOOL_CONTACT_EMAIL}`,
  ].join("\n");
}

// ── Send helper ───────────────────────────────────────────────────────────────
async function send(to, subject, html, text) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn("[Email] Skipped — EMAIL_USER or EMAIL_PASSWORD not set");
    return false;
  }
  if (!to) {
    console.warn(`[Email] Skipped "${subject}" — recipient address missing`);
    return false;
  }
  try {
    await transporter.sendMail({
      from: getFromAddress(),
      replyTo: getReplyToAddress(),
      to,
      subject,
      text: text || stripHtmlToText(html),
      html,
      headers: {
        "Auto-Submitted": "auto-generated",
        "X-Auto-Response-Suppress": "OOF, AutoReply",
        "X-Entity-Ref-ID": crypto.randomUUID(),
      },
    });
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send "${subject}" to ${to}:`, err.message);
    return false;
  }
}

// ── Email templates ───────────────────────────────────────────────────────────

// 1. Password Reset
export async function sendPasswordResetEmail(user, resetUrl) {
  const name = escapeHtml(user.name || "Student");
  const body = `
    <p style="color:#333333;font-size:14px;line-height:1.6;">Hello <strong>${name}</strong>,</p>
    <p style="color:#333333;font-size:14px;line-height:1.6;">We received a request to reset the password for your GabAI Student Portal account.</p>
    ${btn("Reset Password", resetUrl)}
    <p style="color:#333333;font-size:14px;line-height:1.6;">This link expires in 30 minutes and can only be used once. Requesting another link replaces this one.</p>
    <p style="color:#666666;font-size:12px;">If you did not request a password reset, you can safely ignore this message and your password will remain unchanged.</p>`;
  const text = buildText("Password Reset Request", [
    `Hello ${user.name || "Student"},`,
    "",
    "We received a request to reset the password for your GabAI Student Portal account.",
    `Reset Password: ${resetUrl}`,
    "",
    "This link expires in 30 minutes and can only be used once. Requesting another link replaces this one.",
    "If you did not request a password reset, you can safely ignore this message.",
  ]);
  return send(
    user.email,
    "Password Reset Request - GabAI EMC",
    wrap("Password Reset", body, "Use this link to reset your GabAI portal password."),
    text
  );
}

// 2. Welcome / Account Created
export async function sendWelcomeEmail(user) {
  const loginUrl = `${getBaseUrl()}/login`;
  const body = `
    <p style="color:#333333;font-size:14px;line-height:1.6;">Hello <strong>${escapeHtml(user.name)}</strong>,</p>
    <p style="color:#333333;font-size:14px;line-height:1.6;">Your GabAI Student Portal account for ${SCHOOL_NAME} is now active. You can sign in to begin your online enrollment application.</p>
    ${btn("Open Student Portal", loginUrl)}
    <p style="color:#666666;font-size:12px;margin-top:20px;">If you did not create this account, please contact ${escapeHtml(SCHOOL_CONTACT_EMAIL)}.</p>`;
  const text = buildText("Account Created", [
    `Hello ${user.name},`,
    "",
    `Your GabAI Student Portal account for ${SCHOOL_NAME} is now active. You can sign in to begin your online enrollment application.`,
    `Student Portal: ${loginUrl}`,
    "",
    `If you did not create this account, please contact ${SCHOOL_CONTACT_EMAIL}.`,
  ]);
  return send(
    user.email,
    "Welcome to GabAI - Eastern Mindoro College",
    wrap("Account Created", body, "Your GabAI Student Portal account is now active."),
    text
  );
}

// 3. Enrollment Submitted
export async function sendEnrollmentSubmittedEmail(user, enrollment) {
  const recipientName = user.name || enrollment.firstName || "Student";
  const detailUrl = `${getBaseUrl()}/enrollment/${enrollment.id}`;
  const courseOrGrade = enrollment.course || enrollment.gradeLevel || "—";
  const body = `
    <p style="color:#333333;font-size:14px;line-height:1.6;">Hello <strong>${escapeHtml(recipientName)}</strong>,</p>
    <p style="color:#333333;font-size:14px;line-height:1.6;">Your enrollment application has been submitted and is now under review by the Office of the Registrar.</p>
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0;background-color:#f9f9f5;border-radius:8px;">
      ${info("Enrollment ID", `#${enrollment.id}`)}
      ${info("Level", enrollment.educationLevel || "—")}
      ${info("Course / Grade", courseOrGrade)}
      ${info("Status", "Submitted - Awaiting Review")}
    </table>
    ${btn("View Enrollment Status", detailUrl)}
    <p style="color:#666666;font-size:12px;">You will receive an email update once the Registrar finishes reviewing your documents.</p>`;
  const text = buildText("Enrollment Received", [
    `Hello ${recipientName},`,
    "",
    "Your enrollment application has been submitted and is now under review by the Office of the Registrar.",
    `Enrollment ID: #${enrollment.id}`,
    `Level: ${enrollment.educationLevel || "-"}`,
    `Course / Grade: ${courseOrGrade}`,
    "Status: Submitted - Awaiting Review",
    "",
    `View Enrollment Status: ${detailUrl}`,
  ]);
  return send(
    user.email || enrollment.email,
    `Enrollment Submitted (#${enrollment.id}) - GabAI EMC`,
    wrap("Enrollment Received", body, `Your enrollment application #${enrollment.id} has been received.`),
    text
  );
}

// 4. Enrollment Verified by Registrar
export async function sendEnrollmentVerifiedEmail(user, enrollment) {
  const recipientName = user.name || enrollment.firstName || "Student";
  const detailUrl = `${getBaseUrl()}/enrollment/${enrollment.id}`;
  const body = `
    <p style="color:#333333;font-size:14px;line-height:1.6;">Hello <strong>${escapeHtml(recipientName)}</strong>,</p>
    <p style="color:#333333;font-size:14px;line-height:1.6;">The Office of the Registrar has reviewed and verified your submitted documents. Your enrollment application is now awaiting final approval.</p>
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0;background-color:#f0f4ff;border-radius:8px;">
      ${info("Enrollment ID", `#${enrollment.id}`)}
      ${info("Status", "Verified - Awaiting Final Approval")}
    </table>
    ${btn("View Enrollment Status", detailUrl)}`;
  const text = buildText("Documents Verified", [
    `Hello ${recipientName},`,
    "",
    "The Office of the Registrar has reviewed and verified your submitted documents. Your enrollment application is now awaiting final approval.",
    `Enrollment ID: #${enrollment.id}`,
    "Status: Verified - Awaiting Final Approval",
    "",
    `View Enrollment Status: ${detailUrl}`,
  ]);
  return send(
    user.email || enrollment.email,
    `Documents Verified (#${enrollment.id}) - GabAI EMC`,
    wrap("Documents Verified", body, `Your documents for enrollment #${enrollment.id} have been verified.`),
    text
  );
}

// 5. Enrollment Returned (needs correction)
export async function sendEnrollmentReturnedEmail(user, enrollment, remarks) {
  const recipientName = user.name || enrollment.firstName || "Student";
  const editUrl = `${getBaseUrl()}/hs-enrollment-form/${enrollment.id}`;
  const body = `
    <p style="color:#333333;font-size:14px;line-height:1.6;">Hello <strong>${escapeHtml(recipientName)}</strong>,</p>
    <p style="color:#333333;font-size:14px;line-height:1.6;">Your enrollment application (#${escapeHtml(enrollment.id)}) has been returned by the Office of the Registrar for revision. Please review the remarks below and update your details or documents.</p>
    <div style="background-color:#fff8eb;border-left:4px solid #d97706;padding:12px 16px;border-radius:4px;margin:16px 0;">
      <p style="color:#92400e;font-size:13px;font-weight:bold;margin:0 0 4px;">Registrar Remarks:</p>
      <p style="color:#78350f;font-size:14px;margin:0;">${escapeHtml(remarks || "Please review and update your submission.")}</p>
    </div>
    ${btn("Update and Resubmit Application", editUrl)}
    <p style="color:#666666;font-size:12px;">Please review the remarks and resubmit your application when ready.</p>`;
  const text = buildText("Enrollment Returned for Revision", [
    `Hello ${recipientName},`,
    "",
    `Your enrollment application (#${enrollment.id}) has been returned by the Office of the Registrar for revision.`,
    `Registrar Remarks: ${remarks || "Please review and update your submission."}`,
    "",
    `Update and Resubmit Application: ${editUrl}`,
  ]);
  return send(
    user.email || enrollment.email,
    `Enrollment Returned for Revision (#${enrollment.id}) - GabAI EMC`,
    wrap("Enrollment Returned for Revision", body, `Your enrollment #${enrollment.id} needs revision based on Registrar remarks.`),
    text
  );
}

// 6. Enrollment Approved
export async function sendEnrollmentApprovedEmail(user, enrollment) {
  const recipientName = user.name || enrollment.firstName || "Student";
  const detailUrl = `${getBaseUrl()}/enrollment/${enrollment.id}`;
  const courseOrGrade = enrollment.course || enrollment.gradeLevel || "—";
  const sectionInfo = enrollment.sectionName
    ? `<p style="color:#333333;font-size:14px;">You have been assigned to <strong>Section ${escapeHtml(enrollment.sectionName)}</strong>.</p>`
    : "";
  const body = `
    <p style="color:#333333;font-size:14px;line-height:1.6;">Hello <strong>${escapeHtml(recipientName)}</strong>,</p>
    <p style="color:#333333;font-size:14px;line-height:1.6;">Your enrollment application at ${SCHOOL_NAME} has been <strong style="color:#2e7d32;">approved</strong>.</p>
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0;background-color:#f1f8e9;border-radius:8px;">
      ${info("Enrollment ID", `#${enrollment.id}`)}
      ${info("Level", enrollment.educationLevel || "—")}
      ${info("Course / Grade", courseOrGrade)}
      ${enrollment.sectionName ? info("Assigned Section", `Section ${enrollment.sectionName}`) : ""}
      ${info("Status", "Enrolled")}
    </table>
    ${sectionInfo}
    ${btn("View Enrollment Details", detailUrl)}`;
  const text = buildText("Enrollment Approved", [
    `Hello ${recipientName},`,
    "",
    `Your enrollment application at ${SCHOOL_NAME} has been approved.`,
    `Enrollment ID: #${enrollment.id}`,
    `Level: ${enrollment.educationLevel || "-"}`,
    `Course / Grade: ${courseOrGrade}`,
    enrollment.sectionName ? `Assigned Section: Section ${enrollment.sectionName}` : null,
    "Status: Enrolled",
    "",
    `View Enrollment Details: ${detailUrl}`,
  ]);
  return send(
    user.email || enrollment.email,
    `Enrollment Approved (#${enrollment.id}) - GabAI EMC`,
    wrap("Enrollment Approved", body, `Your enrollment application #${enrollment.id} has been approved.`),
    text
  );
}

// 7. Enrollment Rejected
export async function sendEnrollmentRejectedEmail(user, enrollment, reason) {
  const recipientName = user.name || enrollment.firstName || "Student";
  const reasonText = reason || "No reason provided.";
  const body = `
    <p style="color:#333333;font-size:14px;line-height:1.6;">Hello <strong>${escapeHtml(recipientName)}</strong>,</p>
    <p style="color:#333333;font-size:14px;line-height:1.6;">Your enrollment application (#${escapeHtml(enrollment.id)}) was <strong style="color:#c62828;">not approved</strong>.</p>
    <div style="background-color:#fef2f2;border-left:4px solid #c62828;padding:12px 16px;border-radius:4px;margin:16px 0;">
      <p style="color:#991b1b;font-size:13px;font-weight:bold;margin:0 0 4px;">Reason:</p>
      <p style="color:#7f1d1d;font-size:14px;margin:0;">${escapeHtml(reasonText)}</p>
    </div>
    <p style="color:#333333;font-size:14px;">If you have questions or believe this is an error, please contact the Office of the Registrar at <strong>${escapeHtml(SCHOOL_CONTACT_EMAIL)}</strong>.</p>`;
  const text = buildText("Enrollment Not Approved", [
    `Hello ${recipientName},`,
    "",
    `Your enrollment application (#${enrollment.id}) was not approved.`,
    `Reason: ${reasonText}`,
    "",
    `If you have questions, please contact the Office of the Registrar at ${SCHOOL_CONTACT_EMAIL}.`,
  ]);
  return send(
    user.email || enrollment.email,
    `Enrollment Status Update (#${enrollment.id}) - GabAI EMC`,
    wrap("Enrollment Not Approved", body, `Update regarding your enrollment application #${enrollment.id}.`),
    text
  );
}

// 8. SSC Exam Scheduled
export async function sendSSCExamScheduledEmail(user, enrollment) {
  const recipientName = user.name || enrollment.firstName || "Student";
  const detailUrl = `${getBaseUrl()}/enrollment/${enrollment.id}`;
  const examDate = enrollment.sscExamDate
    ? new Date(enrollment.sscExamDate).toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "To be announced";
  const body = `
    <p style="color:#333333;font-size:14px;line-height:1.6;">Hello <strong>${escapeHtml(recipientName)}</strong>,</p>
    <p style="color:#333333;font-size:14px;line-height:1.6;">Your Special Science Class (SSC) entrance exam has been scheduled.</p>
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0;background-color:#fffde7;border-radius:8px;">
      ${info("Exam Date", examDate)}
      ${info("Passing Score", enrollment.sscPassingScore || "75")}
    </table>
    <p style="color:#333333;font-size:14px;line-height:1.6;">Please arrive on time on your scheduled exam date and bring your <strong>original report card</strong> for verification, along with a valid school ID.</p>
    ${btn("View Enrollment Details", detailUrl)}`;
  const text = buildText("SSC Entrance Exam Scheduled", [
    `Hello ${recipientName},`,
    "",
    "Your Special Science Class (SSC) entrance exam has been scheduled.",
    `Exam Date: ${examDate}`,
    `Passing Score: ${enrollment.sscPassingScore || "75"}`,
    "",
    "Please arrive on time on your scheduled exam date and bring your original report card for verification, along with a valid school ID.",
    `View Enrollment Details: ${detailUrl}`,
  ]);
  return send(
    user.email || enrollment.email,
    "SSC Entrance Exam Schedule - GabAI EMC",
    wrap("SSC Entrance Exam Scheduled", body, `Your SSC entrance exam is scheduled for ${examDate}.`),
    text
  );
}

// 9. SSC Exam Result
export async function sendSSCResultEmail(user, enrollment) {
  const recipientName = user.name || enrollment.firstName || "Student";
  const myEnrollmentsUrl = `${getBaseUrl()}/my-enrollments`;
  const passed = enrollment.sscResult === "passed";
  const resultLabel = passed ? "PASSED" : "DID NOT PASS";
  const classAssignment = enrollment.sscClass || (passed ? "SSC" : "Regular");
  const guidance = passed
    ? "You qualify for the Special Science Class. Sign in, open My Enrollments, and click Complete Enrollment Form to proceed with the five-step enrollment form."
    : "You may continue with the Regular class. Sign in and open My Enrollments to complete the five-step enrollment form.";
  const body = `
    <p style="color:#333333;font-size:14px;line-height:1.6;">Hello <strong>${escapeHtml(recipientName)}</strong>,</p>
    <p style="color:#333333;font-size:14px;line-height:1.6;">Your Special Science Class (SSC) entrance exam result is now available.</p>
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0;background-color:${passed ? "#f1f8e9" : "#fef2f2"};border-radius:8px;">
      ${info("Result", resultLabel)}
      ${enrollment.sscExamScore != null ? info("Score", enrollment.sscExamScore) : ""}
      ${info("Class Assignment", classAssignment)}
    </table>
    <p style="color:#333333;font-size:14px;line-height:1.6;">${escapeHtml(guidance)}</p>
    ${btn("Continue Enrollment", myEnrollmentsUrl)}`;
  const text = buildText("SSC Exam Result", [
    `Hello ${recipientName},`,
    "",
    "Your Special Science Class (SSC) entrance exam result is now available.",
    `Result: ${resultLabel}`,
    enrollment.sscExamScore != null ? `Score: ${enrollment.sscExamScore}` : null,
    `Class Assignment: ${classAssignment}`,
    "",
    guidance,
    `Continue Enrollment: ${myEnrollmentsUrl}`,
  ]);
  return send(
    user.email || enrollment.email,
    `SSC Exam Result (${passed ? "Passed" : "Not Passed"}) - GabAI EMC`,
    wrap("SSC Exam Result", body, `Your SSC entrance exam result is now available (${classAssignment}).`),
    text
  );
}

// 10. Verification link email
export async function sendVerificationEmail(user, token) {
  const verifyUrl = `${getBaseUrl()}/verify-email?token=${token}`;
  const body = `
    <p style="color:#333333;font-size:14px;line-height:1.6;">Hello <strong>${escapeHtml(user.name)}</strong>,</p>
    <p style="color:#333333;font-size:14px;line-height:1.6;">Thank you for registering at ${SCHOOL_NAME}. Please verify your email address to activate your GabAI Student Portal account.</p>
    ${btn("Verify Email Address", verifyUrl)}
    <p style="color:#666666;font-size:12px;">This verification link expires in <strong>24 hours</strong>. If you did not create this account, you may ignore this email.</p>`;
  const text = buildText("Email Verification", [
    `Hello ${user.name},`,
    "",
    `Thank you for registering at ${SCHOOL_NAME}. Please verify your email address to activate your GabAI Student Portal account.`,
    `Verify Email Address: ${verifyUrl}`,
    "",
    "This verification link expires in 24 hours. If you did not create this account, you may ignore this email.",
  ]);
  return send(
    user.email,
    "Verify Your Email Address - GabAI EMC",
    wrap("Email Verification", body, "Verify your email address to activate your GabAI account."),
    text
  );
}

// 11. OTP verification email
export async function sendOtpEmail(user, otp) {
  const safeOtp = escapeHtml(otp);
  const body = `
    <p style="color:#333333;font-size:14px;line-height:1.6;">Hello <strong>${escapeHtml(user.name)}</strong>,</p>
    <p style="color:#333333;font-size:14px;line-height:1.6;">Thank you for registering at ${SCHOOL_NAME}. Enter the 6-digit verification code below on the GabAI portal to verify your email address:</p>
    <div style="text-align:center;margin:24px 0;">
      <div style="display:inline-block;background-color:#001840;color:#F5C400;font-size:32px;font-weight:bold;letter-spacing:10px;padding:16px 32px;border-radius:10px;">
        ${safeOtp}
      </div>
    </div>
    <p style="color:#555555;font-size:13px;text-align:center;">This verification code expires in <strong>10 minutes</strong>.</p>
    <p style="color:#666666;font-size:12px;margin-top:16px;">If you did not create this account, you can safely ignore this message.</p>`;
  const text = buildText("Email Verification Code", [
    `Hello ${user.name},`,
    "",
    `Thank you for registering at ${SCHOOL_NAME}. Enter the verification code below on the GabAI portal to verify your email address:`,
    "",
    `Verification Code: ${otp}`,
    "",
    "This verification code expires in 10 minutes.",
    "If you did not create this account, you can safely ignore this message.",
  ]);
  return send(
    user.email,
    `Your GabAI Verification Code: ${otp}`,
    wrap("Email Verification Code", body, `Your GabAI verification code is ${otp}.`),
    text
  );
}

// 12. Life Status Changed (Dropped / Transferred Out / Retained / Completed)
export async function sendLifeStatusEmail(user, enrollment) {
  const status = enrollment.lifeStatus;

  const configs = {
    dropped: {
      subject: "Enrollment Status Update: Dropped - GabAI EMC",
      title: "Enrollment Status Update: Dropped",
      color: "#c62828",
      bg: "#fef2f2",
      border: "#c62828",
      message:
        "Your enrollment has been marked as Dropped by the Office of the Registrar. If you believe this is an error or wish to discuss re-enrollment, please contact the Registrar's Office.",
    },
    transferred_out: {
      subject: "Transfer Out Recorded - GabAI EMC",
      title: "Transfer Out Recorded",
      color: "#9a3412",
      bg: "#fff7ed",
      border: "#ea580c",
      message:
        "Your transfer to another school has been recorded by the Office of the Registrar.",
    },
    retained: {
      subject: "Enrollment Status Update: Retained - GabAI EMC",
      title: "Enrollment Status Update: Retained",
      color: "#92400e",
      bg: "#fffbeb",
      border: "#d97706",
      message:
        "Your enrollment has been marked as Retained. You will re-enroll in the same grade level for the next school year. Please contact the Office of the Registrar for details.",
    },
    completed: {
      subject: "School Year Completed - GabAI EMC",
      title: "School Year Completed",
      color: "#166534",
      bg: "#f0fdf4",
      border: "#16a34a",
      message:
        "You have completed this school year. You may re-enroll for the next school year when enrollment opens.",
    },
  };

  const cfg = configs[status];
  if (!cfg) return false;

  const name = enrollment.firstName
    ? `${enrollment.firstName} ${enrollment.familyName || ""}`.trim()
    : user.name || "Student";

  const reasonBlock = enrollment.lifeStatusReason
    ? `<div style="background-color:${cfg.bg};border-left:4px solid ${cfg.border};padding:12px 16px;border-radius:4px;margin:16px 0;">
        <p style="color:${cfg.color};font-size:13px;font-weight:bold;margin:0 0 4px;">Reason:</p>
        <p style="color:${cfg.color};font-size:14px;margin:0;">${escapeHtml(enrollment.lifeStatusReason)}</p>
       </div>`
    : "";

  const destinationBlock = enrollment.destinationSchool
    ? `<p style="color:#333333;font-size:14px;">Destination School: <strong>${escapeHtml(enrollment.destinationSchool)}</strong></p>`
    : "";

  const formattedDate = enrollment.lifeStatusDate
    ? new Date(enrollment.lifeStatusDate).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const effectiveBlock = formattedDate
    ? `<p style="color:#666666;font-size:13px;">Effective date: ${escapeHtml(formattedDate)}</p>`
    : "";

  const gradeAndStrand = [enrollment.gradeLevel, enrollment.strand].filter(Boolean).join(" - ") || "—";

  const body = `
    <p style="color:#333333;font-size:14px;line-height:1.6;">Hello <strong>${escapeHtml(name)}</strong>,</p>
    <p style="color:#333333;font-size:14px;line-height:1.6;">${escapeHtml(cfg.message)}</p>
    ${reasonBlock}
    ${destinationBlock}
    ${effectiveBlock}
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0;background-color:#f9f9f5;border-radius:8px;">
      ${info("Enrollment ID", `#${enrollment.id}`)}
      ${info("Level", enrollment.educationLevel || "—")}
      ${info("Grade / Strand", gradeAndStrand)}
    </table>
    <p style="color:#333333;font-size:14px;">For questions or concerns, please contact the Office of the Registrar at <strong>${escapeHtml(SCHOOL_CONTACT_EMAIL)}</strong>.</p>`;

  const text = buildText(cfg.title, [
    `Hello ${name},`,
    "",
    cfg.message,
    enrollment.lifeStatusReason ? `Reason: ${enrollment.lifeStatusReason}` : null,
    enrollment.destinationSchool ? `Destination School: ${enrollment.destinationSchool}` : null,
    formattedDate ? `Effective date: ${formattedDate}` : null,
    "",
    `Enrollment ID: #${enrollment.id}`,
    `Level: ${enrollment.educationLevel || "-"}`,
    `Grade / Strand: ${gradeAndStrand}`,
    "",
    `For questions or concerns, please contact the Office of the Registrar at ${SCHOOL_CONTACT_EMAIL}.`,
  ]);

  return send(
    user.email || enrollment.email,
    cfg.subject,
    wrap(cfg.title, body, cfg.message),
    text
  );
}
