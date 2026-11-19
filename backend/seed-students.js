import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { sequelize } from './models/db.js';
import { User } from './models/userModel.js';
import { EnrollmentRecord } from './models/enrollmentRecordModel.js';
import { Section } from './models/sectionModel.js';

const academicYear = process.env.SEED_SCHOOL_YEAR || '2026-2027';
const studentsPerSection = Number(process.env.SEED_STUDENTS_PER_SECTION || 45);
const defaultPassword = process.env.SEED_PASSWORD || 'EmcStudent@2026';

const firstNames = {
  Male: [
    'Aiden', 'Aldrin', 'Andrei', 'Arvin', 'Bryan', 'Caleb', 'Christian', 'Daniel', 'Daryl', 'Ethan',
    'Gabriel', 'Gian', 'Harold', 'Ian', 'Jared', 'Jericho', 'John', 'Joshua', 'Justin', 'Ken',
    'Kevin', 'Liam', 'Lorenzo', 'Marlon', 'Matthew', 'Nathan', 'Noel', 'Patrick', 'Rafael', 'Reyniel',
    'Rico', 'Rj', 'Ryan', 'Sam', 'Sean', 'Simon', 'Tyrone', 'Vincent', 'Warren', 'Yuri'
  ],
  Female: [
    'Ariana', 'Bea', 'Camille', 'Celine', 'Diana', 'Elaine', 'Elena', 'Frances', 'Grace', 'Iris',
    'Janelle', 'Jessa', 'Katrina', 'Kimberly', 'Leah', 'Liza', 'Mariel', 'Mary', 'Mia', 'Nadine',
    'Nicole', 'Paula', 'Princess', 'Rachel', 'Rhea', 'Rose', 'Sofia', 'Talia', 'Vanessa', 'Violet',
    'Wendy', 'Yvonne', 'Zia', 'Angel', 'Arielle', 'Mica', 'Julia', 'Claire', 'Mylene', 'Shaira'
  ]
};

const familyNames = [
  'Abad', 'Aguirre', 'Alcala', 'Alvarez', 'Aquino', 'Arenas', 'Bautista', 'Bermudez', 'Buenaventura', 'Calderon',
  'Castro', 'Cruz', 'Dela Cruz', 'Delos Santos', 'Dumagat', 'Espiritu', 'Fernandez', 'Flores', 'Garcia', 'Gonzales',
  'Hernandez', 'Lacson', 'Lagasca', 'Lanting', 'Ledesma', 'Lopez', 'Magno', 'Manuel', 'Mendoza', 'Montes',
  'Navarro', 'Nicolas', 'Ortega', 'Padilla', 'Palma', 'Panganiban', 'Perez', 'Reyes', 'Rivera', 'Rosales',
  'Santos', 'Serrano', 'Sison', 'Suarez', 'Tolentino', 'Umali', 'Valdez', 'Velasco', 'Villanueva', 'Yap'
];

const middleNames = [
  'Abalos', 'Bautista', 'Castillo', 'De Guzman', 'Estrada', 'Fabian', 'Galvez', 'Herrera', 'Ilagan', 'Jimenez',
  'Lim', 'Manalo', 'Navarro', 'Ocampo', 'Pascual', 'Quijano', 'Ramos', 'Salazar', 'Torres', 'Vargas'
];

const barangays = [
  'Brgy. Bagong Bayan I, Bongabong, Oriental Mindoro',
  'Brgy. Bagong Bayan II, Bongabong, Oriental Mindoro',
  'Brgy. Poblacion, Bongabong, Oriental Mindoro',
  'Brgy. Anilao, Bongabong, Oriental Mindoro',
  'Brgy. Labasan, Bongabong, Oriental Mindoro',
  'Brgy. Masaguisi, Bongabong, Oriental Mindoro',
  'Brgy. Morente, Bongabong, Oriental Mindoro',
  'Brgy. San Isidro, Bongabong, Oriental Mindoro',
  'Brgy. Dayhagan, Bongabong, Oriental Mindoro',
  'Brgy. Ipil, Bongabong, Oriental Mindoro'
];

