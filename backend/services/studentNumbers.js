import { DataTypes } from 'sequelize';
import { sequelize } from '../models/db.js';

export const StudentNumberSequence = sequelize.define('StudentNumberSequence', {
  year: { type: DataTypes.INTEGER, primaryKey: true },
  lastNumber: { type: DataTypes.INTEGER, allowNull: false }
}, { tableName: 'student_number_sequences', timestamps: false });

// MySQL upsert serializes increments across requests and backend instances.
export async function generateStudentNumber() {
  const year = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Manila', year: 'numeric' }).format(new Date()));
  return sequelize.transaction(async transaction => {
    const [[existing]] = await sequelize.query(`SELECT COALESCE(MAX(CAST(SUBSTR(studentNumber, 6) AS UNSIGNED)), 0) AS maxSeq FROM enrollment_records WHERE studentNumber LIKE ? AND LENGTH(studentNumber) = 10`, { replacements: [`${year}-%`], transaction });
    await sequelize.query(`INSERT INTO student_number_sequences (year, lastNumber) VALUES (?, ?) ON DUPLICATE KEY UPDATE lastNumber = GREATEST(lastNumber, ?) + 1`, { replacements: [year, Number(existing.maxSeq) + 1, Number(existing.maxSeq)], transaction });
    const [[counter]] = await sequelize.query('SELECT lastNumber FROM student_number_sequences WHERE year = ?', { replacements: [year], transaction });
    if (counter.lastNumber > 99999) throw Error('Student number range exhausted for this year. Contact an administrator.');
    return `${year}-${String(counter.lastNumber).padStart(5, '0')}`;
  });
}
