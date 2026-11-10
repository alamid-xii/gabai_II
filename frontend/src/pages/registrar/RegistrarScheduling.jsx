import { useAuth } from "../../contexts/authState";
import { BACKEND_URL } from "../../config/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Calendar, CheckCircle2, RefreshCw, Search, FileText, X, ChevronLeft, ChevronRight } from "lucide-react";
import { SSCResultModal } from "./RegistrarShared";
import { API, tok } from "./registrarConfig";

function ReportCardViewer({ student, onClose }) {
  const dialog = useRef(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const modal = dialog.current;
    modal.showModal();
    let cancelled = false;
    let objectUrl;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`${API}/enrollments/${student.id}/documents`, { headers: tok(), signal: controller.signal });
        if (!response.ok) throw new Error('Could not load the submitted documents.');
        const docs = await response.json();
        const document = ['sscCard', 'f138'].map(type => (Array.isArray(docs) ? docs : []).find(item => item.documentType === type)).find(Boolean);
        if (!document) throw new Error('No submitted report card is available for this applicant.');
        if (!document.filePath?.startsWith('/uploads/documents/')) throw new Error('The report card file is unavailable.');
        const download = await fetch(`${BACKEND_URL}${document.filePath}`, { headers: tok(), signal: controller.signal });
        if (!download.ok) throw new Error('Could not open the report card. Please try again.');
        const blob = await download.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setFile({ url: objectUrl, type: blob.type, name: document.originalName || document.fileName || 'report-card' });
      } catch (err) { if (!cancelled) setError(err.message); }
    }
    load();
    return () => { cancelled = true; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); modal.close(); };
  }, [student.id]);
  return <dialog ref={dialog} aria-label="Submitted report card" onCancel={event => { event.preventDefault(); onClose(); }} className="m-auto w-[calc(100%-2rem)] max-w-4xl max-h-[90dvh] rounded-2xl border border-gray-200 p-0 shadow-2xl backdrop:bg-black/50">
    <div className="flex items-center justify-between gap-4 border-b p-4"><div><h3 className="font-bold text-[#001840]">Submitted report card</h3><p className="text-sm text-gray-500">{student.user_name || [student.firstName, student.middleName, student.familyName].filter(Boolean).join(' ')}</p></div><button type="button" aria-label="Close report card" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100"><X size={20} /></button></div>
    <div className="p-4">{error ? <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p> : !file ? <p role="status" className="p-8 text-center text-gray-500">Loading report card...</p> : <>
      {file.type === 'application/pdf' ? <iframe title="Submitted report card PDF" src={file.url} className="h-[65dvh] w-full rounded-lg border" /> : /^image\/(jpeg|png|gif|webp)$/.test(file.type) ? <img src={file.url} alt="Applicant's submitted report card" className="mx-auto max-h-[65dvh] max-w-full object-contain" /> : <p className="p-4 text-gray-500">Download this file to view the report card.</p>}
      <a href={file.url} download={file.name} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#102A71]"><FileText size={16} />Download report card</a>
    </>}</div>
  </dialog>;
}

