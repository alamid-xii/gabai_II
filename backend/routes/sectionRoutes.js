import express from 'express';
import { authenticateToken, requireAdminOrRegistrar } from '../middleware/auth.js';
import { sanitizeBody, validateSection } from '../middleware/validate.js';
import { Section } from '../models/sectionModel.js';
import { Subject } from '../models/subjectModel.js';
import { SectionSubjectAssignment } from '../models/sectionSubjectAssignmentModel.js';
import { subjectMatchesScope } from '../services/academicScope.js';
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

// Section configuration exists independently of the current student roster.
router.get('/:id/subject-teachers', async (req, res) => {
  try {
    const section = await Section.findByPk(req.params.id);
    if (!section) return res.status(404).json({ error: 'Section not found' });
    const track = section.strand || (section.course === 'JHS' ? 'Regular' : '');
    const [rows] = await sequelize.query(`SELECT s.code AS subjectCode, s.description AS subjectDescription, s.units,
      CASE WHEN a.id IS NULL THEN du.name ELSE au.name END AS instructor,
      CASE WHEN a.id IS NULL THEN du.id ELSE au.id END AS teacherId,
      CASE WHEN a.id IS NULL THEN du.name ELSE au.name END AS teacherName,
      CASE WHEN a.id IS NULL THEN du.email ELSE au.email END AS teacherEmail,
      a.schedule, a.room
      FROM subjects s
      LEFT JOIN section_subject_assignments a ON a.sectionId = ? AND a.subjectCode = s.code
      LEFT JOIN users du ON du.id = s.teacherId AND du.role = 'teacher' AND du.isActive = 1
      LEFT JOIN users au ON au.id = a.teacherId AND au.role = 'teacher' AND au.isActive = 1
      WHERE s.programCode = ? AND s.gradeLevel = ? AND s.semester = ? AND s.isActive = 1
        AND (s.strand = ? OR s.strand IS NULL OR s.strand = '') ORDER BY s.code`, {
      replacements: [section.id, section.course, section.yearLevel, section.semester, track],
    });
    res.json(rows);
  } catch (err) {
    console.error('Get subject teachers error:', err);
    res.status(500).json({ error: 'Failed to fetch subject teachers' });
  }
});

router.put('/:id/subject-teachers', sanitizeBody, async (req, res) => {
  try {
    const sectionId = Number(req.params.id);
    const { subjectCode, teacherId, schedule, room } = req.body;
    if (typeof subjectCode !== 'string' || !subjectCode.trim()) return res.status(400).json({ error: 'subjectCode is required' });
    const section = await Section.findByPk(sectionId);
    if (!section) return res.status(404).json({ error: 'Section not found' });
    const subject = await Subject.findOne({ where: { code: subjectCode, isActive: true } });
    if (!subject || !subjectMatchesScope(subject, section)) return res.status(400).json({ error: 'Choose a subject in this section curriculum.' });
    let instructor = null;
    const resolvedTeacherId = teacherId === '' || teacherId == null ? null : Number(teacherId);
    if (teacherId !== undefined && resolvedTeacherId !== null) {
      if (!Number.isSafeInteger(resolvedTeacherId) || resolvedTeacherId < 1) return res.status(400).json({ error: 'Select a valid teacher.' });
      const [[teacher]] = await sequelize.query("SELECT id, name FROM users WHERE id = ? AND role = 'teacher' AND isActive = 1 LIMIT 1", { replacements: [resolvedTeacherId] });
      if (!teacher) return res.status(404).json({ error: 'Teacher not found or inactive' });
      instructor = teacher.name;
    }
    await sequelize.transaction(async transaction => {
      const locked = await Section.findByPk(sectionId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!locked?.isActive) throw Object.assign(new Error('Section not found or inactive'), { status: 404 });
      const existing = await SectionSubjectAssignment.findOne({ where: { sectionId, subjectCode }, transaction });
      const input = existing ? existing.toJSON() : { sectionId, subjectCode, teacherId: subject.teacherId || null, instructor: null, schedule: null, room: null };
      if (teacherId !== undefined) Object.assign(input, { teacherId: resolvedTeacherId, instructor });
      else if (!existing && subject.teacherId) {
        const [[teacher]] = await sequelize.query("SELECT name FROM users WHERE id = ? AND role = 'teacher' AND isActive = 1 LIMIT 1", { replacements: [subject.teacherId], transaction });
        input.instructor = teacher?.name || null;
        if (!teacher) input.teacherId = null;
      }
      if (schedule !== undefined) input.schedule = schedule || null;
      if (room !== undefined) input.room = room || null;
      await SectionSubjectAssignment.upsert(input, { transaction });
      const clauses = [], replacements = [];
      if (teacherId !== undefined) { clauses.push('instructor = ?', 'teacherId = ?'); replacements.push(instructor, resolvedTeacherId); }
      if (schedule !== undefined) { clauses.push('schedule = ?'); replacements.push(schedule || null); }
      if (room !== undefined) { clauses.push('room = ?'); replacements.push(room || null); }
      if (clauses.length) await sequelize.query(`UPDATE enrollment_subjects SET ${clauses.join(', ')}, updatedAt = NOW() WHERE sectionId = ? AND subjectCode = ?`, { replacements: [...replacements, sectionId, subjectCode], transaction });
    });
    res.json({ message: `Subject ${subjectCode} assignment updated successfully`, instructor, teacherId: resolvedTeacherId, schedule: schedule || null, room: room || null });
  } catch (err) {
    console.error('Update subject teacher error:', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to update subject schedule/instructor' });
  }
});

export default router;
