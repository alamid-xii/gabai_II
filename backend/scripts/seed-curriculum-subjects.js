import { sequelize, Subject, Section, EnrollmentRecord, EnrollmentSubject } from '../models/index.js';

const CURRICULUM_SUBJECTS = [
  // ─── Junior High School (Grades 7 to 10) ──────────────────────────────────
  ...[7, 8, 9, 10].flatMap(grade => [
    { code: `FIL${grade}`, description: `Filipino ${grade}`, units: 3, programCode: 'JHS', gradeLevel: grade, semester: '1st', isActive: true },
    { code: `ENG${grade}`, description: `English ${grade}`, units: 3, programCode: 'JHS', gradeLevel: grade, semester: '1st', isActive: true },
    { code: `MATH${grade}`, description: `Mathematics ${grade}`, units: 3, programCode: 'JHS', gradeLevel: grade, semester: '1st', isActive: true },
    { code: `SCI${grade}`, description: `Science ${grade}`, units: 3, programCode: 'JHS', gradeLevel: grade, semester: '1st', isActive: true },
    { code: `AP${grade}`, description: `Araling Panlipunan ${grade}`, units: 3, programCode: 'JHS', gradeLevel: grade, semester: '1st', isActive: true },
    { code: `ESP${grade}`, description: `Edukasyon sa Pagpapakatao ${grade}`, units: 3, programCode: 'JHS', gradeLevel: grade, semester: '1st', isActive: true },
    { code: `TLE${grade}`, description: `Technology & Livelihood Education ${grade}`, units: 3, programCode: 'JHS', gradeLevel: grade, semester: '1st', isActive: true },
    { code: `MAPEH${grade}`, description: `MAPEH ${grade}`, units: 3, programCode: 'JHS', gradeLevel: grade, semester: '1st', isActive: true },
  ]),

  // SSC Specific Subjects (Grade 7)
  { code: 'ADVSCI7', description: 'Advanced Environmental Science', units: 3, programCode: 'JHS', gradeLevel: 7, strand: 'SSC', semester: '1st', isActive: true },
  { code: 'ADVMATH7', description: 'Advanced Algebra & Geometry', units: 3, programCode: 'JHS', gradeLevel: 7, strand: 'SSC', semester: '1st', isActive: true },
  { code: 'RES7', description: 'Scientific Research I', units: 3, programCode: 'JHS', gradeLevel: 7, strand: 'SSC', semester: '1st', isActive: true },

  // ─── Senior High School Grade 11 ──────────────────────────────────────────
  { code: 'ORALCOM', description: 'Oral Communication in Context', units: 3, programCode: 'SHS', gradeLevel: 11, semester: '1st', isActive: true },
  { code: 'KOMPAN', description: 'Komunikasyon at Pananaliksik', units: 3, programCode: 'SHS', gradeLevel: 11, semester: '1st', isActive: true },
  { code: 'GENMATH', description: 'General Mathematics', units: 3, programCode: 'SHS', gradeLevel: 11, semester: '1st', isActive: true },
  { code: 'EARTHLIFE', description: 'Earth and Life Science', units: 3, programCode: 'SHS', gradeLevel: 11, semester: '1st', isActive: true },
  { code: 'PERDEV', description: 'Personal Development', units: 3, programCode: 'SHS', gradeLevel: 11, semester: '1st', isActive: true },
  { code: 'PEH1', description: 'Physical Education and Health 1', units: 2, programCode: 'SHS', gradeLevel: 11, semester: '1st', isActive: true },
  // SHS 11 STEM
  { code: 'PRECALC', description: 'Pre-Calculus', units: 3, programCode: 'SHS', gradeLevel: 11, strand: 'STEM', semester: '1st', isActive: true },
  { code: 'BASCALC', description: 'Basic Calculus', units: 3, programCode: 'SHS', gradeLevel: 11, strand: 'STEM', semester: '1st', isActive: true },
  // SHS 11 ABM
  { code: 'ORGMAN', description: 'Organization and Management', units: 3, programCode: 'SHS', gradeLevel: 11, strand: 'ABM', semester: '1st', isActive: true },
  { code: 'BUSMATH', description: 'Business Mathematics', units: 3, programCode: 'SHS', gradeLevel: 11, strand: 'ABM', semester: '1st', isActive: true },
  // SHS 11 HUMSS
  { code: 'PPG', description: 'Philippine Politics and Governance', units: 3, programCode: 'SHS', gradeLevel: 11, strand: 'HUMSS', semester: '1st', isActive: true },
  { code: 'CRWRIT', description: 'Creative Writing', units: 3, programCode: 'SHS', gradeLevel: 11, strand: 'HUMSS', semester: '1st', isActive: true },

  // ─── Senior High School Grade 12 ──────────────────────────────────────────
  { code: 'CPAR', description: 'Contemporary Philippine Arts from the Regions', units: 3, programCode: 'SHS', gradeLevel: 12, semester: '1st', isActive: true },
  { code: 'MIL', description: 'Media and Information Literacy', units: 3, programCode: 'SHS', gradeLevel: 12, semester: '1st', isActive: true },
  { code: 'UCSP', description: 'Understanding Culture, Society and Politics', units: 3, programCode: 'SHS', gradeLevel: 12, semester: '1st', isActive: true },
  { code: 'PEH3', description: 'Physical Education and Health 3', units: 2, programCode: 'SHS', gradeLevel: 12, semester: '1st', isActive: true },
  { code: 'RES2', description: 'Practical Research 2', units: 3, programCode: 'SHS', gradeLevel: 12, semester: '1st', isActive: true },
  // SHS 12 STEM
  { code: 'GENPHYS', description: 'General Physics 1', units: 3, programCode: 'SHS', gradeLevel: 12, strand: 'STEM', semester: '1st', isActive: true },
  { code: 'GENCHEM', description: 'General Chemistry 1', units: 3, programCode: 'SHS', gradeLevel: 12, strand: 'STEM', semester: '1st', isActive: true },
  { code: 'GENBIO', description: 'General Biology 1', units: 3, programCode: 'SHS', gradeLevel: 12, strand: 'STEM', semester: '1st', isActive: true },
  // SHS 12 ABM
  { code: 'FABM', description: 'Fundamentals of Accountancy & Management', units: 3, programCode: 'SHS', gradeLevel: 12, strand: 'ABM', semester: '1st', isActive: true },
  { code: 'BUSFIN', description: 'Business Finance', units: 3, programCode: 'SHS', gradeLevel: 12, strand: 'ABM', semester: '1st', isActive: true },
  // SHS 12 HUMSS
  { code: 'CESC', description: 'Community Engagement, Solidarity and Citizenship', units: 3, programCode: 'SHS', gradeLevel: 12, strand: 'HUMSS', semester: '1st', isActive: true },
  { code: 'DISS', description: 'Disciplines and Ideas in the Social Sciences', units: 3, programCode: 'SHS', gradeLevel: 12, strand: 'HUMSS', semester: '1st', isActive: true },
];

