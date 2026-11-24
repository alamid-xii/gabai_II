import { validateProgramGrade } from './academicScope.js';
export const ACADEMIC_TERMS = ['1st', '2nd', 'Summer', '1st Trimester', '2nd Trimester', '3rd Trimester'];

// Expand existing enums without rewriting or removing legacy semester values.
export async function ensureAcademicTerms(db) {
  for (const table of ['subjects', 'sections']) {
    const columns = await db.getQueryInterface().describeTable(table);
    const type = columns.semester?.type || '';
    if (ACADEMIC_TERMS.every(term => type.includes(`'${term}'`))) continue;
    await db.query(`ALTER TABLE ${table} MODIFY COLUMN semester ENUM(${ACADEMIC_TERMS.map(term => `'${term}'`).join(',')}) NOT NULL`);
  }
}

export function subjectInput(body, partial = false) {
  const result = {};
  for (const key of ['code', 'description', 'programCode', 'strand', 'semester']) {
    if (body[key] !== undefined) result[key] = typeof body[key] === 'string' ? body[key].trim() : body[key];
  }
  for (const key of ['units', 'gradeLevel']) {
    if (body[key] !== undefined) result[key] = Number(body[key]);
  }
  for (const key of ['code', 'description', 'programCode', 'semester']) {
    if ((!partial || key in result) && (typeof result[key] !== 'string' || !result[key])) throw new Error(`${key} is required`);
  }
  if ('semester' in result && !ACADEMIC_TERMS.includes(result.semester)) throw new Error('Select a valid semester or trimester');
  if ((!partial || 'units' in result) && (!Number.isFinite(result.units) || result.units <= 0 || result.units > 99.9)) throw new Error('Units must be greater than zero and at most 99.9');
  if ((!partial || 'gradeLevel' in result) && (!Number.isInteger(result.gradeLevel) || result.gradeLevel < 1 || result.gradeLevel > 12)) throw new Error('Select a valid grade or year level');
  if ('programCode' in result && !['JHS', 'SHS'].includes(result.programCode)) throw new Error('Program must be JHS or SHS.');
  if ('programCode' in result && 'gradeLevel' in result) validateProgramGrade(result.programCode, result.gradeLevel);
  if (body.teacherId !== undefined) {
    result.teacherId = body.teacherId === '' || body.teacherId === null ? null : Number(body.teacherId);
    if (result.teacherId !== null && (!Number.isSafeInteger(result.teacherId) || result.teacherId < 1 || !['number', 'string'].includes(typeof body.teacherId))) throw new Error('Select a valid teacher');
  }
  if (result.strand === '') result.strand = null;
  return result;
}

export async function ensureYearEndGrading(db) {
  const columns = await db.getQueryInterface().describeTable('grading_periods');
  if (!columns.quarter.type.includes("'FINAL'")) {
    await db.query("ALTER TABLE grading_periods MODIFY COLUMN quarter ENUM('Q1','Q2','Q3','Q4','FINAL') NOT NULL");
  }
}

export async function ensureSubjectTeacher(db) {
  const columns = await db.getQueryInterface().describeTable('subjects');
  if (!columns.teacherId) await db.query('ALTER TABLE subjects ADD COLUMN teacherId INTEGER NULL');
}

export async function ensureSchoolYearColumns(db) {
  const columns = await db.getQueryInterface().describeTable('school_years');
  if (!columns.startMonth) await db.query('ALTER TABLE school_years ADD COLUMN startMonth INTEGER NULL DEFAULT 6');
  if (!columns.endMonth) await db.query('ALTER TABLE school_years ADD COLUMN endMonth INTEGER NULL DEFAULT 3');
  if (!columns.activeEnrollmentTypes) await db.query('ALTER TABLE school_years ADD COLUMN activeEnrollmentTypes JSON NULL');
  await db.query(
    `UPDATE school_years
     SET startMonth = COALESCE(startMonth, 6),
         endMonth = COALESCE(endMonth, 3),
         activeEnrollmentTypes = COALESCE(activeEnrollmentTypes, '{"new":true,"old":true,"transferee":true,"returnee":true}')
     WHERE startMonth IS NULL OR endMonth IS NULL OR activeEnrollmentTypes IS NULL`
  );
}

export async function ensureSectionGradeRangeColumns(db) {
  const columns = await db.getQueryInterface().describeTable('sections');
  if (!columns.minGrade) await db.query('ALTER TABLE sections ADD COLUMN minGrade DECIMAL(5,2) NULL');
  if (!columns.maxGrade) await db.query('ALTER TABLE sections ADD COLUMN maxGrade DECIMAL(5,2) NULL');
}
