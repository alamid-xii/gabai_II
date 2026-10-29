import { currentAdmission, policyFor, validateSelection } from "../services/admissionPolicy.js";
import { needsProfileCompletion, serializeUser } from "../services/userProfile.js";
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
import { EnrollmentDocument } from "../models/enrollmentDocumentModel.js";
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

        if (user.isActive === false || user.isActive === 0 || user.isActive === '0') {
          return res.status(403).json({ message: 'Your account has been suspended or deactivated. Please contact an administrator.', isSuspended: true });
        }

        if (needsProfileCompletion(user)) {
          return res.status(403).json({ message: 'Complete your profile before continuing.', needsProfileCompletion: true });
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

    if (user.isActive === false || user.isActive === 0 || user.isActive === '0') {
      return res.status(403).json({ message: 'Your account has been suspended or deactivated. Please contact an administrator.', isSuspended: true });
    }

    if (needsProfileCompletion(user)) {
      return res.status(403).json({ message: 'Complete your profile before continuing.', needsProfileCompletion: true });
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
 * Create new enrollment record
 * POST /api/enrollments
 * Requirements: 12.2, 12.3, 14.1
 *
 * SSC Logic (JHS Grade 7 only):
 *   - If sscApplied=true AND grade6Average >= 85 → status='pending_exam', sscQualified=true
 *   - If sscApplied=true AND grade6Average < 85  → status='submitted', sscQualified=false, sscClass='Regular'
 *   - If sscApplied=false                        → status='submitted', normal flow
 */
export const computeEnrollmentGradesSummary = async (enrollmentId) => {
  try {
    const [grades] = await sequelize.query(
      `SELECT q1, q2, q3, q4, finalGrade, remarks, status
       FROM enrollment_subjects
       WHERE enrollmentId = ? AND status != 'dropped'`,
      { replacements: [enrollmentId] }
    );
    const list = Array.isArray(grades) ? grades : [];
    if (list.length === 0) {
      return { computedGwa: null, gradesComplete: false, hasFailedSubject: false, totalSubjects: 0, completedSubjects: 0 };
    }
    const processed = list.map(g => {
      const isFourTerms = g.q4 !== null && g.q4 !== undefined && g.q4 !== '';
      const isComplete = isFourTerms
        ? (g.q1 != null && g.q1 !== '' && g.q2 != null && g.q2 !== '' && g.q3 != null && g.q3 !== '' && g.q4 != null && g.q4 !== '')
        : (g.q1 != null && g.q1 !== '' && g.q2 != null && g.q2 !== '' && g.q3 != null && g.q3 !== '');
      const numFinal = g.finalGrade != null && g.finalGrade !== '' ? parseFloat(g.finalGrade) : null;
      return {
        isComplete: Boolean(isComplete && Number.isFinite(numFinal)),
        finalGrade: isComplete && Number.isFinite(numFinal) ? numFinal : null,
        remarks: isComplete ? g.remarks : 'Incomplete',
      };
    });
    const completed = processed.filter(g => g.isComplete && g.finalGrade !== null);
    const gradesComplete = completed.length === processed.length && processed.length > 0;
    const computedGwa = completed.length > 0
      ? Number((completed.reduce((sum, g) => sum + g.finalGrade, 0) / completed.length).toFixed(2))
      : null;
    const hasFailedSubject = completed.some(g => g.remarks === 'Failed' || g.finalGrade < 75);
    return {
      computedGwa,
      gradesComplete,
      hasFailedSubject,
      totalSubjects: processed.length,
      completedSubjects: completed.length,
    };
  } catch (_) {
    return { computedGwa: null, gradesComplete: false, hasFailedSubject: false, totalSubjects: 0, completedSubjects: 0 };
  }
};

export const createEnrollment = async (req, res) => {
  try {
    const requestedSscClass = req.body.sscClass;
    const body = { ...req.body };
    for (const key of ['id','userId','admissionPolicy','admissionRevision','sscQualified','sscClass','sscResult','sscExamScore','sectionId','sectionName','previousGeneralAverage']) delete body[key];
    let { policy, revision } = await currentAdmission();
    let sscQualified = null;
    let sscClass = null;

    // Allow Continuing JHS SSC students to retain their SSC class designation directly without re-taking the Grade 7 exam
    if (
      body.educationLevel === 'JHS' &&
      (['old', 'returnee'].includes(body.enrollmentType) || body.studentType === 'Old') &&
      requestedSscClass === 'SSC'
    ) {
      const maintainingAverage = Number(policy?.ssc?.maintainingAverage ?? policy?.ssc?.minimumAverage ?? 85);

      let prevEnrollment = null;
      try {
        const [prevRows] = await sequelize.query(
          `SELECT id, gradeLevel, sscClass, academicYear, status
           FROM enrollment_records
           WHERE userId = ? AND educationLevel = 'JHS' AND status IN ('completed', 'enrolled', 'active')
           ORDER BY id DESC LIMIT 1`,
          { replacements: [req.user.id] }
        );
        if (prevRows && prevRows.length > 0) prevEnrollment = prevRows[0];
      } catch (_) {}

      const gradeSummary = prevEnrollment
        ? await computeEnrollmentGradesSummary(prevEnrollment.id)
        : { computedGwa: null, gradesComplete: false, hasFailedSubject: false };

      if (gradeSummary.gradesComplete && gradeSummary.computedGwa !== null) {
        if (gradeSummary.computedGwa < maintainingAverage || gradeSummary.hasFailedSubject) {
          return res.status(400).json({
            message: gradeSummary.hasFailedSubject
              ? `Your previous record has a failing subject grade (GWA: ${gradeSummary.computedGwa}). You did not meet the SSC maintaining grade requirement (${maintainingAverage}) and are only eligible to enroll in the Regular Class.`
              : `Your previous General Average (${gradeSummary.computedGwa}) did not meet the SSC maintaining grade of ${maintainingAverage}. You are only eligible to enroll in the Regular Class.`,
            sscDisqualified: true,
            computedGwa: gradeSummary.computedGwa,
            maintainingAverage,
          });
        }
      } else {
        const rawReported = req.body.previousGeneralAverage ?? req.body.grade6Average;
        const reportedAvg = rawReported === '' || rawReported === null || rawReported === undefined ? NaN : Number(rawReported);
        if (!Number.isFinite(reportedAvg) || reportedAvg < maintainingAverage || reportedAvg > 100) {
          return res.status(400).json({
            message: Number.isFinite(reportedAvg) && reportedAvg < maintainingAverage
              ? `Your previous General Average (${reportedAvg}) did not meet the SSC maintaining grade of ${maintainingAverage}. You are only eligible to enroll in the Regular Class.`
              : `Please enter your previous year General Average (at least ${maintainingAverage}) to continue in the Special Science Class (SSC). Students below ${maintainingAverage} are only eligible for the Regular Class.`,
            sscDisqualified: Number.isFinite(reportedAvg) && reportedAvg < maintainingAverage,
            maintainingAverage,
          });
        }
      }

      sscClass = 'SSC';
      body.sscChoiceMade = true;
      body.sscApplied = false;
    } else if (body.educationLevel === 'JHS' && requestedSscClass === 'Regular') {
      sscClass = 'Regular';
      body.sscChoiceMade = true;
      body.sscApplied = false;
    }

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
      `SELECT id, status, firstName, sscApplied, academicYear, lifeStatus, admissionPolicy, admissionRevision
       FROM enrollment_records
       WHERE userId = ?
         AND status NOT IN ('rejected', 'completed')
         ${activeYear ? "AND academicYear = ?" : ""}
       LIMIT 1`,
      { replacements: activeYear ? [req.user.id, activeYear] : [req.user.id] }
    );
    if (existing && existing.length > 0) {
      const existingRecord = existing[0];
      ({ policy, revision } = await policyFor(existingRecord));

      // Block re-enrollment if student was dropped or transferred out this school year
      if (['dropped', 'transferred_out'].includes(existingRecord.lifeStatus)) {
        const statusLabel = existingRecord.lifeStatus === 'dropped' ? 'Dropped' : 'Transferred Out';
        return res.status(400).json({
          message: `Your enrollment for school year ${activeYear || 'this year'} was marked as "${statusLabel}". You cannot submit a new application for the same school year. Please contact the Registrar's Office if you need assistance.`
        });
      }
      // If it's an SSC placeholder (sscApplied=1 and no name filled), update it with full form data
      if (existingRecord.sscApplied && !existingRecord.firstName) {
        validateSelection(policy, { ...body, sscApplied: false });
        body.admissionPolicy = policy; body.admissionRevision = revision;
        const safeFields = ['admissionPolicy','admissionRevision','educationLevel','gradeLevel','strand','studentType','academicYear','dateEnrolled',
          'lrn','familyName','firstName','middleName','sex','dateOfBirth','placeOfBirth',
          'fatherName','fatherOccupation','motherName','motherOccupation','parentsAddress',
          'guardianName','guardianOccupation','guardianAddress','guardianTelephone',
          'grade6School','grade6SchoolAddress','grade6Section','grade6SYStart','grade6SYEnd',
          'grade6Average','grade6Remarks','lastHSSchool','lastHSCurriculumYear','lastHSSection',
          'lastHSSYStart','lastHSSYEnd','admissionCredentials','studentSignature','parentGuardianSignature'];
        const updates = safeFields.filter(k => body[k] !== undefined);
        if (updates.length > 0) {
          const setClause = updates.map(k => `${k} = ?`).join(', ');
          const values = updates.map(k => ['admissionCredentials','admissionPolicy'].includes(k) ? JSON.stringify(body[k]) : body[k]);
          await sequelize.query(
            `UPDATE enrollment_records SET ${setClause}, status = 'draft', updatedAt = NOW() WHERE id = ?`,
            { replacements: [...values, existingRecord.id] }
          );
        }
        const [[updated]] = await sequelize.query('SELECT * FROM enrollment_records WHERE id = ?', { replacements: [existingRecord.id] });

        return res.status(200).json({ message: 'Enrollment updated successfully', enrollment: updated });
      }
      return res.status(400).json({
        message: `You already have an active enrollment for school year ${activeYear || 'this year'}. You cannot submit another application until your current one is completed or rejected.`
      });
    }

    validateSelection(policy, body);

    // LRN uniqueness check: ensure no other student is using this LRN
    if (body.lrn) {
      const [lrnCheck] = await sequelize.query(
        `SELECT id FROM enrollment_records WHERE lrn = ? AND userId != ? LIMIT 1`,
        { replacements: [body.lrn, req.user.id] }
      );
      if (lrnCheck && lrnCheck.length > 0) {
        return res.status(400).json({ message: 'This LRN is already registered by another student in the system. Please check your LRN and try again.' });
      }
    }

    // The draft is finalized only after its uploaded documents are validated.
    if (body.sscApplied === true) sscQualified = true;

    // Auto-stamp active school year — override whatever the student submitted
    if (activeYear) {
      body.academicYear = activeYear;
    }

    // Preserve existing studentNumber if returning student
    // Verify and preserve studentNumber for continuing (old) students
    if (body.enrollmentType === 'old' || body.studentType === 'Old') {
      const enteredStudentId = String(body.studentNumber || '').trim().toUpperCase();
      const validStudentIdPattern = /^([A-Z]{1,3}-\d{3,6}|\d{4}-\d{4,6})$/i;
      if (!enteredStudentId || !validStudentIdPattern.test(enteredStudentId)) {
        return res.status(400).json({
          message: 'Please enter a valid EMC Student ID (e.g., A-9869 or 2025-00123) to confirm your identity as a continuing student.'
        });
      }

      let recordedStudentId = null;
      try {
        const [[prevIdRow]] = await sequelize.query(
          `SELECT studentNumber FROM enrollment_records
           WHERE userId = ? AND studentNumber IS NOT NULL AND studentNumber != ''
           ORDER BY id DESC LIMIT 1`,
          { replacements: [req.user.id] }
        );
        if (prevIdRow?.studentNumber) {
          recordedStudentId = String(prevIdRow.studentNumber).trim().toUpperCase();
        }
      } catch (_) {}

      if (recordedStudentId) {
        if (recordedStudentId !== enteredStudentId) {
          return res.status(400).json({
            message: `The Student ID you entered (${enteredStudentId}) does not match your Student ID on file. Please enter your registered EMC Student ID to confirm your identity.`
          });
        }
        body.studentNumber = recordedStudentId;
      } else {
        try {
          const [takenIdRows] = await sequelize.query(
            `SELECT id FROM enrollment_records WHERE UPPER(studentNumber) = ? AND userId != ? LIMIT 1`,
            { replacements: [enteredStudentId, req.user.id] }
          );
          if (takenIdRows && takenIdRows.length > 0) {
            return res.status(400).json({
              message: `This Student ID (${enteredStudentId}) is already registered to another student account. Please check your Student ID and try again.`
            });
          }
        } catch (_) {}
        body.studentNumber = enteredStudentId;
      }
    } else if (!body.studentNumber) {
      try {
        const [[prev]] = await sequelize.query(
          `SELECT studentNumber FROM enrollment_records
           WHERE userId = ? AND studentNumber IS NOT NULL AND studentNumber != ''
           ORDER BY id DESC LIMIT 1`,
          { replacements: [req.user.id] }
        );
        if (prev?.studentNumber) {
          body.studentNumber = prev.studentNumber;
        }
      } catch (_) {}
    }

    // Check if returning student was marked retained in previous enrollment
    if (body.enrollmentType === 'old' || body.studentType === 'Old') {
      try {
        const [[prev]] = await sequelize.query(
          `SELECT gradeLevel, lifeStatus, educationLevel FROM enrollment_records
           WHERE userId = ? AND status = 'completed'
           ORDER BY id DESC LIMIT 1`,
          { replacements: [req.user.id] }
        );
        if (prev?.lifeStatus === 'retained' && prev?.gradeLevel) {
          if (body.gradeLevel !== prev.gradeLevel || (prev.gradeLevel === 'Grade 10' && body.educationLevel === 'SHS')) {
            return res.status(400).json({
              message: `Student was retained in ${prev.gradeLevel} due to failing grades and must repeat ${prev.gradeLevel}. Advancement to ${body.gradeLevel || 'a higher grade'} is not permitted.`
            });
          }
        }
      } catch (_) {}
    }

    const enrollmentData = {
      userId: req.user.id,
      ...body,
      status: 'draft',
      admissionPolicy: policy, admissionRevision: revision,
      ...(sscQualified !== null && { sscQualified }),
      ...(sscClass !== null && { sscClass }),
    };

    const enrollment = await EnrollmentRecord.create(enrollmentData);

    // Sync Personal Info to User account automatically when provided
    try {
      if (body.firstName && body.familyName && req.user) {
        const userUpdates = {
          firstName: String(body.firstName).trim(),
          middleName: body.middleName ? String(body.middleName).trim() : req.user.middleName || null,
          lastName: String(body.familyName).trim(),
          name: [body.firstName, body.middleName, body.familyName].map(v => (v || '').trim()).filter(Boolean).join(' '),
        };
        if (body.mobileNumber && /^09\d{9}$/.test(String(body.mobileNumber).trim())) {
          userUpdates.mobileNumber = String(body.mobileNumber).trim();
        }
        await req.user.update(userUpdates);
      }
    } catch (_) {}

    if (body.previousEnrollmentId) {
      try {
        const prevDocs = await EnrollmentDocument.findAll({ where: { enrollmentId: body.previousEnrollmentId } });
        if (prevDocs && prevDocs.length > 0) {
          const docCopies = prevDocs.map(d => ({
            enrollmentId: enrollment.id,
            documentType: d.documentType,
            documentLabel: d.documentLabel,
            filePath: d.filePath,
            originalName: d.originalName,
            mimeType: d.mimeType,
            fileSize: d.fileSize
          }));
          await EnrollmentDocument.bulkCreate(docCopies);
        }
      } catch (err) {
        console.warn('Failed to copy previous enrollment documents:', err);
      }
    }

    res.status(201).json({ message: 'Enrollment draft saved. Upload documents and submit to finish.', enrollment, sscQualified, status: 'draft' });
  } catch (error) {
    if (!error.status) console.error('Create enrollment error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Failed to save enrollment. Please try again.' });
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

    // Lookup previous section if student had a prior enrollment with section or grade6Section
    let previousSection = null;
    let previousSectionDetails = null;
    try {
      if (enrollment.userId) {
        const [[prev]] = await sequelize.query(
          `SELECT sectionName, gradeLevel, academicYear, educationLevel
           FROM enrollment_records
           WHERE userId = ? AND id != ? AND sectionName IS NOT NULL AND sectionName != ''
           ORDER BY id DESC LIMIT 1`,
          { replacements: [enrollment.userId, enrollment.id] }
        );
        if (prev?.sectionName) {
          previousSection = prev.sectionName;
          previousSectionDetails = prev;
        } else if (enrollment.grade6Section) {
          previousSection = enrollment.grade6Section;
          previousSectionDetails = {
            sectionName: enrollment.grade6Section,
            gradeLevel: 'Grade 6',
            academicYear: enrollment.grade6SYStart ? `${enrollment.grade6SYStart}–${enrollment.grade6SYEnd}` : null,
            educationLevel: 'Elementary'
          };
        }
      }
    } catch (_) {}

    const enrollmentData = enrollment.toJSON();
    enrollmentData.adviserName = adviserName;
    enrollmentData.previousSection = previousSection;
    enrollmentData.previousSectionDetails = previousSectionDetails;

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

    const { policy, revision } = await policyFor(enrollment);
    validateSelection(policy, { ...enrollment.toJSON(), ...updateData }, { sscPlaceholder: Boolean(enrollment.sscApplied && enrollment.sscResult) });
    updateData.status = 'draft';
    updateData.admissionPolicy = policy;
    updateData.admissionRevision = revision;

    await enrollment.update(updateData);

    res.json({ message: 'Enrollment updated successfully', enrollment });
  } catch (error) {
    if (!error.status) console.error('Error updating enrollment:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Failed to update enrollment' });
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

    const enriched = await Promise.all(
      enrollments.map(async (enrollment) => {
        const plain = typeof enrollment.toJSON === 'function' ? enrollment.toJSON() : { ...enrollment };
        const summary = await computeEnrollmentGradesSummary(plain.id);
        return {
          ...plain,
          computedGwa: summary.computedGwa,
          gradesComplete: summary.gradesComplete,
          hasFailedSubject: summary.hasFailedSubject,
        };
      })
    );

    res.json(enriched);
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

    // Students cannot delete once submitted, pending exam, returned, verified, approved, enrolled, active, or completed
    const protectedStatuses = ['submitted', 'pending_exam', 'returned', 'enrolled', 'active', 'completed', 'verified', 'approved'];
    if (req.user.role !== 'admin' && protectedStatuses.includes(enrollment.status)) {
      return res.status(400).json({
        message: `Enrollment cannot be deleted once submitted (status: ${enrollment.status}). Please contact the registrar.`
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

/**
 * Update Student Profile Sections (Step 2 Personal Info & Step 3 Family/Guardian Info)
 * PUT /api/enrollments/:id/profile-sections
 * Allows continuing/enrolled students to update their personal and family details
 * from the Student Profile page without resetting their enrollment status.
 */
export const updateStudentProfileSections = async (req, res) => {
  try {
    const enrollment = await EnrollmentRecord.findByPk(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment record not found' });
    }

    if (enrollment.userId !== req.user.id) {
      return res.status(403).json({ message: 'You can only update your own profile sections' });
    }

    const PERSONAL_AND_FAMILY_FIELDS = [
      'familyName', 'firstName', 'middleName', 'lrn', 'sex', 'dateOfBirth', 'placeOfBirth',
      'mobileNumber',
      'fatherName', 'fatherOccupation', 'fatherAddress',
      'motherName', 'motherOccupation', 'motherAddress',
      'parentsAddress',
      'guardianName', 'guardianOccupation', 'guardianAddress', 'guardianTelephone',
    ];

    const updates = {};
    for (const field of PERSONAL_AND_FAMILY_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
      }
    }

    if (updates.firstName !== undefined && !updates.firstName) {
      return res.status(400).json({ message: 'First name is required' });
    }
    if (updates.familyName !== undefined && !updates.familyName) {
      return res.status(400).json({ message: 'Last name is required' });
    }
    if (updates.lrn) {
      if (!/^\d{12}$/.test(updates.lrn)) {
        return res.status(400).json({ message: 'LRN must be exactly 12 digits' });
      }
      const [lrnRows] = await sequelize.query(
        'SELECT id FROM enrollment_records WHERE lrn = ? AND userId != ? LIMIT 1',
        { replacements: [updates.lrn, req.user.id] }
      );
      if (lrnRows.length > 0) {
        return res.status(400).json({ message: 'This LRN is already registered to another student' });
      }
    }
    if (updates.mobileNumber && !/^09\d{9}$/.test(updates.mobileNumber)) {
      return res.status(400).json({ message: 'Mobile number must be 11 digits starting with 09' });
    }
    if (updates.guardianTelephone && !/^09\d{9}$/.test(updates.guardianTelephone)) {
      return res.status(400).json({ message: 'Guardian telephone/mobile must be 11 digits starting with 09' });
    }

    await enrollment.update(updates);

    // Sync updated personal info back to User account
    const userUpdates = {};
    const finalFirst = updates.firstName !== undefined ? updates.firstName : enrollment.firstName;
    const finalMiddle = updates.middleName !== undefined ? updates.middleName : enrollment.middleName;
    const finalLast = updates.familyName !== undefined ? updates.familyName : enrollment.familyName;

    if (finalFirst) userUpdates.firstName = finalFirst;
    if (updates.middleName !== undefined) userUpdates.middleName = finalMiddle || null;
    if (finalLast) userUpdates.lastName = finalLast;
    if (finalFirst && finalLast) {
      userUpdates.name = [finalFirst, finalMiddle, finalLast].filter(Boolean).join(' ');
    }
    if (updates.mobileNumber) {
      userUpdates.mobileNumber = updates.mobileNumber;
    }

    if (Object.keys(userUpdates).length > 0) {
      await req.user.update(userUpdates);
    }

    res.json({
      message: 'Profile section updated successfully',
      enrollment,
      user: serializeUser(req.user),
    });
  } catch (error) {
    console.error('Error updating student profile sections:', error);
    res.status(500).json({ message: 'Failed to update profile details' });
  }
};
