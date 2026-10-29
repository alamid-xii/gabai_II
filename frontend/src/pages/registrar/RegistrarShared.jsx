import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  ClipboardList, BookOpen, X,
  Search, ChevronDown, ChevronUp, FileText, CheckCircle2,
  RotateCcw, Calendar, ClipboardCheck, Download,
  Clock, RefreshCw, Filter, Users, UserX, UserCheck, ArrowRightLeft,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Navbar } from '../../components/Navbar';
import { API as CONFIG_API } from '../../config/api';

export const API = CONFIG_API;
export const tok = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });

// ── Application status config (enrollment pipeline) ──────────────────────────
export const STATUS_CFG = {
  draft:             { label: 'Draft',             color: 'bg-gray-100 text-gray-700' },
  submitted:         { label: 'Pending',           color: 'bg-amber-100 text-amber-800' },
  pending_exam:      { label: 'Pending Exam',       color: 'bg-yellow-100 text-yellow-700' },
  verified:          { label: 'Verified',           color: 'bg-purple-100 text-purple-700' },
  returned:          { label: 'Returned',           color: 'bg-orange-100 text-orange-700' },
  approved:          { label: 'Approved',           color: 'bg-green-100 text-green-700' },
  subjects_enrolled: { label: 'Subjects enrolled',  color: 'bg-indigo-100 text-indigo-700' },
  enrolled:          { label: 'Enrolled',           color: 'bg-emerald-100 text-emerald-700' },
  active:            { label: 'Active',             color: 'bg-cyan-100 text-cyan-700' },
  completed:         { label: 'Completed',          color: 'bg-slate-100 text-slate-700' },
  rejected:          { label: 'Rejected',           color: 'bg-red-100 text-red-700' },
};

