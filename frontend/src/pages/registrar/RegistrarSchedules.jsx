import { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Calendar, Clock, RefreshCw, Trash2, CheckCircle2,
  AlertCircle, BookOpen, UserCheck, Layers, MapPin,
  Filter, Download, ChevronDown, AlertTriangle, ShieldCheck, Info,
  Coffee, Utensils
} from "lucide-react";
import { API, tok } from "./RegistrarShared";

// 15-minute intervals from 7:30 AM to 5:30 PM (41 slot marks, 40 intervals)
const TIME_SLOTS = [
  "7:30 AM", "7:45 AM", "8:00 AM", "8:15 AM", "8:30 AM", "8:45 AM",
  "9:00 AM", "9:15 AM", "9:30 AM", "9:45 AM", "10:00 AM", "10:15 AM",
  "10:30 AM", "10:45 AM", "11:00 AM", "11:15 AM", "11:30 AM", "11:45 AM",
  "12:00 PM", "12:15 PM", "12:30 PM", "12:45 PM", "1:00 PM", "1:15 PM",
  "1:30 PM", "1:45 PM", "2:00 PM", "2:15 PM", "2:30 PM", "2:45 PM",
  "3:00 PM", "3:15 PM", "3:30 PM", "3:45 PM", "4:00 PM", "4:15 PM",
  "4:30 PM", "4:45 PM", "5:00 PM", "5:15 PM", "5:30 PM"
];

