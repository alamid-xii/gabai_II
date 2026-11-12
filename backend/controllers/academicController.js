import { validateProgramGrade } from '../services/academicScope.js';
import { User } from "../models/userModel.js";
import { subjectInput } from "../services/academicTerms.js";
import { Program } from '../models/programModel.js';
import { Subject } from '../models/subjectModel.js';
import { Section } from '../models/sectionModel.js';
import { SchoolYear } from '../models/schoolYearModel.js';
import { sequelize } from '../models/db.js';
import { Op } from 'sequelize';

try { await sequelize.authenticate(); } catch (err) { console.warn("DB unavailable at import (academicController):", err.message); }

// ── Programs ──────────────────────────────────────────────
export const getPrograms = async (req, res) => {
  const programs = await Program.findAll({ where: { isActive: true } });
  res.json(programs);
};

// ── Subjects ──────────────────────────────────────────────
export const getSubjects = async (req, res) => {
  const { programCode, gradeLevel, semester } = req.query;
  const where = { isActive: true };
  if (programCode) where.programCode = programCode;
  if (gradeLevel) where.gradeLevel = parseInt(gradeLevel);
  if (semester) where.semester = semester;
  const subjects = await Subject.findAll({ where, order: [['gradeLevel', 'ASC'], ['semester', 'ASC'], ['code', 'ASC']] });
  res.json(subjects);
};

async function validateSubjectTeacher(input) {
  if (input.teacherId == null) return;
  const teacher = await User.findOne({ where: { id: input.teacherId, role: 'teacher', isActive: true } });
  if (!teacher) throw new Error('Choose an active teacher account.');
}

export const createSubject = async (req, res) => {
  try {
    const input = subjectInput(req.body);
    await validateSubjectTeacher(input);
    const subject = await Subject.create(input);
    res.status(201).json(subject);
  } catch (err) {
    res.status(400).json({ message: err.name === 'SequelizeUniqueConstraintError' ? 'This subject code already exists. Use a different code or edit the existing subject.' : err.message });
  }
};

