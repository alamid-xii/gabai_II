import test from 'node:test';
import assert from 'node:assert/strict';
import { sequelize } from '../models/db.js';
import { autoAssignSection, moveToSection, selectBestSectionForStudent } from './sectionAssignment.js';
import { assertSectionCompatible, validateProgramGrade, validateSectionConfiguration } from './academicScope.js';

const enrollment = { id: 1, status: 'approved', sectionId: 2, educationLevel: 'JHS', gradeLevel: 'Grade 7', academicYear: '2026-2027', studentNumber: '2026-00001' };
const section = { id: 2, code: '7-A', isActive: 1, course: 'JHS', yearLevel: 7, schoolYear: '2026-2027', semester: '1st', capacity: 40 };
const withMocks = async callback => {
  const originals = { query: sequelize.query, transaction: sequelize.transaction };
  try {
    sequelize.transaction = async (options, fn) => { assert.equal(options.isolationLevel, 'READ COMMITTED'); return fn({ auditTransaction: true }); };
    await callback();
  } finally { Object.assign(sequelize, originals); }
};

test('JHS and SHS grade validation rejects unsupported program-grade pairs', () => {
  for (const grade of [7, 8, 9, 10]) validateProgramGrade('JHS', grade);
  for (const grade of [11, 12]) validateProgramGrade('SHS', grade);
  for (const pair of [['JHS', 12], ['SHS', 7], ['ALIEN', 1], ['JHS', 7.1]]) assert.throws(() => validateProgramGrade(...pair));
  assert.throws(() => validateSectionConfiguration({ ...section, capacity: -3 }));
  assert.throws(() => validateSectionConfiguration({ ...section, capacity: 1.5 }));
});

test('section compatibility includes program, grade, school year and class', () => {
  assertSectionCompatible(enrollment, section);
  for (const patch of [{ course: 'SHS', yearLevel: 12 }, { yearLevel: 8 }, { schoolYear: '2025-2026' }, { strand: 'SSC' }]) assert.throws(() => assertSectionCompatible(enrollment, { ...section, ...patch }));
  assertSectionCompatible({ ...enrollment, sscClass: 'SSC' }, { ...section, strand: 'SSC' });
});

test('auto enrollment applies a persisted subject teacher override rather than the adviser or default', async () => withMocks(async () => {
  const inserts = [];
  sequelize.query = async (sql, options) => {
    assert.ok(options.transaction);
    if (sql.includes('SELECT * FROM enrollment_records')) return [[enrollment]];
    if (sql.includes('SELECT * FROM sections')) return [[section]];
    if (sql.includes('FROM subjects')) {
      assert.ok(sql.includes("u.role = 'teacher' AND u.isActive = 1"));
      assert.deepEqual(options.replacements, [2, 'JHS', 7, 'Regular', '1st']);
      return [[{ id: 3, code: 'MATH7', description: 'Mathematics', units: 1, defaultTeacherId: 7, defaultTeacherName: 'Default Teacher', assignmentId: 4, assignedTeacherId: 8, assignedTeacherName: 'Section Teacher' }]];
    }
    if (sql.includes('SELECT id FROM enrollment_subjects')) return [[]];
    if (sql.includes('INSERT INTO enrollment_subjects')) { inserts.push(options.replacements); return [null, 1]; }
    throw Error('Unexpected SQL: ' + sql);
  };
  const result = await autoAssignSection(1);
  assert.equal(result.assigned, true); assert.equal(inserts.length, 1);
  assert.equal(inserts[0][8], 'Section Teacher'); assert.equal(inserts[0][9], 8);
}));

test('manual section assignment rejects every unapproved state without writes', async () => withMocks(async () => {
  for (const status of ['draft', 'submitted', 'verified', 'returned', 'pending_exam', 'rejected', 'completed']) {
    let calls = 0;
    sequelize.query = async sql => { calls++; assert.ok(sql.startsWith('SELECT * FROM enrollment_records')); assert.ok(sql.includes('FOR UPDATE')); return [[{ ...enrollment, status }]]; };
    const result = await moveToSection(1, 2);
    assert.equal(result.success, false, status); assert.match(result.reason, /Verify and approve/); assert.equal(calls, 1);
  }
}));