// ── SSC Bulk Scheduling Tab ───────────────────────────────────────────────────
export function SSCBulkTab() {
  const { clearSession } = useAuth();
  const [students, setStudents] = useState([]);
  const [examApplicants, setExamApplicants] = useState([]);
  const [admissionTab, setAdmissionTab] = useState('awaiting');
  const [recording, setRecording] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [examDate, setExamDate] = useState('');
  const [passingScore, setPassingScore] = useState('75');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewing, setViewing] = useState(null);
  const [loadError, setLoadError] = useState('');

  const loadStudents = useCallback(async () => {
    try {
      const res = await fetch(
        `${API}/registrar/enrollments?status=all&educationLevel=JHS`,
        { headers: tok(), credentials: 'include', cache: 'no-store' }
      );
      const data = await res.json().catch(() => null);
      if (res.status === 401) {
        clearSession();
        throw new Error('Your session has expired. Please sign in again.');
      }
      if (!res.ok) throw new Error(data?.error || data?.message || `Could not load applicants (HTTP ${res.status}).`);
      if (!Array.isArray(data)) throw new Error('The server returned an unexpected response. Restart the backend and refresh this page.');
      // Only JHS SSC applicants that haven't been scheduled yet
      const sscPending = (Array.isArray(data) ? data : []).filter(
        e => e.educationLevel === 'JHS' && e.sscApplied && e.status === 'pending_exam' && !e.sscExamDate
      );
      setStudents(sscPending);
      setExamApplicants(data.filter(student => student.sscApplied && student.sscExamDate));
      setLoadError('');
      setSelected(previous => new Set([...previous].filter(id => sscPending.some(student => student.id === id))));
    } catch (error) {
      const message = error instanceof TypeError ? 'Could not reach the server. Check that the backend is running, then retry.' : error.message;
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  // Initial API load; state updates occur after the asynchronous request completes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadStudents(); }, [loadStudents]);

  function refreshStudents() {
    setLoading(true);
    loadStudents();
  }

  function toggleAll(checked) {
    setSelected(previous => {
      const next = new Set(previous);
      visible.forEach(student => { if (checked) next.add(student.id); else next.delete(student.id); });
      return next;
    });
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
      if (data.scheduled > 0) setAdmissionTab('results');
      toast.success(data.message);
      // Refresh list — remove scheduled students
      setLoading(true);
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

  const q = search.trim().toLowerCase();
  const filtered = students.filter(student => !q || [student.user_name, student.user_email, student.user_mobileNumber, student.mobileNumber, student.firstName, student.middleName, student.familyName, student.lrn].filter(Boolean).join(' ').toLowerCase().includes(q));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const allOnPageSelected = visible.length > 0 && visible.every(student => selected.has(student.id));

  return (
    <div className="space-y-6">


      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <button type="button" onClick={() => setAdmissionTab('awaiting')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${admissionTab === 'awaiting' ? 'bg-[#102A71] text-white' : 'bg-white text-gray-600'}`}>Awaiting schedule ({students.length})</button>
        <button type="button" onClick={() => setAdmissionTab('results')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${admissionTab === 'results' ? 'bg-[#102A71] text-white' : 'bg-white text-gray-600'}`}>Exam results ({examApplicants.filter(student => !student.sscResult).length} pending)</button>
      </div>
      {admissionTab === 'results' && <SSCExamResults applicants={examApplicants} loading={loading} error={loadError} onRefresh={refreshStudents} onRecord={setRecording} onView={setViewing} />}
      {admissionTab === 'awaiting' && <>
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
            disabled={submitting || loading || !!loadError || selected.size === 0}
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

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div><h3 className="text-sm font-semibold text-[#001840]">SSC Applicants Awaiting Schedule <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">{students.length}</span></h3><p className="mt-1 text-xs text-gray-500">Selections are kept across pages. The header checkbox selects this page.</p></div>
          <div className="flex items-center gap-2"><label className="relative"><Search size={14} className="absolute left-3 top-3 text-gray-400" /><input aria-label="Search SSC applicants" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, email, or number" className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-xs sm:w-64" /></label><button type="button" aria-label="Refresh SSC applicants" disabled={loading || submitting} onClick={refreshStudents} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"><RefreshCw size={16} /></button></div>
        </div>
        {loading ? <p role="status" className="p-10 text-center text-sm text-gray-500">Loading applicants...</p> : loadError ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 p-6 text-sm text-red-600"><p>{loadError}</p><button type="button" onClick={refreshStudents} className="rounded-lg border border-red-200 px-3 py-2 font-semibold hover:bg-red-50">Retry loading applicants</button></div> : students.length === 0 ? <div className="py-12 text-center"><CheckCircle2 size={26} className="mx-auto mb-3 text-green-600" /><p className="text-sm text-gray-600">No SSC applicants are awaiting a schedule.</p></div> : <>
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs text-gray-500"><tr><th className="w-12 px-5 py-3"><input type="checkbox" aria-label="Select all applicants on this page" checked={allOnPageSelected} disabled={submitting || !visible.length} ref={element => { if (element) element.indeterminate = !allOnPageSelected && visible.some(student => selected.has(student.id)); }} onChange={event => toggleAll(event.target.checked)} /></th><th className="px-4 py-3 font-semibold">Account full name</th><th className="px-4 py-3 font-semibold">Email</th><th className="px-4 py-3 font-semibold">Contact number</th><th className="px-4 py-3 font-semibold">Action</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{visible.map(student => <tr key={student.id} className={selected.has(student.id) ? 'bg-[#EEF2FF]' : 'hover:bg-gray-50'}>
              <td className="px-5 py-4"><input type="checkbox" aria-label={`Select ${student.user_name || student.firstName}`} checked={selected.has(student.id)} disabled={submitting} onChange={() => toggleOne(student.id)} /></td>
              <td className="px-4 py-4 font-semibold text-[#001840]">{student.user_name || [student.firstName, student.middleName, student.familyName].filter(Boolean).join(' ') || 'Not provided'}</td>
              <td className="px-4 py-4 text-gray-600">{student.user_email || student.email || 'Not provided'}</td><td className="px-4 py-4 text-gray-600">{student.user_mobileNumber || student.mobileNumber || 'Not provided'}</td>
              <td className="px-4 py-4"><button type="button" onClick={() => setViewing(student)} className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-[#102A71] hover:bg-blue-100"><FileText size={14} />View report card</button></td>
            </tr>)}{!visible.length && <tr><td colSpan={5} className="p-10 text-center text-gray-500">No applicants match your search.</td></tr>}</tbody>
          </table></div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 text-xs text-gray-500"><span>{filtered.length ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} applicants | {selected.size} selected</span><div className="flex items-center gap-3"><label className="flex items-center gap-2">Rows<select aria-label="Applicants per page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded border border-gray-200 bg-white p-1">{[10,25,50].map(size => <option key={size}>{size}</option>)}</select></label><button type="button" aria-label="Previous applicant page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded p-1 hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={18} /></button><span>{currentPage} / {totalPages}</span><button type="button" aria-label="Next applicant page" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="rounded p-1 hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={18} /></button></div></footer>
        </>}
      </div>
      </>}
      {recording && <SSCResultModal enrollment={recording} onClose={() => setRecording(null)} onSuccess={() => { setRecording(null); refreshStudents(); }} />}
      {viewing && <ReportCardViewer key={viewing.id} student={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function SSCExamResults({ applicants, loading, error, onRefresh, onRecord, onView }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const filtered = applicants.filter(student => (filter === 'all' || (filter === 'pending' ? !student.sscResult : student.sscResult === filter)) && [student.user_name, student.user_email, student.user_mobileNumber, student.firstName, student.familyName].filter(Boolean).join(' ').toLowerCase().includes(search.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(page, pages);
  return <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h3 className="font-bold text-[#001840]">Scheduled exams and results</h3><p className="mt-1 text-xs text-gray-500">Record the exam score to determine pass/fail, email the applicant, and unlock enrollment.</p></div><button type="button" onClick={onRefresh} className="rounded-lg p-2 hover:bg-gray-100" aria-label="Refresh exam results"><RefreshCw size={16} /></button></div>
    <div className="flex flex-wrap gap-3 p-5"><input aria-label="Search scheduled applicants" placeholder="Search name or email" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} className="rounded-lg border px-3 py-2 text-sm" /><select aria-label="Filter SSC results" value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }} className="rounded-lg border px-3 py-2 text-sm"><option value="pending">Awaiting result</option><option value="passed">Passed</option><option value="failed">Did not pass</option><option value="all">All results</option></select></div>
    {loading ? <p role="status" className="p-10 text-center text-gray-500">Loading applicants...</p> : error ? <p role="alert" className="p-5 text-red-600">{error}</p> : <>
      <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-gray-50 text-xs text-gray-500"><tr>{['Account full name', 'Email', 'Exam date', 'Score / Passing', 'Result', 'Actions'].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{filtered.slice((current - 1) * 10, current * 10).map(student => <tr key={student.id}><td className="px-4 py-4 font-semibold text-[#001840]">{student.user_name || [student.firstName, student.familyName].filter(Boolean).join(' ')}</td><td className="px-4 py-4">{student.user_email || student.email || '-'}</td><td className="px-4 py-4">{new Date(student.sscExamDate).toLocaleDateString('en-PH')}</td><td className="px-4 py-4">{student.sscExamScore ?? '-'} / {student.sscPassingScore ?? 75}</td><td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${student.sscResult === 'passed' ? 'bg-green-50 text-green-700' : student.sscResult === 'failed' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-800'}`}>{student.sscResult === 'passed' ? 'Passed' : student.sscResult === 'failed' ? 'Did not pass' : 'Awaiting result'}</span></td><td className="px-4 py-4"><div className="flex gap-2"><button type="button" onClick={() => onView(student)} className="whitespace-nowrap rounded-lg border px-3 py-2 text-xs text-[#102A71]">Report card</button>{!student.sscResult && student.status === 'pending_exam' && <button type="button" onClick={() => onRecord(student)} className="whitespace-nowrap rounded-lg bg-[#F5C400] px-3 py-2 text-xs font-semibold text-[#001840]">Record result</button>}</div></td></tr>)}{!filtered.length && <tr><td colSpan={6} className="p-10 text-center text-gray-500">No applicants match this result filter.</td></tr>}</tbody></table></div>
      <footer className="flex items-center justify-between border-t p-4 text-xs text-gray-500"><span>{filtered.length} applicants</span><div className="flex items-center gap-3"><button aria-label="Previous results page" disabled={current === 1} onClick={() => setPage(current - 1)} className="disabled:opacity-30"><ChevronLeft size={18} /></button><span>{current} / {pages}</span><button aria-label="Next results page" disabled={current === pages} onClick={() => setPage(current + 1)} className="disabled:opacity-30"><ChevronRight size={18} /></button></div></footer>
    </>}
  </section>;
}
