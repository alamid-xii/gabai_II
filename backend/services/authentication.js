import jwt from 'jsonwebtoken';
import { User } from '../models/userModel.js';

const secret = () => process.env.JWT_SECRET || 'emc-secret-key-2025';
const inactive = value => value === false || value === 0 || value === '0';
const version = value => Number(value ?? 0);

export function credentialsCurrent(credentials, user) {
  return Number.isSafeInteger(version(credentials?.tokenVersion)) &&
    version(credentials?.tokenVersion) === version(user?.tokenVersion);
}

export function createAccessToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, tokenVersion: version(user.tokenVersion) }, secret(), { expiresIn: '7d' });
}

function unauthorized(message, status = 401, fields = {}) {
  throw Object.assign(new Error(message), { status, ...fields });
}

// Every bearer/session guard uses the same revocation and account-state policy.
export async function authenticateRequest(req, { allowSession = false } = {}) {
  const header = req.headers?.authorization;
  let credentials;
  let userId;
  if (header) {
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (!match) unauthorized('Invalid or expired token');
    try { credentials = jwt.verify(match[1], secret()); }
    catch { unauthorized('Invalid or expired token'); }
    userId = credentials.userId || credentials.id;
  } else if (allowSession && req.session?.userId) {
    credentials = req.session;
    userId = req.session.userId;
  } else {
    unauthorized('Authentication required');
  }
  if (!userId) unauthorized('Invalid or expired token');
  const user = await User.findByPk(userId);
  if (!user) unauthorized('User not found');
  if (inactive(user.isActive)) unauthorized('Your account has been suspended or deactivated. Please contact an administrator.', 403, { isSuspended: true });
  if (!credentialsCurrent(credentials, user)) unauthorized('Your session has expired. Please sign in again.');
  return user;
}

export function authenticationError(res, error) {
  return res.status(error.status || 500).json({
    error: error.status ? error.message : 'Authentication failed',
    ...(error.isSuspended ? { isSuspended: true } : {}),
  });
}
