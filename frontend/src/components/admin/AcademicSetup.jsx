import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, BookOpen, Calendar, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, GraduationCap, LockKeyhole, Plus, RefreshCw, Search, ShieldCheck, Trash2, Pencil, X } from 'lucide-react';
import { API } from '../../config/api';
import { confirmAction } from '../../utils/confirmAction';
import './AcademicSetup.css';

const TERMS = ['1st Trimester', '2nd Trimester', '3rd Trimester', '1st', '2nd', 'Summer'];
const STRANDS = ['STEM', 'ABM', 'HUMSS', 'TVL', 'Sports', 'Arts and Design'];
const emptySubject = () => ({ code: '', description: '', units: 1, programCode: 'JHS', gradeLevel: 7, semester: '1st Trimester', strand: '', teacherId: '' });
async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json', ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.error || 'The request failed. Please try again.');
  return body;
}
const dateLabel = value => value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not yet opened';
function Field({ label, children, hint }) {
  return <label className="academic-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
function Modal({ title, subtitle, busy, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="academic-modal" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="academic-modal-heading"><div><h3>{title}</h3><p>{subtitle}</p></div><button type="button" className="academic-icon" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={20} /></button></div>
    {children}
  </dialog>;
}
function Empty({ title, children }) {
  return <div className="academic-empty"><BookOpen size={28} /><h3>{title}</h3><p>{children}</p></div>;
}

export function AcademicSetup() {
  const [tab, setTab] = useState('grading');
  const [subjects, setSubjects] = useState([]);
  const [years, setYears] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [loadedRevision, setLoadedRevision] = useState(-1);
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);
  const [period, setPeriod] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loadedGradingKey, setLoadedGradingKey] = useState('');
  const [gradingError, setGradingError] = useState('');
  const [gradingRevision, setGradingRevision] = useState(0);
  const [busy, setBusy] = useState('');
  const [search, setSearch] = useState('');
  const [program, setProgram] = useState('');
  const [grade, setGrade] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [subjectForm, setSubjectForm] = useState(null);
  const [newYear, setNewYear] = useState(null);
  const [formError, setFormError] = useState('');

  const loading = loadedRevision !== revision;
  const gradingKey = `${selectedYear}:${gradingRevision}:${revision}`;
  const gradingLoading = Boolean(selectedYear && loadedGradingKey !== gradingKey);

  useEffect(() => {
    let cancelled = false;
    Promise.all([request('/academic/subjects'), request('/academic/school-years'), request('/admin/teachers')])
      .then(([subjectData, yearData, teacherData]) => {
        if (!Array.isArray(subjectData) || !Array.isArray(yearData) || !Array.isArray(teacherData)) throw new Error('Could not load academic records.');
        if (cancelled) return;
        setLoadError(''); setSubjects(subjectData); setYears(yearData); setTeachers(teacherData.filter(teacher => teacher.isActive === true || Number(teacher.isActive) === 1));
        setSelectedYear(previous => yearData.some(year => year.year === previous) ? previous : (yearData.find(year => year.isActive) || yearData[0])?.year || '');
      }).catch(error => { if (!cancelled) setLoadError(error.message); })
      .finally(() => { if (!cancelled) setLoadedRevision(revision); });
    return () => { cancelled = true; };
  }, [revision]);

  useEffect(() => {
    if (!selectedYear) return;
    let cancelled = false;
    const query = `?schoolYear=${encodeURIComponent(selectedYear)}`;
    Promise.all([request(`/admin/grading-periods${query}`), request(`/admin/academic/year-end-summary${query}`)])
      .then(([periods, summary]) => {
        if (!Array.isArray(periods)) throw new Error('Could not load year-end submission.');
        if (!cancelled) { setGradingError(''); setPeriod(periods.find(item => item.quarter === 'FINAL') || null); setProgress(summary); }
      }).catch(error => { if (!cancelled) setGradingError(error.message); })
      .finally(() => { if (!cancelled) setLoadedGradingKey(`${selectedYear}:${gradingRevision}:${revision}`); });
    return () => { cancelled = true; };
  }, [selectedYear, gradingRevision, revision]);

  const filtered = useMemo(() => subjects.filter(subject =>
    (!program || subject.programCode === program) && (!grade || Number(subject.gradeLevel) === Number(grade)) &&
    (!term || subject.semester === term) && (!search.trim() || `${subject.code} ${subject.description} ${subject.strand || ''}`.toLowerCase().includes(search.trim().toLowerCase()))
  ), [subjects, program, grade, term, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  const refresh = useCallback(() => { setRevision(value => value + 1); }, []);

  async function mutate(key, path, method, body, message) {
    if (busy) return false;
    setBusy(key); setFormError('');
    try {
      await request(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      toast.success(message); return true;
    } catch (error) { setFormError(error.message); toast.error(error.message); return false; }
    finally { setBusy(''); }
  }
  async function saveSubject(event) {
    event.preventDefault();
    const { id, ...body } = subjectForm;
    if (await mutate('subject', id ? `/admin/academic/subjects/${id}` : '/admin/academic/subjects', id ? 'PUT' : 'POST', body, id ? 'Subject updated' : 'Subject added')) { setSubjectForm(null); refresh(); }
  }
  async function archiveSubject(subject) {
    if (!(await confirmAction({ title: 'Remove curriculum subject?', message: `${subject.code} will be removed from the available curriculum. Existing enrollment records will be preserved.`, confirmText: 'Remove subject' }))) return;
    if (await mutate(`remove-${subject.id}`, `/admin/academic/subjects/${subject.id}`, 'DELETE', undefined, 'Subject removed from curriculum')) refresh();
  }
  async function addYear(event) {
    event.preventDefault();
    if (await mutate('year', '/admin/academic/school-years', 'POST', { year: newYear.trim() }, 'School year added')) { setSelectedYear(newYear.trim()); setNewYear(null); refresh(); }
  }
  async function activate(year) {
    if (!(await confirmAction({ title: `Activate ${year.year}?`, message: 'This will become the default school year for academic operations.', confirmText: 'Activate year', variant: 'primary' }))) return;
    if (await mutate(`activate-${year.id}`, `/admin/academic/school-years/${year.id}/activate`, 'PUT', {}, 'Active school year updated')) { setSelectedYear(year.year); refresh(); }
  }
  async function changeWindow() {
    if (!selectedYear || gradingLoading || gradingError) return;
    const action = period?.isOpen ? 'close' : 'open';
    if (period?.isOpen && !(await confirmAction({ title: 'Lock final grades?', message: `Teachers will no longer be able to submit or edit final grades for ${selectedYear}. You can reopen submissions if corrections are needed.`, confirmText: 'Close and lock', variant: 'warning' }))) return;
    if (await mutate('window', period ? `/admin/grading-periods/${period.id}/${action}` : '/admin/grading-periods/setup', period ? 'PUT' : 'POST', { schoolYear: selectedYear }, !period ? 'Submission window created' : action === 'open' ? 'Year-end submissions opened' : 'Final grades locked')) setGradingRevision(value => value + 1);
  }
  async function completeYear() {
    if (!(await confirmAction({ title: `Complete school year ${selectedYear}?`, message: `This will mark ${progress.students} enrolled student(s) in ${selectedYear} as completed so they can re-enroll. Retained students keep their retained status. This action cannot be undone here.`, confirmText: 'Complete school year', variant: 'danger' }))) return;
    if (await mutate('complete', '/admin/academic/close-school-year', 'POST', { schoolYear: selectedYear }, 'School year enrollments completed')) { setGradingRevision(value => value + 1); }
  }
  function openSubject(subject) { setFormError(''); setSubjectForm(subject ? { id: subject.id, code: subject.code, description: subject.description, units: subject.units, programCode: subject.programCode, gradeLevel: subject.gradeLevel, semester: subject.semester, strand: subject.strand || '', teacherId: subject.teacherId || '' } : emptySubject()); }
  const ready = Boolean(progress?.students && !progress.pendingStudents && period && !period.isOpen);
  const percent = progress?.totalSubjects ? Math.round(progress.submitted / progress.totalSubjects * 100) : 0;
  const tabs = [{ id: 'grading', label: 'Year-end grades', icon: GraduationCap }, { id: 'subjects', label: 'Subject curriculum', icon: BookOpen }, { id: 'years', label: 'School years', icon: Calendar }];

  return <section className="academic-setup">
    <div className="academic-toolbar"><nav aria-label="Academic setup sections">{tabs.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{createElement(Icon, { size: 17 })}{label}</button>)}</nav><button className="academic-icon" aria-label="Refresh academic records" disabled={loading || !!busy} onClick={refresh}><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button></div>
    {loading ? <div role="status" className="academic-loading"><RefreshCw size={22} className="animate-spin" />Loading academic records...</div> : loadError ? <div role="alert" className="academic-error">{loadError}<button onClick={refresh}>Try again</button></div> : <>
    {tab === 'grading' && <>
      <div className="academic-section-heading"><div><h3>Year-end grade submissions</h3><p>Open the window when teachers are ready. Lock grades after review.</p></div><Field label="School year"><select value={selectedYear} disabled={!!busy} onChange={event => setSelectedYear(event.target.value)}><option value="">Select school year</option>{years.map(year => <option key={year.id} value={year.year}>{year.year}{year.isActive ? ' (Active)' : ''}</option>)}</select></Field></div>
      {!selectedYear ? <Empty title="Start with a school year">Add a school year to begin. <button className="academic-text-button" onClick={() => setTab('years')}>Manage school years <ArrowRight size={15} /></button></Empty> : gradingLoading ? <div role="status" className="academic-loading">Loading submission status...</div> : gradingError ? <div role="alert" className="academic-error">{gradingError}<button onClick={() => setGradingRevision(value => value + 1)}>Try again</button></div> : <>
      <div className="academic-grading-grid"><article className="academic-card academic-window"><div className="academic-card-heading"><span className="academic-overline">FINAL GRADE SUBMISSION</span><span className={`academic-pill ${period?.isOpen ? 'is-green' : ''}`}>{!period ? 'Not set up' : period.isOpen ? 'Open' : 'Locked'}</span></div><h3>{selectedYear}</h3><p>{!period ? 'Prepare a submission window for this school year.' : period.isOpen ? 'Teachers can submit and correct final grades.' : 'Grade submissions and teacher edits are locked.'}</p>
        <div className="academic-steps">{[{ label: 'Set up', done: !!period }, { label: 'Collect grades', done: !!period?.openedAt }, { label: 'Lock & review', done: !!period?.closedAt && !period?.isOpen }].map((step, index) => <div key={step.label} className={step.done ? 'is-done' : ''}><span>{step.done ? <Check size={14} /> : index + 1}</span><small>{step.label}</small></div>)}</div>
        <button className={`academic-button ${period?.isOpen ? 'is-outline' : 'is-primary'}`} disabled={!!busy} onClick={changeWindow}>{period?.isOpen ? <LockKeyhole size={16} /> : <ArrowRight size={16} />}{busy === 'window' ? 'Updating...' : !period ? 'Set up submission window' : period.isOpen ? 'Close submissions & lock grades' : period.closedAt ? 'Reopen for corrections' : 'Open year-end submissions'}</button><small className="academic-timestamp">{dateLabel(period?.isOpen ? period.openedAt : period?.closedAt)}</small>
      </article><article className="academic-card"><div className="academic-card-heading"><h4>Submission progress</h4><span className="academic-muted">{percent}%</span></div><div className="academic-progress-number"><strong>{progress?.submitted ?? 0}</strong><span>of {progress?.totalSubjects ?? 0} subject grades submitted</span></div><div className="academic-progress" role="progressbar" aria-label="Final grades submitted" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div style={{ width: `${percent}%` }} /></div><div className="academic-progress-details"><p><UsersIcon />{progress?.students ?? 0} enrolled students</p><p><Clock size={16} />{progress?.pendingStudents ?? 0} students with incomplete records</p></div><p className="academic-note">Review submitted grades in <strong>Section Management / Year-end Grades</strong>.</p></article></div>
      <div className="academic-privacy"><ShieldCheck size={19} /><p><strong>Staff access only.</strong> Teachers submit one final grade per subject. Admin and registrar review the records. Students cannot access grades.</p></div>
      <article className="academic-complete"><div><h4>Complete this school year</h4><p>{ready ? 'Grades are complete and locked. You can now complete the enrolled student records.' : 'All enrolled students need subject assignments and final grades, and submissions must be locked before completion.'}</p></div><button className="academic-button is-outline" disabled={!ready || !!busy} onClick={completeYear}><CheckCircle2 size={16} />{busy === 'complete' ? 'Completing...' : 'Complete school year'}</button></article>
      </>}
    </>}
    {tab === 'subjects' && <article className="academic-card academic-curriculum"><div className="academic-section-heading"><div><h3>Subject curriculum</h3><p>Manage subjects by education level, grade, and offering term.</p></div><button className="academic-button is-primary" disabled={!!busy} onClick={() => openSubject()}><Plus size={17} />Add subject</button></div>
      <div className="academic-filters"><label className="academic-search"><Search size={17} /><input aria-label="Search subjects" placeholder="Search code, title, or strand" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label><select aria-label="Filter education level" value={program} onChange={event => { setProgram(event.target.value); setGrade(''); setPage(1); }}><option value="">All levels</option><option>JHS</option><option>SHS</option></select><select aria-label="Filter grade" value={grade} onChange={event => { setGrade(event.target.value); setPage(1); }}><option value="">All grades</option>{(program === 'JHS' ? [7,8,9,10] : program === 'SHS' ? [11,12] : [7,8,9,10,11,12]).map(value => <option key={value} value={value}>Grade {value}</option>)}</select><select aria-label="Filter offering term" value={term} onChange={event => { setTerm(event.target.value); setPage(1); }}><option value="">All offering terms</option>{TERMS.map(value => <option key={value}>{value}</option>)}</select>{(search || program || grade || term) && <button className="academic-text-button" onClick={() => { setSearch(''); setProgram(''); setGrade(''); setTerm(''); setPage(1); }}>Clear filters</button>}</div>
      {!filtered.length ? <Empty title={subjects.length ? 'No matching subjects' : 'Build your curriculum'}>{subjects.length ? 'Try a different search or clear the filters.' : 'Add the subjects offered to Junior and Senior High School students.'}</Empty> : <><div className="academic-table-scroll"><table className="academic-table"><thead><tr>{['Subject', 'Level / Grade', 'Offering term', 'Strand', 'Default teacher', 'Units', 'Actions'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{visible.map(subject => <tr key={subject.id}><td><span className="academic-code">{subject.code}</span><strong>{subject.description}</strong></td><td><span className={`academic-pill ${subject.programCode === 'SHS' ? 'is-purple' : 'is-blue'}`}>{subject.programCode}</span><small>Grade {subject.gradeLevel}</small></td><td>{subject.semester}</td><td>{subject.strand || 'Core / All strands'}</td><td>{teachers.find(teacher => teacher.id === subject.teacherId)?.name || (subject.teacherId ? 'Unavailable teacher' : 'Not assigned')}</td><td>{subject.units}</td><td><div className="academic-row-actions"><button className="academic-icon" aria-label={`Edit ${subject.code}`} disabled={!!busy} onClick={() => openSubject(subject)}><Pencil size={16} /></button><button className="academic-icon is-danger" aria-label={`Remove ${subject.code}`} disabled={!!busy} onClick={() => archiveSubject(subject)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div><footer className="academic-pagination"><span>{(currentPage - 1) * 10 + 1}-{Math.min(currentPage * 10, filtered.length)} of {filtered.length} subjects</span><div><button className="academic-icon" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={18} /></button><span>{currentPage} / {pages}</span><button className="academic-icon" aria-label="Next page" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={18} /></button></div></footer></>}
    </article>}
    {tab === 'years' && <><div className="academic-section-heading"><div><h3>School years</h3><p>Choose the default school year for academic operations.</p></div><button className="academic-button is-primary" disabled={!!busy} onClick={() => { setFormError(''); setNewYear(''); }}><Plus size={17} />Add school year</button></div>{!years.length ? <Empty title="Add your first school year">Create a school year, activate it, then set up year-end submissions.</Empty> : <div className="academic-years">{years.map(year => <article key={year.id} className={`academic-card academic-year-card ${year.isActive ? 'is-active' : ''}`}><div className="academic-card-heading"><Calendar size={21} /><span className={`academic-pill ${year.isActive ? 'is-green' : ''}`}>{year.isActive ? 'Active year' : 'Available'}</span></div><h3>{year.year}</h3><p>{year.isActive ? 'Default year for academic operations' : 'Switch to this year when needed'}</p><button className="academic-button is-outline" disabled={!!busy} onClick={() => { setSelectedYear(year.year); setTab('grading'); }}>Manage final grades<ArrowRight size={15} /></button>{!year.isActive && <button className="academic-text-button" disabled={!!busy} onClick={() => activate(year)}>{busy === `activate-${year.id}` ? 'Activating...' : 'Set as active school year'}</button>}</article>)}</div>}</>}
    </>}
    {subjectForm && <Modal title={subjectForm.id ? 'Edit subject' : 'Add curriculum subject'} subtitle="Define the subject offered to your students." busy={!!busy} onClose={() => setSubjectForm(null)}><form onSubmit={saveSubject} className="academic-form">{formError && <p role="alert" className="academic-error">{formError}</p>}<fieldset disabled={!!busy}><Field label="Subject code"><input required maxLength={20} autoFocus value={subjectForm.code} placeholder="e.g. MATH7" onChange={event => setSubjectForm(previous => ({ ...previous, code: event.target.value.toUpperCase() }))} /></Field><Field label="Subject title"><input required maxLength={200} value={subjectForm.description} placeholder="e.g. Mathematics 7" onChange={event => setSubjectForm(previous => ({ ...previous, description: event.target.value }))} /></Field><div className="academic-form-grid"><Field label="Education level"><select value={subjectForm.programCode} onChange={event => setSubjectForm(previous => ({ ...previous, programCode: event.target.value, gradeLevel: event.target.value === 'JHS' ? 7 : 11, strand: '' }))}><option>JHS</option><option>SHS</option></select></Field><Field label="Grade level"><select value={subjectForm.gradeLevel} onChange={event => setSubjectForm(previous => ({ ...previous, gradeLevel: Number(event.target.value) }))}>{(subjectForm.programCode === 'JHS' ? [7,8,9,10] : [11,12]).map(value => <option key={value} value={value}>Grade {value}</option>)}</select></Field></div>{subjectForm.programCode === 'SHS' && <Field label="Strand / Track"><select value={subjectForm.strand} onChange={event => setSubjectForm(previous => ({ ...previous, strand: event.target.value }))}><option value="">Core / All strands</option>{STRANDS.map(value => <option key={value}>{value}</option>)}</select></Field>}<Field label="Assigned teacher" hint="Default teacher for new enrollments. Use Section Management to change a teacher for a particular section."><select value={subjectForm.teacherId} onChange={event => setSubjectForm(previous => ({ ...previous, teacherId: event.target.value }))}><option value="">Not assigned</option>{subjectForm.teacherId && !teachers.some(teacher => String(teacher.id) === String(subjectForm.teacherId)) && <option value={subjectForm.teacherId} disabled>Previously assigned teacher (unavailable)</option>}{teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></Field></fieldset><div className="academic-form-actions"><button type="button" className="academic-button is-outline" disabled={!!busy} onClick={() => setSubjectForm(null)}>Cancel</button><button className="academic-button is-primary" disabled={!!busy}>{busy ? 'Saving...' : 'Save subject'}</button></div></form></Modal>}
    {newYear !== null && <Modal title="Add school year" subtitle="Create the year before making it active." busy={!!busy} onClose={() => setNewYear(null)}><form className="academic-form" onSubmit={addYear}>{formError && <p role="alert" className="academic-error">{formError}</p>}<Field label="School year" hint="Use consecutive years, for example 2026-2027."><input required autoFocus disabled={!!busy} pattern="[0-9]{4}-[0-9]{4}" placeholder="2026-2027" value={newYear} onChange={event => setNewYear(event.target.value)} /></Field><div className="academic-form-actions"><button type="button" className="academic-button is-outline" disabled={!!busy} onClick={() => setNewYear(null)}>Cancel</button><button className="academic-button is-primary" disabled={!!busy}>{busy ? 'Saving...' : 'Add school year'}</button></div></form></Modal>}
  </section>;
}
function UsersIcon() { return <GraduationCap size={16} />; }
