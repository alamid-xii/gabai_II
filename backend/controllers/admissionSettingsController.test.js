import test from 'node:test';
import assert from 'node:assert/strict';
import { AdmissionSettings } from '../models/admissionSettingsModel.js';
import { EnrollmentRecord } from '../models/enrollmentRecordModel.js';
import { EnrollmentDocument } from '../models/enrollmentDocumentModel.js';
import { sequelize } from '../models/db.js';
import { initialAdmission, validateAdmission, validateSelection, validateDocuments, policyFor, legacyAdmission } from '../services/admissionPolicy.js';
import { createSubmissionHandler, updateAdmissionSettings, getApplicationPolicy } from './admissionSettingsController.js';

const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
test('validates settings, strand choices, SSC eligibility, and required uploads independently of the browser', () => {
  const policy = validateAdmission(initialAdmission);
  assert.equal(policy.ssc.minimumAverage, 85);
  assert.throws(() => validateAdmission({ ...policy, ssc: { enabled: true, minimumAverage: 101 } }));
  assert.throws(() => validateAdmission({ ...policy, documents: [{ key: '../escape', label: 'Invalid' }] }));
  assert.throws(() => validateAdmission({ ...policy, strands: [...policy.strands, policy.strands[0]] }));
  const disabled = structuredClone(policy); disabled.strands[0].active = false;
  assert.throws(() => validateSelection(disabled, { educationLevel: 'SHS', gradeLevel: 'Grade 11', enrollmentType: 'new', strand: 'STEM' }));
  const ssc = { educationLevel: 'JHS', gradeLevel: 'Grade 7', enrollmentType: 'new', sscApplied: true, grade6Average: 84 };
  assert.throws(() => validateSelection(policy, ssc));
  validateSelection(policy, { ...ssc, grade6Average: 85 });
  assert.throws(() => validateSelection({ ...policy, ssc: { enabled: false, minimumAverage: 85 } }, { ...ssc, grade6Average: 99 }));
  assert.throws(() => validateDocuments(policy, ssc, [{ documentType: 'sscCard' }]));
  validateDocuments(policy, ssc, [{ documentType: 'f138' }, { documentType: 'cert' }]);
});
test('snapshot rules survive current settings changes; legacy continuing students retain previous requirements', async () => {
  const original = AdmissionSettings.findByPk;
  try {
    const newer = structuredClone(initialAdmission); newer.ssc.minimumAverage = 95;
    AdmissionSettings.findByPk = async () => ({ content: newer, revision: 2 });
    const originalRules = structuredClone(initialAdmission);
    const saved = await policyFor({ admissionPolicy: originalRules, admissionRevision: 1, status: 'submitted' });
    assert.equal(saved.policy.ssc.minimumAverage, 85);
    assert.equal((await policyFor({ status: 'draft' })).policy.ssc.minimumAverage, 95);
    const old = await policyFor({ status: 'submitted' });
    assert.equal(old.revision, 0);
    validateDocuments(old.policy, { educationLevel: 'JHS', gradeLevel: 'Grade 8', enrollmentType: 'old' }, []);
    assert.throws(() => validateDocuments(legacyAdmission(), { educationLevel: 'JHS', gradeLevel: 'Grade 7', enrollmentType: 'new' }, []));
  } finally { AdmissionSettings.findByPk = original; }
});
test('submission checks persisted documents and ownership before changing draft status', async () => {
  const original = { transaction: sequelize.transaction, enrollment: EnrollmentRecord.findByPk, documents: EnrollmentDocument.findAll };
  const enrollment = { id: 1, userId: 11, status: 'draft', educationLevel: 'SHS', gradeLevel: 'Grade 11', enrollmentType: 'new', strand: 'STEM', familyName: 'Student', firstName: 'Test', sex: 'Male', dateOfBirth: '2010-01-01', admissionPolicy: structuredClone(initialAdmission), admissionRevision: 1,
    async update(values) { Object.assign(this, values); }, toJSON() { return { id: this.id, status: this.status }; } };
  let docs = [], notifications = 0;
  const handler = createSubmissionHandler({ notify: async () => { notifications++; } });
  try {
    sequelize.transaction = async callback => callback({ LOCK: { UPDATE: 'UPDATE' } });
    EnrollmentRecord.findByPk = async () => enrollment;
    EnrollmentDocument.findAll = async () => docs;
    let res = response(); await handler({ params: { id: 1 }, user: { id: 22 } }, res);
    assert.equal(res.code, 403); assert.equal(enrollment.status, 'draft');
    res = response(); await handler({ params: { id: 1 }, user: { id: 11 } }, res);
    assert.equal(res.code, 400); assert.match(res.body.message, /required documents/); assert.equal(notifications, 0);
    docs = [{ documentType: 'f138' }, { documentType: 'cert' }];
    res = response(); await handler({ params: { id: 1 }, user: { id: 11 } }, res);
    assert.equal(res.code, 200); assert.equal(enrollment.status, 'submitted'); assert.equal(notifications, 1);
    res = response(); await handler({ params: { id: 1 }, user: { id: 11 } }, res);
    assert.equal(res.code, 200); assert.equal(notifications, 1);
    res = response(); await getApplicationPolicy({ params: { id: 1 }, user: { id: 22, role: 'student' } }, res);
    assert.equal(res.code, 403);
  } finally { sequelize.transaction = original.transaction; EnrollmentRecord.findByPk = original.enrollment; EnrollmentDocument.findAll = original.documents; }
});
test('settings reject stale revisions and preserve server validation', async () => {
  const original = AdmissionSettings.update; let calls = 0;
  try {
    AdmissionSettings.update = async () => { calls++; return [0]; };
    let res = response(); await updateAdmissionSettings({ body: { revision: 1, content: initialAdmission } }, res);
    assert.equal(res.code, 409);
    res = response(); await updateAdmissionSettings({ body: { revision: 1, content: { ...initialAdmission, ssc: { enabled: true, minimumAverage: '85' } } } }, res);
    assert.equal(res.code, 400); assert.equal(calls, 1);
  } finally { AdmissionSettings.update = original; }
});
test('creation persists a server-owned draft policy rather than trusting client status or ownership', async () => {
  const original = { authenticate: sequelize.authenticate, query: sequelize.query, create: EnrollmentRecord.create, settings: AdmissionSettings.findByPk };
  let saved;
  try {
    sequelize.authenticate = async () => {};
    sequelize.query = async sql => sql.includes('SELECT year') ? [[{ year: '2026-2027' }]] : [[]];
    AdmissionSettings.findByPk = async () => ({ content: structuredClone(initialAdmission), revision: 4 });
    EnrollmentRecord.create = async values => { saved = values; return { ...values, id: 70 }; };
    const { createEnrollment } = await import('./enrollmentController.js');
    const res = response();
    await createEnrollment({ user: { id: 11 }, body: { userId: 22, admissionPolicy: {}, admissionRevision: 99, status: 'enrolled', educationLevel: 'SHS', gradeLevel: 'Grade 11', enrollmentType: 'new', strand: 'STEM', studentNumber: '2026-00001', firstName: 'Test', familyName: 'Student' } }, res);
    assert.equal(res.code, 201);
    assert.equal(saved.userId, 11); assert.equal(saved.status, 'draft'); assert.equal(saved.admissionRevision, 4);
    assert.equal(saved.admissionPolicy.ssc.minimumAverage, 85);
  } finally {
    sequelize.authenticate = original.authenticate; sequelize.query = original.query; EnrollmentRecord.create = original.create; AdmissionSettings.findByPk = original.settings;
  }
});
test('continuing SSC enrollment enforces maintaining grade via system grades or fallback GWA', async () => {
  const original = { authenticate: sequelize.authenticate, query: sequelize.query, create: EnrollmentRecord.create, settings: AdmissionSettings.findByPk };
  let saved;
  try {
    sequelize.authenticate = async () => {};
    AdmissionSettings.findByPk = async () => ({ content: { ...structuredClone(initialAdmission), ssc: { enabled: true, minimumAverage: 85, maintainingAverage: 85 } }, revision: 5 });
    EnrollmentRecord.create = async values => { saved = values; return { ...values, id: 71 }; };
    const { createEnrollment } = await import('./enrollmentController.js');

    // 1. System grades below maintaining average (83 < 85) -> rejected for SSC
    sequelize.query = async sql => {
      if (sql.includes('SELECT id, gradeLevel, sscClass')) return [[{ id: 50, gradeLevel: 'Grade 7', sscClass: 'SSC', status: 'completed' }]];
      if (sql.includes('FROM enrollment_subjects')) return [[{ q1: 83, q2: 83, q3: 83, q4: null, finalGrade: 83, remarks: 'Passed', status: 'enrolled' }]];
      if (sql.includes('SELECT year')) return [[{ year: '2026-2027' }]];
      return [[]];
    };
    let res = response();
    await createEnrollment({ user: { id: 11 }, body: { educationLevel: 'JHS', gradeLevel: 'Grade 8', enrollmentType: 'old', studentType: 'Old', sscClass: 'SSC', firstName: 'Test', familyName: 'Student' } }, res);
    assert.equal(res.code, 400);
    assert.equal(res.body.sscDisqualified, true);

    // 2. System grades meeting maintaining average (88 >= 85), test Student ID confirmation (A-9869)
    sequelize.query = async sql => {
      if (sql.includes('SELECT id, gradeLevel, sscClass')) return [[{ id: 50, gradeLevel: 'Grade 7', sscClass: 'SSC', status: 'completed' }]];
      if (sql.includes('FROM enrollment_subjects')) return [[{ q1: 88, q2: 88, q3: 88, q4: null, finalGrade: 88, remarks: 'Passed', status: 'enrolled' }]];
      if (sql.includes('SELECT studentNumber FROM enrollment_records')) return [[{ studentNumber: 'A-9869' }]];
      if (sql.includes('SELECT year')) return [[{ year: '2026-2027' }]];
      return [[]];
    };
    res = response();
    await createEnrollment({ user: { id: 11 }, body: { educationLevel: 'JHS', gradeLevel: 'Grade 8', enrollmentType: 'old', studentType: 'Old', sscClass: 'SSC', studentNumber: 'A-1111', firstName: 'Test', familyName: 'Student' } }, res);
    assert.equal(res.code, 400);
    assert.match(res.body.message, /does not match/);

    res = response();
    await createEnrollment({ user: { id: 11 }, body: { educationLevel: 'JHS', gradeLevel: 'Grade 8', enrollmentType: 'old', studentType: 'Old', sscClass: 'SSC', studentNumber: 'a-9869', firstName: 'Test', familyName: 'Student' } }, res);
    assert.equal(res.code, 201);
    assert.equal(saved.sscClass, 'SSC');
    assert.equal(saved.studentNumber, 'A-9869');
  } finally {
    sequelize.authenticate = original.authenticate; sequelize.query = original.query; EnrollmentRecord.create = original.create; AdmissionSettings.findByPk = original.settings;
  }
});
test.after(async () => { await sequelize.close(); });
