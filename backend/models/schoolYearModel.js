import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const SchoolYear = sequelize.define("SchoolYear", {
  year: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: false },
  startMonth: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 6 },
  endMonth: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 3 },
  activeEnrollmentTypes: { type: DataTypes.JSON, allowNull: true },
}, { tableName: 'school_years' });
