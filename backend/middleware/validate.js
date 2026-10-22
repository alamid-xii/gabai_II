/**
 * Shared validation & sanitization helpers
 * Used across enrollment, auth, admin, registrar, and section controllers.
 */

// ── Sanitizers ────────────────────────────────────────────────────────────────

/** Strip leading/trailing whitespace from every string field in req.body */
export function trimBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    }
  }
  next();
}

/** Remove HTML tags from a string to prevent stored XSS */
export function stripTags(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '');
}

/** Sanitize all string fields in req.body (strip tags + trim) */
export function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = stripTags(req.body[key].trim());
      }
    }
  }
  next();
}

// ── Format validators ─────────────────────────────────────────────────────────

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone) {
  // Philippine mobile: starts with 09, 11 digits total
  return /^09\d{9}$/.test(phone);
}

export function isValidLRN(lrn) {
  // LRN is exactly 12 digits
  return /^\d{12}$/.test(lrn);
}

export function isValidDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

export function isValidStudentNumber(sn) {
  // Format: YYYY-NNNNN  e.g. 2025-00123
  return /^\d{4}-\d{5}$/.test(sn);
}

// ── Enrollment middleware ─────────────────────────────────────────────────────

const ENROLLMENT_STRING_LIMITS = {
  gradeLevel: 20,
  strand: 50,
  lrn: 12,
  guardianTelephone: 11,
  grade6School: 200,
  grade6SchoolAddress: 200,
  grade6Section: 50,
  grade6SYStart: 4,
  grade6SYEnd: 4,
  grade6Average: 10,
  grade6Remarks: 50,
  lastHSSchool: 200,
  lastHSCurriculumYear: 20,
  lastHSSection: 50,
  lastHSSYStart: 4,
  lastHSSYEnd: 4,
  enrollmentType: 20,
  studentNumber: 10,
  academicYear: 20,
  dateEnrolled: 10,
  familyName: 100,
  firstName: 100,
  middleName: 100,
  dateOfBirth: 10,
  placeOfBirth: 200,
  email: 100,
  mobileNumber: 20,
  fatherName: 200,
  fatherOccupation: 100,
  fatherAddress: 500,
  motherName: 200,
  motherOccupation: 100,
  motherAddress: 500,
  parentsAddress: 500,
  guardianName: 200,
  guardianOccupation: 100,
  guardianAddress: 500,
  studentSignature: 200,
  parentGuardianSignature: 200,
};

function validateEnrollmentStringLimits(body, errors) {
  for (const [field, maxLength] of Object.entries(ENROLLMENT_STRING_LIMITS)) {
    const value = body[field];
    if (value === undefined || value === null || value === '') continue;
    if (typeof value !== 'string') {
      errors.push({ field, message: `${field} must be text` });
    } else if (value.length > maxLength) {
      errors.push({ field, message: `${field} must be ${maxLength} characters or less` });
    }
  }

  for (const field of ['grade6SYStart', 'grade6SYEnd', 'lastHSSYStart', 'lastHSSYEnd']) {
    const value = body[field];
    if (value && !/^\d{4}$/.test(value)) {
      errors.push({ field, message: `${field} must be a four-digit year` });
    }
  }
}

/**
 * Validate required fields for POST /api/enrollments
 */