export const updateSubject = async (req, res) => {
  try {
    const input = subjectInput(req.body, true);
    await validateSubjectTeacher(input);
    const subject = await Subject.findByPk(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    const finalProgram = input.programCode ?? subject.programCode;
    const finalGrade = input.gradeLevel ?? subject.gradeLevel;
    if (finalProgram !== undefined && finalGrade !== undefined) validateProgramGrade(finalProgram, finalGrade);
    await subject.update(input);
    res.json(subject);
  } catch (err) {
    res.status(400).json({ message: err.name === 'SequelizeUniqueConstraintError' ? 'This subject code already exists.' : err.message });
  }
};

export const deleteSubject = async (req, res) => {
  const subject = await Subject.findByPk(req.params.id);
  if (!subject) return res.status(404).json({ message: 'Subject not found' });
  await subject.update({ isActive: false });
  res.json({ message: 'Subject deleted' });
};

// ── Sections ──────────────────────────────────────────────
export const getSections = async (req, res) => {
  const { programCode, yearLevel, semester, schoolYear } = req.query;
  const where = { isActive: true };
  if (programCode) where.programCode = programCode;
  if (yearLevel) where.yearLevel = parseInt(yearLevel);
  if (semester) where.semester = semester;
  if (schoolYear) where.schoolYear = schoolYear;
  const sections = await Section.findAll({ where, order: [['code', 'ASC']] });
  res.json(sections);
};

export { createSection, updateSection, deleteSection } from './sectionController.js';

// ── School Years ──────────────────────────────────────────
export const getSchoolYears = async (req, res) => {
  const years = await SchoolYear.findAll({ order: [['year', 'DESC']] });
  res.json(years);
};

export const getActiveSchoolYear = async (req, res) => {
  const year = await SchoolYear.findOne({ where: { isActive: true } });
  res.json(year || null);
};
const validSchoolYear = year => typeof year === 'string' && /^\d{4}-\d{4}$/.test(year) && Number(year.slice(5)) === Number(year.slice(0, 4)) + 1;
const activeEnrollment = "er.status IN ('enrolled', 'active', 'subjects_enrolled') AND (er.lifeStatus IS NULL OR er.lifeStatus NOT IN ('dropped', 'transferred_out'))";
const reportingEnrollment = activeEnrollment.replace("'subjects_enrolled'", "'subjects_enrolled', 'completed'");

export const getYearEndSummary = async (req, res) => {
  try {
    const { schoolYear } = req.query;
    if (!validSchoolYear(schoolYear)) return res.status(400).json({ message: 'Select a valid school year.' });
    const [[summary]] = await sequelize.query(
      `SELECT COUNT(es.id) AS totalSubjects, COALESCE(SUM(es.finalGrade IS NOT NULL), 0) AS submitted
       FROM enrollment_subjects es JOIN enrollment_records er ON er.id = es.enrollmentId
       WHERE er.academicYear = ? AND ${reportingEnrollment} AND es.status = 'enrolled'`,
      { replacements: [schoolYear] }
    );
    const [[students]] = await sequelize.query(
      `SELECT COUNT(*) AS students, COALESCE(SUM(NOT EXISTS (SELECT 1 FROM enrollment_subjects es WHERE es.enrollmentId = er.id AND es.status = 'enrolled') OR EXISTS (SELECT 1 FROM enrollment_subjects es WHERE es.enrollmentId = er.id AND es.status = 'enrolled' AND es.finalGrade IS NULL)), 0) AS pendingStudents
       FROM enrollment_records er WHERE er.academicYear = ? AND ${activeEnrollment}`,
      { replacements: [schoolYear] }
    );
    res.json({ ...Object.fromEntries(Object.entries(summary).map(([key, value]) => [key, Number(value)])), students: Number(students.students), pendingStudents: Number(students.pendingStudents) });
  } catch { res.status(500).json({ message: 'Could not load year-end progress.' }); }
};

export const closeSchoolYear = async (req, res) => {
  try {
    const { schoolYear } = req.body;
    if (!validSchoolYear(schoolYear)) return res.status(400).json({ message: 'Select a valid school year to complete.' });
    const completed = await sequelize.transaction(async transaction => {
      const year = await SchoolYear.findOne({ where: { year: schoolYear }, transaction, lock: transaction.LOCK.UPDATE });
      if (!year) throw Object.assign(new Error('School year not found.'), { status: 404 });
      const [[period]] = await sequelize.query("SELECT id, isOpen FROM grading_periods WHERE schoolYear = ? AND quarter = 'FINAL' FOR UPDATE", { replacements: [schoolYear], transaction });
      if (!period || period.isOpen) throw Object.assign(new Error('Set up year-end submissions and close the window to lock grades before completing the school year.'), { status: 409 });
      const [records] = await sequelize.query(`SELECT er.id FROM enrollment_records er WHERE er.academicYear = ? AND ${activeEnrollment} FOR UPDATE`, { replacements: [schoolYear], transaction });
      if (!records.length) return 0;
      const [[pending]] = await sequelize.query(
        `SELECT COUNT(*) AS count FROM enrollment_records er WHERE er.academicYear = ? AND ${activeEnrollment}
         AND (NOT EXISTS (SELECT 1 FROM enrollment_subjects es WHERE es.enrollmentId = er.id AND es.status = 'enrolled') OR EXISTS (SELECT 1 FROM enrollment_subjects es WHERE es.enrollmentId = er.id AND es.status = 'enrolled' AND es.finalGrade IS NULL))`,
        { replacements: [schoolYear], transaction }
      );
      if (Number(pending.count)) throw Object.assign(new Error(`${pending.count} student(s) still need subject assignments or final grades. Complete their records first.`), { status: 409 });
      await sequelize.query(
        `UPDATE enrollment_records er SET er.status = 'completed', er.lifeStatus = CASE WHEN er.lifeStatus = 'retained' THEN 'retained' ELSE 'completed' END, er.updatedAt = NOW() WHERE er.academicYear = ? AND ${activeEnrollment}`,
        { replacements: [schoolYear], transaction }
      );
      return records.length;
    });
    res.json({ message: `${schoolYear}: ${completed} enrollment(s) completed.`, completed });
  } catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not complete the school year.' }); }
};

export const createSchoolYear = async (req, res) => {
  try {
    const year = typeof req.body.year === 'string' ? req.body.year.trim() : '';
    if (!validSchoolYear(year)) return res.status(400).json({ message: 'Use consecutive years, for example 2026-2027.' });
    const sy = await SchoolYear.create({ year, isActive: false });
    res.status(201).json(sy);
  } catch (err) { res.status(400).json({ message: err.name === 'SequelizeUniqueConstraintError' ? 'This school year already exists.' : 'Could not add the school year.' }); }
};

export const setActiveSchoolYear = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid school year.' });
    await sequelize.transaction(async transaction => {
      const years = await SchoolYear.findAll({ transaction, lock: transaction.LOCK.UPDATE, order: [['id', 'ASC']] });
      const targetYear = years.find(year => year.id === id);
      if (!targetYear) throw Object.assign(new Error('School year not found.'), { status: 404 });
      await SchoolYear.update({ isActive: false }, { where: {}, transaction });
      await SchoolYear.update({ isActive: true }, { where: { id }, transaction });
      await sequelize.query(
        `UPDATE enrollment_records SET academicYear = ? WHERE academicYear IS NULL OR academicYear = ''`,
        { replacements: [targetYear.year], transaction }
      );
    });
    res.json({ message: 'Active school year updated.' });
  } catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not activate the school year.' }); }
};
