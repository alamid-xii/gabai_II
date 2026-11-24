import { sequelize } from '../models/db.js';
import { generateStudentNumber } from './studentNumbers.js';
import { assertSectionCompatible, enrollmentTrack, gradeNumber } from './academicScope.js';

const assignable = ['approved', 'subjects_enrolled', 'enrolled', 'active'];
const occupancy = `status IN ('enrolled', 'active') AND COALESCE(lifeStatus, 'enrolled') NOT IN ('dropped', 'transferred_out', 'retained', 'completed')`;
const transactionOptions = { isolationLevel: 'READ COMMITTED' };

async function sectionCount(query, id) {
  const [[row]] = await query(`SELECT COUNT(*) AS count FROM enrollment_records WHERE sectionId = ? AND ${occupancy}`, { replacements: [id] });
  return Number(row.count);
}

export async function autoEnrollSubjects(enrollmentId, enrollment, section, transaction) {
  const query = (sql, options = {}) => sequelize.query(sql, { ...options, transaction });
  const track = enrollmentTrack(enrollment);
  const [subjects] = await query(`SELECT subjects.*, u.name AS defaultTeacherName, u.id AS defaultTeacherId,
      a.id AS assignmentId, a.teacherId AS assignedTeacherId, au.name AS assignedTeacherName,
      a.schedule AS assignedSchedule, a.room AS assignedRoom
    FROM subjects
    LEFT JOIN users u ON u.id = subjects.teacherId AND u.role = 'teacher' AND u.isActive = 1
    LEFT JOIN section_subject_assignments a ON a.sectionId = ? AND a.subjectCode = subjects.code
    LEFT JOIN users au ON au.id = a.teacherId AND au.role = 'teacher' AND au.isActive = 1
    WHERE subjects.programCode = ? AND subjects.gradeLevel = ? AND subjects.isActive = 1
      AND (subjects.strand = ? OR subjects.strand IS NULL OR subjects.strand = '')
      AND subjects.semester = ?`, { replacements: [section.id, enrollment.educationLevel, gradeNumber(enrollment.gradeLevel), track, section.semester || '1st'] });
  for (const subject of subjects) {
    const teacherId = subject.assignmentId ? subject.assignedTeacherId && subject.assignedTeacherName ? subject.assignedTeacherId : null : subject.defaultTeacherId || null;
    const instructor = subject.assignmentId ? subject.assignedTeacherName || null : subject.defaultTeacherName || null;
    const [[existing]] = await query('SELECT id FROM enrollment_subjects WHERE enrollmentId = ? AND subjectId = ? LIMIT 1', { replacements: [enrollmentId, subject.id] });
    if (existing) {
      await query(`UPDATE enrollment_subjects SET sectionId = ?, sectionName = ?, instructor = ?, teacherId = ?, schedule = ?, room = ?, updatedAt = NOW() WHERE id = ?`, {
        replacements: [section.id, section.code, instructor, teacherId, subject.assignedSchedule || null, subject.assignedRoom || null, existing.id],
      });
    } else {
      await query(`INSERT INTO enrollment_subjects
        (enrollmentId, subjectId, subjectCode, subjectDescription, units, sectionId, sectionName, schedule, instructor, teacherId, room, assignedAt, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'enrolled', NOW(), NOW())`, {
        replacements: [enrollmentId, subject.id, subject.code, subject.description, subject.units, section.id, section.code,
          subject.assignedSchedule || null, instructor, teacherId, subject.assignedRoom || null],
      });
    }
  }
  return subjects.length;
}

async function resolveStudentGeneralAverage(query, enrollment) {
  if (enrollment.grade6Average !== null && enrollment.grade6Average !== undefined && enrollment.grade6Average !== '') {
    const direct = Number(enrollment.grade6Average);
    if (Number.isFinite(direct)) return direct;
  }
  if (!enrollment.userId) return null;
  const [[prevGrade]] = await query(
    `SELECT AVG(es.finalGrade) AS gwa
     FROM enrollment_subjects es
     JOIN enrollment_records er ON er.id = es.enrollmentId
     WHERE er.userId = ? AND er.id <> ? AND es.finalGrade IS NOT NULL AND es.status = 'enrolled'
     GROUP BY er.id
     ORDER BY er.id DESC
     LIMIT 1`,
    { replacements: [enrollment.userId, enrollment.id] }
  );
  if (prevGrade?.gwa !== null && prevGrade?.gwa !== undefined) {
    const gwa = Number(prevGrade.gwa);
    if (Number.isFinite(gwa)) return Math.round(gwa * 100) / 100;
  }
  return null;
}

