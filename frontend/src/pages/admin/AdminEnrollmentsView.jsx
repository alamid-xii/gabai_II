import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  FileText, Search, RefreshCw, X, Eye, ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { AdminStatusBadge } from "./AdminShared";
import { API } from "../../config/api";

export function AdminEnrollmentsView() {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(''); // '' = active year
  const [schoolYears, setSchoolYears] = useState([]);
  const [activeYear, setActiveYear] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const tok = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });

  // Load school years once
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

  async function loadEnrollments() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (yearFilter) params.set('academicYear', yearFilter);
      const res = await fetch(`${API}/admin/enrollments?${params}`, { headers: tok() });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setEnrollments(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadEnrollments(); }, [yearFilter]);

  const filtered = useMemo(() => {
    return enrollments.filter(e => {
      const matchSearch = !search.trim() ||
        `${e.firstName} ${e.familyName}`.toLowerCase().includes(search.trim().toLowerCase()) ||
        (e.studentNumber || '').toLowerCase().includes(search.trim().toLowerCase()) ||
        (e.course || '').toLowerCase().includes(search.trim().toLowerCase()) ||
        (e.strand || '').toLowerCase().includes(search.trim().toLowerCase());
      const matchStatus = statusFilter === 'all' || 
        (statusFilter === 'enrolled' 
          ? ['approved','subjects_enrolled','enrolled'].includes(e.status)
          : e.status === statusFilter);
      const matchLevel = levelFilter === 'all' || e.educationLevel === levelFilter;
      return matchSearch && matchStatus && matchLevel;
    });
  }, [enrollments, search, statusFilter, levelFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (page >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  const hasActiveFilters = Boolean(search || statusFilter !== 'all' || levelFilter !== 'all' || yearFilter);
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setLevelFilter('all');
    setYearFilter('');
    setPage(1);
  };

  const counts = {
    total: enrollments.length,
    enrolled: enrollments.filter(e => ['approved','subjects_enrolled','enrolled'].includes(e.status)).length,
    submitted: enrollments.filter(e => e.status === 'submitted').length,
    rejected: enrollments.filter(e => e.status === 'rejected').length,
  };

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#001840] text-white rounded-xl p-4 shadow-xs">
          <p className="text-2xl font-bold">{counts.total}</p>
          <p className="text-xs opacity-80 mt-0.5">Total Applications</p>
        </div>
        <div className="bg-emerald-600 text-white rounded-xl p-4 shadow-xs">
          <p className="text-2xl font-bold">{counts.enrolled}</p>
          <p className="text-xs opacity-80 mt-0.5">Enrolled</p>
        </div>
        <div className="bg-blue-600 text-white rounded-xl p-4 shadow-xs">
          <p className="text-2xl font-bold">{counts.submitted}</p>
          <p className="text-xs opacity-80 mt-0.5">Submitted</p>
        </div>
        <div className="bg-red-600 text-white rounded-xl p-4 shadow-xs">
          <p className="text-2xl font-bold">{counts.rejected}</p>
          <p className="text-xs opacity-80 mt-0.5">Rejected</p>
        </div>
      </div>

      {/* Active year indicator */}
      {activeYear && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
          Showing: <span className="font-semibold text-[#001840]">
            {yearFilter === 'all' ? 'All School Years' : yearFilter || activeYear}
          </span>
          {!yearFilter && <span className="text-gray-400">(active year)</span>}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by student name, #, strand..."
            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#001840] transition-colors"
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

        {/* School Year filter */}
        <select
          value={yearFilter}
          onChange={e => { setYearFilter(e.target.value); setPage(1); }}
          className={`px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors ${
            yearFilter ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
          }`}
        >
          <option value="">Current Year</option>
          <option value="all">All Years</option>
          {schoolYears.map(sy => (
            <option key={sy.id} value={sy.year}>{sy.year}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className={`px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors ${
            statusFilter !== 'all' ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
          }`}
        >
          <option value="all">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="pending_exam">Pending Exam</option>
          <option value="enrolled">Enrolled</option>
          <option value="returned">Returned</option>
          <option value="rejected">Rejected</option>
        </select>

        {/* Level filter */}
        <select
          value={levelFilter}
          onChange={e => { setLevelFilter(e.target.value); setPage(1); }}
          className={`px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors ${
            levelFilter !== 'all' ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
          }`}
        >
          <option value="all">All Levels</option>
          <option value="JHS">JHS (Junior High)</option>
          <option value="SHS">SHS (Senior High)</option>
        </select>

        {/* Refresh button */}
        <button
          type="button"
          onClick={loadEnrollments}
          title="Refresh enrollments list"
          className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500 hover:text-gray-700"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
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
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
            <RefreshCw size={16} className="animate-spin text-[#001840]" />
            Loading enrollments...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText size={36} className="mb-3 opacity-30 text-gray-400" />
            <p className="text-sm font-semibold text-gray-600">No enrollments found</p>
            <p className="text-xs mt-1 text-gray-400">
              {hasActiveFilters ? 'Try adjusting your search query or filter options' : 'Enrollment applications will appear here.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 px-3 py-1.5 text-xs text-[#001840] bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-colors"
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
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Student</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Level & Grade</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Type</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Date Applied</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-gray-900">{e.firstName} {e.familyName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{e.studentNumber || `#${e.id}`}</p>
                        {e.sscApplied == 1 && (
                          <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full mt-1 inline-block font-semibold">
                            SSC Applicant
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            e.educationLevel === 'JHS'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200/70'
                              : 'bg-purple-50 text-purple-700 border border-purple-200/70'
                          }`}>
                            {e.educationLevel} {e.gradeLevel ? `· Grade ${e.gradeLevel}` : ''}
                          </span>
                          {e.strand && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              {e.strand}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {e.enrollmentType ? (
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                            e.enrollmentType === 'new' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            e.enrollmentType === 'old' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {e.enrollmentType}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <AdminStatusBadge status={e.status} />
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                        {e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-PH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : '—'}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/enrollment/${e.id}`, { state: { fromAdmin: true } })}
                          className="p-1.5 text-gray-500 hover:text-[#001840] hover:bg-gray-100 rounded-lg transition-colors inline-flex items-center justify-center"
                          title="View Application Details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-white">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-500">
                  Showing <span className="font-semibold text-gray-800">{(page - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-semibold text-gray-800">{Math.min(page * pageSize, filtered.length)}</span> of{' '}
                  <span className="font-semibold text-gray-800">{filtered.length}</span> enrollments
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
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

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

                  {getPageNumbers().map((p, idx) => {
                    if (p === '...') {
                      return (
                        <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-sm text-gray-400 select-none">
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
    </div>
  );
}
