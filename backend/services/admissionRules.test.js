import test from 'node:test';
import assert from 'node:assert/strict';
import { initialAdmission, validateSelection, validateBirthDate, sscContinuationEligibility } from './admissionPolicy.js';
import { ENROLLMENT_TYPES_BY_GRADE } from '../../shared/enrollmentRules.mjs';

test('all grades enforce the browser applicant choices on the server', () => {
  for (const [gradeLevel, allowed] of Object.entries(ENROLLMENT_TYPES_BY_GRADE)) {
    const educationLevel = Number(gradeLevel.split(' ')[1]) < 11 ? 'JHS' : 'SHS';
    for (const enrollmentType of ['new', 'old', 'transferee', 'returnee']) {
      const selection = { gradeLevel, educationLevel, enrollmentType, strand: 'STEM' };
      if (allowed.includes(enrollmentType)) assert.doesNotThrow(() => validateSelection(initialAdmission, selection));
      else assert.throws(() => validateSelection(initialAdmission, selection), { status: 400 });
    }
  }
});

test('birthdays must be real dates and cannot exceed today in Manila', () => {
  const now = new Date('2026-11-09T16:30:00.000Z');
  for (const birthday of ['2011-02-29', '2012-02-30', 'not-a-date', '2012-2-01', '2026-11-11', '2099-01-01']) {
    assert.throws(() => validateBirthDate(birthday, now), { status: 400 }, birthday);
  }
  for (const birthday of ['2012-02-29', '2026-11-10']) assert.doesNotThrow(() => validateBirthDate(birthday, now));
  assert.throws(() => validateSelection(initialAdmission, { educationLevel: 'JHS', gradeLevel: 'Grade 7', enrollmentType: 'new', dateOfBirth: '2099-01-01' }), { status: 400 });
});

test('SSC continuation uses the maintaining threshold and complete passing results', () => {
  const policy = { ssc: { minimumAverage: 85, maintainingAverage: 95 } };
  assert.equal(sscContinuationEligibility({ gradesComplete: true, computedGwa: 90, hasFailedSubject: false }, policy), false);
  assert.equal(sscContinuationEligibility({ gradesComplete: true, computedGwa: 95, hasFailedSubject: false }, policy), true);
  assert.equal(sscContinuationEligibility({ gradesComplete: true, computedGwa: 99, hasFailedSubject: true }, policy), false);
  assert.equal(sscContinuationEligibility({ gradesComplete: false, computedGwa: 99, hasFailedSubject: false }, policy), null);
});
