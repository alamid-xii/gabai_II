import test from 'node:test';
import assert from 'node:assert/strict';
import { sequelize } from '../models/db.js';
import { saveGrade, getStudentGrades, getSectionGrades, getGradeSheet } from './gradingController.js';
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const request = body => ({ user: { id: 7, name: 'Teacher', role: 'teacher' }, params: { enrollmentSubjectId: '10' }, body });
test('student grade access is denied before querying records', async () => {
  const original = sequelize.query;
  sequelize.query = async () => { throw new Error('Student must not query grades'); };
  try {
    const res = response(); await getStudentGrades({ user: { id: 5, role: 'student' }, params: { id: 1 } }, res);
    assert.equal(res.code, 403); assert.equal(res.body.grades, undefined);
  } finally { sequelize.query = original; }
});
test('rejects quarterly requests and invalid final grades', async () => {
  for (const body of [{ quarter: 'Q1', grade: 90 }, {}, { finalGrade: null }, { finalGrade: '' }, { finalGrade: '90oops' }, { finalGrade: 101 }, { finalGrade: -1 }, { finalGrade: true }, { finalGrade: [90] }]) {
    const res = response(); await saveGrade(request(body), res); assert.equal(res.code, 400);
  }
});
test('only assigned teachers can submit and only inside the year-end window', async () => {
  const original = sequelize.query;
  try {
    for (const scenario of ['unassigned', 'missing', 'closed', 'open', 'concurrent-close']) {
      const writes = [];
      sequelize.query = async (sql, options) => {
        if (sql.includes('SELECT es.*')) return [[...(scenario === 'unassigned' ? [] : [{ id: 10, sectionId: 3 }])]];
        if (sql.includes('SELECT gp.isOpen')) {
          assert.deepEqual(options.replacements, [3, 'FINAL']);
          return [scenario === 'missing' ? [] : [{ isOpen: scenario !== 'closed' }]];
        }
        writes.push(options.replacements); assert.ok(sql.includes("gp.quarter = 'FINAL' AND gp.isOpen = 1"));
        return [null, { affectedRows: scenario === 'concurrent-close' ? 0 : 1 }];
      };
      const res = response(); await saveGrade(request({ finalGrade: '88.25' }), res);
      assert.equal(res.code, { unassigned: 403, missing: 400, closed: 403, open: 200, 'concurrent-close': 409 }[scenario]);
      if (scenario === 'open') { assert.deepEqual(writes[0], [88.25, 'Passed', 10]); assert.equal(res.body.finalGrade, 88.25); }
      if (['unassigned', 'missing', 'closed'].includes(scenario)) assert.equal(writes.length, 0);
    }
  } finally { sequelize.query = original; }
});
test('staff section review includes a final grade without trimester grades', async () => {
  const original = sequelize.query;
  sequelize.query = async sql => sql.includes('FROM sections WHERE') ? [[{ id: 3 }]] : [[{ enrollmentSubjectId: 10, q1: null, q2: null, q3: null, finalGrade: 88, remarks: 'Passed' }]];
  try {
    const res = response(); await getSectionGrades({ params: { sectionId: '3' } }, res);
    assert.equal(res.body.grades[0].finalGrade, 88); assert.equal(res.body.grades[0].remarks, 'Passed');
  } finally { sequelize.query = original; }
});

test('student enrollment history omits computed grades while keeping SSC eligibility', async () => {
  const authenticate = sequelize.authenticate;
  sequelize.authenticate = async () => {};
  let getUserEnrollments;
  try { ({ getUserEnrollments } = await import('./enrollmentController.js')); }
  finally { sequelize.authenticate = authenticate; }
  const { EnrollmentRecord } = await import('../models/enrollmentRecordModel.js');
  const { AdmissionSettings } = await import('../models/admissionSettingsModel.js');
  const originals = { query: sequelize.query, findAll: EnrollmentRecord.findAll, settings: AdmissionSettings.findByPk };
  try {
    EnrollmentRecord.findAll = async () => [{ toJSON: () => ({ id: 1, userId: 5 }) }];
    AdmissionSettings.findByPk = async () => ({ content: { ssc: { minimumAverage: 85 } }, revision: 1 });
    sequelize.query = async () => [[{ finalGrade: 88, q1: null, q2: null, q3: null, q4: null, remarks: 'Passed' }]];
    const res = response(); await getUserEnrollments({ user: { id: 5, role: 'student' }, params: { userId: '5' } }, res);
    const serialized = JSON.parse(JSON.stringify(res.body));
    assert.equal(serialized[0].computedGwa, undefined);
    assert.equal(serialized[0].hasFailedSubject, undefined);
    assert.equal(serialized[0].sscEligible, true);
    assert.equal(serialized[0].gradesComplete, true);
  } finally {
    sequelize.query = originals.query; EnrollmentRecord.findAll = originals.findAll; AdmissionSettings.findByPk = originals.settings;
  }
});
