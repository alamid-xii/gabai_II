import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const SystemLog = sequelize.define("SystemLog", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  userName: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  userEmail: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  userRole: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: "system"
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: "system_settings"
  },
  action: {
    type: DataTypes.STRING(80),
    allowNull: false
  },
  severity: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: "info"
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  targetType: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  targetId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  method: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  endpoint: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  statusCode: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: "system_logs",
  timestamps: true
});

