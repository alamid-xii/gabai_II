import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const GradingPeriod = sequelize.define("GradingPeriod", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  quarter: {
    // Q1 | Q2 | Q3 | Q4
    type: DataTypes.ENUM('Q1', 'Q2', 'Q3', 'Q4', 'FINAL'),
    allowNull: false
  },
  schoolYear: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'e.g. 2025-2026'
  },
  isOpen: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether teachers can currently enter/edit grades for this quarter'
  },
  openedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  closedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'grading_periods',
  timestamps: true
});
