import { sequelize } from '../models/db.js';
import { GradingPeriod } from '../models/gradingPeriodModel.js';

export const getGradingPeriods = async (req, res) => {
  try {
    const { schoolYear } = req.query;

    // Default to active school year if none specified
    let year = schoolYear;
    if (!year) {
      try {
        const [[sy]] = await sequelize.query("SELECT year FROM school_years WHERE isActive = 1 LIMIT 1");
        if (sy?.year) year = sy.year;
      } catch (_) {}
    }

    const where = year ? { schoolYear: year, quarter: 'FINAL' } : { quarter: 'FINAL' };
    const periods = await GradingPeriod.findAll({
      where,
      order: [['quarter', 'ASC']]
    });

    res.json(periods);
  } catch (err) {
    console.error('getGradingPeriods error:', err);
    res.status(500).json({ error: 'Failed to fetch grading periods' });
  }
};

/**
 * POST /api/admin/grading-periods/setup
 * Auto-create Q1–Q4 for a school year (idempotent — skips existing ones)
 */
export const setupGradingPeriods = async (req, res) => {
  try {
    let { schoolYear } = req.body;

    if (!schoolYear) {
      const [[sy]] = await sequelize.query("SELECT year FROM school_years WHERE isActive = 1 LIMIT 1");
      if (!sy?.year) return res.status(400).json({ error: 'No active school year found. Provide schoolYear in body.' });
      schoolYear = sy.year;
    }

    const quarters = ['FINAL'];
    let created = 0;

    for (const quarter of quarters) {
      const [, wasCreated] = await GradingPeriod.findOrCreate({
        where: { quarter, schoolYear },
        defaults: { quarter, schoolYear, isOpen: false }
      });
      if (wasCreated) created++;
    }

    const all = await GradingPeriod.findAll({ where: { schoolYear, quarter: 'FINAL' }, order: [['quarter', 'ASC']] });
    res.json({ message: `Grading periods ready for ${schoolYear}. ${created} new period(s) created.`, periods: all });
  } catch (err) {
    console.error('setupGradingPeriods error:', err);
    res.status(500).json({ error: 'Failed to setup grading periods' });
  }
};

/**
 * PUT /api/admin/grading-periods/:id/open
 * Open a grading period — teachers can now enter grades for this quarter
 */
export const openGradingPeriod = async (req, res) => {
  try {
    const period = await GradingPeriod.findByPk(req.params.id);
    if (!period) return res.status(404).json({ error: 'Grading period not found' });
    if (period.quarter !== 'FINAL') return res.status(400).json({ error: 'Only year-end grade submission is supported.' });
    if (period.isOpen) return res.status(400).json({ error: `${period.quarter} is already open` });

    await period.update({ isOpen: true, openedAt: new Date(), closedAt: null });
    res.json({ message: `${period.quarter} (${period.schoolYear}) is now open for grade entry.`, period });
  } catch (err) {
    console.error('openGradingPeriod error:', err);
    res.status(500).json({ error: 'Failed to open grading period' });
  }
};

/**
 * PUT /api/admin/grading-periods/:id/close
 * Close/lock a grading period — no more grade edits allowed
 */
export const closeGradingPeriod = async (req, res) => {
  try {
    const period = await GradingPeriod.findByPk(req.params.id);
    if (!period) return res.status(404).json({ error: 'Grading period not found' });
    if (!period.isOpen) return res.status(400).json({ error: `${period.quarter} is already closed` });

    await period.update({ isOpen: false, closedAt: new Date() });
    res.json({ message: `${period.quarter} (${period.schoolYear}) has been closed and locked.`, period });
  } catch (err) {
    console.error('closeGradingPeriod error:', err);
    res.status(500).json({ error: 'Failed to close grading period' });
  }
};

// ── TEACHER: Grade Entry ──────────────────────────────────────────────────────

/**
 * GET /api/teacher/classes
 * Returns all subject+section combos where teacherId = logged-in teacher
 * One teacher can handle multiple subjects across multiple sections
 */
export const getTeacherClasses = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const teacherName = req.user.name;

    const [classes] = await sequelize.query(`
      SELECT
        es.subjectCode,
        es.subjectDescription,
        es.sectionId,
        es.sectionName,
        s.course,
        s.yearLevel,
        s.strand,
        s.schoolYear,
        s.semester,
        COUNT(es.id) AS studentCount
      FROM enrollment_subjects es
      LEFT JOIN sections s ON es.sectionId = s.id
      WHERE (es.teacherId = ? OR (es.teacherId IS NULL AND es.instructor = ?))
        AND es.status = 'enrolled'
        AND (s.isActive = 1 OR s.isActive IS NULL)
      GROUP BY 
        es.subjectCode,
        es.subjectDescription,
        es.sectionId,
        es.sectionName,
        s.course,
        s.yearLevel,
        s.strand,
        s.schoolYear,
        s.semester
      ORDER BY s.yearLevel ASC, es.subjectCode ASC, es.sectionName ASC
    `, { replacements: [teacherId, teacherName] });

    res.json(classes || []);
  } catch (err) {
    console.error('getTeacherClasses error:', err);
    res.status(500).json({ error: 'Failed to fetch teacher classes' });
  }
};

