import test from 'node:test';
import assert from 'node:assert/strict';
import { sequelize } from '../models/db.js';
import { SchoolYear } from '../models/schoolYearModel.js';
const authenticate = sequelize.authenticate;
sequelize.authenticate = async () => {};
const { createSchoolYear, setActiveSchoolYear, closeSchoolYear, getYearEndSummary, createSubject, updateSubject } = await import('./academicController.js');
sequelize.authenticate = authenticate;
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const tx = { LOCK: { UPDATE: 'UPDATE' } };

test('school years require consecutive years and cannot be made active through creation', async () => {
  const original = SchoolYear.create;
  try {
    SchoolYear.create = async body => { assert.deepEqual(body, { year: '2026-2027', isActive: false }); return body; };
    for (const year of ['', '2026', '2026-2028', 2026]) {
      const res = response(); await createSchoolYear({ body: { year } }, res); assert.equal(res.code, 400);
    }
    const res = response(); await createSchoolYear({ body: { year: ' 2026-2027 ', isActive: true } }, res); assert.equal(res.code, 201);
  } finally { SchoolYear.create = original; }
});
test('activating a nonexistent year never deactivates the existing year', async () => {
  const originals = { transaction: sequelize.transaction, findAll: SchoolYear.findAll, update: SchoolYear.update };
  try {
    sequelize.transaction = async fn => fn(tx);
    SchoolYear.findAll = async () => [{ id: 1 }];
    let writes = 0; SchoolYear.update = async () => { writes++; };
    const res = response(); await setActiveSchoolYear({ params: { id: '9' } }, res);
    assert.equal(res.code, 404); assert.equal(writes, 0);
  } finally { sequelize.transaction = originals.transaction; SchoolYear.findAll = originals.findAll; SchoolYear.update = originals.update; }
});
test('completion requires a selected year, locked submissions, and complete subject grades', async () => {
  const originals = { transaction: sequelize.transaction, query: sequelize.query, findOne: SchoolYear.findOne };
  try {
    sequelize.transaction = async fn => fn(tx);
    SchoolYear.findOne = async options => { assert.equal(options.where.year, '2026-2027'); return { id: 1 }; };
    for (const scenario of ['missing-window', 'open', 'incomplete', 'ready']) {
      let writes = 0;
      sequelize.query = async (sql, options) => {
        assert.deepEqual(options.replacements, ['2026-2027']); assert.equal(options.transaction, tx);
        if (sql.includes('FROM grading_periods')) return [scenario === 'missing-window' ? [] : [{ id: 1, isOpen: scenario === 'open' }]];
        assert.ok(sql.includes('er.academicYear = ?'));
        if (sql.startsWith('SELECT er.id')) return [[{ id: 1 }, { id: 2 }]];
        if (sql.startsWith('SELECT COUNT')) { assert.ok(sql.includes('es.finalGrade IS NULL')); return [[{ count: scenario === 'incomplete' ? 1 : 0 }]]; }
        assert.ok(sql.includes("WHEN er.lifeStatus = 'retained' THEN 'retained'"));
        assert.ok(sql.includes("'dropped', 'transferred_out'")); writes++; return [null, 2];
      };
      const res = response(); await closeSchoolYear({ body: { schoolYear: '2026-2027' } }, res);
      assert.equal(res.code, scenario === 'ready' ? 200 : 409);
      assert.equal(writes, scenario === 'ready' ? 1 : 0);
      if (scenario === 'ready') assert.equal(res.body.completed, 2);
    }
    const res = response(); await closeSchoolYear({ body: {} }, res); assert.equal(res.code, 400);
  } finally { sequelize.transaction = originals.transaction; sequelize.query = originals.query; SchoolYear.findOne = originals.findOne; }
});
test('submission progress counts only the selected school year and returns numeric totals', async () => {
  const original = sequelize.query;
  try {
    sequelize.query = async (sql, options) => {
      assert.deepEqual(options.replacements, ['2026-2027']); assert.ok(sql.includes('er.academicYear = ?'));
      return [sql.includes('totalSubjects') ? [{ totalSubjects: '10', submitted: '7' }] : [{ students: '5', pendingStudents: '2' }]];
    };
    const res = response(); await getYearEndSummary({ query: { schoolYear: '2026-2027' } }, res);
    assert.deepEqual(res.body, { totalSubjects: 10, submitted: 7, students: 5, pendingStudents: 2 });
  } finally { sequelize.query = original; }
});

test('subject teacher assignment requires an active teacher account and persists its ID', async () => {
  const { User } = await import('../models/userModel.js');
  const { Subject } = await import('../models/subjectModel.js');
  const originals = { findOne: User.findOne, create: Subject.create, findByPk: Subject.findByPk };
  try {
    let available = false, written;
    User.findOne = async ({ where }) => { assert.deepEqual(where, { id: 7, role: 'teacher', isActive: true }); return available ? { id: 7, name: 'Teacher' } : null; };
    Subject.create = async input => { written = input; return input; };
    const body = { code: 'MATH7', description: 'Math 7', units: 1, programCode: 'JHS', gradeLevel: 7, semester: '1st Trimester', teacherId: '7' };
    const denied = response(); await createSubject({ body }, denied); assert.equal(denied.code, 400); assert.equal(written, undefined);
    available = true;
    const allowed = response(); await createSubject({ body }, allowed); assert.equal(allowed.code, 201); assert.equal(written.teacherId, 7);
    Subject.findByPk = async () => ({ update: async input => { written = input; } });
    const cleared = response(); await updateSubject({ params: { id: 1 }, body: { teacherId: null } }, cleared); assert.equal(cleared.code, 200); assert.equal(written.teacherId, null);
  } finally { User.findOne = originals.findOne; Subject.create = originals.create; Subject.findByPk = originals.findByPk; }
});
