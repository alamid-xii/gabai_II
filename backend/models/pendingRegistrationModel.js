import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const PendingRegistration = sequelize.define("PendingRegistration", {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  verificationToken: { type: DataTypes.STRING(100), allowNull: false },
  verificationExpires: { type: DataTypes.DATE, allowNull: false },
}, {
  tableName: "pending_registrations",
  timestamps: true,
});
