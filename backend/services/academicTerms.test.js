import test from 'node:test';
import assert from 'node:assert/strict';
import { ACADEMIC_TERMS, ensureAcademicTerms, subjectInput } from './academicTerms.js';
import { validateAcademicYearConfig, normalizeEnrollmentTypes } from '../controllers/academicController.js';
import { scoreFAQ } from './chatRetrieval.js';

const valid = { code: ' ENG7 ', description: ' English 7 ', programCode: 'JHS', gradeLevel: '7', units: '1', semester: '1st Trimester', strand: '' };
test('subjects accept each trimester and legacy semester without losing its meaning', () => {
  for (const semester of ACADEMIC_TERMS) assert.equal(subjectInput({ ...valid, semester }).semester, semester);
  assert.deepEqual(subjectInput(valid), { code: 'ENG7', description: 'English 7', programCode: 'JHS', strand: null, semester: '1st Trimester', units: 1, gradeLevel: 7 });
});
test('invalid subject input is rejected before writing to the database', () => {
  for (const patch of [{ semester: '4th Trimester' }, { code: ' ' }, { units: 0 }, { units: 'invalid' }, { gradeLevel: 13 }]) {
    assert.throws(() => subjectInput({ ...valid, ...patch }));
  }
  assert.deepEqual(subjectInput({ description: ' Updated ', isActive: false, id: 900 }, true), { description: 'Updated' });
});
test('schema upgrade expands both old enums and skips them on subsequent startup', async () => {
  const types = { subjects: "ENUM('1st','2nd','Summer')", sections: "ENUM('1st','2nd','Summer')" };
  const queries = [];
  const db = {
    getQueryInterface: () => ({ describeTable: async table => ({ semester: { type: types[table] } }) }),
    query: async sql => {
      queries.push(sql);
      const table = sql.split(' ')[2];
      types[table] = sql;
    }
  };
  await ensureAcademicTerms(db);
  assert.equal(queries.length, 2);
  for (const sql of queries) for (const term of ACADEMIC_TERMS) assert.ok(sql.includes(`'${term}'`));
  await ensureAcademicTerms(db);
  assert.equal(queries.length, 2);
});

test('subject teacher input supports assigning and clearing a teacher ID', () => {
  assert.equal(subjectInput({ ...valid, teacherId: '12' }).teacherId, 12);
  assert.equal(subjectInput({ teacherId: null }, true).teacherId, null);
  assert.equal(subjectInput({ teacherId: '' }, true).teacherId, null);
  for (const teacherId of [-1, 0, 'abc', true, [12]]) assert.throws(() => subjectInput({ ...valid, teacherId }));
});

test('subject APIs reject unknown programs and mismatched program-grade pairs', () => {
  for (const patch of [{ programCode: 'ALIEN', gradeLevel: 1 }, { programCode: 'JHS', gradeLevel: 12 }, { programCode: 'SHS', gradeLevel: 7 }]) assert.throws(() => subjectInput({ ...valid, ...patch }));
});

test('academic year validation enforces current calendar year and 10-month span', () => {
  const validConfig = validateAcademicYearConfig({ year: '2026-2027', startMonth: 6, endMonth: 3 }, 2026);
  assert.deepEqual(validConfig, { year: '2026-2027', startMonth: 6, endMonth: 3 });
  assert.throws(() => validateAcademicYearConfig({ year: '2025-2026', startMonth: 6, endMonth: 3 }, 2026));
  assert.throws(() => validateAcademicYearConfig({ year: '2026-2027', startMonth: 6, endMonth: 4 }, 2026));
  assert.throws(() => validateAcademicYearConfig({ year: '2026-2027', startMonth: 2 }, 2026));
  assert.deepEqual(normalizeEnrollmentTypes({ transferee: false }), { new: true, old: true, transferee: false, returnee: true });
});

test('chatbot FAQ scoring supports comma-separated keywords on admin FAQs', () => {
  const customFaq = {
    question: 'Uniform policy',
    keywords: 'uniform, dress code, attire',
    answer: 'Students wear the prescribed school uniform Monday to Thursday.',
  };
  assert.ok(scoreFAQ('what is the dress code', customFaq) > 0.35);
});
