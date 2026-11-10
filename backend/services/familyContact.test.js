import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFamilyContact } from './familyContact.js';
test('accepts father, mother, both parents, or guardian alone', () => {
  const father = { fatherName: 'Father', fatherMobileNumber: '09123456789', parentsAddress: 'Bongabong' };
  const mother = { motherName: 'Mother', motherMobileNumber: '09987654321', parentsAddress: 'Bongabong' };
  const guardian = { guardianName: 'Guardian', guardianTelephone: '09123456789', guardianAddress: 'Bongabong' };
  for (const record of [father, mother, { ...father, ...mother }, guardian]) assert.doesNotThrow(() => validateFamilyContact(record));
});
test('rejects missing contacts, invalid mobile numbers, and missing addresses', () => {
  for (const record of [{}, { fatherName: 'Father' }, { motherName: 'Mother', motherMobileNumber: '123', parentsAddress: 'Bongabong' }, { guardianName: 'Guardian', guardianTelephone: '09123456789' }]) assert.throws(() => validateFamilyContact(record));
});
