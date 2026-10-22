import { sendEnrollmentApprovedEmail, sendEnrollmentRejectedEmail } from '../services/emailService.js';
import { sequelize } from '../models/db.js';
import archiver from 'archiver';
import { generateEnrollmentPDF } from '../services/pdfGenerator.js';
import { autoAssignSection } from '../services/sectionAssignment.js';

/**
 * Generate a unique student ID number in YYYY-NNNNN format.
 * e.g. 2025-00042
 * Increments sequentially within the current year, skipping any IDs already assigned.
 */
async function generateStudentNumber() {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;

  // Find the highest existing sequential number for this year
  const [[row]] = await sequelize.query(
    `SELECT MAX(CAST(SUBSTR(studentNumber, 6) AS INTEGER)) as maxSeq
     FROM enrollment_records
     WHERE studentNumber LIKE ? AND LENGTH(studentNumber) = 10`,
    { replacements: [`${prefix}%`] }
  );

  const next = ((row?.maxSeq) || 0) + 1;
  const padded = String(next).padStart(5, '0');
  return `${prefix}${padded}`;
}

// Get all enrollments with filters
export const getAllEnrollments = async (req, res) => {
  try {
    const { status, course, search, academicYear } = req.query;

    // Default to active school year if not specified
    let yearFilter = academicYear;
    if (!yearFilter || yearFilter === 'all') {
      try {
        const [[sy]] = await sequelize.query("SELECT year FROM school_years WHERE isActive = 1 LIMIT 1");
        if (sy?.year) yearFilter = sy.year;
      } catch (_) {}
    }
    
    let query = `
      SELECT 
        er.*,
        u.name as user_name,
        u.email as user_email
      FROM enrollment_records er
      LEFT JOIN users u ON er.userId = u.id
      WHERE 1=1
    `;
    
    const params = [];

    // Filter by school year (active year by default, 'all' to bypass)
    if (yearFilter && yearFilter !== 'all') {
      query += ` AND er.academicYear = ?`;
      params.push(yearFilter);
    }
    
    if (status && status !== 'all') {
      query += ` AND er.status = ?`;
      params.push(status);
    }
    
    if (search) {
      query += ` AND (
        er.firstName LIKE ? OR
        er.familyName LIKE ? OR
        er.studentNumber LIKE ? OR
        er.gradeLevel LIKE ? OR
        er.educationLevel LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    query += ` ORDER BY er.createdAt DESC`;
    
    const [results] = await sequelize.query(query, { replacements: params });
    res.json(results || []);
  } catch (error) {
    console.error('Get all enrollments error:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments', details: error.message });
  }
};

// Approve enrollment
export const approveEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const adminId = req.user.id;

    // Fetch the record first to check if it already has a student number
    const [[existing]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [id] }
    );
    if (!existing) return res.status(404).json({ error: 'Enrollment not found' });

    // Generate student number if not already assigned
    const studentNumber = existing.studentNumber || await generateStudentNumber();

    const [, approveMeta] = await sequelize.query(
      `UPDATE enrollment_records 
       SET status = 'approved',
           studentNumber = ?,
           admin_comments = ?,
           approved_by = ?,
           approved_at = NOW(),
           updatedAt = NOW()
       WHERE id = ?`,
      { replacements: [studentNumber, comment || null, adminId, id] }
    );

    // Auto-assign to a section (also sets status to 'enrolled' and enrolls subjects)
    const assignResult = await autoAssignSection(id);

    // Fetch the final updated record
    const [[enrollment]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [id] }
    );

    // Send approval email
    try {
      const [[user]] = await sequelize.query('SELECT * FROM users WHERE id = ?', { replacements: [enrollment.userId] });
      if (user) await sendEnrollmentApprovedEmail(user, enrollment);
    } catch (_) {}

    res.json({
      message: 'Enrollment approved successfully',
      enrollment,
      sectionAssignment: assignResult.assigned
        ? { assigned: true, section: assignResult.section, subjectsEnrolled: assignResult.subjectsEnrolled }
        : { assigned: false, reason: assignResult.reason }
    });
  } catch (error) {
    console.error('Approve enrollment error:', error);
    res.status(500).json({ error: 'Failed to approve enrollment' });
  }
};

// Reject enrollment
export const rejectEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const adminId = req.user.id;
    
    if (!comment) {
      return res.status(400).json({ error: 'Comment is required for rejection' });
    }
    
    const [, rejectMeta] = await sequelize.query(
      `UPDATE enrollment_records 
       SET status = 'rejected',
           admin_comments = ?,
           approved_by = ?,
           approved_at = NOW(),
           updatedAt = NOW()
       WHERE id = ?`,
      { replacements: [comment, adminId, id] }
    );
    
    if ((rejectMeta?.changes ?? 0) === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    // Fetch the updated record
    const [[enrollment]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [id] }
    );
    
    res.json({
      message: 'Enrollment rejected',
      enrollment
    });
  } catch (error) {
    console.error('Reject enrollment error:', error);
    res.status(500).json({ error: 'Failed to reject enrollment' });
  }
};

// Bulk approve all verified enrollments
export const bulkApproveVerified = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { ids } = req.body; // optional: specific IDs, otherwise approve all verified

    let query;
    let params;

    if (ids && Array.isArray(ids) && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      query = `UPDATE enrollment_records
               SET status = 'approved', approved_by = ?, approved_at = NOW(), updatedAt = NOW()
               WHERE id IN (${placeholders}) AND status = 'verified'`;
      params = [adminId, ...ids];
    } else {
      query = `UPDATE enrollment_records
               SET status = 'approved', approved_by = ?, approved_at = NOW(), updatedAt = NOW()
               WHERE status = 'verified'`;
      params = [adminId];
    }

    const [result, meta] = await sequelize.query(query, { replacements: params });
    // SQLite returns changes in meta object
    const count = meta?.changes ?? result?.changes ?? result?.affectedRows ?? 0;

    // Auto-assign sections for all newly approved enrollments
    // Get the IDs that were just set to 'approved'
    let enrollmentIds = [];
    if (ids && ids.length > 0) {
      enrollmentIds = ids;
    } else {
      const [justApproved] = await sequelize.query(
        `SELECT id, userId FROM enrollment_records WHERE status = 'approved' AND approved_by = ? AND approved_at >= datetime('now', '-10 seconds')`,
        { replacements: [adminId] }
      );
      enrollmentIds = justApproved.map(r => r.id);
    }

    // Generate student numbers for any that don't have one, then auto-assign section + subjects
    for (const eid of enrollmentIds) {
      try {
        const [[enr]] = await sequelize.query(
          'SELECT studentNumber FROM enrollment_records WHERE id = ?',
          { replacements: [eid] }
        );
        if (enr && !enr.studentNumber) {
          const sn = await generateStudentNumber();
          await sequelize.query(
            `UPDATE enrollment_records SET studentNumber = ?, updatedAt = NOW() WHERE id = ?`,
            { replacements: [sn, eid] }
          );
        }
      } catch (_) {}
      await autoAssignSection(eid).catch(() => {});
    }

    // Send approval emails
    try {
      for (const eid of enrollmentIds) {
        const [[enr]] = await sequelize.query('SELECT * FROM enrollment_records WHERE id = ?', { replacements: [eid] });
        if (enr) {
          const [[user]] = await sequelize.query('SELECT * FROM users WHERE id = ?', { replacements: [enr.userId] });
          if (user) await sendEnrollmentApprovedEmail(user, enr).catch(() => {});
        }
      }
    } catch (_) {}

    res.json({ message: `${count} enrollment(s) approved successfully`, count });
  } catch (error) {
    console.error('Bulk approve error:', error);
    res.status(500).json({ error: 'Failed to bulk approve enrollments' });
  }
};

// Bulk export PDFs
export const bulkExportPDFs = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No enrollment IDs provided' });
    }
    
    // Fetch all enrollments
    const placeholders = ids.map(() => '?').join(',');
    const [results] = await sequelize.query(
      `SELECT * FROM enrollment_records WHERE id IN (${placeholders})`,
      { replacements: ids }
    );
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'No enrollments found' });
    }
    
    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=enrollments-${Date.now()}.zip`);
    
    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({ error: 'Failed to create archive' });
    });
    
    // Pipe archive to response
    archive.pipe(res);
    
    // Generate PDFs and add to archive
    for (const enrollment of results) {
      try {
        const pdfBuffer = await generateEnrollmentPDF(enrollment);
        const filename = `enrollment-${enrollment.student_number || enrollment.id}.pdf`;
        archive.append(pdfBuffer, { name: filename });
      } catch (error) {
        console.error(`Failed to generate PDF for enrollment ${enrollment.id}:`, error);
      }
    }
    
    // Finalize archive
    await archive.finalize();
    
  } catch (error) {
    console.error('Bulk export error:', error);
    res.status(500).json({ error: 'Failed to export enrollments' });
  }
};

