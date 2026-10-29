import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLabels, ensurePanoramaLabelColumn } from './panoramaLabels.js';

const label = { id: 'gym-1', text: ' Gym ', description: ' Indoor sports ', yaw: 1.2, pitch: -0.15 };
test('multipart and JSON labels preserve spherical positions and trim text', () => {
  const result = validateLabels(JSON.stringify([label]));
  assert.deepEqual(result, [{ ...label, text: 'Gym', description: 'Indoor sports' }]);
  assert.deepEqual(validateLabels([]), []);
});
test('reject invalid coordinates, duplicate IDs, oversized text and malformed payloads', () => {
  for (const payload of ['{', {}, [null], [{ ...label, yaw: Infinity }], [{ ...label, pitch: 3 }], [{ ...label, yaw: '1' }], [{ ...label, text: '' }], [{ ...label, text: 'x'.repeat(81) }], [{ ...label, description: 'x'.repeat(501) }], [label, label], Array(41).fill(label)]) {
    assert.throws(() => validateLabels(payload), error => error.status === 400);
  }
});
test('schema update adds only a missing label column and can be repeated safely', async () => {
  const columns = {}; let calls = 0;
  const db = { getQueryInterface: () => ({ describeTable: async () => columns, addColumn: async (table, field) => { assert.equal(table, 'Buildings'); columns[field] = {}; calls++; } }) };
  await ensurePanoramaLabelColumn(db); await ensurePanoramaLabelColumn(db);
  assert.equal(calls, 1);
});
