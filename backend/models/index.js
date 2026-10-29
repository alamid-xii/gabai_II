/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines
*/

import { sequelize } from './db.js';
import { User } from './userModel.js';
import { EnrollmentRecord } from './enrollmentRecordModel.js';
import { Subject } from './subjectModel.js';
import { Section } from './sectionModel.js';
import { Admission } from './admissionModel.js';
import { EnrollmentSubject } from './enrollmentSubjectModel.js';
import { Program } from './programModel.js';
import { SchoolYear } from './schoolYearModel.js';
import { ChatLog } from './chatLogModel.js';
import { FAQ } from './faqModel.js';
import { Building } from './buildingModel.js';
import { EnrollmentDocument } from './enrollmentDocumentModel.js';
import { ClassSchedule } from './classScheduleModel.js';
import { SystemLog } from './systemLogModel.js';

// Export all models
export {
  sequelize,
  User,
  EnrollmentRecord,
  Subject,
  Section,
  Admission,
  EnrollmentSubject,
  Program,
  SchoolYear,
  ChatLog,
  FAQ,
  Building,
  EnrollmentDocument,
  ClassSchedule,
  SystemLog,
};
