import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import {
  Calendar, Clock, BookOpen, MapPin, User, Download,
  RefreshCw, CheckCircle2, AlertCircle, ChevronRight,
  Sparkles, Layers, ShieldCheck, ArrowRight, Info
} from 'lucide-react';
import { API } from '../../config/api';

const getToken = () => localStorage.getItem('token');

// 30-minute intervals from 7:30 AM to 5:30 PM (21 slot marks, 20 intervals)
const TIME_SLOTS = [
  "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM",
  "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM",
  "5:30 PM"
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_HEADERS = [
  { full: "Monday", short: "Mon" },
  { full: "Tuesday", short: "Tue" },
  { full: "Wednesday", short: "Wed" },
  { full: "Thursday", short: "Thu" },
  { full: "Friday", short: "Fri" }
];

// Helper to convert time string to index in TIME_SLOTS
const timeToIndex = (timeStr) => {
  if (!timeStr) return -1;
  const clean = timeStr.trim().toUpperCase();
  const idx = TIME_SLOTS.findIndex(t => t.toUpperCase() === clean);
  if (idx !== -1) return idx;

  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
  if (!match) return -1;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3] ? match[3].toUpperCase() : null;

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  const totalMin = hours * 60 + minutes;
  const startMin = 7 * 60 + 30; // 7:30 AM
  const slotIdx = Math.round((totalMin - startMin) / 30);
  return (slotIdx >= 0 && slotIdx < TIME_SLOTS.length) ? slotIdx : -1;
};

