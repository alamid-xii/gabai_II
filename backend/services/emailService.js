import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD?.replace(/\s+/g, ""),
  },
});

const FROM = process.env.EMAIL_FROM || `GabAI EMC <${process.env.EMAIL_USER}>`;
const BASE_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ── Shared HTML wrapper ───────────────────────────────────────────────────────
function wrap(title, body) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:#001840;padding:28px 32px;text-align:center;">
      <h1 style="color:#F5C400;margin:0;font-size:22px;font-weight:bold;">GabAI</h1>
      <p style="color:#FFDC5F;margin:4px 0 0;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Eastern Mindoro College</p>
    </div>
    <!-- Body -->
    <div style="padding:32px;">
      <h2 style="color:#001840;margin:0 0 16px;font-size:18px;">${title}</h2>
      ${body}
    </div>
    <!-- Footer -->
    <div style="background:#f9f9f5;padding:20px 32px;border-top:1px solid #eee;text-align:center;">
      <p style="color:#888;font-size:12px;margin:0;">Eastern Mindoro College, Inc. &bull; Calapan City, Oriental Mindoro</p>
      <p style="color:#aaa;font-size:11px;margin:4px 0 0;">This is an automated message. Please do not reply.</p>
    </div>
  </div>
</body>
</html>`;
}

function btn(text, url) {
  return `<a href="${url}" style="display:inline-block;background:#102A71;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;margin:16px 0;">${text}</a>`;
}

function info(label, value) {
  return `<tr><td style="padding:6px 0;color:#666;font-size:13px;width:140px;">${label}</td><td style="padding:6px 0;color:#001840;font-size:13px;font-weight:600;">${value}</td></tr>`;
}

// ── Send helper ───────────────────────────────────────────────────────────────
async function send(to, subject, html) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn("[Email] Skipped — EMAIL_USER or EMAIL_PASSWORD not set");
    return false;
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send "${subject}" to ${to}:`, err.message);
    return false;
  }
}

// ── Email templates ───────────────────────────────────────────────────────────

// 1. Welcome / Account Created
export async function sendPasswordResetEmail(user, resetUrl) {
  const body = `
    <p style="color:#444;font-size:14px;line-height:1.6;">We received a request to reset your GabAI password.</p>
    ${btn("Reset Password", resetUrl)}
    <p style="color:#444;font-size:14px;line-height:1.6;">This link expires in 30 minutes and can only be used once. Requesting another link replaces this one.</p>
    <p style="color:#888;font-size:12px;">If you did not request this, you can ignore this email. Your password will stay the same.</p>`;
  return send(user.email, "Reset Your Password — GabAI EMC", wrap("Password Reset", body));
}

export async function sendWelcomeEmail(user) {
  const body = `
    <p style="color:#444;font-size:14px;line-height:1.6;">Hello <strong>${user.name}</strong>,</p>
    <p style="color:#444;font-size:14px;line-height:1.6;">Your GabAI account has been created successfully. You can now log in and start your enrollment process at Eastern Mindoro College.</p>
    ${btn("Log In Now", `${BASE_URL}/login`)}
    <p style="color:#888;font-size:12px;margin-top:24px;">If you did not create this account, please ignore this email.</p>`;
  await send(user.email, "Welcome to GabAI — Eastern Mindoro College", wrap("Account Created Successfully", body));
}

