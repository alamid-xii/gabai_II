import { User } from "../models/userModel.js";

/**
 * Public statistics endpoint for the homepage.
 * Returns real counts of active users, students, and faculty & staff from the database.
 */
export const getPublicStats = async (req, res) => {
  try {
    const [activeUsers, students, faculty] = await Promise.all([
      User.count({ where: { isActive: true } }),
      User.count({ where: { role: "student", isActive: true } }),
      User.count({ where: { role: ["teacher", "registrar"], isActive: true } }),
    ]);

    res.set("Cache-Control", "public, max-age=60");
    return res.json({
      success: true,
      activeUsers,
      students,
      faculty,
    });
  } catch (error) {
    console.error("Public stats error:", error);
    return res.status(500).json({ error: "Failed to fetch public stats" });
  }
};
