/*
    MIT License
    
    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines
*/

import { User } from "../models/userModel.js";
import { FAQ } from "../models/faqModel.js";
import { ChatLog } from "../models/chatLogModel.js";
import { Building } from "../models/buildingModel.js";
import { sequelize } from "../models/db.js";
import { authenticateRequest, authenticationError } from "../services/authentication.js";
import { isValidPassword, normalizeAccountEmail, PASSWORD_POLICY_MESSAGE } from "../services/accountValidation.js";
import { updateManagedUser } from "../services/userAdministration.js";

try { await sequelize.authenticate(); } catch (err) { console.warn("DB unavailable at import (adminController):", err.message); }

// Set up associations
ChatLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Legacy admin routes share bearer/session revocation and active-account checks.
export const requireAdmin = async (req, res, next) => {
  try {
    req.user = await authenticateRequest(req, { allowSession: true });
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    return next();
  } catch (error) { return authenticationError(res, error); }
};

export const getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalFAQs, totalBuildings, totalChats] = await Promise.all([
      User.count(),
      FAQ.count({ where: { isActive: true } }),
      Building.count({ where: { isActive: true } }),
      ChatLog.count()
    ]);
    
    // Get recent activity (last 10 chat logs)
    const recentChats = await ChatLog.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']]
    });
    
    // Get top FAQs by views
    const topFAQs = await FAQ.findAll({
      where: { isActive: true },
      order: [['views', 'DESC']],
      limit: 5
    });
    
    res.json({
      stats: {
        totalUsers,
        totalFAQs,
        totalBuildings,
        totalChats
      },
      recentChats,
      topFAQs
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};

// FAQ Management
export const getAllFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.findAll({ order: [['createdAt', 'DESC']] });
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch FAQs" });
  }
};

export const createFAQ = async (req, res) => {
  try {
    const { question, answer, category, keywords } = req.body;
    const faq = await FAQ.create({ question, answer, category, keywords: keywords || null });
    res.status(201).json(faq);
  } catch (error) {
    res.status(500).json({ error: "Failed to create FAQ" });
  }
};

export const updateFAQ = async (req, res) => {
  try {
    const faq = await FAQ.findByPk(req.params.id);
    if (!faq) return res.status(404).json({ error: "FAQ not found" });
    const { question, answer, category, keywords } = req.body;
    await faq.update({ question, answer, category, keywords: keywords !== undefined ? keywords : faq.keywords });
    res.json(faq);
  } catch (error) {
    res.status(500).json({ error: "Failed to update FAQ" });
  }
};

export const deleteFAQ = async (req, res) => {
  try {
    const faq = await FAQ.findByPk(req.params.id);
    if (!faq) return res.status(404).json({ error: "FAQ not found" });
    await faq.update({ isActive: false });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete FAQ" });
  }
};

// User Management
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'isActive', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { name, email, role, department, isActive } = req.body;
    const updates = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
        return res.status(400).json({ error: 'Name must contain 1 to 100 characters' });
      }
      updates.name = name.trim();
    }
    if (email !== undefined) {
      updates.email = normalizeAccountEmail(email);
      if (!updates.email) return res.status(400).json({ error: 'Enter a valid email address' });
    }
    if (role !== undefined) {
      if (!['student', 'teacher', 'registrar', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role specified' });
      updates.role = role;
    }
    if (department !== undefined) {
      if (department !== null && (typeof department !== 'string' || department.length > 100)) return res.status(400).json({ error: 'Department must be 100 characters or less' });
      updates.department = department;
    }
    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'isActive must be true or false' });
      updates.isActive = isActive;
    }
    const user = await updateManagedUser(req.user?.id, req.params.id, async (current, transaction) => {
      if (updates.email) {
        const existing = await User.findOne({ where: { email: updates.email }, transaction });
        if (existing && String(existing.id) !== String(current.id)) throw Object.assign(new Error('Email address is already in use'), { status: 400 });
      }
      return updates;
    });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, department: user.department, isActive: user.isActive });
  } catch (error) {
    if (!error.status) console.error('Update user error:', error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to update user' });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const user = await updateManagedUser(req.user?.id, req.params.id, current => ({ isActive: !(current.isActive === true || current.isActive === 1 || current.isActive === '1') }));
    res.json({ success: true, id: user.id, name: user.name, isActive: user.isActive, message: `Account for ${user.name} is now ${user.isActive ? 'Active' : 'Suspended'}` });
  } catch (error) {
    if (!error.status) console.error('Toggle user status error:', error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to toggle user status' });
  }
};

// Reset user password (admin temporary password override)
export const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ error: PASSWORD_POLICY_MESSAGE });
    }

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const bcrypt = (await import('bcrypt')).default;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await sequelize.transaction(async transaction => {
      const current = await User.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!current) throw Object.assign(new Error('User not found'), { status: 404 });
      await current.update({ password: hashedPassword, tokenVersion: Number(current.tokenVersion || 0) + 1 }, { transaction });
    });

    res.json({
      success: true,
      message: `Password successfully reset for ${user.name}`
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Failed to reset user password" });
  }
};

// Delete user (admin only) — also deletes their enrollments
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    // Prevent deleting yourself
    if (parseInt(id) === adminId) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }

    const [[user]] = await sequelize.query("SELECT * FROM users WHERE id = ?", { replacements: [id] });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Prevent deleting other admins/registrars (but teachers can be deleted)
    if (user.role === "admin" || user.role === "registrar") {
      return res.status(403).json({ error: "Cannot delete admin or registrar accounts" });
    }

    // Get their enrollments (including section assignments)
    const [enrollments] = await sequelize.query(
      "SELECT id, sectionId FROM enrollment_records WHERE userId = ?",
      { replacements: [id] }
    );

    // For each enrollment that has a section, decrement the section's count
    for (const e of enrollments) {
      if (e.sectionId) {
        await sequelize.query(
          `UPDATE sections 
           SET currentEnrollment = GREATEST(0, CAST(currentEnrollment AS SIGNED) - 1), 
               updatedAt = NOW()
           WHERE id = ?`,
          { replacements: [e.sectionId] }
        );
      }
    }

    // Delete related data
    for (const e of enrollments) {
      await sequelize.query("DELETE FROM enrollment_subjects WHERE enrollmentId = ?", { replacements: [e.id] });
      await sequelize.query("DELETE FROM enrollment_documents WHERE enrollmentId = ?", { replacements: [e.id] });
    }
    await sequelize.query("DELETE FROM enrollment_records WHERE userId = ?", { replacements: [id] });
    await sequelize.query("DELETE FROM ChatLogs WHERE userId = ?", { replacements: [id] });
    await sequelize.query("DELETE FROM users WHERE id = ?", { replacements: [id] });

    res.json({ message: `User "${user.name}" deleted successfully` });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

// Delete user (admin only) — also deletes their enrollments
