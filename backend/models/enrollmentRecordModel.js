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

import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";
import { User } from "./userModel.js";

export const EnrollmentRecord = sequelize.define("EnrollmentRecord", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  
  // Foreign Key
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  
  // Link to Admission (NEW)
  admissionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Reference to admission record (optional)'
  },
  
  // Education Level
  educationLevel: {
    type: DataTypes.ENUM('JHS', 'SHS'),
    allowNull: false,
    defaultValue: 'JHS'
  },

  // ── HS-specific fields ──────────────────────────────────
  // Grade level (7-12) and strand (for SHS)
  gradeLevel: {
    type: DataTypes.STRING(20),
    allowNull: true  // e.g. "Grade 7", "Grade 11"
  },
  strand: {
    type: DataTypes.STRING(50),
    allowNull: true  // STEM, ABM, HUMSS (SHS only)
  },
  lrn: {
    type: DataTypes.STRING(20),
    allowNull: true,  // Learner Reference Number
    unique: true      // Each LRN must belong to only one enrollment record
  },
  parentsAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  guardianTelephone: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  // Grade VI school info
  grade6School: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  grade6SchoolAddress: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  grade6Section: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  grade6SYStart: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  grade6SYEnd: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  grade6Average: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  grade6Remarks: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  // Last HS attended
  lastHSSchool: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  lastHSCurriculumYear: {
    type: DataTypes.STRING(20),
    allowNull: true  // G7/G8/G9/G10/G11/G12
  },
  lastHSSection: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  lastHSSYStart: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  lastHSSYEnd: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  // Parent/Guardian signatures
  parentGuardianSignature: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  // ── end HS-specific fields ──────────────────────────────

  // Enrollment Type
  enrollmentType: {
    type: DataTypes.ENUM('new', 'old', 'transferee', 'returnee'),
    allowNull: true
  },

  // Student Type and Identification (kept for backward compat)
  studentType: {
    type: DataTypes.ENUM('New', 'Old'),
    allowNull: true
  },
  studentNumber: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  // Enrollment Period
  semester: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  academicYear: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  dateEnrolled: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  
  // Admission Credentials (stored as JSON array)
  admissionCredentials: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  
  // Personal Information
  familyName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  middleName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  sex: {
    type: DataTypes.ENUM('Male', 'Female'),
    allowNull: true
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  placeOfBirth: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  
  // Contact Information
  email: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  mobileNumber: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  
  // Parent Information
  fatherName: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  fatherOccupation: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  fatherAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  motherName: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  motherOccupation: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  motherAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Guardian Information
  guardianName: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  guardianOccupation: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  guardianAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Educational Background (stored as JSON)
  educationalBackground: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  
  // Subject Enrollment (stored as JSON array)
  // DEPRECATED: Use EnrollmentSubject table instead
  // Kept for backward compatibility only
  subjects: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'DEPRECATED: Use EnrollmentSubject table. Kept for backward compatibility.'
  },
  
  // Additional Information
  studentSignature: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  referredBy: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  
  // ── SSC (Special Science Class) fields ─────────────────
  // Only applies to JHS Grade 7 applicants
  sscApplied: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  sscQualified: {
    // true = grade6Average >= 85 (system-evaluated)
    type: DataTypes.BOOLEAN,
    allowNull: true
  },
  sscExamDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  sscExamScore: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  sscPassingScore: {
    // Admin-configurable passing score, default 75
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 75.00
  },
  sscResult: {
    // 'passed' → SSC section, 'failed' → Regular section
    type: DataTypes.ENUM('passed', 'failed'),
    allowNull: true
  },
  sscClass: {
    // Final assigned class type after SSC process — set by student choice (not auto-assigned)
    type: DataTypes.ENUM('SSC', 'Regular'),
    allowNull: true
  },
  sscChoiceMade: {
    // true once the student has explicitly chosen SSC or Regular after passing
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  // ── end SSC fields ───────────────────────────────────────

  // Status and Metadata
  status: {
    type: DataTypes.ENUM(
      'draft',             // Initial state, not submitted
      'submitted',         // Student submitted, waiting registrar review
      'pending_exam',      // SSC exam scheduled (JHS Grade 7 only)
      'verified',          // Registrar verified documents, waiting admin approval
      'returned',          // Registrar returned to student for corrections
      'approved',          // Admin approved, ready for subject selection
      'subjects_enrolled', // Student selected subjects, waiting section assignment
      'enrolled',          // Sections assigned, ready for classes
      'active',            // Currently taking classes
      'completed',         // Semester/year completed
      'rejected'           // Admin rejected enrollment
    ),
    allowNull: false,
    defaultValue: 'draft',
    comment: 'Enrollment status progression through the workflow'
  },

  // Registrar verification fields
  registrar_remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Remarks from registrar during document verification'
  },

  verified_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of registrar who verified documents'
  },

  verified_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp of registrar verification'
  },

  // TOR evaluation fields (College transferees)
  tor_evaluated: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
    comment: 'Whether TOR has been evaluated by registrar'
  },

  tor_remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Registrar remarks on TOR evaluation'
  },

  // Admin approval fields
  admin_comments: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Comments from admin during approval/rejection'
  },
  
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of admin who approved/rejected'
  },
  
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp of approval/rejection'
  },

  // Section assignment (set by auto-assign or manual admin action)
  sectionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Assigned section ID'
  },

  sectionName: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Assigned section code/name (denormalized for quick display)'
  },
  
  completion_percentage: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Enrollment completion percentage'
  },

  // ── Student Life Status ─────────────────────────────────────────────────────
  // Tracks what happened to the student AFTER enrollment was approved.
  // Separate from `status` which tracks the application pipeline.
  lifeStatus: {
    type: DataTypes.ENUM(
      'enrolled',         // Currently attending — set automatically on approval
      'dropped',          // Stopped attending mid-year (registrar action)
      'transferred_out',  // Left for another school (registrar action)
      'transferred_in',   // Came from another school (auto-set for transferee type)
      'retained',         // Did not pass to next grade (registrar action, end of year)
      'completed'         // Finished the school year (auto or registrar action)
    ),
    allowNull: true,
    defaultValue: null,
    comment: 'Student life status after enrollment is approved'
  },
  lifeStatusReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason or notes for the life status change'
  },
  lifeStatusDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date the life status was set'
  },
  lifeStatusUpdatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of registrar/admin who set the life status'
  },
  destinationSchool: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'For transferred_out: name of school the student transferred to'
  }
}, {
  tableName: 'enrollment_records',
  timestamps: true
});

// Set up associations
EnrollmentRecord.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(EnrollmentRecord, { foreignKey: 'userId', as: 'enrollments' });

export { sequelize };
