import test from "node:test";
import assert from "node:assert/strict";
import { sanitizePayload, classifyAuditEvent, extractClientIp } from "./systemLogger.js";

test("sanitizePayload redacts sensitive fields and preserves safe metadata", () => {
  const input = {
    email: "student@example.com",
    password: "super-secret-password",
    newPassword: "new-secret-password",
    otp: "123456",
    nested: {
      token: "jwt-token-value",
      gradeLevel: "Grade 7",
    },
  };

  const sanitized = sanitizePayload(input);
  assert.equal(sanitized.email, "student@example.com");
  assert.equal(sanitized.password, "[REDACTED]");
  assert.equal(sanitized.newPassword, "[REDACTED]");
  assert.equal(sanitized.otp, "[REDACTED]");
  assert.equal(sanitized.nested.token, "[REDACTED]");
  assert.equal(sanitized.nested.gradeLevel, "Grade 7");
});

test("classifyAuditEvent classifies login and failed login accurately", () => {
  const successLogin = classifyAuditEvent({
    method: "POST",
    path: "/api/auth/login",
    statusCode: 200,
    reqBody: { email: "admin@school.edu" },
    resBody: { user: { id: 1, name: "System Admin", email: "admin@school.edu", role: "admin" } },
    actor: { id: 1, name: "System Admin", email: "admin@school.edu", role: "admin" },
  });

  assert.equal(successLogin.category, "auth");
  assert.equal(successLogin.action, "USER_LOGIN");
  assert.equal(successLogin.severity, "success");
  assert.match(successLogin.description, /System Admin.*logged in successfully/);

  const failedLogin = classifyAuditEvent({
    method: "POST",
    path: "/api/auth/login",
    statusCode: 401,
    reqBody: { email: "attacker@example.com" },
    resBody: { message: "Invalid email or password" },
    actor: { id: null, name: "attacker@example.com", email: "attacker@example.com", role: "guest" },
  });

  assert.equal(failedLogin.category, "auth");
  assert.equal(failedLogin.action, "LOGIN_FAILED");
  assert.equal(failedLogin.severity, "warning");
  assert.match(failedLogin.description, /Failed login attempt/);
});

test("classifyAuditEvent classifies registrar enrollment approval and section assignment", () => {
  const approval = classifyAuditEvent({
    method: "POST",
    path: "/api/registrar/enrollments/42/approve",
    statusCode: 200,
    reqBody: { remarks: "Complete documents" },
    resBody: {
      enrollment: {
        id: 42,
        firstName: "Maria",
        familyName: "Santos",
        studentNumber: "2026-00042",
        sectionName: "G7-RIZAL",
      },
      sectionAssignment: {
        assigned: true,
        section: { code: "G7-RIZAL" },
      },
    },
    actor: { id: 2, name: "Chief Registrar", email: "registrar@school.edu", role: "registrar" },
  });

  assert.equal(approval.category, "enrollment");
  assert.equal(approval.action, "ENROLLMENT_APPROVED");
  assert.equal(approval.severity, "success");
  assert.equal(approval.targetType, "enrollment");
  assert.equal(approval.targetId, "42");
  assert.match(approval.description, /Maria Santos \(2026-00042\).*G7-RIZAL/);
});

test("extractClientIp extracts first forwarded IP when present", () => {
  const ip = extractClientIp({
    headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    ip: "127.0.0.1",
  });
  assert.equal(ip, "203.0.113.10");
});

