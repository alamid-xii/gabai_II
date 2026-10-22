import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Calendar,
  Clock,
  Download,
  Filter,
  Grid3X3,
  List,
  MapPin,
  RefreshCw,
  School,
  Users,
  X,
  BookOpen,
  Info,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "../../components/Navbar";
import { useAuth } from "../../contexts/AuthContext";
import { API } from "../../config/api";

const tok = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json"
});

const TIME_SLOTS = [
  "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM",
  "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM",
  "5:30 PM"
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Helper to convert time strings like "7:30 AM" into minutes from midnight
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3] ? match[3].toUpperCase() : null;

  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

// Map time string to 30-min slot index (0 = 7:30 AM)
const timeToSlotIndex = (timeStr) => {
  const min = parseTimeToMinutes(timeStr);
  if (min === null) return -1;
  const startMin = 7 * 60 + 30; // 7:30 AM = 450 min
  const slotIdx = Math.round((min - startMin) / 30);
  return slotIdx >= 0 && slotIdx < TIME_SLOTS.length ? slotIdx : -1;
};

// Palette for subject cards
const SUBJECT_COLORS = [
  { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900", accent: "bg-blue-600", light: "text-blue-700" },
  { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-900", accent: "bg-indigo-600", light: "text-indigo-700" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900", accent: "bg-emerald-600", light: "text-emerald-700" },
  { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-900", accent: "bg-violet-600", light: "text-violet-700" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", accent: "bg-amber-600", light: "text-amber-700" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-900", accent: "bg-rose-600", light: "text-rose-700" },
  { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-900", accent: "bg-cyan-600", light: "text-cyan-700" },
  { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-900", accent: "bg-teal-600", light: "text-teal-700" }
];

const getSubjectColor = (subjectName = "") => {
  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) {
    hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % SUBJECT_COLORS.length;
  return SUBJECT_COLORS[idx];
};

export function TeacherSchedule() {
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState(null);
  const [sectionFilter, setSectionFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [selectedDayTab, setSelectedDayTab] = useState("Monday");
  const [selectedClass, setSelectedClass] = useState(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Auth Guard
  useEffect(() => {
    if (!authLoading && (!isLoggedIn || user?.role !== "teacher")) {
      navigate(!isLoggedIn ? "/login" : "/", { replace: true });
    }
  }, [authLoading, isLoggedIn, user, navigate]);

  // Set default tab to today if it's a weekday
  useEffect(() => {
    const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
    if (DAYS_OF_WEEK.includes(todayName)) {
      setSelectedDayTab(todayName);
    }
  }, []);

  // Fetch Teacher Schedule
  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const url = sectionFilter && sectionFilter !== "all"
        ? `${API}/teacher/my-schedule?sectionId=${sectionFilter}`
        : `${API}/teacher/my-schedule`;

      const res = await fetch(url, { headers: tok() });
      if (!res.ok) throw new Error("Failed to load schedule");
      const data = await res.json();
      setScheduleData(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load your teaching schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !isLoggedIn || user?.role !== "teacher") return;
    fetchSchedule();
  }, [authLoading, isLoggedIn, user, sectionFilter]);

  const schedules = scheduleData?.schedules || [];
  const distinctSections = scheduleData?.sections || [];
  const advisorySections = scheduleData?.advisorySections || [];

  // Filter schedules based on section filter if applied locally
  const displaySchedules = useMemo(() => {
    if (!sectionFilter || sectionFilter === "all") return schedules;
    return schedules.filter(s => String(s.sectionId) === String(sectionFilter));
  }, [schedules, sectionFilter]);

  // Compute Weekly Statistics
  const stats = useMemo(() => {
    let totalMinutes = 0;
    const uniqueSections = new Set();
    const uniqueSubjects = new Set();

    displaySchedules.forEach(s => {
      if (s.sectionName) uniqueSections.add(s.sectionName);
      if (s.subjectName) uniqueSubjects.add(s.subjectName);

      const start = parseTimeToMinutes(s.startTime);
      const end = parseTimeToMinutes(s.endTime);
      if (start !== null && end !== null && end > start) {
        totalMinutes += end - start;
      }
    });

    const totalHours = (totalMinutes / 60).toFixed(1);

    const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const todayCount = displaySchedules.filter(s => s.dayOfWeek === todayName).length;

    return {
      totalClasses: displaySchedules.length,
      totalHours,
      sectionsCount: uniqueSections.size,
      subjectsCount: uniqueSubjects.size,
      todayCount
    };
  }, [displaySchedules]);

  // Handle PDF Download
  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const url = sectionFilter && sectionFilter !== "all"
        ? `${API}/teacher/my-schedule/pdf?sectionId=${sectionFilter}`
        : `${API}/teacher/my-schedule/pdf`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const safeName = (user?.name || "Teacher").replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `Faculty_Schedule_${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Schedule downloaded successfully!");
      setShowDownloadModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to download schedule PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (authLoading || !isLoggedIn || user?.role !== "teacher") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  return (
    <div className="min-h-screen bg-gray-50 lg:pl-65">
      <Navbar
        variant="teacher"
        activeView="schedule"
        onViewChange={(view) => navigate(`/teacher/${view}`)}
      />

      <main className="min-h-screen pt-20 lg:pt-6 p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ── Top Header & Stats ────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#102A71] bg-[#EEF2FF] px-2.5 py-0.5 rounded-full">
                  <Calendar size={12} /> Faculty Portal
                </span>
                {stats.todayCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <Clock size={12} /> {stats.todayCount} class{stats.todayCount !== 1 ? "es" : ""} today
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black text-[#001840] tracking-tight">My Teaching Schedule</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Weekly timetable and classroom assignments for your teaching load.
              </p>
            </div>

            {/* Actions: View Toggle + Download + Refresh */}
            <div className="flex items-center flex-wrap gap-2.5">
              {/* Section Filter Dropdown */}
              {distinctSections.length > 0 && (
                <div className="relative">
                  <select
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    className="h-9 pl-8 pr-8 text-xs font-semibold bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-[#001840] focus:ring-2 focus:ring-[#102A71] focus:outline-hidden appearance-none cursor-pointer transition-all"
                  >
                    <option value="all">All Sections ({distinctSections.length})</option>
                    {distinctSections.map((sec, idx) => (
                      <option key={sec.sectionId || idx} value={sec.sectionId}>
                        {sec.sectionName || `Section ${sec.sectionId}`}
                      </option>
                    ))}
                  </select>
                  <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              )}

              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 p-0.5 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === "grid"
                      ? "bg-white text-[#001840] shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <Grid3X3 size={13} />
                  <span>Weekly Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === "list"
                      ? "bg-white text-[#001840] shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <List size={13} />
                  <span>Agenda List</span>
                </button>
              </div>

              {/* Download PDF Button */}
              <button
                type="button"
                onClick={() => setShowDownloadModal(true)}
                className="h-9 px-3.5 rounded-xl bg-[#001840] hover:bg-[#102A71] text-white text-xs font-bold transition-all shadow-xs hover:shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={13} className="text-[#FFDC5F]" />
                <span>Download Schedule</span>
              </button>

              {/* Refresh */}
              <button
                type="button"
                onClick={fetchSchedule}
                title="Refresh schedule"
                className="h-9 w-9 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 flex items-center justify-center transition-all cursor-pointer"
              >
                <RefreshCw size={14} className={loading ? "animate-spin text-[#102A71]" : ""} />
              </button>
            </div>
          </div>

          {/* ── Summary Cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#EEF2FF] flex items-center justify-center text-[#102A71] shrink-0">
                <BookOpen size={20} />
              </div>
              <div>
                <p className="text-xl font-black text-[#001840]">{stats.totalClasses}</p>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Scheduled Classes</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xl font-black text-[#001840]">{stats.totalHours} hrs</p>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Weekly Teaching Load</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
                <School size={20} />
              </div>
              <div>
                <p className="text-xl font-black text-[#001840]">{stats.sectionsCount}</p>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Sections Handled</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700 shrink-0">
                <Users size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#001840] truncate max-w-[130px]">
                  {advisorySections.length > 0
                    ? advisorySections.map(s => `Grade ${s.yearLevel} - ${s.code}`).join(", ")
                    : "None"}
                </p>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Advisory Section</p>
              </div>
            </div>
          </div>

          {/* ── Content View ──────────────────────────────────────────────── */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 border-3 border-[#001840] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-semibold text-[#001840]">Loading your schedule...</p>
              <p className="text-xs text-gray-400 mt-1">Fetching weekly assignments and section timetables</p>
            </div>
          ) : displaySchedules.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
              <Calendar size={44} className="mx-auto mb-3 text-gray-300" />
              <h3 className="text-base font-bold text-[#001840]">No Teaching Schedules Found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                {sectionFilter !== "all"
                  ? "No classes scheduled for the selected section. Try choosing 'All Sections'."
                  : "You currently have no class schedules assigned to your account. Please coordinate with the registrar to set up your teaching timetable."}
              </p>
              {sectionFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setSectionFilter("all")}
                  className="mt-4 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition-colors cursor-pointer"
                >
                  View All Sections
                </button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            /* ── Weekly Timetable Grid View ─────────────────────────────── */
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#102A71]" />
                  <span className="text-xs font-bold text-[#001840] uppercase tracking-wider">
                    Weekly Timetable Grid (Monday – Friday, 7:30 AM – 5:30 PM)
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-blue-100 border border-blue-300 inline-block" />
                    <span>Scheduled Class</span>
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="font-semibold text-gray-700">{displaySchedules.length} total blocks</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[900px] select-none">
                  {/* Grid Column Headers */}
                  <div className="grid grid-cols-[80px_repeat(5,1fr)] bg-[#001840] text-white text-xs font-bold sticky top-0 z-10">
                    <div className="py-3 px-2 text-center text-gray-300 border-r border-white/10 uppercase tracking-wider">
                      Time
                    </div>
                    {DAYS_OF_WEEK.map((day) => {
                      const isToday = day === todayName;
                      return (
                        <div
                          key={day}
                          className={`py-3 px-3 text-center border-r border-white/10 flex items-center justify-center gap-1.5 ${
                            isToday ? "bg-[#102A71] text-[#FFDC5F]" : ""
                          }`}
                        >
                          <span>{day}</span>
                          {isToday && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FFDC5F] animate-pulse" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Timetable Rows & Cells */}
                  <div className="relative grid grid-cols-[80px_repeat(5,1fr)]">
                    {/* Time Column (Left) */}
                    <div className="divide-y divide-gray-100 border-r border-gray-200 bg-gray-50/50">
                      {TIME_SLOTS.slice(0, -1).map((slot, i) => (
                        <div
                          key={slot}
                          className={`h-11 px-2 flex items-center justify-center text-[11px] font-semibold text-gray-500 ${
                            i % 2 === 0 ? "bg-gray-50/80" : ""
                          }`}
                        >
                          {slot}
                        </div>
                      ))}
                    </div>

                    {/* Day Columns */}
                    {DAYS_OF_WEEK.map((day) => {
                      const isToday = day === todayName;
                      const dayClasses = displaySchedules.filter((s) => s.dayOfWeek === day);

                      return (
                        <div
                          key={day}
                          className={`relative border-r border-gray-200 divide-y divide-gray-100 ${
                            isToday ? "bg-amber-50/20" : "bg-white"
                          }`}
                        >
                          {/* 20 slot background cells (30 mins each = 44px height) */}
                          {TIME_SLOTS.slice(0, -1).map((_, i) => (
                            <div
                              key={i}
                              className={`h-11 ${
                                i % 2 === 0
                                  ? isToday
                                    ? "bg-amber-50/30"
                                    : "bg-gray-50/30"
                                  : ""
                              }`}
                            />
                          ))}

                          {/* Render class blocks for this day */}
                          {dayClasses.map((item) => {
                            const startIdx = timeToSlotIndex(item.startTime);
                            const endIdx = timeToSlotIndex(item.endTime);

                            if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
                              return null;
                            }

                            const topPx = startIdx * 44 + 2;
                            const heightPx = (endIdx - startIdx) * 44 - 4;
                            const colors = getSubjectColor(item.subjectName);

                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setSelectedClass(item)}
                                style={{
                                  top: `${topPx}px`,
                                  height: `${heightPx}px`,
                                  left: "3px",
                                  right: "3px"
                                }}
                                className={`absolute rounded-xl p-2.5 text-left border ${colors.bg} ${colors.border} shadow-xs hover:shadow-md hover:scale-[1.01] transition-all flex flex-col justify-between overflow-hidden group cursor-pointer z-5`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/80 text-gray-700 shadow-2xs truncate">
                                      {item.sectionName}
                                    </span>
                                    {item.room && (
                                      <span className="text-[10px] font-semibold text-gray-500 truncate flex items-center gap-0.5 shrink-0">
                                        <MapPin size={9} />
                                        {item.room}
                                      </span>
                                    )}
                                  </div>
                                  <p className={`text-xs font-bold leading-tight line-clamp-2 ${colors.text}`}>
                                    {item.subjectName}
                                  </p>
                                </div>

                                <div className="mt-1 flex items-center justify-between text-[10px] font-semibold text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Clock size={10} className="text-gray-400" />
                                    {item.startTime} – {item.endTime}
                                  </span>
                                  {item.subjectCode && (
                                    <span className="text-gray-400 font-mono text-[9px] uppercase">
                                      {item.subjectCode}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ── Agenda List View ───────────────────────────────────────── */
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Day of Week Tabs */}
              <div className="flex items-center border-b border-gray-100 px-4 pt-3 gap-2 overflow-x-auto bg-gray-50/50">
                {DAYS_OF_WEEK.map((day) => {
                  const dayCount = displaySchedules.filter((s) => s.dayOfWeek === day).length;
                  const isSelected = selectedDayTab === day;
                  const isToday = day === todayName;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDayTab(day)}
                      className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border-b-2 cursor-pointer ${
                        isSelected
                          ? "bg-white text-[#001840] border-[#001840] shadow-xs"
                          : "text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-100/50"
                      }`}
                    >
                      <span>{day}</span>
                      {isToday && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold uppercase">
                          Today
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          isSelected
                            ? "bg-[#001840] text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {dayCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Day Agenda Classes */}
              <div className="p-6">
                {displaySchedules.filter((s) => s.dayOfWeek === selectedDayTab).length === 0 ? (
                  <div className="py-12 text-center text-gray-400">
                    <Clock size={36} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-semibold text-gray-600">No classes scheduled on {selectedDayTab}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Enjoy your free time or prepare lesson plans!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displaySchedules
                      .filter((s) => s.dayOfWeek === selectedDayTab)
                      .sort((a, b) => (parseTimeToMinutes(a.startTime) || 0) - (parseTimeToMinutes(b.startTime) || 0))
                      .map((item, idx) => {
                        const colors = getSubjectColor(item.subjectName);

                        return (
                          <div
                            key={item.id || idx}
                            onClick={() => setSelectedClass(item)}
                            className="bg-white border border-gray-100 hover:border-gray-200 rounded-2xl p-4 transition-all shadow-xs hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                          >
                            <div className="flex items-start gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colors.bg} ${colors.text} border ${colors.border}`}>
                                <BookOpen size={20} />
                              </div>

                              <div>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="px-2.5 py-0.5 rounded-full bg-[#001840] text-white text-[10px] font-bold">
                                    {item.sectionName}
                                  </span>
                                  {item.gradeLevel && (
                                    <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                      Grade {item.gradeLevel}
                                    </span>
                                  )}
                                  {item.room && (
                                    <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                      <MapPin size={11} /> {item.room}
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-base font-bold text-[#001840]">
                                  {item.subjectName}
                                </h4>
                                {item.subjectCode && (
                                  <p className="text-xs font-mono text-gray-400 mt-0.5">
                                    Code: {item.subjectCode}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                              <div className="text-right">
                                <span className="text-xs font-bold text-[#001840] block">
                                  {item.startTime} – {item.endTime}
                                </span>
                                <span className="text-[11px] text-gray-400">
                                  {(() => {
                                    const st = parseTimeToMinutes(item.startTime);
                                    const en = parseTimeToMinutes(item.endTime);
                                    if (st && en && en > st) {
                                      const diff = en - st;
                                      const hrs = Math.floor(diff / 60);
                                      const mins = diff % 60;
                                      return `${hrs > 0 ? `${hrs}h ` : ""}${mins > 0 ? `${mins}m` : ""}`;
                                    }
                                    return "";
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── Class Details Modal ───────────────────────────────────────────── */}
      {selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-[#001840] text-white p-6 relative">
              <button
                type="button"
                onClick={() => setSelectedClass(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {selectedClass.dayOfWeek}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFDC5F] text-[#001840]">
                  {selectedClass.sectionName}
                </span>
              </div>
              <h3 className="text-xl font-black leading-snug">{selectedClass.subjectName}</h3>
              {selectedClass.subjectCode && (
                <p className="text-xs text-white/70 font-mono mt-1">Code: {selectedClass.subjectCode}</p>
              )}
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-400 font-semibold block text-[10px] uppercase">Schedule Time</span>
                  <span className="font-bold text-[#001840] text-sm mt-0.5 block">
                    {selectedClass.startTime} – {selectedClass.endTime}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-400 font-semibold block text-[10px] uppercase">Classroom</span>
                  <span className="font-bold text-emerald-700 text-sm mt-0.5 block flex items-center gap-1">
                    <MapPin size={13} />
                    {selectedClass.room || "Room TBA"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-400 font-semibold block text-[10px] uppercase">Section</span>
                  <span className="font-bold text-[#001840] text-sm mt-0.5 block truncate">
                    {selectedClass.sectionName}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-400 font-semibold block text-[10px] uppercase">Grade Level</span>
                  <span className="font-bold text-[#001840] text-sm mt-0.5 block">
                    Grade {selectedClass.gradeLevel || "N/A"}
                  </span>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClass(null);
                    navigate("/teacher/classes");
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#001840] hover:bg-[#102A71] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <BookOpen size={13} />
                  <span>Open Class & Grades</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedClass(null)}
                  className="py-2.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Download Schedule Modal ───────────────────────────────────────── */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] text-[#102A71] flex items-center justify-center mx-auto mb-4">
              <Download size={26} />
            </div>

            <h3 className="text-lg font-black text-[#001840] tracking-tight">Download Teaching Schedule</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Download a 1-page printable PDF copy of your weekly teaching timetable, complete with classroom and section assignments.
            </p>

            <div className="my-5 p-3 rounded-xl bg-gray-50 border border-gray-100 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Faculty:</span>
                <span className="font-bold text-[#001840]">{user?.name || "Faculty Member"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Filter:</span>
                <span className="font-bold text-[#001840]">
                  {sectionFilter === "all" ? "All Sections" : `Section ${sectionFilter}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Total Classes:</span>
                <span className="font-bold text-[#001840]">{displaySchedules.length} blocks</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowDownloadModal(false)}
                disabled={downloading}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#001840] hover:bg-[#102A71] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {downloading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download size={14} className="text-[#FFDC5F]" />
                    <span>Download PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherSchedule;
