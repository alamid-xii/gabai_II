/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { EnrollmentRecord } from "../models/enrollmentRecordModel.js";
import { EnrollmentSubject } from "../models/enrollmentSubjectModel.js";
import { User } from "../models/userModel.js";
import { sequelize } from "../models/db.js";
import jwt from "jsonwebtoken";
import { generateEnrollmentPDF, formatEnrollmentData } from "../services/pdfGenerator.js";

try { await sequelize.authenticate(); } catch (err) { console.warn("DB unavailable at import (enrollmentController):", err.message); }

const JWT_SECRET = process.env.JWT_SECRET || "emc-secret-key-2025";

// Authentication Middleware

/**
 * Middleware to verify JWT token and authenticate user
 * Requirements: 20.3
 */
export const requireAuth = async (req, res, next) => {
  try {
    // Check for JWT token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findByPk(decoded.id);
        
        if (!user) {
          return res.status(401).json({ message: 'User not found' });
        }
        
        req.user = user;
        return next();
      } catch (jwtError) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
    }
    
    // Fallback to session-based auth
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const user = await User.findByPk(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(500).json({ message: 'Authentication error' });
  }
};

/**
 * Middleware to check admin role
 * Requirements: 16.1, 18.2
 */
export const requireAdmin = async (req, res, next) => {
  try {
    // Check for JWT token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findByPk(decoded.id);
        
        if (!user || user.role !== 'admin') {
          return res.status(403).json({ message: 'Admin access required' });
        }
        
        req.user = user;
        return next();
      } catch (jwtError) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
    }
    
    // Fallback to session-based auth
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const user = await User.findByPk(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(500).json({ message: 'Authentication error' });
  }
};

// Validation Middleware

/**
 * Validates required fields (studentType, course)
 * Requirements: 14.3
 */
export const validateRequiredFields = (req, res, next) => {
  const errors = [];
  const level = req.body.educationLevel || 'JHS';

  // gradeLevel required for JHS/SHS
  if ((level === 'JHS' || level === 'SHS') && !req.body.gradeLevel) {
    errors.push({ field: 'gradeLevel', message: 'Grade level is required' });
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  next();
};

/**
 * Validates date format for date fields
 * Requirements: 14.4
 */
export const validateDateFormat = (req, res, next) => {
  const errors = [];
  const dateFields = ['dateEnrolled', 'dateOfBirth'];
  
  dateFields.forEach(field => {
    if (req.body[field]) {
      const dateValue = req.body[field];
      const date = new Date(dateValue);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        errors.push({ 
          field, 
          message: `Invalid date format for ${field}. Expected format: YYYY-MM-DD` 
        });
      }
    }
  });
  
  if (errors.length > 0) {
    return res.status(400).json({ 
      message: 'Validation failed', 
      errors 
    });
  }
  
  next();
};

/**
 * Validates enum values for studentType, course, and sex
 * Requirements: 14.2
 */
