/**
 * Auto-section assignment service
 * Matches by: educationLevel + yearLevel + strand (SHS only)
 * Falls back to educationLevel + yearLevel if no strand match found.
 * Also auto-enrolls subjects from the curriculum after section assignment.
 */
import { sequelize } from '../models/db.js';

/**
 * Resolve section course from enrollment — always JHS or SHS
 */
function resolveSectionCourse(enrollment) {
  return enrollment.educationLevel || null;
}

/**
 * Resolve numeric year level from gradeLevel string (e.g. "Grade 7" → 7)
 */
function resolveYearLevel(enrollment) {
  const grade = parseInt((enrollment.gradeLevel || '').replace(/\D/g, ''));
  return isNaN(grade) ? null : grade;
}

/**
 * Auto-enroll subjects from the curriculum into EnrollmentSubject table.
 * Matches subjects by programCode + gradeLevel + strand (SHS) + semester.
 */
async function autoEnrollSubjects(enrollmentId, enrollment, section) {
  try {
    const programCode = enrollment.educationLevel; // 'JHS' or 'SHS'
    const gradeLevel = resolveYearLevel(enrollment);
    const strand = enrollment.strand || null;
    const semester = section?.semester?.replace(' Semester', '').replace('st', 'st').replace('nd', 'nd') || '1st';

    // Build subject query
    let subjectQuery = `
      SELECT * FROM subjects
      WHERE programCode = ?
        AND gradeLevel = ?
        AND isActive = 1
    `;
    const params = [programCode, gradeLevel];

    // For SHS, also filter by strand if available
    if (enrollment.educationLevel === 'SHS' && strand) {
      subjectQuery += ` AND (strand = ? OR strand IS NULL OR strand = '')`;
      params.push(strand);
    }

    // Filter by semester if section has one
    if (semester) {
      subjectQuery += ` AND semester = ?`;
      params.push(semester);
    }

    const [subjects] = await sequelize.query(subjectQuery, { replacements: params });

    if (!subjects || subjects.length === 0) {
      return 0;
    }

    // Remove existing enrollment subjects for this enrollment (avoid duplicates)
    await sequelize.query(
      `DELETE FROM enrollment_subjects WHERE enrollmentId = ?`,
      { replacements: [enrollmentId] }
    );

    // Insert each subject into enrollment_subjects
    for (const subject of subjects) {
      await sequelize.query(
        `INSERT INTO enrollment_subjects
          (enrollmentId, subjectId, subjectCode, subjectDescription, units,
           sectionId, sectionName, schedule, instructor, room,
           assignedAt, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'enrolled', NOW(), NOW())`,
        {
          replacements: [
            enrollmentId,
            subject.id,
            subject.code,
            subject.description,
            subject.units,
            section?.id || null,
            section?.code || null,
            null,        // schedule — set per subject by admin later
            null,        // instructor — set per subject by admin later (not copied from section adviser)
            null,        // room — set per subject by admin later
          ]
        }
      );
    }
    return subjects.length;
  } catch (error) {
    console.error('Auto-enroll subjects error:', error);
    return 0;
  }
}

/**
 * Auto-assign a student to the best matching section on approval.
 * Matching priority:
 *   1. SSC student (sscClass='SSC') → section with strand='SSC', same course+yearLevel
 *   2. SHS student with strand → section with matching course+yearLevel+strand
 *   3. Regular JHS or SHS fallback → section with matching course+yearLevel, strand IS NULL or empty
 *   4. course only (last resort)
 * Returns { assigned: true, section, subjectsEnrolled } or { assigned: false, reason }
 */
