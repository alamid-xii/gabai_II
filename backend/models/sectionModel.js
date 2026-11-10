import { ACADEMIC_TERMS } from "../services/academicTerms.js";
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Section = sequelize.define("Section", {
  code: { 
    type: DataTypes.STRING(50), 
    allowNull: false,
    comment: 'Section code (e.g., A1, B2, BSIS-1A)'
  },
  course: { 
    type: DataTypes.STRING(20), 
    allowNull: false,
    comment: 'Course/Program code (JHS, SHS, BSIS, BSBA, BSED, BSCrim, BEED)'
  },
  yearLevel: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    comment: 'Year/Grade level: 7-12 for HS, 1-4 for College'
  },
  strand: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'SHS strand (STEM, ABM, HUMSS, TVL, Sports, Arts and Design)'
  },
  semester: { 
    type: DataTypes.ENUM(...ACADEMIC_TERMS),
    validate: { isIn: { args: [ACADEMIC_TERMS], msg: "Select a valid semester or trimester" } },
    allowNull: false,
    comment: 'Semester when section is offered'
  },
  schoolYear: { 
    type: DataTypes.STRING(20), 
    allowNull: false,
    comment: 'Academic year (e.g., 2024-2025)'
  },
  instructor: { 
    type: DataTypes.STRING(100), 
    allowNull: true,
    comment: 'Instructor/Professor name'
  },
  schedule: { 
    type: DataTypes.STRING(100), 
    allowNull: true,
    comment: 'Class schedule (e.g., MWF 8:00-9:00 AM)'
  },
  room: { 
    type: DataTypes.STRING(50), 
    allowNull: true,
    comment: 'Room/Building location'
  },
  capacity: { 
    type: DataTypes.INTEGER, 
    defaultValue: 40,
    comment: 'Maximum student capacity'
  },
  currentEnrollment: { 
    type: DataTypes.INTEGER, 
    defaultValue: 0,
    comment: 'Current number of enrolled students'
  },
  isActive: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: true,
    comment: 'Whether section is currently active'
  },
  teacherId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Assigned teacher user ID'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, { 
  tableName: 'sections',
  timestamps: true,
  comment: 'Class sections for all education levels with enrollment tracking'
});

export { sequelize };
