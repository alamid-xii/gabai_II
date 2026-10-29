import { generateStudentNumber } from "../services/studentNumbers.js";
import { validateForReview } from "../services/enrollmentReview.js";
import { sendEnrollmentVerifiedEmail, sendEnrollmentReturnedEmail, sendSSCExamScheduledEmail, sendSSCResultEmail, sendEnrollmentApprovedEmail, sendLifeStatusEmail } from '../services/emailService.js';
import { sequelize } from '../models/db.js';
import { autoAssignSection, moveToSection, removeFromSection } from '../services/sectionAssignment.js';

/**
 * Generate a unique student ID in YYYY-NNNNN format (shared with adminEnrollmentController)
 */


// ── Dashboard stats ───────────────────────────────────────────────────────────
export const getRegistrarStats = async (req, res) => {
  try {
    // Get active school year for filtering
    let yearFilter = '';
    let yearParam = [];
    try {
      const [[sy]] = await sequelize.query("SELECT year FROM school_years WHERE isActive = 1 LIMIT 1");
      if (sy?.year) { yearFilter = `AND academicYear = ?`; yearParam = [sy.year]; }
    } catch (_) {}

    const [[summary]] = await sequelize.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'submitted'    THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN status = 'pending_exam' THEN 1 ELSE 0 END) as pending_exam,
        SUM(CASE WHEN status = 'verified'     THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN status = 'returned'     THEN 1 ELSE 0 END) as returned,
        SUM(CASE WHEN status = 'approved'     THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'enrolled'     THEN 1 ELSE 0 END) as enrolled,
        SUM(CASE WHEN educationLevel = 'JHS'  THEN 1 ELSE 0 END) as jhs,
        SUM(CASE WHEN educationLevel = 'SHS'  THEN 1 ELSE 0 END) as shs
      FROM enrollment_records
      WHERE status IN ('submitted', 'pending_exam', 'verified', 'returned', 'approved', 'enrolled')
      ${yearFilter}
    `, { replacements: yearParam });

    // Total students already enrolled/active (for the Students tab badge)
    const [[totalStudentsRow]] = await sequelize.query(`
      SELECT COUNT(*) as count FROM enrollment_records
      WHERE status IN ('enrolled', 'active', 'completed', 'subjects_enrolled', 'approved')
      ${yearFilter}
    `, { replacements: yearParam });

    const [recentActivity] = await sequelize.query(`
      SELECT er.id, er.firstName, er.familyName, er.educationLevel,
             er.gradeLevel, er.status, er.createdAt, er.updatedAt,
             er.academicYear, u.name as user_name, u.email as userEmail
      FROM enrollment_records er
      LEFT JOIN users u ON er.userId = u.id
      WHERE er.status IN ('submitted', 'pending_exam', 'verified', 'returned', 'approved', 'enrolled')
      ${yearFilter}
      ORDER BY er.updatedAt DESC
      LIMIT 10
    `, { replacements: yearParam });

    res.json({
      summary: {
        submitted:     Number(summary?.submitted)    || 0,
        pending_exam:  Number(summary?.pending_exam) || 0,
        verified:      Number(summary?.verified)     || 0,
        returned:      Number(summary?.returned)     || 0,
        approved:      Number(summary?.approved)     || 0,
        enrolled:      Number(summary?.enrolled)     || 0,
        jhs:           Number(summary?.jhs)          || 0,
        shs:           Number(summary?.shs)          || 0,
        totalStudents: Number(totalStudentsRow?.count) || 0,
      },
      recentActivity: recentActivity || []
    });
  } catch (error) {
    console.error('Registrar stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// ── Get enrollments for registrar ─────────────────────────────────────────────
export const getRegistrarEnrollments = async (req, res) => {
  try {
    const { status, educationLevel, schoolLevel, enrollmentType, search, academicYear } = req.query;
    if (schoolLevel && !['all', 'jhs_regular', 'jhs_ssc', 'shs'].includes(schoolLevel)) {
      return res.status(400).json({ error: 'Invalid school level filter' });
    }
    if (enrollmentType && !['all', 'new', 'old', 'returnee', 'transferee'].includes(enrollmentType)) {
      return res.status(400).json({ error: 'Invalid enrollment type filter' });
    }

    // Default to active school year if not specified
    let yearFilter = academicYear;
    if (!yearFilter) {
      try {
        const [[sy]] = await sequelize.query("SELECT year FROM school_years WHERE isActive = 1 LIMIT 1");
        if (sy?.year) yearFilter = sy.year;
      } catch (_) {}
    }

    let query = `
      SELECT er.*, u.name as user_name, u.email as user_email
      FROM enrollment_records er
      LEFT JOIN users u ON er.userId = u.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by school year (active year by default)
    if (yearFilter && yearFilter !== 'all') {
      query += ` AND er.academicYear = ?`;
      params.push(yearFilter);
    }

    if (status === 'needs_review') {
      query += ` AND er.status IN ('submitted', 'verified')`;
    } else if (status === 'enrolled_active') {
      query += ` AND er.status IN ('enrolled', 'active') AND COALESCE(er.lifeStatus, 'enrolled') NOT IN ('dropped', 'transferred_out', 'retained', 'completed')`;
    } else if (status === 'awaiting_section') {
      query += ` AND er.status IN ('approved', 'subjects_enrolled') AND er.sectionId IS NULL`;
    } else if (status && status !== 'all') {
      query += ` AND er.status = ?`;
      params.push(status);
    } else {
      query += ` AND er.status IN ('submitted', 'pending_exam', 'verified', 'returned', 'approved', 'subjects_enrolled', 'enrolled', 'active', 'completed', 'rejected')`;
    }

    if (educationLevel && educationLevel !== 'all') {
      query += ` AND er.educationLevel = ?`;
      params.push(educationLevel);
    }

    const sscPredicate = `(COALESCE(er.sscClass, '') = 'SSC' OR (COALESCE(er.sscApplied, 0) = 1 AND COALESCE(er.sscClass, '') = '' AND COALESCE(er.sscResult, '') <> 'failed'))`;
    if (schoolLevel === 'shs') query += ` AND er.educationLevel = 'SHS'`;
    if (schoolLevel === 'jhs_ssc') query += ` AND er.educationLevel = 'JHS' AND ${sscPredicate}`;
    if (schoolLevel === 'jhs_regular') query += ` AND er.educationLevel = 'JHS' AND NOT ${sscPredicate}`;
    if (enrollmentType && enrollmentType !== 'all') {
      query += ` AND er.enrollmentType = ?`;
      params.push(enrollmentType);
    }

    if (search) {
      query += ` AND (er.firstName LIKE ? OR er.familyName LIKE ? OR er.studentNumber LIKE ? OR er.lrn LIKE ? OR er.gradeLevel LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    query += ` ORDER BY er.createdAt DESC`;

    const [results] = await sequelize.query(query, { replacements: params });
    res.json(results || []);
  } catch (error) {
    console.error('Get registrar enrollments error:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
};

// ── Verify enrollment (submitted → verified) ──────────────────────────────────
export const verifyEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const registrarId = req.user.id;

    const [[enrollment]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [id] }
    );

    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    if (!['submitted', 'returned'].includes(enrollment.status)) {
      return res.status(400).json({ error: `Cannot verify enrollment with status: ${enrollment.status}` });
    }

    await validateForReview(enrollment);

    await sequelize.query(
      `UPDATE enrollment_records
       SET status = 'verified',
           registrar_remarks = ?,
           verified_by = ?,
           verified_at = NOW(),
           updatedAt = NOW()
       WHERE id = ?`,
      { replacements: [remarks || null, registrarId, id] }
    );

    const [[updated]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [id] }
    );

    // Send verified email notification
    try {
      const [[user]] = await sequelize.query('SELECT * FROM users WHERE id = ?', { replacements: [updated.userId] });
      if (user) await sendEnrollmentVerifiedEmail(user, updated);
    } catch (_) {}

    res.json({ message: 'Enrollment verified successfully', enrollment: updated });
  } catch (error) {
    if (!error.status) console.error('Verify enrollment error:', error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to verify enrollment' });
  }
};

// ── Approve enrollment (verified → approved) ──────────────────────────────────
export const approveEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const registrarId = req.user.id;

    const [[enrollment]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [id] }
    );

    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
    if (['enrolled','active','subjects_enrolled'].includes(enrollment.status)) return res.json({ message: 'Enrollment is already approved.', enrollment });
    await validateForReview(enrollment);

    if (!['verified', 'submitted', 'returned'].includes(enrollment.status)) {
      return res.status(400).json({ error: `Cannot approve enrollment with status: ${enrollment.status}` });
    }

    // Generate student number if not already assigned, preserving any existing number from previous years
    let studentNumber = enrollment.studentNumber;
    if (!studentNumber) {
      const [[prev]] = await sequelize.query(
        `SELECT studentNumber FROM enrollment_records
         WHERE userId = ? AND studentNumber IS NOT NULL AND studentNumber != ''
         ORDER BY id DESC LIMIT 1`,
        { replacements: [enrollment.userId] }
      );
      studentNumber = prev?.studentNumber || await generateStudentNumber();
    }

    // Auto-set lifeStatus: transferees get 'transferred_in', everyone else gets 'enrolled'
    const autoLifeStatus = enrollment.enrollmentType === 'transferee' ? 'transferred_in' : 'enrolled';

    await sequelize.query(
      `UPDATE enrollment_records
       SET status = 'approved',
           lifeStatus = ?,
           studentNumber = ?,
           registrar_remarks = ?,
           verified_by = ?,
           verified_at = NOW(),
           approved_by = ?,
           approved_at = NOW(),
           updatedAt = NOW()
       WHERE id = ?`,
      { replacements: [autoLifeStatus, studentNumber, remarks || null, registrarId, registrarId, id] }
    );

    let [[updated]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [id] }
    );

    const assignment = await autoAssignSection(id);
    [[updated]] = await sequelize.query('SELECT * FROM enrollment_records WHERE id = ?', { replacements: [id] });

    try {
      const [[user]] = await sequelize.query('SELECT * FROM users WHERE id = ?', { replacements: [updated.userId] });
      if (user) await sendEnrollmentApprovedEmail(user, updated);
    } catch (_) {}

    res.json({ message: 'Enrollment approved successfully', enrollment: updated, sectionAssignment: assignment });
  } catch (error) {
    if (!error.status) console.error('Approve enrollment error:', error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to approve enrollment' });
  }
};

// ── Return enrollment to student (submitted/verified → returned) ──────────────
export const returnEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const registrarId = req.user.id;

    if (!remarks || !remarks.trim()) {
      return res.status(400).json({ error: 'Remarks are required when returning an enrollment' });
    }

    const [[enrollment]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [id] }
    );

    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    if (!['submitted', 'verified'].includes(enrollment.status)) {
      return res.status(400).json({ error: `Cannot return enrollment with status: ${enrollment.status}` });
    }

    await sequelize.query(
      `UPDATE enrollment_records
       SET status = 'returned',
           registrar_remarks = ?,
           verified_by = ?,
           verified_at = NOW(),
           updatedAt = NOW()
       WHERE id = ?`,
      { replacements: [remarks, registrarId, id] }
    );

    const [[updated]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [id] }
    );

    // Send returned email notification
    try {
      const [[user]] = await sequelize.query('SELECT * FROM users WHERE id = ?', { replacements: [updated.userId] });
      if (user) await sendEnrollmentReturnedEmail(user, updated, remarks);
    } catch (_) {}

    res.json({ message: 'Enrollment returned to student', enrollment: updated });
  } catch (error) {
    console.error('Return enrollment error:', error);
    res.status(500).json({ error: 'Failed to return enrollment' });
  }
};

// ── Schedule SSC exam (JHS Grade 7 only) ─────────────────────────────────────
export const scheduleSSCExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { examDate, passingScore } = req.body;

    if (!examDate) return res.status(400).json({ error: 'Exam date is required' });

    const [[enrollment]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [id] }
    );

    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
    if (enrollment.educationLevel !== 'JHS') return res.status(400).json({ error: 'SSC exam only applies to JHS enrollments' });
    if (!enrollment.sscApplied) return res.status(400).json({ error: 'Student did not apply for SSC' });
    if (enrollment.status !== 'pending_exam') return res.status(400).json({ error: `Cannot schedule exam for enrollment with status: ${enrollment.status}` });

    await sequelize.query(
      `UPDATE enrollment_records
       SET sscExamDate = ?,
           sscPassingScore = ?,
           updatedAt = NOW()
       WHERE id = ?`,
      { replacements: [examDate, passingScore || 75, id] }
    );

    const [[updated]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [id] }
    );

    // Send SSC exam scheduled email
    try {
      const [[user]] = await sequelize.query('SELECT * FROM users WHERE id = ?', { replacements: [updated.userId] });
      if (user) await sendSSCExamScheduledEmail(user, updated);
    } catch (_) {}

    res.json({ message: 'SSC exam scheduled', enrollment: updated });
  } catch (error) {
    console.error('Schedule SSC exam error:', error);
    res.status(500).json({ error: 'Failed to schedule SSC exam' });
  }
};

// ── Bulk schedule SSC exam for multiple students ──────────────────────────────
export const bulkScheduleSSCExam = async (req, res) => {
  try {
    const { ids, examDate, passingScore } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'At least one enrollment ID is required' });
    }
    if (!examDate) {
      return res.status(400).json({ error: 'Exam date is required' });
    }

    const passing = parseFloat(passingScore) || 75;
    const results = { scheduled: [], skipped: [], failed: [] };

    for (const id of ids) {
      try {
        const [[enrollment]] = await sequelize.query(
          'SELECT * FROM enrollment_records WHERE id = ?',
          { replacements: [id] }
        );

        if (!enrollment) { results.skipped.push({ id, reason: 'Not found' }); continue; }
        if (enrollment.educationLevel !== 'JHS') { results.skipped.push({ id, reason: 'Not a JHS enrollment' }); continue; }
        if (!enrollment.sscApplied) { results.skipped.push({ id, reason: 'Did not apply for SSC' }); continue; }
        if (enrollment.status !== 'pending_exam') { results.skipped.push({ id, reason: `Status is ${enrollment.status}` }); continue; }

        await sequelize.query(
          `UPDATE enrollment_records
           SET sscExamDate = ?, sscPassingScore = ?, updatedAt = NOW()
           WHERE id = ?`,
          { replacements: [examDate, passing, id] }
        );

        const [[updated]] = await sequelize.query(
          'SELECT * FROM enrollment_records WHERE id = ?',
          { replacements: [id] }
        );

        // Send email notification (non-blocking)
        try {
          const [[user]] = await sequelize.query('SELECT * FROM users WHERE id = ?', { replacements: [updated.userId] });
          if (user) await sendSSCExamScheduledEmail(user, updated);
        } catch (_) {}

        results.scheduled.push({ id, name: `${enrollment.firstName} ${enrollment.familyName}` });
      } catch (err) {
        results.failed.push({ id, reason: err.message });
      }
    }

    res.json({
      message: `Scheduled ${results.scheduled.length} student(s) for SSC exam on ${examDate}`,
      scheduled: results.scheduled.length,
      skipped: results.skipped.length,
      failed: results.failed.length,
      details: results
    });
  } catch (error) {
    console.error('Bulk schedule SSC error:', error);
    res.status(500).json({ error: 'Failed to bulk schedule SSC exam' });
  }
};

// ── Record SSC exam result ────────────────────────────────────────────────────
export const recordSSCResult = async (req, res) => {
  try {
    const { id } = req.params;
    const { examScore } = req.body;

    if (examScore === undefined || examScore === null) {
      return res.status(400).json({ error: 'Exam score is required' });
    }

    const [[enrollment]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [id] }
    );

    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
    if (enrollment.status !== 'pending_exam') return res.status(400).json({ error: 'Enrollment is not pending an SSC exam' });

    const score = parseFloat(examScore);
    const passing = parseFloat(enrollment.sscPassingScore) || 75;
    const passed = score >= passing;

    await sequelize.query(
      `UPDATE enrollment_records
       SET sscExamScore = ?,
           sscResult = ?,
           sscClass = ?,
           status = 'submitted',
           updatedAt = NOW()
       WHERE id = ?`,
      { replacements: [score, passed ? 'passed' : 'failed', passed ? 'SSC' : 'Regular', id] }
    );

    const [[updated]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [id] }
    );

    // Send SSC result email
    try {
      const [[user]] = await sequelize.query('SELECT * FROM users WHERE id = ?', { replacements: [updated.userId] });
      if (user) await sendSSCResultEmail(user, updated);
    } catch (_) {}

    res.json({
      message: passed
        ? 'Passed! Student is eligible for the Special Science Class.'
        : 'Did not pass. Student will be enrolled in the Regular class.',
      sscResult: passed ? 'passed' : 'failed',
      sscClass: passed ? 'SSC' : 'Regular',
      enrollment: updated
    });
  } catch (error) {
    console.error('Record SSC result error:', error);
    res.status(500).json({ error: 'Failed to record SSC result' });
  }
};

// ── Evaluate TOR for college transferees ─────────────────────────────────────
export const evaluateTOR = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const registrarId = req.user.id;

    const [[enrollment]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [id] }
    );

    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    if (enrollment.educationLevel !== 'College' || enrollment.enrollmentType !== 'transferee') {
      return res.status(400).json({ error: 'TOR evaluation only applies to college transferees' });
    }

    await sequelize.query(
      `UPDATE enrollment_records
       SET tor_evaluated = 1,
           tor_remarks = ?,
           verified_by = ?,
           updatedAt = NOW()
       WHERE id = ?`,
      { replacements: [remarks || null, registrarId, id] }
    );

    const [[updated]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [id] }
    );

    // No email for TOR evaluation — it's an internal registrar action
    res.json({ message: 'TOR evaluated successfully', enrollment: updated });
  } catch (error) {
    console.error('TOR evaluation error:', error);
    res.status(500).json({ error: 'Failed to evaluate TOR' });
  }
};

// ── Life Status ───────────────────────────────────────────────────────────────

const VALID_LIFE_STATUSES = ['enrolled', 'dropped', 'transferred_out', 'transferred_in', 'retained', 'completed'];

/**
 * PUT /api/registrar/enrollments/:id/life-status
 * Registrar sets the student's life status (dropped, transferred out, retained, etc.)
 * Only applies to students whose application status is 'enrolled' or later.
 */
export const updateLifeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { lifeStatus, reason, date, destinationSchool } = req.body;
    const registrarId = req.user.id;

    if (!lifeStatus) {
      return res.status(400).json({ error: 'lifeStatus is required' });
    }
    if (!VALID_LIFE_STATUSES.includes(lifeStatus)) {
      return res.status(400).json({ error: `Invalid lifeStatus. Must be one of: ${VALID_LIFE_STATUSES.join(', ')}` });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'A reason is required when updating student life status' });
    }
    if (lifeStatus === 'transferred_out' && !destinationSchool?.trim()) {
      return res.status(400).json({ error: 'Destination school is required when marking a student as Transferred Out' });
    }

    const [[enrollment]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [id] }
    );
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    // Only allow life status changes on enrolled/active students
    const allowedAppStatuses = ['enrolled', 'active', 'completed', 'approved', 'subjects_enrolled'];
    if (!allowedAppStatuses.includes(enrollment.status)) {
      return res.status(400).json({
        error: `Cannot set life status on an enrollment with application status "${enrollment.status}". Student must be enrolled first.`
      });
    }

    // Prevent re-dropping or re-transferring already processed students
    if (['dropped', 'transferred_out'].includes(enrollment.lifeStatus)) {
      return res.status(400).json({
        error: `Student is already marked as "${enrollment.lifeStatus}". Cannot change life status again.`
      });
    }

    const effectiveDate = date || new Date().toISOString().split('T')[0];

    await sequelize.query(
      `UPDATE enrollment_records
       SET lifeStatus          = ?,
           lifeStatusReason    = ?,
           lifeStatusDate      = ?,
           lifeStatusUpdatedBy = ?,
           destinationSchool   = ?,
           updatedAt           = NOW()
       WHERE id = ?`,
      { replacements: [lifeStatus, reason.trim(), effectiveDate, registrarId, destinationSchool?.trim() || null, id] }
    );

    // If dropped or transferred out — free up the section slot
    if (['dropped', 'transferred_out'].includes(lifeStatus) && enrollment.sectionId) {
      await sequelize.query(
        `UPDATE sections SET currentEnrollment = GREATEST(0, CAST(currentEnrollment AS SIGNED) - 1), updatedAt = NOW() WHERE id = ?`,
        { replacements: [enrollment.sectionId] }
      ).catch(() => {}); // non-blocking
    }

    const [[updated]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [id] }
    );

    // Send email notification for significant life status changes (non-blocking)
    if (['dropped', 'transferred_out', 'retained', 'completed'].includes(lifeStatus)) {
      sequelize.query('SELECT * FROM users WHERE id = ?', { replacements: [enrollment.userId] })
        .then(([[user]]) => { if (user) return sendLifeStatusEmail(user, updated); })
        .catch(() => {});
    }

    res.json({
      message: `Student life status updated to "${lifeStatus}" successfully.`,
      enrollment: updated
    });
  } catch (error) {
    console.error('updateLifeStatus error:', error);
    res.status(500).json({ error: 'Failed to update student life status' });
  }
};

/**
 * GET /api/registrar/students
 * Returns enrolled students filterable by lifeStatus, educationLevel, gradeLevel, search.
 * Defaults to active school year. Only shows students that have been enrolled (not just applicants).
 */
export const getStudentsByLifeStatus = async (req, res) => {
  try {
    const { lifeStatus, educationLevel, gradeLevel, search, academicYear, strand, sectionName } = req.query;

    // Default to active school year
    let yearFilter = academicYear;
    if (!yearFilter || yearFilter === 'all') {
      try {
        const [[sy]] = await sequelize.query("SELECT year FROM school_years WHERE isActive = 1 LIMIT 1");
        if (sy?.year) yearFilter = sy.year;
      } catch (_) {}
    }

    let query = `
      SELECT er.id, er.userId, er.familyName, er.firstName, er.middleName,
             er.educationLevel, er.gradeLevel, er.strand, er.sectionName, er.sectionId,
             er.enrollmentType, er.studentNumber, er.lrn, er.academicYear,
             er.status, er.lifeStatus, er.lifeStatusReason, er.lifeStatusDate,
             er.lifeStatusUpdatedBy, er.destinationSchool, er.updatedAt, er.createdAt,
             u.name AS user_name, u.email AS user_email
      FROM enrollment_records er
      LEFT JOIN users u ON er.userId = u.id
      WHERE er.status IN ('enrolled', 'active', 'completed', 'subjects_enrolled', 'approved')
    `;
    const params = [];

    if (yearFilter && yearFilter !== 'all') {
      query += ` AND er.academicYear = ?`;
      params.push(yearFilter);
    }

    if (lifeStatus && lifeStatus !== 'all') {
      query += ` AND er.lifeStatus = ?`;
      params.push(lifeStatus);
    }

    if (educationLevel && educationLevel !== 'all') {
      query += ` AND er.educationLevel = ?`;
      params.push(educationLevel);
    }

    if (gradeLevel && gradeLevel !== 'all') {
      query += ` AND er.gradeLevel = ?`;
      params.push(gradeLevel);
    }

    if (strand && strand !== 'all') {
      if (strand === 'Regular') {
        query += ` AND (er.strand IS NULL OR er.strand = '' OR er.strand = 'Regular')`;
      } else {
        query += ` AND er.strand = ?`;
        params.push(strand);
      }
    }

    if (sectionName && sectionName !== 'all') {
      query += ` AND (er.sectionName = ? OR er.sectionId = ?)`;
      params.push(sectionName, sectionName);
    }

    if (search) {
      query += ` AND (er.firstName LIKE ? OR er.familyName LIKE ? OR er.studentNumber LIKE ? OR er.lrn LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ` ORDER BY er.familyName ASC, er.firstName ASC`;

    const [results] = await sequelize.query(query, { replacements: params });
    res.json(results || []);
  } catch (error) {
    console.error('getStudentsByLifeStatus error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

// ── Assign Section to Student Enrollment ─────────────────────────────────────
export const assignEnrollmentSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { sectionId } = req.body;

    if (!sectionId) return res.status(400).json({ error: 'sectionId is required' });

    const result = await moveToSection(parseInt(id), parseInt(sectionId));
    if (!result.success) return res.status(400).json({ error: result.reason });

    res.json({
      message: `Student assigned to section ${result.section.code}`,
      section: result.section
    });
  } catch (error) {
    console.error('Assign enrollment section error:', error);
    res.status(500).json({ error: error.message || 'Failed to assign section' });
  }
};

// ── Remove Student Enrollment from Section ───────────────────────────────────
export const removeEnrollmentSection = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await removeFromSection(parseInt(id));
    if (!result.success) return res.status(400).json({ error: result.reason });

    res.json({ message: 'Student removed from section' });
  } catch (error) {
    console.error('Remove enrollment section error:', error);
    res.status(500).json({ error: error.message || 'Failed to remove section' });
  }
};
