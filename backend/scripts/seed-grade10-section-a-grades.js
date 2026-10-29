import { sequelize } from '../models/db.js';

async function seedGrade10SectionAGrades() {
  console.log('--- Seeding Grades for Grade 10 Section A (JHS10-A, Section ID 19) ---');

  // 1. Ensure grading periods Q1-Q4 exist and are open
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  for (const q of quarters) {
    await sequelize.query(
      `INSERT INTO grading_periods (quarter, schoolYear, isOpen, openedAt, createdAt, updatedAt)
       VALUES (?, '2026-2027', 1, NOW(), NOW(), NOW())
       ON DUPLICATE KEY UPDATE isOpen = 1, updatedAt = NOW()`,
      { replacements: [q] }
    );
  }

  // 2. Fetch all students in Section 19 (JHS10-A)
  const [students] = await sequelize.query(
    `SELECT id, userId, firstName, familyName, studentNumber, status, lifeStatus
     FROM enrollment_records
     WHERE sectionId = 19
     ORDER BY id ASC`
  );

  console.log(`Found ${students.length} students in Section JHS10-A.`);

  // Two students with failing grades:
  // 1. Mike Morada Santos (id: 1201, userId: 1228) - currently logged in user
  // 2. Camille Panganiban (id: 721, userId: 745)
  const failEnrollmentIds = [1201, 721];

  let passedCount = 0;
  let failedCount = 0;

  for (const st of students) {
    const isFailing = failEnrollmentIds.includes(st.id);

    // Fetch student's subjects for this section
    const [subjects] = await sequelize.query(
      `SELECT id, subjectCode, subjectDescription FROM enrollment_subjects WHERE enrollmentId = ?`,
      { replacements: [st.id] }
    );

    if (isFailing) {
      failedCount++;
      console.log(`[FAILING] Student ${st.firstName} ${st.familyName} (ID: ${st.id}, Student#: ${st.studentNumber}) - setting failing grades < 75`);

      // Put failing grades (< 75) on all subjects
      for (const sub of subjects) {
        // e.g. 68-71
        let q1 = 68, q2 = 70, q3 = 71, q4 = 70;
        if (sub.subjectCode === 'MATH10') { q1 = 65; q2 = 68; q3 = 67; q4 = 68; }
        if (sub.subjectCode === 'SCI10')  { q1 = 66; q2 = 69; q3 = 68; q4 = 67; }
        if (sub.subjectCode === 'FIL10')  { q1 = 70; q2 = 71; q3 = 69; q4 = 70; }
        if (sub.subjectCode === 'ENG10')  { q1 = 69; q2 = 70; q3 = 71; q4 = 70; }

        const finalGrade = Math.round(((q1 + q2 + q3 + q4) / 4) * 100) / 100;
        const remarks = 'Failed';
        const roundedGrade = String(Math.round(finalGrade));

        await sequelize.query(
          `UPDATE enrollment_subjects
           SET q1 = ?, q2 = ?, q3 = ?, q4 = ?,
               finalGrade = ?, remarks = ?, grade = ?,
               status = 'completed', updatedAt = NOW()
           WHERE id = ?`,
          { replacements: [q1, q2, q3, q4, finalGrade, remarks, roundedGrade, sub.id] }
        );
      }

      // Mark enrollment as completed, lifeStatus = retained
      await sequelize.query(
        `UPDATE enrollment_records
         SET status = 'completed',
             lifeStatus = 'retained',
             lifeStatusReason = 'Retained due to failing grades in Grade 10 curriculum subjects (GWA < 75). Must repeat Grade 10.',
             lifeStatusDate = CURDATE(),
             updatedAt = NOW()
         WHERE id = ?`,
        { replacements: [st.id] }
      );
    } else {
      passedCount++;
      // Put passing grades (86-94) on all subjects
      for (const sub of subjects) {
        let q1 = 88, q2 = 89, q3 = 88, q4 = 90;
        if (sub.subjectCode === 'MATH10') { q1 = 86; q2 = 88; q3 = 87; q4 = 89; }
        if (sub.subjectCode === 'SCI10')  { q1 = 87; q2 = 89; q3 = 90; q4 = 91; }
        if (sub.subjectCode === 'FIL10')  { q1 = 89; q2 = 90; q3 = 88; q4 = 91; }
        if (sub.subjectCode === 'ENG10')  { q1 = 90; q2 = 91; q3 = 89; q4 = 92; }
        if (sub.subjectCode === 'AP10')   { q1 = 91; q2 = 92; q3 = 90; q4 = 93; }
        if (sub.subjectCode === 'ESP10')  { q1 = 92; q2 = 93; q3 = 91; q4 = 94; }

        const finalGrade = Math.round(((q1 + q2 + q3 + q4) / 4) * 100) / 100;
        const remarks = 'Passed';
        const roundedGrade = String(Math.round(finalGrade));

        await sequelize.query(
          `UPDATE enrollment_subjects
           SET q1 = ?, q2 = ?, q3 = ?, q4 = ?,
               finalGrade = ?, remarks = ?, grade = ?,
               status = 'completed', updatedAt = NOW()
           WHERE id = ?`,
          { replacements: [q1, q2, q3, q4, finalGrade, remarks, roundedGrade, sub.id] }
        );
      }

      // Mark enrollment as completed, lifeStatus = completed (promoted)
      await sequelize.query(
        `UPDATE enrollment_records
         SET status = 'completed',
             lifeStatus = 'completed',
             lifeStatusReason = 'Completed Grade 10 with passing general average. Eligible for promotion to Senior High School (Grade 11).',
             lifeStatusDate = CURDATE(),
             updatedAt = NOW()
         WHERE id = ?`,
        { replacements: [st.id] }
      );
    }
  }

  console.log(`\nSuccessfully seeded grades for Section JHS10-A:`);
  console.log(`- ${passedCount} students PASSED with high honors / promotion to Grade 11.`);
  console.log(`- ${failedCount} students FAILED with failing grades and marked RETAINED in Grade 10:`);
  console.log(`  1. Mike Morada Santos (ID: 1201, User: 1228, Email: nikorikooo12345@gmail.com)`);
  console.log(`  2. Camille Panganiban (ID: 721, User: 745, Email: camille.panganiban.0722@emcseed.test)`);

  process.exit(0);
}

seedGrade10SectionAGrades().catch(err => {
  console.error('Error seeding grades:', err);
  process.exit(1);
});
