import { usePortalSlot } from '../../hooks/usePortalSlot';
import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Archive, Download, RefreshCw, Search, UserX, Users, X } from "lucide-react";
import { LifeStatusBadge, LifeStatusModal, RegistrarPagination } from "./RegistrarShared";
import { API, tok, LIFE_STATUS_CFG } from "./registrarConfig";

const ARCHIVED_STATUSES = ['dropped', 'transferred_out'];

const ACTIVE_STATUS_OPTIONS = [
  { value: 'all', label: 'All Active Statuses' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'retained', label: 'Retained' },
];

const ARCHIVED_STATUS_OPTIONS = [
  { value: 'all', label: 'All Archived (Dropped & Transferred Out)' },
  { value: 'dropped', label: 'Dropped' },
  { value: 'transferred_out', label: 'Transferred Out' },
];

export function StudentsTab() {
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('active'); // 'active' | 'archived'
  const [search, setSearch] = useState('');
  const [lifeStatusFilter, setLifeStatusFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [sectionsList, setSectionsList] = useState([]);
  const [yearFilter, setYearFilter] = useState('');
  const [, setSchoolYears] = useState([]);
  const [activeYear, setActiveYear] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [exporting, setExporting] = useState(false);
  const headerContainer = usePortalSlot('registrar-header-slot', false, 'flex-1 flex items-center justify-end gap-2 flex-wrap ml-auto');

  // Available program / strand options based on selected education level
  const availablePrograms = levelFilter === 'JHS'
    ? [
      { value: 'Regular', label: 'Regular' },
      { value: 'SSC', label: 'SSC (Special Science Class)' },
    ]
    : levelFilter === 'SHS'
      ? [
        { value: 'STEM', label: 'STEM' },
        { value: 'ABM', label: 'ABM' },
        { value: 'HUMSS', label: 'HUMSS' },
      ]
      : [
        { value: 'Regular', label: 'Regular (JHS)' },
        { value: 'SSC', label: 'SSC (JHS)' },
        { value: 'STEM', label: 'STEM (SHS)' },
        { value: 'ABM', label: 'ABM (SHS)' },
        { value: 'HUMSS', label: 'HUMSS (SHS)' },
      ];

  // Cascading available sections based on level, grade, program
  const availableSections = sectionsList.filter(s => {
    if (levelFilter && s.course !== levelFilter) return false;
    if (gradeFilter) {
      const gNum = gradeFilter.replace(/\D/g, '');
      if (String(s.yearLevel) !== gNum && s.yearLevel !== gradeFilter) return false;
    }
    if (programFilter) {
      if (programFilter === 'Regular') {
        if (s.strand && s.strand !== 'Regular') return false;
      } else {
        if (s.strand !== programFilter) return false;
      }
    }
    return true;
  });

  const handleLevelGradeChange = (val) => {
    setPage(1);
    setSectionFilter('');
    setProgramFilter('');
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
  };

  const selectedLevelGrade = gradeFilter
    ? `GRADE:${gradeFilter}`
    : levelFilter
      ? `LEVEL:${levelFilter}`
      : '';

  const handleProgramChange = (val) => {
    setProgramFilter(val);
    setSectionFilter('');
  };

  const handleSwitchViewMode = (mode) => {
    setViewMode(mode);
    setLifeStatusFilter('all');
    setPage(1);
  };

  const handleResetFilters = () => {
    setLevelFilter('');
    setGradeFilter('');
    setProgramFilter('');
    setSectionFilter('');
    setLifeStatusFilter('all');
    setYearFilter('');
    setSearch('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    levelFilter || gradeFilter || programFilter || sectionFilter || search || (lifeStatusFilter !== 'all')
  );

  useEffect(() => {
    fetch(`${API}/academic/school-years`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setSchoolYears(data);
          const active = data.find(sy => sy.isActive);
          if (active) setActiveYear(active.year);
        }
      }).catch(() => { });

    fetch(`${API}/registrar/sections`, { headers: tok() })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) setSectionsList(data);
      }).catch(() => { });
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (levelFilter) params.set('educationLevel', levelFilter);
      if (gradeFilter) params.set('gradeLevel', gradeFilter);
      if (programFilter) params.set('strand', programFilter);
      if (sectionFilter) params.set('sectionName', sectionFilter);
      if (search) params.set('search', search);
      if (yearFilter) params.set('academicYear', yearFilter);
      const res = await fetch(`${API}/registrar/students?${params}`, { headers: tok() });
      if (!res.ok) throw new Error('Failed to fetch students');
      const data = await res.json();
      setAllStudents(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [levelFilter, gradeFilter, programFilter, sectionFilter, search, yearFilter]);

  useEffect(() => {
    const t = setTimeout(fetchStudents, 300);
    return () => clearTimeout(t);
  }, [fetchStudents]);

  // Split into Active vs Archived (Dropped / Transferred Out)
  const activeStudents = useMemo(
    () => allStudents.filter(s => !ARCHIVED_STATUSES.includes(s.lifeStatus)),
    [allStudents]
  );
  const archivedStudents = useMemo(
    () => allStudents.filter(s => ARCHIVED_STATUSES.includes(s.lifeStatus)),
    [allStudents]
  );

  const students = useMemo(() => {
    const pool = viewMode === 'archived' ? archivedStudents : activeStudents;
    if (!lifeStatusFilter || lifeStatusFilter === 'all') return pool;
    if (lifeStatusFilter === 'enrolled') {
      return pool.filter(s => !s.lifeStatus || s.lifeStatus === 'enrolled' || s.lifeStatus === 'transferred_in');
    }
    return pool.filter(s => s.lifeStatus === lifeStatusFilter);
  }, [viewMode, activeStudents, archivedStudents, lifeStatusFilter]);

  async function exportToExcel() {
    if (students.length === 0) { toast.error('No students to export'); return; }
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const rows = students.map((s, i) => ({
        '#': i + 1,
        'Last Name': s.familyName || '',
        'First Name': s.firstName || '',
        'Middle Name': s.middleName || '',
        'Student No.': s.studentNumber || '',
        'LRN': s.lrn || '',
        'Sex': s.sex || '',
        'Date of Birth': s.dateOfBirth || '',
        'Education Level': s.educationLevel || '',
        'Grade Level': s.gradeLevel || '',
        'Program / Strand': s.strand || (s.educationLevel === 'JHS' ? 'Regular' : ''),
        'Section': s.sectionName || '',
        'Enrollment Type': s.enrollmentType || '',
        'Student Type': s.studentType || '',
        'School Year': s.academicYear || '',
        'App. Status': s.status || '',
        'Life Status': s.lifeStatus === 'transferred_in' || !s.lifeStatus
          ? 'Enrolled'
          : (LIFE_STATUS_CFG[s.lifeStatus]?.label || s.lifeStatus),
        'Status Date': s.lifeStatusDate || '',
        'Status Reason': s.lifeStatusReason || '',
        'Destination School': s.destinationSchool || '',
        'Email': s.user_email || '',
        'Date Enrolled': s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-PH') : '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 4 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 13 }, { wch: 14 },
        { wch: 7 }, { wch: 13 }, { wch: 13 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
        { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 13 }, { wch: 14 },
        { wch: 12 }, { wch: 30 }, { wch: 22 }, { wch: 26 }, { wch: 13 },
      ];

      const wb = XLSX.utils.book_new();
      const sheetName = `${viewMode === 'archived' ? 'Archived' : 'Students'} ${yearFilter || activeYear || 'All'}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

      const parts = [viewMode === 'archived' ? 'EMC_Archived_Students' : 'EMC_Students'];
      if (yearFilter === 'all') {
        parts.push('AllYears');
      } else if (yearFilter) {
        parts.push(yearFilter.replace(/\s+/g, ''));
      } else if (activeYear) {
        parts.push(activeYear.replace(/\s+/g, ''));
      }

      if (levelFilter) parts.push(levelFilter);
      if (gradeFilter) parts.push(gradeFilter.replace(/\s+/g, ''));
      if (programFilter) parts.push(programFilter.replace(/\s+/g, ''));
      if (sectionFilter) parts.push(sectionFilter.replace(/\s+/g, ''));

      if (lifeStatusFilter && lifeStatusFilter !== 'all') {
        const lsLabel = LIFE_STATUS_CFG[lifeStatusFilter]?.label || lifeStatusFilter;
        parts.push(lsLabel.replace(/\s+/g, ''));
      }

      parts.push(new Date().toISOString().slice(0, 10));
      const filename = `${parts.join('_')}.xlsx`;

      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${students.length} student${students.length !== 1 ? 's' : ''} to ${filename}`);
    } catch (err) {
      toast.error('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  }

  // Summary counts
  const activeCount = activeStudents.length;
  const archivedCount = archivedStudents.length;
  const droppedCount = archivedStudents.filter(s => s.lifeStatus === 'dropped').length;
  const transferredOutCount = archivedStudents.filter(s => s.lifeStatus === 'transferred_out').length;
  const retainedCount = activeStudents.filter(s => s.lifeStatus === 'retained').length;

  const totalPages = Math.ceil(students.length / pageSize);
  const paginated = students.slice((page - 1) * pageSize, page * pageSize);

  const statusFilterOptions = viewMode === 'archived' ? ARCHIVED_STATUS_OPTIONS : ACTIVE_STATUS_OPTIONS;

  const statsPills = (
    <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 ml-auto">
      <button
        type="button"
        onClick={() => handleSwitchViewMode('active')}
        className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border text-[11px] font-semibold transition-all ${
          viewMode === 'active' && lifeStatusFilter === 'all'
            ? 'border-[#001840] bg-[#001840] text-white shadow-xs'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Users size={12} /> Active Students: {activeCount}
      </button>
      {retainedCount > 0 && (
        <button
          type="button"
          onClick={() => {
            setViewMode('active');
            setLifeStatusFilter(viewMode === 'active' && lifeStatusFilter === 'retained' ? 'all' : 'retained');
            setPage(1);
          }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all ${
            viewMode === 'active' && lifeStatusFilter === 'retained'
              ? 'border-[#001840] bg-[#001840]/10 text-[#001840] ring-1 ring-[#001840]'
              : `border-gray-200 ${LIFE_STATUS_CFG.retained.color} hover:opacity-80`
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${LIFE_STATUS_CFG.retained.dot}`} /> Retained: {retainedCount}
        </button>
      )}
      <button
        type="button"
        onClick={() => handleSwitchViewMode('archived')}
        className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border text-[11px] font-semibold transition-all ${
          viewMode === 'archived'
            ? 'border-amber-700 bg-amber-600 text-white shadow-xs'
            : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
        }`}
      >
        <Archive size={12} /> Archived (Dropped / Transferred Out): {archivedCount}
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Top summary pills - rendered in header slot if available */}
      {headerContainer ? createPortal(statsPills, headerContainer) : (
        <div className="flex justify-end">{statsPills}</div>
      )}

      {/* Active vs Archived Segmented Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-gray-100 px-3.5 py-2.5">
        <div className="inline-flex items-center rounded-xl bg-gray-100 p-1 gap-1">
          <button
            type="button"
            onClick={() => handleSwitchViewMode('active')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              viewMode === 'active'
                ? 'bg-[#001840] text-white shadow-xs'
                : 'text-gray-600 hover:text-[#001840]'
            }`}
          >
            <Users size={14} />
            Active Students
            <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${
              viewMode === 'active' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {activeCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchViewMode('archived')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              viewMode === 'archived'
                ? 'bg-[#001840] text-white shadow-xs'
                : 'text-gray-600 hover:text-[#001840]'
            }`}
          >
            <Archive size={14} />
            Archived (Dropped / Transferred Out)
            <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${
              viewMode === 'archived' ? 'bg-[#F5C400] text-[#001840] font-bold' : 'bg-amber-100 text-amber-800'
            }`}>
              {archivedCount}
            </span>
          </button>
        </div>

        {viewMode === 'archived' && (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => { setLifeStatusFilter(lifeStatusFilter === 'dropped' ? 'all' : 'dropped'); setPage(1); }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-semibold transition-all ${
                lifeStatusFilter === 'dropped'
                  ? 'border-red-600 bg-red-600 text-white'
                  : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Dropped: {droppedCount}
            </button>
            <button
              type="button"
              onClick={() => { setLifeStatusFilter(lifeStatusFilter === 'transferred_out' ? 'all' : 'transferred_out'); setPage(1); }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-semibold transition-all ${
                lifeStatusFilter === 'transferred_out'
                  ? 'border-orange-600 bg-orange-600 text-white'
                  : 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Transferred Out: {transferredOutCount}
            </button>
          </div>
        )}
      </div>

      {/* Filters Card - Single Horizontal Line */}
      <div className="bg-white rounded-2xl border border-gray-100 p-2.5 sm:p-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder={viewMode === 'archived' ? "Search archived students by name, LRN, or ID..." : "Search by name, LRN, or student number..."}
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840] placeholder:text-gray-400 bg-white"
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

          <div className="flex items-center gap-2 shrink-0">
            {/* Life Status */}
            <select
              value={lifeStatusFilter}
              onChange={e => { setLifeStatusFilter(e.target.value); setPage(1); }}
              className={`px-2.5 sm:px-3 py-2 border rounded-lg text-xs sm:text-sm focus:outline-none transition-colors shrink-0 ${
                lifeStatusFilter !== 'all' ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              {statusFilterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* Combined Level & Grade */}
            <select
              value={selectedLevelGrade}
              onChange={e => handleLevelGradeChange(e.target.value)}
              className={`px-2.5 sm:px-3 py-2 border rounded-lg text-xs sm:text-sm focus:outline-none transition-colors shrink-0 ${
                selectedLevelGrade ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <option value="">All Levels</option>
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

            {/* Program / Strand */}
            <select
              value={programFilter}
              onChange={e => { handleProgramChange(e.target.value); setPage(1); }}
              className={`px-2.5 sm:px-3 py-2 border rounded-lg text-xs sm:text-sm focus:outline-none transition-colors shrink-0 max-w-[150px] truncate ${
                programFilter ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <option value="">
                {levelFilter === 'SHS' ? 'All Strands' : 'All Programs'}
              </option>
              {availablePrograms.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            {/* Section */}
            <select
              value={sectionFilter}
              onChange={e => { setSectionFilter(e.target.value); setPage(1); }}
              className={`px-2.5 sm:px-3 py-2 border rounded-lg text-xs sm:text-sm focus:outline-none transition-colors shrink-0 max-w-[140px] truncate ${
                sectionFilter ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <option value="">All Sections</option>
              {availableSections.map(sec => (
                <option key={sec.id || sec.code} value={sec.code}>
                  {sec.code} {sec.strand ? `(${sec.strand})` : ''}
                </option>
              ))}
            </select>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchStudents}
              title="Refresh"
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500 hover:text-gray-700 shrink-0"
            >
              <RefreshCw size={14} />
            </button>

            {/* Export */}
            <button
              type="button"
              onClick={exportToExcel}
              disabled={exporting || students.length === 0}
              title="Export to Excel"
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-green-200 bg-green-50 text-green-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
            >
              <Download size={14} />
              {exporting ? 'Exporting...' : 'Excel'}
            </button>

            {/* Clear filters button if any filter is active */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Clear all filters"
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors font-medium shrink-0 whitespace-nowrap"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400 text-sm">
            <RefreshCw size={15} className="animate-spin" /> Loading students...
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            {viewMode === 'archived' ? (
              <>
                <Archive size={36} className="mb-3 opacity-40" />
                <p className="text-sm font-medium text-gray-600">No archived students found</p>
                <p className="text-xs mt-1 text-gray-400">
                  {hasActiveFilters
                    ? 'Try adjusting your filters'
                    : 'Students marked as Dropped or Transferred Out will be archived here.'}
                </p>
              </>
            ) : (
              <>
                <Users size={36} className="mb-3 opacity-40" />
                <p className="text-sm font-medium text-gray-600">No active students found</p>
                <p className="text-xs mt-1 text-gray-400">
                  {hasActiveFilters ? 'Try adjusting your filters' : 'Students appear here once their enrollment is approved'}
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/60">
                    {(viewMode === 'archived'
                      ? ['Student', 'Level / Grade', 'Previous Section', 'Archive Status', 'Reason & Details']
                      : ['Student', 'Level / Grade', 'Section', 'Enrollment Type', 'Life Status', 'Actions']
                    ).map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(s => {
                    const name = (s.firstName || s.familyName)
                      ? `${s.firstName || ''} ${s.familyName || ''}`.trim()
                      : (s.user_name || `Student #${s.id}`);
                    const canUpdate = !ARCHIVED_STATUSES.includes(s.lifeStatus);
                    const normalizedLifeStatus = s.lifeStatus === 'transferred_in' || !s.lifeStatus ? 'enrolled' : s.lifeStatus;

                    return (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-800">{name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {s.studentNumber || s.lrn ? `${s.studentNumber || ''} ${s.lrn ? `· LRN: ${s.lrn}` : ''}`.trim() : s.user_email || ''}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-gray-800">{s.educationLevel}</span>
                            {s.gradeLevel && <span>· {s.gradeLevel}</span>}
                            {s.educationLevel === 'JHS' ? (
                              s.strand === 'SSC' || s.sscClass === 'SSC' ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                  SSC
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-600 border border-gray-200">
                                  Regular
                                </span>
                              )
                            ) : s.strand ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                {s.strand}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-500">{s.sectionName || '—'}</td>

                        {viewMode === 'archived' ? (
                          <>
                            <td className="px-5 py-3">
                              <LifeStatusBadge status={s.lifeStatus} />
                              {s.lifeStatusDate && (
                                <p className="text-[11px] text-gray-400 mt-1">
                                  Effective: {new Date(s.lifeStatusDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-3 max-w-xs">
                              {s.destinationSchool && (
                                <p className="text-xs font-semibold text-[#001840] mb-0.5">
                                  Destination: {s.destinationSchool}
                                </p>
                              )}
                              <p className="text-xs text-gray-600 leading-snug">
                                {s.lifeStatusReason || <span className="text-gray-300 italic">No reason recorded</span>}
                              </p>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-5 py-3 capitalize text-gray-500">{s.enrollmentType || '—'}</td>
                            <td className="px-5 py-3">
                              <LifeStatusBadge status={normalizedLifeStatus} />
                              {s.lifeStatusDate && s.lifeStatus === 'retained' && (
                                <p className="text-[10px] text-gray-400 mt-0.5">{new Date(s.lifeStatusDate).toLocaleDateString('en-PH')}</p>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex flex-col gap-1.5">
                                {canUpdate ? (
                                  <button onClick={() => setSelectedStudent(s)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#001840] text-white rounded-lg text-xs font-medium hover:bg-[#102A71] transition-colors">
                                    <UserX size={11} /> Update Status
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-300 italic">archived</span>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <RegistrarPagination
              page={page}
              totalPages={totalPages}
              totalItems={students.length}
              pageSize={pageSize}
              onPageChange={setPage}
              itemName="students"
            />
          </>
        )}
      </div>

      {/* Life Status Modal */}
      {selectedStudent && (
        <LifeStatusModal
          enrollment={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onSuccess={() => { setSelectedStudent(null); fetchStudents(); }}
        />
      )}
    </div>
  );
}
