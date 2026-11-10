import test from 'node:test';
import assert from 'node:assert/strict';
import { availableRegistrarStatuses, matchesRegistrarStatus } from './registrarEnrollmentFilters.js';

const records = [
  { id: 1, status: 'submitted' }, { id: 2, status: 'returned' },
  { id: 3, status: 'approved', sectionId: null },
  { id: 4, status: 'enrolled', sectionId: 5, lifeStatus: 'enrolled' },
];
test('status options represent actual records and stay available when another status is selected', () => {
  const options = availableRegistrarStatuses(records, 'submitted');
  assert.deepEqual(options, ['submitted', 'returned', 'approved', 'enrolled']);
  assert.deepEqual(records.filter(record => matchesRegistrarStatus(record, 'submitted')).map(record => record.id), [1]);
  assert.deepEqual(availableRegistrarStatuses(records, 'returned'), options);
  assert.deepEqual(availableRegistrarStatuses([], 'returned'), ['returned']);
  assert.deepEqual(availableRegistrarStatuses([]), ['returned']);
  assert.deepEqual(availableRegistrarStatuses([{ status: 'submitted' }]), ['submitted', 'returned']);
});
test('dashboard links match the review queue, unassigned approved applications, and active students', () => {
  const legacy = [...records, { id: 5, status: 'verified' }, { id: 6, status: 'subjects_enrolled', sectionId: null }, { id: 7, status: 'active', lifeStatus: 'dropped' }];
  const ids = status => legacy.filter(record => matchesRegistrarStatus(record, status)).map(record => record.id);
  assert.deepEqual(ids('needs_review'), [1, 5]);
  assert.deepEqual(ids('awaiting_section'), [3, 6]);
  assert.deepEqual(ids('enrolled_active'), [4]);
  assert.equal(ids('').length, legacy.length);
});
