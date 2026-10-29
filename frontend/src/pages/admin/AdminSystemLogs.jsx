import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Activity,
  Search,
  RefreshCw,
  Download,
  ShieldAlert,
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  User,
  FileText,
  Globe,
  Terminal,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { API } from "../../config/api";

const CATEGORY_META = {
  auth: { label: "Authentication", badge: "bg-blue-100 text-blue-700 border-blue-200" },
  enrollment: { label: "Enrollments", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  ssc: { label: "SSC Exams", badge: "bg-purple-100 text-purple-700 border-purple-200" },
  section: { label: "Sections", badge: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  schedule: { label: "Schedules", badge: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  grading: { label: "Grading", badge: "bg-amber-100 text-amber-800 border-amber-200" },
  user_management: { label: "User Management", badge: "bg-rose-100 text-rose-700 border-rose-200" },
  academic: { label: "Academic Setup", badge: "bg-teal-100 text-teal-700 border-teal-200" },
  system_settings: { label: "System Settings", badge: "bg-slate-100 text-slate-700 border-slate-200" },
};

const ROLE_BADGES = {
  admin: "bg-[#001840] text-[#F5C400]",
  registrar: "bg-purple-100 text-purple-700",
  teacher: "bg-amber-100 text-amber-800",
  student: "bg-blue-100 text-blue-700",
  guest: "bg-gray-100 text-gray-600",
  system: "bg-gray-200 text-gray-700",
};

const SEVERITY_META = {
  success: {
    label: "Success",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: CheckCircle2,
  },
  info: {
    label: "Info",
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: Info,
  },
  warning: {
    label: "Warning",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: AlertTriangle,
  },
  error: {
    label: "Error",
    badge: "bg-red-50 text-red-700 border border-red-200",
    icon: XCircle,
  },
};

const METHOD_BADGES = {
  POST: "bg-emerald-100 text-emerald-800",
  PUT: "bg-blue-100 text-blue-800",
  PATCH: "bg-indigo-100 text-indigo-800",
  DELETE: "bg-red-100 text-red-700",
  GET: "bg-gray-100 text-gray-700",
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toLocalYMD(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatRelativeTime(dateInput) {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function parseDetails(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

export function AdminSystemLogs() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({
    totalLogs: 0,
    todayLogs: 0,
    warningAndErrorCount: 0,
    enrollmentEventsCount: 0,
    categoryBreakdown: {},
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [role, setRole] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  // Selected log for detail modal
  const [selectedLog, setSelectedLog] = useState(null);

  // Export CSV Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPreset, setExportPreset] = useState("all");
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportIncludeTableFilters, setExportIncludeTableFilters] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (category !== "all") params.set("category", category);
      if (role !== "all") params.set("role", role);
      if (severity !== "all") params.set("severity", severity);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`${API}/admin/system-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load system logs");
      }

      const data = await res.json();
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      if (data.pagination) setPagination(data.pagination);
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      console.error("Fetch system logs error:", err);
      toast.error("Could not load system logs.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, category, role, severity, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function openExportModal() {
    if (startDate || endDate) {
      setExportPreset("custom");
      setExportStartDate(startDate);
      setExportEndDate(endDate);
    } else {
      setExportPreset("all");
      setExportStartDate("");
      setExportEndDate("");
    }
    setExportIncludeTableFilters(true);
    setShowExportModal(true);
  }

  function applyPreset(presetKey) {
    setExportPreset(presetKey);
    const today = new Date();
    const todayStr = toLocalYMD(today);

    if (presetKey === "all") {
      setExportStartDate("");
      setExportEndDate("");
    } else if (presetKey === "today") {
      setExportStartDate(todayStr);
      setExportEndDate(todayStr);
      setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    } else if (presetKey === "7days") {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      setExportStartDate(toLocalYMD(d));
      setExportEndDate(todayStr);
      setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    } else if (presetKey === "30days") {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      setExportStartDate(toLocalYMD(d));
      setExportEndDate(todayStr);
      setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    } else if (presetKey === "thisMonth") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setExportStartDate(toLocalYMD(firstDay));
      setExportEndDate(todayStr);
      setCalendarMonth(firstDay);
    }
  }

  function handleCalendarDayClick(dayYMD) {
    setExportPreset("custom");
    if (!exportStartDate || (exportStartDate && exportEndDate)) {
      setExportStartDate(dayYMD);
      setExportEndDate("");
    } else {
      if (dayYMD < exportStartDate) {
        setExportEndDate(exportStartDate);
        setExportStartDate(dayYMD);
      } else {
        setExportEndDate(dayYMD);
      }
    }
  }

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      cells.push({
        day: d,
        ymd: toLocalYMD(dateObj),
      });
    }
    return cells;
  }, [calendarMonth]);

  async function handleConfirmExportCSV() {
    if (exportStartDate && exportEndDate && exportStartDate > exportEndDate) {
      toast.error("Start Date cannot be later than End Date.");
      return;
    }

    setExporting(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();

      if (exportIncludeTableFilters) {
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
        if (category !== "all") params.set("category", category);
        if (role !== "all") params.set("role", role);
        if (severity !== "all") params.set("severity", severity);
      }

      if (exportStartDate) params.set("startDate", exportStartDate);
      if (exportEndDate) params.set("endDate", exportEndDate);

      const res = await fetch(`${API}/admin/system-logs/export?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const rangeSuffix =
        exportStartDate && exportEndDate
          ? `${exportStartDate}_to_${exportEndDate}`
          : exportStartDate
          ? `from_${exportStartDate}`
          : exportEndDate
          ? `until_${exportEndDate}`
          : new Date().toISOString().slice(0, 10);
      a.download = `system-logs-${rangeSuffix}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setShowExportModal(false);
      toast.success("System logs exported to CSV");
    } catch (err) {
      console.error("CSV export error:", err);
      toast.error("Failed to export system logs");
    } finally {
      setExporting(false);
    }
  }

  function handleClearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setCategory("all");
    setRole("all");
    setSeverity("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }

  const hasActiveFilters =
    Boolean(search.trim()) ||
    category !== "all" ||
    role !== "all" ||
    severity !== "all" ||
    Boolean(startDate) ||
    Boolean(endDate);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#001840] flex items-center gap-2">
            <Activity size={22} className="text-[#F5C400]" />
            System Audit Logs
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Complete audit trail of authentication, enrollment actions, scheduling, grading, and administrative changes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-[#001840] hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openExportModal}
            disabled={exporting || summary.totalLogs === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#001840] text-white text-sm font-semibold hover:bg-[#102A71] transition-colors disabled:opacity-50"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Audit Logs</p>
            <p className="text-2xl font-bold text-[#001840] mt-1">{summary.totalLogs.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">All recorded system events</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#001840]/10 text-[#001840] flex items-center justify-center">
            <Activity size={22} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Today&apos;s Activity</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{summary.todayLogs.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">Events logged since midnight</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Enrollment &amp; Sections</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{summary.enrollmentEventsCount.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">Submissions, approvals &amp; sectioning</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileText size={22} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Warnings &amp; Security</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{summary.warningAndErrorCount.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">Failed logins, returns, deletions</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldAlert size={22} />
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, email, action, description, ID, IP..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]"
            />
          </div>

          {/* Category filter */}
          <div>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by category"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#001840]/20"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>

          {/* Role filter */}
          <div>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by user role"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#001840]/20"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="registrar">Registrar</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="guest">Guest / Unauthenticated</option>
            </select>
          </div>

          {/* Severity filter */}
          <div>
            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by severity"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#001840]/20"
            >
              <option value="all">All Severities</option>
              <option value="success">Success</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              title="Start date"
              aria-label="Start date"
              className="w-1/2 px-2 py-2 border border-gray-200 rounded-xl text-xs bg-white text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#001840]/20"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              title="End date"
              aria-label="End date"
              className="w-1/2 px-2 py-2 border border-gray-200 rounded-xl text-xs bg-white text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#001840]/20"
            />
          </div>
        </div>

        {/* Category Quick Pills + Clear Filters */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-gray-400 mr-1 flex items-center gap-1">
              <Filter size={12} /> Quick Filter:
            </span>
            <button
              type="button"
              onClick={() => {
                setCategory("all");
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                category === "all"
                  ? "bg-[#001840] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All ({summary.totalLogs})
            </button>
            {Object.entries(CATEGORY_META).map(([key, meta]) => {
              const count = summary.categoryBreakdown?.[key] || 0;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setCategory(key);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    category === key
                      ? "bg-[#001840] text-[#F5C400]"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {meta.label} ({count})
                </button>
              );
            })}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <X size={13} /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center gap-2.5 text-sm text-gray-400">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-[#001840] rounded-full animate-spin" />
            Loading system audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center">
            <Activity size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">No system logs match your filters</p>
            <p className="text-xs text-gray-400 mt-1">
              Try adjusting your search query, category, or date range.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    {[
                      "Timestamp",
                      "Actor / Role",
                      "Category & Action",
                      "Description & Target",
                      "Severity",
                      "Request / IP",
                      "Details",
                    ].map((header) => (
                      <th
                        key={header}
                        className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => {
                    const catMeta = CATEGORY_META[log.category] || {
                      label: log.category || "System",
                      badge: "bg-gray-100 text-gray-700 border-gray-200",
                    };
                    const sevMeta = SEVERITY_META[log.severity] || SEVERITY_META.info;
                    const SevIcon = sevMeta.icon;
                    const roleBadge = ROLE_BADGES[log.userRole] || ROLE_BADGES.guest;
                    const methodBadge = METHOD_BADGES[log.method] || METHOD_BADGES.GET;

                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                      >
                        {/* Timestamp */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className="text-xs font-semibold text-[#001840]">
                            {log.createdAt
                              ? new Date(log.createdAt).toLocaleString("en-PH", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {formatRelativeTime(log.createdAt)}
                          </p>
                        </td>

                        {/* Actor / Role */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${roleBadge}`}
                            >
                              {log.userRole || "system"}
                            </span>
                            <span className="font-semibold text-[#001840] text-xs truncate max-w-[150px]">
                              {log.userName || "System"}
                            </span>
                          </div>
                          {log.userEmail && (
                            <p className="text-[11px] text-gray-400 truncate max-w-[200px] mt-0.5">
                              {log.userEmail}
                            </p>
                          )}
                        </td>

                        {/* Category & Action */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${catMeta.badge}`}
                          >
                            {catMeta.label}
                          </span>
                          <p className="font-mono text-[11px] font-semibold text-gray-600 mt-1">
                            {log.action}
                          </p>
                        </td>

                        {/* Description & Target */}
                        <td className="px-4 py-3.5 max-w-md">
                          <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">
                            {log.description}
                          </p>
                          {(log.targetType || log.targetId) && (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-mono">
                              {log.targetType || "resource"}
                              {log.targetId ? ` #${log.targetId}` : ""}
                            </span>
                          )}
                        </td>

                        {/* Severity */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${sevMeta.badge}`}
                          >
                            <SevIcon size={12} />
                            {sevMeta.label}
                          </span>
                          {log.statusCode && (
                            <span className="ml-1.5 text-[11px] font-mono text-gray-400">
                              HTTP {log.statusCode}
                            </span>
                          )}
                        </td>

                        {/* Request / IP */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {log.method && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${methodBadge}`}
                              >
                                {log.method}
                              </span>
                            )}
                            <span className="font-mono text-[11px] text-gray-500 truncate max-w-[160px]">
                              {log.endpoint || "—"}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                            IP: {log.ipAddress || "127.0.0.1"}
                          </p>
                        </td>

                        {/* Inspect button */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#001840] bg-gray-100 hover:bg-[#001840] hover:text-white transition-colors"
                          >
                            <Eye size={13} />
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-3">
              <p className="text-xs text-gray-500">
                Showing{" "}
                <span className="font-semibold text-[#001840]">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-[#001840]">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{" "}
                of <span className="font-semibold text-[#001840]">{pagination.total}</span> audit log
                entries
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-[#001840] hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span className="text-xs font-semibold text-[#001840] px-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-[#001840] hover:bg-gray-50 disabled:opacity-40"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Export CSV with Calendar Modal */}
      {showExportModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-[#001840] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar size={18} className="text-[#F5C400]" />
                <div>
                  <h3 className="font-bold text-base">Export System Logs to CSV</h3>
                  <p className="text-xs text-white/70">Select a Start Date and End Date range for your report</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* Quick Presets */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Quick Date Range Presets
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "all", label: "All Time" },
                    { id: "today", label: "Today" },
                    { id: "7days", label: "Last 7 Days" },
                    { id: "30days", label: "Last 30 Days" },
                    { id: "thisMonth", label: "This Month" },
                    { id: "custom", label: "Custom Range" },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                        exportPreset === preset.id
                          ? "bg-[#001840] text-[#F5C400] border-[#001840]"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Date & End Date Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#001840] mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => {
                      setExportPreset("custom");
                      setExportStartDate(e.target.value);
                      if (e.target.value) {
                        const d = new Date(`${e.target.value}T00:00:00`);
                        if (!isNaN(d.getTime())) {
                          setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#001840]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#001840] mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={exportEndDate}
                    min={exportStartDate || undefined}
                    onChange={(e) => {
                      setExportPreset("custom");
                      setExportEndDate(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#001840]/20"
                  />
                </div>
              </div>

              {/* Interactive Calendar Grid */}
              <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarMonth(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                      )
                    }
                    className="p-1.5 rounded-lg hover:bg-gray-200 text-[#001840]"
                    title="Previous month"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-[#001840] uppercase tracking-wider">
                    {calendarMonth.toLocaleDateString("en-PH", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarMonth(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                      )
                    }
                    className="p-1.5 rounded-lg hover:bg-gray-200 text-[#001840]"
                    title="Next month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {WEEKDAYS.map((wd) => (
                    <div key={wd} className="text-[11px] font-bold text-gray-400 py-1">
                      {wd}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((cell, idx) => {
                    if (!cell) {
                      return <div key={`empty-${idx}`} className="h-8" />;
                    }
                    const isStart = exportStartDate === cell.ymd;
                    const isEnd = exportEndDate === cell.ymd;
                    const isInRange =
                      exportStartDate &&
                      exportEndDate &&
                      cell.ymd > exportStartDate &&
                      cell.ymd < exportEndDate;

                    return (
                      <button
                        key={cell.ymd}
                        type="button"
                        onClick={() => handleCalendarDayClick(cell.ymd)}
                        className={`h-8 rounded-lg text-xs font-semibold transition-colors ${
                          isStart || isEnd
                            ? "bg-[#001840] text-[#F5C400] font-bold shadow-sm"
                            : isInRange
                            ? "bg-[#001840]/15 text-[#001840]"
                            : "text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-gray-400 mt-3 text-center">
                  {exportStartDate || exportEndDate ? (
                    <>
                      Selected Range:{" "}
                      <span className="font-semibold text-[#001840]">
                        {exportStartDate || "Beginning"}
                      </span>{" "}
                      to{" "}
                      <span className="font-semibold text-[#001840]">
                        {exportEndDate || "Present"}
                      </span>
                    </>
                  ) : (
                    "Click a date on the calendar to set Start Date and End Date (or leave empty for All Time)"
                  )}
                </p>
              </div>

              {/* Filter Scope Checkbox */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportIncludeTableFilters}
                  onChange={(e) => setExportIncludeTableFilters(e.target.checked)}
                  className="rounded border-gray-300 text-[#001840] focus:ring-[#001840]"
                />
                <span className="text-xs text-gray-700">
                  Apply current category, role, severity &amp; search filters to the exported CSV
                </span>
              </label>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExportCSV}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#001840] text-white text-xs font-semibold hover:bg-[#102A71] transition-colors disabled:opacity-50"
              >
                <Download size={14} />
                {exporting ? "Downloading..." : "Download CSV"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Inspection Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#001840] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Activity size={18} className="text-[#F5C400]" />
                <div>
                  <h3 className="font-bold text-base">Audit Log Entry #{selectedLog.id}</h3>
                  <p className="text-xs text-white/70 font-mono">{selectedLog.action}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* Summary Banner */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Event Description
                </p>
                <p className="text-sm font-medium text-[#001840] leading-relaxed">
                  {selectedLog.description}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-gray-100 space-y-1">
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    <User size={13} /> Actor Information
                  </p>
                  <p className="font-semibold text-[#001840]">
                    {selectedLog.userName || "System / Guest"}
                  </p>
                  <p className="text-xs text-gray-500">{selectedLog.userEmail || "No email recorded"}</p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      ROLE_BADGES[selectedLog.userRole] || ROLE_BADGES.guest
                    }`}
                  >
                    Role: {selectedLog.userRole || "system"}
                    {selectedLog.userId ? ` (ID #${selectedLog.userId})` : ""}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-gray-100 space-y-1">
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    <Calendar size={13} /> Timestamp &amp; Classification
                  </p>
                  <p className="font-semibold text-[#001840]">
                    {selectedLog.createdAt
                      ? new Date(selectedLog.createdAt).toLocaleString("en-PH", {
                          dateStyle: "medium",
                          timeStyle: "medium",
                        })
                      : "—"}
                  </p>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                        CATEGORY_META[selectedLog.category]?.badge || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {CATEGORY_META[selectedLog.category]?.label || selectedLog.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        SEVERITY_META[selectedLog.severity]?.badge || ""
                      }`}
                    >
                      {(selectedLog.severity || "info").toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-gray-100 space-y-1">
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    <Globe size={13} /> HTTP Request &amp; Client IP
                  </p>
                  <p className="font-mono text-xs font-semibold text-[#001840] break-all">
                    {selectedLog.method || "POST"} {selectedLog.endpoint || "—"}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">
                    Status Code: {selectedLog.statusCode ?? 200} · IP: {selectedLog.ipAddress || "127.0.0.1"}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-gray-100 space-y-1">
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    <FileText size={13} /> Affected Target Resource
                  </p>
                  <p className="font-semibold text-[#001840] capitalize">
                    {selectedLog.targetType || "General System"}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">
                    Target ID: {selectedLog.targetId || "N/A"}
                  </p>
                </div>
              </div>

              {/* Structured JSON Payload */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                  <Terminal size={13} /> Recorded Event Metadata (Sanitized)
                </p>
                <pre className="bg-[#001840] text-emerald-300 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed">
                  {JSON.stringify(parseDetails(selectedLog.details), null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-[#001840] text-white text-xs font-semibold hover:bg-[#102A71] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
