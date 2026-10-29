import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { User, sequelize } from '../models/userModel.js';
import { PendingRegistration } from '../models/pendingRegistrationModel.js';

// Controller imports authenticate once. No test connects to or mutates MySQL.
const authenticate = sequelize.authenticate;
sequelize.authenticate = async () => {};
const { completeGoogleAuth, updateProfile, getCurrentUser } = await import('./authController.js');
const { requireAuth } = await import('./enrollmentController.js');
const { authenticateToken } = await import('../middleware/auth.js');
sequelize.authenticate = authenticate;

const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, redirect(url) { this.url = url; return this; } });
const body = { firstName: 'Maria', middleName: '', lastName: 'Santos', mobileNumber: '09171234567' };

test('new Google signup persists incomplete marker and exposes it in the one-time login session', async t => {
  t.mock.method(OAuth2Client.prototype, 'getToken', async () => ({ tokens: { id_token: 'test-google-token' } }));
  t.mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({ getPayload: () => ({ sub: 'test-google-id', email: 'test@example.com', email_verified: true, name: 'Google Name', given_name: 'Maria', family_name: 'Santos' }) }));
  t.mock.method(User, 'findOne', async () => null);
  t.mock.method(PendingRegistration, 'findOne', async () => null);
  t.mock.method(sequelize, 'transaction', async callback => callback({ LOCK: { UPDATE: 'UPDATE' } }));
  let persisted;
  t.mock.method(User, 'create', async values => { persisted = values; return { ...values, id: 88, role: 'student' }; });
  const originalClientId = process.env.GOOGLE_CLIENT_ID;
  const originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  process.env.GOOGLE_CLIENT_ID = 'test-client';
  process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
  try {
    const req = { query: { state: 'test-state', code: 'test-code' }, session: { googleOAuthState: 'test-state', googleOAuthMode: 'signup', regenerate(callback) { callback(); }, save(callback) { callback(); } } };
    const res = response();
    await completeGoogleAuth(req, res);
    assert.equal(new URL(res.url).searchParams.get('google'), 'success');
    assert.equal(persisted.profileCompleted, false);
    assert.equal(persisted.firstName, 'Maria');
    assert.equal(persisted.lastName, 'Santos');
    assert.equal(req.session.googleAuth.user.profileCompleted, false);
    assert.equal(req.session.googleAuth.user.mobileNumber, null);
    assert.equal('password' in req.session.googleAuth.user, false);
  } finally {
    if (originalClientId === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = originalClientId;
    if (originalClientSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET; else process.env.GOOGLE_CLIENT_SECRET = originalClientSecret;
  }
});

test('profile update validates required identity, ignores privilege fields, persists values and returns a restorable profile', async t => {
  const user = { id: 88, name: 'Google Name', email: 'test@example.com', role: 'student', authProvider: 'google', profileCompleted: false, async update(values) { Object.assign(this, values); } };
  t.mock.method(User, 'findByPk', async () => user);
  const invalid = response();
  await updateProfile({ user: { id: 88 }, body: { firstName: 'Maria' } }, invalid);
  assert.equal(invalid.code, 400);
  assert.equal(user.profileCompleted, false);
  const res = response();
  await updateProfile({ user: { id: 88 }, body: { ...body, role: 'admin', authProvider: 'password', profileCompleted: false } }, res);
  assert.equal(res.code, 200);
  assert.equal(user.role, 'student');
  assert.equal(user.authProvider, 'google');
  assert.equal(user.name, 'Maria Santos');
  assert.equal(user.middleName, null);
  assert.equal(res.body.user.profileCompleted, true);
  const restored = response();
  getCurrentUser({ user, session: {} }, restored);
  assert.deepEqual(restored.body.user, res.body.user);
  assert.equal(restored.body.user.mobileNumber, '09171234567');
});

test('incomplete Google accounts cannot skip completion through JWT or session enrollment APIs', async t => {
  const user = { id: 88, isActive: true, authProvider: 'google', profileCompleted: false };
  t.mock.method(User, 'findByPk', async () => user);
  const token = jwt.sign({ id: 88 }, process.env.JWT_SECRET || 'emc-secret-key-2025');
  for (const req of [{ headers: { authorization: `Bearer ${token}` } }, { headers: {}, session: { userId: 88 } }]) {
    const res = response();
    let nextCalled = false;
    await requireAuth(req, res, () => { nextCalled = true; });
    assert.equal(res.code, 403);
    assert.equal(res.body.needsProfileCompletion, true);
    assert.equal(nextCalled, false);
  }
});

test('JWT auth permits account restoration and profile completion but blocks other authenticated routes', async t => {
  const user = { id: 88, isActive: true, authProvider: 'google', profileCompleted: 0 };
  t.mock.method(sequelize, 'query', async () => [[user]]);
  const token = jwt.sign({ id: 88 }, process.env.JWT_SECRET || 'emc-secret-key-2025');
  for (const [url, allowed] of [['/api/auth/me', true], ['/api/auth/profile', true], ['/api/enrollments', false]]) {
    const res = response();
    let nextCalled = false;
    await new Promise(resolve => {
      const json = res.json;
      res.json = function(value) { json.call(this, value); resolve(); return this; };
      authenticateToken({ headers: { authorization: `Bearer ${token}` }, originalUrl: url }, res, () => { nextCalled = true; resolve(); });
    });
    assert.equal(nextCalled, allowed);
    if (!allowed) assert.equal(res.body.needsProfileCompletion, true);
  }
});
