import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Calendar, CheckCircle2, RefreshCw, Search } from "lucide-react";
import { API, tok } from "./RegistrarShared";

// ── SSC Bulk Scheduling Tab ───────────────────────────────────────────────────
export function SSCBulkTab() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [examDate, setExamDate] = useState('');
  const [passingScore, setPassingScore] = useState('75');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { loadStudents(); }, []);

  async function loadStudents() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/registrar/enrollments?status=pending_exam`,
        { headers: tok() }
      );
      const data = await res.json();
      // Only JHS SSC applicants that haven't been scheduled yet
      const sscPending = (Array.isArray(data) ? data : []).filter(
        e => e.educationLevel === 'JHS' && e.sscApplied && !e.sscExamDate
      );
      setStudents(sscPending);
    } catch {
      toast.error('Failed to load SSC applicants');
    } finally {
      setLoading(false);
    }
  }

  function toggleAll(checked) {
    if (checked) setSelected(new Set(students.map(s => s.id)));
    else setSelected(new Set());
  }

  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleBulkSchedule(e) {
    e.preventDefault();
    if (selected.size === 0) { toast.error('Select at least one student'); return; }
    if (!examDate) { toast.error('Exam date is required'); return; }
    const ps = parseFloat(passingScore);
    if (isNaN(ps) || ps < 0 || ps > 100) { toast.error('Passing score must be 0–100'); return; }

    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/registrar/enrollments/bulk-ssc-schedule`, {
        method: 'POST',
        headers: tok(),
        body: JSON.stringify({ ids: [...selected], examDate, passingScore: ps }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data);
      toast.success(data.message);
      // Refresh list — remove scheduled students
      await loadStudents();
      setSelected(new Set());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Tomorrow as the minimum selectable date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // Filter displayed list by search (client-side — list is already filtered server-side)
  const q = search.trim().toLowerCase();
  const filtered = q
    ? students.filter(s =>
      `${s.firstName} ${s.familyName}`.toLowerCase().includes(q) ||
      (s.lrn || '').toLowerCase().includes(q)
    )
    : students;

  return (
    <div className="space-y-6">


      {/* Schedule Form */}
      <form onSubmit={handleBulkSchedule}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-[#001840] uppercase tracking-wider mb-4">
          Exam Settings
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exam Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={examDate}
              min={minDate}
              onChange={e => setExamDate(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#102A71]/20 focus:border-[#102A71]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passing Score (out of 100)
            </label>
            <input
              type="number"
              value={passingScore}
              min="0"
              max="100"
              onChange={e => setPassingScore(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#102A71]/20 focus:border-[#102A71]"
            />
            <p className="text-xs text-gray-400 mt-1">
              Students scoring at or above this pass into SSC class
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {selected.size} student{selected.size !== 1 ? 's' : ''} selected
          </span>
          <button
            type="submit"
            disabled={submitting || selected.size === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#F5C400] text-[#001840] rounded-xl text-sm font-bold hover:bg-[#FFDC5F] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {submitting ? (
              <><span className="w-4 h-4 border-2 border-[#001840]/30 border-t-[#001840] rounded-full animate-spin" /> Scheduling...</>
            ) : (
              <><Calendar size={15} /> Schedule {selected.size > 0 ? selected.size : ''} Student{selected.size !== 1 ? 's' : ''}</>
            )}
          </button>
        </div>
      </form>

      {/* Result Summary */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex flex-wrap gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-700">{result.scheduled}</p>
            <p className="text-xs text-green-600 font-medium">Scheduled</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
            <p className="text-xs text-yellow-600 font-medium">Skipped</p>
          </div>
          {result.failed > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{result.failed}</p>
              <p className="text-xs text-red-600 font-medium">Failed</p>
            </div>
          )}
          {result.details?.skipped?.length > 0 && (
            <div className="w-full text-xs text-gray-500">
              <p className="font-medium mb-1">Skipped reasons:</p>
              {result.details.skipped.map((s, i) => (
                <p key={i}>• ID {s.id}: {s.reason}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Student List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={students.length > 0 && selected.size === students.length}
              onChange={e => toggleAll(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#102A71] focus:ring-[#102A71]"
            />
            <span className="text-sm font-semibold text-[#001840]">
              SSC Applicants Awaiting Schedule
            </span>
            <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {students.length}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or LRN..."
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]"
              />
            </div>
            <button
              onClick={loadStudents}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400 text-sm">
            <RefreshCw size={14} className="animate-spin" /> Loading...
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={22} className="text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-600">All SSC applicants have been scheduled</p>
            <p className="text-xs text-gray-400 mt-1">No pending SSC exam scheduling</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.length === 0 && search ? (
              <div className="py-10 text-center text-gray-400 text-sm">No students match "{search}"</div>
            ) : filtered.map(s => (
              <div
                key={s.id}
                onClick={() => toggleOne(s.id)}
                className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-colors ${selected.has(s.id) ? 'bg-[#EEF2FF]' : 'hover:bg-gray-50'
                  }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggleOne(s.id)}
                  onClick={e => e.stopPropagation()}
                  className="w-4 h-4 rounded border-gray-300 text-[#102A71] focus:ring-[#102A71] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#001840] truncate">
                    {s.firstName} {s.middleName ? s.middleName[0] + '. ' : ''}{s.familyName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {s.gradeLevel} · LRN: {s.lrn || '—'} · Applied: {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {s.grade6Average && (
                    <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      G6 Avg: {s.grade6Average}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

