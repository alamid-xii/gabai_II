import { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  BookOpen, ChevronRight, ChevronDown, RefreshCw, Search,
  Users, Filter, X, Download, School, CheckCircle2, AlertCircle,
  ArrowLeft, Clock, GraduationCap
} from "lucide-react";
import { API, tok, LifeStatusBadge, RegistrarPagination } from "./RegistrarShared";

// ── Sections Tab ──────────────────────────────────────────────────────────────
export function SectionsTab() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(null);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [capacityFilter, setCapacityFilter] = useState('all');
  const [schoolYearFilter, setSchoolYearFilter] = useState('');
  const [schoolYears, setSchoolYears] = useState([]);
  const [activeYear, setActiveYear] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [headerContainer, setHeaderContainer] = useState(null);

  useEffect(() => {
    // Find the dashboard <header> containing the tab title
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

  // Available grade levels based on selected level
  const availableGrades = levelFilter === 'JHS'
    ? ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10']
    : levelFilter === 'SHS'
    ? ['Grade 11', 'Grade 12']
    : ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

  // Available program / strand options based on selected level
  const availablePrograms = levelFilter === 'JHS'
    ? [
        { value: 'Regular', label: 'Regular' },
        { value: 'SSC',     label: 'SSC (Special Science Class)' },
      ]
    : levelFilter === 'SHS'
    ? [
        { value: 'STEM',  label: 'STEM' },
        { value: 'ABM',   label: 'ABM' },
        { value: 'HUMSS', label: 'HUMSS' },
      ]
    : [
        { value: 'Regular', label: 'Regular (JHS)' },
        { value: 'SSC',     label: 'SSC (JHS)' },
        { value: 'STEM',    label: 'STEM (SHS)' },
        { value: 'ABM',     label: 'ABM (SHS)' },
        { value: 'HUMSS',   label: 'HUMSS (SHS)' },
      ];

  const loadSections = useCallback(() => {
    setLoading(true);
    fetch(`${API}/admin/sections`, { headers: tok() })
      .then(r => r.ok ? r.json() : Promise.reject('Failed'))
      .then(d => {
        setSections(Array.isArray(d) ? d : d.sections || []);
        setPage(1);
      })
      .catch(err => toast.error(typeof err === 'string' ? err : 'Failed to load sections'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSections();
    fetch(`${API}/academic/school-years`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setSchoolYears(data);
          const active = data.find(sy => sy.isActive);
          if (active) setActiveYear(active.year);
        }
      }).catch(() => {});
  }, [loadSections]);

  async function toggleSection(sectionId) {
    if (expandedId === sectionId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(sectionId);
    if (sectionStudents[sectionId]) return; // already cached
    setStudentsLoading(prev => ({ ...prev, [sectionId]: true }));
    try {
      const res = await fetch(`${API}/admin/sections/${sectionId}/students`, { headers: tok() });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setSectionStudents(prev => ({
        ...prev,
        [sectionId]: Array.isArray(data) ? data : (data.students || [])
      }));
    } catch {
      toast.error('Failed to load students for this section');
    } finally {
      setStudentsLoading(prev => ({ ...prev, [sectionId]: false }));
    }
  }

  const handleLevelChange = (val) => {
    setLevelFilter(val);
    setGradeFilter('');
    setProgramFilter('');
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setLevelFilter('');
    setGradeFilter('');
    setProgramFilter('');
    setCapacityFilter('all');
    setSchoolYearFilter('');
    setPage(1);
  };

  // Filtered sections list
  const filteredSections = useMemo(() => {
    return sections.filter(s => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        const codeMatch = s.code?.toLowerCase().includes(q);
        const instructorMatch = s.instructor?.toLowerCase().includes(q);
        const roomMatch = s.room?.toLowerCase().includes(q);
        const schedMatch = s.schedule?.toLowerCase().includes(q);
        if (!codeMatch && !instructorMatch && !roomMatch && !schedMatch) return false;
      }
      // Level
      if (levelFilter && s.course !== levelFilter) return false;
      // Grade Level
      if (gradeFilter) {
        const gNum = gradeFilter.replace(/\D/g, '');
        if (String(s.yearLevel) !== gNum && s.yearLevel !== gradeFilter && `Grade ${s.yearLevel}` !== gradeFilter) return false;
      }
      // Program / Strand
      if (programFilter) {
        if (programFilter === 'Regular') {
          if (s.strand && s.strand !== 'Regular') return false;
        } else {
          if (s.strand !== programFilter) return false;
        }
      }
      // Capacity status
      if (capacityFilter === 'full') {
        if ((s.currentEnrollment || 0) < (s.capacity || 0)) return false;
      } else if (capacityFilter === 'available') {
        if ((s.currentEnrollment || 0) >= (s.capacity || 0)) return false;
      }
      // School Year
      if (schoolYearFilter && schoolYearFilter !== 'all') {
        if (s.schoolYear !== schoolYearFilter) return false;
      }
      return true;
    });
  }, [sections, search, levelFilter, gradeFilter, programFilter, capacityFilter, schoolYearFilter]);

  // Statistics
  const totalCount = sections.length;
  const jhsCount = sections.filter(s => s.course === 'JHS').length;
  const shsCount = sections.filter(s => s.course === 'SHS').length;
  const fullCount = sections.filter(s => (s.currentEnrollment || 0) >= (s.capacity || 0)).length;
  const availableCount = totalCount - fullCount;

  const hasActiveFilters = Boolean(
    search || levelFilter || gradeFilter || programFilter || capacityFilter !== 'all' || schoolYearFilter
  );

  const totalPages = Math.ceil(filteredSections.length / pageSize);
  const paginated = filteredSections.slice((page - 1) * pageSize, page * pageSize);

  async function exportToExcel() {
    if (filteredSections.length === 0) {
      toast.error('No sections to export');
      return;
    }
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const rows = filteredSections.map((s, i) => ({
        '#': i + 1,
        'Section Code': s.code || '',
        'Education Level': s.course || '',
        'Grade Level': `Grade ${s.yearLevel || ''}`,
        'Program / Strand': s.strand || (s.course === 'JHS' ? 'Regular' : ''),
        'Adviser': s.instructor || '',
        'Schedule': s.schedule || '',
        'Room': s.room || '',
        'Enrolled': s.currentEnrollment || 0,
        'Capacity': s.capacity || 0,
        'Status': (s.currentEnrollment || 0) >= (s.capacity || 0) ? 'Full' : 'Available',
        'Semester': s.semester || '',
        'School Year': s.schoolYear || '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 4 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 16 },
        { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
        { wch: 12 }, { wch: 14 }, { wch: 12 }
      ];

      const wb = XLSX.utils.book_new();
      const parts = ['EMC_Sections'];
      if (schoolYearFilter === 'all') {
        parts.push('AllYears');
      } else if (schoolYearFilter) {
        parts.push(schoolYearFilter.replace(/\s+/g, ''));
      }

      if (levelFilter) parts.push(levelFilter);
      if (gradeFilter) parts.push(gradeFilter.replace(/\s+/g, ''));
      if (programFilter) parts.push(programFilter.replace(/\s+/g, ''));
      if (capacityFilter && capacityFilter !== 'all') {
        parts.push(capacityFilter === 'full' ? 'Full' : 'Available');
      }

      parts.push(new Date().toISOString().slice(0, 10));
      const filename = `${parts.join('_')}.xlsx`;

      const sheetName = `Sections ${schoolYearFilter || 'All'}`.slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${filteredSections.length} section${filteredSections.length !== 1 ? 's' : ''} to ${filename}`);
    } catch (err) {
      toast.error('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  }

  const statsPills = (
    <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 ml-auto">
      <button
        type="button"
        onClick={() => { setLevelFilter(''); setPage(1); }}
        className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border text-[11px] font-semibold transition-all ${
          !levelFilter
            ? 'border-[#001840] bg-[#001840]/10 text-[#001840]'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-[#001840]" /> Total Sections: {totalCount}
      </button>
      <button
        type="button"
        onClick={() => handleLevelChange(levelFilter === 'JHS' ? '' : 'JHS')}
        className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border text-[11px] font-semibold transition-all ${
          levelFilter === 'JHS'
            ? 'border-blue-500 bg-blue-100 text-blue-900 shadow-xs'
            : 'border-gray-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-blue-500" /> JHS: {jhsCount}
      </button>
      <button
        type="button"
        onClick={() => handleLevelChange(levelFilter === 'SHS' ? '' : 'SHS')}
        className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border text-[11px] font-semibold transition-all ${
          levelFilter === 'SHS'
            ? 'border-purple-500 bg-purple-100 text-purple-900 shadow-xs'
            : 'border-gray-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-purple-500" /> SHS: {shsCount}
      </button>
      <button
        type="button"
        onClick={() => { setCapacityFilter(capacityFilter === 'available' ? 'all' : 'available'); setPage(1); }}
        className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border text-[11px] font-semibold transition-all ${
          capacityFilter === 'available'
            ? 'border-emerald-500 bg-emerald-100 text-emerald-900 shadow-xs'
            : 'border-gray-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Open: {availableCount}
      </button>
      {fullCount > 0 && (
        <button
          type="button"
          onClick={() => { setCapacityFilter(capacityFilter === 'full' ? 'all' : 'full'); setPage(1); }}
          className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border text-[11px] font-semibold transition-all ${
            capacityFilter === 'full'
              ? 'border-red-500 bg-red-100 text-red-900 shadow-xs'
              : 'border-gray-200 bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-500" /> Full: {fullCount}
        </button>
      )}
    </div>
  );

  // If a section is selected, render the dedicated Section Details view
  if (activeSection) {
    return (
      <SectionDetailView
        section={activeSection}
        onBack={() => setActiveSection(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Top summary pills - rendered directly in the header beside "Sections" */}
      {headerContainer ? createPortal(statsPills, headerContainer) : null}

      {/* Filters Card - Single Horizontal Line */}
      <div className="bg-white rounded-2xl border border-gray-100 p-3.5">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2.5">
          {/* 1. Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by section, adviser, room..."
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840] placeholder:text-gray-400"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 2. All Capacities */}
            <select
              value={capacityFilter}
              onChange={e => { setCapacityFilter(e.target.value); setPage(1); }}
              className={`px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors ${
                capacityFilter !== 'all' ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <option value="all">All Capacities</option>
              <option value="available">Available (Open Seats)</option>
              <option value="full">Full (Capacity Reached)</option>
            </select>

            {/* 3. All Levels */}
            <select
              value={levelFilter}
              onChange={e => handleLevelChange(e.target.value)}
              className={`px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors ${
                levelFilter ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <option value="">All Levels</option>
              <option value="JHS">JHS (Junior High)</option>
              <option value="SHS">SHS (Senior High)</option>
            </select>

            {/* 4. All Grades */}
            <select
              value={gradeFilter}
              onChange={e => { setGradeFilter(e.target.value); setPage(1); }}
              className={`px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors ${
                gradeFilter ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <option value="">All Grades</option>
              {availableGrades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            {/* 5. All Programs */}
            <select
              value={programFilter}
              onChange={e => { setProgramFilter(e.target.value); setPage(1); }}
              className={`px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors ${
                programFilter ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <option value="">
                {levelFilter === 'JHS' ? 'All Programs (Regular & SSC)' : levelFilter === 'SHS' ? 'All Strands' : 'All Programs'}
              </option>
              {availablePrograms.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            {/* Refresh */}
            <button
              onClick={loadSections}
              title="Refresh sections"
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500 hover:text-gray-700"
            >
              <RefreshCw size={14} />
            </button>

            {/* 6. Excel Export */}
            <button
              onClick={exportToExcel}
              disabled={exporting || filteredSections.length === 0}
              title="Export to Excel"
              className="flex items-center gap-1.5 px-3.5 py-2 border border-green-200 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={14} />
              {exporting ? 'Exporting...' : 'Excel'}
            </button>

            {/* Clear filters button if any filter is active */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                title="Clear filters"
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors font-medium"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Unified Sections Table Card */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400 text-sm">
            <RefreshCw size={15} className="animate-spin text-[#001840]" /> Loading sections...
          </div>
        ) : filteredSections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <BookOpen size={36} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">No sections found</p>
            <p className="text-xs mt-1 text-gray-300">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Sections will appear once configured'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/60">
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Section</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Level / Grade</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Adviser</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Room & Schedule</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Enrolled / Cap</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(s => {
                    const enrolled = s.currentEnrollment || 0;
                    const cap = s.capacity || 0;
                    const pct = cap > 0 ? Math.round((enrolled / cap) * 100) : 0;
                    const isFull = enrolled >= cap;

                    return (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                          {/* Section Code */}
                          <td className="px-5 py-3">
                            <p className="font-bold text-[#001840] text-sm">{s.code}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {s.semester || '1st Sem'} · {s.schoolYear || ''}
                            </p>
                          </td>

                          {/* Level / Grade / Program Badge */}
                          <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-gray-800">{s.course}</span>
                              <span>· Grade {s.yearLevel}</span>
                              {s.course === 'JHS' ? (
                                s.strand === 'SSC' ? (
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

                          {/* Adviser */}
                          <td className="px-5 py-3 text-gray-700">
                            <p className="font-medium">{s.instructor || '—'}</p>
                            {s.instructor && <p className="text-[11px] text-gray-400">Class Adviser</p>}
                          </td>

                          {/* Room & Schedule */}
                          <td className="px-5 py-3 text-gray-600">
                            {s.room ? (
                              <span className="font-mono text-xs font-medium text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-200/60">
                                {s.room}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]" title={s.schedule}>
                              {s.schedule || '—'}
                            </p>
                          </td>

                          {/* Enrolled / Capacity with progress bar */}
                          <td className="px-5 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold text-sm ${isFull ? 'text-red-500 font-bold' : 'text-gray-700'}`}>
                                {enrolled} / {cap}
                              </span>
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-400' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                  isFull
                                    ? 'bg-red-50 text-red-600 border border-red-200'
                                    : 'bg-green-50 text-green-700 border border-green-200'
                                }`}
                              >
                                {isFull ? 'Full' : `${cap - enrolled} left`}
                              </span>
                            </div>
                          </td>

                          {/* Action Button: Opens dedicated Section Detail View */}
                          <td className="px-5 py-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => setActiveSection(s)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-[#001840] hover:text-[#001840] hover:bg-[#001840]/5 transition-all shadow-2xs group"
                            >
                              <Users size={12} className="text-gray-400 group-hover:text-[#001840]" />
                              <span>Students ({enrolled})</span>
                              <ChevronRight size={13} className="text-gray-400 group-hover:text-[#001840] group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            {/* Pagination Component matching Students page */}
            <RegistrarPagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredSections.length}
              pageSize={pageSize}
              onPageChange={setPage}
              itemName="items"
            />
          </>
        )}
      </div>
    </div>
  );
}

// ── Section Detail View (Adviser, Subject Time & Schedule, Students Table) ──
function SectionDetailView({ section, onBack }) {
  const [data, setData] = useState({ section, students: [], subjects: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [showSubjects, setShowSubjects] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/sections/${section.id}/students`, { headers: tok() });
      if (!res.ok) throw new Error('Failed to load section students');
      const d = await res.json();
      setData({
        section: d.section || section,
        students: Array.isArray(d) ? d : (d.students || []),
        subjects: d.subjects || [],
      });
      setPage(1);
    } catch (err) {
      toast.error(err.message || 'Error loading section details');
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sec = data.section || section;
  const allStudents = data.students || [];
  const maleCount = allStudents.filter(s => (s.sex || '').toLowerCase() === 'male').length;
  const femaleCount = allStudents.filter(s => (s.sex || '').toLowerCase() === 'female').length;
  const enrolledCount = sec.currentEnrollment ?? allStudents.length;
  const cap = sec.capacity || 0;
  const isFull = cap > 0 && enrolledCount >= cap;

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return allStudents;
    const q = search.toLowerCase();
    return allStudents.filter(st => {
      const name = `${st.firstName || ''} ${st.familyName || ''}`.toLowerCase();
      const num = (st.studentNumber || '').toLowerCase();
      const lrn = (st.lrn || '').toLowerCase();
      return name.includes(q) || num.includes(q) || lrn.includes(q);
    });
  }, [allStudents, search]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize);
  const paginated = filteredStudents.slice((page - 1) * pageSize, page * pageSize);

  async function exportStudentsToExcel() {
    if (allStudents.length === 0) {
      toast.error('No students to export');
      return;
    }
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const rows = filteredStudents.map((st, i) => ({
        '#': i + 1,
        'Last Name': st.familyName || '',
        'First Name': st.firstName || '',
        'Middle Name': st.middleName || '',
        'Student No.': st.studentNumber || '',
        'LRN': st.lrn || '',
        'Sex': st.sex || '',
        'Education Level': st.educationLevel || sec.course || '',
        'Grade Level': st.gradeLevel || `Grade ${sec.yearLevel || ''}`,
        'Section': sec.code || '',
        'Class Adviser': sec.instructor || '',
        'Enrollment Type': st.enrollmentType || 'Regular',
        'Life Status': st.lifeStatus || 'Active',
        'Status': st.status || 'Approved',
        'Date Enrolled': st.createdAt ? new Date(st.createdAt).toLocaleDateString('en-PH') : '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${sec.code}_Students`.slice(0, 31));
      XLSX.writeFile(wb, `EMC_${sec.code}_Students_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`Exported ${rows.length} students to Excel`);
    } catch (err) {
      toast.error('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-[#001840] transition-colors"
          >
            <ArrowLeft size={14} /> Back to Sections
          </button>
          <div className="h-4 w-px bg-gray-200" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-[#001840]">{sec.code}</h2>
              <span className="text-xs font-semibold text-gray-500">
                {sec.course} · Grade {sec.yearLevel}
              </span>
              {sec.course === 'JHS' ? (
                sec.strand === 'SSC' ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    SSC
                  </span>
                ) : (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-600 border border-gray-200">
                    Regular
                  </span>
                )
              ) : sec.strand ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {sec.strand}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {sec.semester || '1st Semester'} · School Year {sec.schoolYear || 'Current'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={loadData}
            title="Refresh student list"
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-[#001840]" : ""} />
          </button>
          <button
            onClick={exportStudentsToExcel}
            disabled={exporting || allStudents.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-green-200 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors disabled:opacity-40"
          >
            <Download size={13} />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* 3 Overview Cards: Adviser | Subject Time & Room | Capacity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Adviser */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#001840]/5 border border-[#001840]/10 flex items-center justify-center shrink-0">
            <GraduationCap size={20} className="text-[#001840]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Class Adviser</p>
            <p className="font-bold text-gray-900 text-sm truncate mt-0.5">{sec.instructor || 'Not Assigned'}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{sec.course} Faculty · Class Adviser</p>
          </div>
        </div>

        {/* Card 2: Subject Time & Room */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Clock size={20} className="text-blue-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Subject Time & Room</p>
            <p className="font-semibold text-gray-900 text-sm truncate mt-0.5">{sec.schedule || 'Schedule TBA'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono text-[11px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">
                {sec.room || 'Room TBA'}
              </span>
              <span className="text-xs text-gray-400">· {sec.semester || '1st Sem'}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Capacity & Enrolled */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <Users size={20} className="text-emerald-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Capacity</p>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                isFull ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {isFull ? 'Full' : `${cap - enrolledCount} left`}
              </span>
            </div>
            <p className="font-bold text-gray-900 text-sm mt-0.5">
              {enrolledCount} / {cap} Students
            </p>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5">
              <div
                className={`h-full rounded-full transition-all ${
                  isFull ? 'bg-red-500' : (enrolledCount / cap) >= 0.8 ? 'bg-yellow-400' : 'bg-green-500'
                }`}
                style={{ width: `${cap > 0 ? Math.min(Math.round((enrolledCount / cap) * 100), 100) : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Subjects & Schedule Time Section */}
      {data.subjects && data.subjects.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-[#001840]" />
              <h3 className="font-bold text-sm text-[#001840]">Subjects & Schedule ({data.subjects.length})</h3>
            </div>
            <button
              onClick={() => setShowSubjects(!showSubjects)}
              className="text-xs text-gray-500 hover:text-gray-800 font-medium flex items-center gap-1"
            >
              {showSubjects ? 'Hide' : 'Show'}
              <ChevronDown size={14} className={`transform transition-transform ${showSubjects ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showSubjects && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-400 uppercase font-semibold">
                    <th className="px-5 py-2.5">Code</th>
                    <th className="px-5 py-2.5">Subject Description</th>
                    <th className="px-5 py-2.5">Units</th>
                    <th className="px-5 py-2.5">Time / Schedule</th>
                    <th className="px-5 py-2.5">Room</th>
                    <th className="px-5 py-2.5">Instructor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.subjects.map((subj, sIdx) => (
                    <tr key={subj.code || sIdx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-2.5 font-bold text-[#001840] font-mono">{subj.code}</td>
                      <td className="px-5 py-2.5 text-gray-800 font-medium">{subj.description}</td>
                      <td className="px-5 py-2.5 text-gray-600">{subj.units || 3}</td>
                      <td className="px-5 py-2.5 text-gray-700 font-medium">{subj.schedule || sec.schedule || 'TBA'}</td>
                      <td className="px-5 py-2.5 text-gray-600 font-mono">{subj.room || sec.room || '—'}</td>
                      <td className="px-5 py-2.5 text-gray-600">{subj.instructor || sec.instructor || 'TBA'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Students Data Table Card */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Table Search & Meta Header */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search students in this section..."
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700 text-xs font-semibold">
              Total: {allStudents.length}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold">
              Male: {maleCount}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-pink-200 bg-pink-50 text-pink-700 text-xs font-semibold">
              Female: {femaleCount}
            </span>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400 text-sm">
            <RefreshCw size={15} className="animate-spin text-[#001840]" /> Loading student roster...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Users size={36} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">No students found</p>
            <p className="text-xs mt-1 text-gray-300">
              {search ? 'No students match your search query' : 'No students enrolled in this section yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/60">
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">#</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Student</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Sex</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Enrollment Type</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Life Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Date Enrolled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((st, idx) => {
                    const rowNumber = (page - 1) * pageSize + idx + 1;
                    const name = (st.firstName || st.familyName)
                      ? `${st.firstName || ''} ${st.middleName ? `${st.middleName[0]}. ` : ''}${st.familyName || ''}`.trim()
                      : (st.name || `Student #${st.id}`);

                    return (
                      <tr key={st.id || idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3 text-gray-400 font-mono text-xs">{rowNumber}</td>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-gray-800 text-sm">{name}</p>
                          <p className="text-xs text-gray-400 mt-0.5 font-mono">
                            {st.studentNumber || ''} {st.lrn ? `· LRN: ${st.lrn}` : ''}
                          </p>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          {st.sex ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                              st.sex.toLowerCase() === 'female'
                                ? 'bg-pink-50 text-pink-700 border border-pink-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {st.sex}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 capitalize text-gray-600 text-sm">
                          {st.enrollmentType || 'Regular'}
                        </td>
                        <td className="px-5 py-3">
                          {st.lifeStatus ? (
                            <LifeStatusBadge status={st.lifeStatus} />
                          ) : (
                            <span className="text-xs text-gray-300 italic">not set</span>
                          )}
                          {st.lifeStatusDate && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {new Date(st.lifeStatusDate).toLocaleDateString('en-PH')}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {st.createdAt ? new Date(st.createdAt).toLocaleDateString('en-PH') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Component matching Students page */}
            <RegistrarPagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredStudents.length}
              pageSize={pageSize}
              onPageChange={setPage}
              itemName="students"
            />
          </>
        )}
      </div>
    </div>
  );
}


