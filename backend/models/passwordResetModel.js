import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

// One outstanding reset per user. Never store the token sent by email.
export const PasswordReset = sequelize.define("PasswordReset", {
  userId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
}, { tableName: "password_resets", timestamps: true });