// ── Life status config (what happened to the student after enrollment) ────────
export const LIFE_STATUS_CFG = {
  enrolled:         { label: 'Enrolled',          color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  dropped:          { label: 'Dropped',            color: 'bg-red-100 text-red-700',         dot: 'bg-red-500' },
  transferred_out:  { label: 'Transferred Out',    color: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-500' },
  transferred_in:   { label: 'Transferred In',     color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500' },
  retained:         { label: 'Retained',           color: 'bg-yellow-100 text-yellow-700',   dot: 'bg-yellow-500' },
  completed:        { label: 'Completed',          color: 'bg-slate-100 text-slate-600',     dot: 'bg-slate-400' },
};

export function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.color}`}>{c.label}</span>;
}

export function LifeStatusBadge({ status }) {
  if (!status) return null;
  const c = LIFE_STATUS_CFG[status] || { label: status, color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-[#001840]">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Approve Modal (replaces Verify — registrar now verifies AND approves) ──────
function ApproveModal({ enrollment, onClose, onSuccess }) {
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/registrar/enrollments/${enrollment.id}/approve`, {
        method: 'POST', headers: tok(), body: JSON.stringify({ remarks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed');
      toast.success('Enrollment verified and approved');
      onSuccess();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }
  return (
    <Modal title="Verify & Approve Enrollment" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-600">Documents reviewed and complete for <span className="font-medium text-[#001840]">{enrollment.firstName} {enrollment.familyName}</span>. This will approve the enrollment directly.</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3}
            maxLength={1000}
            placeholder="Add notes..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 resize-none" />
          <p className="text-xs text-gray-400 text-right mt-0.5">{remarks.length}/1000</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60">
            {loading ? 'Approving...' : 'Verify & Approve'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Return Modal ──────────────────────────────────────────────────────────────
function ReturnModal({ enrollment, onClose, onSuccess }) {
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (!remarks.trim()) { toast.error('Remarks are required'); return; }
    if (remarks.trim().length > 1000) { toast.error('Remarks must be 1000 characters or less'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/registrar/enrollments/${enrollment.id}/return`, {
        method: 'POST', headers: tok(), body: JSON.stringify({ remarks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed');
      toast.success('Enrollment returned to student');
      onSuccess();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }
  return (
    <Modal title="Return Enrollment" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-600">Return to <span className="font-medium text-[#001840]">{enrollment.firstName} {enrollment.familyName}</span> with correction notes.</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks <span className="text-red-500">*</span></label>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={4} required
            maxLength={1000}
            placeholder="Explain what needs to be corrected or resubmitted..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 resize-none" />
          <p className="text-xs text-gray-400 text-right mt-0.5">{remarks.length}/1000</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-60">
            {loading ? 'Returning...' : 'Return to Student'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── SSC Schedule Modal ────────────────────────────────────────────────────────
function SSCScheduleModal({ enrollment, onClose, onSuccess }) {
  const [examDate, setExamDate] = useState('');
  const [passingScore, setPassingScore] = useState('75');
  const [loading, setLoading] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/registrar/enrollments/${enrollment.id}/ssc-schedule`, {
        method: 'PUT', headers: tok(), body: JSON.stringify({ examDate, passingScore: Number(passingScore) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed');
      toast.success('SSC exam scheduled');
      onSuccess();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }
  return (
    <Modal title="Schedule SSC Entrance Exam" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-600">Schedule entrance exam for <span className="font-medium text-[#001840]">{enrollment.firstName || enrollment.user_name || 'this student'} {enrollment.familyName || ''}</span>.</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Exam Date <span className="text-red-500">*</span></label>
          <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} required
            min={new Date().toISOString().split('T')[0]}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Passing Score</label>
          <input type="number" value={passingScore} onChange={e => setPassingScore(e.target.value)} min="0" max="100"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]" />
          <p className="text-xs text-gray-400 mt-1">Students scoring at or above this pass into SSC class</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors disabled:opacity-60">
            {loading ? 'Scheduling...' : 'Schedule Exam'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── SSC Result Modal ──────────────────────────────────────────────────────────
function SSCResultModal({ enrollment, onClose, onSuccess }) {
  const [examScore, setExamScore] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/registrar/enrollments/${enrollment.id}/ssc-result`, {
        method: 'PUT', headers: tok(), body: JSON.stringify({ examScore: Number(examScore) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed');
      toast.success(data.message || 'SSC result recorded');
      onSuccess();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }
  return (
    <Modal title="Record SSC Exam Result" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-600">Record exam score for <span className="font-medium text-[#001840]">{enrollment.firstName || enrollment.user_name || 'this student'} {enrollment.familyName || ''}</span>.</p>
        {enrollment.sscPassingScore && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-800">
            Passing score: <span className="font-semibold">{enrollment.sscPassingScore}</span>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Exam Score (0–100) <span className="text-red-500">*</span></label>
          <input type="number" value={examScore} onChange={e => setExamScore(e.target.value)} min="0" max="100" required
            placeholder="e.g. 82"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]" />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-[#F5C400] text-[#001840] rounded-lg text-sm font-semibold hover:bg-yellow-400 transition-colors disabled:opacity-60">
            {loading ? 'Saving...' : 'Record Result'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Life Status Modal ─────────────────────────────────────────────────────────
export function LifeStatusModal({ enrollment, onClose, onSuccess }) {
  const [lifeStatus, setLifeStatus] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [destinationSchool, setDestinationSchool] = useState('');
  const [loading, setLoading] = useState(false);

  const displayName = (enrollment.firstName || enrollment.familyName)
    ? `${enrollment.firstName || ''} ${enrollment.familyName || ''}`.trim()
    : (enrollment.user_name || `Student #${enrollment.id}`);

  const options = [
    { value: 'dropped',         label: 'Dropped',          desc: 'Student stopped attending mid-year' },
    { value: 'transferred_out', label: 'Transferred Out',  desc: 'Student left for another school' },
    { value: 'retained',        label: 'Retained',         desc: 'Student did not advance to next grade' },
    { value: 'completed',       label: 'Completed',        desc: 'Student finished the school year' },
  ];

  async function submit(e) {
    e.preventDefault();
    if (!lifeStatus) { toast.error('Please select a status'); return; }
    if (!reason.trim()) { toast.error('Reason is required'); return; }
    if (lifeStatus === 'transferred_out' && !destinationSchool.trim()) {
      toast.error('Destination school is required for Transfer Out'); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/registrar/enrollments/${enrollment.id}/life-status`, {
        method: 'PUT', headers: tok(),
        body: JSON.stringify({ lifeStatus, reason, date, destinationSchool: destinationSchool || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed');
      toast.success(`Student marked as ${LIFE_STATUS_CFG[lifeStatus]?.label}`);
      onSuccess();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <Modal title="Update Student Status" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-600">
          Update life status for <span className="font-semibold text-[#001840]">{displayName}</span>.
          {enrollment.lifeStatus && (
            <span className="ml-1 text-gray-400">Current: <LifeStatusBadge status={enrollment.lifeStatus} /></span>
          )}
        </p>

        {/* Status selector */}
        <div className="grid grid-cols-2 gap-2">
          {options.map(opt => (
            <button key={opt.value} type="button"
              onClick={() => setLifeStatus(opt.value)}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                lifeStatus === opt.value
                  ? `border-current ${LIFE_STATUS_CFG[opt.value].color} font-semibold`
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}>
              <p className="text-xs font-semibold">{opt.label}</p>
              <p className="text-[10px] mt-0.5 opacity-70 leading-tight">{opt.desc}</p>
            </button>
          ))}
        </div>

        {/* Destination school — only for transferred out */}
        {lifeStatus === 'transferred_out' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination School <span className="text-red-500">*</span>
            </label>
            <input type="text" value={destinationSchool}
              onChange={e => setDestinationSchool(e.target.value)}
              placeholder="Name of school the student transferred to"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]" />
          </div>
        )}

        {/* Effective date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]" />
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason / Notes <span className="text-red-500">*</span>
          </label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} required
            maxLength={500}
            placeholder="Provide a reason for this status change..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840] resize-none" />
          <p className="text-xs text-gray-400 text-right mt-0.5">{reason.length}/500</p>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading || !lifeStatus}
            className="flex-1 px-4 py-2 bg-[#001840] text-white rounded-lg text-sm font-medium hover:bg-[#102A71] transition-colors disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Status'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Assign Section Modal ──────────────────────────────────────────────────────
export function AssignSectionModal({ enrollment, onClose, onSuccess }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSectionId, setSelectedSectionId] = useState(enrollment?.sectionId ? String(enrollment.sectionId) : '');
  const [submitting, setSubmitting] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');

  const displayName = (enrollment.firstName || enrollment.familyName)
    ? `${enrollment.firstName || ''} ${enrollment.familyName || ''}`.trim()
    : (enrollment.user_name || `Student #${enrollment.id}`);

  const studentGrade = parseInt((enrollment.gradeLevel || '').replace(/\D/g, '')) || null;
  const course = (enrollment.educationLevel || '').toUpperCase();
  const strand = enrollment.strand || null;
  const isSSC = enrollment.sscClass === 'SSC' || (Number(enrollment.sscApplied) === 1 && enrollment.sscQualified && enrollment.sscResult !== 'failed');
  const currentSectionId = enrollment.sectionId ? Number(enrollment.sectionId) : null;
  const currentSectionName = enrollment.sectionName || null;
  const previousSection = enrollment.previousSection || null;
  const previousDetails = enrollment.previousSectionDetails || null;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch(`${API}/admin/sections`, { headers: tok() })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load sections');
        return res.json();
      })
      .then(data => {
        if (isMounted) {
          setSections(Array.isArray(data) ? data : []);
        }
      })
      .catch(err => {
        console.error('Error fetching sections:', err);
        toast.error('Could not load sections: ' + err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  // Filter sections
  const filteredSections = sections.filter(sec => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchSearch = (sec.code && sec.code.toLowerCase().includes(q)) ||
        (sec.instructor && sec.instructor.toLowerCase().includes(q)) ||
        (sec.room && sec.room.toLowerCase().includes(q)) ||
        (sec.strand && sec.strand.toLowerCase().includes(q));
      if (!matchSearch) return false;
    }

    if (showAll) return true;

    // Course match (JHS / SHS)
    if (course && sec.course && sec.course.toUpperCase() !== course) return false;

    // Year level match
    if (studentGrade && Number(sec.yearLevel) !== studentGrade) return false;

    // Strand or SSC match
    if (course === 'SHS' && strand) {
      if (sec.strand && sec.strand !== strand && sec.strand !== 'Regular') return false;
    } else if (course === 'JHS') {
      if (isSSC && sec.strand !== 'SSC') return false;
      if (!isSSC && sec.strand === 'SSC') return false;
    }

    return true;
  });

  async function handleAssign(e) {
    e.preventDefault();
    if (!selectedSectionId) {
      toast.error('Please select a section');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/registrar/enrollments/${enrollment.id}/assign-section`, {
        method: 'POST',
        headers: tok(),
        body: JSON.stringify({ sectionId: Number(selectedSectionId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to assign section');

      toast.success(data.message || `Assigned to section successfully`);
      onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnassign() {
    if (!window.confirm(`Are you sure you want to remove ${displayName} from section ${currentSectionName}?`)) {
      return;
    }

    setUnassigning(true);
    try {
      const res = await fetch(`${API}/registrar/enrollments/${enrollment.id}/assign-section`, {
        method: 'DELETE',
        headers: tok(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to remove section');

      toast.success(data.message || 'Student removed from section');
      onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUnassigning(false);
    }
  }

  return (
    <Modal title={currentSectionId ? "Change Section" : "Assign Section"} onClose={onClose}>
      <form onSubmit={handleAssign} className="space-y-4">
        {/* Student & Academic Context Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-[#001840]">{displayName}</p>
              <p className="text-xs text-gray-500">
                {course} {enrollment.gradeLevel || (studentGrade ? `Grade ${studentGrade}` : '')}
                {strand ? ` • ${strand}` : isSSC ? ' • SSC Class' : ' • Regular'}
                {enrollment.academicYear ? ` • S.Y. ${enrollment.academicYear}` : ''}
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {enrollment.status}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-3 text-xs">
            {/* Current Section */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Current Section:</span>
              {currentSectionName ? (
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {currentSectionName}
                </span>
              ) : (
                <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Unassigned
                </span>
              )}
            </div>

            {/* Previous Section */}
            {previousSection && (
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Previous Section:</span>
                <span className="font-medium text-amber-900 bg-[#FFFDF0] px-2 py-0.5 rounded border border-[#F5C400]/40">
                  {previousSection} {previousDetails?.gradeLevel ? `(${previousDetails.gradeLevel})` : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search section name, adviser, room..."
              className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]"
            />
          </div>
          <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer shrink-0 select-none">
            <input
              type="checkbox"
              checked={showAll}
              onChange={e => setShowAll(e.target.checked)}
              className="rounded border-gray-300 text-[#001840] focus:ring-[#001840]"
            />
            <span>Show all</span>
          </label>
        </div>

        {/* Section List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-400 text-xs">
              <RefreshCw size={14} className="animate-spin text-[#001840]" /> Loading sections...
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="p-6 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
              <p className="text-xs font-medium text-gray-600">No matching sections found</p>
              <p className="text-[11px] mt-1 text-gray-400">
                {showAll ? 'No sections created in the system.' : 'Try enabling "Show all" or check if sections are created for this grade.'}
              </p>
            </div>
          ) : (
            filteredSections.map(sec => {
              const isSelected = String(selectedSectionId) === String(sec.id);
              const isCurrent = currentSectionId === Number(sec.id);
              const cap = Number(sec.capacity) || 40;
              const cur = Number(sec.currentEnrollment) || 0;
              const isFull = cur >= cap && !isCurrent;
              const pct = Math.min(100, Math.round((cur / cap) * 100));

              return (
                <div
                  key={sec.id}
                  onClick={() => { if (!isFull) setSelectedSectionId(String(sec.id)); }}
                  className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#102A71] bg-[#102A71]/5 shadow-xs'
                      : isCurrent
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : isFull
                      ? 'border-gray-200 bg-gray-50/70 opacity-60 cursor-not-allowed'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="sectionSelection"
                        checked={isSelected}
                        disabled={isFull}
                        onChange={() => setSelectedSectionId(String(sec.id))}
                        className="text-[#102A71] focus:ring-[#102A71]"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm text-[#001840]">{sec.code}</span>
                          {sec.strand && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {sec.strand}
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              Current
                            </span>
                          )}
                          {isFull && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                              Full
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {sec.course} Grade {sec.yearLevel} &bull; Room: {sec.room || 'TBA'} &bull; Adviser: {sec.instructor || 'Unassigned'}
                        </p>
                      </div>
                    </div>

                    {/* Capacity Indicator */}
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-gray-700">
                        {cur} / {cap}
                      </p>
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
          {currentSectionId ? (
            <button
              type="button"
              onClick={handleUnassign}
              disabled={unassigning || submitting}
              className="px-3 py-2 border border-red-200 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {unassigning ? 'Removing...' : 'Unassign Section'}
            </button>
          ) : <div />}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || unassigning}
              className="px-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || unassigning || !selectedSectionId}
              className="px-4 py-2 bg-[#102A71] text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-[#001840] transition-colors disabled:opacity-50 shadow-xs flex items-center gap-1.5"
            >
              {submitting ? 'Assigning...' : 'Assign Section'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Enrollment Detail Panel ───────────────────────────────────────────────────
const BACKEND = API.replace('/api', '');

export function EnrollmentDetail({ enrollmentId, enrollment: rowData, onClose, onActionSuccess }) {
  const [detail, setDetail] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const [detailRes, subjectsRes, docsRes] = await Promise.all([
        fetch(`${API}/enrollments/${enrollmentId}`, { headers: tok() }),
        fetch(`${API}/enrollments/${enrollmentId}/subjects`, { headers: tok() }).catch(() => null),
        fetch(`${API}/enrollments/${enrollmentId}/documents`, { headers: tok() }).catch(() => null),
      ]);
      if (detailRes.ok) {
        const d = await detailRes.json();
        setDetail(d.enrollment || d);
      }
      if (subjectsRes && subjectsRes.ok) {
        const s = await subjectsRes.json();
        setSubjects(Array.isArray(s) ? s : s.subjects || []);
      }
      if (docsRes && docsRes.ok) {
        const docs = await docsRes.json();
        setUploadedDocs(Array.isArray(docs) ? docs : []);
      }
    } catch (err) {
      toast.error('Failed to load details');
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  function handleModalSuccess() {
    setActiveModal(null);
    fetchDetail();
    onActionSuccess();
  }

  async function handleDownloadPDF() {
    try {
      const res = await fetch(`${API}/enrollments/${enrollmentId}/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enrollment-${enrollmentId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(err.message); }
  }

  const e = detail || rowData;
  if (loading && !e) {
    return (
      <div className="border-t border-gray-100 bg-gray-50 px-6 py-8 flex items-center justify-center gap-2 text-gray-400 text-sm">
        <RefreshCw size={15} className="animate-spin" /> Loading details...
      </div>
    );
  }
  if (!e) return null;

  const status = e.status;
  const level = (e.educationLevel || '').toUpperCase();
  const isJHS = level === 'JHS';
  const isTransferee = e.enrollmentType === 'transferee';

  const canApprove = ['submitted', 'returned', 'verified'].includes(status);
  const canReturn = ['submitted', 'verified'].includes(status);
  const canScheduleSSC = isJHS && e.sscApplied && status === 'pending_exam' && !e.sscExamDate;
  const canRecordSSC = isJHS && status === 'pending_exam' && !!e.sscExamDate && !e.sscExamScore;

  // Display name: use enrollment name fields if filled, otherwise fall back to user account name
  const displayName = (e.firstName || e.familyName)
    ? `${e.firstName || ''} ${e.familyName || ''}`.trim()
    : (e.user_name || e.userEmail || `Student #${e.userId || e.id}`);

  return (
    <div className="border-t border-gray-100 bg-slate-50/70">
      <div className="px-6 py-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-[#001840]">{displayName}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {e.educationLevel} &bull; {e.course || e.gradeLevel || '—'} &bull; {e.academicYear || e.semester || '—'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
            <X size={15} className="text-gray-400" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Student Info */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Student Info</p>
            <dl className="space-y-2 text-sm">
              {[
                ['Name', displayName !== `Student #${e.userId || e.id}` ? displayName : null],
                ['Email', e.email || e.user_email || e.userEmail],
                ['Mobile', e.mobileNumber],
                ['Enrollment Type', e.enrollmentType],
                ['Student Status', e.studentStatus],
                ['Date of Birth', e.dateOfBirth],
                ['Current Section', e.sectionName || 'Unassigned (Pending)'],
                ['Previous Section', e.previousSection ? `${e.previousSection}${e.previousSectionDetails?.gradeLevel ? ` (${e.previousSectionDetails.gradeLevel})` : ''}` : null],
                ['SSC Applied', e.sscApplied ? 'Yes' : null],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt className="text-gray-400 shrink-0">{label}</dt>
                  <dd className={`font-medium text-right truncate ${label === 'Current Section' ? (e.sectionName ? 'text-emerald-700 font-semibold' : 'text-amber-600') : label === 'Previous Section' ? 'text-amber-900 font-semibold' : 'text-gray-700'}`}>{value}</dd>
                </div>
              ))}
              {/* Life status row — shown separately so we can use the badge */}
              {e.lifeStatus && (
                <div className="flex justify-between gap-2 pt-1 border-t border-gray-50">
                  <dt className="text-gray-400 shrink-0">Life Status</dt>
                  <dd><LifeStatusBadge status={e.lifeStatus} /></dd>
                </div>
              )}
              {e.lifeStatusReason && (
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-400 shrink-0">Reason</dt>
                  <dd className="text-gray-600 text-right text-xs max-w-45">{e.lifeStatusReason}</dd>
                </div>
              )}
              {e.destinationSchool && (
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-400 shrink-0">Transferred To</dt>
                  <dd className="font-medium text-gray-700 text-right truncate">{e.destinationSchool}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Submitted Documents</p>

            {/* Checked credential list */}
            {Array.isArray(e.admissionCredentials) && e.admissionCredentials.length > 0 ? (
              <ul className="space-y-2">
                {e.admissionCredentials.map((doc, i) => {
                  const docKey = typeof doc === 'string' ? doc : (doc.key || doc.type || '');
                  const docLabel = typeof doc === 'string' ? doc : (doc.name || doc.label || doc.type || doc);
                  const uploaded = uploadedDocs.find(d => d.documentType === docKey);
                  return (
                    <li key={i} className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={13} className={uploaded ? 'text-green-500' : 'text-gray-300'} />
                        <span className="text-gray-700">{docLabel}</span>
                      </div>
                      {uploaded ? (
                        <a href={`${BACKEND}${uploaded.filePath}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors">
                          <FileText size={11} /> View
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No file</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : uploadedDocs.length > 0 ? (
              // SSC applications: no admissionCredentials but have uploaded docs
              <ul className="space-y-2">
                {uploadedDocs.map(doc => (
                  <li key={doc.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={13} className="text-green-500" />
                      <span className="text-gray-700">{doc.documentLabel || doc.documentType}</span>
                    </div>
                    <a href={`${BACKEND}${doc.filePath}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors">
                      <FileText size={11} /> View
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 italic">No documents on record</p>
            )}

            {/* Standalone uploaded docs not tied to a credential checkbox — only show when admissionCredentials has items */}
            {Array.isArray(e.admissionCredentials) && e.admissionCredentials.length > 0 && uploadedDocs.filter(d => {
              const creds = Array.isArray(e.admissionCredentials) ? e.admissionCredentials : [];
              return !creds.some(c => (typeof c === 'string' ? c : c.key || c.type) === d.documentType);
            }).map(doc => (
              <div key={doc.id} className="flex items-center justify-between gap-2 text-sm mt-2">
                <div className="flex items-center gap-2">
                  <FileText size={13} className="text-blue-500" />
                  <span className="text-gray-700">{doc.documentLabel || doc.documentType}</span>
                </div>
                <a
                  href={`${BACKEND}${doc.filePath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors"
                >
                  <FileText size={11} /> View
                </a>
              </div>
            ))}

          </div>
        </div>

        {e.registrar_remarks && (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">Registrar Remarks</p>
            <p className="text-sm text-orange-800">{e.registrar_remarks}</p>
          </div>
        )}

        {/* SSC Not Qualified Notice */}
        {e.sscApplied == 1 && e.sscQualified == 0 && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">SSC — Not Qualified</p>
            <p className="text-sm text-red-700">
              Student applied for Special Science Class but does not meet the requirement.
              Grade 6 average is <span className="font-semibold">{e.grade6Average}</span> (minimum 85 required).
              Student will be enrolled in the <span className="font-semibold">Regular class</span>.
            </p>
          </div>
        )}

        {/* SSC Info */}
        {e.sscExamDate && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wider mb-2">SSC Exam</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-400">Date: </span><span className="font-medium">{new Date(e.sscExamDate).toLocaleDateString()}</span></div>
              <div><span className="text-gray-400">Passing: </span><span className="font-medium">{e.sscPassingScore || 75}</span></div>
              {e.sscExamScore && <div><span className="text-gray-400">Score: </span><span className="font-semibold text-[#001840]">{e.sscExamScore}</span></div>}
              {e.sscResult && <div><span className="text-gray-400">Result: </span><span className={`font-semibold ${e.sscResult === 'passed' ? 'text-green-600' : 'text-red-500'}`}>{e.sscResult}</span></div>}
              {e.sscClass && <div><span className="text-gray-400">Class: </span><span className="font-medium">{e.sscClass}</span></div>}
            </div>
          </div>
        )}

        {/* Enrolled Subjects */}
        {subjects.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Enrolled Subjects ({subjects.length})</p>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {subjects.map((s, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-700">{s.subjectName || s.name || s.code}</span>
                  <span className="text-gray-400 text-xs">{s.units} units</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {canApprove && (
            <button onClick={() => setActiveModal('approve')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors">
              <CheckCircle2 size={13} /> Verify & Approve
            </button>
          )}
          {canReturn && (
            <button onClick={() => setActiveModal('return')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600 transition-colors">
              <RotateCcw size={13} /> Return
            </button>
          )}
          {canScheduleSSC && (
            <button onClick={() => setActiveModal('ssc-schedule')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-medium hover:bg-yellow-600 transition-colors">
              <Calendar size={13} /> Schedule SSC Exam
            </button>
          )}
          {canRecordSSC && (
            <button onClick={() => setActiveModal('ssc-result')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F5C400] text-[#001840] rounded-lg text-xs font-semibold hover:bg-yellow-400 transition-colors">
              <ClipboardCheck size={13} /> Record SSC Result
            </button>
          )}
          {/* Section Assignment - available for pending/submitted/verified/approved/enrolled students */}
          {['submitted', 'pending_exam', 'verified', 'returned', 'approved', 'subjects_enrolled', 'enrolled', 'active'].includes(status) && (
            <button
              onClick={() => setActiveModal('assign-section')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#102A71] text-white rounded-lg text-xs font-semibold hover:bg-[#001840] transition-colors shadow-xs"
            >
              <BookOpen size={13} /> {e.sectionName ? 'Change Section' : 'Assign Section'}
            </button>
          )}
          {/* Life status — only for enrolled students not already dropped/transferred */}
          {['enrolled', 'active', 'approved', 'subjects_enrolled'].includes(status) &&
           !['dropped', 'transferred_out'].includes(e.lifeStatus) && (
            <button onClick={() => setActiveModal('life-status')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#001840] text-white rounded-lg text-xs font-medium hover:bg-[#102A71] transition-colors">
              <UserX size={13} /> Update Student Status
            </button>
          )}
          <button onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors ml-auto">
            <Download size={13} /> PDF
          </button>
        </div>
      </div>

      {activeModal === 'approve' && <ApproveModal enrollment={e} onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} />}
      {activeModal === 'return' && <ReturnModal enrollment={e} onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} />}
      {activeModal === 'assign-section' && <AssignSectionModal enrollment={e} onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} />}
      {activeModal === 'ssc-schedule' && <SSCScheduleModal enrollment={e} onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} />}
      {activeModal === 'ssc-result' && <SSCResultModal enrollment={e} onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} />}
      {activeModal === 'life-status' && <LifeStatusModal enrollment={e} onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} />}
    </div>
  );
}

// ── Reusable Registrar Pagination ───────────────────────────────────────────
export function RegistrarPagination({
  page,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  itemName = 'items',
}) {
  if (totalItems === 0) return null;

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

  const pages = getPageNumbers();
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-white">
      {/* Left: Showing X to Y of Z items */}
      <p className="text-sm text-gray-500">
        Showing {startItem} to {endItem} of {totalItems} {itemName}
      </p>

      {/* Right: < Previous  1  2  3  4  5  Next > */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-end">
          {/* Previous button */}
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-normal rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={15} className="text-gray-400" />
            <span>Previous</span>
          </button>

          {/* Page numbers */}
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-8 h-8 flex items-center justify-center text-sm text-gray-400 select-none"
                >
                  ...
                </span>
              );
            }
            const isCurrent = p === page;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
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

          {/* Next button */}
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-normal rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span>Next</span>
            <ChevronRight size={15} className="text-gray-400" />
          </button>
        </div>
      )}
    </div>
  );
}