export function validateEnrollmentCreate(req, res, next) {
  const b = req.body;
  const errors = [];
  validateEnrollmentStringLimits(b, errors);

  // Core identity
  if (!b.familyName?.trim())  errors.push({ field: 'familyName',  message: 'Family name is required' });
  if (!b.firstName?.trim())   errors.push({ field: 'firstName',   message: 'First name is required' });
  if (!b.sex)                 errors.push({ field: 'sex',         message: 'Sex is required' });
  if (!b.dateOfBirth)         errors.push({ field: 'dateOfBirth', message: 'Date of birth is required' });
  if (!b.educationLevel)      errors.push({ field: 'educationLevel', message: 'Education level is required' });
  if (!b.gradeLevel)          errors.push({ field: 'gradeLevel',  message: 'Grade level is required' });
  if (!b.enrollmentType)      errors.push({ field: 'enrollmentType', message: 'Enrollment type is required' });

  // Email — optional in form (student's account email is used by the backend)
  if (b.email && !isValidEmail(b.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  // Phone (optional but format-checked when present)
  if (b.mobileNumber && !isValidPhone(b.mobileNumber)) {
    errors.push({ field: 'mobileNumber', message: 'Mobile number must be 11 digits starting with 09' });
  }

  // LRN format (optional but format-checked when present)
  if (b.lrn && !isValidLRN(b.lrn)) {
    errors.push({ field: 'lrn', message: 'LRN must be exactly 12 digits' });
  }

  // Student number format (optional but format-checked when present)
  if (b.studentNumber && !isValidStudentNumber(b.studentNumber)) {
    errors.push({ field: 'studentNumber', message: 'Student number must be in YYYY-NNNNN format' });
  }

  // Enum checks
  if (b.educationLevel && !['JHS', 'SHS'].includes(b.educationLevel)) {
    errors.push({ field: 'educationLevel', message: 'Education level must be JHS or SHS' });
  }
  if (b.enrollmentType && !['new', 'old', 'transferee', 'returnee'].includes(b.enrollmentType)) {
    errors.push({ field: 'enrollmentType', message: 'Enrollment type must be new, old, transferee, or returnee' });
  }
  if (b.sex && !['Male', 'Female'].includes(b.sex)) {
    errors.push({ field: 'sex', message: 'Sex must be Male or Female' });
  }
  if (b.educationLevel === 'SHS' && !b.strand) {
    errors.push({ field: 'strand', message: 'Strand is required for SHS' });
  }

  // Date format
  if (b.dateOfBirth && !isValidDate(b.dateOfBirth)) {
    errors.push({ field: 'dateOfBirth', message: 'Invalid date of birth format' });
  }
  if (b.dateEnrolled && !isValidDate(b.dateEnrolled)) {
    errors.push({ field: 'dateEnrolled', message: 'Invalid date enrolled format' });
  }

  // Length limits
  if (b.familyName?.length > 100)  errors.push({ field: 'familyName',  message: 'Family name must be 100 characters or less' });
  if (b.firstName?.length > 100)   errors.push({ field: 'firstName',   message: 'First name must be 100 characters or less' });
  if (b.middleName?.length > 100)  errors.push({ field: 'middleName',  message: 'Middle name must be 100 characters or less' });
  if (b.placeOfBirth?.length > 200) errors.push({ field: 'placeOfBirth', message: 'Place of birth must be 200 characters or less' });

  // Names must not contain numbers
  if (b.familyName && /\d/.test(b.familyName)) errors.push({ field: 'familyName', message: 'Family name must not contain numbers' });
  if (b.firstName  && /\d/.test(b.firstName))  errors.push({ field: 'firstName',  message: 'First name must not contain numbers' });
  if (b.middleName && /\d/.test(b.middleName)) errors.push({ field: 'middleName', message: 'Middle name must not contain numbers' });

  if (b.guardianTelephone && !isValidPhone(b.guardianTelephone)) {
    errors.push({ field: 'guardianTelephone', message: 'Guardian telephone must be 11 digits starting with 09' });
  }
  if (b.grade6Average && (!Number.isFinite(Number(b.grade6Average)) || Number(b.grade6Average) < 0 || Number(b.grade6Average) > 100)) {
    errors.push({ field: 'grade6Average', message: 'General average must be between 0 and 100' });
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  next();
}

/**
 * Validate fields for PUT /api/enrollments/:id (student editing own enrollment)
 */
export function validateEnrollmentUpdate(req, res, next) {
  const b = req.body;
  const errors = [];
  validateEnrollmentStringLimits(b, errors);

  if (b.email !== undefined && !isValidEmail(b.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }
  if (b.mobileNumber !== undefined && b.mobileNumber && !isValidPhone(b.mobileNumber)) {
    errors.push({ field: 'mobileNumber', message: 'Mobile number must be 11 digits starting with 09' });
  }
  if (b.lrn !== undefined && b.lrn && !isValidLRN(b.lrn)) {
    errors.push({ field: 'lrn', message: 'LRN must be exactly 12 digits' });
  }
  if (b.studentNumber !== undefined && b.studentNumber && !isValidStudentNumber(b.studentNumber)) {
    errors.push({ field: 'studentNumber', message: 'Student number must be in YYYY-NNNNN format' });
  }
  if (b.familyName !== undefined && /\d/.test(b.familyName)) errors.push({ field: 'familyName', message: 'Family name must not contain numbers' });
  if (b.firstName  !== undefined && /\d/.test(b.firstName))  errors.push({ field: 'firstName',  message: 'First name must not contain numbers' });
  if (b.middleName !== undefined && /\d/.test(b.middleName)) errors.push({ field: 'middleName', message: 'Middle name must not contain numbers' });
  if (b.guardianTelephone && !isValidPhone(b.guardianTelephone)) {
    errors.push({ field: 'guardianTelephone', message: 'Guardian telephone must be 11 digits starting with 09' });
  }
  if (b.grade6Average && (!Number.isFinite(Number(b.grade6Average)) || Number(b.grade6Average) < 0 || Number(b.grade6Average) > 100)) {
    errors.push({ field: 'grade6Average', message: 'General average must be between 0 and 100' });
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  next();
}

// ── Auth middleware ───────────────────────────────────────────────────────────

export function validateRegister(req, res, next) {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name?.trim())     errors.push({ field: 'name',     message: 'Name is required' });
  if (name?.length > 100) errors.push({ field: 'name',   message: 'Name must be 100 characters or less' });
  if (!email?.trim())    errors.push({ field: 'email',    message: 'Email is required' });
  else if (!isValidEmail(email)) errors.push({ field: 'email', message: 'Invalid email format' });
  if (!password)         errors.push({ field: 'password', message: 'Password is required' });
  else {
    if (password.length < 12) errors.push({ field: 'password', message: 'Password must be at least 12 characters' });
    if (!/[A-Z]/.test(password)) errors.push({ field: 'password', message: 'Password must contain at least one uppercase letter' });
    if (!/[0-9]/.test(password)) errors.push({ field: 'password', message: 'Password must contain at least one number' });
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  next();
}

export function validateLogin(req, res, next) {
  const { email, password } = req.body;
  if (!email?.trim() || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  next();
}

// ── FAQ middleware ────────────────────────────────────────────────────────────

export function validateFAQ(req, res, next) {
  const { question, answer, category } = req.body;
  const errors = [];

  if (!question?.trim()) errors.push({ field: 'question', message: 'Question is required' });
  if (question?.length > 500) errors.push({ field: 'question', message: 'Question must be 500 characters or less' });
  if (!answer?.trim()) errors.push({ field: 'answer', message: 'Answer is required' });
  if (answer?.length > 2000) errors.push({ field: 'answer', message: 'Answer must be 2000 characters or less' });
  if (!category?.trim()) errors.push({ field: 'category', message: 'Category is required' });

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  next();
}

// ── Section middleware ────────────────────────────────────────────────────────

export function validateSection(req, res, next) {
  const { code, course, yearLevel, semester, schoolYear, capacity } = req.body;
  const errors = [];

  if (!code?.trim())       errors.push({ field: 'code',       message: 'Section code is required' });
  if (code?.length > 20)   errors.push({ field: 'code',       message: 'Section code must be 20 characters or less' });
  if (!course?.trim())     errors.push({ field: 'course',     message: 'Course is required' });
  if (!['JHS', 'SHS'].includes(course)) errors.push({ field: 'course', message: 'Course must be JHS or SHS' });
  if (!yearLevel)          errors.push({ field: 'yearLevel',  message: 'Year level is required' });
  const yl = parseInt(yearLevel);
  if (isNaN(yl) || yl < 7 || yl > 12) errors.push({ field: 'yearLevel', message: 'Year level must be between 7 and 12' });
  if (!semester?.trim())   errors.push({ field: 'semester',   message: 'Semester is required' });
  if (!schoolYear?.trim()) errors.push({ field: 'schoolYear', message: 'School year is required' });
  if (capacity !== undefined) {
    const cap = parseInt(capacity);
    if (isNaN(cap) || cap < 1 || cap > 100) errors.push({ field: 'capacity', message: 'Capacity must be between 1 and 100' });
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  next();
}

// ── Registrar action middleware ───────────────────────────────────────────────

export function validateRemarks(req, res, next) {
  const { remarks } = req.body;
  if (remarks !== undefined && typeof remarks === 'string' && remarks.length > 1000) {
    return res.status(400).json({ message: 'Remarks must be 1000 characters or less' });
  }
  // Strip tags from remarks
  if (remarks) req.body.remarks = stripTags(remarks.trim());
  next();
}

export function validateSSCSchedule(req, res, next) {
  const { examDate, passingScore } = req.body;
  const errors = [];

  if (!examDate) {
    errors.push({ field: 'examDate', message: 'Exam date is required' });
  } else if (!isValidDate(examDate)) {
    errors.push({ field: 'examDate', message: 'Invalid exam date format' });
  }
  if (passingScore !== undefined) {
    const ps = parseFloat(passingScore);
    if (isNaN(ps) || ps < 0 || ps > 100) {
      errors.push({ field: 'passingScore', message: 'Passing score must be between 0 and 100' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  next();
}

export function validateSSCResult(req, res, next) {
  const { examScore } = req.body;
  if (examScore === undefined || examScore === null || examScore === '') {
    return res.status(400).json({ message: 'Exam score is required' });
  }
  const score = parseFloat(examScore);
  if (isNaN(score) || score < 0 || score > 100) {
    return res.status(400).json({ message: 'Exam score must be a number between 0 and 100' });
  }
  next();
}
