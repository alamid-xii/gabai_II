import { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Calendar, Clock, RefreshCw, Trash2, CheckCircle2,
  AlertCircle, BookOpen, UserCheck, Layers, MapPin,
  Filter, Download, ChevronDown, AlertTriangle, ShieldCheck, Info
} from "lucide-react";
import { API, tok } from "./RegistrarShared";

// 30-minute intervals from 7:30 AM to 5:30 PM (21 slot marks, 20 intervals)
const TIME_SLOTS = [
  "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM",
  "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM",
  "5:30 PM"
];

// Start times: up to 5:00 PM
const START_TIME_OPTIONS = TIME_SLOTS.slice(0, -1);
// End times: from 8:00 AM
const END_TIME_OPTIONS = TIME_SLOTS.slice(1);

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_HEADERS = [
  { full: "Monday", short: "Mon" },
  { full: "Tuesday", short: "Tue" },
  { full: "Wednesday", short: "Wed" },
  { full: "Thursday", short: "Thu" },
  { full: "Friday", short: "Fri" }
];

// Convert standard time string to minutes from midnight (e.g. "7:30 AM" -> 450)
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3] ? match[3].toUpperCase() : null;

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

export function SchedulesTab() {
  // Data from database
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states (matching image with user customizations)
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [startTime, setStartTime] = useState("7:30 AM");
  const [endTime, setEndTime] = useState("9:00 AM");
  const [room, setRoom] = useState("");

  // Grid filter states (defaults to Grade 7's first section)
  const [sectionFilter, setSectionFilter] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [conflictOnlyFilter, setConflictOnlyFilter] = useState(false);

  const activeSectionObj = useMemo(() => {
    if (!sectionFilter || sectionFilter === "all") return null;
    return sections.find(s => String(s.id) === String(sectionFilter)) || null;
  }, [sections, sectionFilter]);

  // Portal container for header stats
  const [headerContainer, setHeaderContainer] = useState(null);

  useEffect(() => {
    const titleEl = document.querySelector("header h1");
    const header = titleEl ? titleEl.closest("header") : document.querySelector("header");
    if (!header) return;

    let slot = header.querySelector("#registrar-header-slot");
    let created = false;
    if (!slot) {
      slot = document.createElement("div");
      slot.id = "registrar-header-slot";
      slot.className = "flex-1 flex items-center justify-end gap-2 flex-wrap ml-auto";
      header.appendChild(slot);
      created = true;
    } else {
      slot.className = "flex-1 flex items-center justify-end gap-2 flex-wrap ml-auto";
    }
    setHeaderContainer(slot);

    return () => {
      if (created && slot && slot.parentNode) {
        slot.parentNode.removeChild(slot);
      }
    };
  }, []);

  // Fetch all saved data
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [subjRes, secRes, teacherRes, schedRes] = await Promise.all([
        fetch(`${API}/academic/subjects`, { headers: tok() }).catch(() => null),
        fetch(`${API}/admin/sections`, { headers: tok() }).catch(() => null),
        fetch(`${API}/admin/teachers`, { headers: tok() }).catch(() => null),
        fetch(`${API}/academic/schedules`, { headers: tok() }).catch(() => null),
      ]);

      if (subjRes && subjRes.ok) {
        const d = await subjRes.json();
        setSubjects(Array.isArray(d) ? d : []);
      }

      let secArray = [];
      if (secRes && secRes.ok) {
        const d = await secRes.json();
        secArray = Array.isArray(d) ? d : (d.sections || []);
        setSections(secArray);

        // Default to Grade 7's first section schedule
        const firstG7 = secArray.find(s =>
          String(s.yearLevel) === "7" ||
          String(s.gradeLevel || '').includes("7") ||
          String(s.name || '').toLowerCase().includes("grade 7")
        ) || secArray[0];

        if (firstG7) {
          setSectionFilter(prev => (!prev || prev === "all" ? String(firstG7.id) : prev));
        }
      }

      let teacherList = [];
      if (teacherRes && teacherRes.ok) {
        const d = await teacherRes.json();
        teacherList = Array.isArray(d) ? d : (d.teachers || []);
      }

      // Ensure all faculty assigned across sections are always in the teacher dropdown
      const existingNames = new Set(teacherList.map(t => (t.name || '').trim().toLowerCase()));
      secArray.forEach((s, idx) => {
        if (s.instructor && !existingNames.has(s.instructor.trim().toLowerCase())) {
          existingNames.add(s.instructor.trim().toLowerCase());
          teacherList.push({
            id: s.teacherId || 9000 + idx,
            name: s.instructor.trim(),
            email: `${s.instructor.toLowerCase().replace(/[^a-z0-9]/g, '.')}@emc.edu.ph`
          });
        }
      });
      teacherList.sort((a, b) => a.name.localeCompare(b.name));
      setTeachers(teacherList);

      if (schedRes && schedRes.ok) {
        const d = await schedRes.json();
        setSchedules(Array.isArray(d) ? d : []);
      }
    } catch (err) {
      toast.error("Failed to load scheduler data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Default to Grade 7's first section schedule once sections are available
  useEffect(() => {
    if (sections.length > 0 && !sectionFilter) {
      const firstG7 = sections.find(s =>
        String(s.yearLevel) === "7" ||
        String(s.gradeLevel || '').includes("7") ||
        String(s.name || '').toLowerCase().includes("grade 7")
      ) || sections[0];
      if (firstG7) {
        setSectionFilter(String(firstG7.id));
      }
    }
  }, [sections, sectionFilter]);

  // When a section is selected, auto-fill room if the section has one
  const handleSectionSelect = (secId) => {
    setSelectedSectionId(secId);
    if (!secId) return;
    const matchedSec = sections.find(s => String(s.id) === String(secId));
    if (matchedSec) {
      if (matchedSec.room && !room) {
        setRoom(matchedSec.room);
      }
      if (matchedSec.teacherId && !selectedTeacherId) {
        setSelectedTeacherId(String(matchedSec.teacherId));
      }
    }
  };

  // Convert time string (e.g. "7:30 AM") to slot index
  const timeToIndex = (tStr) => {
    return TIME_SLOTS.indexOf(tStr);
  };

  // ── Existing schedule conflict detection for all loaded schedules ───────────
  const conflictedScheduleIds = useMemo(() => {
    const ids = new Set();
    for (let i = 0; i < schedules.length; i++) {
      for (let j = i + 1; j < schedules.length; j++) {
        const a = schedules[i];
        const b = schedules[j];
        if (a.dayOfWeek !== b.dayOfWeek) continue;

        const aStart = parseTimeToMinutes(a.startTime);
        const aEnd = parseTimeToMinutes(a.endTime);
        const bStart = parseTimeToMinutes(b.startTime);
        const bEnd = parseTimeToMinutes(b.endTime);
        if (aStart === null || aEnd === null || bStart === null || bEnd === null) continue;

        const hasOverlap = Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
        if (!hasOverlap) continue;

        // Teacher overlap conflict
        const sameTeacher = (a.teacherId && b.teacherId && String(a.teacherId) === String(b.teacherId)) ||
          (a.teacherName && b.teacherName && a.teacherName.trim().toLowerCase() === b.teacherName.trim().toLowerCase());

        // Section overlap conflict
        const sameSection = (a.sectionId && b.sectionId && String(a.sectionId) === String(b.sectionId)) ||
          (a.sectionName && b.sectionName && a.sectionName.trim().toLowerCase() === b.sectionName.trim().toLowerCase());

        // Room overlap conflict
        const sameRoom = a.room && b.room && a.room.trim().toLowerCase() === b.room.trim().toLowerCase();

        if (sameTeacher || sameSection || sameRoom) {
          ids.add(a.id);
          ids.add(b.id);
        }
      }
    }
    return ids;
  }, [schedules]);

  // ── Selected Teacher's existing schedule on the selected day ───────────────
  const teacherDaySchedules = useMemo(() => {
    if (!selectedTeacherId || !selectedDay) return [];
    const matchedTeacher = teachers.find(t => String(t.id) === String(selectedTeacherId));
    const tName = matchedTeacher?.name?.trim()?.toLowerCase();
    return schedules
      .filter(s => {
        if (s.dayOfWeek !== selectedDay) return false;
        return (s.teacherId && String(s.teacherId) === String(selectedTeacherId)) ||
          (s.teacherName && s.teacherName.trim().toLowerCase() === tName);
      })
      .sort((a, b) => (parseTimeToMinutes(a.startTime) || 0) - (parseTimeToMinutes(b.startTime) || 0));
  }, [selectedTeacherId, selectedDay, schedules, teachers]);

  // ── Real-time Active Conflict Detection for the Current Form Input ───────────
  const activeConflict = useMemo(() => {
    if (!selectedDay || !startTime || !endTime) return null;

    const newStart = parseTimeToMinutes(startTime);
    const newEnd = parseTimeToMinutes(endTime);
    if (newStart === null || newEnd === null || newStart >= newEnd) return null;

    const matchedTeacher = teachers.find(t => String(t.id) === String(selectedTeacherId));
    const matchedSec = sections.find(s => String(s.id) === String(selectedSectionId));

    const targetTeacherName = matchedTeacher?.name?.trim()?.toLowerCase();
    const targetSectionName = matchedSec
      ? `grade ${matchedSec.yearLevel} - ${matchedSec.code}`.toLowerCase()
      : null;
    const targetRoom = room ? room.trim().toLowerCase() : null;

    for (const s of schedules) {
      if (s.dayOfWeek !== selectedDay) continue;

      const existStart = parseTimeToMinutes(s.startTime);
      const existEnd = parseTimeToMinutes(s.endTime);
      if (existStart === null || existEnd === null) continue;

      // Check overlap: max(newStart, existStart) < min(newEnd, existEnd)
      const hasOverlap = Math.max(newStart, existStart) < Math.min(newEnd, existEnd);
      if (!hasOverlap) continue;

      // 1. Teacher Conflict: Every teacher is assigned to at most one class or activity at any given time
      if (matchedTeacher) {
        const isSameTeacherId = s.teacherId && String(s.teacherId) === String(selectedTeacherId);
        const isSameTeacherName = s.teacherName && s.teacherName.trim().toLowerCase() === targetTeacherName;
        if (isSameTeacherId || isSameTeacherName) {
          return {
            type: "teacher",
            title: "Teacher Time Slot Conflict",
            description: `${s.teacherName} is already assigned to teach ${s.subjectName} (${s.sectionName}) on ${selectedDay} from ${s.startTime} to ${s.endTime}.`,
            conflictSchedule: s
          };
        }
      }

      // 2. Section Conflict: No class section can have two subjects at the same time
      if (matchedSec) {
        const isSameSecId = s.sectionId && String(s.sectionId) === String(selectedSectionId);
        const isSameSecName = targetSectionName && s.sectionName && s.sectionName.trim().toLowerCase().includes(matchedSec.code.toLowerCase());
        if (isSameSecId || isSameSecName) {
          return {
            type: "section",
            title: "Grade & Section Conflict",
            description: `${s.sectionName} is already scheduled for ${s.subjectName} with ${s.teacherName} on ${selectedDay} from ${s.startTime} to ${s.endTime}.`,
            conflictSchedule: s
          };
        }
      }

      // 3. Room Conflict: Room cannot be occupied by multiple classes simultaneously
      if (targetRoom && s.room && s.room.trim().toLowerCase() === targetRoom) {
        return {
          type: "room",
          title: "Room Booking Conflict",
          description: `Room "${s.room}" is already reserved for ${s.sectionName} (${s.subjectName}) on ${selectedDay} from ${s.startTime} to ${s.endTime}.`,
          conflictSchedule: s
        };
      }
    }

    return null;
  }, [selectedDay, startTime, endTime, selectedTeacherId, selectedSectionId, room, schedules, teachers, sections]);

  // Handle schedule creation
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSubjectId) {
      toast.error("Please select a subject");
      return;
    }
    if (!selectedSectionId) {
      toast.error("Please select a grade and section");
      return;
    }
    if (!selectedTeacherId) {
      toast.error("Please select a teacher");
      return;
    }
    if (!selectedDay) {
      toast.error("Please select a day of the week");
      return;
    }

    const startIdx = timeToIndex(startTime);
    const endIdx = timeToIndex(endTime);

    if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
      toast.error("End time must be later than start time");
      return;
    }

    // Block submission if there is an active conflict
    if (activeConflict) {
      toast.error(`Schedule conflict: ${activeConflict.description}`);
      return;
    }

    const matchedSubj = subjects.find(s => String(s.id) === String(selectedSubjectId));
    const matchedSec = sections.find(s => String(s.id) === String(selectedSectionId));
    const matchedTeacher = teachers.find(t => String(t.id) === String(selectedTeacherId));

    const subjName = matchedSubj ? (matchedSubj.description || matchedSubj.code) : "Subject";
    const secName = matchedSec
      ? `Grade ${matchedSec.yearLevel} - ${matchedSec.code}`
      : "Section";
    const teacherName = matchedTeacher ? matchedTeacher.name : "Teacher";

    setSaving(true);
    try {
      const payload = {
        subjectId: matchedSubj?.id,
        subjectCode: matchedSubj?.code,
        subjectName: subjName,
        sectionId: matchedSec?.id,
        sectionName: secName,
        gradeLevel: matchedSec ? `Grade ${matchedSec.yearLevel}` : null,
        teacherId: matchedTeacher?.id,
        teacherName: teacherName,
        dayOfWeek: selectedDay,
        startTime,
        endTime,
        room: room || matchedSec?.room || null,
        schoolYear: matchedSec?.schoolYear || null,
        semester: matchedSec?.semester || null,
      };

      const res = await fetch(`${API}/academic/schedules`, {
        method: "POST",
        headers: tok(),
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to schedule class");

      toast.success(`Scheduled ${subjName} for ${secName} on ${selectedDay}!`);
      // Add to local state immediately
      if (resData.schedule) {
        setSchedules(prev => [...prev, resData.schedule]);
      } else {
        loadAllData();
      }

      // Clear all input fields
      setSelectedSubjectId("");
      setSelectedSectionId("");
      setSelectedTeacherId("");
      setSelectedDay("");
      setStartTime("7:30 AM");
      setEndTime("9:00 AM");
      setRoom("");
    } catch (err) {
      toast.error(err.message || "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  // Delete a schedule
  const handleDeleteSchedule = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this scheduled class?")) return;

    try {
      const res = await fetch(`${API}/academic/schedules/${id}`, {
        method: "DELETE",
        headers: tok(),
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Schedule removed successfully");
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch {
      toast.error("Failed to delete schedule");
    }
  };

  // Filtered schedules for grid (by default shows Grade 7's first section)
  const displaySchedules = useMemo(() => {
    return schedules.filter(s => {
      if (conflictOnlyFilter && !conflictedScheduleIds.has(s.id)) return false;
      if (sectionFilter && sectionFilter !== "all") {
        const matchesId = s.sectionId && String(s.sectionId) === String(sectionFilter);
        const matchesCode = activeSectionObj && s.sectionName && s.sectionName.toLowerCase().includes(activeSectionObj.code.toLowerCase());
        if (!matchesId && !matchesCode) return false;
      }
      if (teacherFilter !== "all" && String(s.teacherId) !== String(teacherFilter)) return false;
      return true;
    });
  }, [schedules, sectionFilter, teacherFilter, conflictOnlyFilter, conflictedScheduleIds, activeSectionObj]);

  return (
    <div className="space-y-6">
      {/* Portaled Header Stats */}
      {headerContainer &&
        createPortal(
          <div className="flex items-center gap-2 flex-wrap">
            {conflictedScheduleIds.size === 0 ? (
              <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                <ShieldCheck size={13} className="text-emerald-600" />
                100% Conflict-Free
              </span>
            ) : (
              <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1.5 animate-pulse shadow-2xs">
                <AlertTriangle size={13} className="text-amber-600" />
                {conflictedScheduleIds.size} Overlap Conflict(s)
              </span>
            )}
            <span className="text-xs bg-[#EEF2FF] text-[#102A71] font-semibold px-2.5 py-1 rounded-full border border-[#102A71]/15">
              {schedules.length} Scheduled Classes
            </span>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
              {sections.length} Sections
            </span>
            <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full border border-blue-200">
              {teachers.length} Teachers
            </span>
            <button
              onClick={loadAllData}
              className="p-1.5 text-gray-500 hover:text-[#001840] hover:bg-gray-100 rounded-lg transition-colors ml-1"
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>
          </div>,
          headerContainer
        )}

      {/* Main Two-Column Layout (Form on Left, Grid on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT PANEL: Scheduling Form (matching user reference) ─────── */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 sticky top-20">
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            {/* 1. Subject (instead of subject code) */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Subject
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840] bg-white font-medium text-gray-800 shadow-xs"
              >
                <option value="">Select Subject</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.description || sub.code} {sub.code ? `(${sub.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Grade and Section (instead of year & section) */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Grade and Section
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => handleSectionSelect(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840] bg-white font-medium text-gray-800 shadow-xs"
              >
                <option value="">Select Grade & Section</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Grade {sec.yearLevel} - {sec.code} ({sec.course}{sec.strand ? ` · ${sec.strand}` : ""})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Teacher (instead of professor) */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Teacher
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840] bg-white font-medium text-gray-800 shadow-xs"
              >
                <option value="">Select Teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              {/* Teacher Daily Commitment & Load Insight */}
              {selectedTeacherId && (
                <div className="mt-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs space-y-1">
                  <div className="flex items-center justify-between text-gray-700 font-semibold">
                    <span className="flex items-center gap-1 text-[11px] text-gray-700">
                      <Clock size={12} className="text-[#001840]" />
                      <span>{selectedDay} Schedule:</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 font-medium">
                      {teacherDaySchedules.length} class{teacherDaySchedules.length !== 1 ? 'es' : ''}
                    </span>
                  </div>
                  {teacherDaySchedules.length === 0 ? (
                    <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} /> Completely open on {selectedDay}
                    </p>
                  ) : (
                    <div className="space-y-1 pt-0.5 max-h-24 overflow-y-auto">
                      {teacherDaySchedules.map((s) => (
                        <div key={s.id} className="text-[11px] flex items-center justify-between bg-white px-2 py-1 rounded-md border border-gray-100 text-gray-700">
                          <span className="font-semibold text-gray-900">{s.startTime}–{s.endTime}</span>
                          <span className="text-gray-500 truncate max-w-[140px] text-[10px]">{s.subjectName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. Day of Week (Monday to Friday) */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Day of Week
              </label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840] bg-white font-medium text-gray-800 shadow-xs"
              >
                <option value="">Select Day</option>
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Start Time & End Time (7:30 to 5:30) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Start Time
                </label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840] bg-white font-medium text-gray-800 shadow-xs"
                >
                  {START_TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  End Time
                </label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840] bg-white font-medium text-gray-800 shadow-xs"
                >
                  {END_TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Optional Room / Venue */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Room / Venue <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. Room 101, Science Lab 2"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001840]/20 bg-white"
                />
              </div>
            </div>

            {/* ── Real-Time Conflict Prevention Feedback ─────────────────────── */}
            {activeConflict ? (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 text-red-700 font-bold text-xs">
                  <AlertTriangle size={15} className="shrink-0 text-red-600" />
                  <span>{activeConflict.title}</span>
                </div>
                <p className="text-xs text-red-700 leading-relaxed font-medium">
                  {activeConflict.description}
                </p>
                <div className="text-[11px] text-red-600 bg-white/70 p-2 rounded-lg border border-red-100 flex items-center gap-1.5">
                  <Info size={13} className="shrink-0" />
                  <span>Teachers can only be assigned to at most one class at any given time.</span>
                </div>
              </div>
            ) : selectedTeacherId && selectedSectionId ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex items-center gap-2 text-emerald-800">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span className="font-medium">100% Conflict-Free: Both teacher & section are clear for this time slot.</span>
              </div>
            ) : null}

            {/* Action Button: Protected against conflicts */}
            <div className="pt-2">
              {activeConflict ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3 bg-red-100 border border-red-200 text-red-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-not-allowed opacity-90 shadow-xs"
                  title="Resolve the conflicting time slot to proceed"
                >
                  <AlertTriangle size={16} />
                  Cannot Schedule (Conflict Detected)
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-[#16a34a] hover:bg-[#15803d] text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Schedule Class
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── RIGHT PANEL: Timetable Grid (matching user reference) ───── */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          {/* Top Filter & Toolbar for the grid */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[#001840]" />
              <span className="font-bold text-xs uppercase tracking-wider text-[#001840]">
                {activeSectionObj ? `Grade ${activeSectionObj.yearLevel} - ${activeSectionObj.code} Timetable` : "Weekly Class Timetable"} (7:30 AM – 5:30 PM)
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Conflict filter toggle button if any conflict exists */}
              {conflictedScheduleIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setConflictOnlyFilter(prev => !prev)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    conflictOnlyFilter
                      ? 'bg-red-500 text-white border-red-600 shadow-xs'
                      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  }`}
                  title={conflictOnlyFilter ? "Click to view all scheduled classes" : "Filter grid to only show overlapping classes"}
                >
                  <AlertTriangle size={12} />
                  <span>{conflictOnlyFilter ? 'Show All Classes' : `Filter ${conflictedScheduleIds.size} Conflict(s)`}</span>
                </button>
              )}

              {/* Filter by Section */}
              <div className="relative">
                <select
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-[#001840]"
                >
                  <option value="all">All Sections ({sections.length})</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      Grade {s.yearLevel} - {s.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Teacher */}
              <div className="relative">
                <select
                  value={teacherFilter}
                  onChange={(e) => setTeacherFilter(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-[#001840]"
                >
                  <option value="all">All Teachers ({teachers.length})</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {(sectionFilter !== "all" || teacherFilter !== "all" || conflictOnlyFilter) && (
                <button
                  onClick={() => {
                    setSectionFilter("all");
                    setTeacherFilter("all");
                    setConflictOnlyFilter(false);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                  title="Show all sections"
                >
                  Show All
                </button>
              )}
            </div>
          </div>

          {/* Grid Container */}
          <div className="overflow-x-auto p-4">
            <div className="min-w-[650px]">
              {/* Grid Header (Time, Mon, Tue, Wed, Thu, Fri) */}
              <div className="grid grid-cols-6 border-b border-gray-200 bg-gray-100/90 text-gray-700 font-bold text-xs text-center py-2.5 rounded-t-xl">
                <div>Time</div>
                {DAY_HEADERS.map((dh) => (
                  <div key={dh.full}>{dh.short}</div>
                ))}
              </div>

              {/* Main Grid Area: 20 rows of 40px height */}
              <div
                className="relative grid grid-cols-6 border-l border-r border-b border-gray-200 bg-white"
                style={{
                  gridTemplateRows: `repeat(${TIME_SLOTS.length - 1}, 42px)`
                }}
              >
                {/* Time Labels (Column 1) */}
                {TIME_SLOTS.slice(0, -1).map((slot, rIdx) => (
                  <div
                    key={`time-${rIdx}`}
                    style={{
                      gridColumn: 1,
                      gridRow: rIdx + 1
                    }}
                    className="border-b border-r border-gray-200 text-[11px] font-semibold text-gray-700 flex items-center justify-center bg-gray-50/60 select-none"
                  >
                    {slot}
                  </div>
                ))}

                {/* Empty cell backgrounds for each day column */}
                {DAYS_OF_WEEK.map((day, dIdx) =>
                  TIME_SLOTS.slice(0, -1).map((_, rIdx) => (
                    <div
                      key={`cell-${dIdx}-${rIdx}`}
                      style={{
                        gridColumn: dIdx + 2,
                        gridRow: rIdx + 1
                      }}
                      className="border-b border-r border-gray-100/90 hover:bg-gray-50/40 transition-colors"
                    />
                  ))
                )}

                {/* Scheduled Class Cards (Exact Mint Green cards matching user image, with conflict alerts if overlapping) */}
                {displaySchedules.map((item) => {
                  const dayIdx = DAYS_OF_WEEK.indexOf(item.dayOfWeek);
                  if (dayIdx === -1) return null;

                  const startIdx = timeToIndex(item.startTime);
                  const endIdx = timeToIndex(item.endTime);
                  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return null;

                  // CSS Grid 1-based indexing
                  const colStart = dayIdx + 2;
                  const rowStart = startIdx + 1;
                  const rowEnd = endIdx + 1;

                  const hasConflict = conflictedScheduleIds.has(item.id);

                  return (
                    <div
                      key={item.id}
                      style={{
                        gridColumn: colStart,
                        gridRow: `${rowStart} / ${rowEnd}`,
                        zIndex: hasConflict ? 15 : 10
                      }}
                      className="p-1"
                    >
                      <div
                        className={`h-full w-full rounded-lg p-2 text-center flex flex-col justify-center items-center shadow-xs transition-all relative group overflow-hidden ${
                          hasConflict
                            ? 'bg-red-50 hover:bg-red-100 border-2 border-red-400 text-red-950 shadow-sm'
                            : 'bg-[#dcfce7] hover:bg-[#bbf7d0] border border-[#86efac]'
                        }`}
                      >
                        {/* Conflict Warning Chip if overlapping */}
                        {hasConflict && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 mb-0.5 rounded text-[9px] font-bold bg-red-600 text-white shadow-xs">
                            <AlertTriangle size={9} /> Conflict Overlap
                          </span>
                        )}

                        {/* Subject in bold */}
                        <p className={`font-bold text-xs leading-tight truncate w-full px-1 ${hasConflict ? 'text-red-900 font-extrabold' : 'text-gray-900'}`}>
                          {item.subjectName}
                        </p>

                        {/* Grade and Section */}
                        <p className={`text-[11px] font-medium leading-tight truncate w-full mt-0.5 px-1 ${hasConflict ? 'text-red-800' : 'text-gray-800'}`}>
                          {item.sectionName}
                        </p>

                        {/* Teacher */}
                        <p className={`text-[11px] leading-tight truncate w-full px-1 ${hasConflict ? 'text-red-700 font-bold' : 'text-gray-700'}`}>
                          {item.teacherName}
                        </p>

                        {/* Time range */}
                        <p className={`text-[10px] font-semibold mt-0.5 ${hasConflict ? 'text-red-700' : 'text-gray-600'}`}>
                          {item.startTime}–{item.endTime}
                        </p>

                        {/* Room if present */}
                        {item.room && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono mt-0.5 ${hasConflict ? 'bg-white/80 text-red-800 border border-red-200' : 'bg-white/70 text-gray-700'}`}>
                            {item.room}
                          </span>
                        )}

                        {/* Delete Button on hover */}
                        <button
                          onClick={(e) => handleDeleteSchedule(item.id, e)}
                          className="absolute top-1 right-1 p-1 bg-red-100 text-red-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 cursor-pointer shadow-xs"
                          title="Remove class to clear schedule slot"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SchedulesTab;
