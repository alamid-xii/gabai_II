import { Op } from "sequelize";
import { SystemLog } from "../models/systemLogModel.js";
import { sequelize } from "../models/db.js";
import { backfillSystemLogs } from "../services/systemLogger.js";

function buildLogWhereClause(query = {}) {
  const { search, category, severity, role, startDate, endDate } = query;
  const where = {};

  if (category && category !== "all") {
    where.category = category;
  }

  if (severity && severity !== "all") {
    where.severity = severity;
  }

  if (role && role !== "all") {
    where.userRole = role;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      const start = new Date(`${startDate}T00:00:00`);
      if (!isNaN(start.getTime())) where.createdAt[Op.gte] = start;
    }
    if (endDate) {
      const end = new Date(`${endDate}T23:59:59.999`);
      if (!isNaN(end.getTime())) where.createdAt[Op.lte] = end;
    }
  }

  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    where[Op.or] = [
      { userName: { [Op.like]: q } },
      { userEmail: { [Op.like]: q } },
      { action: { [Op.like]: q } },
      { description: { [Op.like]: q } },
      { targetId: { [Op.like]: q } },
      { endpoint: { [Op.like]: q } },
      { ipAddress: { [Op.like]: q } },
    ];
  }

  return where;
}

export const getSystemLogs = async (req, res) => {
  try {
    await backfillSystemLogs();

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 25));
    const offset = (page - 1) * limit;

    const where = buildLogWhereClause(req.query);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      { count: filteredTotal, rows },
      totalLogs,
      todayLogs,
      warningAndErrorCount,
      enrollmentEventsCount,
      categoryRows,
    ] = await Promise.all([
      SystemLog.findAndCountAll({
        where,
        order: [["createdAt", "DESC"], ["id", "DESC"]],
        limit,
        offset,
      }),
      SystemLog.count(),
      SystemLog.count({
        where: {
          createdAt: { [Op.gte]: startOfToday },
        },
      }),
      SystemLog.count({
        where: {
          severity: { [Op.in]: ["warning", "error"] },
        },
      }),
      SystemLog.count({
        where: {
          category: { [Op.in]: ["enrollment", "ssc", "section"] },
        },
      }),
      sequelize
        .query(`SELECT category, COUNT(*) as count FROM system_logs GROUP BY category`)
        .then(([r]) => r)
        .catch(() => []),
    ]);

    const categoryBreakdown = {};
    for (const row of categoryRows || []) {
      categoryBreakdown[row.category] = Number(row.count) || 0;
    }

    res.json({
      logs: rows,
      pagination: {
        total: filteredTotal,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(filteredTotal / limit)),
      },
      summary: {
        totalLogs,
        todayLogs,
        warningAndErrorCount,
        enrollmentEventsCount,
        categoryBreakdown,
      },
    });
  } catch (error) {
    console.error("getSystemLogs error:", error);
    res.status(500).json({ error: "Failed to fetch system logs" });
  }
};

function escapeCsvCell(value) {
  if (value === null || value === undefined) return "";
  const str = String(value).replace(/"/g, '""');
  return /[",\n\r]/.test(str) ? `"${str}"` : str;
}

export const exportSystemLogsCSV = async (req, res) => {
  try {
    await backfillSystemLogs();

    const where = buildLogWhereClause(req.query);
    const [logs, [staffRows]] = await Promise.all([
      SystemLog.findAll({
        where,
        order: [["createdAt", "DESC"], ["id", "DESC"]],
        limit: 2000,
      }),
      sequelize
        .query(`SELECT id, email, role FROM users WHERE role IN ('admin', 'registrar') ORDER BY id ASC`)
        .catch(() => [[]]),
    ]);

    const adminEmail = (staffRows || []).find((u) => u.role === "admin" && u.email)?.email || "admin@school.edu.ph";
    const registrarEmail = (staffRows || []).find((u) => u.role === "registrar" && u.email)?.email || adminEmail;

    const headers = [
      "ID",
      "Timestamp",
      "Actor Name",
      "Actor Email",
      "Role",
      "Category",
      "Action",
      "Severity",
      "Description",
      "Target Type",
      "Target ID",
      "HTTP Method",
      "Endpoint",
      "Status Code",
      "IP Address",
    ];

    const lines = [headers.join(",")];
    for (const log of logs) {
      let actorEmail = (log.userEmail || "").trim();
      if (!actorEmail) {
        if (log.userRole === "registrar") actorEmail = registrarEmail;
        else if (log.userRole === "admin" || log.userRole === "system") actorEmail = adminEmail;
        else if (log.userName && log.userName.includes("@")) actorEmail = log.userName;
        else actorEmail = "unauthenticated@guest.local";
      }

      lines.push(
        [
          log.id,
          log.createdAt ? new Date(log.createdAt).toISOString() : "",
          log.userName || "System",
          actorEmail,
          log.userRole || "",
          log.category || "",
          log.action || "",
          log.severity || "",
          log.description || "",
          log.targetType || "",
          log.targetId || "",
          log.method || "",
          log.endpoint || "",
          log.statusCode ?? "",
          log.ipAddress || "",
        ]
          .map(escapeCsvCell)
          .join(",")
      );
    }

    const filename = `system-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(lines.join("\n"));
  } catch (error) {
    console.error("exportSystemLogsCSV error:", error);
    res.status(500).json({ error: "Failed to export system logs" });
  }
};