export function MySchedule() {
  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState(null);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedDayTab, setSelectedDayTab] = useState('Monday');

  // Preview schedules of another section if student has no section assigned yet
  const [allSections, setAllSections] = useState([]);
  const [previewSectionId, setPreviewSectionId] = useState('');
  const [previewSchedules, setPreviewSchedules] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Determine current day for highlighting
  const currentDayName = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    return DAYS_OF_WEEK.includes(today) ? today : 'Monday';
  }, []);

  useEffect(() => {
    setSelectedDayTab(currentDayName);
  }, [currentDayName]);

  const fetchSchedule = async (enrollId = '') => {
    setLoading(true);
    try {
      const url = enrollId
        ? `${API}/student/my-schedule?enrollmentId=${enrollId}`
        : `${API}/student/my-schedule`;

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error('Failed to load schedule');
      }

      const data = await res.json();
      setScheduleData(data);
      if (data.enrollment?.id) {
        setSelectedEnrollmentId(String(data.enrollment.id));
      }

      // If student has no schedules yet, fetch public sections so they can preview their grade level
      if (!data.schedules || data.schedules.length === 0) {
        loadAvailableSections();
      }
    } catch (err) {
      console.error('Fetch schedule error:', err);
      toast.error(err.message || 'Error fetching schedule');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSections = async () => {
    try {
      const res = await fetch(`${API}/academic/sections`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      }).catch(() => null);
      if (res && res.ok) {
        const secs = await res.json();
        setAllSections(Array.isArray(secs) ? secs : []);
      }
    } catch (_) { }
  };

  const loadPreviewSchedule = async (secId) => {
    if (!secId) {
      setPreviewSchedules([]);
      return;
    }
    setLoadingPreview(true);
    try {
      const res = await fetch(`${API}/academic/schedules?sectionId=${secId}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewSchedules(Array.isArray(data) ? data : []);
      }
    } catch (_) {
      toast.error('Failed to load preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleEnrollmentChange = (e) => {
    const id = e.target.value;
    setSelectedEnrollmentId(id);
    fetchSchedule(id);
  };

  const handleConfirmDownload = async () => {
    try {
      setDownloading(true);
      const enrollId = selectedEnrollmentId || '';
      const url = `${API}/student/my-schedule/pdf${enrollId ? `?enrollmentId=${enrollId}` : ''}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Failed to download schedule PDF');
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const secCode = activeSection ? `${activeSection.yearLevel}_${activeSection.code}` : 'Schedule';
      a.download = `Class_Schedule_Grade_${secCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      setShowDownloadModal(false);
      toast.success('Schedule PDF downloaded successfully!');
    } catch (err) {
      console.error('Download schedule error:', err);
      toast.error(err.message || 'Failed to download schedule');
    } finally {
      setDownloading(false);
    }
  };

  // Active schedules to show: student's own schedules or preview
  const displaySchedules = useMemo(() => {
    if (scheduleData?.schedules && scheduleData.schedules.length > 0) {
      return scheduleData.schedules;
    }
    return previewSchedules;
  }, [scheduleData, previewSchedules]);

  // Today's classes count
  const todayClasses = useMemo(() => {
    return displaySchedules.filter(s => s.dayOfWeek === currentDayName);
  }, [displaySchedules, currentDayName]);

  // Selected day classes for list view
  const selectedDayClasses = useMemo(() => {
    return displaySchedules
      .filter(s => s.dayOfWeek === selectedDayTab)
      .sort((a, b) => timeToIndex(a.startTime) - timeToIndex(b.startTime));
  }, [displaySchedules, selectedDayTab]);

  const activeSection = scheduleData?.section;
  const activeEnrollment = scheduleData?.enrollment;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[#001840] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium text-sm">Loading your class schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-6 px-4 sm:px-6 lg:px-8 print:p-0 print:m-0 print:bg-white print:min-h-0">
      {/* ── Print Specific Styles ────────────────────────────────────────── */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 6mm 8mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          header, footer, nav, aside, [role="navigation"], .no-print, [data-sonner-toaster] {
            display: none !important;
          }
          .print-grid-body {
            grid-template-rows: repeat(20, 24px) !important;
          }
        }
      `}</style>

      {/* ── Print-only Header (Hidden on screen, shown on print/PDF) ─────── */}
      <div className="hidden print:block mb-4 border-b-2 border-[#001840] pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/GabAi_Logo.png" alt="EMC Logo" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-lg font-black text-[#001840] tracking-tight">EASTERN MINDORO COLLEGE, INC.</h1>
              <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-widest">Office of the Registrar • Student Official Class Timetable</p>
            </div>
          </div>
          <div className="text-right text-[10px] text-gray-500">
            <p className="font-semibold text-gray-700">School Year: {activeEnrollment?.academicYear || activeSection?.schoolYear || '2024-2025'}</p>
            <p>Printed: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-gray-200 grid grid-cols-4 gap-3 text-[11px] text-gray-800">
          <div>
            <span className="font-bold text-gray-500 uppercase text-[9px] block">Student Name</span>
            <span className="font-bold text-[#001840]">
              {activeEnrollment?.firstName} {activeEnrollment?.middleName ? `${activeEnrollment.middleName}. ` : ''}{activeEnrollment?.familyName || activeEnrollment?.email || 'Student'}
            </span>
          </div>
          <div>
            <span className="font-bold text-gray-500 uppercase text-[9px] block">LRN / Student No.</span>
            <span className="font-bold">{activeEnrollment?.lrn || activeEnrollment?.studentNumber || 'N/A'}</span>
          </div>
          <div>
            <span className="font-bold text-gray-500 uppercase text-[9px] block">Grade & Section</span>
            <span className="font-bold text-[#001840]">
              {activeSection ? `Grade ${activeSection.yearLevel} - ${activeSection.code}` : (activeEnrollment?.gradeLevel || 'N/A')}
            </span>
          </div>
          <div>
            <span className="font-bold text-gray-500 uppercase text-[9px] block">Class Adviser</span>
            <span className="font-bold">{scheduleData?.adviserName || activeSection?.instructor || 'To be announced'}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6 print:max-w-none print:m-0 print:space-y-0">
        {/* ── Top Header & Actions (Hidden on Print) ─────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#102A71] bg-[#EEF2FF] px-2.5 py-0.5 rounded-full">
                <Calendar size={12} /> Student Portal
              </span>
              {todayClasses.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <Clock size={12} /> {todayClasses.length} class{todayClasses.length !== 1 ? 'es' : ''} today
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-[#001840] tracking-tight">
              My Class Schedule
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Weekly timetable and classroom assignments for your enrolled section.
            </p>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Multi-enrollment selector if student has more than 1 */}
            {scheduleData?.allEnrollments && scheduleData.allEnrollments.length > 1 && (
              <div className="relative">
                <select
                  value={selectedEnrollmentId}
                  onChange={handleEnrollmentChange}
                  className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#001840]"
                >
                  {scheduleData.allEnrollments.map((enr) => (
                    <option key={enr.id} value={enr.id}>
                      {enr.gradeLevel || 'Enrollment'} {enr.strand ? `(${enr.strand})` : ''} - {enr.academicYear || enr.status}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="inline-flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid'
                  ? 'bg-white text-[#001840] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
                  }`}
              >
                Weekly Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'list'
                  ? 'bg-white text-[#001840] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
                  }`}
              >
                Agenda List
              </button>
            </div>

            {/* Download Schedule Button (Opens Confirmation Modal) */}
            <button
              onClick={() => setShowDownloadModal(true)}
              disabled={displaySchedules.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#001840] bg-white hover:bg-[#FFFDF0] border border-gray-200 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download Weekly Schedule as PDF"
            >
              <Download size={14} className="text-[#102A71]" />
              <span className="hidden sm:inline">Download Schedule</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchSchedule(selectedEnrollmentId)}
              className="p-2 text-gray-500 hover:text-[#001840] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer border border-gray-200"
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* ── Student Section Information Banner (Hidden on Print) ─────── */}
        {activeSection ? (
          <div className="bg-linear-to-r from-[#001840] to-[#102A71] text-white rounded-2xl p-6 shadow-md relative overflow-hidden print:hidden">
            <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
              <Calendar size={180} />
            </div>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
              {/* Section code & grade */}
              <div className="md:col-span-2 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#FFDC5F] bg-white/10 px-2.5 py-1 rounded-md inline-block">
                  Assigned Section
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Grade {activeSection.yearLevel} - {activeSection.code}
                </h2>
                <p className="text-xs text-white/80 flex items-center gap-2">
                  <span>{activeSection.course || 'High School'}</span>
                  {activeSection.strand && (
                    <>
                      <span>•</span>
                      <span>Strand: {activeSection.strand}</span>
                    </>
                  )}
                  {activeSection.schoolYear && (
                    <>
                      <span>•</span>
                      <span>S.Y. {activeSection.schoolYear}</span>
                    </>
                  )}
                </p>
              </div>

              {/* Adviser info */}
              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/15">
                <div className="flex items-center gap-2 text-white/70 text-xs mb-1 font-medium">
                  <User size={13} className="text-[#FFDC5F]" /> Class Adviser
                </div>
                <p className="text-sm font-bold text-white truncate">
                  {scheduleData?.adviserName || activeSection.instructor || 'To be announced'}
                </p>
              </div>

              {/* Room info */}
              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/15">
                <div className="flex items-center gap-2 text-white/70 text-xs mb-1 font-medium">
                  <MapPin size={13} className="text-[#FFDC5F]" /> Home Room
                </div>
                <p className="text-sm font-bold text-white truncate">
                  {activeSection.room || 'Building Room Assigned'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Notice banner when no section is officially assigned yet (Hidden on Print) */
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0 mt-0.5">
                <Info size={20} />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-bold text-sm text-amber-900">
                  {activeEnrollment
                    ? `Enrollment Status: ${activeEnrollment.status?.replace('_', ' ').toUpperCase()}`
                    : 'No Active Section Assignment'}
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Your personalized class schedule will display automatically once your section assignment is finalized by the registrar office.
                </p>
              </div>
            </div>

            {/* Quick action to preview grade section */}
            {allSections.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-amber-900">Preview Section:</span>
                <select
                  value={previewSectionId}
                  onChange={(e) => {
                    setPreviewSectionId(e.target.value);
                    loadPreviewSchedule(e.target.value);
                  }}
                  className="text-xs bg-white border border-amber-300 rounded-xl px-3 py-2 font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#001840]"
                >
                  <option value="">Select a section to preview</option>
                  {allSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Grade {sec.yearLevel} - {sec.code}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* ── Main Schedule Content ────────────────────────────────────── */}
        {displaySchedules.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center space-y-4 print:hidden">
            <div className="w-16 h-16 bg-[#EEF2FF] text-[#102A71] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <Clock size={32} />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-lg font-bold text-gray-900">
                No Scheduled Classes Yet
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {activeSection
                  ? `Classes have not yet been scheduled for Grade ${activeSection.yearLevel} - ${activeSection.code}. Please check back shortly.`
                  : "Your section schedule will appear here as soon as the registrar finalizes the schedule assignments."}
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                to="/my-enrollments"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#001840] bg-[#FFFDF0] hover:bg-[#FFF9E6] border border-[#001840]/20 rounded-xl transition-colors"
              >
                <BookOpen size={14} /> View My Enrollments
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* ── WEEKLY TIMETABLE GRID VIEW (Always the only content printed on PDF) ── */}
            <div
              className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col print:shadow-none print:border-none print:p-0 ${viewMode === 'grid' ? 'block' : 'hidden print:block'
                }`}
            >
              {/* Screen-only Grid Toolbar */}
              <div className="p-4 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between gap-3 flex-wrap print:hidden">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-[#001840]" />
                  <span className="font-bold text-xs uppercase tracking-wider text-[#001840]">
                    Weekly Timetable Grid (Monday – Friday, 7:30 AM – 5:30 PM)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="inline-block w-3 h-3 rounded bg-[#dcfce7] border border-[#86efac]" />
                  <span className="font-medium">Scheduled Classes</span>
                  <span className="text-gray-300">•</span>
                  <span className="font-bold text-[#102A71]">{displaySchedules.length} total subjects</span>
                </div>
              </div>

              {/* Grid Body */}
              <div className="overflow-x-auto p-4 print:p-0 print:overflow-visible">
                <div className="min-w-[650px] print:min-w-0 print:w-full">
                  {/* Day Headers (Time, Mon, Tue, Wed, Thu, Fri) */}
                  <div className="grid grid-cols-6 border-b border-gray-200 bg-gray-100/90 text-gray-700 font-bold text-xs text-center py-2.5 rounded-t-xl print:rounded-none print:py-1.5 print:bg-gray-100 print:text-[10px] print:border print:border-gray-300">
                    <div>Time</div>
                    {DAY_HEADERS.map((dh) => {
                      const isToday = dh.full === currentDayName;
                      return (
                        <div
                          key={dh.full}
                          className={`flex items-center justify-center gap-1 ${isToday ? 'text-[#001840] font-black' : ''
                            }`}
                        >
                          <span>{dh.short}</span>
                          {isToday && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] print:hidden" title="Today" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Main Timetable Body */}
                  <div
                    className="relative grid grid-cols-6 border-l border-r border-b border-gray-200 bg-white print:border print:border-gray-300 print-grid-body"
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
                        className="border-b border-r border-gray-200 text-[11px] print:text-[9px] font-semibold text-gray-700 flex items-center justify-center bg-gray-50/60 print:bg-gray-50 select-none"
                      >
                        {slot}
                      </div>
                    ))}

                    {/* Empty cell backgrounds */}
                    {DAYS_OF_WEEK.map((day, dIdx) => {
                      const isToday = day === currentDayName;
                      return TIME_SLOTS.slice(0, -1).map((_, rIdx) => (
                        <div
                          key={`cell-${dIdx}-${rIdx}`}
                          style={{
                            gridColumn: dIdx + 2,
                            gridRow: rIdx + 1
                          }}
                          className={`border-b border-r border-gray-100/90 print:border-gray-200 transition-colors ${isToday ? 'bg-blue-50/15 print:bg-white' : 'hover:bg-gray-50/40 print:bg-white'
                            }`}
                        />
                      ));
                    })}

                    {/* Scheduled Class Cards (Mint Green Design) */}
                    {displaySchedules.map((item) => {
                      const dayIdx = DAYS_OF_WEEK.indexOf(item.dayOfWeek);
                      if (dayIdx === -1) return null;

                      const startIdx = timeToIndex(item.startTime);
                      const endIdx = timeToIndex(item.endTime);
                      if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return null;

                      const colStart = dayIdx + 2;
                      const rowStart = startIdx + 1;
                      const rowEnd = endIdx + 1;

                      return (
                        <div
                          key={item.id}
                          style={{
                            gridColumn: colStart,
                            gridRow: `${rowStart} / ${rowEnd}`,
                            zIndex: 10
                          }}
                          className="p-1 print:p-0.5"
                        >
                          <div className="h-full w-full rounded-lg p-2 print:p-1 text-center flex flex-col justify-center items-center shadow-xs transition-all relative overflow-hidden bg-[#dcfce7] hover:bg-[#bbf7d0] border border-[#86efac] print:rounded print:border-[#86efac] print:bg-[#dcfce7]">
                            {/* Subject Name */}
                            <p className="font-bold text-xs print:text-[10px] leading-tight truncate w-full px-1 text-gray-900">
                              {item.subjectName}
                            </p>

                            {/* Time range */}
                            <p className="text-[10px] print:text-[8.5px] font-semibold text-emerald-800 leading-tight truncate w-full mt-0.5 px-0.5">
                              {item.startTime} – {item.endTime}
                            </p>

                            {/* Teacher Name */}
                            <p className="text-[10px] print:text-[8.5px] text-gray-700 leading-tight truncate w-full mt-0.5 px-0.5">
                              {item.teacherName}
                            </p>

                            {/* Room (if available) */}
                            {item.room && (
                              <p className="text-[9px] print:text-[8px] font-medium text-emerald-900 bg-white/70 px-1.5 py-0.2 rounded-full mt-0.5 max-w-[95%] truncate">
                                Room: {item.room}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ── DAILY AGENDA / LIST VIEW (Screen Only, Hidden on Print) ── */}
            <div
              className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6 print:hidden ${viewMode === 'list' ? 'block' : 'hidden'
                }`}
            >
              {/* Day Selector Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100">
                {DAYS_OF_WEEK.map((day) => {
                  const count = displaySchedules.filter(s => s.dayOfWeek === day).length;
                  const isSelected = selectedDayTab === day;
                  const isToday = day === currentDayName;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDayTab(day)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${isSelected
                        ? 'bg-[#001840] text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                      <span>{day}</span>
                      {isToday && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-[#FFDC5F] text-[#001840]' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                          Today
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* List of classes for selected day */}
              {selectedDayClasses.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                    <Calendar size={22} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800">
                    No Classes Scheduled on {selectedDayTab}
                  </h4>
                  <p className="text-xs text-gray-500">
                    Enjoy your day or use this time for study and review!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayClasses.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#dcfce7] border border-[#86efac] text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                          {idx + 1}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-[#001840]">
                              {item.subjectName}
                            </h4>
                            {item.subjectCode && (
                              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                                {item.subjectCode}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 flex items-center gap-1.5">
                            <User size={13} className="text-gray-400" />
                            <span>Teacher: <strong className="text-gray-800 font-semibold">{item.teacherName}</strong></span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-[#102A71] bg-[#EEF2FF] px-3 py-1.5 rounded-lg border border-[#102A71]/10">
                          <Clock size={13} />
                          <span>{item.startTime} – {item.endTime}</span>
                        </div>
                        {item.room ? (
                          <div className="flex items-center gap-1 font-medium text-gray-700 bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg">
                            <MapPin size={12} className="text-gray-400" />
                            <span>Room: {item.room}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-gray-400 italic">Room TBA</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Summary Subject List Breakdown (Screen Only, Hidden on Print) ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 print:hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-[#001840]" />
                  <h3 className="font-bold text-sm text-[#001840]">
                    Enrolled Subjects & Instructors
                  </h3>
                </div>
                <span className="text-xs text-gray-500 font-medium">
                  {Array.from(new Set(displaySchedules.map(s => s.subjectName))).length} Total Subjects
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Subject Name</th>
                      <th className="py-2.5 px-3">Day(s)</th>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Instructor</th>
                      <th className="py-2.5 px-3">Room</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displaySchedules.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-3 font-bold text-gray-900">
                          {item.subjectName}
                          {item.subjectCode && <span className="ml-1 text-[10px] text-gray-500 font-normal">({item.subjectCode})</span>}
                        </td>
                        <td className="py-3 px-3 font-semibold text-gray-700">
                          {item.dayOfWeek}
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#102A71]">
                          {item.startTime} – {item.endTime}
                        </td>
                        <td className="py-3 px-3 text-gray-700 font-medium">
                          {item.teacherName}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {item.room || 'TBA'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Download Confirmation Modal ───────────────────────────────── */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200 relative overflow-hidden">
            {/* Top decorative accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-[#001840] via-[#102A71] to-[#F5C400]" />

            {/* Icon & Title */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EEF2FF] text-[#102A71] flex items-center justify-center shrink-0 shadow-inner">
                <Download size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#001840] tracking-tight">
                  Download Class Schedule?
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Save an official 1-page PDF copy of your weekly class timetable to your device.
                </p>
              </div>
            </div>

            {/* Summary details card */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500 font-medium">Student:</span>
                <span className="font-bold text-[#001840]">
                  {activeEnrollment?.firstName} {activeEnrollment?.familyName || activeEnrollment?.email || 'Student'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500 font-medium">Assigned Section:</span>
                <span className="font-bold text-[#001840]">
                  {activeSection ? `Grade ${activeSection.yearLevel} - ${activeSection.code}` : (activeEnrollment?.gradeLevel || 'N/A')}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500 font-medium">School Year:</span>
                <span className="font-semibold text-gray-700">
                  {activeSection?.schoolYear || activeEnrollment?.academicYear || '2026-2027'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500 font-medium">File Format:</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                  Official 1-Page PDF
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowDownloadModal(false)}
                disabled={downloading}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDownload}
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

export default MySchedule;
