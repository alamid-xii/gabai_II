import test from 'node:test';
import assert from 'node:assert/strict';
import { needsProfileCompletion, newGoogleProfile, profileUpdates, serializeUser } from './userProfile.js';

const valid = { firstName: 'Maria', middleName: '', lastName: 'Santos', mobileNumber: '09171234567' };

test('new Google profile uses confirmed structured identity fields without assuming name parts or completion', () => {
  const profile = newGoogleProfile({ name: 'Display Name', given_name: ' José ', family_name: " O’Neill ", profileCompleted: true });
  assert.deepEqual(profile, { firstName: 'José', middleName: null, lastName: 'O’Neill', mobileNumber: null, profileCompleted: false });
  assert.equal(needsProfileCompletion({ ...profile, authProvider: 'google' }), true);
  assert.equal(newGoogleProfile({ name: 'Cannot Guess Name Parts' }).firstName, null);
});

test('existing accounts remain completed and serialization never leaks credentials', () => {
  const original = { id: 4, name: 'Existing Student', email: 'student@example.com', role: 'student', authProvider: 'google', password: 'secret hash', googleId: 'private subject', verificationToken: 'private token' };
  assert.equal(needsProfileCompletion(original), false);
  const user = serializeUser(original);
  assert.equal(user.profileCompleted, true);
  for (const key of ['password', 'googleId', 'verificationToken']) assert.equal(key in user, false);
  assert.equal(serializeUser({ ...original, profileCompleted: 0 }).profileCompleted, false);
  assert.equal(needsProfileCompletion({ ...original, profileCompleted: '0' }), true);
  assert.equal(needsProfileCompletion({ ...original, authProvider: 'password', profileCompleted: false }), false);
});

test('valid profiles normalize optional names, preserve local mobile numbers and compose the display name', () => {
  const changes = profileUpdates({ ...valid, firstName: '  Maria  José ', middleName: '  Dela   Cruz ', lastName: 'O’Neill-Santos', mobileNumber: '09171234567' });
  assert.deepEqual(changes, { firstName: 'Maria José', middleName: 'Dela Cruz', lastName: 'O’Neill-Santos', mobileNumber: '09171234567', name: 'Maria José Dela Cruz O’Neill-Santos', profileCompleted: true });
  assert.equal(profileUpdates(valid).middleName, null);
  assert.equal(profileUpdates({ ...valid, middleName: undefined }).middleName, null);
  assert.equal(profileUpdates({ ...valid, middleName: '   ' }).middleName, null);
});

test('completion requires first name, last name and valid mobile; malformed or oversized names are rejected', () => {
  const invalid = [
    { ...valid, firstName: '' }, { ...valid, firstName: {} }, { ...valid, lastName: undefined },
    { ...valid, firstName: 'Name123' }, { ...valid, middleName: '<script>' }, { ...valid, lastName: '---' },
    { ...valid, mobileNumber: '1234' }, { ...valid, mobileNumber: 9171234567 },
    ...['firstName', 'middleName', 'lastName'].map(field => ({ ...valid, [field]: 'a'.repeat(101) })),
    ...['+639171234567', '0917-123-4567', '0917 1234567', '08171234567', '091712345678', '0917123456a', ' 09171234567 '].map(mobileNumber => ({ ...valid, mobileNumber })),
    { ...valid, firstName: 'a'.repeat(100), middleName: 'b'.repeat(100), lastName: 'c'.repeat(100) },
  ];
  for (const body of invalid) assert.throws(() => profileUpdates(body), error => error.status === 400);
});

test('client flags and privileges cannot mark an incomplete profile complete or change account roles', () => {
  const incomplete = { authProvider: 'google', profileCompleted: false };
  assert.deepEqual(profileUpdates({ role: 'admin', profileCompleted: true, authProvider: 'password' }, incomplete), {});
  const changed = profileUpdates({ ...valid, role: 'admin', profileCompleted: false }, incomplete);
  assert.equal(changed.profileCompleted, true);
  assert.equal('role' in changed, false);
  assert.equal('authProvider' in changed, false);
});

test('display-name edits remain available to legacy accounts but cannot desynchronize structured identity', () => {
  assert.deepEqual(profileUpdates({ name: '  Legacy Name  ' }, {}), { name: 'Legacy Name' });
  assert.throws(() => profileUpdates({ name: 'Other Name' }, { firstName: 'Maria' }), error => error.status === 400);
  assert.throws(() => profileUpdates({ name: 'Other Name' }, { authProvider: 'google', profileCompleted: false }), error => error.status === 400);
});