export async function autoAssignSection(enrollmentId) {
  try {
    const [[enrollment]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [enrollmentId] }
    );

    if (!enrollment) return { assigned: false, reason: 'Enrollment not found' };

    const sectionCourse = resolveSectionCourse(enrollment);
    const yearLevel = resolveYearLevel(enrollment);
    const strand = enrollment.strand || null;
    const isSSC = enrollment.sscClass === 'SSC';

    if (!sectionCourse) return { assigned: false, reason: 'Cannot determine course/level' };

    let section = null;

    // Priority 1: SSC student → find section with strand = 'SSC'
    if (isSSC && yearLevel) {
      const [rows] = await sequelize.query(
        `SELECT * FROM sections
         WHERE course = ? AND yearLevel = ? AND strand = 'SSC'
           AND isActive = 1 AND currentEnrollment < capacity
         ORDER BY currentEnrollment ASC LIMIT 1`,
        { replacements: [sectionCourse, yearLevel] }
      );
      if (rows && rows.length > 0) section = rows[0];
    }

    // Priority 2: SHS student with strand → match course + yearLevel + strand
    if (!section && sectionCourse === 'SHS' && strand && yearLevel) {
      const [rows] = await sequelize.query(
        `SELECT * FROM sections
         WHERE course = ? AND yearLevel = ? AND strand = ?
           AND isActive = 1 AND currentEnrollment < capacity
         ORDER BY currentEnrollment ASC LIMIT 1`,
        { replacements: [sectionCourse, yearLevel, strand] }
      );
      if (rows && rows.length > 0) section = rows[0];
    }

    // Priority 3: Regular JHS → match course + yearLevel, exclude SSC sections
    if (!section && sectionCourse === 'JHS' && yearLevel && !isSSC) {
      const [rows] = await sequelize.query(
        `SELECT * FROM sections
         WHERE course = ? AND yearLevel = ?
           AND (strand IS NULL OR strand = '' OR strand != 'SSC')
           AND isActive = 1 AND currentEnrollment < capacity
         ORDER BY currentEnrollment ASC LIMIT 1`,
        { replacements: [sectionCourse, yearLevel] }
      );
      if (rows && rows.length > 0) section = rows[0];
    }

    // Priority 4: course + yearLevel (SHS fallback or any remaining)
    if (!section && yearLevel) {
      const [rows] = await sequelize.query(
        `SELECT * FROM sections
         WHERE course = ? AND yearLevel = ?
           AND isActive = 1 AND currentEnrollment < capacity
         ORDER BY currentEnrollment ASC LIMIT 1`,
        { replacements: [sectionCourse, yearLevel] }
      );
      if (rows && rows.length > 0) section = rows[0];
    }

    // Priority 5: course only (last resort)
    if (!section) {
      const [rows] = await sequelize.query(
        `SELECT * FROM sections
         WHERE course = ?
           AND isActive = 1 AND currentEnrollment < capacity
         ORDER BY currentEnrollment ASC LIMIT 1`,
        { replacements: [sectionCourse] }
      );
      if (rows && rows.length > 0) section = rows[0];
    }

    if (!section) {
      const detail = isSSC
        ? `${sectionCourse} Grade ${yearLevel} SSC — no SSC section available`
        : strand
          ? `${sectionCourse} Grade ${yearLevel} ${strand}`
          : `${sectionCourse}${yearLevel ? ` Grade ${yearLevel}` : ''}`;
      return { assigned: false, reason: `No available sections for ${detail}` };
    }

    // Assign enrollment to section
    await sequelize.query(
      `UPDATE enrollment_records
       SET sectionId = ?, sectionName = ?, status = 'enrolled',
           updatedAt = NOW()
       WHERE id = ?`,
      { replacements: [section.id, section.code, enrollmentId] }
    );

    // Increment section count
    await sequelize.query(
      `UPDATE sections
       SET currentEnrollment = currentEnrollment + 1, updatedAt = NOW()
       WHERE id = ?`,
      { replacements: [section.id] }
    );

    // Auto-enroll subjects from curriculum
    const subjectsEnrolled = await autoEnrollSubjects(enrollmentId, enrollment, section);

    return { assigned: true, section, subjectsEnrolled };
  } catch (error) {
    console.error('Auto-assign section error:', error);
    return { assigned: false, reason: error.message };
  }
}

/**
 * Remove a student from their current section
 */
export async function removeFromSection(enrollmentId) {
  try {
    const [[enrollment]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [enrollmentId] }
    );

    if (!enrollment || !enrollment.sectionId) {
      return { success: false, reason: 'Student not assigned to any section' };
    }

    const oldSectionId = enrollment.sectionId;

    await sequelize.query(
      `UPDATE enrollment_records
       SET sectionId = NULL, sectionName = NULL, status = 'approved',
           updatedAt = NOW()
       WHERE id = ?`,
      { replacements: [enrollmentId] }
    );

    await sequelize.query(
      `UPDATE sections
       SET currentEnrollment = MAX(0, currentEnrollment - 1), updatedAt = NOW()
       WHERE id = ?`,
      { replacements: [oldSectionId] }
    );

    return { success: true };
  } catch (error) {
    console.error('Remove from section error:', error);
    return { success: false, reason: error.message };
  }
}

/**
 * Move a student from one section to another
 */
export async function moveToSection(enrollmentId, newSectionId) {
  try {
    const [[enrollment]] = await sequelize.query(
      'SELECT * FROM enrollment_records WHERE id = ?',
      { replacements: [enrollmentId] }
    );
    if (!enrollment) return { success: false, reason: 'Enrollment not found' };

    const [[newSection]] = await sequelize.query(
      'SELECT * FROM sections WHERE id = ? AND isActive = 1',
      { replacements: [newSectionId] }
    );
    if (!newSection) return { success: false, reason: 'Target section not found' };

    if (newSection.currentEnrollment >= newSection.capacity) {
      return { success: false, reason: `Section ${newSection.code} is full (${newSection.currentEnrollment}/${newSection.capacity})` };
    }

    const oldSectionId = enrollment.sectionId;

    await sequelize.query(
      `UPDATE enrollment_records
       SET sectionId = ?, sectionName = ?, status = 'enrolled',
           updatedAt = NOW()
       WHERE id = ?`,
      { replacements: [newSection.id, newSection.code, enrollmentId] }
    );

    if (oldSectionId) {
      await sequelize.query(
        `UPDATE sections
         SET currentEnrollment = MAX(0, currentEnrollment - 1), updatedAt = NOW()
         WHERE id = ?`,
        { replacements: [oldSectionId] }
      );
    }

    await sequelize.query(
      `UPDATE sections
       SET currentEnrollment = currentEnrollment + 1, updatedAt = NOW()
       WHERE id = ?`,
      { replacements: [newSection.id] }
    );

    return { success: true, section: newSection };
  } catch (error) {
    console.error('Move to section error:', error);
    return { success: false, reason: error.message };
  }
}
