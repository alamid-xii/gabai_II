import { ACADEMIC_TERMS } from "../services/academicTerms.js";
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";
import { Program } from "./programModel.js";

export const Subject = sequelize.define("Subject", {
  code: { 
    type: DataTypes.STRING(20), 
    allowNull: false,
    unique: true,
    comment: 'Subject code (e.g., CS101, MATH201)'
  },
  description: { 
    type: DataTypes.STRING(200), 
    allowNull: false,
    comment: 'Full subject name/description'
  },
  units: { 
    type: DataTypes.DECIMAL(4, 1), 
    allowNull: false, 
    defaultValue: 3,
    comment: 'Credit units for the subject'
  },
  programCode: { 
    type: DataTypes.STRING(20), 
    allowNull: false,
    comment: 'Program code: SHS, BSED, BSIS, BSBA, BSED, BSCrim'
  },
  // For SHS: STEM, ABM, HUMSS
  // For College: Major name (e.g., Financial Management, Marketing Management)
  strand: { 
    type: DataTypes.STRING(100), 
    allowNull: true,
    comment: 'SHS strand (STEM, ABM, HUMSS) or College major'
  },
  // Grade level: 7-12 for HS, 1-4 for College
  gradeLevel: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    comment: 'Grade/Year level: 7-12 for HS, 1-4 for College'
  },
  semester: { 
    type: DataTypes.ENUM(...ACADEMIC_TERMS),
    validate: { isIn: { args: [ACADEMIC_TERMS], msg: "Select a valid semester or trimester" } },
    allowNull: false,
    comment: 'Semester when subject is offered'
  },
  teacherId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Default subject teacher for new enrollments'
  },
  isActive: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: true,
    comment: 'Whether subject is currently active'
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
  tableName: 'subjects',
  timestamps: true,
  comment: 'Academic subjects for all education levels (JHS, SHS, College)'
});

export { sequelize };