/**
 * GET /api/teacher/classes/:sectionId/:subjectCode/grades
 * Get grade sheet — all students in a section for a specific subject
 * Teacher must be assigned to this subject in this section
 */
export const getGradeSheet = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const teacherName = req.user.name;
    const sectionId = parseInt(req.params.sectionId);
    const { subjectCode } = req.params;

    if (isNaN(sectionId)) return res.status(400).json({ error: 'Invalid section ID' });

    // Verify teacher is assigned to this subject+section
    const [[check]] = await sequelize.query(
      `SELECT es.id FROM enrollment_subjects es
       LEFT JOIN sections s ON es.sectionId = s.id
       WHERE (es.teacherId = ? OR (es.teacherId IS NULL AND es.instructor = ?))
         AND es.sectionId = ? AND es.subjectCode = ? LIMIT 1`,
      { replacements: [teacherId, teacherName, sectionId, subjectCode] }
    );
    if (!check) {
      return res.status(403).json({ error: 'You are not assigned to this subject in this section' });
    }

    // Get section info
    const [[section]] = await sequelize.query(
      `SELECT id, code, course, yearLevel, strand, semester, schoolYear FROM sections WHERE id = ?`,
      { replacements: [sectionId] }
    );

    // Get all students with their grades for this subject
    const [students] = await sequelize.query(`
      SELECT
        es.id AS enrollmentSubjectId,
        er.id AS enrollmentId,
        er.firstName,
        er.middleName,
        er.familyName,
        er.studentNumber,
        er.lrn,
        es.q1, es.q2, es.q3, es.q4,
        es.finalGrade,
        es.remarks
      FROM enrollment_subjects es
      JOIN enrollment_records er ON es.enrollmentId = er.id
      WHERE es.sectionId = ?
        AND es.subjectCode = ?
        AND es.status = 'enrolled'
        AND er.status IN ('enrolled', 'active', 'completed')
      ORDER BY er.familyName ASC, er.firstName ASC
    `, { replacements: [sectionId, subjectCode] });

    // Get active grading periods for context
    let activeSchoolYear = section?.schoolYear;
    const [periods] = await sequelize.query(
      `SELECT quarter, isOpen FROM grading_periods WHERE schoolYear = ? ORDER BY quarter ASC`,
      { replacements: [activeSchoolYear || ''] }
    );

    const processedStudents = students || [];

    res.json({
      section: section || null,
      subjectCode,
      students: processedStudents,
      gradingPeriods: periods || []
    });
  } catch (err) {
    console.error('getGradeSheet error:', err);
    res.status(500).json({ error: 'Failed to fetch grade sheet' });
  }
};

/**
 * PUT /api/teacher/grades/:enrollmentSubjectId
 * Submit a year-end final grade for a student's assigned subject.
 * Body: { finalGrade: number }; admin must open the FINAL submission window.
 */
export const saveGrade = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const enrollmentSubjectId = Number(req.params.enrollmentSubjectId);
    const { finalGrade } = req.body;
    if (!Number.isInteger(enrollmentSubjectId) || enrollmentSubjectId <= 0) return res.status(400).json({ error: 'Invalid enrollment subject ID' });
    if (req.body.quarter !== undefined) return res.status(400).json({ error: 'Submit a year-end finalGrade instead of quarterly grades.' });
    const gradeNum = Number(finalGrade);
    if (finalGrade === null || finalGrade === undefined || !['number', 'string'].includes(typeof finalGrade) || String(finalGrade).trim() === '' || !Number.isFinite(gradeNum) || gradeNum < 0 || gradeNum > 100) {
      return res.status(400).json({ error: 'Final grade must be a number between 0 and 100' });
    }

    const teacherName = req.user.name;

    // Verify teacher owns this enrollment subject
    const [[es]] = await sequelize.query(
      `SELECT es.* FROM enrollment_subjects es
       LEFT JOIN sections s ON es.sectionId = s.id
       WHERE es.id = ? AND (es.teacherId = ? OR (es.teacherId IS NULL AND es.instructor = ?))`,
      { replacements: [enrollmentSubjectId, teacherId, teacherName] }
    );
    if (!es) return res.status(403).json({ error: 'You are not authorized to grade this student for this subject' });

    // Check the grading period is open
    const [[period]] = await sequelize.query(
      `SELECT gp.isOpen FROM grading_periods gp
       JOIN sections s ON s.schoolYear = gp.schoolYear
       WHERE s.id = ? AND gp.quarter = ?
       LIMIT 1`,
      { replacements: [es.sectionId, 'FINAL'] }
    );

    if (!period) {
      return res.status(400).json({ error: 'Year-end submission has not been set up. Ask admin to open it.' });
    }
    if (!period.isOpen) {
      return res.status(403).json({ error: 'Year-end submission is closed. Contact admin to open it.' });
    }

    const value = Math.round(gradeNum * 100) / 100;
    const remarks = value >= 75 ? 'Passed' : 'Failed';
    // Check the window again in the write so a concurrent close prevents edits.
    const [, result] = await sequelize.query(
      `UPDATE enrollment_subjects es JOIN sections s ON s.id = es.sectionId
       SET es.finalGrade = ?, es.remarks = ?, es.updatedAt = NOW()
       WHERE es.id = ? AND EXISTS (SELECT 1 FROM grading_periods gp WHERE gp.schoolYear = s.schoolYear AND gp.quarter = 'FINAL' AND gp.isOpen = 1)`,
      { replacements: [value, remarks, enrollmentSubjectId] }
    );
    const affected = typeof result === 'number' ? result : result?.affectedRows;
    if (!affected) return res.status(409).json({ error: 'Submission window changed. Refresh and try again.' });
    res.json({ message: 'Year-end final grade submitted', finalGrade: value, remarks });
  } catch (err) {
    console.error('saveGrade error:', err);
    res.status(500).json({ error: 'Failed to save grade' });
  }
};

