import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { sequelize } from './models/db.js';
import { User } from './models/userModel.js';
import { EnrollmentRecord } from './models/enrollmentRecordModel.js';
import { Section } from './models/sectionModel.js';

const academicYear = process.env.SEED_SCHOOL_YEAR || '2026-2027';
const defaultPassword = process.env.SEED_PASSWORD || 'Password123!';
const passwordHash = await bcrypt.hash(defaultPassword, 10);

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
  'Navarro', 'Nicolas', 'Ortega', 'Padilla', 'Palma', 'Panganiban', 'Perez', 'Reyes', 'Riviera', 'Rosales',
  'Santos', 'Serrano', 'Sison', 'Suarez', 'Tolentino', 'Umali', 'Valdez', 'Velasco', 'Villanueva', 'Yap'
];

const middleNames = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V', 'Y'
];

const barangays = [
  'Brgy. San Isidro, Calapan City, Oriental Mindoro',
  'Brgy. Sta. Maria, Puerto Galera, Oriental Mindoro',
  'Brgy. Baco, Baco, Oriental Mindoro',
  'Brgy. Alangan, Naujan, Oriental Mindoro',
  'Brgy. Poblacion, Roxas, Oriental Mindoro',
  'Brgy. San Vicente, Gloria, Oriental Mindoro',
  'Brgy. Masaguisi, Pinamalayan, Oriental Mindoro',
  'Brgy. Bagong Bayan, Socorro, Oriental Mindoro',
  'Brgy. Caguisan, Victoria, Oriental Mindoro',
  'Brgy. Lantuyang, Bongabong, Oriental Mindoro'
];

const schools = [
  'EMC Integrated School',
  'Calapan Central School',
  'San Isidro Elementary School',
  'Bongabong National High School',
  'Pinamalayan Academy',
  'Roxas Community High School',
  'Puerto Galera National High School',
  'Naujan Elementary School',
  'Mindoro State University Laboratory School',
  'Magsaysay Elementary School'
];

const occupations = [
  'Teacher', 'Farmer', 'Engineer', 'OFW', 'Driver', 'Nurse', 'Business Owner', 'Vendor', 'Government Employee', 'Housewife', 'Househusband', 'Fisherman'
];

const strandNames = ['STEM', 'ABM', 'HUMSS'];
const roomAssignments = ['JHS-101', 'JHS-102', 'JHS-103', 'JHS-104', 'JHS-105', 'JHS-106', 'SHS-201', 'SHS-202', 'SHS-203', 'SHS-204', 'SHS-205', 'SHS-206'];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function sanitizeEmailName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
}

