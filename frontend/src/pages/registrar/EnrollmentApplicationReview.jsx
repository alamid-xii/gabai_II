import { useEffect, useRef, useState } from 'react';
import { FileText, Loader2, X } from 'lucide-react';
import { API } from '../../config/api';
import { admissionChecklist } from '../../hooks/useAdmissionSettings';

const LABELS = { f138: 'Report Card (F-138)', f137a: 'Permanent Record (F-137-A)', f137e: 'Permanent Record (F-137-E)', birthCert: 'Birth Certificate', cgmc: 'Good Moral Certificate', tor: 'Transcript of Records', marriageCert: 'Marriage Certificate', cert: 'Certificate', sscCard: 'SSC Application Report Card' };
const STEPS = ['Grade & Type', 'Personal Info', 'Family', 'Education', 'Documents'];
const reviewSteps = enrollment => enrollment.enrollmentType === 'old' ? STEPS.slice(0, 3) : enrollment.sscApplied || enrollment.sscExamDate || enrollment.sscResult ? [...STEPS, 'SSC Exam'] : STEPS;

export function EnrollmentReviewNavigation({ enrollment, onJump, disabled = false }) {
  return <nav aria-label="Enrollment form sections" className="flex flex-wrap gap-2">{reviewSteps(enrollment).map((label, index) => <button key={label} type="button" disabled={disabled} onClick={() => onJump(index)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#102A71] hover:border-[#102A71] hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50">{index + 1}. {label}</button>)}</nav>;
}
const present = value => value !== null && value !== undefined && String(value).trim() !== '';
function date(value) {
  if (!value) return null;
  const parsed = new Date(String(value).slice(0, 10) + 'T00:00:00');
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}
function Fields({ rows }) {
  return <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="min-w-0">
    <dt className="text-xs text-slate-500">{label}</dt>
    <dd className={`mt-1 whitespace-pre-wrap break-words text-sm ${present(value) ? 'font-medium text-[#001840]' : 'text-slate-400'}`}>{present(value) ? value : 'Not provided'}</dd>
  </div>)}</dl>;
}
function Group({ title, children }) {
  return <div className="rounded-xl border border-slate-200 p-4"><h4 className="mb-4 text-sm font-semibold text-[#001840]">{title}</h4>{children}</div>;
}

export default function EnrollmentApplicationReview({ enrollment: e, documents, documentsError, onRetry, sectionsRef }) {
  const localSections = useRef([]);
  const sections = sectionsRef || localSections;
  const steps = reviewSteps(e);
  const [preview, setPreview] = useState(null);
  const [opening, setOpening] = useState(null);
  const [fileError, setFileError] = useState(null);
  const request = useRef(0);
  useEffect(() => () => { request.current += 1; }, []);
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);
  async function viewDocument(document) {
    const revision = ++request.current;
    setOpening(document.id);
    setFileError(null);
    setPreview(null);
    try {
      const response = await fetch(`${API.replace(/\/api\/?$/, '')}${document.filePath}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!response.ok) throw new Error('Could not open this document. Please try again.');
      const blob = await response.blob();
      if (!['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'].includes(blob.type)) throw new Error('This document could not be previewed.');
      if (revision !== request.current) return;
      setPreview({ url: URL.createObjectURL(blob), type: blob.type, name: document.documentLabel || LABELS[document.documentType] || document.documentType });
    } catch (error) {
      if (revision === request.current) setFileError({ id: document.id, message: error.message });
    } finally { if (revision === request.current) setOpening(null); }
  }
  const isGrade7SSC = e.educationLevel === 'JHS' && e.gradeLevel === 'Grade 7' && (e.sscApplied || e.sscClass === 'SSC');
  const applicantFields = new Set(['Education Level', 'Grade Level', 'Enrollment Type', 'School Year', 'Class']);
  const credentials = Array.isArray(e.admissionCredentials) ? e.admissionCredentials : [];
  const requirements = e.admissionPolicy?.requirements ? admissionChecklist(e.admissionPolicy, e.educationLevel, e.enrollmentType || 'new') : [];
  const keys = [...new Set([...requirements.map(item => item.key), ...credentials.map(item => typeof item === 'string' ? item : item.key || item.type), ...documents.map(item => item.documentType)])].filter(Boolean);
  const yearRange = (start, end) => [start, end].filter(present).join(' - ');
  function section(number, children) {
    if (number > steps.length) return null;
    return <section ref={node => { sections.current[number - 1] = node; }} className="scroll-mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label={`Step ${number}: ${steps[number - 1]}`}>
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#102A71] text-sm font-bold text-white">{number}</span><h3 className="font-semibold text-[#001840]">{steps[number - 1]}</h3></div>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </section>;
  }
  return <div className="space-y-4">

    {section(1, <Fields rows={[
      ['Education Level', e.educationLevel === 'JHS' ? 'Junior High School' : e.educationLevel === 'SHS' ? 'Senior High School' : e.educationLevel],
      ['Grade Level', e.gradeLevel], ['Strand', e.strand || (e.educationLevel === 'JHS' ? 'Not applicable' : null)],
      ['Enrollment Type', e.enrollmentType], ['Student Type', e.studentType], ['School Year', e.academicYear],
      ['Student ID Number', e.studentNumber || (e.gradeLevel === 'Grade 7' ? 'Assigned by the registrar' : null)], ['Date Enrolled', date(e.dateEnrolled)],
      ['Class', e.sscClass || (e.sscApplied ? 'SSC applicant' : 'Regular')], ['Current Section', e.sectionName || 'Unassigned'],
      ['Previous Section', e.previousSection], ['Adviser', e.adviserName], ['Student Status', e.studentStatus || e.lifeStatus], ['Status Reason', e.lifeStatusReason], ['Destination School', e.destinationSchool],
    ].filter(([label]) => !isGrade7SSC || applicantFields.has(label))} />)}
    {section(2, <Fields rows={[
      ['Last Name', e.familyName], ['First Name', e.firstName], ['Middle Name', e.middleName], ['LRN', e.lrn],
      ['Sex', e.sex], ['Date of Birth', date(e.dateOfBirth)], ['Place of Birth', e.placeOfBirth],
      ['Account Name', e.user?.name || e.user_name], ['Email', e.email || e.user?.email || e.user_email || e.userEmail], ['Mobile Number', e.mobileNumber || e.user_mobileNumber],
    ]} />)}
    {section(3, <>
      {['father', 'mother'].map(key => {
        const rows = [
          ['Full Name', e[`${key}Name`]], ['Mobile Number', e[`${key}MobileNumber`]], ['Occupation', e[`${key}Occupation`]],
        ].filter(([, value]) => present(value));
        return rows.length ? <Group key={key} title={key === 'father' ? 'Father' : 'Mother'}><Fields rows={rows} /></Group> : null;
      })}
      {present(e.parentsAddress) && <Group title="Parent Address"><Fields rows={[["Complete Address", e.parentsAddress]]} /></Group>}
      {[e.guardianName, e.guardianTelephone, e.guardianOccupation, e.guardianAddress].some(present) && <Group title="Guardian"><Fields rows={[
        ['Full Name', e.guardianName], ['Mobile Number', e.guardianTelephone], ['Occupation', e.guardianOccupation], ['Complete Address', e.guardianAddress],
      ].filter(([, value]) => present(value))} /></Group>}
      {![e.fatherName, e.fatherMobileNumber, e.fatherOccupation, e.motherName, e.motherMobileNumber, e.motherOccupation, e.parentsAddress, e.guardianName, e.guardianTelephone, e.guardianOccupation, e.guardianAddress].some(present) && <p className="text-sm text-slate-500">No family details provided.</p>}
    </>)}
    {section(4, <>
      <Group title="Grade VI School"><Fields rows={[
        ['School Name', e.grade6School], ['School Address', e.grade6SchoolAddress], ['Section', e.grade6Section],
        ['School Year', yearRange(e.grade6SYStart, e.grade6SYEnd)], ['General Average', e.grade6Average],
      ]} /></Group>
      {!(e.educationLevel === 'JHS' && e.gradeLevel === 'Grade 7') && <Group title="Last High School Attended"><Fields rows={[
        ['School Name', e.lastHSSchool], ['Curriculum Year', e.lastHSCurriculumYear], ['Section', e.lastHSSection], ['School Year', yearRange(e.lastHSSYStart, e.lastHSSYEnd)],
      ]} /></Group>}
    </>)}
    {section(5, <>
      {documentsError ? <div role="alert" className="text-sm text-red-600">{documentsError} <button type="button" onClick={onRetry} className="font-semibold underline">Retry</button></div> : keys.length ? <ul className="divide-y divide-slate-100">{keys.map(key => {
        const uploaded = documents.find(item => item.documentType === key);
        const requirement = requirements.find(item => item.key === key);
        return <li key={key} className="py-3 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-semibold text-[#001840]">{requirement?.label || uploaded?.documentLabel || LABELS[key] || key}</p>
            <p className={`mt-1 break-words text-xs ${uploaded ? 'text-slate-500' : 'text-amber-700'}`}>{uploaded ? uploaded.originalName || 'File on record' : requirement?.required ? 'Required - no file on record' : 'No file on record'}</p>
            {uploaded && <p className="mt-1 text-xs text-slate-400">{uploaded.fileSize ? `${(uploaded.fileSize / 1024).toFixed(0)} KB` : ''}</p>}
          </div>{uploaded && <button type="button" disabled={opening === uploaded.id} onClick={() => viewDocument(uploaded)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-[#102A71] hover:bg-blue-100 disabled:opacity-50">{opening === uploaded.id ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} View</button>}</div>
          {fileError && uploaded && fileError.id === uploaded.id && <p role="alert" className="mt-2 text-xs text-red-600">{fileError.message}</p>}
        </li>;
      })}</ul> : <p className="text-sm text-slate-500">No documents on record.</p>}
      {preview && <div className="overflow-hidden rounded-xl border border-slate-200"><div className="flex items-center justify-between gap-3 bg-slate-50 p-3"><p className="text-sm font-semibold text-[#001840]">{preview.name}</p><button type="button" aria-label="Close document preview" onClick={() => setPreview(null)} className="rounded-lg p-2 hover:bg-slate-200"><X size={16} /></button></div>
        {preview.type === 'application/pdf' ? <iframe title={preview.name} src={preview.url} className="h-[60vh] w-full" /> : <img src={preview.url} alt={preview.name} className="mx-auto max-h-[70vh] max-w-full object-contain" />}
        <a href={preview.url} target="_blank" rel="noopener noreferrer" className="inline-block p-3 text-xs font-semibold text-[#102A71] underline">Open document in new tab</a>
      </div>}
      {(e.studentSignature || e.parentGuardianSignature) && <Fields rows={[["Student Signature", e.studentSignature], ["Parent / Guardian Signature", e.parentGuardianSignature]]} />}
    </>)}
    {steps.length === 6 && section(6, <>
      <Fields rows={[
        ['Exam Date', date(e.sscExamDate) || 'Not scheduled'],
        ['Passing Score', e.sscPassingScore ?? 75],
        ['Exam Score', present(e.sscExamScore) ? e.sscExamScore : 'Not recorded'],
        ['Result', e.sscResult === 'passed' ? 'Passed' : e.sscResult === 'failed' ? 'Failed' : e.sscExamDate ? 'Awaiting result' : 'Awaiting schedule'],
        ['Class', e.sscClass || 'Not selected'],
      ]} />
    </>)}
  </div>;
}