export const validateEnumValues = (req, res, next) => {
  const errors = [];
  
  // Validate enrollmentType
  const validEnrollmentTypes = ['new', 'old', 'transferee', 'returnee'];
  if (req.body.enrollmentType && !validEnrollmentTypes.includes(req.body.enrollmentType)) {
    errors.push({ field: 'enrollmentType', message: `Enrollment type must be one of: ${validEnrollmentTypes.join(', ')}` });
  }

  // Validate studentType (legacy - optional now)
  if (req.body.studentType && !['New', 'Old'].includes(req.body.studentType)) {
    errors.push({ field: 'studentType', message: 'Student type must be either "New" or "Old"' });
  }

  // Validate educationLevel — JHS and SHS only
  if (req.body.educationLevel && !['JHS', 'SHS'].includes(req.body.educationLevel)) {
    errors.push({ field: 'educationLevel', message: 'Education level must be JHS or SHS' });
  }

  // Validate sex (optional field)
  if (req.body.sex && !['Male', 'Female'].includes(req.body.sex)) {
    errors.push({ field: 'sex', message: 'Sex must be either "Male" or "Female"' });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  
  next();
};

// Controller Functions

/**
 * SSC qualification check helper
 * Returns true if grade6Average >= 85
 */
const checkSSCQualification = (grade6Average) => {
  const avg = parseFloat(grade6Average);
  return !isNaN(avg) && avg >= 85;
};

/**
 * Create new enrollment record
 * POST /api/enrollments
 * Requirements: 12.2, 12.3, 14.1
 *
 * SSC Logic (JHS Grade 7 only):
 *   - If sscApplied=true AND grade6Average >= 85 → status='pending_exam', sscQualified=true
 *   - If sscApplied=true AND grade6Average < 85  → status='submitted', sscQualified=false, sscClass='Regular'
 *   - If sscApplied=false                        → status='submitted', normal flow
 */
export const createEnrollment = async (req, res) => {
  try {
    const body = { ...req.body };
    let status = 'submitted';
    let sscQualified = null;
    let sscClass = null;

    // ── One enrollment per student per school year ────────────────────────────
    // Fetch the active school year first so we can scope the uniqueness check
    let activeYear = null;
    try {
      const [[activeSY]] = await sequelize.query(
        "SELECT year FROM school_years WHERE isActive = 1 LIMIT 1"
      );
      if (activeSY?.year) activeYear = activeSY.year;
    } catch (_) {}

    // Allow if the only existing record for this year is an SSC-only placeholder (no firstName yet)
    const [existing] = await sequelize.query(
      `SELECT id, status, firstName, sscApplied, academicYear, lifeStatus
       FROM enrollment_records
       WHERE userId = ?
         AND status NOT IN ('rejected', 'completed')
         ${activeYear ? "AND academicYear = ?" : ""}
       LIMIT 1`,
      { replacements: activeYear ? [req.user.id, activeYear] : [req.user.id] }
    );
    if (existing && existing.length > 0) {
      const existingRecord = existing[0];

      // Block re-enrollment if student was dropped or transferred out this school year
      if (['dropped', 'transferred_out'].includes(existingRecord.lifeStatus)) {
        const statusLabel = existingRecord.lifeStatus === 'dropped' ? 'Dropped' : 'Transferred Out';
        return res.status(400).json({
          message: `Your enrollment for school year ${activeYear || 'this year'} was marked as "${statusLabel}". You cannot submit a new application for the same school year. Please contact the Registrar's Office if you need assistance.`
        });
      }
      // If it's an SSC placeholder (sscApplied=1 and no name filled), update it with full form data
      if (existingRecord.sscApplied && !existingRecord.firstName) {
        const safeFields = ['educationLevel','gradeLevel','strand','studentType','academicYear','dateEnrolled',
          'lrn','familyName','firstName','middleName','sex','dateOfBirth','placeOfBirth',
          'fatherName','fatherOccupation','motherName','motherOccupation','parentsAddress',
          'guardianName','guardianOccupation','guardianAddress','guardianTelephone',
          'grade6School','grade6SchoolAddress','grade6Section','grade6SYStart','grade6SYEnd',
          'grade6Average','grade6Remarks','lastHSSchool','lastHSCurriculumYear','lastHSSection',
          'lastHSSYStart','lastHSSYEnd','admissionCredentials','studentSignature','parentGuardianSignature'];
        const updates = safeFields.filter(k => body[k] !== undefined);
        if (updates.length > 0) {
          const setClause = updates.map(k => `${k} = ?`).join(', ');
          const values = updates.map(k => k === 'admissionCredentials' ? JSON.stringify(body[k]) : body[k]);
          await sequelize.query(
            `UPDATE enrollment_records SET ${setClause}, updatedAt = NOW() WHERE id = ?`,
            { replacements: [...values, existingRecord.id] }
          );
        }
        const [[updated]] = await sequelize.query('SELECT * FROM enrollment_records WHERE id = ?', { replacements: [existingRecord.id] });
        try { await sendEnrollmentSubmittedEmail(req.user, updated); } catch (_) {}
        return res.status(200).json({ message: 'Enrollment updated successfully', enrollment: updated });
      }
      return res.status(400).json({
        message: `You already have an active enrollment for school year ${activeYear || 'this year'}. You cannot submit another application until your current one is completed or rejected.`
      });
    }

    // LRN uniqueness check
    if (body.lrn) {
      const [lrnCheck] = await sequelize.query(
        `SELECT id FROM enrollment_records WHERE lrn = ? LIMIT 1`,
        { replacements: [body.lrn] }
      );
      if (lrnCheck && lrnCheck.length > 0) {
        return res.status(400).json({ message: 'This LRN is already registered in the system. Please check your LRN and try again.' });
      }
    }

    // SSC evaluation — only for JHS Grade 7
    if (
      body.educationLevel === 'JHS' &&
      body.gradeLevel === 'Grade 7' &&
      body.sscApplied === true
    ) {
      if (checkSSCQualification(body.grade6Average)) {
        status = 'pending_exam';
        sscQualified = true;
      } else {
        status = 'submitted';
        sscQualified = false;
        sscClass = 'Regular';
      }
    }

    // Auto-stamp active school year — override whatever the student submitted
    if (activeYear) {
      body.academicYear = activeYear;
    }

    const enrollmentData = {
      userId: req.user.id,
      ...body,
      status,
      ...(sscQualified !== null && { sscQualified }),
      ...(sscClass !== null && { sscClass }),
    };

    const enrollment = await EnrollmentRecord.create(enrollmentData);

    const message = status === 'pending_exam'
      ? 'You qualify for the Special Science Class entrance exam! The registrar will contact you for the exam schedule.'
      : sscQualified === false
        ? 'Your Grade 6 average does not meet the SSC requirement (85+). You have been enrolled in the Regular class.'
        : 'Enrollment saved successfully';

        // Send submission email (non-blocking)
    try {
      await sendEnrollmentSubmittedEmail(req.user, enrollment.toJSON());
    } catch (_) {}
    res.status(201).json({ message, enrollment, sscQualified, status });
  } catch (error) {
    console.error('Create enrollment error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    res.status(500).json({ message: 'Failed to save enrollment. Please try again.' });
  }
};

/**
 * Admin: Schedule SSC exam for a qualified applicant
 * PUT /api/enrollments/:id/ssc-schedule
 */
export const scheduleSSCExam = async (req, res) => {
  try {
    const { examDate, passingScore } = req.body;
    const enrollment = await EnrollmentRecord.findByPk(req.params.id);

    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
    if (enrollment.status !== 'pending_exam') {
      return res.status(400).json({ message: 'Enrollment is not pending an SSC exam' });
    }
    if (!examDate) return res.status(400).json({ message: 'Exam date is required' });

    await enrollment.update({
      sscExamDate: examDate,
      ...(passingScore && { sscPassingScore: passingScore })
    });

    res.json({ message: 'SSC exam scheduled', enrollment });
  } catch (error) {
    console.error('Schedule SSC exam error:', error);
    res.status(500).json({ message: 'Failed to schedule exam' });
  }
};

/**
 * Admin: Record SSC exam result
 * PUT /api/enrollments/:id/ssc-result
 * Auto-routes: score >= passingScore → SSC class, else → Regular class
 */
export const recordSSCResult = async (req, res) => {
  try {
    const { examScore } = req.body;
    const enrollment = await EnrollmentRecord.findByPk(req.params.id);

    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
    if (enrollment.status !== 'pending_exam') {
      return res.status(400).json({ message: 'Enrollment is not pending an SSC exam' });
    }
    if (examScore === undefined || examScore === null) {
      return res.status(400).json({ message: 'Exam score is required' });
    }

    const score = parseFloat(examScore);
    const passing = parseFloat(enrollment.sscPassingScore) || 75;
    const passed = score >= passing;

    await enrollment.update({
      sscExamScore: score,
      sscResult: passed ? 'passed' : 'failed',
      // On pass: sscClass stays null — student will choose SSC or Regular themselves
      // On fail: auto-assign Regular (no choice needed)
      ...(passed ? {} : { sscClass: 'Regular', sscChoiceMade: true }),
      status: 'submitted' // moves to normal approval queue
    });

    res.json({
      message: passed
        ? `Passed! Student is eligible for the Special Science Class.`
        : `Did not pass. Student will be enrolled in the Regular class.`,
      sscResult: passed ? 'passed' : 'failed',
      sscClass: passed ? 'SSC' : 'Regular',
      enrollment
    });
  } catch (error) {
    console.error('Record SSC result error:', error);
    res.status(500).json({ message: 'Failed to record exam result' });
  }
};

/**
 * Get all enrollments (admin only)
 * GET /api/enrollments
 * Requirements: 16.1, 16.3, 16.4
 */
export const getAllEnrollments = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    
    // Filter by status
    if (status) {
      where.status = status;
    }
    
    const queryOptions = {
      where,
      include: [{ 
        model: User, 
        as: 'user',
        attributes: ['id', 'name', 'email']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    };
    
    // Search by student name
    if (search) {
      queryOptions.include[0].where = {
        name: {
          [sequelize.Sequelize.Op.like]: `%${search}%`
        }
      };
    }
    
    const { count, rows } = await EnrollmentRecord.findAndCountAll(queryOptions);
    
    res.json({
      enrollments: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ 
      message: 'Failed to fetch enrollments' 
    });
  }
};

/**
 * Get single enrollment by ID
 * GET /api/enrollments/:id
 * Requirements: 20.2
 */
export const getEnrollmentById = async (req, res) => {
  try {
    const enrollment = await EnrollmentRecord.findByPk(req.params.id, {
      include: [{ 
        model: User, 
        as: 'user',
        attributes: ['id', 'name', 'email']
      }]
    });
    
    if (!enrollment) {
      return res.status(404).json({ 
        message: 'Enrollment not found' 
      });
    }
    
    // Check authorization: user can only view own enrollment, admin/registrar can view all
    if (req.user.role !== 'admin' && req.user.role !== 'registrar' && enrollment.userId !== req.user.id) {
      return res.status(403).json({ 
        message: 'You do not have permission to view this enrollment' 
      });
    }
    
    // Attach adviser name from section if student is assigned
    let adviserName = null;
    if (enrollment.sectionId) {
      try {
        const [[section]] = await sequelize.query(
          'SELECT instructor FROM sections WHERE id = ? LIMIT 1',
          { replacements: [enrollment.sectionId] }
        );
        if (section?.instructor) adviserName = section.instructor;
      } catch (_) {}
    }

    const enrollmentData = enrollment.toJSON();
    enrollmentData.adviserName = adviserName;

    res.json(enrollmentData);
  } catch (error) {
    console.error('Error fetching enrollment:', error);
    res.status(500).json({ 
      message: 'Failed to fetch enrollment' 
    });
  }
};

/**
 * Update enrollment record
 * PUT /api/enrollments/:id
 * Allows student to update their own enrollment with all HS form fields.
 * Sensitive fields (status, userId, sscQualified, etc.) are excluded.
 */
export const updateEnrollment = async (req, res) => {
  try {
    const enrollment = await EnrollmentRecord.findByPk(req.params.id);

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Only the owner can update their enrollment
    if (enrollment.userId !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to update this enrollment' });
    }

    // Allow editing when: draft, submitted, returned, OR it's an SSC placeholder (sscApplied but no firstName yet)
    const isSSCPlaceholder = enrollment.sscApplied && !enrollment.firstName;
    const editableStatuses = ['draft', 'submitted', 'returned'];
    if (!editableStatuses.includes(enrollment.status) && !isSSCPlaceholder) {
      return res.status(400).json({ message: `Enrollment cannot be edited with status: ${enrollment.status}` });
    }

    // Explicit whitelist — never allow status, userId, ssc results, or section fields
    const ALLOWED = [
      'educationLevel', 'gradeLevel', 'strand', 'enrollmentType', 'studentType',
      'academicYear', 'dateEnrolled', 'lrn',
      'familyName', 'firstName', 'middleName', 'sex', 'dateOfBirth', 'placeOfBirth',
      'email', 'mobileNumber',
      'fatherName', 'fatherOccupation', 'fatherAddress',
      'motherName', 'motherOccupation', 'motherAddress',
      'guardianName', 'guardianOccupation', 'guardianAddress', 'guardianTelephone',
      'parentsAddress',
      'grade6School', 'grade6SchoolAddress', 'grade6Section',
      'grade6SYStart', 'grade6SYEnd', 'grade6Average', 'grade6Remarks',
      'lastHSSchool', 'lastHSCurriculumYear', 'lastHSSection',
      'lastHSSYStart', 'lastHSSYEnd',
      'sscApplied', 'admissionCredentials',
      'studentSignature', 'parentGuardianSignature', 'studentNumber',
    ];

    const updateData = {};
    ALLOWED.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Re-submit to 'submitted' status when saving an edit
    updateData.status = 'submitted';

    await enrollment.update(updateData);

    res.json({ message: 'Enrollment updated successfully', enrollment });
  } catch (error) {
    console.error('Error updating enrollment:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    res.status(500).json({ message: 'Failed to update enrollment' });
  }
};

/**
 * Update enrollment status (admin only)
 * PUT /api/enrollments/:id/status
 * Requirements: 18.2, 18.3
 */
export const updateEnrollmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate status value
    if (!['submitted', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status. Must be one of: submitted, approved, rejected' 
      });
    }
    
    const enrollment = await EnrollmentRecord.findByPk(req.params.id);
    
    if (!enrollment) {
      return res.status(404).json({ 
        message: 'Enrollment not found' 
      });
    }
    
    await enrollment.update({ status });
    
    res.json({
      message: 'Status updated successfully',
      enrollment
    });
  } catch (error) {
    console.error('Error updating enrollment status:', error);
    res.status(500).json({ 
      message: 'Failed to update enrollment status' 
    });
  }
};