function ensureRange(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatPhone() {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  return `09${digits.join('')}`;
}

function birthDateForGrade(gradeLevel, offset = 0) {
  const baseYear = Number(academicYear.split('-')[0]);
  const ageMap = { 7: 12, 8: 13, 9: 14, 10: 15, 11: 16, 12: 17 };
  const age = ageMap[gradeLevel] ?? 15;
  const year = baseYear - age + offset;
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 27);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function generateStudent(seedIndex, gradeLevel, sectionKind, strand = null) {
  const sex = seedIndex % 2 === 0 ? 'Male' : 'Female';
  const firstName = pick(firstNames[sex]);
  const familyName = pick(familyNames);
  const middleName = pick(middleNames);

  const student = {
    familyName,
    firstName,
    middleName,
    sex,
    dateOfBirth: birthDateForGrade(gradeLevel, Math.floor(seedIndex / 40) % 2),
    placeOfBirth: pick(['Calapan City', 'Puerto Galera', 'Naujan', 'Bongabong', 'Pinamalayan', 'Victoria', 'Roxas', 'Socorro']),
    email: `${sanitizeEmailName(firstName)}.${sanitizeEmailName(familyName)}.${String(seedIndex + 1).padStart(4, '0')}@emcseed.test`,
    mobileNumber: formatPhone(),
    parentsAddress: pick(barangays),
    guardianTelephone: formatPhone(),
    guardianName: `${pick(firstNames[sex])} ${familyName}`,
    guardianOccupation: pick(occupations),
    guardianAddress: pick(barangays),
    fatherName: `${pick(firstNames.Male)} ${familyName}`,
    fatherOccupation: pick(occupations),
    fatherAddress: pick(barangays),
    motherName: `${pick(firstNames.Female)} ${familyName}`,
    motherOccupation: pick(occupations),
    motherAddress: pick(barangays),
    gradeLevel: `Grade ${gradeLevel}`,
    educationLevel: sectionKind === 'SHS' ? 'SHS' : 'JHS',
    enrollmentType: 'new',
    studentType: 'New',
    semester: '1st',
    academicYear,
    dateEnrolled: `${Number(academicYear.split('-')[0])}-06-15`,
    strand: strand || null,
    sectionKind,
    lrn: `${String(100000000000 + seedIndex + 1).slice(-12)}`,
    schoolName: pick(schools),
    grade6School: pick(schools),
    grade6SchoolAddress: pick(barangays),
    grade6Average: String((80 + ((seedIndex * 7) % 18)).toFixed(1)),
    guardianNameDisplay: `${pick(firstNames[sex])} ${familyName}`,
    studentNumber: `${Number(academicYear.split('-')[0])}-${String(seedIndex + 1).padStart(5, '0')}`,
  };

  return student;
}

const sectionTemplates = [];

for (let gradeLevel = 7; gradeLevel <= 10; gradeLevel += 1) {
  for (let sectionNumber = 1; sectionNumber <= 5; sectionNumber += 1) {
    sectionTemplates.push({
      course: 'JHS',
      yearLevel: gradeLevel,
      strand: null,
      sectionCode: `JHS${gradeLevel}-${String.fromCharCode(64 + sectionNumber)}`,
      type: 'regular',
      capacity: 40,
      instructor: `${pick(['Ms.', 'Mrs.', 'Mr.'])} ${pick(['Mendoza', 'Cruz', 'Velasco', 'Bautista', 'Santos', 'De Leon'])}`,
      room: pick(roomAssignments),
      schedule: pick(['MWF 8:00-9:00 AM', 'TTh 9:00-10:30 AM', 'MWF 10:30-12:00 PM', 'TTh 1:00-2:30 PM'])
    });
  }

  sectionTemplates.push({
    course: 'JHS',
    yearLevel: gradeLevel,
    strand: 'SSC',
    sectionCode: `JHS${gradeLevel}-SSC`,
    type: 'ssc',
    capacity: 40,
    instructor: `${pick(['Ms.', 'Mrs.', 'Mr.'])} ${pick(['Aguinaldo', 'Reyes', 'Ledesma', 'Nicolas', 'Tolentino'])}`,
    room: pick(roomAssignments),
    schedule: pick(['MWF 7:30-8:30 AM', 'TTh 8:00-9:00 AM', 'MWF 1:00-2:30 PM'])
  });
}

for (const strand of strandNames) {
  for (const gradeLevel of [11, 12]) {
    sectionTemplates.push({
      course: 'SHS',
      yearLevel: gradeLevel,
      strand,
      sectionCode: `SHS${gradeLevel}-${strand}`,
      type: 'shs',
      capacity: 40,
      instructor: `${pick(['Ms.', 'Mrs.', 'Mr.'])} ${pick(['Mendoza', 'Sison', 'Garcia', 'Lacson', 'Dela Cruz'])}`,
      room: pick(roomAssignments),
      schedule: pick(['MWF 8:00-9:30 AM', 'TTh 9:30-11:00 AM', 'MWF 1:00-2:30 PM'])
    });
  }
}

let studentSeedNumber = 1;
const enrollmentPlan = [];

for (const section of sectionTemplates) {
  const sectionType = section.course === 'SHS' ? 'SHS' : (section.strand === 'SSC' ? 'JHS-SSC' : 'JHS');
  for (let index = 1; index <= section.capacity; index += 1) {
    const student = generateStudent(studentSeedNumber, section.yearLevel, sectionType, section.strand || null);
    enrollmentPlan.push({
      ...student,
      sectionCode: section.sectionCode,
      sectionId: null,
      sectionType,
      sectionCourse: section.course,
    });
    studentSeedNumber += 1;
  }
}

try {
  await sequelize.authenticate();
  await sequelize.sync();

  // ── 1. Create User accounts for all unique advisers/teachers ─────────────────
  const uniqueInstructors = [...new Set(sectionTemplates.map((s) => s.instructor.trim()))];
  const teacherMap = new Map();

  for (const instructorName of uniqueInstructors) {
    const emailPrefix = sanitizeEmailName(instructorName);
    const email = `${emailPrefix}@emc.edu.ph`;
    const [teacherUser] = await User.findOrCreate({
      where: { name: instructorName },
      defaults: {
        name: instructorName,
        email,
        password: passwordHash,
        role: 'teacher',
        department: 'High School Faculty',
        isActive: true,
        isVerified: true,
        authProvider: 'password',
      },
    });
    teacherMap.set(instructorName, teacherUser);
  }

  const createdSections = [];
  for (const section of sectionTemplates) {
    const teacherUser = teacherMap.get(section.instructor.trim());
    const teacherId = teacherUser ? teacherUser.id : null;

    const [record, created] = await Section.findOrCreate({
      where: {
        code: section.sectionCode,
        course: section.course,
        yearLevel: section.yearLevel,
        strand: section.strand || null,
        schoolYear: academicYear,
      },
      defaults: {
        code: section.sectionCode,
        course: section.course,
        yearLevel: section.yearLevel,
        strand: section.strand || null,
        semester: '1st',
        schoolYear: academicYear,
        instructor: section.instructor,
        teacherId,
        schedule: section.schedule,
        room: section.room,
        capacity: section.capacity,
        currentEnrollment: 0,
        isActive: true,
      },
    });

    await record.update({
      code: section.sectionCode,
      course: section.course,
      yearLevel: section.yearLevel,
      strand: section.strand || null,
      semester: '1st',
      schoolYear: academicYear,
      instructor: section.instructor,
      teacherId,
      schedule: section.schedule,
      room: section.room,
      capacity: section.capacity,
      currentEnrollment: 0,
      isActive: true,
    });

    createdSections.push(record);
  }

  const sectionMap = new Map(createdSections.map((section) => [section.code, section]));
  let createdUsers = 0;
  let createdEnrollments = 0;

  for (const student of enrollmentPlan) {
    const [user, userCreated] = await User.findOrCreate({
      where: { email: student.email },
      defaults: {
        name: `${student.firstName} ${student.familyName}`,
        email: student.email,
        password: passwordHash,
        authProvider: 'password',
        role: 'student',
        isActive: true,
        isVerified: true,
        department: null,
      },
    });

    if (userCreated) {
      createdUsers += 1;
    } else {
      await user.update({
        name: `${student.firstName} ${student.familyName}`,
        password: passwordHash,
        authProvider: 'password',
        role: 'student',
        isActive: true,
        isVerified: true,
      });
    }

    const section = sectionMap.get(student.sectionCode);
    if (!section) {
      throw new Error(`Section not found: ${student.sectionCode}`);
    }

    const existingEnrollment = await EnrollmentRecord.findOne({
      where: {
        [Op.or]: [
          { userId: user.id },
          { studentNumber: student.studentNumber },
          { lrn: student.lrn },
        ],
      },
    });

    const enrollmentData = {
      userId: user.id,
      admissionId: null,
      educationLevel: student.educationLevel,
      gradeLevel: student.gradeLevel,
      strand: student.strand,
      lrn: student.lrn,
      parentsAddress: student.parentsAddress,
      guardianTelephone: student.guardianTelephone,
      grade6School: student.grade6School,
      grade6SchoolAddress: student.grade6SchoolAddress,
      grade6Section: 'A',
      grade6SYStart: String(Number(academicYear.split('-')[0]) - 1),
      grade6SYEnd: String(Number(academicYear.split('-')[0])),
      grade6Average: student.grade6Average,
      grade6Remarks: 'Promoted',
      lastHSSchool: student.schoolName,
      lastHSCurriculumYear: `Grade ${section.yearLevel - 1}`,
      lastHSSection: section.sectionCode,
      lastHSSYStart: String(Number(academicYear.split('-')[0]) - 1),
      lastHSSYEnd: String(Number(academicYear.split('-')[0])),
      enrollmentType: student.enrollmentType,
      studentType: student.studentType,
      studentNumber: student.studentNumber,
      semester: student.semester,
      academicYear: student.academicYear,
      dateEnrolled: student.dateEnrolled,
      familyName: student.familyName,
      firstName: student.firstName,
      middleName: student.middleName,
      sex: student.sex,
      dateOfBirth: student.dateOfBirth,
      placeOfBirth: student.placeOfBirth,
      email: student.email,
      mobileNumber: student.mobileNumber,
      fatherName: student.fatherName,
      fatherOccupation: student.fatherOccupation,
      fatherAddress: student.fatherAddress,
      motherName: student.motherName,
      motherOccupation: student.motherOccupation,
      motherAddress: student.motherAddress,
      guardianName: student.guardianName,
      guardianOccupation: student.guardianOccupation,
      guardianAddress: student.guardianAddress,
      educationalBackground: {
        previousSchool: student.schoolName,
        previousGrade: `Grade ${section.yearLevel - 1}`,
      },
      subjects: [],
      studentSignature: `${student.firstName} ${student.familyName}`,
      referredBy: 'Seeded enrollment',
      sscApplied: section.strand === 'SSC',
      sscQualified: section.strand === 'SSC',
      sscExamDate: null,
      sscExamScore: null,
      sscPassingScore: 75.0,
      sscResult: section.strand === 'SSC' ? 'passed' : null,
      sscClass: section.strand === 'SSC' ? 'SSC' : 'Regular',
      sscChoiceMade: section.strand === 'SSC',
      status: 'enrolled',
      sectionId: section.id,
      sectionName: section.code,
      completion_percentage: 100,
      lifeStatus: 'enrolled',
      lifeStatusReason: 'Seeded active student',
      lifeStatusDate: student.dateEnrolled,
      lifeStatusUpdatedBy: null,
      destinationSchool: null,
    };

    if (existingEnrollment) {
      await existingEnrollment.update(enrollmentData);
    } else {
      await EnrollmentRecord.create(enrollmentData);
      createdEnrollments += 1;
    }

    await section.update({
      currentEnrollment: await EnrollmentRecord.count({ where: { sectionId: section.id } }),
    });
  }

  const sectionCounts = new Map();
  for (const section of createdSections) {
    const count = await EnrollmentRecord.count({ where: { sectionId: section.id } });
    sectionCounts.set(section.code, count);
    await section.update({ currentEnrollment: count });
  }

  const totalSeeded = enrollmentPlan.length;
  console.log('✅ Student seeding complete');
  console.log(`Generated or updated ${totalSeeded} student records`);
  console.log(`Sections: ${createdSections.length}`);
  console.log(`Student accounts linked: ${createdUsers + createdEnrollments}`);
  console.log(`Total section enrollment: ${Array.from(sectionCounts.values()).reduce((sum, count) => sum + count, 0)}`);
} catch (error) {
  console.error('Student seeding failed:', error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
