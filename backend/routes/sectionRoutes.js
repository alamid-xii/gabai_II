import express from 'express';
import { authenticateToken, requireAdminOrRegistrar } from '../middleware/auth.js';
import { sanitizeBody, validateSection } from '../middleware/validate.js';
import { sequelize } from '../models/db.js';
import {
  getAllSections,
  createSection,
  updateSection,
  deleteSection,
  getAvailableStudents,
  getAvailableSubjects,
  assignStudentToSection,
  getSectionStudents,
  getUnassignedStudents,
  removeStudentFromSection,
  moveStudentToSection,
  manualAssignStudent,
  autoAssignAll,
} from '../controllers/sectionController.js';

const router = express.Router();

// All section routes require admin or registrar
router.use(authenticateToken, requireAdminOrRegistrar);

// Section CRUD
router.get('/', getAllSections);
router.post('/', sanitizeBody, validateSection, createSection);
router.put('/:id', sanitizeBody, updateSection);
router.delete('/:id', deleteSection);

// Students in a section
router.get('/:id/students', getSectionStudents);

// Unassigned students (approved but no section)
router.get('/students/unassigned', getUnassignedStudents);

// Auto-assign all unassigned students
router.post('/students/auto-assign', autoAssignAll);

// Remove student from their section
router.delete('/students/:enrollmentId/section', removeStudentFromSection);

// Move student to a different section
router.put('/students/:enrollmentId/section', moveStudentToSection);

// Manually assign an unassigned student to a section
router.post('/students/:enrollmentId/assign', manualAssignStudent);

// Legacy routes (kept for compatibility)
router.get('/:sectionId/available-students', getAvailableStudents);
router.get('/:sectionId/available-subjects', getAvailableSubjects);
router.post('/assign/:enrollmentId', assignStudentToSection);

// GET /api/admin/sections/:id/subject-teachers
// Returns distinct subjects in this section with their current instructor and teacherId
router.get('/:id/subject-teachers', async (req, res) => {
  try {
    const sectionId = parseInt(req.params.id);
    const [rows] = await sequelize.query(
      `SELECT DISTINCT es.subjectCode, es.subjectDescription, es.units,
              es.instructor, es.teacherId,
              u.name AS teacherName, u.email AS teacherEmail
       FROM enrollment_subjects es
       LEFT JOIN users u ON es.teacherId = u.id
       WHERE es.sectionId = ?
       ORDER BY es.subjectCode ASC`,
      { replacements: [sectionId] }
    );
    res.json(rows || []);
  } catch (err) {
    console.error('Get subject teachers error:', err);
    res.status(500).json({ error: 'Failed to fetch subject teachers' });
  }
});

// PUT /api/admin/sections/:id/subject-teachers
// Assigns instructor (by teacherId or name) to all enrollment_subjects rows for a specific subject in this section
router.put('/:id/subject-teachers', sanitizeBody, async (req, res) => {
  try {
    const sectionId = parseInt(req.params.id);
    const { subjectCode, teacherId, schedule, room } = req.body;
    if (!subjectCode) return res.status(400).json({ error: 'subjectCode is required' });

    let instructorName = null;
    let resolvedTeacherId = teacherId ? parseInt(teacherId) : null;

    if (resolvedTeacherId) {
      // Look up teacher name from users table
      const [[teacher]] = await sequelize.query(
        `SELECT id, name FROM users WHERE id = ? AND role = 'teacher' AND isActive = 1 LIMIT 1`,
        { replacements: [resolvedTeacherId] }
      );
      if (!teacher) return res.status(404).json({ error: 'Teacher not found or inactive' });
      instructorName = teacher.name;
    }

    const setClauses = ['updatedAt = NOW()'];
    const replacements = [];

    if (teacherId !== undefined) {
      setClauses.push('instructor = ?', 'teacherId = ?');
      replacements.push(instructorName, resolvedTeacherId);
    }
    if (schedule !== undefined) {
      setClauses.push('schedule = ?');
      replacements.push(schedule || null);
    }
    if (room !== undefined) {
      setClauses.push('room = ?');
      replacements.push(room || null);
    }

    replacements.push(sectionId, subjectCode);

    await sequelize.query(
      `UPDATE enrollment_subjects
       SET ${setClauses.join(', ')}
       WHERE sectionId = ? AND subjectCode = ?`,
      { replacements }
    );

    res.json({
      message: `Subject ${subjectCode} schedule updated successfully`,
      instructor: instructorName,
      teacherId: resolvedTeacherId,
      schedule: schedule || null,
      room: room || null
    });
  } catch (err) {
    console.error('Update subject teacher error:', err);
    res.status(500).json({ error: 'Failed to update subject schedule/instructor' });
  }
});

export default router;
