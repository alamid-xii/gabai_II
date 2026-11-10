import test from 'node:test';
import assert from 'node:assert/strict';
import { User, sequelize } from '../models/userModel.js';
import { updateManagedUser } from './userAdministration.js';

function setup(t, users) {
  for (const user of users) user.update = async values => Object.assign(user, values);
  t.mock.method(sequelize, 'transaction', async callback => callback({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(User, 'findAll', async () => users.filter(user => user.role === 'admin'));
  t.mock.method(User, 'findByPk', async id => users.find(user => String(user.id) === String(id)));
}

test('generic edits and status toggles share self-deactivation and self-demotion protection', async t => {
  const user = { id: 1, role: 'admin', isActive: true, tokenVersion: 0 };
  setup(t, [user]);
  await assert.rejects(updateManagedUser(1, '1', () => ({ isActive: false })), error => error.status === 400);
  await assert.rejects(updateManagedUser(1, '1', () => ({ role: 'teacher' })), error => error.status === 400);
  assert.equal(user.isActive, true);
  assert.equal(user.role, 'admin');
});

test('last active administrator cannot be demoted or disabled by another caller', async t => {
  const active = { id: 1, role: 'admin', isActive: true, tokenVersion: 0 };
  setup(t, [active, { id: 2, role: 'admin', isActive: false }]);
  await assert.rejects(updateManagedUser(99, 1, () => ({ role: 'teacher' })), error => error.status === 400);
  await assert.rejects(updateManagedUser(99, 1, () => ({ isActive: false })), error => error.status === 400);
});

test('valid account management invalidates credentials when roles or status change', async t => {
  const managed = { id: 2, role: 'teacher', isActive: true, tokenVersion: 3 };
  setup(t, [{ id: 1, role: 'admin', isActive: true }, managed]);
  await updateManagedUser(1, 2, () => ({ isActive: false }));
  assert.equal(managed.tokenVersion, 4);
  await updateManagedUser(1, 2, () => ({ isActive: true }));
  assert.equal(managed.tokenVersion, 5);
  await updateManagedUser(1, 2, () => ({ name: 'Updated Name' }));
  assert.equal(managed.tokenVersion, 5);
});