const schools = [
  'Eastern Mindoro College, Inc.',
  'Bongabong Central School',
  'Anilao Elementary School',
  'Labasan Elementary School',
  'Masaguisi Elementary School',
  'San Isidro Elementary School',
  'Bongabong National High School',
  'Pinamalayan Central School',
  'Roxas Central School',
  'Gloria Central School'
];

const occupations = [
  'Teacher', 'Farmer', 'Engineer', 'OFW', 'Driver', 'Nurse', 'Business Owner', 'Vendor', 'Government Employee', 'Housewife', 'Fisherman', 'Technician'
];

const birthPlaces = [
  'Bongabong, Oriental Mindoro',
  'Pinamalayan, Oriental Mindoro',
  'Roxas, Oriental Mindoro',
  'Gloria, Oriental Mindoro',
  'Calapan City, Oriental Mindoro',
  'Bansud, Oriental Mindoro',
  'Mansalay, Oriental Mindoro',
  'Socorro, Oriental Mindoro'
];

function at(list, index) {
  return list[Math.abs(index) % list.length];
}

function sanitizeEmailPart(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
}

function deterministicPhone(seed) {
  const num = String(100000000 + ((seed * 7919 + 1234567) % 899999999)).slice(0, 9);
  return `09${num}`;
}

function birthDateForGrade(gradeLevel, seed) {
  const baseYear = Number(academicYear.split('-')[0]);
  const ageMap = { 7: 12, 8: 13, 9: 14, 10: 15, 11: 16, 12: 17 };
  const age = ageMap[gradeLevel] ?? 14;
  const year = baseYear - age - (seed % 2);
  const month = 1 + (seed % 12);
  const day = 1 + ((seed * 5) % 28);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function generateStudent(seedNumber, slotIndex, section) {
  const sex = slotIndex % 2 === 0 ? 'Male' : 'Female';
  const firstName = at(firstNames[sex], seedNumber * 3 + slotIndex);
  const familyName = at(familyNames, seedNumber * 7 + slotIndex * 2);
  const middleName = at(middleNames, seedNumber * 5 + slotIndex);
  const sectionSlug = section.code.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18);
  const startYear = Number(academicYear.split('-')[0]);
  const isSSC = section.strand === 'SSC';
  const isGrade7 = Number(section.yearLevel) === 7;
  const enrollmentType = isGrade7 ? 'new' : 'old';
  const studentType = isGrade7 ? 'New' : 'Old';
  const grade6Average = isSSC
    ? (86 + ((seedNumber * 3) % 11) + ((seedNumber % 9) * 0.1)).toFixed(1)
    : (80 + ((seedNumber * 7) % 15) + ((seedNumber % 9) * 0.1)).toFixed(1);
  const sscExamScore = isSSC ? Number((82 + (seedNumber % 16)).toFixed(1)) : null;

  const fatherFirst = at(firstNames.Male, seedNumber * 11 + 3);
  const motherFirst = at(firstNames.Female, seedNumber * 13 + 5);
  const guardianName = slotIndex % 2 === 0 ? `${fatherFirst} ${familyName}` : `${motherFirst} ${familyName}`;
  const address = at(barangays, seedNumber);
  const prevSchool = isGrade7 ? at(schools, seedNumber + 1) : 'Eastern Mindoro College, Inc.';

  return {
    firstName,
    middleName,
    familyName,
    fullName: `${firstName} ${familyName}`,
    sex,
    dateOfBirth: birthDateForGrade(Number(section.yearLevel), seedNumber),
    placeOfBirth: at(birthPlaces, seedNumber),
    email: `${sanitizeEmailPart(firstName)}.${sanitizeEmailPart(familyName)}.${sectionSlug}.${String(slotIndex).padStart(2, '0')}@emcseed.test`,
    mobileNumber: deterministicPhone(seedNumber * 2 + 1),
    parentsAddress: address,
    guardianTelephone: deterministicPhone(seedNumber * 2 + 2),
    guardianName,
    guardianOccupation: at(occupations, seedNumber + 2),
    guardianAddress: address,
    fatherName: `${fatherFirst} ${familyName}`,
    fatherOccupation: at(occupations, seedNumber),
    fatherAddress: address,
    motherName: `${motherFirst} ${familyName}`,
    motherOccupation: at(occupations, seedNumber + 4),
    motherAddress: address,
    educationLevel: section.course,
    gradeLevel: `Grade ${section.yearLevel}`,
    strand: section.course === 'SHS' ? (section.strand || null) : null,
    lrn: String(109202600000 + seedNumber).slice(-12),
    studentNumber: `${startYear}-${String(seedNumber).padStart(5, '0')}`,
    enrollmentType,
    studentType,
    semester: section.semester || '1st Trimester',
    academicYear: section.schoolYear,
    dateEnrolled: `${startYear}-06-15`,
    grade6School: at(schools, seedNumber + 1),
    grade6SchoolAddress: at(barangays, seedNumber + 3),
    grade6Section: at(['A', 'B', 'C', 'D'], seedNumber),
    grade6SYStart: String(startYear - (Number(section.yearLevel) - 6)),
    grade6SYEnd: String(startYear - (Number(section.yearLevel) - 7)),
    grade6Average,
    grade6Remarks: 'Promoted',
    lastHSSchool: prevSchool,
    lastHSCurriculumYear: isGrade7 ? 'Grade 6' : `Grade ${Number(section.yearLevel) - 1}`,
    lastHSSection: isGrade7 ? 'A' : section.code,
    lastHSSYStart: String(startYear - 1),
    lastHSSYEnd: String(startYear),
    sscApplied: isSSC,
    sscQualified: isSSC,
    sscExamDate: isSSC ? `${startYear}-05-15` : null,
    sscExamScore,
    sscPassingScore: 75.0,
    sscResult: isSSC ? 'passed' : null,
    sscClass: isSSC ? 'SSC' : 'Regular',
    sscChoiceMade: isSSC,
  };
}

