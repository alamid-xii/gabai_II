import { ACADEMIC_TERMS } from '../services/academicTerms.js';
import { Op } from "sequelize";
import { ClassSchedule, Section, Subject, User, EnrollmentRecord, SchoolYear, sequelize } from '../models/index.js';
import { SectionSubjectAssignment } from '../models/sectionSubjectAssignmentModel.js';
import { generateStudentSchedulePDF, generateTeacherSchedulePDF } from '../services/schedulePdfGenerator.js';

// ── GET all class schedules ──────────────────────────────────────────────────
export const getClassSchedules = async (req, res) => {
  try {
    const { dayOfWeek, sectionId, gradeLevel, schoolYear } = req.query;
    const where = {};
    if (dayOfWeek) where.dayOfWeek = dayOfWeek;
    if (sectionId) where.sectionId = parseInt(sectionId);
    if (gradeLevel) where.gradeLevel = gradeLevel;
    if (schoolYear) where.schoolYear = schoolYear;

    const schedules = await ClassSchedule.findAll({
      where,
      order: [
        ['dayOfWeek', 'ASC'],
        ['startTime', 'ASC'],
        ['sectionName', 'ASC']
      ]
    });

    res.json(schedules);
  } catch (error) {
    console.error('Get class schedules error:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
};

async function syncSubjectTimetable(sectionId, subjectCode, schoolYear, semester, transaction) {
  const section = await Section.findByPk(sectionId, { transaction });
  if (!section || section.schoolYear !== schoolYear || section.semester !== semester) return;
  const schedules = await ClassSchedule.findAll({ where: { sectionId, subjectCode, schoolYear, semester }, order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']], transaction });
  const text = schedules.map(item => `${item.dayOfWeek} ${item.startTime}-${item.endTime}`).join('; ') || null;
  const assignment = await SectionSubjectAssignment.findOne({ where: { sectionId, subjectCode }, transaction });
  if (assignment) await assignment.update({ schedule: text }, { transaction });
  await sequelize.query(`UPDATE enrollment_subjects es JOIN enrollment_records er ON er.id = es.enrollmentId
    SET es.schedule = ?, es.instructor = COALESCE(?, es.instructor), es.teacherId = COALESCE(?, es.teacherId), es.room = ?, es.updatedAt = NOW()
    WHERE es.sectionId = ? AND es.subjectCode = ? AND er.academicYear = ?`, {
    replacements: [text, assignment?.instructor || null, assignment?.teacherId || null, schedules[0]?.room || null, sectionId, subjectCode, schoolYear], transaction,
  });
}

// Helper to parse time string into minutes from midnight (e.g., "7:30 AM" -> 450)
export function parseTimeToMinutes(timeStr) {
  if (typeof timeStr !== 'string' || !timeStr.trim()) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3] ? match[3].toUpperCase() : null;
  if (minutes > 59 || (meridiem ? hours < 1 || hours > 12 : hours > 23)) return null;

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

// ── CREATE / ADD a class schedule ────────────────────────────────────────────
export const createClassSchedule = async (req, res) => {
  let transaction;
  try {
    const {
      subjectId,
      subjectCode,
      subjectName,
      sectionId,
      sectionName,
      gradeLevel,
      teacherId,
      teacherName,
      dayOfWeek,
      days,
      startTime,
      endTime,
      room,
      schoolYear,
      semester,
      isBreak: explicitBreak
    } = req.body;

    const isBreak = explicitBreak === true ||
      ['health break', 'lunch break', 'recess', 'break'].includes((subjectName || '').trim().toLowerCase()) ||
      teacherName === 'No Teacher' ||
      teacherName === '—' ||
      (!teacherName && ['health break', 'lunch break'].includes((subjectName || '').trim().toLowerCase()));

    if (!subjectName) return res.status(400).json({ error: 'Subject / Activity name is required' });
    if (!sectionName) return res.status(400).json({ error: 'Grade and section is required' });
    if (!isBreak && !teacherName) return res.status(400).json({ error: 'Teacher is required' });
    if (!dayOfWeek && (!days || !days.length)) return res.status(400).json({ error: 'Day of week is required' });
    if (!startTime || !endTime) return res.status(400).json({ error: 'Start and end time are required' });

    const newStart = parseTimeToMinutes(startTime);
    const newEnd = parseTimeToMinutes(endTime);

    if (newStart === null || newEnd === null || newStart >= newEnd) {
      return res.status(400).json({ error: 'End time must be later than start time' });
    }

    const requestedDays = Array.isArray(days) && days.length > 0
      ? days
      : dayOfWeek === 'All Weekdays'
        ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        : [dayOfWeek];

    const targetDays = [...new Set(requestedDays)];
    if (!targetDays.length || targetDays.some(day => !['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].includes(day))) return res.status(400).json({ error: 'Select valid weekdays.' });
    const section = sectionId ? await Section.findByPk(sectionId) : null;
    if (sectionId && !section) return res.status(404).json({ error: 'Section not found.' });
    const effectiveYear = schoolYear || section?.schoolYear;
    const effectiveSemester = semester || section?.semester || '1st';
    if (!ACADEMIC_TERMS.includes(effectiveSemester)) return res.status(400).json({ error: 'Select a valid academic term.' });
    if (typeof effectiveYear !== 'string' || !/^\d{4}-\d{4}$/.test(effectiveYear) || Number(effectiveYear.slice(5)) !== Number(effectiveYear.slice(0, 4)) + 1) return res.status(400).json({ error: 'Select a valid school year.' });
    if (!isBreak && teacherId) {
      const teacher = await User.findOne({ where: { id: Number(teacherId), role: 'teacher', isActive: true } });
      if (!teacher) return res.status(400).json({ error: 'Choose an active teacher.' });
    }
    transaction = await sequelize.transaction();
    // One lock per year serializes overlapping timetable checks across sections, teachers and rooms.
    const year = await SchoolYear.findOne({ where: { year: effectiveYear }, transaction, lock: transaction.LOCK.UPDATE });
    if (!year) { await transaction.rollback(); transaction = null; return res.status(400).json({ error: 'Configure this school year before scheduling.' }); }
    const cleanTeacher = (!isBreak && teacherName) ? teacherName.trim().toLowerCase() : null;
    const cleanSection = sectionName.trim().toLowerCase();
    const cleanRoom = room ? room.trim().toLowerCase() : null;
    const tid = (!isBreak && teacherId) ? parseInt(teacherId) : null;
    const sid = sectionId ? parseInt(sectionId) : null;

    // ── Conflict-Free Enforcement ──────────────────────────────────────────
    // Every teacher is assigned to at most one class/activity at any given time.
    // No section can be double-booked at overlapping time slots.
    // No room can be occupied by multiple classes simultaneously.
    for (const day of targetDays) {
      const existingSchedules = await ClassSchedule.findAll({
        where: { dayOfWeek: day, schoolYear: effectiveYear, [Op.or]: [{ semester: effectiveSemester }, { semester: null }, { semester: '' }] }, transaction
      });

      for (const s of existingSchedules) {
        const existStart = parseTimeToMinutes(s.startTime);
        const existEnd = parseTimeToMinutes(s.endTime);
        if (existStart === null || existEnd === null) continue;

        // Check overlap: max(newStart, existStart) < min(newEnd, existEnd)
        const hasOverlap = Math.max(newStart, existStart) < Math.min(newEnd, existEnd);
        if (!hasOverlap) continue;

        // 1. Teacher Conflict check (only if not a break and both have assigned teachers)
        if (!isBreak && cleanTeacher && s.teacherName && s.teacherName !== 'No Teacher' && s.teacherName !== '—') {
          const isSameTeacher = (tid && s.teacherId && s.teacherId === tid) ||
            (s.teacherName && s.teacherName.trim().toLowerCase() === cleanTeacher);

          if (isSameTeacher) {
            await transaction.rollback(); transaction = null;
            return res.status(400).json({
              error: `Teacher conflict: ${s.teacherName} is already assigned to ${s.subjectName} (${s.sectionName}) on ${day} from ${s.startTime} to ${s.endTime}.`,
              conflictType: 'teacher',
              conflictSchedule: s
            });
          }
        }

        // 2. Section / Class Conflict check
        const isSameSection = (sid && s.sectionId && s.sectionId === sid) ||
          (s.sectionName && s.sectionName.trim().toLowerCase() === cleanSection);

        if (isSameSection) {
          await transaction.rollback(); transaction = null;
          const teacherPart = s.teacherName && s.teacherName !== 'No Teacher' && s.teacherName !== '—' ? ` with ${s.teacherName}` : '';
          return res.status(400).json({
            error: `Section conflict: ${s.sectionName} already has ${s.subjectName}${teacherPart} on ${day} from ${s.startTime} to ${s.endTime}.`,
            conflictType: 'section',
            conflictSchedule: s
          });
        }

        // 3. Room Conflict check
        if (cleanRoom && s.room && s.room.trim().toLowerCase() === cleanRoom) {
          await transaction.rollback(); transaction = null;
          return res.status(400).json({
            error: `Room conflict: ${s.room} is already booked for ${s.sectionName} (${s.subjectName}) on ${day} from ${s.startTime} to ${s.endTime}.`,
            conflictType: 'room',
            conflictSchedule: s
          });
        }
      }
    }

    // Create schedule records for each target day
    const createdRecords = [];
    const finalTeacherName = isBreak ? (teacherName && teacherName !== 'No Teacher' ? teacherName.trim() : 'No Teacher') : teacherName.trim();

    for (const day of targetDays) {
      const scheduleRecord = await ClassSchedule.create({
        subjectId: isBreak ? null : (subjectId ? parseInt(subjectId) : null),
        subjectCode: subjectCode || (isBreak ? 'BREAK' : null),
        subjectName: subjectName.trim(),
        sectionId: sectionId ? parseInt(sectionId) : null,
        sectionName: sectionName.trim(),
        gradeLevel: gradeLevel || null,
        teacherId: isBreak ? null : (teacherId ? parseInt(teacherId) : null),
        teacherName: finalTeacherName,
        dayOfWeek: day,
        startTime,
        endTime,
        room: room ? room.trim() : null,
        schoolYear: effectiveYear,
        semester: effectiveSemester,
      }, { transaction });
      createdRecords.push(scheduleRecord);
    }

    if (sectionId && subjectCode && !isBreak && section.schoolYear === effectiveYear && section.semester === effectiveSemester) {
      await SectionSubjectAssignment.upsert({ sectionId: Number(sectionId), subjectCode,
        teacherId: teacherId ? Number(teacherId) : null, instructor: finalTeacherName,
        schedule: null, room: room?.trim() || null }, { transaction });
      await syncSubjectTimetable(Number(sectionId), subjectCode, effectiveYear, effectiveSemester, transaction);
    }
    await transaction.commit(); transaction = null;

    res.status(201).json({
      message: targetDays.length > 1
        ? `Scheduled ${subjectName} for ${sectionName} across ${targetDays.length} days!`
        : `Scheduled ${subjectName} for ${sectionName} successfully!`,
      schedule: createdRecords[0],
      schedules: createdRecords
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Create class schedule error:', error);
    res.status(500).json({ error: error.message || 'Failed to save schedule' });
  }
};

// ── DELETE a class schedule ──────────────────────────────────────────────────
export const deleteClassSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await ClassSchedule.findByPk(id);
    if (!item) return res.status(404).json({ error: 'Schedule not found' });

    await sequelize.transaction(async transaction => {
      await SchoolYear.findOne({ where: { year: item.schoolYear }, transaction, lock: transaction.LOCK.UPDATE });
      await item.destroy({ transaction });
      if (item.sectionId && item.subjectCode) await syncSubjectTimetable(item.sectionId, item.subjectCode, item.schoolYear, item.semester, transaction);
    });
    res.json({ message: 'Schedule removed successfully' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
};

// ── GET student's own schedule ────────────────────────────────────────────────
export const getStudentSchedule = async (req, res) => {
  try {
    const userId = req.user.id;
    const { enrollmentId } = req.query;

    // Fetch user enrollments
    const userEnrollments = await EnrollmentRecord.findAll({
      where: { userId },
      order: [
        ['createdAt', 'DESC']
      ]
    });

    if (!userEnrollments || userEnrollments.length === 0) {
      return res.json({
        hasEnrollment: false,
        message: 'No enrollment records found for your account.',
        schedules: [],
        allEnrollments: []
      });
    }

    // Determine target enrollment
    let targetEnrollment = null;
    if (enrollmentId) {
      targetEnrollment = userEnrollments.find(e => String(e.id) === String(enrollmentId));
    }
    if (!targetEnrollment) {
      let activeSY = null;
      try {
        const syRecord = await SchoolYear.findOne({ where: { isActive: true } });
        activeSY = syRecord?.year;
      } catch (_) {}

      // Prioritize active school year first
      if (activeSY) {
        targetEnrollment = userEnrollments.find(e => e.academicYear === activeSY && e.sectionId) ||
          userEnrollments.find(e => e.academicYear === activeSY && ['enrolled', 'active', 'approved', 'subjects_enrolled'].includes(e.status)) ||
          userEnrollments.find(e => e.academicYear === activeSY);
      }

      // Fallback: any ongoing enrolled record with a sectionId, or latest record
      if (!targetEnrollment) {
        targetEnrollment = userEnrollments.find(e => e.status !== 'completed' && e.sectionId) ||
          userEnrollments.find(e => ['enrolled', 'active', 'approved', 'subjects_enrolled'].includes(e.status)) ||
          userEnrollments.find(e => e.sectionId) ||
          userEnrollments[0];
      }
    }

    let section = null;
    if (targetEnrollment.sectionId) {
      section = await Section.findByPk(targetEnrollment.sectionId);
    } else if (targetEnrollment.sectionName) {
      section = await Section.findOne({
        where: {
          code: targetEnrollment.sectionName
        }
      });
    }

    // Fetch schedules for section
    let schedules = [];
    if (targetEnrollment.sectionId) {
      schedules = await ClassSchedule.findAll({
        where: { sectionId: targetEnrollment.sectionId, schoolYear: targetEnrollment.academicYear },
        order: [
          ['dayOfWeek', 'ASC'],
          ['startTime', 'ASC']
        ]
      });
    }

    if ((!schedules || schedules.length === 0) && (section || targetEnrollment.sectionName)) {
      const sName = section ? `Grade ${section.yearLevel} - ${section.code}` : targetEnrollment.sectionName;
      schedules = await ClassSchedule.findAll({
        where: {
          schoolYear: targetEnrollment.academicYear,
          [Op.or]: [
            { sectionName: sName },
            { sectionName: { [Op.like]: `%${section?.code || targetEnrollment.sectionName}%` } }
          ]
        },
        order: [
          ['dayOfWeek', 'ASC'],
          ['startTime', 'ASC']
        ]
      });
    }

    // Also get subjects from enrollment_subjects if available
    let enrolledSubjects = [];
    try {
      const [rows] = await sequelize.query(
        `SELECT id, subjectCode, subjectDescription, units, sectionId, sectionName, schedule, instructor, teacherId, room, status FROM enrollment_subjects WHERE enrollmentId = ?`,
        { replacements: [targetEnrollment.id] }
      );
      enrolledSubjects = rows || [];
    } catch (_) {}

    // Adviser name
    let adviserName = section?.instructor || null;
    if (!adviserName && section?.teacherId) {
      try {
        const teacher = await User.findByPk(section.teacherId);
        if (teacher) adviserName = teacher.name;
      } catch (_) {}
    }

    res.json({
      hasEnrollment: true,
      enrollment: targetEnrollment,
      section: section ? {
        id: section.id,
        code: section.code,
        course: section.course,
        yearLevel: section.yearLevel,
        strand: section.strand,
        room: section.room,
        instructor: adviserName,
        schoolYear: section.schoolYear,
        semester: section.semester
      } : null,
      adviserName,
      schedules,
      enrolledSubjects,
      allEnrollments: userEnrollments.map(e => ({
        id: e.id,
        gradeLevel: e.gradeLevel,
        strand: e.strand,
        sectionId: e.sectionId,
        sectionName: e.sectionName,
        status: e.status,
        academicYear: e.academicYear,
        semester: e.semester,
        createdAt: e.createdAt
      }))
    });
  } catch (error) {
    console.error('Get student schedule error:', error);
    res.status(500).json({ error: 'Failed to fetch student schedule' });
  }
};

// ── DOWNLOAD student's own schedule as PDF ──────────────────────────────────
export const downloadStudentSchedulePDF = async (req, res) => {
  try {
    const userId = req.user.id;
    const { enrollmentId } = req.query;

    const userEnrollments = await EnrollmentRecord.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    if (!userEnrollments || userEnrollments.length === 0) {
      return res.status(404).json({ message: 'No enrollment records found.' });
    }

    let targetEnrollment = null;
    if (enrollmentId) {
      targetEnrollment = userEnrollments.find(e => String(e.id) === String(enrollmentId));
    }
    if (!targetEnrollment) {
      let activeSY = null;
      try {
        const syRecord = await SchoolYear.findOne({ where: { isActive: true } });
        activeSY = syRecord?.year;
      } catch (_) {}

      if (activeSY) {
        targetEnrollment = userEnrollments.find(e => e.academicYear === activeSY && e.sectionId) ||
          userEnrollments.find(e => e.academicYear === activeSY && ['enrolled', 'active', 'approved', 'subjects_enrolled'].includes(e.status)) ||
          userEnrollments.find(e => e.academicYear === activeSY);
      }

      if (!targetEnrollment) {
        targetEnrollment = userEnrollments.find(e => e.status !== 'completed' && e.sectionId) ||
          userEnrollments.find(e => ['enrolled', 'active', 'approved', 'subjects_enrolled'].includes(e.status)) ||
          userEnrollments.find(e => e.sectionId) ||
          userEnrollments[0];
      }
    }

    let section = null;
    if (targetEnrollment.sectionId) {
      section = await Section.findByPk(targetEnrollment.sectionId);
    } else if (targetEnrollment.sectionName) {
      section = await Section.findOne({
        where: { code: targetEnrollment.sectionName }
      });
    }

    let schedules = [];
    if (targetEnrollment.sectionId) {
      schedules = await ClassSchedule.findAll({
        where: { sectionId: targetEnrollment.sectionId, schoolYear: targetEnrollment.academicYear },
        order: [
          ['dayOfWeek', 'ASC'],
          ['startTime', 'ASC']
        ]
      });
    }

    if ((!schedules || schedules.length === 0) && (section || targetEnrollment.sectionName)) {
      const sName = section ? `Grade ${section.yearLevel} - ${section.code}` : targetEnrollment.sectionName;
      schedules = await ClassSchedule.findAll({
        where: {
          schoolYear: targetEnrollment.academicYear,
          [Op.or]: [
            { sectionName: sName },
            { sectionName: { [Op.like]: `%${section?.code || targetEnrollment.sectionName}%` } }
          ]
        },
        order: [
          ['dayOfWeek', 'ASC'],
          ['startTime', 'ASC']
        ]
      });
    }

    let adviserName = section?.instructor || null;
    if (!adviserName && section?.teacherId) {
      try {
        const teacher = await User.findByPk(section.teacherId);
        if (teacher) adviserName = teacher.name;
      } catch (_) {}
    }

    const pdfBuffer = await generateStudentSchedulePDF({
      student: targetEnrollment.toJSON(),
      section: section ? section.toJSON() : null,
      schedules: schedules.map(s => s.toJSON()),
      adviserName
    });

    const safeStudent = (targetEnrollment.firstName || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeSec = section ? `Grade_${section.yearLevel}_${section.code}` : 'Schedule';
    const filename = `Class_Schedule_${safeSec}_${safeStudent}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.end(pdfBuffer);
  } catch (error) {
    console.error('Download student schedule PDF error:', error);
    res.status(500).json({ error: 'Failed to generate schedule PDF' });
  }
};

// ── GET teacher's own schedule ────────────────────────────────────────────────
export const getTeacherSchedule = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const teacherName = req.user.name;
    const { sectionId } = req.query;

    const whereConditions = [
      { teacherId },
      { teacherName }
    ];

    if (teacherName) {
      whereConditions.push(
        sequelize.where(sequelize.fn('LOWER', sequelize.col('teacherName')), teacherName.toLowerCase().trim()),
        { teacherName: { [Op.like]: `%${teacherName.trim()}%` } }
      );
    }

    const where = {
      [Op.or]: whereConditions
    };

    if (sectionId && sectionId !== 'all') {
      where.sectionId = parseInt(sectionId);
    }

    const schedules = await ClassSchedule.findAll({
      where,
      order: [
        ['dayOfWeek', 'ASC'],
        ['startTime', 'ASC'],
        ['sectionName', 'ASC']
      ]
    });

    // Also fetch sections where this teacher is adviser
    const advisorySections = await Section.findAll({
      where: {
        [Op.or]: [
          { teacherId },
          { instructor: teacherName }
        ]
      }
    });

    // Also get all distinct sections where this teacher has classes
    const distinctSections = await ClassSchedule.findAll({
      where: {
        [Op.or]: whereConditions
      },
      attributes: ['sectionId', 'sectionName', 'gradeLevel'],
      group: ['sectionId', 'sectionName', 'gradeLevel']
    });

    res.json({
      teacher: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email
      },
      schedules,
      advisorySections,
      sections: distinctSections
    });
  } catch (error) {
    console.error('Get teacher schedule error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher schedule' });
  }
};

// ── DOWNLOAD teacher's schedule PDF ──────────────────────────────────────────
export const downloadTeacherSchedulePDF = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const teacherName = req.user.name;
    const { sectionId } = req.query;

    const whereConditions = [
      { teacherId },
      { teacherName }
    ];

    if (teacherName) {
      whereConditions.push(
        sequelize.where(sequelize.fn('LOWER', sequelize.col('teacherName')), teacherName.toLowerCase().trim()),
        { teacherName: { [Op.like]: `%${teacherName.trim()}%` } }
      );
    }

    const where = {
      [Op.or]: whereConditions
    };

    if (sectionId && sectionId !== 'all') {
      where.sectionId = parseInt(sectionId);
    }

    const schedules = await ClassSchedule.findAll({
      where,
      order: [
        ['dayOfWeek', 'ASC'],
        ['startTime', 'ASC'],
        ['sectionName', 'ASC']
      ]
    });

    const advisorySections = await Section.findAll({
      where: {
        [Op.or]: [
          { teacherId },
          { instructor: teacherName }
        ]
      }
    });

    const pdfBuffer = await generateTeacherSchedulePDF({
      teacher: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email
      },
      schedules: schedules.map(s => s.toJSON()),
      advisorySections: advisorySections.map(s => s.toJSON())
    });

    const safeName = (teacherName || 'Teacher').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Faculty_Schedule_${safeName}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.end(pdfBuffer);
  } catch (error) {
    console.error('Download teacher schedule PDF error:', error);
    res.status(500).json({ error: 'Failed to generate teacher schedule PDF' });
  }
};

