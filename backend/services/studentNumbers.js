import { DataTypes } from 'sequelize';
import { sequelize } from '../models/db.js';

export const StudentNumberSequence = sequelize.define('StudentNumberSequence', {
  year: { type: DataTypes.INTEGER, primaryKey: true },
  lastNumber: { type: DataTypes.INTEGER, allowNull: false }
}, { tableName: 'student_number_sequences', timestamps: false });

export const STUDENT_NUMBER_PATTERN = /^([A-Z]-\d{4,6}|\d{4}-\d{4,5})$/;
export const STUDENT_NUMBER_FORMAT_MESSAGE = 'Invalid Student ID format. Use YYYY-NNNN (e.g. 2026-0001) or EMC ID (e.g. A-9869).';

export function normalizeStudentNumber(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

export function isValidStudentNumber(value) {
  return STUDENT_NUMBER_PATTERN.test(normalizeStudentNumber(value));
}

function getCurrentManilaYear() {
  return Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Manila', year: 'numeric' }).format(new Date()));
}

function formatYearlyStudentNumber(year, seq) {
  return `${year}-${String(seq).padStart(4, '0')}`;
}

async function getMaxYearlySeq(year, transaction) {
  const [[existing]] = await sequelize.query(
    `SELECT COALESCE(MAX(CAST(SUBSTR(studentNumber, 6) AS UNSIGNED)), 0) AS maxSeq
     FROM enrollment_records
     WHERE studentNumber LIKE ? AND SUBSTR(studentNumber, 6) REGEXP '^[0-9]+$'`,
    { replacements: [`${year}-%`], transaction }
  );
  return Number(existing?.maxSeq || 0);
}

// Non-mutating preview of the next YYYY-NNNN ID for Registrar UI suggestions.
export async function previewNextStudentNumber() {
  const year = getCurrentManilaYear();
  const maxSeq = await getMaxYearlySeq(year);
  let seqLast = 0;
  try {
    const [[counter]] = await sequelize.query(
      'SELECT lastNumber FROM student_number_sequences WHERE year = ?',
      { replacements: [year] }
    );
    seqLast = Number(counter?.lastNumber || 0);
  } catch (_) {}
  const nextSeq = Math.max(maxSeq, seqLast) + 1;
  if (nextSeq > 99999) throw Object.assign(new Error('Student number range exhausted for this year. Contact an administrator.'), { status: 400 });
  return formatYearlyStudentNumber(year, nextSeq);
}

export async function assertStudentNumberAvailable(studentNumber, userId, transaction) {
  const normalized = normalizeStudentNumber(studentNumber);
  if (!isValidStudentNumber(normalized)) {
    throw Object.assign(new Error(STUDENT_NUMBER_FORMAT_MESSAGE), { status: 400 });
  }
  const [[conflict]] = await sequelize.query(
    `SELECT id, userId FROM enrollment_records
     WHERE UPPER(studentNumber) = ? AND userId != ?
     LIMIT 1`,
    { replacements: [normalized, Number(userId) || 0], transaction }
  );
  if (conflict) {
    throw Object.assign(new Error(`Student ID Number "${normalized}" is already assigned to another student.`), { status: 409 });
  }
  return normalized;
}

// MySQL upsert serializes increments across requests and backend instances.
export async function generateStudentNumber() {
  const year = getCurrentManilaYear();
  return sequelize.transaction(async transaction => {
    const maxSeq = await getMaxYearlySeq(year, transaction);
    await sequelize.query(
      `INSERT INTO student_number_sequences (year, lastNumber) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE lastNumber = GREATEST(lastNumber, ?) + 1`,
      { replacements: [year, maxSeq + 1, maxSeq], transaction }
    );
    const [[counter]] = await sequelize.query(
      'SELECT lastNumber FROM student_number_sequences WHERE year = ?',
      { replacements: [year], transaction }
    );
    if (counter.lastNumber > 99999) throw Error('Student number range exhausted for this year. Contact an administrator.');
    return formatYearlyStudentNumber(year, counter.lastNumber);
  });
}