// Start times: up to 5:15 PM
const START_TIME_OPTIONS = TIME_SLOTS.slice(0, -1);
// End times: from 7:45 AM to 5:30 PM
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
  const [scheduleType, setScheduleType] = useState("academic"); // 'academic' | 'health_break' | 'lunch_break'
  const [applyAllWeekdays, setApplyAllWeekdays] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [startTime, setStartTime] = useState("7:30 AM");
  const [endTime, setEndTime] = useState("9:00 AM");
  const [room, setRoom] = useState("");

  const handleTypeChange = (type) => {
    setScheduleType(type);
    if (type === "health_break") {
      setSelectedSubjectId("HEALTH_BREAK");
      setSelectedTeacherId("");
      setStartTime("9:30 AM");
      setEndTime("10:00 AM");
    } else if (type === "lunch_break") {
      setSelectedSubjectId("LUNCH_BREAK");
      setSelectedTeacherId("");
      setStartTime("12:00 PM");
      setEndTime("1:00 PM");
    } else {
      setSelectedSubjectId("");
      setStartTime("7:30 AM");
      setEndTime("9:00 AM");
    }
  };

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
        if (!selectedSectionId) {
          setSelectedSectionId(String(firstG7.id));
        }
      }
    }
  }, [sections, sectionFilter, selectedSectionId]);

  // When a section is selected, auto-fill room and sync the weekly timetable on the left
  const handleSectionSelect = (secId) => {
    setSelectedSectionId(secId);
    if (!secId) return;

    // Immediately reflect on the weekly timetable
    setSectionFilter(String(secId));

    const matchedSec = sections.find(s => String(s.id) === String(secId));
    if (matchedSec) {
      if (matchedSec.room && !room) {
        setRoom(matchedSec.room);
      }
      if (matchedSec.teacherId && !selectedTeacherId) {
        setSelectedTeacherId(String(matchedSec.teacherId));
      }
    }
    // Clear subject selection when section changes so user chooses appropriate subject
    setSelectedSubjectId("");
  };

  // Filter curriculum subjects matching the selected section's grade level and program
  const filteredSubjects = useMemo(() => {
    if (!selectedSectionId) return subjects;
    const matchedSec = sections.find(s => String(s.id) === String(selectedSectionId));
    if (!matchedSec) return subjects;

    const matching = subjects.filter(sub => {
      if (sub.programCode && matchedSec.course && sub.programCode !== matchedSec.course) return false;
      if (sub.gradeLevel && matchedSec.yearLevel && Number(sub.gradeLevel) !== Number(matchedSec.yearLevel)) return false;
      if (matchedSec.course === 'SHS' && matchedSec.strand && sub.strand && sub.strand !== matchedSec.strand) return false;
      return true;
    });

    return matching.length > 0 ? matching : subjects;
  }, [subjects, selectedSectionId, sections]);

  // Convert time string (e.g. "7:30 AM" or "9:45 AM") to slot index (15-min slots)
  const timeToIndex = (tStr) => {
    if (!tStr) return -1;
    const directIdx = TIME_SLOTS.indexOf(tStr);
    if (directIdx !== -1) return directIdx;
    const min = parseTimeToMinutes(tStr);
    if (min === null) return -1;
    const startMin = 7 * 60 + 30; // 7:30 AM = 450 min
    const slotIdx = Math.round((min - startMin) / 15);
    return slotIdx >= 0 && slotIdx < TIME_SLOTS.length ? slotIdx : -1;
  };

  // ── Existing schedule conflict detection for all loaded schedules ───────────
  const conflictedScheduleIds = useMemo(() => {
    const ids = new Set();
    const isBreakSched = (item) =>
      item.subjectCode === 'BREAK' ||
      item.subjectCode === 'HEALTH-BREAK' ||
      item.subjectCode === 'LUNCH-BREAK' ||
      item.teacherName === 'No Teacher' ||
      item.teacherName === '—' ||
      (item.subjectName && (item.subjectName.toLowerCase().includes('break') || item.subjectName.toLowerCase().includes('recess')));

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

        // Teacher overlap conflict (only applies if neither is a break)
        const neitherIsBreak = !isBreakSched(a) && !isBreakSched(b);
        const sameTeacher = neitherIsBreak && (
          (a.teacherId && b.teacherId && String(a.teacherId) === String(b.teacherId)) ||
          (a.teacherName && b.teacherName && a.teacherName.trim().toLowerCase() === b.teacherName.trim().toLowerCase())
        );

        // Section overlap conflict (two activities for the same section at the same time)
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
    if ((!selectedDay && !applyAllWeekdays) || !startTime || !endTime) return null;

    const newStart = parseTimeToMinutes(startTime);
    const newEnd = parseTimeToMinutes(endTime);
    if (newStart === null || newEnd === null || newStart >= newEnd) return null;

    const isBreak = scheduleType !== 'academic';
    const targetDays = applyAllWeekdays ? DAYS_OF_WEEK : [selectedDay];

    const matchedTeacher = !isBreak ? teachers.find(t => String(t.id) === String(selectedTeacherId)) : null;
    const matchedSec = sections.find(s => String(s.id) === String(selectedSectionId));

    const targetTeacherName = matchedTeacher?.name?.trim()?.toLowerCase();
    const targetSectionName = matchedSec
      ? `grade ${matchedSec.yearLevel} - ${matchedSec.code}`.toLowerCase()
      : null;
    const targetRoom = room ? room.trim().toLowerCase() : null;

    for (const day of targetDays) {
      for (const s of schedules) {
        if (s.dayOfWeek !== day) continue;

        const existStart = parseTimeToMinutes(s.startTime);
        const existEnd = parseTimeToMinutes(s.endTime);
        if (existStart === null || existEnd === null) continue;

        // Check overlap: max(newStart, existStart) < min(newEnd, existEnd)
        const hasOverlap = Math.max(newStart, existStart) < Math.min(newEnd, existEnd);
        if (!hasOverlap) continue;

        // 1. Teacher Conflict (only for classes with teachers)
        if (!isBreak && matchedTeacher && s.teacherName && s.teacherName !== 'No Teacher' && s.teacherName !== '—') {
          const isSameTeacherId = s.teacherId && String(s.teacherId) === String(selectedTeacherId);
          const isSameTeacherName = s.teacherName && s.teacherName.trim().toLowerCase() === targetTeacherName;
          if (isSameTeacherId || isSameTeacherName) {
            return {
              type: "teacher",
              title: "Teacher Time Slot Conflict",
              description: `${s.teacherName} is already assigned to teach ${s.subjectName} (${s.sectionName}) on ${day} from ${s.startTime} to ${s.endTime}.`,
              conflictSchedule: s
            };
          }
        }

        // 2. Section Conflict: Section cannot have two classes or breaks at the same time
        if (matchedSec) {
          const isSameSecId = s.sectionId && String(s.sectionId) === String(selectedSectionId);
          const isSameSecName = targetSectionName && s.sectionName && s.sectionName.trim().toLowerCase().includes(matchedSec.code.toLowerCase());
          if (isSameSecId || isSameSecName) {
            const teacherNote = s.teacherName && s.teacherName !== 'No Teacher' && s.teacherName !== '—' ? ` with ${s.teacherName}` : '';
            return {
              type: "section",
              title: "Grade & Section Conflict",
              description: `${s.sectionName} is already scheduled for ${s.subjectName}${teacherNote} on ${day} from ${s.startTime} to ${s.endTime}.`,
              conflictSchedule: s
            };
          }
        }

        // 3. Room Conflict: Room cannot be occupied by multiple activities simultaneously
        if (targetRoom && s.room && s.room.trim().toLowerCase() === targetRoom) {
          return {
            type: "room",
            title: "Room Booking Conflict",
            description: `Room "${s.room}" is already reserved for ${s.sectionName} (${s.subjectName}) on ${day} from ${s.startTime} to ${s.endTime}.`,
            conflictSchedule: s
          };
        }
      }
    }

    return null;
  }, [selectedDay, applyAllWeekdays, startTime, endTime, selectedTeacherId, selectedSectionId, room, schedules, teachers, sections, scheduleType]);

  // Handle schedule creation
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSectionId) {
      toast.error("Please select a grade and section");
      return;
    }

    const isBreak = scheduleType !== 'academic';

    if (!isBreak && !selectedSubjectId) {
      toast.error("Please select a subject");
      return;
    }
    if (!isBreak && !selectedTeacherId) {
      toast.error("Please select a teacher");
      return;
    }
    if (!applyAllWeekdays && !selectedDay) {
      toast.error("Please select a day of the week or check 'All Weekdays'");
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

    const matchedSubj = !isBreak ? subjects.find(s => String(s.id) === String(selectedSubjectId)) : null;
    const matchedSec = sections.find(s => String(s.id) === String(selectedSectionId));
    const matchedTeacher = !isBreak ? teachers.find(t => String(t.id) === String(selectedTeacherId)) : null;

    const subjName = isBreak
      ? (scheduleType === 'health_break' ? 'Health Break' : 'Lunch Break')
      : (matchedSubj ? (matchedSubj.description || matchedSubj.code) : "Subject");
    const secName = matchedSec
      ? `Grade ${matchedSec.yearLevel} - ${matchedSec.code}`
      : "Section";
    const teacherName = isBreak ? "No Teacher" : (matchedTeacher ? matchedTeacher.name : "Teacher");

    setSaving(true);
    try {
      const payload = {
        subjectId: matchedSubj?.id || null,
        subjectCode: isBreak ? (scheduleType === 'health_break' ? 'HEALTH-BREAK' : 'LUNCH-BREAK') : (matchedSubj?.code || null),
        subjectName: subjName,
        sectionId: matchedSec?.id,
        sectionName: secName,
        gradeLevel: matchedSec ? `Grade ${matchedSec.yearLevel}` : null,
        teacherId: matchedTeacher?.id || null,
        teacherName: teacherName,
        dayOfWeek: applyAllWeekdays ? 'All Weekdays' : selectedDay,
        days: applyAllWeekdays ? DAYS_OF_WEEK : [selectedDay],
        startTime,
        endTime,
        room: room || matchedSec?.room || null,
        schoolYear: matchedSec?.schoolYear || null,
        semester: matchedSec?.semester || null,
        isBreak: isBreak,
      };

      const res = await fetch(`${API}/academic/schedules`, {
        method: "POST",
        headers: tok(),
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to schedule");

      toast.success(resData.message || `Scheduled ${subjName} for ${secName}!`);
      
      // Add to local state immediately
      if (Array.isArray(resData.schedules)) {
        setSchedules(prev => [...prev, ...resData.schedules]);
      } else if (resData.schedule) {
        setSchedules(prev => [...prev, resData.schedule]);
      } else {
        loadAllData();
      }

      // Clear input fields
      if (!isBreak) {
        setSelectedSubjectId("");
        setSelectedTeacherId("");
      }
      setSelectedDay("");
      setApplyAllWeekdays(false);
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

      {/* Main Two-Column Layout (Form on Left, Timetable on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT PANEL: Scheduling Form (lg:col-span-4) ─────── */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 sticky top-20">
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            {/* 1. Grade and Section (above Subject) */}
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

            {/* Schedule Category Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Schedule Type
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl border border-gray-200/80">
                <button
                  type="button"
                  onClick={() => handleTypeChange("academic")}
                  className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    scheduleType === "academic"
                      ? "bg-white text-[#001840] shadow-xs border border-gray-200/60"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <BookOpen size={13} />
                  <span>Subject</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange("health_break")}
                  className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    scheduleType === "health_break"
                      ? "bg-amber-100 text-amber-900 shadow-xs border border-amber-300"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Coffee size={13} className="text-amber-700" />
                  <span>Health Break</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange("lunch_break")}
                  className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    scheduleType === "lunch_break"
                      ? "bg-orange-100 text-orange-950 shadow-xs border border-orange-300"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Utensils size={13} className="text-orange-700" />
                  <span>Lunch Break</span>
                </button>
              </div>
            </div>

            {/* Academic Mode: Subject & Teacher Selection */}
            {scheduleType === "academic" ? (
              <>
                {/* 2. Subject (filtered for selected section) */}
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
                    {filteredSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.description || sub.code} {sub.code ? `(${sub.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Teacher */}
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
                          <span>{selectedDay || "Selected Day"} Schedule:</span>
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 font-medium">
                          {teacherDaySchedules.length} class{teacherDaySchedules.length !== 1 ? 'es' : ''}
                        </span>
                      </div>
                      {teacherDaySchedules.length === 0 ? (
                        <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 size={12} /> Completely open on {selectedDay || "this day"}
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
              </>
            ) : (
              /* Break Mode: Info banner showing no teacher needed */
              <div className={`p-3.5 rounded-xl border space-y-2 ${
                scheduleType === "lunch_break"
                  ? "bg-orange-50/70 border-orange-200"
                  : "bg-amber-50/70 border-amber-200"
              }`}>
                <div className="flex items-center gap-2.5">
                  {scheduleType === "lunch_break" ? (
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold shrink-0">
                      <Utensils size={16} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                      <Coffee size={16} />
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">
                      {scheduleType === "lunch_break" ? "Lunch Break (Midday Meal)" : "Health Break (Recess / Wellness)"}
                    </h4>
                    <p className="text-[11px] text-gray-600">
                      No teacher required • Reserved break period for students
                    </p>
                  </div>
                </div>
                <div className="pt-1 border-t border-gray-200/50 flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                  <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                  <span>No teacher conflict checks will apply to this time slot.</span>
                </div>
              </div>
            )}

            {/* 4. Day of Week (Monday to Friday or All Weekdays) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-gray-800">
                  Day of Week
                </label>
                <label className="flex items-center gap-1.5 text-xs text-[#001840] font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applyAllWeekdays}
                    onChange={(e) => setApplyAllWeekdays(e.target.checked)}
                    className="rounded text-[#001840] focus:ring-0 cursor-pointer"
                  />
                  <span>All Weekdays (Mon–Fri)</span>
                </label>
              </div>

              {!applyAllWeekdays ? (
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  required={!applyAllWeekdays}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840] bg-white font-medium text-gray-800 shadow-xs"
                >
                  <option value="">Select Day</option>
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-blue-700 shrink-0" />
                  <span>Will be scheduled for Monday through Friday</span>
                </div>
              )}
            </div>

            {/* 5. Start Time & End Time */}
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
                  placeholder={scheduleType === "academic" ? "e.g. Room 101, Science Lab 2" : "e.g. Canteen, School Grounds"}
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
                  <span>Please choose a different time slot or remove the overlapping schedule item.</span>
                </div>
              </div>
            ) : selectedSectionId && (scheduleType !== "academic" || selectedTeacherId) ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex items-center gap-2 text-emerald-800">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>Time slot is clear and ready to schedule.</span>
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
                  className={`w-full py-3 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer ${
                    scheduleType === "health_break"
                      ? "bg-[#d97706] hover:bg-[#b45309]"
                      : scheduleType === "lunch_break"
                        ? "bg-[#ea580c] hover:bg-[#c2410c]"
                        : "bg-[#16a34a] hover:bg-[#15803d]"
                  }`}
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      {scheduleType === "health_break" ? (
                        <>
                          <Coffee size={16} />
                          Schedule Health Break
                        </>
                      ) : scheduleType === "lunch_break" ? (
                        <>
                          <Utensils size={16} />
                          Schedule Lunch Break
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          Schedule Class
                        </>
                      )}
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── RIGHT PANEL: Timetable Grid (lg:col-span-8) ───── */}
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
                  className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold flex items-center gap-1 transition-all cursor-pointer ${conflictOnlyFilter
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setSectionFilter(val);
                    if (val && val !== "all") {
                      handleSectionSelect(val);
                    }
                  }}
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

              {/* Main Grid Area: 40 rows of 34px height for 15-min intervals */}
              <div
                className="relative grid grid-cols-6 border-l border-r border-b border-gray-200 bg-white"
                style={{
                  gridTemplateRows: `repeat(${TIME_SLOTS.length - 1}, 34px)`
                }}
              >
                {/* Time Labels (Column 1) */}
                {TIME_SLOTS.slice(0, -1).map((slot, rIdx) => {
                  const isHour = slot.endsWith(":00 AM") || slot.endsWith(":00 PM");
                  const isHalfHour = slot.endsWith(":30 AM") || slot.endsWith(":30 PM");
                  const isMajor = isHour || isHalfHour;
                  return (
                    <div
                      key={`time-${rIdx}`}
                      style={{
                        gridColumn: 1,
                        gridRow: rIdx + 1
                      }}
                      className={`border-r flex items-center justify-center select-none ${
                        isMajor
                          ? "border-b border-gray-200 bg-gray-100/90 font-bold text-gray-800 text-[11px]"
                          : "border-b border-gray-100 bg-gray-50/50 font-medium text-gray-400 text-[9.5px]"
                      }`}
                    >
                      {slot}
                    </div>
                  );
                })}

                {/* Empty cell backgrounds for each day column */}
                {DAYS_OF_WEEK.map((day, dIdx) =>
                  TIME_SLOTS.slice(0, -1).map((slot, rIdx) => {
                    const isMajor = slot.endsWith(":00 AM") || slot.endsWith(":00 PM") || slot.endsWith(":30 AM") || slot.endsWith(":30 PM");
                    return (
                      <div
                        key={`cell-${dIdx}-${rIdx}`}
                        style={{
                          gridColumn: dIdx + 2,
                          gridRow: rIdx + 1
                        }}
                        className={`border-r border-gray-100/90 hover:bg-gray-50/40 transition-colors ${
                          isMajor ? "border-b border-gray-200/90" : "border-b border-dashed border-gray-100"
                        }`}
                      />
                    );
                  })
                )}

                {/* Scheduled Class Cards (Adaptive layout based on duration) */}
                {displaySchedules.map((item) => {
                  const dayIdx = DAYS_OF_WEEK.indexOf(item.dayOfWeek);
                  if (dayIdx === -1) return null;

                  const startIdx = timeToIndex(item.startTime);
                  const endIdx = timeToIndex(item.endTime);
                  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return null;

                  const span = endIdx - startIdx;
                  // CSS Grid 1-based indexing
                  const colStart = dayIdx + 2;
                  const rowStart = startIdx + 1;
                // Determine if this schedule item is a break (health/lunch) for sizing
                const isBreakItem = item.subjectCode === 'BREAK' ||
                  item.subjectCode === 'HEALTH-BREAK' ||
                  item.subjectCode === 'LUNCH-BREAK' ||
                  item.teacherName === 'No Teacher' ||
                  item.teacherName === '—' ||
                  (item.subjectName && (item.subjectName.toLowerCase().includes('break') || item.subjectName.toLowerCase().includes('recess')));
                const minSpan = isBreakItem ? Math.max(span, 2) : span;
                const rowEnd = rowStart + minSpan;
                const hasConflict = conflictedScheduleIds.has(item.id);



                  const isLunch = item.subjectCode === 'LUNCH-BREAK' || (item.subjectName && item.subjectName.toLowerCase().includes('lunch'));

                  return (
                    <div
                      key={item.id}
                      style={{
                        gridColumn: colStart,
                        gridRow: `${rowStart} / ${rowEnd}`,
                        zIndex: hasConflict ? 15 : 10
                      }}
                      className="p-0.5"
                    >
                      <div
                        className={`h-full w-full rounded-lg text-center flex flex-col justify-center items-center shadow-xs transition-all relative group overflow-hidden ${
                          span === 1 ? "p-1 px-2" : "p-2"
                        } ${
                          hasConflict
                            ? 'bg-red-50 hover:bg-red-100 border-2 border-red-400 text-red-950 shadow-sm'
                            : isBreakItem
                              ? isLunch
                                ? 'bg-[#ffedd5] hover:bg-[#fed7aa] border border-[#f97316]/50 text-orange-950'
                                : 'bg-[#fef3c7] hover:bg-[#fde68a] border border-[#f59e0b]/50 text-amber-950'
                              : 'bg-[#dcfce7] hover:bg-[#bbf7d0] border border-[#86efac]'
                        }`}
                      >
                        {/* Conflict Warning Chip if overlapping (only when span >= 2) */}
                        {hasConflict && span >= 2 && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 mb-0.5 rounded text-[9px] font-bold bg-red-600 text-white shadow-xs">
                            <AlertTriangle size={9} /> Conflict Overlap
                          </span>
                        )}

                        {/* ── CARD CONTENT: Adaptive by Duration (span) ────────────────── */}
                        {span === 1 ? (
                          /* 15-Minute Slot: Single horizontal row, fully legible */
                          <div className="w-full h-full flex items-center justify-between gap-1.5 px-1 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isBreakItem && (
                                isLunch ? <Utensils size={13} className="text-orange-700 shrink-0" /> : <Coffee size={13} className="text-amber-700 shrink-0" />
                              )}
                              {hasConflict && <AlertTriangle size={11} className="text-red-600 shrink-0" />}
                              <span className={`font-bold text-xs truncate ${
                                hasConflict ? 'text-red-950 font-black' : isBreakItem ? (isLunch ? 'text-orange-950 font-black' : 'text-amber-950 font-black') : 'text-gray-900'
                              }`}>
                                {item.subjectName}
                              </span>
                            </div>
                            <span className={`text-[10px] font-bold shrink-0 ${
                              hasConflict ? 'text-red-800' : isBreakItem ? (isLunch ? 'text-orange-900' : 'text-amber-900') : 'text-emerald-800'
                            }`}>
                              {item.startTime}–{item.endTime}
                            </span>
                          </div>
                        ) : isBreakItem ? (
                          /* Break Slot (30+ Minutes): Dedicated clean layout without redundant 'No Teacher' text */
                          <div className="flex flex-col items-center justify-center gap-0.5 w-full px-1">
                            <div className="flex items-center justify-center gap-1.5">
                              {isLunch ? <Utensils size={14} className="text-orange-700 shrink-0" /> : <Coffee size={14} className="text-amber-700 shrink-0" />}
                              <p className={`font-black text-xs leading-tight truncate ${isLunch ? 'text-orange-950' : 'text-amber-950'}`}>
                                {item.subjectName}
                              </p>
                            </div>
                            <p className={`text-[10.5px] font-bold leading-tight mt-0.5 ${isLunch ? 'text-orange-900' : 'text-amber-900'}`}>
                              {item.startTime} – {item.endTime}
                            </p>
                            {span >= 3 && (
                              <p className={`text-[10px] font-medium leading-tight truncate mt-0.5 ${isLunch ? 'text-orange-800' : 'text-amber-800'}`}>
                                {item.sectionName}
                              </p>
                            )}
                            {item.room && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-white/70 text-gray-700 mt-0.5">
                                {item.room}
                              </span>
                            )}
                          </div>
                        ) : (
                          /* Academic Class (30+ Minutes) */
                          <>
                            {/* Subject in bold */}
                            <div className="flex items-center justify-center gap-1 w-full px-1">
                              <p className={`font-bold text-xs leading-tight truncate ${hasConflict ? 'text-red-900 font-extrabold' : 'text-gray-900'}`}>
                                {item.subjectName}
                              </p>
                            </div>

                            {/* Grade and Section */}
                            <p className={`text-[11px] font-medium leading-tight truncate w-full mt-0.5 px-1 ${hasConflict ? 'text-red-800' : 'text-gray-800'}`}>
                              {item.sectionName}
                            </p>

                            {/* Teacher Name */}
                            {span >= 3 && item.teacherName && (
                              <p className={`text-[11px] leading-tight truncate w-full px-1 ${hasConflict ? 'text-red-700 font-bold' : 'text-gray-700'}`}>
                                {item.teacherName}
                              </p>
                            )}

                            {/* Time range */}
                            <p className={`text-[10px] font-semibold mt-0.5 ${hasConflict ? 'text-red-700' : 'text-gray-600'}`}>
                              {item.startTime}–{item.endTime}
                            </p>

                            {/* Room if present */}
                            {span >= 3 && item.room && (
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono mt-0.5 ${hasConflict ? 'bg-white/80 text-red-800 border border-red-200' : 'bg-white/70 text-gray-700'}`}>
                                {item.room}
                              </span>
                            )}
                          </>
                        )}

                        {/* Delete Button on hover */}
                        <button
                          onClick={(e) => handleDeleteSchedule(item.id, e)}
                          className="absolute top-1 right-1 p-1 bg-red-100 text-red-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 cursor-pointer shadow-xs z-20"
                          title="Remove from schedule"
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
