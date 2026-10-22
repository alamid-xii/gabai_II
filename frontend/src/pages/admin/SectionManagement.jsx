import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
  Plus, Edit2, Trash2, Users, Search, X, RefreshCw,
  BookOpen, School, ChevronLeft, ChevronRight,
  Filter, Save, AlertCircle, UserMinus, ArrowRightLeft, UserPlus,
  Zap, ChevronDown, ChevronUp, Download
} from 'lucide-react';

import { API } from '../../config/api';

const tok = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });

const COURSES = ['JHS', 'SHS'];
const SEMESTERS = ['1st Semester', '2nd Semester', 'Summer'];
const SCHOOL_YEARS = ['2026-2027', '2025-2026', '2024-2025'];
const PAGE_SIZE = 10;

// ── Section Students Panel ────────────────────────────────────────────────────
function SectionStudentsPanel({ section, allSections, onClose, onChanged }) {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [movingId, setMovingId] = useState(null);
  const [moveTarget, setMoveTarget] = useState('');

  // Subject teachers tab state
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [savingSubject, setSavingSubject] = useState(null);
  const [localInstructors, setLocalInstructors] = useState({});

  const loadStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const res = await fetch(`${API}/admin/sections/${section.id}/students`, { headers: tok() });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setStudents(data.students || []);
    } catch (err) {
      toast.error('Failed to load section students');
    } finally {
      setLoadingStudents(false);
    }
  }, [section.id]);

  const loadSubjectTeachers = useCallback(async () => {
    setLoadingSubjects(true);
    try {
      const [subjRes, teacherRes] = await Promise.all([
        fetch(`${API}/admin/sections/${section.id}/subject-teachers`, { headers: tok() }),
        fetch(`${API}/admin/teachers`, { headers: tok() }),
      ]);
      const subjData = subjRes.ok ? await subjRes.json() : [];
      const teacherData = teacherRes.ok ? await teacherRes.json() : [];
      setSubjects(Array.isArray(subjData) ? subjData : []);
      setTeachers(Array.isArray(teacherData) ? teacherData : []);
      // Initialize local instructor state
      const init = {};
      subjData.forEach(s => { init[s.subjectCode] = s.instructor || ''; });
      setLocalInstructors(init);
    } catch (err) {
      toast.error('Failed to load subject teachers');
    } finally {
      setLoadingSubjects(false);
    }
  }, [section.id]);

  useEffect(() => { loadStudents(); }, [loadStudents]);
  useEffect(() => {
    if (activeTab === 'subjects') loadSubjectTeachers();
  }, [activeTab, loadSubjectTeachers]);

  async function handleSaveInstructor(subjectCode) {
    setSavingSubject(subjectCode);
    try {
      const res = await fetch(`${API}/admin/sections/${section.id}/subject-teachers`, {
        method: 'PUT', headers: tok(),
        body: JSON.stringify({ subjectCode, instructor: localInstructors[subjectCode] || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(`Teacher assigned to ${subjectCode}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingSubject(null);
    }
  }

  async function handleRemove(enrollmentId, name) {
    if (!confirm(`Remove ${name} from section ${section.code}?`)) return;
    try {
      const res = await fetch(`${API}/admin/sections/students/${enrollmentId}/section`, {
        method: 'DELETE', headers: tok(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(`${name} removed from section`);
      loadStudents();
      onChanged();
    } catch (err) { toast.error(err.message); }
  }

  async function handleMove(enrollmentId, name) {
    if (!moveTarget) { toast.error('Select a target section first'); return; }
    try {
      const res = await fetch(`${API}/admin/sections/students/${enrollmentId}/section`, {
        method: 'PUT', headers: tok(),
        body: JSON.stringify({ sectionId: parseInt(moveTarget) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(`${name} moved to ${data.section?.code}`);
      setMovingId(null);
      setMoveTarget('');
      loadStudents();
      onChanged();
    } catch (err) { toast.error(err.message); }
  }

  const otherSections = allSections.filter(s => s.id !== section.id && s.course === section.course);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl z-10 max-h-[85vh] flex flex-col">
        {/* Header */}


        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 shrink-0">
          {[
            { id: 'students', label: 'Students' },
            { id: 'subjects', label: 'Subject Teachers' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                ? 'border-[#001840] text-[#001840]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">

          {/* ── Students Tab ── */}
          {activeTab === 'students' && (
            loadingStudents ? (
              <div className="flex items-center justify-center py-12 gap-2 text-gray-400 text-sm">
                <RefreshCw size={15} className="animate-spin" /> Loading students...
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Users size={36} className="mb-3 opacity-40" />
                <p className="text-sm font-medium">No students assigned yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {students.map(s => (
                  <div key={s.id} className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#001840] text-sm truncate">
                          {s.familyName}, {s.firstName}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {s.studentNumber || '—'} · {s.course || s.gradeLevel || s.educationLevel}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {movingId === s.id ? (
                          <>
                            <select value={moveTarget} onChange={e => setMoveTarget(e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#001840]/20">
                              <option value="">Select section...</option>
                              {otherSections.map(sec => (
                                <option key={sec.id} value={sec.id}>{sec.code} ({sec.currentEnrollment}/{sec.capacity})</option>
                              ))}
                            </select>
                            <button onClick={() => handleMove(s.id, `${s.firstName} ${s.familyName}`)}
                              className="text-xs px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Move</button>
                            <button onClick={() => { setMovingId(null); setMoveTarget(''); }}
                              className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
                          </>
                        ) : (
                          <>
                            {otherSections.length > 0 && (
                              <button onClick={() => { setMovingId(s.id); setMoveTarget(''); }}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors">
                                <ArrowRightLeft size={12} /> Move
                              </button>
                            )}
                            <button onClick={() => handleRemove(s.id, `${s.firstName} ${s.familyName}`)}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors">
                              <UserMinus size={12} /> Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Subject Teachers Tab ── */}
          {activeTab === 'subjects' && (
            loadingSubjects ? (
              <div className="flex items-center justify-center py-12 gap-2 text-gray-400 text-sm">
                <RefreshCw size={15} className="animate-spin" /> Loading subjects...
              </div>
            ) : subjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <BookOpen size={36} className="mb-3 opacity-40" />
                <p className="text-sm font-medium">No subjects enrolled yet</p>
                <p className="text-xs mt-1">Students must be enrolled first for subjects to appear</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-400">
                  Assign a teacher to each subject. Changes are saved per subject.
                </p>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Units</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-52">Teacher</th>
                        <th className="px-4 py-2.5 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {subjects.map(subj => (
                        <tr key={subj.subjectCode} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-[#001840] text-xs font-mono">{subj.subjectCode}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{subj.subjectDescription}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{subj.units}</td>
                          <td className="px-4 py-3">
                            <select
                              value={localInstructors[subj.subjectCode] || ''}
                              onChange={e => setLocalInstructors(prev => ({
                                ...prev, [subj.subjectCode]: e.target.value
                              }))}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840] bg-white">
                              <option value="">— Not assigned —</option>
                              {teachers.map(t => (
                                <option key={t.id} value={t.name}>{t.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleSaveInstructor(subj.subjectCode)}
                              disabled={savingSubject === subj.subjectCode}
                              className="px-3 py-1.5 bg-[#001840] text-white text-xs rounded-lg hover:bg-[#102A71] transition-colors disabled:opacity-50 font-medium">
                              {savingSubject === subj.subjectCode ? '...' : 'Save'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ── Unassigned Students Panel ─────────────────────────────────────────────────
function UnassignedPanel({ allSections, onChanged }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [assignTarget, setAssignTarget] = useState('');
  const [autoRunning, setAutoRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/sections/students/unassigned`, { headers: tok() });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Load unassigned error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAutoAssign() {
    setAutoRunning(true);
    try {
      const res = await fetch(`${API}/admin/sections/students/auto-assign`, {
        method: 'POST', headers: tok(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(data.message);
      load();
      onChanged();
    } catch (err) { toast.error(err.message); }
    finally { setAutoRunning(false); }
  }

  async function handleManualAssign(enrollmentId, name) {
    if (!assignTarget) { toast.error('Select a section first'); return; }
    try {
      const res = await fetch(`${API}/admin/sections/students/${enrollmentId}/assign`, {
        method: 'POST', headers: tok(),
        body: JSON.stringify({ sectionId: parseInt(assignTarget) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(`${name} assigned to ${data.section?.code}`);
      setAssigningId(null);
      setAssignTarget('');
      load();
      onChanged();
    } catch (err) { toast.error(err.message); }
  }

  if (loading) return null;
  if (students.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-amber-100/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
            <AlertCircle size={16} className="text-white" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-amber-900 text-sm">
              {students.length} student{students.length !== 1 ? 's' : ''} need section assignment
            </p>
            <p className="text-xs text-amber-700">Approved but not yet assigned to a section</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); handleAutoAssign(); }}
            disabled={autoRunning}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-60"
          >
            <Zap size={12} />
            {autoRunning ? 'Assigning...' : 'Auto-Assign All'}
          </button>
          {expanded ? <ChevronUp size={16} className="text-amber-700" /> : <ChevronDown size={16} className="text-amber-700" />}
        </div>
      </button>

      {/* Student list */}
      {expanded && (
        <div className="border-t border-amber-200 px-5 py-4 space-y-2 max-h-72 overflow-y-auto">
          {students.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-amber-100 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-[#001840] text-sm truncate">
                  {s.familyName}, {s.firstName}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {s.studentNumber || '—'} · {s.course || s.gradeLevel || s.educationLevel}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {assigningId === s.id ? (
                  <>
                    <select
                      value={assignTarget}
                      onChange={e => setAssignTarget(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#001840]/20"
                    >
                      <option value="">Select section...</option>
                      {allSections
                        .filter(sec => {
                          return sec.course === s.educationLevel && sec.currentEnrollment < sec.capacity;
                        })
                        .map(sec => (
                          <option key={sec.id} value={sec.id}>
                            {sec.code} ({sec.currentEnrollment}/{sec.capacity})
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={() => handleManualAssign(s.id, `${s.firstName} ${s.familyName}`)}
                      className="text-xs px-2.5 py-1.5 bg-[#001840] text-white rounded-lg hover:bg-[#002a6e] transition-colors"
                    >
                      Assign
                    </button>
                    <button
                      onClick={() => { setAssigningId(null); setAssignTarget(''); }}
                      className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setAssigningId(s.id); setAssignTarget(''); }}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 bg-[#001840] text-white rounded-lg hover:bg-[#002a6e] transition-colors"
                  >
                    <UserPlus size={12} /> Assign
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const LEVEL_BADGE = {
  JHS: { bg: 'bg-indigo-100 text-indigo-700', icon: School },
  SHS: { bg: 'bg-purple-100 text-purple-700', icon: BookOpen },
};

function CourseBadge({ course }) {
  const cfg = LEVEL_BADGE[course] || { bg: 'bg-gray-100 text-gray-600', icon: BookOpen };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg}`}>
      <Icon size={11} />{course}
    </span>
  );
}

const EMPTY_FORM = {
  code: '', course: 'JHS', yearLevel: '7', semester: '1st Semester',
  schoolYear: '2026-2027', instructor: '', schedule: '', room: '', capacity: '40',
  strand: '',
};

// ── Section Form Modal ────────────────────────────────────────────────────────
function SectionFormModal({ section, onClose, onSaved }) {
  const isEdit = !!section;
  const [form, setForm] = useState(isEdit ? {
    code: section.code || '',
    course: section.course || 'JHS',
    yearLevel: String(section.yearLevel || '7'),
    semester: section.semester || '1st Semester',
    schoolYear: section.schoolYear || '2026-2027',
    instructor: section.instructor || '',
    schedule: section.schedule || '',
    room: section.room || '',
    capacity: String(section.capacity || '40'),
    strand: section.strand || '',
    teacherId: section.teacherId || '',
  } : { ...EMPTY_FORM, teacherId: '' });
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState([]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Load teachers for dropdown
  useEffect(() => {
    fetch(`${API}/admin/teachers`, { headers: tok() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setTeachers(Array.isArray(data) ? data : []))
      .catch(() => { });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.code.trim()) { toast.error('Section code is required'); return; }
    setLoading(true);
    try {
      const url = isEdit ? `${API}/admin/sections/${section.id}` : `${API}/admin/sections`;
      const method = isEdit ? 'PUT' : 'POST';
      const payload = {
        ...form,
        yearLevel: Number(form.yearLevel),
        capacity: Number(form.capacity),
        teacherId: form.teacherId ? Number(form.teacherId) : null,
      };
      const res = await fetch(url, { method, headers: tok(), body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save');
      // If teacher assignment changed in edit mode, call the assign endpoint too
      if (isEdit && form.teacherId !== String(section.teacherId || '')) {
        await fetch(`${API}/admin/sections/${section.id}/assign-teacher`, {
          method: 'PUT', headers: tok(),
          body: JSON.stringify({ teacherId: form.teacherId ? Number(form.teacherId) : null }),
        });
      }
      toast.success(isEdit ? 'Section updated' : 'Section created');
      onSaved();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  const yearLevels = form.course === 'JHS' ? ['7', '8', '9', '10'] : ['11', '12'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-lg font-semibold text-[#001840]">
            {isEdit ? `Edit Section — ${section.code}` : 'Create New Section'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Row 1: Code + Course */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Section Code <span className="text-red-500">*</span>
              </label>
              <input value={form.code} onChange={e => set('code', e.target.value)} required
                placeholder="e.g. JHS-7A"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Course / Level</label>
              <select value={form.course} onChange={e => { set('course', e.target.value); set('yearLevel', '1'); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840] bg-white">
                {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: Year Level + Semester */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Grade Level
              </label>
              <select value={form.yearLevel} onChange={e => set('yearLevel', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840] bg-white">
                {yearLevels.map(y => (
                  <option key={y} value={y}>Grade {y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Semester</label>
              <select value={form.semester} onChange={e => set('semester', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840] bg-white">
                {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Strand — SHS shows strand selector, JHS shows SSC toggle */}
          {form.course === 'SHS' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Strand</label>
              <select value={form.strand} onChange={e => set('strand', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840] bg-white">
                <option value="">— Select Strand —</option>
                {['STEM', 'ABM', 'HUMSS', 'TVL', 'Sports', 'Arts and Design'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
          {form.course === 'JHS' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Section Type</label>
              <div className="flex gap-3">
                <button type="button"
                  onClick={() => set('strand', '')}
                  className={`px-5 py-2 rounded-xl border-2 text-sm font-medium transition-all ${!form.strand ? 'border-[#001840] bg-[#EEF2FF] text-[#001840]' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                  Regular
                </button>
                <button type="button"
                  onClick={() => set('strand', 'SSC')}
                  className={`px-5 py-2 rounded-xl border-2 text-sm font-medium transition-all ${form.strand === 'SSC' ? 'border-yellow-500 bg-yellow-50 text-yellow-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                  SSC (Special Science Class)
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                SSC sections are for Grade 7 students who passed the entrance exam.
              </p>
            </div>
          )}

          {/* Row 3: School Year + Capacity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">School Year</label>
              <select value={form.schoolYear} onChange={e => set('schoolYear', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840] bg-white">
                {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Capacity</label>
              <input type="number" value={form.capacity} onChange={e => set('capacity', e.target.value)}
                min="1" max="100"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]" />
            </div>
          </div>

          {/* Class Adviser — single dropdown replaces separate instructor + teacher fields */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Class Adviser
            </label>
            <select
              value={form.teacherId}
              onChange={e => {
                const val = e.target.value;
                set('teacherId', val);
                // Auto-fill instructor name from selected teacher
                if (val) {
                  const t = teachers.find(t => String(t.id) === String(val));
                  if (t) set('instructor', t.name);
                } else {
                  set('instructor', '');
                }
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840] bg-white">
              <option value="">— Not yet assigned —</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Class adviser can log in to the Teacher Portal and view this section's students.
            </p>
          </div>

          {/* Room */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Room</label>
            <input value={form.room} onChange={e => set('room', e.target.value)}
              placeholder="e.g. Room 101"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 bg-[#001840] text-white rounded-lg text-sm font-semibold hover:bg-[#002a6e] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              <Save size={14} />
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Section'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function SectionManagement() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [capacityFilter, setCapacityFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [formModal, setFormModal] = useState(null); // null | 'create' | section object
  const [studentsPanel, setStudentsPanel] = useState(null); // section object
  const [headerContainer, setHeaderContainer] = useState(null);

  useEffect(() => {
    const titleEl = document.querySelector("header h1");
    const header = titleEl ? titleEl.closest("header") : document.querySelector("header");
    if (!header) return;

    let slot = header.querySelector("#admin-header-slot");
    let created = false;
    if (!slot) {
      slot = document.createElement("div");
      slot.id = "admin-header-slot";
      slot.className = "flex items-center justify-end gap-2 ml-auto";
      header.appendChild(slot);
      created = true;
    }
    setHeaderContainer(slot);

    return () => {
      if (created && slot && slot.parentNode) {
        slot.parentNode.removeChild(slot);
      }
    };
  }, []);

  const loadSections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/sections`, { headers: tok() });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setSections(Array.isArray(data) ? data : (data.sections || []));
    } catch (err) {
      toast.error('Failed to load sections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSections(); }, [loadSections]);

  async function handleDelete(section) {
    if (!confirm(`Delete section "${section.code}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/admin/sections/${section.id}`, {
        method: 'DELETE', headers: tok(),
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success(`Section "${section.code}" deleted`);
      loadSections();
    } catch (err) { toast.error(err.message); }
  }

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
      { value: 'SSC', label: 'SSC (Special Science Class)' },
    ]
    : levelFilter === 'SHS'
      ? [
        { value: 'STEM', label: 'STEM' },
        { value: 'ABM', label: 'ABM' },
        { value: 'HUMSS', label: 'HUMSS' },
        { value: 'TVL', label: 'TVL' },
        { value: 'Sports', label: 'Sports' },
        { value: 'Arts and Design', label: 'Arts and Design' },
      ]
      : [
        { value: 'Regular', label: 'Regular (JHS)' },
        { value: 'SSC', label: 'SSC (JHS)' },
        { value: 'STEM', label: 'STEM (SHS)' },
        { value: 'ABM', label: 'ABM (SHS)' },
        { value: 'HUMSS', label: 'HUMSS (SHS)' },
        { value: 'TVL', label: 'TVL (SHS)' },
        { value: 'Sports', label: 'Sports (SHS)' },
        { value: 'Arts and Design', label: 'Arts and Design (SHS)' },
      ];

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
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search || levelFilter || gradeFilter || programFilter || capacityFilter !== 'all'
  );

  // Filter logic
  const filtered = useMemo(() => {
    return sections.filter(s => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        const codeMatch = (s.code || '').toLowerCase().includes(q);
        const instructorMatch = (s.instructor || '').toLowerCase().includes(q);
        const roomMatch = (s.room || '').toLowerCase().includes(q);
        const schedMatch = (s.schedule || '').toLowerCase().includes(q);
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
      // Capacity
      if (capacityFilter === 'full') {
        if ((s.currentEnrollment || 0) < (s.capacity || 0)) return false;
      } else if (capacityFilter === 'available') {
        if ((s.currentEnrollment || 0) >= (s.capacity || 0)) return false;
      }
      return true;
    });
  }, [sections, search, levelFilter, gradeFilter, programFilter, capacityFilter]);

  async function exportToExcel() {
    if (filtered.length === 0) {
      toast.error('No sections to export');
      return;
    }
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const rows = filtered.map((s, i) => ({
        '#': i + 1,
        'Section Code': s.code || '',
        'Education Level': s.course || '',
        'Grade Level': `Grade ${s.yearLevel || ''}`,
        'Program / Strand': s.strand || (s.course === 'JHS' ? 'Regular' : ''),
        'Adviser': s.instructor || '',
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
        { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
        { wch: 12 }, { wch: 14 }, { wch: 12 }
      ];

      const wb = XLSX.utils.book_new();
      const parts = ['Sections_Report'];
      if (levelFilter) parts.push(levelFilter);
      if (gradeFilter) parts.push(gradeFilter.replace(/\s+/g, ''));
      if (programFilter) parts.push(programFilter.replace(/\s+/g, ''));
      if (capacityFilter && capacityFilter !== 'all') {
        parts.push(capacityFilter === 'full' ? 'Full' : 'Available');
      }

      parts.push(new Date().toISOString().slice(0, 10));
      const filename = `${parts.join('_')}.xlsx`;

      XLSX.utils.book_append_sheet(wb, ws, 'Sections');
      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${rows.length} sections to ${filename}`);
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export to Excel');
    } finally {
      setExporting(false);
    }
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Summary stats
  const totalCapacity = sections.reduce((sum, s) => sum + (s.capacity || 0), 0);
  const totalEnrolled = sections.reduce((sum, s) => sum + (s.currentEnrollment || 0), 0);
  const fullSections = sections.filter(s => (s.currentEnrollment || 0) >= (s.capacity || 0)).length;

  const newSectionBtn = (
    <button
      type="button"
      onClick={() => setFormModal('create')}
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#001840] text-white rounded-xl text-sm font-semibold hover:bg-[#002a6e] transition-colors shadow-sm cursor-pointer"
    >
      <Plus size={16} /> New Section
    </button>
  );

  return (
    <div className="space-y-5">
      {/* Header Slot Action or Fallback */}
      {headerContainer ? createPortal(newSectionBtn, headerContainer) : (
        <div className="flex justify-end">
          {newSectionBtn}
        </div>
      )}

      {/* Unassigned students alert */}
      <UnassignedPanel allSections={sections} onChanged={loadSections} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Sections', value: sections.length, border: 'border-slate-200', text: 'text-[#001840]' },
          { label: 'Total Capacity', value: totalCapacity, border: 'border-blue-200', text: 'text-blue-700' },
          { label: 'Total Enrolled', value: totalEnrolled, border: 'border-emerald-200', text: 'text-emerald-700' },
          { label: 'Full Sections', value: fullSections, border: fullSections > 0 ? 'border-red-200' : 'border-gray-200', text: fullSections > 0 ? 'text-red-600' : 'text-gray-700' },
        ].map(c => (
          <div key={c.label} className={`bg-white border-2 ${c.border} rounded-2xl p-4 shadow-2xs`}>
            <p className={`text-2xl font-black ${c.text}`}>{c.value}</p>
            <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wider">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-2xs">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2.5">
          {/* Search */}
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Capacity Filter */}
            <select
              value={capacityFilter}
              onChange={e => { setCapacityFilter(e.target.value); setPage(1); }}
              className={`px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors cursor-pointer ${capacityFilter !== 'all' ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
                }`}
            >
              <option value="all">All Capacities</option>
              <option value="available">Available (Open Seats)</option>
              <option value="full">Full (Capacity Reached)</option>
            </select>

            {/* Level Filter */}
            <select
              value={levelFilter}
              onChange={e => handleLevelChange(e.target.value)}
              className={`px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors cursor-pointer ${levelFilter ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
                }`}
            >
              <option value="">All Levels</option>
              <option value="JHS">JHS (Junior High)</option>
              <option value="SHS">SHS (Senior High)</option>
            </select>

            {/* Grade Filter */}
            <select
              value={gradeFilter}
              onChange={e => { setGradeFilter(e.target.value); setPage(1); }}
              className={`px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors cursor-pointer ${gradeFilter ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
                }`}
            >
              <option value="">All Grades</option>
              {availableGrades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            {/* Program Filter */}
            <select
              value={programFilter}
              onChange={e => { setProgramFilter(e.target.value); setPage(1); }}
              className={`px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors cursor-pointer ${programFilter ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
                }`}
            >
              <option value="">
                {levelFilter === 'JHS' ? 'All Programs (Regular & SSC)' : levelFilter === 'SHS' ? 'All Strands' : 'All Programs'}
              </option>
              {availablePrograms.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            {/* Action Buttons: Refresh icon and Excel export button */}
            <button
              onClick={loadSections}
              title="Refresh sections"
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              <RefreshCw size={14} />
            </button>

            <button
              onClick={exportToExcel}
              disabled={exporting || filtered.length === 0}
              title="Export to Excel"
              className="flex items-center gap-1.5 px-3.5 py-2 border border-green-200 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Download size={14} />
              {exporting ? 'Exporting...' : 'Excel'}
            </button>

            {/* Clear filters button if any filter is active */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                title="Clear filters"
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors font-medium cursor-pointer"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400 text-sm">
            <RefreshCw size={15} className="animate-spin" /> Loading sections...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <BookOpen size={36} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">No sections found</p>
            <p className="text-xs mt-1">Try adjusting your filters or create a new section</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {['Section Code', 'Grade/Year', 'Adviser', 'Room', 'Enrolled / Cap', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
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
                        <td className="px-4 py-3">
                          <span className="font-bold text-[#001840]">{s.code}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          Grade {s.yearLevel}
                          {s.strand === 'SSC' && (
                            <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-yellow-100 text-yellow-800 rounded-full">SSC</span>
                          )}
                          {s.strand && s.strand !== 'SSC' && (
                            <span className="ml-1 text-xs text-purple-600 font-medium">· {s.strand}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{s.instructor || <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-3 text-gray-500">{s.room || <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold text-sm ${isFull ? 'text-red-500' : 'text-gray-700'}`}>
                              {enrolled} / {cap}
                            </span>
                            <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-400' : pct >= 80 ? 'bg-yellow-400' : 'bg-green-400'}`}
                                style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setStudentsPanel(s)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="View Students">
                              <Users size={14} />
                            </button>
                            <button onClick={() => setFormModal(s)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(s)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                              <Trash2 size={14} />
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50 bg-gray-50/30">
                <p className="text-xs text-gray-400">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} sections
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1.5 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 text-xs rounded-lg transition-colors ${p === page ? 'bg-[#001840] text-white font-semibold' : 'border border-gray-200 hover:bg-white text-gray-600'}`}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-1.5 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 transition-colors">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Form Modal */}
      {formModal && (
        <SectionFormModal
          section={formModal === 'create' ? null : formModal}
          onClose={() => setFormModal(null)}
          onSaved={() => { setFormModal(null); loadSections(); }}
        />
      )}

      {/* Students Panel */}
      {studentsPanel && (
        <SectionStudentsPanel
          section={studentsPanel}
          allSections={sections}
          onClose={() => setStudentsPanel(null)}
          onChanged={loadSections}
        />
      )}
    </div>
  );
}
