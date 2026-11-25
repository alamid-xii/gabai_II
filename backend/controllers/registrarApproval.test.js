import test from 'node:test';
import assert from 'node:assert/strict';
import { sequelize } from '../models/db.js';
import { EnrollmentDocument } from '../models/enrollmentDocumentModel.js';
import { initialAdmission } from '../services/admissionPolicy.js';
import { approveEnrollment, verifyEnrollment, updateStudentNumber } from './registrarController.js';
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

test('returned and draft applications cannot be approved or verified before resubmission', async () => {
  const original = sequelize.query;
  try {
    for (const status of ['returned', 'draft']) {
      for (const handler of [approveEnrollment, verifyEnrollment]) {
        let queries = 0;
        sequelize.query = async sql => {
          queries += 1;
          assert.ok(sql.startsWith('SELECT'));
          return [[{ id: 1, status }]];
        };
        const res = response();
        await handler({ params: { id: 1 }, body: {}, user: { id: 9 } }, res);
        assert.equal(res.code, 400);
        assert.equal(queries, 1);
      }
    }
  } finally { sequelize.query = original; }
});

test('submitted applications and legacy verified applications can be approved after review', async () => {
  const originals = { query: sequelize.query, transaction: sequelize.transaction, documents: EnrollmentDocument.findAll };
  try {
    sequelize.transaction = async () => ({ assigned: false, reason: 'No available section' });
    EnrollmentDocument.findAll = async () => [];
    for (const status of ['submitted', 'verified']) {
      const policy = structuredClone(initialAdmission);
      policy.requirements.JHS.new = [];
      const record = { id: 1, userId: 7, status, firstName: 'Student', familyName: 'Applicant', educationLevel: 'JHS', gradeLevel: 'Grade 7', enrollmentType: 'new', studentNumber: '2026-00001', admissionPolicy: policy };
      let approved = false;
      sequelize.query = async sql => {
        if (sql.includes('FROM users')) return [[]];
        if (sql.startsWith('SELECT')) return [[record]];
        assert.ok(sql.includes("SET status = 'approved'"));
        approved = true;
        record.status = 'approved';
        return [null, 1];
      };
      const res = response();
      await approveEnrollment({ params: { id: 1 }, body: {}, user: { id: 9 } }, res);
      assert.equal(res.code, 200);
      assert.equal(approved, true);
      assert.equal(res.body.enrollment.status, 'approved');
    }
  } finally {
    sequelize.query = originals.query;
    sequelize.transaction = originals.transaction;
    EnrollmentDocument.findAll = originals.documents;
  }
});

test('registrar can assign and edit valid student numbers and rejects invalid or duplicate IDs', async () => {
  const originals = { query: sequelize.query, transaction: sequelize.transaction, documents: EnrollmentDocument.findAll };
  try {
    sequelize.transaction = async () => ({ assigned: false, reason: 'No available section' });
    EnrollmentDocument.findAll = async () => [];
    const policy = structuredClone(initialAdmission);
    policy.requirements.JHS.new = [];

    // 1. Valid registrar-supplied studentNumber on approve
    const record = { id: 2, userId: 10, status: 'submitted', firstName: 'Ana', familyName: 'Cruz', educationLevel: 'JHS', gradeLevel: 'Grade 7', enrollmentType: 'new', studentNumber: null, admissionPolicy: policy };
    sequelize.query = async (sql, opts) => {
      if (sql.includes('UPPER(studentNumber)')) return [[]];
      if (sql.includes('FROM users')) return [[]];
      if (sql.startsWith('SELECT')) return [[record]];
      if (sql.includes('UPDATE enrollment_records')) {
        record.status = 'approved';
        record.studentNumber = opts.replacements[1];
        return [null, 1];
      }
      return [[]];
    };
    let res = response();
    await approveEnrollment({ params: { id: 2 }, body: { studentNumber: '2026-0001' }, user: { id: 9 } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.enrollment.studentNumber, '2026-0001');

    // 2. Invalid format rejected with 400
    res = response();
    await updateStudentNumber({ params: { id: 2 }, body: { studentNumber: 'INVALID' }, user: { id: 9 } }, res);
    assert.equal(res.code, 400);

    // 3. Duplicate ID belonging to another student rejected with 409
    sequelize.query = async sql => {
      if (sql.includes('UPPER(studentNumber)')) return [[{ id: 99, userId: 55 }]];
      return [[record]];
    };
    res = response();
    await updateStudentNumber({ params: { id: 2 }, body: { studentNumber: 'A-9869' }, user: { id: 9 } }, res);
    assert.equal(res.code, 409);

    // 4. Valid edit succeeds
    sequelize.query = async (sql, opts) => {
      if (sql.includes('UPPER(studentNumber)')) return [[]];
      if (sql.includes('UPDATE enrollment_records')) {
        record.studentNumber = opts.replacements[0];
        return [null, 1];
      }
      return [[record]];
    };
    res = response();
    await updateStudentNumber({ params: { id: 2 }, body: { studentNumber: 'A-9869' }, user: { id: 9 } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.enrollment.studentNumber, 'A-9869');
  } finally {
    sequelize.query = originals.query;
    sequelize.transaction = originals.transaction;
    EnrollmentDocument.findAll = originals.documents;
  }
});