async function seedCurriculum() {
  try {
    await sequelize.authenticate();
    console.log('Seeding curriculum subjects...');

    let createdCount = 0;
    for (const sub of CURRICULUM_SUBJECTS) {
      const [record, created] = await Subject.findOrCreate({
        where: { code: sub.code },
        defaults: sub
      });
      if (created) createdCount++;
      else await record.update(sub);
    }
    console.log(`✅ Seeded/verified ${CURRICULUM_SUBJECTS.length} curriculum subjects (New: ${createdCount}).`);

    // Now call sync-teachers-subjects logic to auto-populate enrollment_subjects
    const [sections] = await sequelize.query(`SELECT id, code, course, yearLevel, strand, instructor, teacherId, schedule, room FROM sections WHERE isActive = 1`);
    const [enrollments] = await sequelize.query(`SELECT id, sectionId, gradeLevel, educationLevel, strand FROM enrollment_records WHERE sectionId IS NOT NULL AND status IN ('enrolled', 'active', 'completed')`);
    const [allSubjects] = await sequelize.query(`SELECT * FROM subjects WHERE isActive = 1`);

    let enrolledSubCount = 0;
    for (const sec of sections) {
      const secEnrollments = enrollments.filter(e => e.sectionId === sec.id);
      if (secEnrollments.length === 0) continue;

      const secSubs = allSubjects.filter(sub => {
        if (sub.programCode !== sec.course) return false;
        if (Number(sub.gradeLevel) !== Number(sec.yearLevel)) return false;
        if (sec.course === 'SHS' && sec.strand) {
          if (sub.strand && sub.strand !== sec.strand) return false;
        }
        return true;
      });

      if (secSubs.length === 0) continue;

      const [existingCount] = await sequelize.query(
        `SELECT COUNT(*) as cnt FROM enrollment_subjects WHERE sectionId = ?`,
        { replacements: [sec.id] }
      );

      if (existingCount[0].cnt === 0) {
        const rows = [];
        for (const e of secEnrollments) {
          for (const sub of secSubs) {
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
          enrolledSubCount += rows.length;
        }
      }
    }
    console.log(`✅ Auto-enrolled students into ${enrolledSubCount} subject records across all sections!`);
  } catch (error) {
    console.error('Curriculum seeding failed:', error);
  } finally {
    process.exit(0);
  }
}

seedCurriculum();
