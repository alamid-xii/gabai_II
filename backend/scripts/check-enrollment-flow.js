// Creates a schema-only scratch database. Never copies real users/enrollments.
// All SMTP delivery is stubbed before importing application code.
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';
import express from 'express';
import session from 'express-session';
import jwt from 'jsonwebtoken';
import { createRequire } from 'node:module';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const source = process.env.DB_NAME || 'backend';
const scratch = `gabai_flow_test_${Date.now()}`;
assert.match(scratch, /^gabai_flow_test_\d+$/);
assert.notEqual(source, scratch);
const scratchFiles = await fs.mkdtemp(path.join(os.tmpdir(), 'gabai-flow-'));
const originalCwd = process.cwd();
const checks = [];
let sentEmails = 0, server, sequelize, connection, created = false;
nodemailer.createTransport = () => ({ sendMail: async () => { sentEmails++; return { messageId: 'test-only', accepted: ['test-only'] }; } });

try {
  connection = await mysql.createConnection({ host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '' });
  const [tables] = await connection.query(`SHOW TABLES FROM ${mysql.escapeId(source)}`);
  await connection.query(`CREATE DATABASE ${mysql.escapeId(scratch)}`); created = true;
  for (const table of tables) {
    const name = Object.values(table)[0];
    await connection.query(`CREATE TABLE ${mysql.escapeId(scratch)}.${mysql.escapeId(name)} LIKE ${mysql.escapeId(source)}.${mysql.escapeId(name)}`);
  }
  process.env.DB_NAME = scratch;
  process.env.DOCUMENT_PUBLIC_DIR = path.join(scratchFiles, 'public');
  process.env.JWT_SECRET = 'isolated-flow-test-secret-only';
  process.chdir(scratchFiles);
  ({ sequelize } = await import('../models/db.js'));
  const { default: router } = await import('../routes/index.js');
  const { protectDocumentUploads } = await import('../middleware/privateDocuments.js');
  const { User } = await import('../models/userModel.js');
  const { SchoolYear } = await import('../models/schoolYearModel.js');
  const { Program } = await import('../models/programModel.js');
  const { Subject } = await import('../models/subjectModel.js');
  const { Section } = await import('../models/sectionModel.js');
  const { ClassSchedule } = await import('../models/classScheduleModel.js');
  const { EnrollmentRecord } = await import('../models/enrollmentRecordModel.js');
  const { initializeAdmission } = await import('../services/admissionPolicy.js');
  const { initializeEnrollmentGuide } = await import('../services/enrollmentGuide.js');
  const { initializeSchoolProfile } = await import('../services/schoolProfile.js');
  await sequelize.sync({ alter: false });
  await initializeAdmission(sequelize); await initializeEnrollmentGuide(); await initializeSchoolProfile();
  const makeUser = (name, role = 'student') => User.create({ name, email: `${name.toLowerCase()}@example.invalid`, password: 'synthetic-hash-not-used', role, isActive: true, isVerified: true });
  const admin = await makeUser('Admin', 'admin'), registrar = await makeUser('Registrar', 'registrar'), teacher = await makeUser('Teacher', 'teacher');
  const student = await makeUser('Student'), outsider = await makeUser('Outsider'), shs = await makeUser('SHS'), ssc = await makeUser('SSC'), draftStudent = await makeUser('Draft');
  await SchoolYear.create({ year: '2026-2027', isActive: true });
  await Program.bulkCreate([{ code: 'JHS', name: 'Junior High School' }, { code: 'SHS', name: 'Senior High School' }]);
  const subject = await Subject.create({ code: 'TESTSCI7', description: 'Synthetic Science 7', programCode: 'JHS', gradeLevel: 7, semester: '1st', units: 1 });
  await Section.create({ code: 'TEST-OLD7', course: 'JHS', yearLevel: 7, semester: '1st', schoolYear: '2025-2026', capacity: 20 });
  const section = await Section.create({ code: 'TEST-REG7', course: 'JHS', yearLevel: 7, semester: '1st', schoolYear: '2026-2027', capacity: 20, instructor: 'Synthetic Teacher', teacherId: teacher.id });
  const sscSection = await Section.create({ code: 'TEST-SSC7', course: 'JHS', yearLevel: 7, strand: 'SSC', semester: '1st', schoolYear: '2026-2027', capacity: 20 });
  await ClassSchedule.create({ subjectId: subject.id, subjectCode: subject.code, subjectName: subject.description, sectionId: section.id, sectionName: section.code, teacherId: teacher.id, teacherName: teacher.name, dayOfWeek: 'Monday', startTime: '08:00', endTime: '09:00', schoolYear: '2026-2027', semester: '1st', room: 'TEST101' });
  const app = express(); app.use(express.json()); app.use(session({ secret: 'isolated-session', resave: false, saveUninitialized: false })); app.use(protectDocumentUploads(path.join(scratchFiles, 'public'))); app.use(express.static(path.join(scratchFiles, 'public'))); app.use(router);
  server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function call(user, method, url, body) {
    const headers = user ? { Authorization: `Bearer ${jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET)}` } : {};
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const response = await fetch(base + url, { method, headers, body: body ? body instanceof FormData ? body : JSON.stringify(body) : undefined });
    const data = await response.json(); return { code: response.status, data };
  }
  function expect(result, code, label) { assert.equal(result.code, code, `${label}: ${JSON.stringify(result.data)}`); checks.push(label); return result.data; }
  const payload = { educationLevel: 'JHS', gradeLevel: 'Grade 7', enrollmentType: 'new', studentType: 'New', firstName: 'Synthetic', familyName: 'Student', sex: 'Male', dateOfBirth: '2010-01-01', academicYear: '2026-2027', sscApplied: false };
  const upload = async (who, id, keys) => {
    const form = new FormData(); for (const key of keys) form.append(key, new Blob(['%PDF-1.4 synthetic test'], { type: 'application/pdf' }), `${key}.pdf`);
    return call(who, 'POST', `/api/enrollments/${id}/documents`, form);
  };
  expect(await call(null, 'POST', '/api/enrollments', payload), 401, 'Anonymous application blocked');
  expect(await call(student, 'PUT', '/api/admin/admission-settings', {}), 403, 'Student settings edit blocked');
  const first = expect(await call(student, 'POST', '/api/enrollments', payload), 201, 'JHS application draft created');
  const id = first.enrollment.id;
  assert.equal(first.enrollment.status, 'draft');
  expect(await call(outsider, 'GET', `/api/enrollments/${id}/admission-policy`), 403, 'Other student snapshot access blocked');
  expect(await call(outsider, 'POST', `/api/enrollments/${id}/submit`), 403, 'Other student submission blocked');
  expect(await call(student, 'POST', `/api/enrollments/${id}/submit`), 400, 'Missing documents block submission');
  expect(await upload(student, id, ['f138']), 200, 'Report card upload');
  expect(await call(student, 'POST', `/api/enrollments/${id}/submit`), 400, 'Partial documents still block submission');
  expect(await upload(student, id, ['cert']), 200, 'Good moral upload');
  const documents = expect(await call(student, 'GET', `/api/enrollments/${id}/documents`), 200, 'Document metadata readable by owner');
  const privatePath = documents[0].filePath;
  const ownerToken = jwt.sign({ id: student.id }, process.env.JWT_SECRET);
  assert.equal((await fetch(base + privatePath)).status, 401); checks.push('Anonymous raw document access blocked');
  assert.equal((await fetch(base + privatePath, { headers: { Authorization: `Bearer ${jwt.sign({ id: outsider.id }, process.env.JWT_SECRET)}` } })).status, 403); checks.push('Other student raw document access blocked');
  const privateFile = await fetch(base + privatePath, { headers: { Authorization: `Bearer ${ownerToken}` } });
  assert.equal(privateFile.status, 200); assert.ok((await privateFile.text()).startsWith('%PDF')); checks.push('Owner can view uploaded document');
  assert.equal((await fetch(base + privatePath.replace('/documents/', '/%64ocuments/'))).status, 401); checks.push('Encoded upload path cannot bypass authorization');
  const me = await fetch(base + '/api/auth/me', { headers: { Authorization: `Bearer ${ownerToken}` } });
  const cookie = me.headers.get('set-cookie')?.split(';')[0]; assert.ok(cookie);
  assert.equal((await fetch(base + privatePath, { headers: { Cookie: cookie } })).status, 200); checks.push('Browser session permits image/PDF previews');

  expect(await call(student, 'POST', `/api/enrollments/${id}/submit`), 200, 'Complete application submitted');
  expect(await call(student, 'POST', `/api/enrollments/${id}/submit`), 200, 'Submission retry is idempotent');
  expect(await call(student, 'POST', '/api/enrollments', payload), 400, 'Duplicate application blocked');
  expect(await call(registrar, 'POST', `/api/registrar/enrollments/${id}/return`, { remarks: 'Synthetic correction request' }), 200, 'Registrar returns application');
  expect(await call(student, 'POST', `/api/enrollments/${id}/resubmit`), 200, 'Student resubmits returned application');
  expect(await call(registrar, 'POST', `/api/registrar/enrollments/${id}/verify`, {}), 200, 'Registrar verifies application');
  const approved = expect(await call(admin, 'POST', `/api/admin/enrollments/${id}/approve`, {}), 200, 'Admin approves and assigns section');
  assert.equal(approved.enrollment.status, 'enrolled'); assert.equal(approved.enrollment.sectionId, section.id);
  assert.match(approved.enrollment.studentNumber, /^\d{4}-\d{5}$/);
  const subjects = expect(await call(student, 'GET', `/api/enrollments/${id}/subjects`), 200, 'Student enrolled subjects readable');
  assert.ok(subjects.subjects.length > 0);
  const schedule = expect(await call(student, 'GET', '/api/student/my-schedule'), 200, 'Assigned class schedule readable');
  assert.equal(schedule.schedules.length, 1);
  expect(await call(registrar, 'GET', '/api/registrar/stats'), 200, 'Registrar stats SQL succeeds');
  const draft = expect(await call(draftStudent, 'POST', '/api/enrollments', payload), 201, 'Second draft created');
  expect(await call(admin, 'POST', `/api/admin/enrollments/${draft.enrollment.id}/approve`, {}), 400, 'Approval of incomplete draft blocked');
  const before = (await Section.findByPk(section.id)).currentEnrollment;
  expect(await call(admin, 'POST', `/api/admin/enrollments/${id}/approve`, {}), 200, 'Repeated approval is safe');
  assert.equal((await Section.findByPk(section.id)).currentEnrollment, before, 'Repeated approval must not increment section occupancy');
  const settings = expect(await call(admin, 'GET', '/api/admission-settings'), 200, 'Admission settings readable');
  const revised = structuredClone(settings.content); revised.ssc.minimumAverage = 90; revised.strands.find(item => item.name === 'HUMSS').active = false;
  expect(await call(admin, 'PUT', '/api/admin/admission-settings', { revision: settings.revision, content: revised }), 200, 'Admin changes SSC/strand rules');
  expect(await call(shs, 'POST', '/api/enrollments', { ...payload, educationLevel: 'SHS', gradeLevel: 'Grade 11', strand: 'HUMSS' }), 400, 'Disabled SHS strand blocked');
  const report = new FormData(); report.append('sscCard', new Blob(['%PDF-test'], { type: 'application/pdf' }), 'ssc.pdf'); report.append('grade6Average', '89');
  expect(await call(ssc, 'POST', '/api/enrollments/ssc-application', report), 400, 'SSC below current threshold blocked');
  const validReport = new FormData(); validReport.append('sscCard', new Blob(['%PDF-test'], { type: 'application/pdf' }), 'ssc.pdf'); validReport.append('grade6Average', '95');
  const sscApplication = expect(await call(ssc, 'POST', '/api/enrollments/ssc-application', validReport), 201, 'Eligible SSC report-card application created');
  const sid = sscApplication.enrollmentId;
  expect(await call(registrar, 'PUT', `/api/registrar/enrollments/${sid}/ssc-schedule`, { examDate: '2026-11-15T09:00', passingScore: 75 }), 200, 'SSC exam scheduled');
  expect(await call(registrar, 'PUT', `/api/registrar/enrollments/${sid}/ssc-result`, { examScore: 90 }), 200, 'SSC pass result recorded');
  expect(await call(ssc, 'PUT', `/api/enrollments/${sid}/ssc-choice`, { choice: 'SSC' }), 200, 'Student selects SSC class');
  expect(await call(ssc, 'PUT', `/api/enrollments/${sid}`, { ...payload, sscApplied: true, grade6Average: 95 }), 200, 'SSC placeholder completed');
  expect(await upload(ssc, sid, ['f138', 'cert']), 200, 'SSC enrollment documents uploaded');
  expect(await call(ssc, 'POST', `/api/enrollments/${sid}/submit`), 200, 'SSC full enrollment submitted');
  expect(await call(registrar, 'POST', `/api/registrar/enrollments/${sid}/verify`, {}), 200, 'SSC documents verified');
  const finalSSC = expect(await call(admin, 'POST', `/api/admin/enrollments/${sid}/approve`, {}), 200, 'SSC approved');
  assert.equal(finalSSC.enrollment.sectionId, sscSection.id);

  const shsSubject = await Subject.create({ code: 'TESTSTEM11', description: 'Synthetic STEM Science', programCode: 'SHS', gradeLevel: 11, strand: 'STEM', semester: '1st', units: 1 });
  const shsSection = await Section.create({ code: 'TEST-STEM11', course: 'SHS', yearLevel: 11, strand: 'STEM', semester: '1st', schoolYear: '2026-2027', capacity: 20 });
  const shsDraft = expect(await call(shs, 'POST', '/api/enrollments', { ...payload, educationLevel: 'SHS', gradeLevel: 'Grade 11', strand: 'STEM' }), 201, 'Enabled SHS strand application created');
  const hid = shsDraft.enrollment.id;
  expect(await upload(shs, hid, ['f138','cert']), 200, 'SHS documents uploaded');
  expect(await call(shs, 'POST', `/api/enrollments/${hid}/submit`), 200, 'SHS submitted');
  expect(await call(registrar, 'POST', `/api/registrar/enrollments/${hid}/verify`, {}), 200, 'SHS verified');
  const bulk = expect(await call(admin, 'POST', '/api/admin/enrollments/bulk-approve', {}), 200, 'Bulk verified approval succeeds on MySQL');
  assert.equal(bulk.count, 1); assert.equal((await EnrollmentRecord.findByPk(hid)).sectionId, shsSection.id);
  const beforeBulk = (await Section.findByPk(shsSection.id)).currentEnrollment;
  expect(await call(admin, 'POST', '/api/admin/enrollments/bulk-approve', { ids: [hid] }), 200, 'Repeated bulk approval skips enrolled records');
  assert.equal((await Section.findByPk(shsSection.id)).currentEnrollment, beforeBulk);
  const waitingUser = await makeUser('Waiting');
  const waiting = expect(await call(waitingUser, 'POST', '/api/enrollments', { ...payload, gradeLevel: 'Grade 10', enrollmentType: 'old' }), 201, 'Continuing JHS application draft');
  const wid = waiting.enrollment.id;
  expect(await upload(waitingUser, wid, ['f138','cert']), 200, 'Continuing JHS documents uploaded');
  expect(await call(waitingUser, 'POST', `/api/enrollments/${wid}/submit`), 200, 'Continuing JHS submitted');
  const waitingApproved = expect(await call(registrar, 'POST', `/api/registrar/enrollments/${wid}/approve`, {}), 200, 'Registrar approval handles no matching section');
  assert.equal(waitingApproved.enrollment.status, 'approved'); assert.equal(waitingApproved.enrollment.sectionId, null); checks.push('No wrong-grade or wrong-year section fallback');
  const transfer = await makeUser('Transferee');
  const t = expect(await call(transfer, 'POST', '/api/enrollments', { ...payload, gradeLevel: 'Grade 8', enrollmentType: 'transferee' }), 201, 'Transferee draft created');
  expect(await upload(transfer, t.enrollment.id, ['f138','cert']), 200, 'Transferee partial documents uploaded');
  expect(await call(transfer, 'POST', `/api/enrollments/${t.enrollment.id}/submit`), 400, 'Transferee transfer credentials enforced');
  expect(await upload(transfer, t.enrollment.id, ['f137a','f137e']), 200, 'Transferee transfer credentials uploaded');
  expect(await call(transfer, 'POST', `/api/enrollments/${t.enrollment.id}/submit`), 200, 'Complete transferee application submitted');
  const settingsNow = expect(await call(admin, 'GET', '/api/admission-settings'), 200, 'Current settings revision read');
  settingsNow.content.requirements.JHS.new.push({ key: 'birthCert', required: true });
  expect(await call(admin, 'PUT', '/api/admin/admission-settings', settingsNow), 200, 'New document rule saved');
  const pinned = expect(await call(draftStudent, 'GET', `/api/enrollments/${draft.enrollment.id}/admission-policy`), 200, 'Older draft rules remain pinned');
  assert.ok(!pinned.checklist.some(doc => doc.key === 'birthCert')); checks.push('Settings edits do not retroactively change saved applications');
  const { generateStudentNumber } = await import('../services/studentNumbers.js');
  const numbers = await Promise.all(Array.from({ length: 5 }, () => generateStudentNumber()));
  assert.equal(new Set(numbers).size, 5); checks.push('Concurrent student numbers are unique');
  const pdf = await fetch(base + `/api/enrollments/${id}/pdf`, { headers: { Authorization: `Bearer ${ownerToken}` } });
  assert.equal(pdf.status, 200); assert.ok(Buffer.from(await pdf.arrayBuffer()).subarray(0,4).equals(Buffer.from('%PDF'))); checks.push('Enrollment PDF download generates a PDF');
  const schedulePDF = await fetch(base + '/api/student/my-schedule/pdf', { headers: { Authorization: `Bearer ${ownerToken}` } });
  assert.equal(schedulePDF.status, 200); assert.ok(Buffer.from(await schedulePDF.arrayBuffer()).subarray(0,4).equals(Buffer.from('%PDF'))); checks.push('Schedule PDF download generates a PDF');
  if (process.argv.includes('--browser')) {
    const require = createRequire(path.join(os.tmpdir(), 'gabai-mobile-check', 'package.json'));
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    try {
      const browserStudent = await makeUser('BrowserStudent');
      const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
      await context.addInitScript(({ user, token }) => { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); }, { user: { id: browserStudent.id, role: 'student', name: 'Browser Student' }, token: jwt.sign({ id: browserStudent.id, role: 'student' }, process.env.JWT_SECRET) });
      const page = await context.newPage(); const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        const result = await route.fetch({ url: base + url.pathname + url.search });
        await route.fulfill({ response: result, headers: { ...result.headers(), 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true' } });
      });
      await page.goto('http://localhost:5173/hs-enrollment-form', { waitUntil: 'networkidle' });
      await page.locator('select').first().selectOption({ label: 'Grade 7' });
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.getByPlaceholder('Last Name', { exact: true }).fill('Student');
      await page.getByPlaceholder('First Name', { exact: true }).fill('Browser');
      await page.locator('select').selectOption('Male');
      await page.locator('input[type=date]').fill('2010-01-01');
      for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.getByRole('button', { name: 'Submit Enrollment', exact: true }).click();
      await page.getByText(/Please upload required documents:/).waitFor();
      checks.push('Real browser displays server-configured required documents');
      const uploads = page.locator('input[type=file]');
      while (await uploads.count()) await uploads.first().setInputFiles({ name: 'browser-test.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 synthetic upload') });
      await page.getByRole('button', { name: 'Submit Enrollment', exact: true }).click();
      await page.waitForURL('**/my-enrollments');
      const browserRecord = await EnrollmentRecord.findOne({ where: { userId: browserStudent.id } });
      assert.equal(browserRecord.status, 'submitted'); assert.equal(browserRecord.admissionRevision, 3);
      assert.deepEqual(errors, []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(scratchFiles, 'mobile-submission.png'), fullPage: true });
      checks.push('Mobile browser completes real HTTP + MySQL enrollment submission');
      await context.close();
    } finally { await browser.close(); }
  }
  console.log(JSON.stringify({ passed: checks.length, checks, emailsIntercepted: sentEmails, realEmailsSent: 0, realStudentDataChanged: false }, null, 2));
} catch (error) {
  console.error('FLOW CHECK FAILED:', error.message); console.log(JSON.stringify({ passedBeforeFailure: checks.length, checks }, null, 2)); process.exitCode = 1;
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  if (sequelize) await sequelize.close();
  process.chdir(originalCwd);
  if (connection) {
    if (created && /^gabai_flow_test_\d+$/.test(scratch) && scratch !== source) await connection.query(`DROP DATABASE ${mysql.escapeId(scratch)}`);
    await connection.end();
  }
  // Generated test files remain in the OS temp folder for inspection.
}