try {
  await sequelize.authenticate();

  const sections = await Section.findAll({
    where: { isActive: true, schoolYear: academicYear },
    order: [['yearLevel', 'ASC'], ['id', 'ASC']],
  });

  if (sections.length === 0) {
    throw new Error(`No active sections found for school year ${academicYear}. Run "npm run seed:sections" first.`);
  }

  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  const now = new Date();

  let seedNumber = 1;
  let createdUsers = 0;
  let updatedUsers = 0;
  let createdEnrollments = 0;
  let updatedEnrollments = 0;

  for (const section of sections) {
    const planned = [];
    for (let slot = 1; slot <= studentsPerSection; slot += 1) {
      planned.push(generateStudent(seedNumber, slot, section));
      seedNumber += 1;
    }

    await sequelize.transaction(async (transaction) => {
      const emails = planned.map((s) => s.email);
      const existingUsers = await User.findAll({
        where: { email: { [Op.in]: emails } },
        transaction,
      });
      const userByEmail = new Map(existingUsers.map((u) => [u.email, u]));

      const usersToCreate = [];
      for (const s of planned) {
        if (!userByEmail.has(s.email)) {
          usersToCreate.push({
            name: s.fullName,
            firstName: s.firstName,
            middleName: s.middleName,
            lastName: s.familyName,
            mobileNumber: s.mobileNumber,
            profileCompleted: true,
            email: s.email,
            password: passwordHash,
            authProvider: 'password',
            role: 'student',
            department: null,
            isActive: true,
            isVerified: true,
          });
        }
      }

      if (usersToCreate.length > 0) {
        const inserted = await User.bulkCreate(usersToCreate, { transaction });
        for (const u of inserted) userByEmail.set(u.email, u);
        createdUsers += inserted.length;
      }

      for (const u of existingUsers) {
        const s = planned.find((item) => item.email === u.email);
        await u.update({
          name: s.fullName,
          firstName: s.firstName,
          middleName: s.middleName,
          lastName: s.familyName,
          mobileNumber: s.mobileNumber,
          profileCompleted: true,
          password: passwordHash,
          authProvider: 'password',
          role: 'student',
          isActive: true,
          isVerified: true,
        }, { transaction });
        updatedUsers += 1;
      }

      const userIds = planned.map((s) => userByEmail.get(s.email).id);
      const existingEnrollments = await EnrollmentRecord.findAll({
        where: { userId: { [Op.in]: userIds }, academicYear: section.schoolYear },
        transaction,
      });
      const enrollmentByUserId = new Map(existingEnrollments.map((er) => [er.userId, er]));

      const enrollmentsToCreate = [];
      for (const s of planned) {
        const user = userByEmail.get(s.email);
        const enrollmentData = {
          userId: user.id,
          admissionId: null,
          educationLevel: s.educationLevel,
          gradeLevel: s.gradeLevel,
          strand: s.strand,
          lrn: s.lrn,
          parentsAddress: s.parentsAddress,
          guardianTelephone: s.guardianTelephone,
          grade6School: s.grade6School,
          grade6SchoolAddress: s.grade6SchoolAddress,
          grade6Section: s.grade6Section,
          grade6SYStart: s.grade6SYStart,
          grade6SYEnd: s.grade6SYEnd,
          grade6Average: s.grade6Average,
          grade6Remarks: s.grade6Remarks,
          lastHSSchool: s.lastHSSchool,
          lastHSCurriculumYear: s.lastHSCurriculumYear,
          lastHSSection: s.lastHSSection,
          lastHSSYStart: s.lastHSSYStart,
          lastHSSYEnd: s.lastHSSYEnd,
          enrollmentType: s.enrollmentType,
          studentType: s.studentType,
          studentNumber: s.studentNumber,
          semester: s.semester,
          academicYear: s.academicYear,
          dateEnrolled: s.dateEnrolled,
          familyName: s.familyName,
          firstName: s.firstName,
          middleName: s.middleName,
          sex: s.sex,
          dateOfBirth: s.dateOfBirth,
          placeOfBirth: s.placeOfBirth,
          email: s.email,
          mobileNumber: s.mobileNumber,
          fatherName: s.fatherName,
          fatherOccupation: s.fatherOccupation,
          fatherAddress: s.fatherAddress,
          motherName: s.motherName,
          motherOccupation: s.motherOccupation,
          motherAddress: s.motherAddress,
          guardianName: s.guardianName,
          guardianOccupation: s.guardianOccupation,
          guardianAddress: s.guardianAddress,
          educationalBackground: {
            previousSchool: s.lastHSSchool,
            previousGrade: s.lastHSCurriculumYear,
          },
          subjects: [],
          studentSignature: s.fullName,
          parentGuardianSignature: s.guardianName,
          referredBy: 'Seeded enrollment',
          sscApplied: s.sscApplied,
          sscQualified: s.sscQualified,
          sscExamDate: s.sscExamDate,
          sscExamScore: s.sscExamScore,
          sscPassingScore: s.sscPassingScore,
          sscResult: s.sscResult,
          sscClass: s.sscClass,
          sscChoiceMade: s.sscChoiceMade,
          status: 'enrolled',
          approved_at: now,
          sectionId: section.id,
          sectionName: section.code,
          completion_percentage: 100,
          lifeStatus: 'enrolled',
          lifeStatusReason: 'Seeded active student',
          lifeStatusDate: s.dateEnrolled,
          lifeStatusUpdatedBy: null,
          destinationSchool: null,
        };

        const existing = enrollmentByUserId.get(user.id);
        if (existing) {
          await existing.update(enrollmentData, { transaction });
          updatedEnrollments += 1;
        } else {
          enrollmentsToCreate.push(enrollmentData);
        }
      }

      if (enrollmentsToCreate.length > 0) {
        await EnrollmentRecord.bulkCreate(enrollmentsToCreate, { transaction });
        createdEnrollments += enrollmentsToCreate.length;
      }

      const count = await EnrollmentRecord.count({
        where: { sectionId: section.id, academicYear: section.schoolYear, status: ['enrolled', 'active'] },
        transaction,
      });
      await section.update({ currentEnrollment: count }, { transaction });
      console.log(`Seeded ${section.code} (Grade ${section.yearLevel} ${section.strand || 'Regular'}): ${count}/${section.capacity} enrolled`);
    });
  }

  console.log(`\nDone! Seeded ${studentsPerSection} students across ${sections.length} sections (${sections.length * studentsPerSection} total).`);
  console.log(`Student users: ${createdUsers} created, ${updatedUsers} updated`);
  console.log(`Enrollment records: ${createdEnrollments} created, ${updatedEnrollments} updated`);
} catch (error) {
  console.error('Student seeding failed:', error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
