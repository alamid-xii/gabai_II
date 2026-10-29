import bcrypt from 'bcrypt';
import { sequelize, User, SchoolYear } from '../models/index.js';

const DEFAULT_PASSWORD = 'password';

const accounts = [
  {
    name: 'Demo Student',
    email: 'student@gmail.com',
    role: 'student',
    department: null,
  },
  {
    name: 'Demo Teacher',
    email: 'teacher@gmail.com',
    role: 'teacher',
    department: 'Academic Affairs',
  },
  {
    name: 'Demo Registrar',
    email: 'registrar@gmail.com',
    role: 'registrar',
    department: 'Records Office',
  },
  {
    name: 'Demo Admin',
    email: 'admin@gmail.com',
    role: 'admin',
    department: null,
  },
];

async function refreshDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // 1. Disable FK checks for clean truncation
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    // 2. Clear transactional/mock data
    const tablesToClear = [
      'enrollment_subjects',
      'enrollment_documents',
      'enrollment_records',
      'admissions',
      'class_schedules',
      'chatlogs',
      'pending_registrations',
      'grading_periods',
      'users',
    ];

    for (const table of tablesToClear) {
      await sequelize.query(`TRUNCATE TABLE \`${table}\`;`);
      console.log(`Cleaned table: ${table}`);
    }

    // 3. Re-enable FK checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

    // 4. Seed the 4 main accounts
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const createdUsers = [];

    for (const acc of accounts) {
      const user = await User.create({
        ...acc,
        password: passwordHash,
        authProvider: 'password',
        isActive: true,
        isVerified: true,
      });
      createdUsers.push(user);
      console.log(`✅ Seeded ${acc.role} account: ${acc.email} (ID: ${user.id})`);
    }

    // 5. Reset sections currentEnrollment to 0 and link Demo Teacher to sections
    const teacherUser = createdUsers.find(u => u.role === 'teacher');
    await sequelize.query(
      `UPDATE sections SET currentEnrollment = 0, teacherId = NULL`
    );
    if (teacherUser) {
      // Assign Demo Teacher to JHS7-A and SHS11-STEM-A so teacher dashboard has active sections
      await sequelize.query(
        `UPDATE sections SET teacherId = ?, instructor = ? WHERE code IN ('JHS7-A', 'SHS11-STEM-A')`,
        { replacements: [teacherUser.id, teacherUser.name] }
      );
    }
    console.log('✅ Reset sections currentEnrollment to 0 and configured Demo Teacher sections.');

    // 6. Ensure active School Year 2026-2027 exists
    await sequelize.query('DELETE FROM school_years;');
    await SchoolYear.create({
      year: '2026-2027',
      isActive: true,
    });
    console.log('✅ Active school year 2026-2027 ensured.');

    // 7. Verify counts
    const [userRows] = await sequelize.query('SELECT id, name, email, role, isActive, isVerified FROM users');
    const [enrollmentCount] = await sequelize.query('SELECT COUNT(*) as count FROM enrollment_records');
    const [sectionsCount] = await sequelize.query('SELECT COUNT(*) as count FROM sections');
    const [subjectsCount] = await sequelize.query('SELECT COUNT(*) as count FROM subjects');
    const [syRows] = await sequelize.query('SELECT year, isActive FROM school_years');

    console.log('\n================ REFRESH SUMMARY ================');
    console.log(`Total Users: ${userRows.length}`);
    console.table(userRows);
    console.log(`Total Enrollment Records: ${enrollmentCount[0].count}`);
    console.log(`Total Curriculum Subjects Preserved: ${subjectsCount[0].count}`);
    console.log(`Total Sections Preserved: ${sectionsCount[0].count}`);
    console.log(`Active School Year: ${JSON.stringify(syRows[0])}`);
    console.log('=================================================\n');

  } catch (error) {
    console.error('Database refresh failed:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

refreshDatabase();
