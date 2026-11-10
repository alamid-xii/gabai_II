import test from 'node:test';
import assert from 'node:assert/strict';
import { sequelize } from '../models/db.js';
import { EnrollmentRecord } from '../models/enrollmentRecordModel.js';
import { initialAdmission } from '../services/admissionPolicy.js';

const authenticate = sequelize.authenticate;
let updateEnrollment, updateStudentProfileSections;
try {
  sequelize.authenticate = async () => {};
  ({ updateEnrollment, updateStudentProfileSections } = await import('./enrollmentController.js'));
} finally { sequelize.authenticate = authenticate; }
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

test('students cannot change submitted or approved enrollment details', async () => {
  const original = EnrollmentRecord.findByPk;
  try {
    for (const status of ['submitted', 'verified', 'approved', 'subjects_enrolled', 'enrolled', 'active', 'completed', 'rejected']) {
      let changed = false;
      EnrollmentRecord.findByPk = async () => ({ userId: 7, firstName: 'Student', sscApplied: true, sscResult: 'passed', status, update: async () => { changed = true; } });
      const res = response();
      await updateEnrollment({ params: { id: 1 }, user: { id: 7 }, body: { fatherName: 'Changed' } }, res);
      assert.equal(res.code, 400, status);
      assert.equal(changed, false);
    }
  } finally { EnrollmentRecord.findByPk = original; }
});

test('the profile endpoint also locks submitted enrollment snapshots', async () => {
  const original = EnrollmentRecord.findByPk;
  try {
    for (const status of ['submitted', 'verified', 'approved', 'enrolled', 'completed', 'rejected']) {
      let writes = 0;
      EnrollmentRecord.findByPk = async () => ({ userId: 7, firstName: 'Student', status, update: async () => { writes++; } });
      const res = response();
      await updateStudentProfileSections({ params: { id: 1 }, user: { id: 7, update: async () => { writes++; } }, body: { fatherName: 'Changed' } }, res);
      assert.equal(res.code, 400, status);
      assert.equal(writes, 0, status);
    }
  } finally { EnrollmentRecord.findByPk = original; }
});

test('the profile endpoint permits returned corrections and refuses future birthdays', async () => {
  const original = EnrollmentRecord.findByPk;
  try {
    let saved;
    const enrollment = { userId: 7, firstName: 'Student', familyName: 'Name', status: 'returned', update: async value => { saved = value; } };
    EnrollmentRecord.findByPk = async () => enrollment;
    const req = { params: { id: 1 }, user: { id: 7, update: async () => {} }, body: { fatherName: 'Juan D. Cruz Jr.' } };
    let res = response();
    await updateStudentProfileSections(req, res);
    assert.equal(res.code, 200);
    assert.equal(saved.fatherName, 'Juan D. Cruz Jr.');
    saved = null;
    res = response();
    await updateStudentProfileSections({ ...req, body: { dateOfBirth: '2099-01-01' } }, res);
    assert.equal(res.code, 400);
    assert.equal(saved, null);
  } finally { EnrollmentRecord.findByPk = original; }
});

test('drafts and returned applications accept corrections from their owner', async () => {
  const original = EnrollmentRecord.findByPk;
  try {
    for (const status of ['draft', 'returned']) {
      let saved;
      const data = { userId: 7, firstName: 'Student', status, educationLevel: 'JHS', gradeLevel: 'Grade 7', enrollmentType: 'new', admissionPolicy: initialAdmission };
      EnrollmentRecord.findByPk = async () => ({ ...data, toJSON: () => data, update: async value => { saved = value; } });
      const res = response();
      await updateEnrollment({ params: { id: 1 }, user: { id: 7 }, body: { fatherName: 'Juan D. Cruz Jr.' } }, res);
      assert.equal(res.code, 200, status);
      assert.equal(saved.fatherName, 'Juan D. Cruz Jr.');
      assert.equal(saved.status, status);
    }
  } finally { EnrollmentRecord.findByPk = original; }
});
