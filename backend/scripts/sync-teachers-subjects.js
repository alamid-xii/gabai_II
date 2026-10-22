import { sequelize, User, Section, EnrollmentSubject, EnrollmentRecord, Subject } from '../models/index.js';

async function syncTeachersAndSubjects() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // 1. Ensure all instructors have a User account with role='teacher'
    const [sections] = await sequelize.query(
      `SELECT id, code, course, yearLevel, strand, instructor, teacherId, schedule, room FROM sections WHERE isActive = 1`
    );

    const [teachers] = await sequelize.query(
      `SELECT id, name, email FROM users WHERE role = 'teacher'`
    );
    const teacherMap = new Map();
    teachers.forEach(t => teacherMap.set(t.name.trim().toLowerCase(), t.id));

    // Update section teacherId
    for (const sec of sections) {
      if (sec.instructor) {
        const matchId = teacherMap.get(sec.instructor.trim().toLowerCase());
        if (matchId && sec.teacherId !== matchId) {
          await sequelize.query(
            `UPDATE sections SET teacherId = ? WHERE id = ?`,
            { replacements: [matchId, sec.id] }
          );
        }
      }
    }
    console.log(`Sections verified and linked to teacher IDs.`);

    // 2. Fetch all subjects
    const [subjects] = await sequelize.query(
      `SELECT id, code, description, units, programCode, gradeLevel, strand, semester FROM subjects WHERE isActive = 1`
    );
    console.log(`Curriculum subjects found: ${subjects.length}`);

    // 3. Find enrollments in sections
    const [enrollments] = await sequelize.query(
      `SELECT id, sectionId, gradeLevel, educationLevel, strand FROM enrollment_records WHERE sectionId IS NOT NULL AND status IN ('enrolled', 'active', 'completed')`
    );
    console.log(`Enrolled students in sections: ${enrollments.length}`);

    const [updatedSections] = await sequelize.query(
      `SELECT id, code, course, yearLevel, strand, instructor, teacherId, schedule, room FROM sections`
    );

    let totalInserted = 0;
    for (const sec of updatedSections) {
      const secEnrollments = enrollments.filter(e => e.sectionId === sec.id);
      if (secEnrollments.length === 0) continue;

      const secSubjects = subjects.filter(sub => {
        if (sub.programCode !== sec.course) return false;
        if (Number(sub.gradeLevel) !== Number(sec.yearLevel)) return false;
        if (sec.course === 'SHS' && sec.strand) {
          if (sub.strand && sub.strand !== sec.strand) return false;
        }
        return true;
      });

      if (secSubjects.length === 0) continue;

      const [existingCount] = await sequelize.query(
        `SELECT COUNT(*) as cnt FROM enrollment_subjects WHERE sectionId = ?`,
        { replacements: [sec.id] }
      );

      if (existingCount[0].cnt === 0) {
        // Batch insert for performance
        const rows = [];
        for (const e of secEnrollments) {
          for (const sub of secSubjects) {
            rows.push({
              enrollmentId: e.id,
              subjectId: sub.id,
              subjectCode: sub.code,
              subjectDescription: sub.description,
              units: sub.units || 3,
              sectionId: sec.id,
              sectionName: sec.code,
              schedule: sec.schedule || null,
              instructor: sec.instructor || null,
              teacherId: sec.teacherId || null,
              room: sec.room || null,
              status: 'enrolled',
              assignedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        if (rows.length > 0) {
          await EnrollmentSubject.bulkCreate(rows);
          totalInserted += rows.length;
        }
      } else if (sec.teacherId) {
        // Ensure teacherId and instructor are synced on existing enrollment_subjects
        await sequelize.query(
          `UPDATE enrollment_subjects
           SET teacherId = COALESCE(teacherId, ?),
               instructor = COALESCE(instructor, ?)
           WHERE sectionId = ?`,
          { replacements: [sec.teacherId, sec.instructor, sec.id] }
        );
      }
    }

    const [finalCount] = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM enrollment_subjects`
    );
    console.log(`✅ Sync complete! Total enrollment_subjects: ${finalCount[0].cnt} (Inserted: ${totalInserted})`);
  } catch (error) {
    console.error('Sync failed:', error);
  } finally {
    process.exit(0);
  }
}

syncTeachersAndSubjects();
