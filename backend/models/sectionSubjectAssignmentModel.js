import { DataTypes } from 'sequelize';
import { sequelize } from './db.js';

// A section belongs to one school year. Keep its teaching assignments even
// before the first student enrolls, rather than using student rows as settings.
export const SectionSubjectAssignment = sequelize.define('SectionSubjectAssignment', {
  sectionId: { type: DataTypes.INTEGER, allowNull: false },
  subjectCode: { type: DataTypes.STRING(50), allowNull: false },
  teacherId: { type: DataTypes.INTEGER, allowNull: true },
  instructor: { type: DataTypes.STRING(100), allowNull: true },
  schedule: { type: DataTypes.STRING(255), allowNull: true },
  room: { type: DataTypes.STRING(50), allowNull: true },
}, {
  tableName: 'section_subject_assignments',
  indexes: [{ unique: true, fields: ['sectionId', 'subjectCode'] }],
});