const hasGradeRange = section =>
  (section.minGrade !== null && section.minGrade !== undefined && section.minGrade !== '') ||
  (section.maxGrade !== null && section.maxGrade !== undefined && section.maxGrade !== '');

const parseBound = (value, fallback) =>
  value !== null && value !== undefined && value !== '' ? Number(value) : fallback;

export function selectBestSectionForStudent(candidates, generalAverage = null) {
  const available = candidates.filter(({ section, count }) => count < Number(section.capacity));
  if (!available.length) return null;

  const avg = generalAverage !== null && generalAverage !== undefined && Number.isFinite(Number(generalAverage))
    ? Number(generalAverage)
    : null;

  if (avg === null) {
    const sorted = [...available].sort((a, b) =>
      Number(hasGradeRange(a.section)) - Number(hasGradeRange(b.section)) ||
      a.count - b.count ||
      Number(a.section.id) - Number(b.section.id)
    );
    return { ...sorted[0], placementMode: hasGradeRange(sorted[0].section) ? 'fallback_no_grade' : 'no_grade' };
  }

  const inRange = [];
  const open = [];
  const outOfRange = [];

  for (const item of available) {
    if (!hasGradeRange(item.section)) {
      open.push(item);
      continue;
    }
    const min = parseBound(item.section.minGrade, -Infinity);
    const max = parseBound(item.section.maxGrade, Infinity);
    if (avg >= min && avg <= max) {
      const span = Number.isFinite(min) && Number.isFinite(max) ? max - min : 50;
      inRange.push({ ...item, span });
    } else {
      const distance = avg < min ? min - avg : avg - max;
      outOfRange.push({ ...item, distance });
    }
  }

  if (inRange.length) {
    inRange.sort((a, b) => a.span - b.span || a.count - b.count || Number(a.section.id) - Number(b.section.id));
    return { ...inRange[0], placementMode: 'exact_range' };
  }
  if (open.length) {
    open.sort((a, b) => a.count - b.count || Number(a.section.id) - Number(b.section.id));
    return { ...open[0], placementMode: 'open_section' };
  }
  outOfRange.sort((a, b) => a.distance - b.distance || a.count - b.count || Number(a.section.id) - Number(b.section.id));
  return { ...outOfRange[0], placementMode: 'fallback_nearest' };
}

export async function autoAssignSection(enrollmentId) {
  try {
    return await sequelize.transaction(transactionOptions, async transaction => {
      const query = (sql, options = {}) => sequelize.query(sql, { ...options, transaction });
      const [[enrollment]] = await query('SELECT * FROM enrollment_records WHERE id = ? FOR UPDATE', { replacements: [enrollmentId] });
      if (!enrollment) return { assigned: false, reason: 'Enrollment not found' };
      if (!assignable.includes(enrollment.status)) return { assigned: false, reason: 'Approve the enrollment before assigning a section.' };
      if (enrollment.sectionId) {
        const [[section]] = await query('SELECT * FROM sections WHERE id = ? AND isActive = 1 FOR UPDATE', { replacements: [enrollment.sectionId] });
        if (section) {
          assertSectionCompatible(enrollment, section);
          return { assigned: true, section, alreadyAssigned: true, subjectsEnrolled: await autoEnrollSubjects(enrollmentId, enrollment, section, transaction) };
        }
      }
      const track = enrollmentTrack(enrollment);
      if (!enrollment.academicYear) return { assigned: false, reason: 'The school year is required for section assignment.' };
      const [sections] = await query(`SELECT * FROM sections WHERE course = ? AND yearLevel = ? AND schoolYear = ?
        AND ${track === 'Regular' ? "(strand IS NULL OR strand = '' OR strand = 'Regular')" : 'strand = ?'}
        AND isActive = 1 ORDER BY currentEnrollment, id FOR UPDATE`, {
        replacements: [enrollment.educationLevel, gradeNumber(enrollment.gradeLevel), enrollment.academicYear, ...(track === 'Regular' ? [] : [track])],
      });
      const candidates = [];
      for (const section of sections) {
        assertSectionCompatible(enrollment, section);
        const count = await sectionCount(query, section.id);
        candidates.push({ section, count });
      }
      const generalAverage = await resolveStudentGeneralAverage(query, enrollment);
      const chosen = selectBestSectionForStudent(candidates, generalAverage);
      if (chosen) {
        const { section, count, placementMode } = chosen;
        await query("UPDATE enrollment_records SET sectionId = ?, sectionName = ?, status = 'enrolled', updatedAt = NOW() WHERE id = ?", { replacements: [section.id, section.code, enrollmentId] });
        await query('UPDATE sections SET currentEnrollment = ?, updatedAt = NOW() WHERE id = ?', { replacements: [count + 1, section.id] });
        return { assigned: true, section, placementMode, generalAverage, subjectsEnrolled: await autoEnrollSubjects(enrollmentId, enrollment, section, transaction) };
      }
      return { assigned: false, reason: `No available ${enrollment.educationLevel} Grade ${gradeNumber(enrollment.gradeLevel)} ${track} section for ${enrollment.academicYear}.` };
    });
  } catch (error) {
    console.error('Auto-assign section error:', error);
    return { assigned: false, reason: error.message };
  }
}