/**
 * Get all enrollments for a specific user
 * GET /api/enrollments/user/:userId
 * Requirements: 19.1
 */
export const getUserEnrollments = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Check authorization: user can only view own enrollments, admin can view all
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ 
        message: 'You do not have permission to view these enrollments' 
      });
    }
    
    const enrollments = await EnrollmentRecord.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
    
    res.json(enrollments);
  } catch (error) {
    console.error('Error fetching user enrollments:', error);
    res.status(500).json({ 
      message: 'Failed to fetch enrollments' 
    });
  }
};

/**
 * Delete enrollment record
 * DELETE /api/enrollments/:id
 */
export const deleteEnrollment = async (req, res) => {
  try {
    const enrollment = await EnrollmentRecord.findByPk(req.params.id);
    
    if (!enrollment) {
      return res.status(404).json({ 
        message: 'Enrollment not found' 
      });
    }
    
    // Check authorization: user can only delete own enrollment, admin can delete all
    if (req.user.role !== 'admin' && enrollment.userId !== req.user.id) {
      return res.status(403).json({ 
        message: 'You do not have permission to delete this enrollment' 
      });
    }

    // Students cannot delete once enrolled, active, or completed
    const protectedStatuses = ['enrolled', 'active', 'completed', 'verified', 'approved'];
    if (req.user.role !== 'admin' && protectedStatuses.includes(enrollment.status)) {
      return res.status(400).json({
        message: `Enrollment cannot be deleted with status: ${enrollment.status}. Please contact the registrar.`
      });
    }
    
    // Delete related enrollment subjects first (foreign key constraint)
    try {
      await EnrollmentSubject.destroy({
        where: { enrollmentId: req.params.id }
      });
    } catch (subError) {
      console.error('Error deleting enrollment subjects:', subError);
    }
    
    // Then delete the enrollment
    await enrollment.destroy();
    
    res.json({ 
      message: 'Enrollment deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Failed to delete enrollment',
      error: error.message
    });
  }
};

