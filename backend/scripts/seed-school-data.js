import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { sequelize } from '../models/index.js';

async function seedSchoolData() {
  const jsonPath = fileURLToPath(new URL('./school-data.json', import.meta.url));
  const raw = await fs.readFile(jsonPath, 'utf8');
  const data = JSON.parse(raw);

  await sequelize.authenticate();
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

  try {
    const qi = sequelize.getQueryInterface();
    for (const [table, rows] of Object.entries(data)) {
      const [[{ c }]] = await sequelize.query(`SELECT COUNT(*) as c FROM \`${table}\``);
      if (Number(c) === 0 && Array.isArray(rows) && rows.length > 0) {
        const prepared = rows.map(row => {
          const copy = { ...row };
          if (table === 'sections') {
            copy.currentEnrollment = 0;
            copy.teacherId = null;
          }
          if (copy.panoramaLabels && typeof copy.panoramaLabels === 'object') {
            copy.panoramaLabels = JSON.stringify(copy.panoramaLabels);
          }
          if (copy.createdAt) copy.createdAt = new Date(copy.createdAt);
          if (copy.updatedAt) copy.updatedAt = new Date(copy.updatedAt);
          return copy;
        });
        await qi.bulkInsert(table, prepared);
        console.log(`✅ Seeded ${prepared.length} rows into ${table}`);
      } else {
        console.log(`ℹ️ Skipped ${table} (already has ${c} rows)`);
      }
    }
  } finally {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    await sequelize.close();
  }
}

seedSchoolData().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