// ── STUDENT: View Grades ──────────────────────────────────────────────────────

/**
 * GET /api/enrollments/:id/grades
 * Admin/registrar view grade records; students are denied.
 */
export const getStudentGrades = async (req, res) => {
  if (!['admin', 'registrar'].includes(req.user?.role)) return res.status(403).json({ error: 'Grade records are available only to admin and registrar.' });
  try {
    const enrollmentId = parseInt(req.params.id);

    // Only admin and registrar may review enrollment grade records.
    const [[enrollment]] = await sequelize.query(
      'SELECT userId FROM enrollment_records WHERE id = ?',
      { replacements: [enrollmentId] }
    );
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });


    const [grades] = await sequelize.query(`
      SELECT
        es.id,
        es.subjectCode,
        es.subjectDescription,
        es.units,
        es.instructor,
        es.sectionName,
        es.q1, es.q2, es.q3, es.q4,
        es.finalGrade,
        es.remarks,
        es.status
      FROM enrollment_subjects es
      WHERE es.enrollmentId = ?
        AND es.status != 'dropped'
      ORDER BY es.subjectCode ASC
    `, { replacements: [enrollmentId] });

    // Final grades are submitted directly at year-end.
    const processedGrades = (grades || []).map(g => {
      const isComplete = g.finalGrade !== null && g.finalGrade !== undefined && g.finalGrade !== '';
      return {
        ...g,
        finalGrade: isComplete ? g.finalGrade : null,
        remarks: isComplete ? g.remarks : 'Incomplete'
      };
    });

    // Summary stats based on complete grades
    const passed = processedGrades.filter(g => g.remarks === 'Passed').length;
    const failed = processedGrades.filter(g => g.remarks === 'Failed').length;
    const incomplete = processedGrades.filter(g => !g.remarks || g.remarks === 'Incomplete').length;
    const completedGrades = processedGrades.filter(g => g.finalGrade !== null);
    const gwa = completedGrades.length > 0
      ? completedGrades.reduce((sum, g) => sum + parseFloat(g.finalGrade), 0) / completedGrades.length
      : null;

    res.json({
      grades: processedGrades,
      summary: {
        total: processedGrades.length,
        passed,
        failed,
        incomplete,
        gwa: gwa !== null ? Math.round(gwa * 100) / 100 : null
      }
    });
  } catch (err) {
    console.error('getStudentGrades error:', err);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
};

// ── ADMIN/REGISTRAR: View section grades ─────────────────────────────────────

/**
 * GET /api/admin/sections/:sectionId/grades
 * View all grades for a section (admin/registrar)
 */
export const getSectionGrades = async (req, res) => {
  try {
    const sectionId = parseInt(req.params.sectionId);

    const [[section]] = await sequelize.query(
      'SELECT id, code, course, yearLevel, strand, schoolYear FROM sections WHERE id = ?',
      { replacements: [sectionId] }
    );
    if (!section) return res.status(404).json({ error: 'Section not found' });

    const [rows] = await sequelize.query(`
      SELECT
        er.id AS enrollmentId,
        er.firstName, er.middleName, er.familyName,
        er.studentNumber, er.lrn,
        es.id AS enrollmentSubjectId,
        es.subjectCode, es.subjectDescription, es.units,
        es.instructor,
        es.q1, es.q2, es.q3, es.q4,
        es.finalGrade, es.remarks
      FROM enrollment_subjects es
      JOIN enrollment_records er ON es.enrollmentId = er.id
      WHERE es.sectionId = ?
        AND es.status = 'enrolled'
        AND er.status IN ('enrolled', 'active', 'completed')
      ORDER BY er.familyName ASC, er.firstName ASC, es.subjectCode ASC
    `, { replacements: [sectionId] });

    const processedRows = (rows || []).map(r => {
      const isComplete = r.finalGrade !== null && r.finalGrade !== undefined && r.finalGrade !== '';
      return {
        ...r,
        finalGrade: isComplete ? r.finalGrade : null,
        remarks: isComplete ? r.remarks : 'Incomplete'
      };
    });

    res.json({ section, grades: processedRows });
  } catch (err) {
    console.error('getSectionGrades error:', err);
    res.status(500).json({ error: 'Failed to fetch section grades' });
  }
};