test('manual assignment rejects incompatible section before any writes', async () => withMocks(async () => {
  let writes = 0;
  sequelize.query = async sql => {
    if (sql.includes('SELECT * FROM enrollment_records')) return [[enrollment]];
    if (sql.includes('SELECT * FROM sections')) { assert.ok(sql.includes('ORDER BY id FOR UPDATE')); return [[{ ...section, yearLevel: 8 }]]; }
    writes++; throw Error('No write allowed');
  };
  const result = await moveToSection(1, 2);
  assert.equal(result.success, false); assert.match(result.reason, /program, grade, and school year/); assert.equal(writes, 0);
}));

test('capacity uses actual occupants after locking, even when the cached count is zero', async () => withMocks(async () => {
  let writes = 0;
  sequelize.query = async sql => {
    if (sql.includes('SELECT * FROM enrollment_records')) return [[{ ...enrollment, sectionId: null }]];
    if (sql.includes('SELECT * FROM sections')) return [[{ ...section, capacity: 1, currentEnrollment: 0 }]];
    if (sql.includes('COUNT(*)')) return [[{ count: 1 }]];
    writes++; throw Error('No write allowed');
  };
  const result = await moveToSection(1, 2);
  assert.equal(result.success, false); assert.match(result.reason, /full/); assert.equal(writes, 0);
}));

test('approved and enrolled records can keep their compatible section without reserving a second seat', async () => withMocks(async () => {
  for (const status of ['approved', 'subjects_enrolled', 'enrolled', 'active']) {
    let updated = false;
    sequelize.query = async sql => {
      if (sql.includes('SELECT * FROM enrollment_records')) return [[{ ...enrollment, status }]];
      if (sql.includes('SELECT * FROM sections')) return [[{ ...section, capacity: 1, currentEnrollment: 1 }]];
      if (sql.includes('COUNT(*)')) return [[{ count: 1 }]];
      if (sql.includes('UPDATE enrollment_records')) { updated = true; return [null, 1]; }
      if (sql.includes('UPDATE sections')) return [null, 1];
      if (sql.includes('FROM subjects')) return [[]];
      throw Error('Unexpected SQL: ' + sql);
    };
    const result = await moveToSection(1, 2);
    assert.equal(result.success, true, status); assert.equal(updated, true);
  }
}));

test('section configuration allows overlapping grade ranges but rejects inverted or out-of-bounds ranges', () => {
  validateSectionConfiguration({ code: '7-A', course: 'JHS', yearLevel: 7, schoolYear: '2026-2027', capacity: 40, minGrade: 75, maxGrade: 85 });
  validateSectionConfiguration({ code: '7-B', course: 'JHS', yearLevel: 7, schoolYear: '2026-2027', capacity: 40, minGrade: 80, maxGrade: 90 });
  assert.throws(() => validateSectionConfiguration({ code: '7-C', course: 'JHS', yearLevel: 7, schoolYear: '2026-2027', capacity: 40, minGrade: 90, maxGrade: 80 }));
  assert.throws(() => validateSectionConfiguration({ code: '7-D', course: 'JHS', yearLevel: 7, schoolYear: '2026-2027', capacity: 40, minGrade: -1, maxGrade: 85 }));
});

test('selectBestSectionForStudent prioritizes exact grade range, narrowest overlap, open section, then nearest fallback', () => {
  const secA = { id: 1, code: '7-A', capacity: 40, minGrade: 75, maxGrade: 85 };
  const secB = { id: 2, code: '7-B', capacity: 40, minGrade: 80, maxGrade: 90 };
  const secC = { id: 3, code: '7-C', capacity: 40, minGrade: null, maxGrade: null };
  const secNarrow = { id: 4, code: '7-N', capacity: 40, minGrade: 82, maxGrade: 85 };

  // Overlapping exact match picks narrowest span
  const overlapPick = selectBestSectionForStudent([
    { section: secA, count: 10 },
    { section: secB, count: 10 },
    { section: secNarrow, count: 15 },
  ], 83);
  assert.equal(overlapPick.section.code, '7-N');
  assert.equal(overlapPick.placementMode, 'exact_range');

  // Full exact-range falls back to open section
  const openPick = selectBestSectionForStudent([
    { section: secA, count: 40 },
    { section: secC, count: 5 },
    { section: secB, count: 5 },
  ], 78);
  assert.equal(openPick.section.code, '7-C');
  assert.equal(openPick.placementMode, 'open_section');

  // Out of range with no open sections picks nearest guideline
  const nearestPick = selectBestSectionForStudent([
    { section: secA, count: 10 },
    { section: secB, count: 10 },
  ], 93);
  assert.equal(nearestPick.section.code, '7-B');
  assert.equal(nearestPick.placementMode, 'fallback_nearest');
});
