import test from 'node:test';
import assert from 'node:assert/strict';
import { sequelize } from '../models/db.js';
import { getRegistrarEnrollments } from './registrarController.js';
test('SSC applicant records include account name, email, and mobile number', async () => {
 const original = sequelize.query;
 try {
  sequelize.query = async (sql, options) => {
   if (sql.includes('SELECT year FROM school_years')) return [[{ year: '2026-2027' }]];
   assert.ok(sql.includes('u.name as user_name'));
   assert.ok(sql.includes('u.email as user_email'));
   assert.ok(sql.includes('u.mobileNumber as user_mobileNumber'));
   assert.deepEqual(options.replacements, ['2026-2027', 'pending_exam']);
   return [[{ id: 1, user_name: 'Account Full Name', user_email: 'student@example.com', user_mobileNumber: '09123456789' }]];
  };
  const response = { status(code) { throw Error(`Unexpected status ${code}`); }, json(body) { this.body = body; } };
  await getRegistrarEnrollments({ query: { status: 'pending_exam' } }, response);
  assert.equal(response.body[0].user_mobileNumber, '09123456789');
 } finally { sequelize.query = original; }
});

test('SSC results unlock a draft form, assign the right class, and notify the account', async () => {
 const { createSSCResultHandler } = await import('./registrarController.js');
 const originals = { query: sequelize.query, transaction: sequelize.transaction };
 try {
  sequelize.transaction = async fn => fn({});
  for (const score of [90, 0]) {
   let saved, notified;
   sequelize.query = async (sql, options) => {
    if (sql.includes('FROM users')) return [[{ id: 5, email: 'test@example.com' }]];
    if (sql.startsWith('SELECT')) return [[{ id: 1, userId: 5, educationLevel: 'JHS', sscApplied: 1, status: 'pending_exam', sscExamDate: '2026-11-01', sscPassingScore: 75 }]];
    saved = options.replacements; return [null, 1];
   };
   const handler = createSSCResultHandler({ notify: async (user, enrollment) => { notified = enrollment; return true; } });
   const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
   await handler({ params: { id: 1 }, body: { examScore: score } }, res);
   assert.equal(res.code, 200); assert.equal(saved[4], 'draft');
   assert.equal(notified.sscResult, score === 90 ? 'passed' : 'failed');
   assert.equal(notified.sscClass, score === 90 ? 'SSC' : 'Regular');
   assert.equal(notified.sscChoiceMade, true); assert.equal(res.body.emailSent, true);
  }
 } finally { sequelize.query = originals.query; sequelize.transaction = originals.transaction; }
});
test('unscheduled SSC applicants cannot receive a result', async () => {
 const { createSSCResultHandler } = await import('./registrarController.js');
 const originals = { query: sequelize.query, transaction: sequelize.transaction };
 try {
  sequelize.transaction = async fn => fn({});
  sequelize.query = async () => [[{ id: 1, educationLevel: 'JHS', sscApplied: 1, status: 'pending_exam' }]];
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  await createSSCResultHandler({ notify: async () => { throw Error('Must not send'); } })({ params: { id: 1 }, body: { examScore: 90 } }, res);
  assert.equal(res.code, 409);
 } finally { sequelize.query = originals.query; sequelize.transaction = originals.transaction; }
});
