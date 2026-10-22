import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, BookOpen, Check, Clock, Calendar, Search, X, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { API } from '../../config/api';

const token = () => localStorage.getItem('token');
const headers = () => ({ 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' });

const PROGRAMS = ['JHS', 'SHS'];
const SHS_STRANDS = ['STEM', 'ABM', 'HUMSS', 'TVL', 'Sports', 'Arts and Design'];
const JHS_GRADE_LEVELS = [7, 8, 9, 10];
const SHS_GRADE_LEVELS = [11, 12];
const SEMESTERS = ['1st Semester', '2nd Semester'];

// ── Close School Year Button ──────────────────────────────────────────────────
function CloseSchoolYearButton() {
  const [closing, setClosing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState(null);

  async function handleClose() {
    setClosing(true);
    try {
      const res = await fetch(`${API}/admin/academic/close-school-year`, {
        method: 'POST', headers: headers(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      setResult(data.message);
      toast.success(data.message);
      setConfirm(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setClosing(false);
    }
  }

  if (result) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 font-medium">
        ✅ {result}
      </div>
    );
  }

  if (confirm) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-red-800 mb-2">Are you sure?</p>
        <p className="text-xs text-red-700 mb-3">
          All students with status <strong>Enrolled</strong> will be moved to <strong>Completed</strong>. 
          Students will then be able to re-enroll for the next school year.
        </p>
        <div className="flex gap-2">
          <button onClick={() => setConfirm(false)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleClose} disabled={closing}
            className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-60">
            {closing ? 'Processing...' : 'Yes, Close School Year'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="flex items-center gap-2 px-4 py-2 border-2 border-red-300 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors">
      🎓 Close School Year &amp; Complete All Enrollments
    </button>
  );
}

// ── Grading Periods Panel ─────────────────────────────────────────────────────
function GradingPeriodsPanel() {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');

  const QUARTER_CFG = {
    Q1: { label: 'Quarter 1', color: 'blue' },
    Q2: { label: 'Quarter 2', color: 'purple' },
    Q3: { label: 'Quarter 3', color: 'orange' },
    Q4: { label: 'Quarter 4', color: 'green' },
  };

  async function loadYears() {
    try {
      const res = await fetch(`${API}/academic/school-years`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSchoolYears(data);
        const active = data.find(sy => sy.isActive);
        if (active) setSelectedYear(active.year);
      }
    } catch (_) {}
  }

  async function loadPeriods(year) {
    if (!year) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/grading-periods?schoolYear=${encodeURIComponent(year)}`, { headers: headers() });
      const data = await res.json();
      setPeriods(Array.isArray(data) ? data : []);
    } catch (_) { setPeriods([]); }
    finally { setLoading(false); }
  }

  async function setupPeriods() {
    setActionLoading('setup');
    try {
      const res = await fetch(`${API}/admin/grading-periods/setup`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ schoolYear: selectedYear || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(data.message);
      loadPeriods(selectedYear);
    } catch (err) { toast.error(err.message); }
    finally { setActionLoading(null); }
  }

  async function togglePeriod(period) {
    setActionLoading(period.id);
    const action = period.isOpen ? 'close' : 'open';
    try {
      const res = await fetch(`${API}/admin/grading-periods/${period.id}/${action}`, {
        method: 'PUT', headers: headers(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(data.message);
      loadPeriods(selectedYear);
    } catch (err) { toast.error(err.message); }
    finally { setActionLoading(null); }
  }

  useEffect(() => { loadYears(); }, []);
  useEffect(() => { if (selectedYear) loadPeriods(selectedYear); }, [selectedYear]);

  const colorMap = {
    blue:   { bg: 'bg-blue-50',   openBorder: 'border-blue-400',   closedBorder: 'border-blue-200',   badge: 'bg-blue-500',   text: 'text-blue-700',   btn: 'bg-blue-600 hover:bg-blue-700'   },
    purple: { bg: 'bg-purple-50', openBorder: 'border-purple-400', closedBorder: 'border-purple-200', badge: 'bg-purple-500', text: 'text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700' },
    orange: { bg: 'bg-orange-50', openBorder: 'border-orange-400', closedBorder: 'border-orange-200', badge: 'bg-orange-500', text: 'text-orange-700', btn: 'bg-orange-600 hover:bg-orange-700' },
    green:  { bg: 'bg-green-50',  openBorder: 'border-green-400',  closedBorder: 'border-green-200',  badge: 'bg-green-500',  text: 'text-green-700',  btn: 'bg-green-600 hover:bg-green-700'  },
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-[#001840]">Grading Periods</h3>
          <p className="text-xs text-gray-500 mt-0.5">Open or close quarters to control when teachers can enter grades</p>
        </div>
        <div className="flex gap-2 items-center">
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none bg-white">
            <option value="">Select school year</option>
            {schoolYears.map(sy => <option key={sy.id} value={sy.year}>{sy.year}{sy.isActive ? ' (Active)' : ''}</option>)}
          </select>
          {selectedYear && (
            <button onClick={setupPeriods} disabled={actionLoading === 'setup'}
              className="px-4 py-2 bg-[#102A71] text-white rounded-lg text-sm font-semibold hover:bg-[#001840] disabled:opacity-50 transition-colors">
              {actionLoading === 'setup' ? 'Setting up...' : 'Setup Q1–Q4'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 leading-relaxed">
        <strong>How it works:</strong> Click <em>Setup Q1–Q4</em> to create the four quarters for the selected school year.
        Then <strong>Open</strong> a quarter when ready for grade entry, and <strong>Close</strong> it to lock grades when the period ends.
      </div>

      {!selectedYear ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">Select a school year above</div>
      ) : loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">Loading...</div>
      ) : periods.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm mb-3">No grading periods for {selectedYear} yet.</p>
          <button onClick={setupPeriods} disabled={actionLoading === 'setup'}
            className="px-4 py-2 bg-[#F5C400] text-[#001840] rounded-lg text-sm font-semibold hover:bg-[#FFDC5F] disabled:opacity-50">
            {actionLoading === 'setup' ? 'Setting up...' : 'Setup Q1–Q4 Now'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {periods.map(period => {
            const cfg = QUARTER_CFG[period.quarter] || { label: period.quarter, color: 'blue' };
            const c = colorMap[cfg.color] || colorMap.blue;
            const isActioning = actionLoading === period.id;
            return (
              <div key={period.id}
                className={`rounded-2xl border-2 p-5 transition-all ${c.bg} ${period.isOpen ? c.openBorder : c.closedBorder}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-[#001840]">{period.quarter}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white ${period.isOpen ? c.badge : 'bg-gray-300'}`}>
                    {period.isOpen ? 'Open' : 'Closed'}
                  </span>
                </div>
                <p className={`text-xs font-medium mb-1 ${c.text}`}>{cfg.label}</p>
                <p className="text-[10px] text-gray-400 mb-4">
                  {period.isOpen && period.openedAt ? `Opened ${new Date(period.openedAt).toLocaleDateString('en-PH')}` :
                   period.closedAt ? `Closed ${new Date(period.closedAt).toLocaleDateString('en-PH')}` : 'Not yet opened'}
                </p>
                <button onClick={() => togglePeriod(period)} disabled={isActioning}
                  className={`w-full py-2 rounded-xl text-white text-xs font-bold transition-colors disabled:opacity-50 ${period.isOpen ? 'bg-red-500 hover:bg-red-600' : c.btn}`}>
                  {isActioning ? '...' : period.isOpen ? 'Close Quarter' : 'Open Quarter'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── AcademicSetup ─────────────────────────────────────────────────────────────
export function AcademicSetup() {
  const [tab, setTab] = useState('subjects');
  const [subjects, setSubjects] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [strandFilter, setStrandFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showSYForm, setShowSYForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectForm, setSubjectForm] = useState({
    code: '', description: '', units: 1,
    programCode: 'JHS', gradeLevel: 7, semester: '1st Semester', strand: ''
  });
  const [syForm, setSyForm] = useState({ year: '' });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    loadSubjects();
    loadSchoolYears();
  }

  async function loadSubjects() {
    setSubjectsLoading(true);
    try {
      const res = await fetch(`${API}/academic/subjects`);
      const data = await res.json();
      setSubjects(Array.isArray(data) ? data : []);
    } catch {
      setSubjects([]);
    } finally {
      setSubjectsLoading(false);
    }
  }

  async function loadSchoolYears() {
    try {
      const res = await fetch(`${API}/academic/school-years`);
      const data = await res.json();
      setSchoolYears(Array.isArray(data) ? data : []);
    } catch { setSchoolYears([]); }
  }

  function resetSubjectForm(programCode = 'JHS') {
    setSubjectForm({
      code: '', description: '', units: 1,
      programCode,
      gradeLevel: programCode === 'JHS' ? 7 : 11,
      semester: '1st Semester',
      strand: ''
    });
  }

  async function saveSubject() {
    if (!subjectForm.code.trim() || !subjectForm.description.trim()) {
      toast.error('Subject code and description are required');
      return;
    }
    const url = editingSubject
      ? `${API}/admin/academic/subjects/${editingSubject.id}`
      : `${API}/admin/academic/subjects`;
    const method = editingSubject ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(subjectForm) });
    if (res.ok) {
      toast.success(editingSubject ? 'Subject updated' : 'Subject added');
      setShowSubjectForm(false);
      setEditingSubject(null);
      resetSubjectForm();
      loadSubjects();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Failed to save subject');
    }
  }

  async function deleteSubject(id) {
    if (!confirm('Delete this subject?')) return;
    await fetch(`${API}/admin/academic/subjects/${id}`, { method: 'DELETE', headers: headers() });
    toast.success('Subject deleted');
    loadSubjects();
  }

  async function addSchoolYear() {
    if (!syForm.year.trim()) { toast.error('Enter a school year'); return; }
    const res = await fetch(`${API}/admin/academic/school-years`, {
      method: 'POST', headers: headers(), body: JSON.stringify(syForm)
    });
    if (res.ok) {
      toast.success('School year added');
      setShowSYForm(false);
      setSyForm({ year: '' });
      loadSchoolYears();
    } else toast.error('Failed to add school year');
  }

  async function activateSchoolYear(id) {
    await fetch(`${API}/admin/academic/school-years/${id}/activate`, { method: 'PUT', headers: headers() });
    toast.success('Active school year updated');
    loadSchoolYears();
  }

  const isSHS = subjectForm.programCode === 'SHS';
  const gradeLevels = subjectForm.programCode === 'JHS' ? JHS_GRADE_LEVELS : SHS_GRADE_LEVELS;

  // Level & Grade filter handling
  const handleLevelGradeChange = (val) => {
    if (!val) {
      setLevelFilter('');
      setGradeFilter('');
    } else if (val.startsWith('LEVEL:')) {
      setLevelFilter(val.replace('LEVEL:', ''));
      setGradeFilter('');
    } else if (val.startsWith('GRADE:')) {
      const grd = val.replace('GRADE:', '');
      const num = parseInt(grd.replace(/\D/g, ''), 10);
      setLevelFilter(num >= 11 ? 'SHS' : 'JHS');
      setGradeFilter(grd);
    }
    setPage(1);
  };

  const selectedLevelGrade = gradeFilter
    ? `GRADE:${gradeFilter}`
    : levelFilter
      ? `LEVEL:${levelFilter}`
      : '';

  const handleResetFilters = () => {
    setSearch('');
    setLevelFilter('');
    setGradeFilter('');
    setSemesterFilter('');
    setStrandFilter('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || levelFilter || gradeFilter || semesterFilter || strandFilter);

  // Filter subjects
  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => {
      // Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const codeMatch = s.code?.toLowerCase().includes(q);
        const descMatch = s.description?.toLowerCase().includes(q);
        const strandMatch = s.strand?.toLowerCase().includes(q);
        if (!codeMatch && !descMatch && !strandMatch) return false;
      }
      // Level
      if (levelFilter && s.programCode !== levelFilter) return false;
      // Grade
      if (gradeFilter) {
        const gNum = parseInt(gradeFilter.replace(/\D/g, ''), 10);
        if (s.gradeLevel !== gNum) return false;
      }
      // Semester
      if (semesterFilter && s.semester !== semesterFilter) return false;
      // Strand
      if (strandFilter) {
        if (strandFilter === 'CORE') {
          if (s.strand && s.strand.trim() !== '') return false;
        } else {
          if (s.strand !== strandFilter) return false;
        }
      }
      return true;
    });
  }, [subjects, search, levelFilter, gradeFilter, semesterFilter, strandFilter]);

  // Statistics
  const totalCount = subjects.length;
  const jhsCount = subjects.filter(s => s.programCode === 'JHS').length;
  const shsCount = subjects.filter(s => s.programCode === 'SHS').length;
  const filteredCount = filteredSubjects.length;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSubjects.length / pageSize));
  const paginatedSubjects = filteredSubjects.slice((page - 1) * pageSize, page * pageSize);

  const tabs = [
    { id: 'subjects',    label: 'Subjects',        icon: BookOpen },
    { id: 'schoolyears', label: 'School Years',    icon: Calendar },
    { id: 'grading',     label: 'Grading Periods', icon: Clock    },
  ];

  return (
    <div>
      <div className="mb-6">
        <p className="text-gray-500 text-sm">Manage subjects and school years for Junior and Senior High School</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-[#102A71] text-[#102A71]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>

      {/* ── SUBJECTS TAB ─────────────────────────────────────────────────── */}
      {tab === 'subjects' && (
        <div className="space-y-4">
          {/* Quick Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-xs">
              <p className="text-xs text-gray-500 font-medium">Total Curriculum</p>
              <p className="text-xl font-bold text-[#001840] mt-0.5">{totalCount} <span className="text-xs font-normal text-gray-400">subjects</span></p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-xs">
              <p className="text-xs text-blue-600 font-medium">Junior High (JHS)</p>
              <p className="text-xl font-bold text-[#001840] mt-0.5">{jhsCount} <span className="text-xs font-normal text-gray-400">subjects</span></p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-xs">
              <p className="text-xs text-purple-600 font-medium">Senior High (SHS)</p>
              <p className="text-xl font-bold text-[#001840] mt-0.5">{shsCount} <span className="text-xs font-normal text-gray-400">subjects</span></p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-xs">
              <p className="text-xs text-emerald-600 font-medium">Filtered Results</p>
              <p className="text-xl font-bold text-[#001840] mt-0.5">{filteredCount} <span className="text-xs font-normal text-gray-400">matches</span></p>
            </div>
          </div>

          {/* Filter & Action Bar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[220px]">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by code or subject description..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#001840] transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => { setSearch(''); setPage(1); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Filters & Action */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Combined Level & Grade */}
                <select
                  value={selectedLevelGrade}
                  onChange={e => handleLevelGradeChange(e.target.value)}
                  className={`px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors ${
                    selectedLevelGrade ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <option value="">All Levels & Grades</option>
                  <optgroup label="Junior High School (JHS)">
                    <option value="LEVEL:JHS">All JHS</option>
                    <option value="GRADE:Grade 7">Grade 7</option>
                    <option value="GRADE:Grade 8">Grade 8</option>
                    <option value="GRADE:Grade 9">Grade 9</option>
                    <option value="GRADE:Grade 10">Grade 10</option>
                  </optgroup>
                  <optgroup label="Senior High School (SHS)">
                    <option value="LEVEL:SHS">All SHS</option>
                    <option value="GRADE:Grade 11">Grade 11</option>
                    <option value="GRADE:Grade 12">Grade 12</option>
                  </optgroup>
                </select>

                {/* Semester */}
                <select
                  value={semesterFilter}
                  onChange={e => { setSemesterFilter(e.target.value); setPage(1); }}
                  className={`px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors ${
                    semesterFilter ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <option value="">All Semesters</option>
                  {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                {/* Strand Filter */}
                {levelFilter !== 'JHS' && (
                  <select
                    value={strandFilter}
                    onChange={e => { setStrandFilter(e.target.value); setPage(1); }}
                    className={`px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors ${
                      strandFilter ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    <option value="">All Strands</option>
                    <option value="CORE">Core (All Strands)</option>
                    {SHS_STRANDS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}

                {/* Refresh */}
                <button
                  type="button"
                  onClick={loadSubjects}
                  title="Refresh subjects list"
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500 hover:text-gray-700"
                >
                  <RefreshCw size={14} className={subjectsLoading ? 'animate-spin' : ''} />
                </button>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    title="Clear all filters"
                    className="inline-flex items-center gap-1 px-2.5 py-2 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors font-medium"
                  >
                    <X size={12} /> Clear
                  </button>
                )}

                {/* Add Subject Button */}
                <button
                  type="button"
                  onClick={() => { setEditingSubject(null); resetSubjectForm('JHS'); setShowSubjectForm(true); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#102A71] text-white rounded-lg text-sm font-semibold hover:bg-[#001840] transition-colors shadow-xs"
                >
                  <Plus size={15} /> Add Subject
                </button>
              </div>
            </div>
          </div>

          {/* Subjects Table Card */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
            {subjectsLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-400 text-sm">
                <RefreshCw size={16} className="animate-spin text-[#001840]" /> Loading curriculum subjects...
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <BookOpen size={40} className="mb-3 opacity-30 text-gray-400" />
                <p className="text-sm font-semibold text-gray-600">No subjects found</p>
                <p className="text-xs mt-1 text-gray-400">
                  {hasActiveFilters ? 'Try adjusting your search query or filter options' : 'No subjects have been added to the curriculum yet.'}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-3 px-3 py-1.5 text-xs text-[#102A71] bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-colors"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/70">
                        <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Code</th>
                        <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject Title / Description</th>
                        <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Level & Grade</th>
                        <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Strand / Track</th>
                        <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Semester</th>
                        <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedSubjects.map(s => {
                        const isJHS = s.programCode === 'JHS';
                        return (
                          <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                            {/* Code */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="font-mono font-bold text-[#102A71] text-sm">
                                {s.code}
                              </span>
                            </td>

                            {/* Description */}
                            <td className="px-5 py-3.5">
                              <p className="font-semibold text-gray-900">{s.description}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {s.programCode === 'SHS' ? 'Senior High School Curriculum' : 'Junior High School Curriculum'}
                              </p>
                            </td>

                            {/* Level & Grade */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                isJHS
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200/70'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200/70'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isJHS ? 'bg-blue-500' : 'bg-purple-500'}`} />
                                {s.programCode} · Grade {s.gradeLevel}
                              </span>
                            </td>

                            {/* Strand / Track */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              {s.strand ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                  {s.strand}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                  Core Subject
                                </span>
                              )}
                            </td>

                            {/* Semester */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                s.semester === '1st Semester'
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200/60'
                                  : 'bg-teal-50 text-teal-700 border border-teal-200/60'
                              }`}>
                                {s.semester || '1st Semester'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-3.5 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSubject(s);
                                    setSubjectForm({
                                      code: s.code,
                                      description: s.description,
                                      units: s.units,
                                      programCode: s.programCode,
                                      gradeLevel: s.gradeLevel,
                                      semester: s.semester,
                                      strand: s.strand || ''
                                    });
                                    setShowSubjectForm(true);
                                  }}
                                  title="Edit Subject"
                                  className="p-1.5 text-gray-500 hover:text-[#102A71] hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteSubject(s.id)}
                                  title="Delete Subject"
                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-white">
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-gray-500">
                      Showing <span className="font-semibold text-gray-800">{(page - 1) * pageSize + 1}</span> to{' '}
                      <span className="font-semibold text-gray-800">{Math.min(page * pageSize, filteredSubjects.length)}</span> of{' '}
                      <span className="font-semibold text-gray-800">{filteredSubjects.length}</span> subjects
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span>Show:</span>
                      <select
                        value={pageSize}
                        onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                        className="px-2 py-1 border border-gray-200 rounded-md text-xs text-gray-700 bg-white focus:outline-none"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>All</option>
                      </select>
                    </div>
                  </div>

                  {/* Page Navigation */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-normal rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={15} className="text-gray-400" />
                        <span>Previous</span>
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                        .reduce((acc, p, idx, arr) => {
                          if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, idx) => {
                          if (p === '...') {
                            return (
                              <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-sm text-gray-400">
                                ...
                              </span>
                            );
                          }
                          const isCurrent = p === page;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setPage(p)}
                              className={`w-8 h-8 rounded-lg text-sm transition-colors flex items-center justify-center ${
                                isCurrent
                                  ? 'bg-[#F5C400] text-gray-900 font-semibold shadow-xs'
                                  : 'text-gray-700 hover:bg-gray-100 font-normal'
                              }`}
                            >
                              {p}
                            </button>
                          );
                        })}

                      <button
                        type="button"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-normal rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <span>Next</span>
                        <ChevronRight size={15} className="text-gray-400" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Subject Add/Edit Modal */}
          {showSubjectForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
                onClick={() => { setShowSubjectForm(false); setEditingSubject(null); }}
              />
              <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#001840]/5 flex items-center justify-center text-[#102A71]">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#001840] text-base">
                        {editingSubject ? 'Edit Subject' : 'Add New Subject'}
                      </h3>
                      <p className="text-xs text-gray-500">Configure curriculum subject details</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowSubjectForm(false); setEditingSubject(null); }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); saveSubject(); }} className="p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Subject Code *</label>
                      <input
                        required
                        placeholder="e.g. MATH7"
                        value={subjectForm.code}
                        onChange={e => setSubjectForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:border-[#102A71]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Subject Title / Description *</label>
                      <input
                        required
                        placeholder="e.g. General Mathematics"
                        value={subjectForm.description}
                        onChange={e => setSubjectForm(p => ({ ...p, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#102A71]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Program</label>
                      <select
                        value={subjectForm.programCode}
                        onChange={e => {
                          const v = e.target.value;
                          setSubjectForm(p => ({
                            ...p,
                            programCode: v,
                            gradeLevel: v === 'JHS' ? 7 : 11,
                            strand: ''
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#102A71]"
                      >
                        {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Grade Level</label>
                      <select
                        value={subjectForm.gradeLevel}
                        onChange={e => setSubjectForm(p => ({ ...p, gradeLevel: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#102A71]"
                      >
                        {gradeLevels.map(y => <option key={y} value={y}>Grade {y}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Semester</label>
                      <select
                        value={subjectForm.semester}
                        onChange={e => setSubjectForm(p => ({ ...p, semester: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#102A71]"
                      >
                        {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {isSHS ? (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Strand / Track</label>
                        <select
                          value={subjectForm.strand}
                          onChange={e => setSubjectForm(p => ({ ...p, strand: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#102A71]"
                        >
                          <option value="">Core (All Strands)</option>
                          {SHS_STRANDS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Curriculum Track</label>
                        <input
                          disabled
                          value="Junior High Core"
                          className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => { setShowSubjectForm(false); setEditingSubject(null); }}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#102A71] text-white rounded-lg text-sm font-semibold hover:bg-[#001840] transition-colors shadow-xs"
                    >
                      {editingSubject ? 'Update Subject' : 'Save Subject'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SCHOOL YEARS TAB ─────────────────────────────────────────────── */}
      {tab === 'schoolyears' && (
        <div className="space-y-6">
          {/* Close School Year */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-[#001840]">End of School Year</h3>
                <p className="text-xs text-gray-500">Mark all enrolled students as Completed so they can re-enroll next year</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              This marks all currently enrolled students as <span className="font-semibold text-gray-600">Completed</span>.
              This action cannot be undone.
            </p>
            <CloseSchoolYearButton />
          </div>

          {/* School Years */}
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowSYForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#102A71] text-white rounded-lg text-sm font-medium hover:bg-[#001840]">
                <Plus className="w-4 h-4" /> Add School Year
              </button>
            </div>

            {showSYForm && (
              <div className="bg-[#FFFDF0] border border-[#F5C400] rounded-xl p-4 mb-4">
                <h3 className="font-semibold text-[#001840] mb-3">New School Year</h3>
                <input placeholder="e.g. 2026-2027" value={syForm.year}
                  onChange={e => setSyForm({ year: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm mr-3" />
                <button onClick={addSchoolYear}
                  className="px-4 py-2 bg-[#F5C400] text-[#001840] rounded-lg text-sm font-semibold mr-2 hover:bg-[#FFDC5F]">
                  Save
                </button>
                <button onClick={() => setShowSYForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {schoolYears.map(sy => (
                <div key={sy.id}
                  className={`p-4 rounded-xl border-2 ${sy.isActive ? 'border-[#F5C400] bg-[#FFFDF0]' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#001840] text-lg">{sy.year}</p>
                      {sy.isActive && (
                        <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>
                    {!sy.isActive && (
                      <button onClick={() => activateSchoolYear(sy.id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-[#102A71] text-white rounded-lg hover:bg-[#001840]">
                        Set Active
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── GRADING PERIODS TAB ──────────────────────────────────────────── */}
      {tab === 'grading' && <GradingPeriodsPanel />}
    </div>
  );
}