// 2. Enrollment Submitted
export async function sendEnrollmentSubmittedEmail(user, enrollment) {
  const body = `
    <p style="color:#444;font-size:14px;line-height:1.6;">Hello <strong>${user.name || enrollment.firstName}</strong>,</p>
    <p style="color:#444;font-size:14px;line-height:1.6;">Your enrollment has been submitted and is now under review by the Registrar.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9f9f5;border-radius:8px;padding:12px;">
      ${info("Enrollment ID", `#${enrollment.id}`)}
      ${info("Level", enrollment.educationLevel)}
      ${info("Course / Grade", enrollment.course || enrollment.gradeLevel || "—")}
      ${info("Status", "Submitted — Awaiting Review")}
    </table>
    ${btn("View My Enrollment", `${BASE_URL}/enrollment/${enrollment.id}`)}
    <p style="color:#888;font-size:12px;margin-top:24px;">You will receive another email once the registrar has reviewed your documents.</p>`;
  await send(user.email || enrollment.email, "Enrollment Submitted — GabAI EMC", wrap("Enrollment Received", body));
}

// 3. Enrollment Verified by Registrar
export async function sendEnrollmentVerifiedEmail(user, enrollment) {
  const body = `
    <p style="color:#444;font-size:14px;line-height:1.6;">Hello <strong>${user.name || enrollment.firstName}</strong>,</p>
    <p style="color:#444;font-size:14px;line-height:1.6;">Great news! The Registrar has reviewed and verified your documents. Your enrollment is now awaiting final approval from the Admin.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f0f4ff;border-radius:8px;padding:12px;">
      ${info("Enrollment ID", `#${enrollment.id}`)}
      ${info("Status", "Verified — Awaiting Admin Approval")}
    </table>
    ${btn("View My Enrollment", `${BASE_URL}/enrollment/${enrollment.id}`)}`;
  await send(user.email || enrollment.email, "Documents Verified — GabAI EMC", wrap("Documents Verified", body));
}

// 4. Enrollment Returned (needs correction)
export async function sendEnrollmentReturnedEmail(user, enrollment, remarks) {
  const body = `
    <p style="color:#444;font-size:14px;line-height:1.6;">Hello <strong>${user.name || enrollment.firstName}</strong>,</p>
    <p style="color:#444;font-size:14px;line-height:1.6;">Your enrollment has been returned by the Registrar. Please review the remarks below and re-upload the correct documents.</p>
    <div style="background:#fff3e0;border-left:4px solid #f57c00;padding:12px 16px;border-radius:4px;margin:16px 0;">
      <p style="color:#e65100;font-size:13px;font-weight:bold;margin:0 0 4px;">Registrar Remarks:</p>
      <p style="color:#bf360c;font-size:14px;margin:0;">${remarks}</p>
    </div>
    ${btn("Fix and Resubmit", `${BASE_URL}/resubmit/${enrollment.id}`)}
    <p style="color:#888;font-size:12px;margin-top:24px;">Please correct the issues and resubmit as soon as possible.</p>`;
  await send(user.email || enrollment.email, "Action Required — Enrollment Returned", wrap("Enrollment Returned for Correction", body));
}

// 5. Enrollment Approved
export async function sendEnrollmentApprovedEmail(user, enrollment) {
  const sectionInfo = enrollment.sectionName
    ? `<p style="color:#444;font-size:14px;">You have been assigned to <strong>Section ${enrollment.sectionName}</strong>.</p>`
    : "";
  const body = `
    <p style="color:#444;font-size:14px;line-height:1.6;">Hello <strong>${user.name || enrollment.firstName}</strong>,</p>
    <p style="color:#444;font-size:14px;line-height:1.6;">Congratulations! Your enrollment has been <strong style="color:#2e7d32;">approved</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f1f8e9;border-radius:8px;padding:12px;">
      ${info("Enrollment ID", `#${enrollment.id}`)}
      ${info("Level", enrollment.educationLevel)}
      ${info("Course / Grade", enrollment.course || enrollment.gradeLevel || "—")}
      ${enrollment.sectionName ? info("Assigned Section", `Section ${enrollment.sectionName}`) : ""}
      ${info("Status", "Enrolled")}
    </table>
    ${sectionInfo}
    ${btn("View My Dashboard", `${BASE_URL}/enrollment/${enrollment.id}`)}`;
  await send(user.email || enrollment.email, "Enrollment Approved — GabAI EMC", wrap("Congratulations! Enrollment Approved", body));
}

// 6. Enrollment Rejected
export async function sendEnrollmentRejectedEmail(user, enrollment, reason) {
  const body = `
    <p style="color:#444;font-size:14px;line-height:1.6;">Hello <strong>${user.name || enrollment.firstName}</strong>,</p>
    <p style="color:#444;font-size:14px;line-height:1.6;">We regret to inform you that your enrollment has been <strong style="color:#c62828;">rejected</strong>.</p>
    <div style="background:#ffebee;border-left:4px solid #c62828;padding:12px 16px;border-radius:4px;margin:16px 0;">
      <p style="color:#b71c1c;font-size:13px;font-weight:bold;margin:0 0 4px;">Reason:</p>
      <p style="color:#c62828;font-size:14px;margin:0;">${reason || "No reason provided."}</p>
    </div>
    <p style="color:#444;font-size:14px;">If you believe this is an error, please contact the Registrar's Office at <strong>(043) 123-4567</strong>.</p>`;
  await send(user.email || enrollment.email, "Enrollment Rejected — GabAI EMC", wrap("Enrollment Not Approved", body));
}

