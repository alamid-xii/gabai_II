import { needsProfileCompletion } from '../services/userProfile.js';
import { authenticateRequest, authenticationError } from '../services/authentication.js';

// Authenticate bearer credentials against the current account and revocation version.
export const authenticateToken = async (req, res, next) => {
  try {
    req.user = await authenticateRequest(req);
    const path = (req.originalUrl || req.url || '').split('?')[0];
    if (needsProfileCompletion(req.user) && !['/api/auth/me', '/api/auth/profile', '/api/auth/logout'].includes(path)) {
      return res.status(403).json({ error: 'Complete your profile before continuing.', needsProfileCompletion: true });
    }
    return next();
  } catch (error) {
    return authenticationError(res, error);
  }
};

// Require admin role
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Require registrar role
export const requireRegistrar = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'registrar') {
    return res.status(403).json({ error: 'Registrar access required' });
  }
  next();
};

// Require admin or registrar role
export const requireAdminOrRegistrar = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'admin' && req.user.role !== 'registrar') {
    return res.status(403).json({ error: 'Admin or Registrar access required' });
  }
  next();
};

// Require teacher role
export const requireTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Teacher access required' });
  }
  next();
};

// Public endpoints may personalize only after validating current credentials.
export const optionalAuth = async (req, res, next) => {
  try { req.user = await authenticateRequest(req); }
  catch { delete req.user; }
  return next();
};

// Student endpoints must reject authenticated staff accounts as well.
export const requireStudent = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Student access required' });
  next();
};
