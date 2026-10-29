import { sequelize } from '../models/db.js';

/**
 * GET /api/teacher/sections
 * Returns all sections assigned to the logged-in teacher
 */
export const getTeacherSections = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const teacherName = req.user.name;

    const [sections] = await sequelize.query(
      `SELECT s.id, s.code, s.course, s.yearLevel, s.strand, s.semester,
              s.schoolYear, s.instructor, s.schedule, s.room,
              s.capacity, s.currentEnrollment,
              COUNT(er.id) as studentCount
       FROM sections s
       LEFT JOIN enrollment_records er
         ON er.sectionId = s.id AND er.status IN ('enrolled','active','completed')
       WHERE (s.teacherId = ? OR s.instructor = ?) AND s.isActive = 1
       GROUP BY s.id
       ORDER BY s.course ASC, s.yearLevel ASC, s.code ASC`,
      { replacements: [teacherId, teacherName] }
    );

    res.json(sections || []);
  } catch (error) {
    console.error('getTeacherSections error:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
};

/**
 * GET /api/teacher/sections/:id/students
 * Returns all students in a specific section — teacher must own the section
 */
export const getSectionStudents = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const teacherName = req.user.name;
    const sectionId = parseInt(req.params.id);

    if (isNaN(sectionId)) {
      return res.status(400).json({ error: 'Invalid section ID' });
    }

    // Verify this section belongs to this teacher
    const [[section]] = await sequelize.query(
      `SELECT s.id, s.code, s.course, s.yearLevel, s.strand, s.semester, s.schoolYear,
              s.instructor, s.schedule, s.room, s.capacity, s.currentEnrollment
       FROM sections s WHERE s.id = ? AND (s.teacherId = ? OR s.instructor = ?) AND s.isActive = 1`,
      { replacements: [sectionId, teacherId, teacherName] }
    );

    if (!section) {
      return res.status(404).json({ error: 'Section not found or not assigned to you' });
    }

    const [students] = await sequelize.query(
      `SELECT er.id, er.firstName, er.middleName, er.familyName,
              er.studentNumber, er.lrn, er.gradeLevel, er.strand,
              er.educationLevel, er.enrollmentType, er.status,
              er.sectionName, er.sscApplied, er.sscQualified,
              er.sscClass, er.sscResult, er.sscExamDate, er.sscExamScore,
              er.approved_at
       FROM enrollment_records er
       WHERE er.sectionId = ?
         AND er.status IN ('enrolled', 'active', 'completed')
       ORDER BY er.familyName ASC, er.firstName ASC`,
      { replacements: [sectionId] }
    );

    res.json({ section, students: students || [] });
  } catch (error) {
    console.error('getSectionStudents error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

/**
 * GET /api/admin/teachers
 * Returns all users with role = teacher (admin only)
 */
export const getAllTeachers = async (req, res) => {
  try {
    const [teachers] = await sequelize.query(
      `SELECT id, name, email, department, isActive, createdAt
       FROM users WHERE role = 'teacher'
       ORDER BY name ASC`
    );
    res.json(teachers || []);
  } catch (error) {
    console.error('getAllTeachers error:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
};

/**
 * POST /api/admin/users/create
 * Admin creates a new staff account (teacher, registrar)
 */
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    if (!name?.trim() || !email?.trim() || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    const allowedRoles = ['teacher', 'registrar'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Role must be teacher or registrar' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check duplicate email
    const [[existing]] = await sequelize.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      { replacements: [email.trim().toLowerCase()] }
    );
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const bcrypt = await import('bcrypt');
    const hashed = await bcrypt.default.hash(password, 10);

    await sequelize.query(
      `INSERT INTO users (name, email, password, role, department, isActive, isVerified, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
      { replacements: [name.trim(), email.trim().toLowerCase(), hashed, role, department || null] }
    );

    const [[created]] = await sequelize.query(
      'SELECT id, name, email, role, department, isActive, createdAt FROM users WHERE email = ? LIMIT 1',
      { replacements: [email.trim().toLowerCase()] }
    );

    res.status(201).json({ message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`, user: created });
  } catch (error) {
    console.error('createUser error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

/**
 * PUT /api/admin/sections/:id/assign-teacher
 * Admin assigns a teacher to a section
 */
export const assignTeacherToSection = async (req, res) => {
  try {
    const sectionId = parseInt(req.params.id);
    const { teacherId } = req.body;

    if (isNaN(sectionId)) {
      return res.status(400).json({ error: 'Invalid section ID' });
    }

    // If teacherId is null/empty, unassign
    if (!teacherId) {
      await sequelize.query(
        `UPDATE sections SET teacherId = NULL, updatedAt = NOW() WHERE id = ?`,
        { replacements: [sectionId] }
      );
      return res.json({ message: 'Teacher unassigned from section' });
    }

    // Verify teacher exists and has teacher role
    const [[teacher]] = await sequelize.query(
      `SELECT id, name FROM users WHERE id = ? AND role = 'teacher' AND isActive = 1 LIMIT 1`,
      { replacements: [teacherId] }
    );
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    await sequelize.query(
      `UPDATE sections SET teacherId = ?, instructor = ?, updatedAt = NOW() WHERE id = ?`,
      { replacements: [teacherId, teacher.name, sectionId] }
    );

    const [[updated]] = await sequelize.query(
      'SELECT * FROM sections WHERE id = ?',
      { replacements: [sectionId] }
    );

    res.json({ message: `Teacher "${teacher.name}" assigned to section`, section: updated });
  } catch (error) {
    console.error('assignTeacherToSection error:', error);
    res.status(500).json({ error: 'Failed to assign teacher' });
  }
};
