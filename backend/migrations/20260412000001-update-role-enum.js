export const up = async (queryInterface, Sequelize) => {
  try {
    await queryInterface.sequelize.query(`
      ALTER TABLE users
      ADD COLUMN role ENUM('student', 'registrar', 'admin', 'teacher') NOT NULL DEFAULT 'student'
    `);
    console.log('✅ Added role column to users table');
  } catch (e) {
    if (!e.message.includes('Duplicate column')) throw e;
  }

  try {
    await queryInterface.sequelize.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('student', 'registrar', 'admin', 'teacher') NOT NULL DEFAULT 'student'
    `);
    console.log('✅ Updated role column to include student, registrar, admin, teacher');
  } catch (e) {
    console.log('⚠️  Could not modify role column:', e.message);
  }
};

export const down = async (queryInterface, Sequelize) => {
  // Revert role column to original
  try {
    await queryInterface.sequelize.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('admin', 'user') NOT NULL DEFAULT 'user'
    `);
    console.log('✅ Reverted role column');
  } catch (e) {
    console.log('⚠️  Could not revert role column:', e.message);
  }
};
