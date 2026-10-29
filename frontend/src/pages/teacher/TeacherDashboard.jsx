import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  BookOpen, Users, RefreshCw, ChevronLeft, ChevronRight,
  GraduationCap, Search, X, FlaskConical, School,
  ClipboardList, Save, CheckCircle, AlertCircle, Lock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Navbar } from '../../components/Navbar';
import { API } from '../../config/api';

const tok = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

// ── Student Detail Modal ──────────────────────────────────────────────────────
function StudentModal({ student, onClose }) {
  if (!student) return null;

  const Field = ({ label, value }) =>
    value ? (
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-[#001840]">{value}</p>
      </div>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#EEF2FF] rounded-full flex items-center justify-center">
              <GraduationCap size={18} className="text-[#102A71]" />
            </div>
            <div>
              <p className="font-bold text-[#001840] text-sm">
                {student.firstName} {student.middleName ? student.middleName[0] + '. ' : ''}{student.familyName}
              </p>
              <p className="text-xs text-gray-400">{student.studentNumber || 'No ID yet'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Type badge */}
          <div className="flex gap-2 flex-wrap">
            {student.sscClass === 'SSC' ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">
                <FlaskConical size={11} /> Special Science Class
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                <School size={11} /> Regular Class
              </span>
            )}
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
              student.status === 'enrolled' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {student.status}
            </span>
          </div>

          {/* Enrollment Info */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Enrollment Info</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Grade Level" value={student.gradeLevel} />
              <Field label="Strand" value={student.strand} />
              <Field label="Enrollment Type" value={student.enrollmentType} />
              <Field label="Student Number" value={student.studentNumber} />
              <Field label="LRN" value={student.lrn} />
              <Field label="Section" value={student.sectionName ? `Section ${student.sectionName}` : null} />
            </div>
          </div>

          {/* SSC Info — only show if applied */}
          {student.sscApplied ? (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
              <p className="text-xs font-bold text-yellow-700 uppercase tracking-wider mb-3">SSC Information</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Qualified" value={student.sscQualified ? 'Yes' : 'No'} />
                <Field label="Class" value={student.sscClass} />
                <Field label="Exam Date" value={student.sscExamDate ? new Date(student.sscExamDate).toLocaleDateString() : null} />
                <Field label="Exam Score" value={student.sscExamScore ? `${student.sscExamScore} / 100` : null} />
                <Field label="Result" value={student.sscResult} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Section Students View ─────────────────────────────────────────────────────
export function SectionView({ section, onBack }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    fetch(`${API}/teacher/sections/${section.id}/students`, { headers: tok() })
      .then(r => r.ok ? r.json() : Promise.reject('Failed'))
      .then(data => setStudents(data.students || []))
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  }, [section.id]);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = students.filter(s =>
    !search ||
    `${s.firstName} ${s.familyName}`.toLowerCase().includes(search.toLowerCase()) ||
    (s.studentNumber || '').includes(search) ||
    (s.lrn || '').includes(search)
  );

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pagedStudents = filtered.slice((page - 1) * pageSize, page * pageSize);

  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
    if (page >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  const pages = getPageNumbers();
  const startItem = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, filtered.length);

  const sscCount = students.filter(s => s.sscClass === 'SSC').length;
  const regularCount = students.filter(s => s.sscClass !== 'SSC').length;
  const isSscSection = section.strand === 'SSC';

  return (
    <div className="space-y-5">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[#102A71] hover:text-[#001840] font-medium transition-colors">
          <ChevronLeft size={16} /> Back to Sections
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-[#001840]">Section {section.code}</h2>
              {isSscSection ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">
                  <FlaskConical size={10} /> SSC
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                  <School size={10} /> Regular
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {section.course} · Grade {section.yearLevel}
              {section.strand && section.strand !== 'SSC' ? ` · ${section.strand}` : ''}
              {section.semester ? ` · ${section.semester}` : ''}
              {section.schoolYear ? ` · ${section.schoolYear}` : ''}
            </p>
            {section.schedule && <p className="text-xs text-gray-400 mt-0.5">{section.schedule}{section.room ? ` · ${section.room}` : ''}</p>}
          </div>
          <div className="flex gap-3">
            <div className="text-center px-4 py-2 bg-gray-50 rounded-xl">
              <p className="text-xl font-bold text-[#001840]">{students.length}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            {sscCount > 0 && (
              <div className="text-center px-4 py-2 bg-yellow-50 rounded-xl">
                <p className="text-xl font-bold text-yellow-700">{sscCount}</p>
                <p className="text-xs text-yellow-600">SSC</p>
              </div>
            )}
            {regularCount > 0 && (
              <div className="text-center px-4 py-2 bg-blue-50 rounded-xl">
                <p className="text-xl font-bold text-blue-700">{regularCount}</p>
                <p className="text-xs text-blue-600">Regular</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, student ID, or LRN..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#102A71]/20 focus:border-[#102A71] bg-white"
        />
        {search && (
          <button
            onClick={() => { setSearch(''); setPage(1); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Student List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400 text-sm">
            <RefreshCw size={14} className="animate-spin" /> Loading students...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">{search ? 'No students match your search' : 'No students in this section yet'}</p>
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/60">
              <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Name</div>
                <div className="col-span-3">Student ID / LRN</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-1"></div>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {pagedStudents.map((s, idx) => {
                const globalIdx = (page - 1) * pageSize + idx + 1;
                return (
                  <div key={s.id}
                    onClick={() => setSelectedStudent(s)}
                    className="grid grid-cols-12 gap-3 px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors items-center">
                    <div className="col-span-1 text-xs text-gray-400">{globalIdx}</div>
                    <div className="col-span-5">
                      <p className="text-sm font-semibold text-[#001840] truncate">
                        {s.familyName}, {s.firstName}{s.middleName ? ` ${s.middleName[0]}.` : ''}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.gradeLevel}{s.strand && s.strand !== 'SSC' ? ` · ${s.strand}` : ''}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-xs font-mono text-gray-700">{s.studentNumber || '—'}</p>
                      <p className="text-xs text-gray-400">{s.lrn || '—'}</p>
                    </div>
                    <div className="col-span-2">
                      {s.sscClass === 'SSC' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                          <FlaskConical size={9} /> SSC
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          <School size={9} /> Regular
                        </span>
                      )}
                    </div>
                    <div className="col-span-1 text-right">
                      <span className="text-xs text-[#102A71] hover:underline">View</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-white">
              <p className="text-xs text-gray-500">
                Showing <span className="font-semibold text-gray-700">{startItem}</span> to{' '}
                <span className="font-semibold text-gray-700">{endItem}</span> of{' '}
                <span className="font-semibold text-gray-700">{filtered.length}</span> students
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-end">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} />
                    <span>Prev</span>
                  </button>

                  {pages.map((p, idx) =>
                    p === '...' ? (
                      <span key={`dots_${idx}`} className="px-2 text-xs text-gray-400">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`min-w-7 h-7 px-2 text-xs rounded-lg font-semibold transition-colors ${
                          page === p
                            ? 'bg-[#102A71] text-white shadow-2xs'
                            : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Student detail modal */}
      {selectedStudent && (
        <StudentModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </div>
  );
}

// ── Grade Sheet ───────────────────────────────────────────────────────────────
function GradeSheet({ cls, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({}); // { enrollmentSubjectId_quarter: true }
  const [edits, setEdits] = useState({});   // { `${esId}_${quarter}`: value }
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const QUARTERS = ['Q1', 'Q2', 'Q3'];
  const QUARTER_LABELS = { Q1: '1st Tri', Q2: '2nd Tri', Q3: '3rd Tri' };

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API}/teacher/classes/${cls.sectionId}/${encodeURIComponent(cls.subjectCode)}/grades`, { headers: tok() })
      .then(r => r.ok ? r.json() : Promise.reject('Failed'))
      .then(d => { setData(d); setEdits({}); })
      .catch(() => toast.error('Failed to load grade sheet'))
      .finally(() => setLoading(false));
  }, [cls.sectionId, cls.subjectCode]);

  useEffect(() => { load(); }, [load]);

  const openQuarters = data?.gradingPeriods
    ? new Set(data.gradingPeriods.filter(p => p.isOpen).map(p => p.quarter))
    : new Set();

  function editKey(esId, q) { return `${esId}_${q}`; }

  function handleInput(esId, quarter, value) {
    const k = editKey(esId, quarter);
    // Allow empty (clear) or number 0-100
    if (value === '' || (Number(value) >= 0 && Number(value) <= 100)) {
      setEdits(prev => ({ ...prev, [k]: value }));
    }
  }

  async function saveGrade(esId, quarter) {
    const k = editKey(esId, quarter);
    const raw = edits[k];
    if (raw === undefined) return; // nothing changed
    const grade = raw === '' ? null : parseFloat(raw);

    setSaving(prev => ({ ...prev, [k]: true }));
    try {
      const res = await fetch(`${API}/teacher/grades/${esId}`, {
        method: 'PUT',
        headers: tok(),
        body: JSON.stringify({ quarter, grade }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to save');
      toast.success(`${quarter} grade saved`);
      // Update local data optimistically
      setData(prev => ({
        ...prev,
        students: prev.students.map(s =>
          s.enrollmentSubjectId === esId
            ? { ...s, [quarter.toLowerCase()]: grade, finalGrade: resData.finalGrade, remarks: resData.remarks }
            : s
        )
      }));
      setEdits(prev => { const n = { ...prev }; delete n[k]; return n; });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(prev => { const n = { ...prev }; delete n[k]; return n; });
    }
  }

  function remarksBadge(remarks) {
    if (!remarks || remarks === 'Incomplete') return <span className="text-xs text-gray-400 italic">Incomplete</span>;
    if (remarks === 'Passed') return <span className="text-xs font-bold text-emerald-600">Passed</span>;
    return <span className="text-xs font-bold text-red-500">Failed</span>;
  }

  const allStudents = data?.students || [];
  const filteredStudents = allStudents.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const fullName = `${s.familyName || ''} ${s.firstName || ''} ${s.middleName || ''}`.toLowerCase();
    const studentNum = (s.studentNumber || '').toLowerCase();
    const lrn = (s.lrn || '').toLowerCase();
    return fullName.includes(q) || studentNum.includes(q) || lrn.includes(q);
  });

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const pagedStudents = filteredStudents.slice((page - 1) * pageSize, page * pageSize);

  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
    if (page >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  const pages = getPageNumbers();
  const startItem = filteredStudents.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, filteredStudents.length);

  return (
    <div className="space-y-4">
      {/* Top back button */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-[#102A71] hover:text-[#001840] hover:bg-gray-50 transition-colors shadow-2xs"
        >
          <ChevronLeft size={14} />
          <span>Back to Classes</span>
        </button>
      </div>

      {/* Header Info Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-[#102A71] bg-[#EEF2FF] border border-[#102A71]/20 px-2 py-0.5 rounded-md">
                {cls.subjectCode}
              </span>
              <h2 className="text-xl font-bold text-[#001840]">{cls.subjectDescription}</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Section <span className="font-semibold text-gray-700">{cls.sectionName}</span> · {cls.course} Grade {cls.yearLevel}
              {cls.strand ? ` · ${cls.strand}` : ''}
              {cls.schoolYear ? ` · SY ${cls.schoolYear}` : ''}
              {cls.semester ? ` · ${cls.semester}` : ''}
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors font-medium"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {/* Quarter status chips */}
        {data?.gradingPeriods && data.gradingPeriods.length > 0 && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {QUARTERS.map(q => {
              const period = data.gradingPeriods.find(p => p.quarter === q);
              const label = QUARTER_LABELS[q] || q;
              if (!period) return (
                <span key={q} className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-400 text-xs rounded-full">
                  <Lock size={9} /> {label} — Not set up
                </span>
              );
              return (
                <span key={q} className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-semibold ${
                  period.isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {period.isOpen ? <CheckCircle size={9} /> : <Lock size={9} />}
                  {label} — {period.isOpen ? 'Open' : 'Closed'}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Search & Counter Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search student by name, student ID, or LRN..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-9 py-2 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#102A71]/20 focus:border-[#102A71] transition-all text-[#001840]"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500 font-medium sm:text-right">
          Total Students: <span className="font-bold text-[#001840]">{allStudents.length}</span>
        </div>
      </div>

      {/* Grade table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
          <RefreshCw size={18} className="animate-spin mx-auto mb-2" /> Loading students and grades...
        </div>
      ) : !allStudents.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
          <Users size={32} className="mx-auto mb-3 opacity-40 text-gray-300" />
          <p className="font-semibold text-gray-600">No students enrolled in this class</p>
          <p className="text-xs text-gray-400 mt-1">Students enrolled in this section and subject will automatically appear here.</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Search size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-semibold text-[#001840]">No students matched "{search}"</p>
          <button
            onClick={() => { setSearch(''); setPage(1); }}
            className="mt-3 text-xs text-[#102A71] hover:underline font-semibold"
          >
            Clear search filter
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FFFDF0] border-b border-gray-100 text-xs font-bold text-[#001840] uppercase tracking-wider">
                <tr>
                  <th className="text-center px-4 py-3.5 w-12 text-gray-400">#</th>
                  <th className="text-left px-5 py-3.5">Student</th>
                  {QUARTERS.map(q => (
                    <th key={q} className="text-center px-4 py-3.5 whitespace-nowrap">
                      <span className={openQuarters.has(q) ? 'text-emerald-700' : 'text-gray-400'}>
                        {openQuarters.has(q) ? <CheckCircle size={11} className="inline mr-1 text-emerald-600" /> : <Lock size={11} className="inline mr-1 text-gray-400" />}
                        {QUARTER_LABELS[q] || q}
                      </span>
                    </th>
                  ))}
                  <th className="text-center px-4 py-3.5 text-gray-600">Final</th>
                  <th className="text-center px-4 py-3.5 text-gray-600">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagedStudents.map((s, idx) => {
                  const globalIdx = (page - 1) * pageSize + idx + 1;
                  const name = `${s.familyName}, ${s.firstName}${s.middleName ? ` ${s.middleName[0]}.` : ''}`;
                  return (
                    <tr key={s.enrollmentSubjectId} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-[#FFFDF0] transition-colors`}>
                      <td className="px-4 py-3 text-center text-xs text-gray-400 font-mono">
                        {globalIdx}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-[#001840] text-sm">{name}</p>
                        <p className="text-xs text-gray-400">
                          {s.studentNumber ? `ID: ${s.studentNumber}` : ''}
                          {s.studentNumber && s.lrn ? ' · ' : ''}
                          {s.lrn ? `LRN: ${s.lrn}` : ''}
                        </p>
                      </td>
                      {QUARTERS.map(q => {
                        const col = q.toLowerCase();
                        const k = editKey(s.enrollmentSubjectId, q);
                        const isOpen = openQuarters.has(q);
                        const isSaving = saving[k];
                        const hasEdit = edits[k] !== undefined;
                        const displayVal = hasEdit ? edits[k] : (s[col] !== null && s[col] !== undefined ? String(s[col]) : '');
                        return (
                          <td key={q} className="px-4 py-3 text-center">
                            {isOpen ? (
                              <div className="flex items-center gap-1 justify-center">
                                <input
                                  type="number"
                                  min="0" max="100" step="0.01"
                                  value={displayVal}
                                  onChange={e => handleInput(s.enrollmentSubjectId, q, e.target.value)}
                                  onBlur={() => saveGrade(s.enrollmentSubjectId, q)}
                                  onKeyDown={e => { if (e.key === 'Enter') { e.target.blur(); } }}
                                  placeholder="—"
                                  className={`w-16 text-center text-sm border rounded-lg py-1.5 px-1 focus:outline-hidden focus:ring-2 transition-all ${
                                    hasEdit
                                      ? 'border-[#F5C400] focus:ring-[#F5C400]/30 bg-[#FFFDF0]'
                                      : 'border-gray-200 focus:ring-[#102A71]/20 focus:border-[#102A71] bg-white'
                                  }`}
                                />
                                {isSaving && <RefreshCw size={11} className="animate-spin text-gray-400 shrink-0" />}
                                {hasEdit && !isSaving && (
                                  <button
                                    onClick={() => saveGrade(s.enrollmentSubjectId, q)}
                                    title="Save Grade"
                                    className="text-emerald-600 hover:text-emerald-700"
                                  >
                                    <Save size={12} />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className={`font-semibold ${s[col] !== null && s[col] !== undefined ? 'text-[#001840]' : 'text-gray-300'}`}>
                                {s[col] !== null && s[col] !== undefined ? s[col] : '—'}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-[#001840]">
                          {s.finalGrade !== null && s.finalGrade !== undefined ? s.finalGrade : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {remarksBadge(s.remarks)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-white">
            <p className="text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-700">{startItem}</span> to{' '}
              <span className="font-semibold text-gray-700">{endItem}</span> of{' '}
              <span className="font-semibold text-gray-700">{filteredStudents.length}</span> students
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-end">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>

                {pages.map((p, idx) =>
                  p === '...' ? (
                    <span key={`dots_${idx}`} className="px-2 text-xs text-gray-400">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`min-w-7 h-7 px-2 text-xs rounded-lg font-semibold transition-colors ${
                        page === p
                          ? 'bg-[#102A71] text-white shadow-2xs'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-400">
            <AlertCircle size={12} />
            Grades auto-save on blur (click outside the field) or press Enter. Only open quarters are editable.
          </div>
        </div>
      )}
    </div>
  );
}

// ── My Classes View ───────────────────────────────────────────────────────────
export function MyClassesView() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeClass, setActiveClass] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetch(`${API}/teacher/classes`, { headers: tok() })
      .then(r => r.ok ? r.json() : Promise.reject('Failed'))
      .then(data => setClasses(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Failed to load classes'))
      .finally(() => setLoading(false));
  }, []);

  if (activeClass) {
    return <GradeSheet cls={activeClass} onBack={() => setActiveClass(null)} />;
  }

  const filtered = classes.filter(cls => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (cls.subjectCode || '').toLowerCase().includes(q) ||
      (cls.subjectDescription || '').toLowerCase().includes(q) ||
      (cls.sectionName || '').toLowerCase().includes(q) ||
      (cls.course || '').toLowerCase().includes(q) ||
      (cls.strand || '').toLowerCase().includes(q) ||
      `grade ${cls.yearLevel}`.includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pagedClasses = filtered.slice((page - 1) * pageSize, page * pageSize);

  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
    if (page >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  const pages = getPageNumbers();
  const startItem = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, filtered.length);

  return (
    <div className="space-y-4">
      {/* Search & Summary Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by subject, section, or grade level..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-9 py-2 text-sm bg-gray-50/60 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#102A71]/20 focus:border-[#102A71] transition-all text-[#001840]"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500 font-medium sm:text-right">
          Total Classes: <span className="font-bold text-[#001840]">{classes.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400 text-sm">
          <RefreshCw size={20} className="animate-spin mx-auto mb-3 text-gray-300" />
          Loading your assigned classes...
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <ClipboardList size={40} className="mx-auto mb-4 text-gray-300" />
          <p className="text-sm font-semibold text-[#001840]">No subject assignments yet</p>
          <p className="text-xs text-gray-500 mt-1">Ask the admin or registrar to assign you as a teacher to subjects in sections.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Search size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-semibold text-[#001840]">No classes matched "{search}"</p>
          <button
            onClick={() => { setSearch(''); setPage(1); }}
            className="mt-3 text-xs text-[#102A71] hover:underline font-semibold"
          >
            Clear search filter
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#FFFDF0] border-b border-gray-100 text-xs font-bold text-[#001840] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Subject</th>
                  <th className="px-4 py-3.5">Section</th>
                  <th className="px-4 py-3.5">Level & Program</th>
                  <th className="px-4 py-3.5">Academic Year</th>
                  <th className="px-4 py-3.5 text-center">Students</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagedClasses.map((cls) => (
                  <tr
                    key={`${cls.sectionId}_${cls.subjectCode}`}
                    onClick={() => setActiveClass(cls)}
                    className="hover:bg-[#FFFDF0]/80 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-[#102A71] bg-[#EEF2FF] border border-[#102A71]/20 px-2.5 py-1 rounded-lg">
                          {cls.subjectCode}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-[#001840] text-sm group-hover:text-[#102A71] transition-colors truncate">
                            {cls.subjectDescription}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-gray-800 text-sm">
                        Section {cls.sectionName}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600">
                      <span className="font-medium text-gray-800">
                        {cls.course} · Grade {cls.yearLevel}
                      </span>
                      {cls.strand && (
                        <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px]">
                          {cls.strand}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600">
                      {cls.schoolYear ? (
                        <span>{cls.schoolYear} {cls.semester ? `· ${cls.semester}` : ''}</span>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <Users size={12} />
                        {cls.studentCount || 0}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveClass(cls); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#102A71] hover:bg-[#001840] text-white rounded-lg text-xs font-semibold transition-all shadow-2xs group-hover:scale-[1.02]"
                      >
                        <ClipboardList size={13} />
                        <span>Enter Grades →</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-white">
            <p className="text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-700">{startItem}</span> to{' '}
              <span className="font-semibold text-gray-700">{endItem}</span> of{' '}
              <span className="font-semibold text-gray-700">{filtered.length}</span> classes
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-end">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>

                {pages.map((p, idx) =>
                  p === '...' ? (
                    <span key={`dots_${idx}`} className="px-2 text-xs text-gray-400">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`min-w-7 h-7 px-2 text-xs rounded-lg font-semibold transition-colors ${
                        page === p
                          ? 'bg-[#102A71] text-white shadow-2xs'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Teacher Dashboard ────────────────────────────────────────────────────
export function TeacherDashboard({ initialView = 'sections' }) {
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(null);
  const [activeView, setActiveView] = useState(initialView); // 'sections' | 'classes'

  // Auth guard — only teachers
  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { navigate('/login'); return; }
    if (user?.role !== 'teacher') { navigate('/'); return; }
  }, [authLoading, isLoggedIn, user, navigate]);

  useEffect(() => {
    if (authLoading || !isLoggedIn || user?.role !== 'teacher') return;
    fetch(`${API}/teacher/sections`, { headers: tok() })
      .then(r => r.ok ? r.json() : Promise.reject('Failed'))
      .then(data => setSections(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Failed to load sections'))
      .finally(() => setLoading(false));
  }, [authLoading, isLoggedIn, user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isLoggedIn || user?.role !== 'teacher') return null;

  const totalStudents = sections.reduce((sum, s) => sum + (Number(s.studentCount) || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 lg:pl-65">
      <Navbar variant="teacher" activeView={activeView} onViewChange={(view) => { setActiveView(view); setActiveSection(null); navigate(`/teacher/${view}`); }} />
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 shadow-sm px-6 py-4 sticky top-0 z-20 mt-16 lg:mt-0">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#001840]">
              {activeView === 'classes' ? 'My Classes' : activeSection ? `Section ${activeSection.code}` : 'My Sections'}
            </h1>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-[#001840]">{user?.name}</p>
                <p className="text-xs text-gray-400">Teacher</p>
              </div>
              <div className="w-9 h-9 bg-[#001840] rounded-full flex items-center justify-center text-white text-sm font-bold">
                {(user?.name || 'T')[0].toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          {activeView === 'classes' ? (
            <MyClassesView />
          ) : activeSection ? (
            <SectionView section={activeSection} onBack={() => setActiveSection(null)} />
          ) : (
            <div className="space-y-5">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-[#001840] text-white rounded-2xl p-5">
                  <p className="text-3xl font-bold">{sections.length}</p>
                  <p className="text-xs opacity-70 mt-1">My Sections</p>
                </div>
                <div className="bg-emerald-600 text-white rounded-2xl p-5">
                  <p className="text-3xl font-bold">{totalStudents}</p>
                  <p className="text-xs opacity-70 mt-1">Total Students</p>
                </div>
              </div>

              {/* Sections list */}
              {loading ? (
                <div className="flex items-center justify-center py-20 gap-2 text-gray-400 text-sm">
                  <RefreshCw size={15} className="animate-spin" /> Loading...
                </div>
              ) : sections.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
                  <BookOpen size={40} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">No sections assigned yet</p>
                  <p className="text-xs text-gray-400 mt-1">Contact the admin to assign sections to your account.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sections.map(s => {
                    const enrolled = Number(s.studentCount) || 0;
                    const cap = s.capacity || 0;
                    const pct = cap > 0 ? Math.round((enrolled / cap) * 100) : 0;
                    const isSsc = s.strand === 'SSC';
                    return (
                      <div key={s.id}
                        onClick={() => setActiveSection(s)}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-[#102A71]/30 transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-[#001840]">Section {s.code}</p>
                              {isSsc ? (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full">
                                  <FlaskConical size={9} /> SSC
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                                  <School size={9} /> Regular
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {s.course} · Grade {s.yearLevel}
                              {s.strand && s.strand !== 'SSC' ? ` · ${s.strand}` : ''}
                            </p>
                          </div>
                          <div className="w-9 h-9 bg-[#EEF2FF] rounded-xl flex items-center justify-center shrink-0">
                            <Users size={15} className="text-[#102A71]" />
                          </div>
                        </div>

                        {s.schedule && (
                          <p className="text-xs text-gray-400 mb-3">{s.schedule}{s.room ? ` · ${s.room}` : ''}</p>
                        )}

                        {/* Enrollment bar */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">{enrolled} students</span>
                            <span className="text-gray-400">{cap} capacity</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-50">
                          <span className="text-xs text-[#102A71] font-semibold">View Students →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
