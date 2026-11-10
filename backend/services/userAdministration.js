import { User, sequelize } from '../models/userModel.js';

const active = value => value === true || value === 1 || value === '1';
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };

// Lock administrators in a consistent order before applying any privilege/status change.
// Both management endpoints must enforce the same self/last-administrator protection.
export async function updateManagedUser(actorId, targetId, getUpdates) {
  return sequelize.transaction(async transaction => {
    const administrators = await User.findAll({ where: { role: 'admin' }, order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
    const user = administrators.find(item => String(item.id) === String(targetId)) ||
      await User.findByPk(targetId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) fail('User not found', 404);
    const updates = await getUpdates(user, transaction);
    const nextRole = updates.role ?? user.role;
    const nextActive = updates.isActive === undefined ? active(user.isActive) : active(updates.isActive);
    if (String(actorId) === String(user.id)) {
      if (!nextActive) fail('You cannot deactivate your own account');
      if (nextRole !== 'admin') fail('You cannot change your own admin role');
    }
    if (user.role === 'admin' && active(user.isActive) && (!nextActive || nextRole !== 'admin')) {
      if (administrators.filter(item => active(item.isActive)).length <= 1) fail('At least one active administrator must remain');
    }
    if ((updates.role !== undefined && updates.role !== user.role) ||
        (updates.isActive !== undefined && nextActive !== active(user.isActive))) {
      updates.tokenVersion = Number(user.tokenVersion || 0) + 1;
    }
    await user.update(updates, { transaction });
    return user;
  });
}
