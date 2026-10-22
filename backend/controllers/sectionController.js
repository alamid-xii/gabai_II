import { Section } from '../models/sectionModel.js';
import { EnrollmentRecord } from '../models/enrollmentRecordModel.js';
import { EnrollmentSubject } from '../models/enrollmentSubjectModel.js';
import { Subject } from '../models/subjectModel.js';
import { sequelize } from '../models/db.js';
import { Op } from 'sequelize';
import { removeFromSection, moveToSection, autoAssignSection } from '../services/sectionAssignment.js';

try { await sequelize.authenticate(); } catch (err) { console.warn("DB unavailable at import (sectionController):", err.message); }

// Get all sections with real-time student count from enrollment_records
export const getAllSections = async (req, res) => {
  try {
    // Use a JOIN to get accurate real-time counts directly from enrollment_records
    const [sections] = await sequelize.query(`
      SELECT s.id, s.code, s.course, s.yearLevel, s.strand, s.semester,
             s.schoolYear, s.instructor, s.schedule, s.room,
             s.capacity, s.teacherId, s.createdAt, s.updatedAt,
             COUNT(er.id) as currentEnrollment
      FROM sections s
      LEFT JOIN enrollment_records er
        ON er.sectionId = s.id
        AND er.status IN ('enrolled', 'active', 'completed')
      WHERE s.isActive = 1
      GROUP BY s.id
      ORDER BY s.code ASC
    `);

    res.json(sections || []);
  } catch (error) {
    console.error('Get sections error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create new section
export const createSection = async (req, res) => {
  try {
    const { code, course, yearLevel, strand, semester, schoolYear, instructor, schedule, room, capacity } = req.body;

    if (!code || !course || !yearLevel || !semester || !schoolYear) {
      return res.status(400).json({ 
        message: 'Code, course, yearLevel, semester, and schoolYear are required' 
      });
    }

    const section = await Section.create({
      code,
      course,
      yearLevel,
      strand: strand || null,
      semester,
      schoolYear,
      instructor: instructor || null,
      schedule: schedule || null,
      room: room || null,
      capacity: capacity || 40,
      isActive: true
    });

    res.status(201).json(section);
  } catch (error) {
    console.error('Create section error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update section
export const updateSection = async (req, res) => {
  try {
    const section = await Section.findByPk(req.params.id);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Explicit whitelist — prevents mass assignment
    const { code, course, yearLevel, strand, semester, schoolYear, instructor, schedule, room, capacity, teacherId } = req.body;
    const updateData = {};
    if (code !== undefined)       updateData.code = code;
    if (course !== undefined)     updateData.course = course;
    if (yearLevel !== undefined)  updateData.yearLevel = Number(yearLevel);
    if (strand !== undefined)     updateData.strand = strand || null;  // empty string → null
    if (semester !== undefined)   updateData.semester = semester;
    if (schoolYear !== undefined) updateData.schoolYear = schoolYear;
    if (instructor !== undefined) updateData.instructor = instructor || null;
    if (schedule !== undefined)   updateData.schedule = schedule || null;
    if (room !== undefined)       updateData.room = room || null;
    if (capacity !== undefined)   updateData.capacity = Number(capacity);
    if (teacherId !== undefined)  updateData.teacherId = teacherId || null;

    await section.update(updateData);
    res.json(section);
  } catch (error) {
    console.error('Update section error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete section
export const deleteSection = async (req, res) => {
  try {
    const section = await Section.findByPk(req.params.id);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    await section.update({ isActive: false });
    res.json({ message: 'Section deleted' });
  } catch (error) {
    console.error('Delete section error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get available students for a section
export const getAvailableStudents = async (req, res) => {
  try {
    const { sectionId } = req.params;

    // Get section details
    const section = await Section.findByPk(sectionId);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Get approved enrollments that don't have subjects assigned yet
    const students = await EnrollmentRecord.findAll({
      where: {
        status: 'approved'
      },
      attributes: ['id', 'firstName', 'familyName', 'studentNumber', 'course', 'educationLevel'],
      order: [['firstName', 'ASC']]
    });

    res.json(students);
  } catch (error) {
    console.error('Get available students error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get available subjects for a section
export const getAvailableSubjects = async (req, res) => {
  try {
    const { sectionId } = req.params;

    // Get section details
    const section = await Section.findByPk(sectionId);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Get subjects matching the section's course
    const subjects = await Subject.findAll({
      where: {
        isActive: true,
        programCode: section.course
      },
      attributes: ['id', 'code', 'description', 'units'],
      order: [['code', 'ASC']]
    });

    res.json(subjects);
  } catch (error) {
    console.error('Get available subjects error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Assign student to section for a subject
export const assignStudentToSection = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { subjectId, sectionId } = req.body;

    if (!subjectId || !sectionId) {
      return res.status(400).json({ message: 'Subject and section are required' });
    }

    // Get enrollment subject record
    const enrollmentSubject = await EnrollmentSubject.findOne({
      where: {
        enrollmentId,
        subjectId
      }
    });

    if (!enrollmentSubject) {
      return res.status(404).json({ message: 'Enrollment subject not found' });
    }

    // Update with section assignment
    await enrollmentSubject.update({
      sectionId,
      assignedAt: new Date()
    });

    res.json({
      message: 'Student assigned to section successfully',
      enrollmentSubject
    });
  } catch (error) {
    console.error('Assign student error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ── Get students assigned to a specific section ───────────────────────────────
export const getSectionStudents = async (req, res) => {
  try {
    const { id } = req.params;

    const section = await Section.findByPk(id);
    if (!section) return res.status(404).json({ error: 'Section not found' });

    const [students] = await sequelize.query(
      `SELECT id, firstName, familyName, middleName, studentNumber, lrn, sex, gradeLevel, strand,
              educationLevel, educationLevel AS course, enrollmentType, status, lifeStatus, lifeStatusDate, sectionName, approved_at, createdAt
       FROM enrollment_records
       WHERE sectionId = ?
       ORDER BY familyName ASC, firstName ASC`,
      { replacements: [id] }
    );

    // Fetch subjects assigned to this section
    let [subjects] = await sequelize.query(
      `SELECT DISTINCT subjectCode AS code, subjectDescription AS description, units, schedule, instructor, room
       FROM enrollment_subjects
       WHERE sectionId = ?
       ORDER BY subjectCode ASC`,
      { replacements: [id] }
    );

    if (!subjects || subjects.length === 0) {
      const gradeNum = parseInt(section.yearLevel) || 7;
      const strandFilter = section.course === 'SHS' && section.strand ? section.strand : null;
      let query = `
        SELECT code, description, units, null AS schedule, ? AS instructor, ? AS room
        FROM subjects
        WHERE programCode = ? AND gradeLevel = ? AND isActive = 1
      `;
      const params = [section.instructor || null, section.room || null, section.course, gradeNum];
      if (strandFilter) {
        query += ` AND (strand = ? OR strand IS NULL OR strand = '')`;
        params.push(strandFilter);
      }
      query += ` ORDER BY code ASC`;
      const [curriculumSubjects] = await sequelize.query(query, { replacements: params });
      subjects = curriculumSubjects || [];
    }

    res.json({ section: section.toJSON(), students: students || [], subjects: subjects || [] });
  } catch (error) {
    console.error('Get section students error:', error);
    res.status(500).json({ error: 'Failed to fetch section students' });
  }
};

// ── Get unassigned (approved but no section) students ─────────────────────────
export const getUnassignedStudents = async (req, res) => {
  try {
    const [students] = await sequelize.query(
      `SELECT id, firstName, familyName, studentNumber, educationLevel, educationLevel AS course, gradeLevel,
              enrollmentType, status, approved_at
       FROM enrollment_records
       WHERE status = 'approved' AND (sectionId IS NULL OR sectionId = '')
       ORDER BY approved_at ASC`,
      {}
    );

    res.json(students || []);
  } catch (error) {
    console.error('Get unassigned students error:', error);
    res.status(500).json({ error: 'Failed to fetch unassigned students' });
  }
};

// ── Remove student from section ───────────────────────────────────────────────
export const removeStudentFromSection = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const result = await removeFromSection(parseInt(enrollmentId));
    if (!result.success) return res.status(400).json({ error: result.reason });
    res.json({ message: 'Student removed from section' });
  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({ error: 'Failed to remove student from section' });
  }
};

// ── Move student to a different section ──────────────────────────────────────
export const moveStudentToSection = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { sectionId } = req.body;

    if (!sectionId) return res.status(400).json({ error: 'sectionId is required' });

    const result = await moveToSection(parseInt(enrollmentId), parseInt(sectionId));
    if (!result.success) return res.status(400).json({ error: result.reason });

    res.json({ message: `Student moved to section ${result.section.code}`, section: result.section });
  } catch (error) {
    console.error('Move student error:', error);
    res.status(500).json({ error: 'Failed to move student' });
  }
};

// ── Manually assign an unassigned student to a section ───────────────────────
export const manualAssignStudent = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { sectionId } = req.body;

    if (!sectionId) return res.status(400).json({ error: 'sectionId is required' });

    const result = await moveToSection(parseInt(enrollmentId), parseInt(sectionId));
    if (!result.success) return res.status(400).json({ error: result.reason });

    res.json({ message: `Student assigned to section ${result.section.code}`, section: result.section });
  } catch (error) {
    console.error('Manual assign error:', error);
    res.status(500).json({ error: 'Failed to assign student' });
  }
};

// ── Re-run auto-assign for all unassigned approved students ──────────────────
export const autoAssignAll = async (req, res) => {
  try {
    const [unassigned] = await sequelize.query(
      `SELECT id FROM enrollment_records
       WHERE status = 'approved' AND (sectionId IS NULL OR sectionId = '')`,
      {}
    );

    let assigned = 0;
    let failed = 0;
    const failures = [];

    for (const row of unassigned) {
      const result = await autoAssignSection(row.id);
      if (result.assigned) {
        assigned++;
      } else {
        failed++;
        failures.push({ enrollmentId: row.id, reason: result.reason });
      }
    }

    res.json({
      message: `Auto-assign complete: ${assigned} assigned, ${failed} could not be assigned`,
      assigned,
      failed,
      failures
    });
  } catch (error) {
    console.error('Auto-assign all error:', error);
    res.status(500).json({ error: 'Failed to run auto-assign' });
  }
};
