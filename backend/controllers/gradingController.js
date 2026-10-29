import { sequelize } from '../models/db.js';
import { GradingPeriod } from '../models/gradingPeriodModel.js';

// ── Helper: compute final grade + remarks ────────────────────────────────────
function computeFinalAndRemarks(q1, q2, q3, q4) {
  const isFourTerms = q4 !== null && q4 !== undefined && q4 !== '';
  const terms = isFourTerms ? [q1, q2, q3, q4] : [q1, q2, q3];
  const quarters = terms.map(v => (v !== null && v !== undefined && v !== '' ? parseFloat(v) : null));
  const entered = quarters.filter(v => v !== null);

  const totalRequired = isFourTerms ? 4 : 3;

  // Final grade is ONLY calculated and displayed once ALL 3 trimesters have complete grades
  if (entered.length < totalRequired) {
    return { finalGrade: null, remarks: 'Incomplete' };
  }

  const avg = entered.reduce((sum, v) => sum + v, 0) / totalRequired;
  const finalGrade = Math.round(avg * 100) / 100;
  const remarks = finalGrade >= 75 ? 'Passed' : 'Failed';

  return { finalGrade, remarks };
}

// ── ADMIN: Grading Periods ────────────────────────────────────────────────────

/**
 * GET /api/admin/grading-periods
 * List grading periods — optionally filter by schoolYear
 */
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

    const where = year ? { schoolYear: year } : {};
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

    const quarters = ['Q1', 'Q2', 'Q3'];
    let created = 0;

    for (const quarter of quarters) {
      const [, wasCreated] = await GradingPeriod.findOrCreate({
        where: { quarter, schoolYear },
        defaults: { quarter, schoolYear, isOpen: false }
      });
      if (wasCreated) created++;
    }

    const all = await GradingPeriod.findAll({ where: { schoolYear }, order: [['quarter', 'ASC']] });
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
      WHERE (es.teacherId = ? OR es.instructor = ? OR s.teacherId = ? OR s.instructor = ?
             OR EXISTS (SELECT 1 FROM class_schedules cs WHERE cs.sectionId = es.sectionId AND cs.subjectCode = es.subjectCode AND (cs.teacherId = ? OR cs.teacherName = ?)))
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
    `, { replacements: [teacherId, teacherName, teacherId, teacherName, teacherId, teacherName] });

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

    // Verify teacher is assigned to this subject+section or is section adviser
    const [[check]] = await sequelize.query(
      `SELECT es.id FROM enrollment_subjects es
       LEFT JOIN sections s ON es.sectionId = s.id
       WHERE (es.teacherId = ? OR es.instructor = ? OR s.teacherId = ? OR s.instructor = ?
              OR EXISTS (SELECT 1 FROM class_schedules cs WHERE cs.sectionId = es.sectionId AND cs.subjectCode = es.subjectCode AND (cs.teacherId = ? OR cs.teacherName = ?)))
         AND es.sectionId = ? AND es.subjectCode = ? LIMIT 1`,
      { replacements: [teacherId, teacherName, teacherId, teacherName, teacherId, teacherName, sectionId, subjectCode] }
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

    const processedStudents = (students || []).map(s => {
      const isComplete = s.q1 != null && s.q1 !== '' && s.q2 != null && s.q2 !== '' && s.q3 != null && s.q3 !== '';
      return {
        ...s,
        finalGrade: isComplete ? s.finalGrade : null,
        remarks: isComplete ? s.remarks : 'Incomplete'
      };
    });

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
 * Save one or more quarterly grades for a student's subject
 * Body: { quarter: 'Q1'|'Q2'|'Q3'|'Q4', grade: number }
 * Quarter must be open (admin-controlled)
 */
export const saveGrade = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const enrollmentSubjectId = parseInt(req.params.enrollmentSubjectId);
    const { quarter, grade } = req.body;

    if (isNaN(enrollmentSubjectId)) return res.status(400).json({ error: 'Invalid enrollment subject ID' });

    const validQuarters = ['Q1', 'Q2', 'Q3', 'Q4', '1st Tri', '2nd Tri', '3rd Tri'];
    if (!validQuarters.includes(quarter)) {
      return res.status(400).json({ error: 'Invalid grading period' });
    }

    const gradeNum = parseFloat(grade);
    if (grade !== null && grade !== '' && (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100)) {
      return res.status(400).json({ error: 'Grade must be a number between 0 and 100' });
    }

    const teacherName = req.user.name;

    // Verify teacher owns this enrollment subject or is section adviser
    const [[es]] = await sequelize.query(
      `SELECT es.* FROM enrollment_subjects es
       LEFT JOIN sections s ON es.sectionId = s.id
       WHERE es.id = ? AND (es.teacherId = ? OR es.instructor = ? OR s.teacherId = ? OR s.instructor = ?
              OR EXISTS (SELECT 1 FROM class_schedules cs WHERE cs.sectionId = es.sectionId AND cs.subjectCode = es.subjectCode AND (cs.teacherId = ? OR cs.teacherName = ?)))`,
      { replacements: [enrollmentSubjectId, teacherId, teacherName, teacherId, teacherName, teacherId, teacherName] }
    );
    if (!es) return res.status(403).json({ error: 'You are not authorized to grade this student for this subject' });

    // Check the grading period is open
    const [[period]] = await sequelize.query(
      `SELECT gp.isOpen FROM grading_periods gp
       JOIN sections s ON s.schoolYear = gp.schoolYear
       WHERE s.id = ? AND gp.quarter = ?
       LIMIT 1`,
      { replacements: [es.sectionId, quarter] }
    );

    if (!period) {
      return res.status(400).json({ error: `Grading period for ${quarter} has not been set up yet. Ask admin to open grading.` });
    }
    if (!period.isOpen) {
      return res.status(403).json({ error: `${quarter} grading period is closed. Contact admin to open it.` });
    }

    // Save the grade for this quarter/trimester
    const colMap = { Q1: 'q1', Q2: 'q2', Q3: 'q3', Q4: 'q4', '1st Tri': 'q1', '2nd Tri': 'q2', '3rd Tri': 'q3' };
    const col = colMap[quarter];
    const gradeValue = (grade === null || grade === '') ? null : gradeNum;

    // Re-fetch to get all quarters for final grade computation
    const [[current]] = await sequelize.query(
      `SELECT q1, q2, q3, q4 FROM enrollment_subjects WHERE id = ?`,
      { replacements: [enrollmentSubjectId] }
    );

    const updated = { ...current, [col]: gradeValue };
    const { finalGrade, remarks } = computeFinalAndRemarks(updated.q1, updated.q2, updated.q3, updated.q4);

    await sequelize.query(
      `UPDATE enrollment_subjects
       SET ${col} = ?, finalGrade = ?, remarks = ?, updatedAt = NOW()
       WHERE id = ?`,
      { replacements: [gradeValue, finalGrade, remarks, enrollmentSubjectId] }
    );

    res.json({
      message: `${quarter} grade saved`,
      quarter,
      grade: gradeValue,
      finalGrade,
      remarks
    });
  } catch (err) {
    console.error('saveGrade error:', err);
    res.status(500).json({ error: 'Failed to save grade' });
  }
};

// ── STUDENT: View Grades ──────────────────────────────────────────────────────

/**
 * GET /api/enrollments/:id/grades
 * Student views their own grades per subject
 */
export const getStudentGrades = async (req, res) => {
  try {
    const enrollmentId = parseInt(req.params.id);

    // Verify ownership (student can only see their own grades)
    const [[enrollment]] = await sequelize.query(
      'SELECT userId FROM enrollment_records WHERE id = ?',
      { replacements: [enrollmentId] }
    );
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    const isOwner = enrollment.userId === req.user.id;
    const isStaff = ['admin', 'registrar', 'teacher'].includes(req.user.role);
    if (!isOwner && !isStaff) return res.status(403).json({ error: 'Access denied' });

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

    // Ensure finalGrade and remarks are only finalized if all 3 trimesters are complete
    const processedGrades = (grades || []).map(g => {
      const isFourTerms = g.q4 !== null && g.q4 !== undefined && g.q4 !== '';
      const isComplete = isFourTerms
        ? (g.q1 != null && g.q1 !== '' && g.q2 != null && g.q2 !== '' && g.q3 != null && g.q3 !== '' && g.q4 != null && g.q4 !== '')
        : (g.q1 != null && g.q1 !== '' && g.q2 != null && g.q2 !== '' && g.q3 != null && g.q3 !== '');
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

    // Students only see whole numbers (rounded); decimals are preserved for teachers & registrar/admin
    const isStudent = !isStaff || req.user.role === 'student';
    const roundVal = (v) => (v !== null && v !== undefined && v !== '' ? Math.round(parseFloat(v)) : null);

    const formattedGrades = processedGrades.map(g => {
      if (!isStudent) return g;
      return {
        ...g,
        q1: roundVal(g.q1),
        q2: roundVal(g.q2),
        q3: roundVal(g.q3),
        q4: roundVal(g.q4),
        finalGrade: g.finalGrade !== null ? Math.round(parseFloat(g.finalGrade)) : null,
      };
    });

    res.json({
      grades: formattedGrades,
      summary: {
        total: processedGrades.length,
        passed,
        failed,
        incomplete,
        gwa: gwa !== null ? (isStudent ? Math.round(gwa) : Math.round(gwa * 100) / 100) : null
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
      const isComplete = r.q1 != null && r.q1 !== '' && r.q2 != null && r.q2 !== '' && r.q3 != null && r.q3 !== '';
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
