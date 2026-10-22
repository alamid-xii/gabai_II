import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const ClassSchedule = sequelize.define("ClassSchedule", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  subjectId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  subjectCode: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  subjectName: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  sectionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  sectionName: {
    type: DataTypes.STRING(100),
    allowNull: false, // e.g. "Grade 7 - Diamond"
  },
  gradeLevel: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  teacherId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  teacherName: {
    type: DataTypes.STRING(100),
    allowNull: false, // e.g. "De Guzman, P."
  },
  dayOfWeek: {
    type: DataTypes.ENUM("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"),
    allowNull: false,
  },
  startTime: {
    type: DataTypes.STRING(20),
    allowNull: false, // e.g. "7:30 AM"
  },
  endTime: {
    type: DataTypes.STRING(20),
    allowNull: false, // e.g. "9:00 AM"
  },
  room: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  schoolYear: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  semester: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
}, {
  tableName: "class_schedules",
  timestamps: true,
});

export default ClassSchedule;
