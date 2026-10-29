import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  ClipboardList, RefreshCw, Search,
  Download, X, FileText, BookOpen
} from "lucide-react";
import {
  API, tok, STATUS_CFG, StatusBadge, LifeStatusBadge,
  EnrollmentDetail, RegistrarPagination, AssignSectionModal
} from "./RegistrarShared";

export function EnrollmentsTab({ onActionSuccess }) {
  const [queryParams, setQueryParams] = useSearchParams();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assigningEnrollment, setAssigningEnrollment] = useState(null);
  const statusFilter = queryParams.get('status') || '';
  const levelFilter = queryParams.get('schoolLevel') || '';
  const yearFilter = queryParams.get('academicYear') || ''; // '' = active year
  const typeFilter = queryParams.get('enrollmentType') || '';
  const applicationId = queryParams.get('application') || '';
  function setFilter(key, value) {
    setQueryParams(previous => {
      const next = new URLSearchParams(previous);
      if (value && value !== 'all') next.set(key, value);
      else if (key === 'academicYear' && value === 'all') next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  }
  const setStatusFilter = value => setFilter('status', value);
  const setLevelFilter = value => setFilter('schoolLevel', value);
  const setYearFilter = value => setFilter('academicYear', value);
  const [schoolYears, setSchoolYears] = useState([]);
  const [activeYear, setActiveYear] = useState('');
  const [reviewingEnrollment, setReviewingEnrollment] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [headerContainer, setHeaderContainer] = useState(null);
  const visibleEnrollment = applicationId && reviewingEnrollment && String(reviewingEnrollment.id) === applicationId ? reviewingEnrollment : null;

  function closeReview() {
    setReviewingEnrollment(null);
    setFilter('application', '');
  }

  // A dashboard link must open its record even when the list has another filter.
  useEffect(() => {
    if (!applicationId) return;
    if (!/^\d+$/.test(applicationId)) {
      toast.error('Invalid application link');
      return;
    }
    const controller = new AbortController();
    fetch(`${API}/enrollments/${applicationId}`, { headers: tok(), signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Unable to open this application');
        const data = await response.json();
        setReviewingEnrollment(data.enrollment || data);
      })
      .catch(error => { if (error.name !== 'AbortError') toast.error(error.message); });
    return () => controller.abort();
  }, [applicationId]);

  useEffect(() => {
    setHeaderContainer(document.getElementById('registrar-header-slot'));
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setReviewingEnrollment(null);
        setQueryParams(previous => {
          const next = new URLSearchParams(previous);
          next.delete('application');
          return next;
        }, { replace: true });
      }
    }
    if (reviewingEnrollment) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [reviewingEnrollment, setQueryParams]);

  // Load school years for the dropdown
  useEffect(() => {
    fetch(`${API}/academic/school-years`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setSchoolYears(data);
          const active = data.find(sy => sy.isActive);
          if (active) setActiveYear(active.year);
        }
      })
      .catch(() => {});
  }, []);

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (levelFilter) params.set('schoolLevel', levelFilter);
      if (typeFilter) params.set('enrollmentType', typeFilter);
      if (search) params.set('search', search);
      if (yearFilter) params.set('academicYear', yearFilter);
      const res = await fetch(`${API}/registrar/enrollments?${params}`, { headers: tok() });
      if (!res.ok) throw new Error('Failed to fetch enrollments');
      const data = await res.json();
      setEnrollments(Array.isArray(data) ? data : data.enrollments || []);
      setPage(1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, levelFilter, search, yearFilter, typeFilter]);

  useEffect(() => {
    const t = setTimeout(fetchEnrollments, 300);
    return () => clearTimeout(t);
  }, [fetchEnrollments]);

  function handleActionSuccess() {
    fetchEnrollments();
    if (typeof onActionSuccess === 'function') onActionSuccess();
  }

  const handleResetFilters = () => {
    setSearch('');
    setQueryParams({}, { replace: true });
    setReviewingEnrollment(null);
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || statusFilter || levelFilter || yearFilter || typeFilter);

  async function exportToExcel() {
    if (enrollments.length === 0) {
      toast.error('No enrollments to export');
      return;
    }
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const rows = enrollments.map((e, i) => ({
        '#': i + 1,
        'Student Name': `${e.firstName || ''} ${e.familyName || ''}`.trim() || e.user_name || '',
        'Student No.': e.studentNumber || '',
        'LRN': e.lrn || '',
        'Education Level': e.educationLevel || '',
        'Grade Level': e.gradeLevel || '',
        'Program / Strand': e.course || e.strand || '',
        'Status': STATUS_CFG[e.status]?.label || e.status || '',
        'Life Status': e.lifeStatus || 'Active',
        'Academic Year': e.academicYear || '',
        'Email': e.user_email || '',
        'Date Submitted': e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-PH') : '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 4 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
        { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
        { wch: 24 }, { wch: 14 }
      ];
      const wb = XLSX.utils.book_new();
      const parts = ['EMC_Enrollments'];
      if (yearFilter === 'all') {
        parts.push('AllYears');
      } else if (yearFilter) {
        parts.push(yearFilter.replace(/\s+/g, ''));
      } else if (activeYear) {
        parts.push(activeYear.replace(/\s+/g, ''));
      }

      if (levelFilter) {
        parts.push(levelFilter);
      }

      if (statusFilter) {
        const statusLabel = STATUS_CFG[statusFilter]?.label || statusFilter;
        parts.push(statusLabel.replace(/\s+/g, ''));
      }

      parts.push(new Date().toISOString().slice(0, 10));
      const filename = `${parts.join('_')}.xlsx`;

      const sheetName = `Enrollments ${yearFilter || activeYear || 'All'}`.slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${enrollments.length} enrollment${enrollments.length !== 1 ? 's' : ''} to ${filename}`);
    } catch (err) {
      toast.error('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  }

  // Summary counts
  const totalCount = enrollments.length;
  const statusCounts = ['submitted', 'pending_exam', 'verified', 'returned', 'approved', 'enrolled'].reduce((acc, st) => {
    acc[st] = enrollments.filter(e => e.status === st).length;
    return acc;
  }, {});

  const totalPages = Math.ceil(enrollments.length / pageSize);
  const paginated = enrollments.slice((page - 1) * pageSize, page * pageSize);

  const statsPills = (
    <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 ml-auto">
      <button
        type="button"
        onClick={() => { setStatusFilter(''); setPage(1); }}
        className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border text-[11px] font-semibold transition-all ${
          !statusFilter
            ? 'border-[#001840] bg-[#001840] text-white shadow-xs'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <ClipboardList size={12} /> Total: {totalCount}
      </button>

      {['submitted', 'pending_exam', 'verified', 'returned', 'approved', 'enrolled'].map(st => {
        const count = statusCounts[st] || 0;
        if (count === 0) return null;
        const cfg = STATUS_CFG[st] || { label: st, color: 'bg-gray-100 text-gray-700' };
        const isActive = statusFilter === st;
        return (
          <button
            key={st}
            type="button"
            onClick={() => { setStatusFilter(isActive ? '' : st); setPage(1); }}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border text-[11px] font-semibold transition-all ${
              isActive
                ? 'border-[#001840] bg-[#001840]/10 text-[#001840] ring-1 ring-[#001840]'
                : `border-gray-200 ${cfg.color} hover:opacity-80`
            }`}
          >
            {cfg.label}: {count}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Top summary pills - rendered in header slot if available */}
      {headerContainer ? createPortal(statsPills, headerContainer) : (
        <div className="flex justify-end">{statsPills}</div>
      )}

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
              placeholder="Search by student name, LRN, student no..."
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
            {/* School Year */}
            <select
              value={yearFilter}
              onChange={e => { setYearFilter(e.target.value); setPage(1); }}
              className={`px-2.5 sm:px-3 py-2 border rounded-lg text-xs sm:text-sm focus:outline-none transition-colors shrink-0 ${
                yearFilter ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <option value="">Current Year</option>
              <option value="all">All Years</option>
              {schoolYears.map(sy => (
                <option key={sy.id} value={sy.year}>{sy.year}</option>
              ))}
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className={`px-2.5 sm:px-3 py-2 border rounded-lg text-xs sm:text-sm focus:outline-none transition-colors shrink-0 ${
                statusFilter ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <option value="">All Statuses</option>
              <option value="needs_review">Needs review</option>
              <option value="enrolled_active">Enrolled / active</option>
              <option value="awaiting_section">Awaiting section</option>
              {['submitted', 'pending_exam', 'verified', 'returned', 'approved', 'subjects_enrolled', 'enrolled', 'active', 'completed', 'rejected'].map(k => (
                <option key={k} value={k}>{STATUS_CFG[k]?.label || 'Subjects enrolled'}</option>
              ))}
            </select>

            {/* Level */}
            <select
              aria-label="School level and class"
              value={levelFilter}
              onChange={e => { setLevelFilter(e.target.value); setPage(1); }}
              className={`px-2.5 sm:px-3 py-2 border rounded-lg text-xs sm:text-sm focus:outline-none transition-colors shrink-0 ${
                levelFilter ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <option value="">All Levels</option>
              <option value="jhs_regular">JHS Regular</option>
              <option value="jhs_ssc">JHS SSC</option>
              <option value="shs">SHS</option>
            </select>

            <select aria-label="Enrollment type" value={typeFilter} onChange={e => { setFilter('enrollmentType', e.target.value); setPage(1); }} className="px-2.5 sm:px-3 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none bg-white text-gray-700">
              <option value="">All enrollment types</option>
              <option value="new">New</option>
              <option value="old">Continuing</option>
              <option value="returnee">Returnee</option>
              <option value="transferee">Transferee</option>
            </select>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchEnrollments}
              title="Refresh"
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500 hover:text-gray-700 shrink-0"
            >
              <RefreshCw size={14} />
            </button>

            {/* Excel Export */}
            <button
              type="button"
              onClick={exportToExcel}
              disabled={exporting || enrollments.length === 0}
              title="Export to Excel"
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-green-200 bg-green-50 text-green-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
            >
              <Download size={14} />
              {exporting ? 'Exporting...' : 'Excel'}
            </button>

            {/* Clear filters button */}
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

      {/* Unified Enrollments Table Card */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400 text-sm">
            <RefreshCw size={15} className="animate-spin text-[#001840]" /> Loading enrollments...
          </div>
        ) : enrollments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <ClipboardList size={36} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">No enrollments found</p>
            <p className="text-xs mt-1 text-gray-300">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Applications will appear once students register or submit'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/60">
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Applicant / Student</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Level / Grade</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">School Year</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Submitted</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(enrollment => {
                    const studentName = (enrollment.firstName || enrollment.familyName)
                      ? `${enrollment.firstName || ''} ${enrollment.familyName || ''}`.trim()
                      : (enrollment.user_name || `Student #${enrollment.userId || enrollment.id}`);

                    return (
                      <tr
                        key={enrollment.id}
                        onClick={() => setFilter('application', String(enrollment.id))}
                        className="hover:bg-gray-50/60 cursor-pointer transition-colors"
                      >
                        {/* Student Name & Identifiers */}
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-gray-900 text-sm">
                            {studentName}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {enrollment.studentNumber || enrollment.lrn ? (
                              <>
                                {enrollment.studentNumber && <span className="font-mono">{enrollment.studentNumber}</span>}
                                {enrollment.studentNumber && enrollment.lrn && <span> · </span>}
                                {enrollment.lrn && <span>LRN: {enrollment.lrn}</span>}
                              </>
                            ) : (
                              enrollment.user_email || ''
                            )}
                          </p>
                        </td>

                        {/* Level / Grade / Strand / Section */}
                        <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-gray-800">{enrollment.educationLevel}</span>
                            {enrollment.gradeLevel && <span>· {enrollment.gradeLevel}</span>}
                            {enrollment.educationLevel === 'JHS' ? (
                              enrollment.sscClass === 'SSC' || (!enrollment.sscClass && Number(enrollment.sscApplied) === 1 && enrollment.sscResult !== 'failed') ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                  SSC
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-600 border border-gray-200">
                                  Regular
                                </span>
                              )
                            ) : (enrollment.course || enrollment.strand) ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                {enrollment.course || enrollment.strand}
                              </span>
                            ) : null}

                            {/* Section Badge */}
                            {enrollment.sectionName ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Sec: {enrollment.sectionName}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                No Section
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Academic Year */}
                        <td className="px-5 py-3.5 text-xs text-gray-600 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-mono text-xs">
                            {enrollment.academicYear || activeYear || '—'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <StatusBadge status={enrollment.status} />
                            {enrollment.lifeStatus && enrollment.lifeStatus !== 'enrolled' && enrollment.lifeStatus !== enrollment.status && (
                              <LifeStatusBadge status={enrollment.lifeStatus} />
                            )}
                          </div>
                        </td>

                        {/* Date Submitted */}
                        <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                          {enrollment.createdAt ? new Date(enrollment.createdAt).toLocaleDateString('en-PH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : '—'}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssigningEnrollment(enrollment);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#102A71]/10 text-[#102A71] hover:bg-[#102A71] hover:text-white transition-all shadow-xs"
                              title={enrollment.sectionName ? 'Change Section' : 'Assign Section'}
                            >
                              <BookOpen size={12} />
                              <span>{enrollment.sectionName ? 'Section' : 'Assign'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFilter('application', String(enrollment.id));
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#001840] text-white hover:bg-[#102A71] transition-all shadow-xs"
                            >
                              <FileText size={13} />
                              <span>Review</span>
                            </button>
                          </div>
                        </td>
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
              totalItems={enrollments.length}
              pageSize={pageSize}
              onPageChange={setPage}
              itemName="enrollments"
            />
          </>
        )}
      </div>

      {/* Review Modal */}
      {visibleEnrollment && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={closeReview}
          />

          {/* Modal Container */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col z-10 border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Body */}
            <div className="overflow-y-auto flex-1">
              <EnrollmentDetail
                enrollmentId={visibleEnrollment.id}
                enrollment={visibleEnrollment}
                onClose={closeReview}
                onActionSuccess={() => {
                  fetchEnrollments();
                  if (typeof onActionSuccess === 'function') onActionSuccess();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Assign Section Modal */}
      {assigningEnrollment && (
        <AssignSectionModal
          enrollment={assigningEnrollment}
          onClose={() => setAssigningEnrollment(null)}
          onSuccess={() => {
            setAssigningEnrollment(null);
            fetchEnrollments();
            if (typeof onActionSuccess === 'function') onActionSuccess();
          }}
        />
      )}
    </div>
  );
}

export default EnrollmentsTab;
