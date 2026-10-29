/**
 * Auto-section assignment service
 * Matches by: educationLevel + yearLevel + strand (SHS only)
 * Requires the same grade, school year, and strand/class. Never assigns a fallback from another cohort.
 * Also auto-enrolls subjects from the curriculum after section assignment.
 */
import { sequelize } from '../models/db.js';
import { generateStudentNumber } from './studentNumbers.js';

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
async function autoEnrollSubjects(enrollmentId, enrollment, section, transaction) {
  const query = (sql, options = {}) => sequelize.query(sql, { ...options, transaction });
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

    const [subjects] = await query(subjectQuery, { replacements: params });

    if (!subjects || subjects.length === 0) {
      return 0;
    }

    const [[existing]] = await query('SELECT COUNT(*) AS count FROM enrollment_subjects WHERE enrollmentId = ?', { replacements: [enrollmentId] });
    if (Number(existing.count) > 0) return Number(existing.count);

    // Insert each subject into enrollment_subjects
    for (const subject of subjects) {
      await query(
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
    throw error;
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
    return await sequelize.transaction(async transaction => {
      const query = (sql, options = {}) => sequelize.query(sql, { ...options, transaction });
      const [[enrollment]] = await query('SELECT * FROM enrollment_records WHERE id = ? FOR UPDATE', { replacements: [enrollmentId] });
      if (!enrollment) return { assigned: false, reason: 'Enrollment not found' };
      if (enrollment.sectionId) {
        const [[existing]] = await query('SELECT * FROM sections WHERE id = ?', { replacements: [enrollment.sectionId] });
        if (existing) return { assigned: true, section: existing, alreadyAssigned: true, subjectsEnrolled: await autoEnrollSubjects(enrollmentId, enrollment, existing, transaction) };
      }
      const course = resolveSectionCourse(enrollment), grade = resolveYearLevel(enrollment);
      if (!course || !grade || !enrollment.academicYear) return { assigned: false, reason: 'Education level, grade, and school year are required for section assignment.' };
      const strand = course === 'SHS' ? enrollment.strand : enrollment.sscClass === 'SSC' ? 'SSC' : null;
      const [sections] = await query(`SELECT * FROM sections WHERE course = ? AND yearLevel = ? AND schoolYear = ?
        AND ${strand ? 'strand = ?' : "(strand IS NULL OR strand = '' OR strand = 'Regular')"}
        AND isActive = 1 AND currentEnrollment < capacity ORDER BY currentEnrollment, id LIMIT 1 FOR UPDATE`, { replacements: [course, grade, enrollment.academicYear, ...(strand ? [strand] : [])] });
      const section = sections[0];
      if (!section) return { assigned: false, reason: `No available ${course} Grade ${grade}${strand ? ` ${strand}` : ' Regular'} section for ${enrollment.academicYear}.` };
      await query("UPDATE enrollment_records SET sectionId = ?, sectionName = ?, status = 'enrolled', updatedAt = NOW() WHERE id = ?", { replacements: [section.id, section.code, enrollmentId] });
      await query('UPDATE sections SET currentEnrollment = currentEnrollment + 1, updatedAt = NOW() WHERE id = ?', { replacements: [section.id] });
      const subjectsEnrolled = await autoEnrollSubjects(enrollmentId, enrollment, section, transaction);
      return { assigned: true, section, subjectsEnrolled };
    });
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
       SET currentEnrollment = GREATEST(0, CAST(currentEnrollment AS SIGNED) - 1), updatedAt = NOW()
       WHERE id = ?`,
      { replacements: [oldSectionId] }
    );

    await sequelize.query(
      `UPDATE enrollment_subjects
       SET sectionId = NULL, sectionName = NULL, updatedAt = NOW()
       WHERE enrollmentId = ?`,
      { replacements: [enrollmentId] }
    );

    return { success: true };
  } catch (error) {
    console.error('Remove from section error:', error);
    return { success: false, reason: error.message };
  }
}

/**
 * Move or assign a student to a section
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

    const oldSectionId = enrollment.sectionId ? Number(enrollment.sectionId) : null;
    const targetSectionId = Number(newSection.id);

    // If student is already in this section, ensure status and subjects are updated and return
    if (oldSectionId === targetSectionId) {
      await sequelize.query(
        `UPDATE enrollment_records
         SET sectionName = ?, status = 'enrolled', updatedAt = NOW()
         WHERE id = ?`,
        { replacements: [newSection.code, enrollmentId] }
      );
      try {
        await autoEnrollSubjects(enrollmentId, enrollment, newSection);
      } catch (_) {}
      return { success: true, section: newSection };
    }

    if (newSection.currentEnrollment >= newSection.capacity) {
      return { success: false, reason: `Section ${newSection.code} is full (${newSection.currentEnrollment}/${newSection.capacity})` };
    }

    // Ensure student has a student number if enrolled
    let studentNumber = enrollment.studentNumber;
    if (!studentNumber && enrollment.userId) {
      try {
        const [[prev]] = await sequelize.query(
          `SELECT studentNumber FROM enrollment_records
           WHERE userId = ? AND studentNumber IS NOT NULL AND studentNumber != ''
           ORDER BY id DESC LIMIT 1`,
          { replacements: [enrollment.userId] }
        );
        studentNumber = prev?.studentNumber || await generateStudentNumber();
      } catch (snErr) {
        console.warn('Student number generation error in moveToSection:', snErr.message);
      }
    }

    const lifeStatus = enrollment.lifeStatus || (enrollment.enrollmentType === 'transferee' ? 'transferred_in' : 'enrolled');

    await sequelize.query(
      `UPDATE enrollment_records
       SET sectionId = ?, sectionName = ?, status = 'enrolled',
           studentNumber = COALESCE(?, studentNumber),
           lifeStatus = COALESCE(lifeStatus, ?),
           updatedAt = NOW()
       WHERE id = ?`,
      { replacements: [newSection.id, newSection.code, studentNumber || null, lifeStatus, enrollmentId] }
    );

    if (oldSectionId) {
      await sequelize.query(
        `UPDATE sections
         SET currentEnrollment = GREATEST(0, CAST(currentEnrollment AS SIGNED) - 1), updatedAt = NOW()
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

    // Auto-enroll subjects for this section from the curriculum
    try {
      await autoEnrollSubjects(enrollmentId, { ...enrollment, studentNumber }, newSection);
      await sequelize.query(
        `UPDATE enrollment_subjects
         SET sectionId = ?, sectionName = ?, updatedAt = NOW()
         WHERE enrollmentId = ?`,
        { replacements: [newSection.id, newSection.code, enrollmentId] }
      );
    } catch (subjErr) {
      console.warn('Auto-enroll subjects in moveToSection warning:', subjErr.message);
    }

    return { success: true, section: newSection };
  } catch (error) {
    console.error('Move to section error:', error);
    return { success: false, reason: error.message };
  }
}