// Get enrollment statistics
export const getEnrollmentStats = async (req, res) => {
  try {
    // Get active school year for filtering
    let yearWhere = '';
    let yearParam = [];
    try {
      const [[sy]] = await sequelize.query("SELECT year FROM school_years WHERE isActive = 1 LIMIT 1");
      if (sy?.year) { yearWhere = `WHERE academicYear = ?`; yearParam = [sy.year]; }
    } catch (_) {}

    const [[stats]] = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN status = 'pending_exam' THEN 1 ELSE 0 END) as pending_exam,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'subjects_enrolled' THEN 1 ELSE 0 END) as subjects_enrolled,
        SUM(CASE WHEN status = 'enrolled' THEN 1 ELSE 0 END) as enrolled,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN educationLevel = 'JHS' THEN 1 ELSE 0 END) as jhs,
        SUM(CASE WHEN educationLevel = 'SHS' THEN 1 ELSE 0 END) as shs
      FROM enrollment_records
      ${yearWhere}
    `, { replacements: yearParam });
    
    const [courseStats] = await sequelize.query(`
      SELECT 
        COALESCE(gradeLevel, educationLevel) as label,
        educationLevel,
        COUNT(*) as count
      FROM enrollment_records
      ${yearWhere}
      GROUP BY COALESCE(gradeLevel, educationLevel), educationLevel
      ORDER BY count DESC
    `, { replacements: yearParam });

    const [recentEnrollments] = await sequelize.query(`
      SELECT er.id, er.firstName, er.familyName, er.educationLevel, 
             er.gradeLevel, er.status, er.createdAt, er.academicYear,
             u.name as user_name, u.email as userEmail
      FROM enrollment_records er
      LEFT JOIN users u ON er.userId = u.id
      ${yearWhere}
      ORDER BY er.createdAt DESC
      LIMIT 5
    `, { replacements: yearParam });
    
    const summary = {
      total:            Number(stats?.total)            || 0,
      draft:            Number(stats?.draft)            || 0,
      submitted:        Number(stats?.submitted)        || 0,
      pending_exam:     Number(stats?.pending_exam)     || 0,
      // Merge approved + subjects_enrolled + enrolled all into "enrolled"
      enrolled:         (Number(stats?.approved) || 0) + (Number(stats?.subjects_enrolled) || 0) + (Number(stats?.enrolled) || 0),
      rejected:         Number(stats?.rejected)         || 0,
      jhs:              Number(stats?.jhs)              || 0,
      shs:              Number(stats?.shs)              || 0,
    };
    
    res.json({
      summary,
      byCourse: courseStats || [],
      recent: recentEnrollments || []
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics', details: error.message });
  }
};

// ── Archive: get summary + full list for a specific school year ───────────────
export const getArchiveByYear = async (req, res) => {
  try {
    const { year } = req.params;
    if (!year) return res.status(400).json({ error: 'School year is required' });

    // Summary stats for this year
    const [[stats]] = await sequelize.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'enrolled'   THEN 1 ELSE 0 END) as enrolled,
        SUM(CASE WHEN status = 'completed'  THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'rejected'   THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN educationLevel = 'JHS' THEN 1 ELSE 0 END) as jhs,
        SUM(CASE WHEN educationLevel = 'SHS' THEN 1 ELSE 0 END) as shs
      FROM enrollment_records
      WHERE academicYear = ?
    `, { replacements: [year] });

    // Full enrollment list for this year
    const [enrollments] = await sequelize.query(`
      SELECT er.id, er.firstName, er.familyName, er.educationLevel,
             er.gradeLevel, er.strand, er.enrollmentType, er.status,
             er.studentNumber, er.academicYear, er.sectionName,
             er.createdAt, er.approved_at,
             u.name as user_name, u.email as user_email
      FROM enrollment_records er
      LEFT JOIN users u ON er.userId = u.id
      WHERE er.academicYear = ?
      ORDER BY er.familyName ASC, er.firstName ASC
    `, { replacements: [year] });

    res.json({
      year,
      summary: {
        total:     Number(stats?.total)     || 0,
        enrolled:  Number(stats?.enrolled)  || 0,
        completed: Number(stats?.completed) || 0,
        rejected:  Number(stats?.rejected)  || 0,
        jhs:       Number(stats?.jhs)       || 0,
        shs:       Number(stats?.shs)       || 0,
      },
      enrollments: enrollments || [],
    });
  } catch (error) {
    console.error('getArchiveByYear error:', error);
    res.status(500).json({ error: 'Failed to fetch archive data' });
  }
};

// Update enrollment status (generic) — admin only
export const updateEnrollmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    const adminId = req.user.id;
    
    const validStatuses = ['draft', 'submitted', 'verified', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const [result] = await sequelize.query(
      `UPDATE enrollment_records 
       SET status = ?,
           admin_comments = ?,
           approved_by = ?,
           approved_at = NOW(),
           updatedAt = NOW()
       WHERE id = ?`,
      { replacements: [status, comment || null, adminId, id] }
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    // Fetch the updated record
    const [[enrollment]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [id] }
    );
    
    res.json({
      message: 'Enrollment status updated',
      enrollment
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};
