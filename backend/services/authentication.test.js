import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { User } from '../models/userModel.js';
import { authenticateRequest, createAccessToken } from './authentication.js';
import { isValidPassword, normalizeAccountEmail } from './accountValidation.js';
import { privateDocuments } from '../middleware/privateDocuments.js';

test('bearer and session credentials are revoked together when the account version changes', async t => {
  const user = { id: 72, role: 'student', isActive: true, tokenVersion: 0 };
  t.mock.method(User, 'findByPk', async () => user);
  const token = createAccessToken(user);
  const request = { headers: { authorization: `Bearer ${token}` } };
  assert.equal(await authenticateRequest(request), user);
  assert.equal(await authenticateRequest({ session: { userId: 72, tokenVersion: 0 } }, { allowSession: true }), user);
  user.tokenVersion = 1;
  await assert.rejects(authenticateRequest(request), error => error.status === 401);
  await assert.rejects(authenticateRequest({ session: { userId: 72 } }, { allowSession: true }), error => error.status === 401);
  assert.equal(await authenticateRequest({ headers: { authorization: `Bearer ${createAccessToken(user)}` } }), user);
});

test('suspension and invalid bearer credentials cannot fall back to a valid cookie session', async t => {
  const user = { id: 72, role: 'admin', isActive: true, tokenVersion: 0 };
  t.mock.method(User, 'findByPk', async () => user);
  const req = { headers: { authorization: `Bearer ${createAccessToken(user)}` }, session: { userId: 72 } };
  user.isActive = false;
  await assert.rejects(authenticateRequest(req, { allowSession: true }), error => error.status === 403 && error.isSuspended);
  user.isActive = true;
  await assert.rejects(authenticateRequest({ ...req, headers: { authorization: 'Bearer invalid' } }, { allowSession: true }), error => error.status === 401);
  await assert.rejects(authenticateRequest({ headers: {} }), error => error.status === 401);
});

test('legacy bearer tokens work until their account is revoked, then cannot restore access', async t => {
  const user = { id: 72, isActive: true, tokenVersion: 0 };
  t.mock.method(User, 'findByPk', async () => user);
  const token = jwt.sign({ id: 72 }, process.env.JWT_SECRET || 'emc-secret-key-2025');
  const req = { headers: { authorization: `Bearer ${token}` } };
  assert.equal(await authenticateRequest(req), user);
  user.tokenVersion = 1;
  await assert.rejects(authenticateRequest(req), error => error.status === 401);
});

test('account password and normalized email policies reject malformed and bcrypt-truncated inputs', () => {
  assert.equal(isValidPassword('SafePassword2026!'), true);
  for (const value of ['abcdefgh', 'longpassword123', 'LongPassword', null, {}, 'A1' + '\u00e9'.repeat(36)]) assert.equal(isValidPassword(value), false);
  assert.equal(normalizeAccountEmail(' TEST@Example.edu '), 'test@example.edu');
  for (const value of ['not-an-email', 'a@b', {}, 'a\r\n@b.com', 'x'.repeat(255) + '@example.com']) assert.equal(normalizeAccountEmail(value), null);
});

test('private document downloads reject revoked credentials before reading an enrollment or file', async t => {
  const user = { id: 72, isActive: true, tokenVersion: 0 };
  const token = createAccessToken(user);
  user.tokenVersion = 1;
  t.mock.method(User, 'findByPk', async () => user);
  const res = { code: 200, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
  await privateDocuments('unused-test-path')({ headers: { authorization: `Bearer ${token}` }, path: '/enrollment-1/report-card.pdf' }, res);
  assert.equal(res.code, 401);
  assert.match(res.body.error, /expired/);
});
