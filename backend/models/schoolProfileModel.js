import { DataTypes } from 'sequelize';
import { sequelize } from './db.js';

export const SchoolProfile = sequelize.define('SchoolProfile', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  content: { type: DataTypes.JSON, allowNull: false },
  revision: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }
}, { tableName: 'school_profile' });
