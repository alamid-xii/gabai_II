import { DataTypes } from 'sequelize';
import { sequelize } from './db.js';

export const EnrollmentGuide = sequelize.define('EnrollmentGuide', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  content: { type: DataTypes.JSON, allowNull: false },
  revision: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }
}, { tableName: 'enrollment_guide' });