/**
 * Generate and download enrollment PDF
 * GET /api/enrollments/:id/pdf
 * Requirements: 13.2, 13.4, 13.5, 17.2, 17.3, 17.4
 */
export const downloadEnrollmentPDF = async (req, res) => {
  try {
    const enrollment = await EnrollmentRecord.findByPk(req.params.id, {
      include: [{ 
        model: User, 
        as: 'user',
        attributes: ['id', 'name', 'email']
      }]
    });
    
    if (!enrollment) {
      return res.status(404).json({ 
        message: 'Enrollment not found' 
      });
    }
    
    // Check authorization: user can only download own enrollment, admin/registrar can download all
    if (req.user.role !== 'admin' && req.user.role !== 'registrar' && enrollment.userId !== req.user.id) {
      return res.status(403).json({ 
        message: 'You do not have permission to download this enrollment PDF' 
      });
    }
    
    // Format enrollment data for PDF generation
    const formattedData = formatEnrollmentData(enrollment.toJSON());
    
    // Generate PDF
    const pdfBuffer = await generateEnrollmentPDF(formattedData);
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    const safeName = `${enrollment.firstName || ''}_${enrollment.familyName || ''}`.replace(/[^a-zA-Z0-9_-]/g, '');
    res.setHeader('Content-Disposition', `attachment; filename="enrollment-${enrollment.id}-${safeName}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Stream PDF to response
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating enrollment PDF:', error);
    res.status(500).json({ 
      message: 'Failed to generate PDF. Please try again later.' 
    });
  }
};