export async function removeFromSection(enrollmentId) {
  try {
    return await sequelize.transaction(transactionOptions, async transaction => {
      const query = (sql, options = {}) => sequelize.query(sql, { ...options, transaction });
      const [[enrollment]] = await query('SELECT * FROM enrollment_records WHERE id = ? FOR UPDATE', { replacements: [enrollmentId] });
      if (!enrollment?.sectionId) return { success: false, reason: 'Student not assigned to any section' };
      if (!assignable.includes(enrollment.status)) return { success: false, reason: 'Only current approved enrollments can change section.' };
      await query('SELECT id FROM sections WHERE id = ? FOR UPDATE', { replacements: [enrollment.sectionId] });
      await query("UPDATE enrollment_records SET sectionId = NULL, sectionName = NULL, status = 'approved', updatedAt = NOW() WHERE id = ?", { replacements: [enrollmentId] });
      await query('UPDATE sections SET currentEnrollment = ?, updatedAt = NOW() WHERE id = ?', { replacements: [await sectionCount(query, enrollment.sectionId), enrollment.sectionId] });
      await query('UPDATE enrollment_subjects SET sectionId = NULL, sectionName = NULL, schedule = NULL, room = NULL, updatedAt = NOW() WHERE enrollmentId = ?', { replacements: [enrollmentId] });
      return { success: true };
    });
  } catch (error) {
    console.error('Remove from section error:', error);
    return { success: false, reason: error.message };
  }
}

export async function moveToSection(enrollmentId, newSectionId) {
  try {
    return await sequelize.transaction(transactionOptions, async transaction => {
      const query = (sql, options = {}) => sequelize.query(sql, { ...options, transaction });
      const [[enrollment]] = await query('SELECT * FROM enrollment_records WHERE id = ? FOR UPDATE', { replacements: [enrollmentId] });
      if (!enrollment) return { success: false, reason: 'Enrollment not found' };
      if (!assignable.includes(enrollment.status)) return { success: false, reason: 'Verify and approve the enrollment before assigning a section.' };
      const oldSectionId = Number(enrollment.sectionId) || null;
      const targetSectionId = Number(newSectionId);
      if (!Number.isSafeInteger(targetSectionId) || targetSectionId < 1) return { success: false, reason: 'Select a valid target section.' };
      // Lock both section rows in a consistent order for moves in opposite directions.
      const [sections] = await query('SELECT * FROM sections WHERE id IN (?) ORDER BY id FOR UPDATE', { replacements: [[...new Set([oldSectionId, targetSectionId].filter(Boolean))]] });
      const section = sections.find(row => Number(row.id) === targetSectionId && row.isActive);
      if (!section) return { success: false, reason: 'Target section not found' };
      assertSectionCompatible(enrollment, section);
      const count = await sectionCount(query, section.id);
      if (oldSectionId !== targetSectionId && count >= Number(section.capacity)) return { success: false, reason: `Section ${section.code} is full (${count}/${section.capacity})` };
      let studentNumber = enrollment.studentNumber || null;
      if (!studentNumber && enrollment.userId) {
        const [[previous]] = await query("SELECT studentNumber FROM enrollment_records WHERE userId = ? AND studentNumber IS NOT NULL AND studentNumber != '' ORDER BY id DESC LIMIT 1", { replacements: [enrollment.userId] });
        studentNumber = previous?.studentNumber || await generateStudentNumber();
      }
      await query(`UPDATE enrollment_records SET sectionId = ?, sectionName = ?, status = 'enrolled', studentNumber = COALESCE(?, studentNumber),
        lifeStatus = COALESCE(lifeStatus, ?), updatedAt = NOW() WHERE id = ?`, {
        replacements: [section.id, section.code, studentNumber, 'enrolled', enrollmentId],
      });
      for (const id of new Set([oldSectionId, targetSectionId].filter(Boolean))) {
        await query('UPDATE sections SET currentEnrollment = ?, updatedAt = NOW() WHERE id = ?', { replacements: [await sectionCount(query, id), id] });
      }
      await autoEnrollSubjects(enrollmentId, enrollment, section, transaction);
      return { success: true, section };
    });
  } catch (error) {
    console.error('Move to section error:', error);
    return { success: false, reason: error.message };
  }
}
