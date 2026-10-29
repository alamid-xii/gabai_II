import jwt from 'jsonwebtoken';
import { sequelize } from '../models/db.js';
import { needsProfileCompletion } from '../services/userProfile.js';

// Authenticate JWT token
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'emc-secret-key-2025', async (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      
      // Support both 'id' and 'userId' in token for backwards compatibility
      const userId = decoded.userId || decoded.id;
      
      // Fetch user from database
      const [[user]] = await sequelize.query(
        'SELECT id, email, name, role, isActive, authProvider, firstName, middleName, lastName, mobileNumber, profileCompleted FROM users WHERE id = ?',
        { replacements: [userId] }
      );
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.isActive === false || user.isActive === 0 || user.isActive === '0') {
        return res.status(403).json({
          error: 'Your account has been suspended or deactivated. Please contact an administrator.',
          isSuspended: true
        });
      }
      
      req.user = user;
      const path = (req.originalUrl || req.url || '').split('?')[0];
      if (needsProfileCompletion(user) && !['/api/auth/me', '/api/auth/profile', '/api/auth/logout'].includes(path)) {
        return res.status(403).json({ error: 'Complete your profile before continuing.', needsProfileCompletion: true });
      }
      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
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

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return next();
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'emc-secret-key-2025', async (err, decoded) => {
      if (err) {
        return next();
      }
      
      // Support both 'id' and 'userId' in token for backwards compatibility
      const userId = decoded.userId || decoded.id;
      
      const [[user]] = await sequelize.query(
        'SELECT id, email, name, role, isActive, authProvider, firstName, middleName, lastName, mobileNumber, profileCompleted FROM users WHERE id = ?',
        { replacements: [userId] }
      );
      
      if (user && user.isActive !== false && user.isActive !== 0 && user.isActive !== '0') {
        req.user = user;
      }
      
      next();
    });
  } catch (error) {
    next();
  }
};
