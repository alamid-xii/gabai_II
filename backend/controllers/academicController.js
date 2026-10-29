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

export const createSubject = async (req, res) => {
  try {
    const subject = await Subject.create(req.body);
    res.status(201).json(subject);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateSubject = async (req, res) => {
  const subject = await Subject.findByPk(req.params.id);
  if (!subject) return res.status(404).json({ message: 'Subject not found' });
  await subject.update(req.body);
  res.json(subject);
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

export const createSection = async (req, res) => {
  try {
    const section = await Section.create(req.body);
    res.status(201).json(section);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateSection = async (req, res) => {
  const section = await Section.findByPk(req.params.id);
  if (!section) return res.status(404).json({ message: 'Section not found' });
  await section.update(req.body);
  res.json(section);
};

export const deleteSection = async (req, res) => {
  const section = await Section.findByPk(req.params.id);
  if (!section) return res.status(404).json({ message: 'Section not found' });
  await section.update({ isActive: false });
  res.json({ message: 'Section deleted' });
};

// ── School Years ──────────────────────────────────────────
export const getSchoolYears = async (req, res) => {
  const years = await SchoolYear.findAll({ order: [['year', 'DESC']] });
  res.json(years);
};

export const getActiveSchoolYear = async (req, res) => {
  const year = await SchoolYear.findOne({ where: { isActive: true } });
  res.json(year || null);
};
export const closeSchoolYear = async (req, res) => {
  try {
    // Only complete students who are genuinely enrolled and active —
    // exclude dropped/transferred_out (already processed) and pending applications
    const [[{ count }]] = await sequelize.query(
      `SELECT COUNT(*) as count FROM enrollment_records
       WHERE status IN ('enrolled', 'active', 'subjects_enrolled')
         AND (lifeStatus IS NULL OR lifeStatus NOT IN ('dropped', 'transferred_out'))`
    );

    if (count === 0) {
      return res.json({ message: 'No enrolled students to complete.', completed: 0 });
    }

    // Mark enrolled/active students as completed. Retained students keep their retained lifeStatus
    await sequelize.query(
      `UPDATE enrollment_records
       SET status = 'completed',
           lifeStatus = CASE 
             WHEN lifeStatus = 'retained' THEN 'retained'
             ELSE 'completed'
           END,
           updatedAt = NOW()
       WHERE status IN ('enrolled', 'active', 'subjects_enrolled')
         AND (lifeStatus IS NULL OR lifeStatus NOT IN ('dropped', 'transferred_out'))`
    );

    res.json({
      message: `School year closed. ${count} student(s) marked as completed.`,
      completed: Number(count),
    });
  } catch (err) {
    console.error('closeSchoolYear error:', err);
    res.status(500).json({ message: 'Failed to close school year' });
  }
};

export const createSchoolYear = async (req, res) => {
  try {
    const sy = await SchoolYear.create(req.body);
    res.status(201).json(sy);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const setActiveSchoolYear = async (req, res) => {
  await SchoolYear.update({ isActive: false }, { where: {} });
  await SchoolYear.update({ isActive: true }, { where: { id: req.params.id } });
  res.json({ message: 'Active school year updated' });
};