// 7. SSC Exam Scheduled
export async function sendSSCExamScheduledEmail(user, enrollment) {
  const examDate = enrollment.sscExamDate
    ? new Date(enrollment.sscExamDate).toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "To be announced";
  const body = `
    <p style="color:#444;font-size:14px;line-height:1.6;">Hello <strong>${user.name || enrollment.firstName}</strong>,</p>
    <p style="color:#444;font-size:14px;line-height:1.6;">Your Special Science Class (SSC) entrance exam has been scheduled.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#fffde7;border-radius:8px;padding:12px;">
      ${info("Exam Date", examDate)}
      ${info("Passing Score", enrollment.sscPassingScore || "75")}
    </table>
    <p style="color:#444;font-size:14px;">Please come on time and bring a valid school ID. Good luck!</p>
    ${btn("View Enrollment Details", `${BASE_URL}/enrollment/${enrollment.id}`)}`;
  await send(user.email || enrollment.email, "SSC Exam Scheduled — GabAI EMC", wrap("SSC Entrance Exam Scheduled", body));
}

// 8. SSC Exam Result
export async function sendSSCResultEmail(user, enrollment) {
  const passed = enrollment.sscResult === "passed";
  const body = `
    <p style="color:#444;font-size:14px;line-height:1.6;">Hello <strong>${user.name || enrollment.firstName}</strong>,</p>
    <p style="color:#444;font-size:14px;line-height:1.6;">Your SSC entrance exam result is now available.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:${passed ? "#f1f8e9" : "#ffebee"};border-radius:8px;padding:12px;">
      ${info("Result", passed ? "PASSED" : "DID NOT PASS")}
      ${enrollment.sscExamScore ? info("Score", enrollment.sscExamScore) : ""}
      ${info("Class Assignment", enrollment.sscClass || (passed ? "SSC" : "Regular"))}
    </table>
    <p style="color:#444;font-size:14px;">${passed ? "Congratulations! You qualify for the Special Science Class." : "You will be enrolled in the Regular class."}</p>
    ${btn("View Enrollment Details", `${BASE_URL}/enrollment/${enrollment.id}`)}`;
  await send(user.email || enrollment.email, `SSC Exam Result — ${passed ? "Passed" : "Not Passed"} — GabAI EMC`, wrap("SSC Exam Result", body));
}
// Verification email
export async function sendVerificationEmail(user, token) {
  const verifyUrl = `${BASE_URL}/verify-email?token=${token}`;
  const body = `
    <p style="color:#444;font-size:14px;line-height:1.6;">Hello <strong>${user.name}</strong>,</p>
    <p style="color:#444;font-size:14px;line-height:1.6;">Thank you for registering at Eastern Mindoro College. Please verify your email address to activate your account.</p>
    <div style="text-align:center;margin:24px 0;">
      ${btn("Verify My Email", verifyUrl)}
    </div>
    <p style="color:#888;font-size:12px;">This link expires in <strong>24 hours</strong>. If you did not create this account, please ignore this email.</p>
    <p style="color:#aaa;font-size:11px;margin-top:8px;">Or copy this link: ${verifyUrl}</p>`;
  await send(user.email, "Verify Your Email — GabAI EMC", wrap("Email Verification Required", body));
}

