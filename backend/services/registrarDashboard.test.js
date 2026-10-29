import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRegistrarDashboard, dashboardFilters, schoolLevelOf } from './registrarDashboard.js';

const schoolYears = [{ year: '2026-2027', isActive: true }, { year: '2025-2026', isActive: false }];
const record = (id, values = {}) => ({
  id, userId: id, firstName: `Student ${id}`, familyName: 'Test', educationLevel: 'JHS', gradeLevel: 'Grade 7',
  academicYear: '2026-2027', enrollmentType: 'new', status: 'enrolled', lifeStatus: 'enrolled', sectionId: 1,
  createdAt: '2026-05-01T08:00:00Z', updatedAt: '2026-05-02T08:00:00Z', ...values,
});
const section = (id, values = {}) => ({
  id, code: `7-${id}`, yearLevel: 7, course: 'JHS', strand: null, schoolYear: '2026-2027',
  isActive: true, capacity: 2, ...values,
});

test('overview counts actual enrolled students, unique grades and distinct registrar queues', () => {
  const records = [
    record(1), record(2, { userId: 1 }),
    record(3, { status: 'active' }),
    record(4, { lifeStatus: 'dropped' }), record(5, { lifeStatus: 'transferred_out' }),
    record(6, { lifeStatus: 'retained' }), record(7, { status: 'completed', lifeStatus: 'completed' }),
    record(8, { status: 'draft' }),
    record(9, { status: 'submitted', sectionId: null, createdAt: '2026-04-01T08:00:00Z' }),
    record(10, { status: 'verified', sectionId: null }),
    record(11, { status: 'returned', sectionId: null }),
    record(12, { status: 'approved', sectionId: null }),
    record(13, { status: 'subjects_enrolled', sectionId: null }),
    record(14, { status: 'rejected', sectionId: null }),
    record(15, { status: 'enrolled', academicYear: '2025-2026' }),
  ];
  const result = buildRegistrarDashboard({ records, sections: [section(1), section(2), section(3, { isActive: false })], schoolYears });
  assert.equal(result.academicYear, '2026-2027');
  assert.deepEqual(result.summary, { enrolled: 2, needsReview: 2, awaitingSection: 2, availableSections: 1, availableSlots: 2 });
  assert.equal(result.gradeDistribution[0].enrolled, 2);
  assert.equal(result.gradeDistribution.reduce((sum, grade) => sum + grade.enrolled, 0), 2);
  assert.deepEqual(result.pendingApplications.map(item => item.id), [9, 10]);
  assert.equal(result.statusDistribution.find(item => item.status === 'rejected').count, 1);
  assert.equal(result.statusDistribution.some(item => item.status === 'draft'), false);
  assert.equal(result.sections.find(item => item.id === 1).available, 0);
  assert.equal('lifeStatus' in result.pendingApplications[0], false);
});

test('school-level classification follows SSC choices, failure and pending applicants', () => {
  assert.equal(schoolLevelOf(record(1)), 'jhs_regular');
  assert.equal(schoolLevelOf(record(1, { sscApplied: true, status: 'pending_exam' })), 'jhs_ssc');
  assert.equal(schoolLevelOf(record(1, { sscApplied: '1', sscResult: 'passed' })), 'jhs_ssc');
  assert.equal(schoolLevelOf(record(1, { sscApplied: true, sscResult: 'failed' })), 'jhs_regular');
  assert.equal(schoolLevelOf(record(1, { sscApplied: true, sscResult: 'passed', sscClass: 'Regular' })), 'jhs_regular');
  assert.equal(schoolLevelOf(record(1, { sscClass: 'SSC' })), 'jhs_ssc');
  assert.equal(schoolLevelOf(record(1, { educationLevel: 'SHS' })), 'shs');
  assert.equal(schoolLevelOf(record(1, { educationLevel: 'College' })), null);
});

test('type filters change application charts but never hide occupied seats', () => {
  const records = [record(1), record(2, { enrollmentType: 'old' }), record(3, { sscClass: 'SSC', sectionId: 2 }), record(4, { educationLevel: 'SHS', gradeLevel: 'Grade 11', sectionId: 3 })];
  const sections = [section(1), section(2, { strand: 'SSC' }), section(3, { course: 'SHS', yearLevel: 11, strand: 'STEM' })];
  const result = buildRegistrarDashboard({ records, sections, schoolYears, query: { schoolLevel: 'jhs_regular', enrollmentType: 'new' } });
  assert.equal(result.summary.enrolled, 1);
  assert.equal(result.summary.availableSections, 0);
  assert.equal(result.sections.length, 1);
  assert.equal(result.sections[0].enrolled, 2);
  assert.equal(result.summary.availableSlots, 0);
  const ssc = buildRegistrarDashboard({ records, sections, schoolYears, query: { schoolLevel: 'jhs_ssc' } });
  assert.equal(ssc.summary.enrolled, 1);
  assert.equal(ssc.sections[0].id, 2);
});

test('missing active year returns empty data, explicit historical year works and invalid filters fail', () => {
  const inactiveYears = schoolYears.map(year => ({ ...year, isActive: false }));
  const records = [record(1), record(2, { academicYear: '2025-2026' })];
  const empty = buildRegistrarDashboard({ records, sections: [section(1)], schoolYears: inactiveYears });
  assert.equal(empty.academicYear, null);
  assert.equal(empty.summary.enrolled, 0);
  assert.equal(empty.sections.length, 0);
  const history = buildRegistrarDashboard({ records, schoolYears: inactiveYears, query: { academicYear: '2025-2026' } });
  assert.equal(history.summary.enrolled, 1);
  assert.throws(() => buildRegistrarDashboard({ schoolYears, query: { academicYear: 'all' } }), error => error.status === 400);
  for (const query of [{ schoolLevel: 'College' }, { enrollmentType: 'continuing' }, { academicYear: [] }, { schoolLevel: ['shs'] }]) {
    assert.throws(() => dashboardFilters(query), error => error.status === 400);
  }
});

test('activities use real valid timestamps and generic record-update labels without inferred actions', () => {
  const records = [record(1, { verified_at: '2026-05-02T08:00:00Z', approved_at: '2026-05-03T08:00:00Z', updatedAt: '2026-05-04T08:00:00Z' }), record(2, { createdAt: null, updatedAt: 'invalid' })];
  const result = buildRegistrarDashboard({ records, schoolYears });
  assert.deepEqual(result.recentActivity.map(event => event.label), ['Enrollment record updated', 'Application approved', 'Application verified', 'Application record created']);
  assert.equal(result.recentActivity[0].enrollmentId, 1);
  assert.equal(result.recentActivity.some(event => /submitted|assigned/i.test(event.label)), false);
  const duplicateTime = buildRegistrarDashboard({ records: [record(1, { approved_at: '2026-05-02T08:00:00Z' })], schoolYears });
  assert.equal(duplicateTime.recentActivity.filter(event => event.timestamp === '2026-05-02T08:00:00.000Z').length, 1);
});

test('queue is oldest-first and limited; over-capacity sections show zero remaining rather than negative slots', () => {
  const records = Array.from({ length: 12 }, (_, index) => record(index + 1, { status: 'submitted', sectionId: null }));
  records.push(record(20), record(21), record(22));
  const result = buildRegistrarDashboard({ records, sections: [section(1)], schoolYears });
  assert.equal(result.summary.needsReview, 12);
  assert.equal(result.pendingApplications.length, 8);
  assert.equal(result.sections[0].enrolled, 3);
  assert.equal(result.sections[0].available, 0);
  assert.equal(result.summary.availableSlots, 0);
});
