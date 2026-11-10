import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeToMinutes, createClassSchedule } from './scheduleController.js';
import { ClassSchedule, Section, User, SchoolYear, sequelize } from '../models/index.js';
import { SectionSubjectAssignment } from '../models/sectionSubjectAssignmentModel.js';
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

test('clock validation accepts valid 24-hour and AM/PM times only', () => {
  for (const value of ['25:99', '24:00', '12:60', '13:00 PM', '00:30 AM', '9', null, 100]) assert.equal(parseTimeToMinutes(value), null, String(value));
  assert.equal(parseTimeToMinutes('00:00'), 0); assert.equal(parseTimeToMinutes('23:59'), 1439);
  assert.equal(parseTimeToMinutes('12:00 AM'), 0); assert.equal(parseTimeToMinutes('12:00 PM'), 720); assert.equal(parseTimeToMinutes('1:30 PM'), 810);
});

test('scheduling deduplicates weekdays, scopes conflicts, persists subject ownership and preserves adviser', async () => {
  const original = { section: Section.findByPk, teacher: User.findOne, year: SchoolYear.findOne, find: ClassSchedule.findAll, create: ClassSchedule.create, transaction: sequelize.transaction, query: sequelize.query, upsert: SectionSubjectAssignment.upsert, assignment: SectionSubjectAssignment.findOne };
  try {
    let adviserWrites = 0, committed = false, days = [], ownership;
    Section.findByPk = async () => ({ id: 2, schoolYear: '2026-2027', semester: '1st', update: async () => { adviserWrites++; } });
    User.findOne = async () => ({ id: 7 }); SchoolYear.findOne = async () => ({ id: 1 });
    const transaction = { LOCK: { UPDATE: 'UPDATE' }, commit: async () => { committed = true; }, rollback: async () => {} };
    sequelize.transaction = async () => transaction;
    ClassSchedule.findAll = async ({ where, transaction: passed }) => { assert.equal(where.schoolYear, '2026-2027'); assert.equal(passed, transaction); return []; };
    ClassSchedule.create = async body => { days.push(body.dayOfWeek); return body; };
    SectionSubjectAssignment.upsert = async input => { ownership = input; };
    SectionSubjectAssignment.findOne = async () => null; sequelize.query = async () => [];
    const res = response();
    await createClassSchedule({ body: { subjectCode: 'MATH7', subjectName: 'Math', sectionId: 2, sectionName: '7-A', teacherId: 7, teacherName: 'Subject Teacher', days: ['Wednesday', 'Wednesday'], startTime: '08:00', endTime: '09:00', schoolYear: '2026-2027' } }, res);
    assert.equal(res.code, 201); assert.deepEqual(days, ['Wednesday']); assert.equal(adviserWrites, 0); assert.equal(ownership.teacherId, 7); assert.equal(committed, true);
  } finally {
    Section.findByPk = original.section; User.findOne = original.teacher; SchoolYear.findOne = original.year; ClassSchedule.findAll = original.find; ClassSchedule.create = original.create; sequelize.transaction = original.transaction; sequelize.query = original.query; SectionSubjectAssignment.upsert = original.upsert; SectionSubjectAssignment.findOne = original.assignment;
  }
});