// OTP verification email
export async function sendOtpEmail(user, otp) {
  const body = `
    <p style="color:#444;font-size:14px;line-height:1.6;">Hello <strong>${user.name}</strong>,</p>
    <p style="color:#444;font-size:14px;line-height:1.6;">Thank you for registering at Eastern Mindoro College. Use the OTP below to verify your email address.</p>
    <div style="text-align:center;margin:32px 0;">
      <div style="display:inline-block;background:#001840;color:#F5C400;font-size:36px;font-weight:bold;letter-spacing:12px;padding:20px 36px;border-radius:12px;">
        ${otp}
      </div>
    </div>
    <p style="color:#888;font-size:13px;text-align:center;">This OTP expires in <strong>10 minutes</strong>.</p>
    <p style="color:#aaa;font-size:12px;margin-top:16px;">If you did not create this account, please ignore this email.</p>`;
  return send(user.email, "Your Verification OTP — GabAI EMC", wrap("Email Verification Code", body));
}

// ── Life Status Changed (Dropped / Transferred Out / Retained) ────────────────
export async function sendLifeStatusEmail(user, enrollment) {
  const status = enrollment.lifeStatus;

  const configs = {
    dropped: {
      subject: 'Enrollment Dropped — GabAI EMC',
      title: 'Enrollment Status Update: Dropped',
      color: '#c62828',
      bg: '#ffebee',
      border: '#c62828',
      message: 'Your enrollment has been marked as <strong>Dropped</strong> by the Registrar. If you believe this is an error or wish to discuss re-enrollment, please contact the Registrar\'s Office.',
    },
    transferred_out: {
      subject: 'Transfer Confirmed — GabAI EMC',
      title: 'Transfer Out Recorded',
      color: '#e65100',
      bg: '#fff3e0',
      border: '#f57c00',
      message: 'Your transfer to another school has been recorded by the Registrar. We wish you the best in your new school!',
    },
    retained: {
      subject: 'Enrollment Status: Retained — GabAI EMC',
      title: 'Enrollment Status Update: Retained',
      color: '#f57f17',
      bg: '#fffde7',
      border: '#f9a825',
      message: 'Your enrollment has been marked as <strong>Retained</strong>. This means you will re-enroll in the same grade level next school year. Please contact the Registrar for details.',
    },
    completed: {
      subject: 'School Year Completed — GabAI EMC',
      title: 'Congratulations — School Year Completed',
      color: '#2e7d32',
      bg: '#f1f8e9',
      border: '#4caf50',
      message: 'You have successfully completed this school year. You may re-enroll for the next school year when enrollment opens.',
    },
  };

  const cfg = configs[status];
  if (!cfg) return; // no email for 'enrolled' or 'transferred_in' (auto-set)

  const name = enrollment.firstName
    ? `${enrollment.firstName} ${enrollment.familyName || ''}`.trim()
    : user.name;

  const reasonBlock = enrollment.lifeStatusReason
    ? `<div style="background:${cfg.bg};border-left:4px solid ${cfg.border};padding:12px 16px;border-radius:4px;margin:16px 0;">
        <p style="color:${cfg.color};font-size:13px;font-weight:bold;margin:0 0 4px;">Reason:</p>
        <p style="color:${cfg.color};font-size:14px;margin:0;">${enrollment.lifeStatusReason}</p>
       </div>`
    : '';

  const destinationBlock = enrollment.destinationSchool
    ? `<p style="color:#444;font-size:14px;">Destination School: <strong>${enrollment.destinationSchool}</strong></p>`
    : '';

  const effectiveBlock = enrollment.lifeStatusDate
    ? `<p style="color:#888;font-size:13px;">Effective date: ${new Date(enrollment.lifeStatusDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>`
    : '';

  const body = `
    <p style="color:#444;font-size:14px;line-height:1.6;">Hello <strong>${name}</strong>,</p>
    <p style="color:#444;font-size:14px;line-height:1.6;">${cfg.message}</p>
    ${reasonBlock}
    ${destinationBlock}
    ${effectiveBlock}
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9f9f5;border-radius:8px;padding:12px;">
      ${info("Enrollment ID", `#${enrollment.id}`)}
      ${info("Level", enrollment.educationLevel || '—')}
      ${info("Grade / Strand", [enrollment.gradeLevel, enrollment.strand].filter(Boolean).join(' — ') || '—')}
    </table>
    <p style="color:#444;font-size:14px;">For questions or concerns, please contact the Registrar's Office at <strong>(043) 123-4567</strong> or <strong>emc_1945@yahoo.com</strong>.</p>`;

  await send(user.email || enrollment.email, cfg.subject, wrap(cfg.title, body));
}
