import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../../config/api';

const COURSES = ['JHS', 'SHS'];
const DEFAULT_SCHOOL_YEARS = ['2026-2027', '2025-2026', '2024-2025'];
const EMPTY_FORM = {
  code: '',
  course: 'JHS',
  yearLevel: '7',
  schoolYear: '2026-2027',
  instructor: '',
  schedule: '',
  room: '',
  capacity: '40',
  minGrade: '',
  maxGrade: '',
  strand: '',
  teacherId: '',
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

export function formatSectionGradeRange(section) {
  const hasMin = section?.minGrade !== null && section?.minGrade !== undefined && section?.minGrade !== '';
  const hasMax = section?.maxGrade !== null && section?.maxGrade !== undefined && section?.maxGrade !== '';
  if (!hasMin && !hasMax) return null;
  if (hasMin && hasMax) return `${Number(section.minGrade)}–${Number(section.maxGrade)}`;
  if (hasMin) return `≥ ${Number(section.minGrade)}`;
  return `≤ ${Number(section.maxGrade)}`;
}

export function SectionFormModal({ section, onClose, onSaved, apiBase = '/admin/sections' }) {
  const isEdit = Boolean(section);
  const [form, setForm] = useState(isEdit ? {
    code: section.code || '',
    course: section.course || 'JHS',
    yearLevel: String(section.yearLevel || '7'),
    schoolYear: section.schoolYear || '2026-2027',
    instructor: section.instructor || '',
    schedule: section.schedule || '',
    room: section.room || '',
    capacity: String(section.capacity || '40'),
    minGrade: section.minGrade ?? '',
    maxGrade: section.maxGrade ?? '',
    strand: section.strand || '',
    teacherId: section.teacherId || '',
  } : { ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [schoolYears, setSchoolYears] = useState(DEFAULT_SCHOOL_YEARS);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    fetch(`${API}/admin/teachers`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setTeachers(Array.isArray(data) ? data : []))
      .catch(() => {});

    fetch(`${API}/academic/school-years`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (!Array.isArray(data) || !data.length) return;
        const active = data.find(item => item.isActive);
        const list = data.map(item => item.year).filter(Boolean);
        if (list.length) setSchoolYears([...new Set(list)]);
        if (!isEdit && active?.year) {
          setForm(prev => ({ ...prev, schoolYear: active.year }));
        }
      })
      .catch(() => {});
  }, [isEdit]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.code.trim()) {
      toast.error('Section code is required');
      return;
    }
    const minVal = form.minGrade === '' ? null : Number(form.minGrade);
    const maxVal = form.maxGrade === '' ? null : Number(form.maxGrade);
    if (minVal !== null && (!Number.isFinite(minVal) || minVal < 0 || minVal > 100)) {
      toast.error('Minimum grade must be between 0 and 100');
      return;
    }
    if (maxVal !== null && (!Number.isFinite(maxVal) || maxVal < 0 || maxVal > 100)) {
      toast.error('Maximum grade must be between 0 and 100');
      return;
    }
    if (minVal !== null && maxVal !== null && minVal > maxVal) {
      toast.error('Minimum grade cannot be higher than maximum grade');
      return;
    }

    setLoading(true);
    try {
      const url = isEdit ? `${API}${apiBase}/${section.id}` : `${API}${apiBase}`;
      const method = isEdit ? 'PUT' : 'POST';
      const payload = {
        ...form,
        yearLevel: Number(form.yearLevel),
        capacity: Number(form.capacity),
        minGrade: minVal,
        maxGrade: maxVal,
        teacherId: form.teacherId ? Number(form.teacherId) : null,
      };
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save');
      if (isEdit && String(form.teacherId || '') !== String(section.teacherId || '')) {
        await fetch(`${API}/admin/sections/${section.id}/assign-teacher`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ teacherId: form.teacherId ? Number(form.teacherId) : null }),
        });
      }
      toast.success(isEdit ? 'Section updated' : 'Section created');
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const yearLevels = form.course === 'JHS' ? ['7', '8', '9', '10'] : ['11', '12'];
  const yearOptions = form.schoolYear && !schoolYears.includes(form.schoolYear)
    ? [form.schoolYear, ...schoolYears]
    : schoolYears;

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
              <select value={form.course} onChange={e => { const nextCourse = e.target.value; set('course', nextCourse); set('yearLevel', nextCourse === 'JHS' ? '7' : '11'); set('strand', ''); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840] bg-white">
                {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Grade Level</label>
            <select value={form.yearLevel} onChange={e => set('yearLevel', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840] bg-white">
              {yearLevels.map(y => (
                <option key={y} value={y}>Grade {y}</option>
              ))}
            </select>
          </div>

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
                  className={`px-5 py-2 rounded-xl border-2 text-sm font-medium transition-all ${!form.strand ? 'border-[#001840] bg-[#EEF2FF] text-[#001840]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  Regular
                </button>
                <button type="button"
                  onClick={() => set('strand', 'SSC')}
                  className={`px-5 py-2 rounded-xl border-2 text-sm font-medium transition-all ${form.strand === 'SSC' ? 'border-yellow-500 bg-yellow-50 text-yellow-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  SSC (Special Science Class)
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                SSC sections are for Grade 7 students who passed the entrance exam.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">School Year</label>
              <select value={form.schoolYear} onChange={e => set('schoolYear', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840] bg-white">
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Capacity</label>
              <input type="number" value={form.capacity} onChange={e => set('capacity', e.target.value)}
                min="1" max="100"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]" />
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#001840] uppercase tracking-wider">
                Placement Grade Range (Optional)
              </label>
              <span className="text-[11px] text-gray-500">Flexible guideline</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Min Average</label>
                <input type="number" step="0.01" min="0" max="100"
                  value={form.minGrade}
                  onChange={e => set('minGrade', e.target.value)}
                  placeholder="e.g. 75"
                  className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Max Average</label>
                <input type="number" step="0.01" min="0" max="100"
                  value={form.maxGrade}
                  onChange={e => set('maxGrade', e.target.value)}
                  placeholder="e.g. 85"
                  className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]" />
              </div>
            </div>
            <p className="text-[11px] text-gray-500">
              Used for automatic section assignment on approval. Ranges may overlap across sections.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Class Adviser</label>
            <select
              value={form.teacherId}
              onChange={e => {
                const val = e.target.value;
                set('teacherId', val);
                if (val) {
                  const t = teachers.find(item => String(item.id) === String(val));
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
              Class adviser can log in to the Teacher Portal and view this section&apos;s students.
            </p>
          </div>

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
