import { Calendar as BirthdayCalendar } from "../../components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "../../components/ui/popover";
import { CalendarDays } from "lucide-react";
import { useAuth } from "../../contexts/authState";
import { useAdmissionSettings, admissionChecklist } from "../../hooks/useAdmissionSettings";
import { Fragment, useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { toast } from "sonner";
import { CheckCircle2, Upload, X, Loader2, FileText, ArrowLeft } from "lucide-react";
import { uploadEnrollmentDocuments, getEnrollmentById, getEnrollmentDocuments } from "../../services/enrollmentApi";
import { API } from "../../config/api";
import { allowedEnrollmentTypes, normalizeEnrollmentType as normalizeTypeForGrade, ENROLLMENT_TYPE_LABELS } from "../../utils/enrollmentTypes";
const JHS_GRADES = ["Grade 7", "Grade 8", "Grade 9", "Grade 10"];
const SHS_GRADES = ["Grade 11", "Grade 12"];

// eslint-disable-next-line no-unused-vars
function normalizeEnrollmentType(educationLevel, gradeLevel, enrollmentType) {
  return normalizeTypeForGrade(gradeLevel, enrollmentType);
}

const onlyDigits = (e) => { if (!/[0-9]/.test(e.key) && !["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete"].includes(e.key)) e.preventDefault(); };
const onlyLetters = (e) => { if (!e.ctrlKey && !e.metaKey && e.key.length === 1 && !/[\p{L}\p{M}\s.\-'\u2019]/u.test(e.key)) e.preventDefault(); };
const keepDigits = (value, maxLength) => value.replace(/\D/g, "").slice(0, maxLength);
const keepNameCharacters = (value, maxLength) => value.replace(/[^\p{L}\p{M}\s.\-'\u2019]/gu, "").slice(0, maxLength);
function BirthdayPicker({ value, onChange, error }) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = value ? new Date(`${value.slice(0, 10)}T00:00:00`) : undefined;
  const validSelected = selected && !Number.isNaN(selected.getTime()) ? selected : undefined;
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><button type="button" aria-label="Choose date of birth" aria-invalid={!!error}
      className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-4 py-2.5 text-left text-sm ${error ? 'border-red-400' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#102A71]/20`}>
      <span className={validSelected ? 'text-[#001840]' : 'text-gray-400'}>{validSelected ? validSelected.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Select your birthday'}</span><CalendarDays size={18} className="shrink-0 text-[#102A71]" />
    </button></PopoverTrigger>
    <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] rounded-xl bg-white p-1 shadow-xl">
      <BirthdayCalendar mode="single" captionLayout="dropdown" startMonth={new Date(1900, 0)} endMonth={today}
        defaultMonth={validSelected || new Date(today.getFullYear() - 12, 0)} selected={validSelected}
        disabled={{ after: today }} autoFocus
        classNames={{ dropdowns: 'flex items-center justify-center gap-2', dropdown_root: 'relative rounded-md border border-gray-200 bg-white px-2 py-1', dropdown: 'absolute inset-0 w-full cursor-pointer opacity-0', caption_label: 'flex items-center gap-1 text-sm font-semibold text-[#001840]' }}
        onSelect={date => { if (!date) return; onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`); setOpen(false); }} />
      <p className="px-3 pb-3 text-center text-xs text-gray-500">Choose the year and month, then select a day.</p>
    </PopoverContent>
  </Popover>;
}

function F({ label, required, error, children }) { return (<div className="flex flex-col gap-1"><label className="text-sm font-semibold text-[#001840]">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>{children}{error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}</div>); }
function I({ error, maxLength = 200, ...p }) { return (<input {...p} maxLength={maxLength} className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${error ? "border-red-400 focus:ring-red-200" : "border-gray-200 focus:ring-[#102A71]/20 focus:border-[#102A71]"} bg-white text-[#001840]`} />); }
function S({ error, children, ...p }) { return (<select {...p} className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all bg-white text-[#001840] ${error ? "border-red-400 focus:ring-red-200" : "border-gray-200 focus:ring-[#102A71]/20 focus:border-[#102A71]"}`}>{children}</select>); }
const SAVE_KEY = "hs_enrollment_draft";

export function HSEnrollmentForm({ enrollmentId: propId, readOnly = false }) {
  const { id: paramId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  // sscEnrollmentId comes from MyEnrollments when student needs to complete SSC placeholder
  const sscEnrollmentId = location.state?.sscEnrollmentId || null;
  const prefill = location.state?.prefill || null; // carry-over pre-fill data
  const isCarryOver = !!location.state?.carryOver;
  const id = propId || paramId || sscEnrollmentId || null;
  const isEditMode = !!id;
  const draftKey = `${SAVE_KEY}:${user?.id || 'guest'}:${id || `${location.state?.educationLevel || 'JHS'}:${location.state?.gradeLevel || ''}:${isCarryOver ? 'continuing' : 'new'}`}`;
  const serverVersion = useRef(null);
  const [draftSaveError, setDraftSaveError] = useState('');
  function readDraft() {
    if (readOnly) return null;
    try { return JSON.parse(localStorage.getItem(draftKey) || 'null'); } catch { return null; }
  }
  const { settings, error: settingsError, retry: retrySettings } = useAdmissionSettings(id);
  const [serverPolicy, setServerPolicy] = useState(null);
  const [enrollmentLoadError, setEnrollmentLoadError] = useState('');
  const [enrollmentLoading, setEnrollmentLoading] = useState(!!id);
  const [loadRevision, setLoadRevision] = useState(0);
  const policy = serverPolicy || settings?.content;
  const savedDraftId = useRef(null);
  const [savedDocs, setSavedDocs] = useState([]);
  const documentInputs = useRef({});
  const checkingFile = useRef(false);
  const [checkingDocument, setCheckingDocument] = useState(null);
  const [documentErrors, setDocumentErrors] = useState({});
  async function selectDocument(key, file, input) {
    if (checkingFile.current) { input.value = ''; return; }
    checkingFile.current = true;
    setCheckingDocument(key);
    setDocumentErrors(previous => ({ ...previous, [key]: '' }));
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      for (const [otherKey, otherFile] of Object.entries(form.docFiles)) {
        if (otherKey === key || !otherFile || otherFile.size !== file.size) continue;
        const otherBytes = new Uint8Array(await otherFile.arrayBuffer());
        if (bytes.every((byte, index) => byte === otherBytes[index])) {
          const label = activeCreds.find(item => item.key === otherKey)?.label || otherKey;
          setDocumentErrors(previous => ({ ...previous, [key]: `This file is already selected for ${label}. Choose a different document.` }));
          input.value = '';
          return;
        }
      }
      setF(previous => ({ ...previous, docFiles: { ...previous.docFiles, [key]: file } }));
    } catch {
      setDocumentErrors(previous => ({ ...previous, [key]: 'Could not read this file. Please select it again.' }));
      input.value = '';
    } finally {
      checkingFile.current = false;
      setCheckingDocument(null);
    }
  }
  useEffect(() => {
    if (!id) return;
    getEnrollmentDocuments(id).then(docs => setSavedDocs(Array.isArray(docs) ? docs : [])).catch(() => { });
  }, [id]);
  const navigate = useNavigate();
  const [step, setStep] = useState(() => {
    const draft = readDraft();
    const limit = isCarryOver || draft?.form?.enrollmentType === 'old' || location.state?.enrollmentType === 'old' ? 3 : 5;
    return Math.max(1, Math.min(limit, Number(draft?.step) || 1));
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showBackDialog, setShowBackDialog] = useState(false);

  // educationLevel passed from LevelSelection — lock it for the entire session
  const initialLevel = location.state?.educationLevel || 'JHS';

  const defaultForm = { educationLevel: initialLevel, gradeLevel: "", strand: "", studentType: "New", academicYear: "2025-2026", dateEnrolled: "", studentNumber: "", lrn: "", familyName: user?.lastName || "", firstName: user?.firstName || "", middleName: user?.middleName || "", sex: "", dateOfBirth: "", placeOfBirth: "", fatherName: "", fatherOccupation: "", fatherMobileNumber: "", motherMobileNumber: "", motherName: "", motherOccupation: "", parentsAddress: "", guardianName: "", guardianOccupation: "", guardianAddress: "", guardianTelephone: "", grade6School: "", grade6SchoolAddress: "", grade6Section: "", grade6SYStart: "", grade6SYEnd: "", grade6Average: "", grade6Remarks: "", lastHSSchool: "", lastHSCurriculumYear: "", lastHSSection: "", lastHSSYStart: "", lastHSSYEnd: "", sscApplied: false, studentSignature: "", parentGuardianSignature: "", credentials: {}, docFiles: {} };

  // Load saved draft on mount — skipped in edit mode or carry-over
  const [form, setF] = useState(() => {
    if (isEditMode) return defaultForm;
    const draft = readDraft();
    if (draft?.form) return {
      ...defaultForm, ...prefill, ...draft.form,
      educationLevel: initialLevel,
      gradeLevel: location.state?.gradeLevel || draft.form.gradeLevel,
      ...(isCarryOver ? { sscClass: prefill?.sscClass || null, sscApplied: false, enrollmentType: 'old', studentType: 'Old', academicYear: prefill?.academicYear || draft.form.academicYear } : {}),
      docFiles: {},
    };
    // Carry-over: pre-fill from previous enrollment
    if (isCarryOver && prefill) {
      const educationLevel = prefill.educationLevel || initialLevel;
      return {
        ...defaultForm,
        ...prefill,
        studentNumber: prefill.studentNumber || "",
        studentType: "Old",
        enrollmentType: normalizeEnrollmentType(educationLevel, prefill.gradeLevel, prefill.enrollmentType || "old"),
        docFiles: {},
        credentials: {},
      };
    }
    // Grade level + applicant type chosen in the LevelSelection modal
    const presetGrade = location.state?.gradeLevel || null;
    const applyPreset = (base) => presetGrade ? {
      ...base,
      gradeLevel: presetGrade,
      strand: base.gradeLevel === presetGrade ? base.strand : "",
      enrollmentType: normalizeEnrollmentType(initialLevel, presetGrade, location.state?.enrollmentType),
    } : base;
    return applyPreset(defaultForm);
  });

  // Detect if this is an SSC placeholder being completed (edit mode, sscApplied, no firstName loaded yet)
  const [isSSCCompletion, setIsSSCCompletion] = useState(false);

  const [sscChosenClass, setSscChosenClass] = useState(null); // 'SSC' | 'Regular'

  // Guard against direct access to /hs-enrollment-form while an SSC application is pending exam or active enrollment exists
  useEffect(() => {
    if (isEditMode || readOnly || !user?.id) return;
    let cancelled = false;
    const token = localStorage.getItem('token');
    if (!token) return;
    Promise.all([
      fetch(`${API}/academic/school-years/active`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API}/enrollments/user/${user.id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []).catch(() => [])
    ]).then(([sy, data]) => {
      if (cancelled) return;
      const currentActiveYear = sy?.year || null;
      const enrollments = Array.isArray(data) ? data : (data.enrollments || []);

      const pendingSSC = enrollments.find(e =>
        e.sscApplied && !e.sscResult && !e.firstName &&
        e.status === 'pending_exam' &&
        (!currentActiveYear || !e.academicYear || e.academicYear === currentActiveYear)
      );
      if (pendingSSC) {
        toast.error('Your SSC application is still pending Registrar review and entrance exam results. Please wait before filling out the enrollment form.');
        navigate('/my-enrollments', { replace: true });
        return;
      }

      const readySSC = enrollments.find(e =>
        e.sscApplied && ['passed', 'failed'].includes(e.sscResult) && !e.firstName &&
        ['draft', 'submitted'].includes(e.status) &&
        (!currentActiveYear || !e.academicYear || e.academicYear === currentActiveYear)
      );
      if (readySSC) {
        navigate('/enroll', { replace: true });
        return;
      }

      const active = enrollments.find(e =>
        !['rejected', 'completed', 'draft'].includes(e.status) &&
        (!currentActiveYear || !e.academicYear || e.academicYear === currentActiveYear)
      );
      if (active) {
        navigate('/my-enrollments', { replace: true });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isEditMode, readOnly, user?.id, navigate]);

  // Load existing enrollment when editing
  useEffect(() => {
    if (!isEditMode) return;
    let cancelled = false;
    getEnrollmentById(id).then(data => {
      if (cancelled) return;
      setEnrollmentLoadError('');
      const e = data.enrollment || data;
      serverVersion.current = e.updatedAt || null;
      const draft = readDraft();
      const restored = draft?.serverVersion === serverVersion.current ? draft : null;
      // Detect SSC placeholder that has actually passed the exam (sscApplied, no firstName yet, and sscResult='passed')
      // NOTE: sscApplied+!firstName alone is NOT enough — the student may have only applied and not yet taken/passed the exam
      const sscPlaceholder = !!e.sscApplied && !e.firstName && ['passed', 'failed'].includes(e.sscResult);
      if (!readOnly && !['draft', 'returned'].includes(e.status) && !sscPlaceholder) {
        navigate(`/enrollment/${id}`, { replace: true });
        return;
      }
      setIsSSCCompletion(sscPlaceholder);
      if (sscPlaceholder) setSscChosenClass(e.sscClass || 'SSC'); // default SSC if somehow null
      setF(prev => ({
        ...prev,
        educationLevel: e.educationLevel || 'JHS',
        // SSC placeholder: grade level is Grade 7, keep it locked
        gradeLevel: e.gradeLevel || (sscPlaceholder ? 'Grade 7' : ''),
        strand: e.strand || '',
        enrollmentType: normalizeEnrollmentType(e.educationLevel || 'JHS', e.gradeLevel || (sscPlaceholder ? 'Grade 7' : ''), e.enrollmentType || 'new'),
        studentType: e.studentType || 'New',
        academicYear: e.academicYear || '2025-2026',
        dateEnrolled: e.dateEnrolled || '',
        studentNumber: e.studentNumber || '',
        lrn: e.lrn || '',
        familyName: e.familyName || (sscPlaceholder ? prev.familyName : ''),
        firstName: e.firstName || (sscPlaceholder ? prev.firstName : ''),
        middleName: e.middleName || (sscPlaceholder ? prev.middleName : ''),
        sex: e.sex || '',
        dateOfBirth: e.dateOfBirth || '',
        placeOfBirth: e.placeOfBirth || '',
        fatherName: e.fatherName || '',
        fatherOccupation: e.fatherOccupation || '',
        fatherMobileNumber: e.fatherMobileNumber || '',
        motherMobileNumber: e.motherMobileNumber || '',
        motherName: e.motherName || '',
        motherOccupation: e.motherOccupation || '',
        parentsAddress: e.parentsAddress || '',
        guardianName: e.guardianName || '',
        guardianOccupation: e.guardianOccupation || '',
        guardianAddress: e.guardianAddress || '',
        guardianTelephone: e.guardianTelephone || '',
        grade6School: e.grade6School || '',
        grade6SchoolAddress: e.grade6SchoolAddress || '',
        grade6Section: e.grade6Section || '',
        grade6SYStart: e.grade6SYStart || '',
        grade6SYEnd: e.grade6SYEnd || '',
        grade6Average: e.grade6Average || '',
        grade6Remarks: e.grade6Remarks || '',
        lastHSSchool: e.lastHSSchool || '',
        lastHSCurriculumYear: e.lastHSCurriculumYear || '',
        lastHSSection: e.lastHSSection || '',
        lastHSSYStart: e.lastHSSYStart || '',
        lastHSSYEnd: e.lastHSSYEnd || '',
        sscApplied: !!e.sscApplied,
        sscClass: e.sscClass || null,
        studentSignature: e.studentSignature || '',
        parentGuardianSignature: e.parentGuardianSignature || '',
        credentials: Array.isArray(e.admissionCredentials)
          ? Object.fromEntries(e.admissionCredentials.map(k => [k, true]))
          : {},
        ...restored?.form,
        docFiles: {},
      }));
      setStep(Math.max(1, Math.min(e.enrollmentType === 'old' ? 3 : 5, Number(restored?.step) || 1)));
    }).catch(error => {
      if (cancelled) return;
      const message = error instanceof TypeError ? 'Cannot reach the server. Check that the backend is running, then retry.' : error.message || 'Could not load your enrollment.';
      setEnrollmentLoadError(message);
      toast.error(message);
    }).finally(() => { if (!cancelled) setEnrollmentLoading(false); });
    return () => { cancelled = true; };
  }, [id, loadRevision]);

  function saveDraft(nextStep = step) {
    if (readOnly) return true;
    try {
      const { docFiles: _files, ...saveable } = form;
      localStorage.setItem(draftKey, JSON.stringify({ form: saveable, step: nextStep, serverVersion: serverVersion.current }));
      setDraftSaveError('');
      return true;
    } catch {
      setDraftSaveError('Your progress could not be saved in this browser. Keep this page open and try Continue again.');
      return false;
    }
  }
  // Keep typed details locally, including changes made between Continue clicks.
  useEffect(() => {
    if (readOnly || enrollmentLoading || enrollmentLoadError) return;
    // Report browser storage failures while persisting the draft.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    saveDraft();
  }, [form, step, enrollmentLoading]);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const familySections = Object.fromEntries(['father', 'mother', 'guardian'].map(key => [key, [form[`${key}Name`], form[`${key}Occupation`], form[key === 'guardian' ? 'guardianTelephone' : `${key}MobileNumber`], key === 'guardian' ? form.guardianAddress : ''].some(value => String(value || '').trim())]));
  const [previewModal, setPreviewModal] = useState(null); // { url, name, isPdf }
  const [openingSavedDocument, setOpeningSavedDocument] = useState(null);
  const previewRequest = useRef(0);
  useEffect(() => () => { previewRequest.current += 1; }, []);
  useEffect(() => () => { if (previewModal?.url) URL.revokeObjectURL(previewModal.url); }, [previewModal]);
  async function viewSavedDocument(document) {
    const request = ++previewRequest.current;
    setOpeningSavedDocument(document.id);
    setDocumentErrors(previous => ({ ...previous, [document.documentType]: '' }));
    try {
      const response = await fetch(`${API.replace(/\/api\/?$/, '')}${document.filePath}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Could not open this document. Please try again.');
      const blob = await response.blob();
      if (!['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(blob.type)) throw new Error('This document could not be previewed.');
      if (request !== previewRequest.current) return;
      setPreviewModal({ url: URL.createObjectURL(blob), name: document.originalName || document.documentLabel || 'Submitted document', isPdf: blob.type === 'application/pdf' });
    } catch (error) {
      if (request === previewRequest.current) setDocumentErrors(previous => ({ ...previous, [document.documentType]: error.message || 'Could not open this document.' }));
    } finally {
      if (request === previewRequest.current) setOpeningSavedDocument(null);
    }
  }
  const [lrnTaken, setLrnTaken] = useState(false);
  const lrnTimer = useRef(null);
  const checkLrn = (val) => {
    clearTimeout(lrnTimer.current);
    if (val.length < 12) { setLrnTaken(false); return; }
    lrnTimer.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/enrollments/check-lrn?lrn=${val}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setLrnTaken(data.taken);
      } catch { setLrnTaken(false); }
    }, 500);
  };
  const isSHS = form.educationLevel === "SHS";
  const allowedTypes = allowedEnrollmentTypes(form.gradeLevel);
  const enrollmentTypeOptions = ["new", "old", "transferee", "returnee"].map(value => ({
    value,
    label: value === "old" ? "Old / Continuing" : ENROLLMENT_TYPE_LABELS[value],
    disabled: !form.gradeLevel || !allowedTypes.includes(value),
  }));
  const isGrade7 = form.educationLevel === 'JHS' && form.gradeLevel === 'Grade 7';
  const isTransferee = form.enrollmentType === 'transferee';
  const grades = isSHS ? SHS_GRADES : JHS_GRADES;
  const activeCreds = admissionChecklist(policy, form.educationLevel, form.enrollmentType || 'new');
  const SHS_STRANDS = policy?.strands.filter(strand => strand.active).map(strand => strand.name) || [];
  const total = 5;
  const isContinuing = form.enrollmentType === 'old' || isCarryOver;
  const isIncomingGrade7 = form.educationLevel === 'JHS' && form.gradeLevel === 'Grade 7' && !isContinuing;
  const lastRequiredStep = isContinuing ? 3 : total;
  const isContinuingSSC = isContinuing && form.educationLevel === 'JHS' && form.sscClass === 'SSC';
  const needsReportedAverage = isContinuingSSC && !form.gradesComplete && !isEditMode;
  const maintainingAverage = Number(policy?.ssc?.maintainingAverage ?? policy?.ssc?.minimumAverage ?? 85);
  const docStep = 5;
  const labels = ["Grade & Type", "Personal Info", "Family", "Education", "Documents"].slice(0, lastRequiredStep);
  // Active credential list depends on enrollment type

  function validate(s) {
    const e = {};
    if (s === 1) {
      if (!form.gradeLevel) e.gradeLevel = "Grade level is required";
      if (isSHS && !SHS_STRANDS.includes(form.strand)) e.strand = "Please select an available strand";
      if (needsReportedAverage && (form.previousGeneralAverage === '' || !Number.isFinite(Number(form.previousGeneralAverage)) || Number(form.previousGeneralAverage) < maintainingAverage || Number(form.previousGeneralAverage) > 100)) {
        e.previousGeneralAverage = `Enter your previous year General Average (${maintainingAverage} to 100) to continue in SSC.`;
      }
      // SSC completion: enrollmentType defaults to 'new', no need to force selection
      if (!isSSCCompletion && !form.enrollmentType) e.enrollmentType = "Please select an enrollment type";
      // Validate student ID only if filled (optional for new students)
      if (form.enrollmentType === 'old' && (!form.studentNumber || !form.studentNumber.trim())) {
        e.studentNumber = "Student ID is required for continuing students (e.g. A-9869 or 2025-00123)";
      } else if (!isIncomingGrade7 && form.studentNumber && form.studentNumber.trim()) {
        const idPattern = /^([A-Z]{1,3}-\d{3,6}|\d{4}-\d{4,6})$/i;
        if (!idPattern.test(form.studentNumber.trim())) {
          e.studentNumber = "Invalid format. Use EMC ID (e.g. A-9869) or YYYY-NNNNN (e.g. 2025-00123)";
        }
      }
    }
    if (s === 2) {
      if (!form.familyName.trim()) e.familyName = "Required";
      else if (/\d/.test(form.familyName)) e.familyName = "No numbers";
      if (!form.firstName.trim()) e.firstName = "Required";
      else if (/\d/.test(form.firstName)) e.firstName = "No numbers";
      if (!form.sex) e.sex = "Required";
      if (!form.dateOfBirth) e.dateOfBirth = "Required";
      else if (new Date(`${form.dateOfBirth.slice(0, 10)}T00:00:00`) > new Date()) e.dateOfBirth = "Birthday cannot be in the future";
      if (!form.placeOfBirth.trim()) e.placeOfBirth = "Required";
      if (!form.lrn) e.lrn = "Required";
      else if (!/^\d{12}$/.test(form.lrn)) e.lrn = "LRN must be exactly 12 digits";
      else if (lrnTaken) e.lrn = "This LRN is already registered";
    }
    if (s === 3) {
      const contacts = ['father', 'mother', 'guardian'].filter(key => familySections[key]);
      if (!contacts.length) e.family = 'Provide details for at least one parent or guardian.';
      for (const key of contacts) {
        if (!form[`${key}Name`]?.trim()) e[`${key}Name`] = 'Required';
        const phoneKey = key === 'guardian' ? 'guardianTelephone' : `${key}MobileNumber`;
        if (!/^09\d{9}$/.test(form[phoneKey] || '')) e[phoneKey] = 'Enter 11 digits starting with 09';
      }
      if ((familySections.father || familySections.mother) && !form.parentsAddress.trim()) e.parentsAddress = 'Required';
      if (familySections.guardian && !form.guardianAddress.trim()) e.guardianAddress = 'Required';
    }
    if (s === 4) {
      if (form.grade6Average && (!Number.isFinite(Number(form.grade6Average)) || Number(form.grade6Average) < 0 || Number(form.grade6Average) > 100)) e.grade6Average = "Enter a value from 0 to 100";
      for (const field of (isGrade7 ? ["grade6SYStart", "grade6SYEnd"] : ["grade6SYStart", "grade6SYEnd", "lastHSSYStart", "lastHSSYEnd"])) { if (form[field] && !/^\d{4}$/.test(form[field])) e[field] = "Enter a four-digit year"; }
      // Transferees must fill in their last HS school info
      if (isTransferee && !isGrade7) {
        if (!form.lastHSSchool?.trim()) e.lastHSSchool = "Required for transferees";
        if (!form.lastHSCurriculumYear?.trim()) e.lastHSCurriculumYear = "Required for transferees";
        if (!form.lastHSSYStart?.trim()) e.lastHSSYStart = "Required for transferees";
        if (!form.lastHSSYEnd?.trim()) e.lastHSSYEnd = "Required for transferees";
      }
    }
    if (s === docStep) {
      const missing = activeCreds.filter(cred => cred.required && !form.docFiles[cred.key] && !savedDocs.some(doc => doc.documentType === cred.key));
      if (missing.length) e.credentials = `Please upload required documents: ${missing.map(cred => cred.label).join(', ')}.`;
    }
    return e;
  }
  function stepFill(s) {
    if (s === 1) { const fields = [form.gradeLevel, isSHS ? form.strand : null].filter(f => f !== null); const filled = fields.filter(Boolean).length; return Math.round((filled / (fields.length || 1)) * 100); }
    if (s === 2) { const fields = [form.familyName, form.firstName, form.sex, form.dateOfBirth]; const filled = fields.filter(Boolean).length; return Math.round((filled / (fields.length || 1)) * 100); }
    if (s === 3) { const fields = ['father', 'mother', 'guardian'].filter(key => familySections[key]).flatMap(key => [form[`${key}Name`], form[key === 'guardian' ? 'guardianTelephone' : `${key}MobileNumber`], form[key === 'guardian' ? 'guardianAddress' : 'parentsAddress']]); const filled = fields.filter(Boolean).length; return Math.round((filled / (fields.length || 1)) * 100); }
    if (s === 4) { const fields = [form.grade6School, form.grade6Average]; const filled = fields.filter(Boolean).length; return Math.round((filled / (fields.length || 1)) * 100); }
    if (s === docStep) { const uploaded = activeCreds.filter(c => form.docFiles[c.key]).length; return activeCreds.length ? Math.round((uploaded / activeCreds.length) * 100) : 100; }
    return 0;
  }

  function goToStep(target) {
    if (target === step) return;
    if (target > lastRequiredStep) return;
    if (target > step + 1) { toast.error("Complete each stage in order before continuing."); return; }
    if (target > step) {
      const stageErrors = validate(step);
      if (Object.keys(stageErrors).length > 0) { setErrors(stageErrors); return; }
    }
    setErrors({}); setStep(target); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  // Stepper navigation: lets students preview any stage freely. Validation still runs on Continue and on Submit.
  function jumpToStep(target) {
    if (target === step || target < 1 || target > lastRequiredStep) return;
    setErrors({}); setStep(target); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function continueStage() {
    if (step >= lastRequiredStep) { submit(); return; }
    const stageErrors = validate(step);
    if (Object.keys(stageErrors).length) { setErrors(stageErrors); return; }
    if (!saveDraft(step + 1)) return;
    goToStep(step + 1);
  }
  function handleBack() { setShowBackDialog(true); }
  function clearDraft() { localStorage.removeItem(draftKey); }
  async function submit() {
    if (checkingFile.current) return;
    const maxValidation = lastRequiredStep;
    for (let requiredStep = 1; requiredStep <= maxValidation; requiredStep++) {
      const stageErrors = validate(requiredStep);
      if (Object.keys(stageErrors).length > 0) { setErrors(stageErrors); setStep(requiredStep); return; }
    }
    setErrors({});
    setSubmitting(true);
    try {
      const payload = {
        educationLevel: form.educationLevel,
        gradeLevel: form.gradeLevel,
        strand: form.strand || null,
        enrollmentType: form.enrollmentType || 'new',
        studentType: form.studentType,
        studentNumber: isIncomingGrade7 ? null : form.studentNumber || null,
        academicYear: form.academicYear,
        dateEnrolled: form.dateEnrolled || null,
        lrn: form.lrn,
        familyName: form.familyName,
        firstName: form.firstName,
        middleName: form.middleName,
        sex: form.sex,
        dateOfBirth: form.dateOfBirth,
        placeOfBirth: form.placeOfBirth,
        fatherName: form.fatherName,
        fatherOccupation: form.fatherOccupation,
        fatherMobileNumber: form.fatherMobileNumber,
        motherMobileNumber: form.motherMobileNumber,
        motherName: form.motherName,
        motherOccupation: form.motherOccupation,
        parentsAddress: form.parentsAddress,
        guardianName: form.guardianName,
        guardianOccupation: form.guardianOccupation,
        guardianAddress: form.guardianAddress,
        guardianTelephone: form.guardianTelephone,
        grade6School: form.grade6School,
        grade6SchoolAddress: form.grade6SchoolAddress,
        grade6Section: form.grade6Section,
        grade6SYStart: form.grade6SYStart,
        grade6SYEnd: form.grade6SYEnd,
        grade6Average: form.grade6Average,
        grade6Remarks: form.grade6Remarks,
        lastHSSchool: form.lastHSSchool,
        lastHSCurriculumYear: form.lastHSCurriculumYear,
        lastHSSection: form.lastHSSection,
        lastHSSYStart: form.lastHSSYStart,
        lastHSSYEnd: form.lastHSSYEnd,
        sscApplied: isContinuing ? false : form.sscApplied,
        ...(isContinuing && form.educationLevel === 'JHS' && form.sscClass ? { sscClass: form.sscClass } : {}),
        ...(isContinuingSSC && form.previousGeneralAverage !== '' && form.previousGeneralAverage != null ? { previousGeneralAverage: Number(form.previousGeneralAverage) } : {}),
        studentSignature: form.studentSignature,
        parentGuardianSignature: form.parentGuardianSignature,
        admissionCredentials: activeCreds.filter(c => form.docFiles[c.key]).map(c => c.key),
        status: "submitted",
      };
      const token = localStorage.getItem("token");

      let eid = id || savedDraftId.current;
      if (eid) {
        // Update existing enrollment
        const res = await fetch(`${API}/enrollments/${eid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to update enrollment");
      } else {
        // Create new enrollment
        const res = await fetch(`${API}/enrollments`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed");
        eid = data.enrollment?.id;
        if (!eid) throw new Error("No enrollment ID returned from server");
        savedDraftId.current = eid;
        if (data.enrollment?.admissionPolicy) setServerPolicy(data.enrollment.admissionPolicy);
      }

      // Upload any new documents
      const files = {};
      Object.entries(form.docFiles).forEach(([k, f]) => { if (f) files[k] = f; });
      if (Object.keys(files).length > 0) {
        await uploadEnrollmentDocuments(eid, files);
      }
      const finalized = await fetch(`${API}/enrollments/${eid}/submit`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const finalData = await finalized.json();
      if (!finalized.ok) throw Error(finalData.message || 'Your draft is saved, but submission could not finish. Please retry.');
      toast.success('Enrollment submitted successfully!');
      clearDraft();
      navigate("/my-enrollments");
    } catch (err) {
      if (err.field) {
        setDocumentErrors(previous => ({ ...previous, [err.field]: err.message }));
        setStep(docStep);
      } else toast.error(err.message || "Failed to submit enrollment");
    }
    finally { setSubmitting(false); }
  }
  if (!policy) return <div className="min-h-[60vh] p-8 text-center"><p role="status">{settingsError || 'Loading admission requirements...'}</p>{settingsError && <button onClick={retrySettings} className="mt-4 underline">Try again</button>}</div>;
  const pct = Math.round(((step - 1) / (lastRequiredStep - 1)) * 100);
  if (isEditMode && (enrollmentLoading || enrollmentLoadError)) return <div className="mx-auto max-w-xl p-6 sm:p-10">
    {enrollmentLoading ? <p role="status" className="text-center text-gray-500">Loading enrollment data...</p> : <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5"><h2 className="font-semibold text-red-800">Could not load enrollment</h2><p className="mt-2 text-sm text-red-700">{enrollmentLoadError}</p><div className="mt-4 flex gap-3"><button onClick={() => { setEnrollmentLoading(true); setLoadRevision(value => value + 1); }} className="rounded-lg bg-[#102A71] px-4 py-2 text-sm font-semibold text-white">Retry</button><button onClick={() => navigate('/my-enrollments')} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm">My Enrollments</button></div></div>}
  </div>;

  return (
    <div className="min-h-screen bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0]">

      {/* File preview modal */}
      {previewModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex flex-col">
          <div className="flex items-center justify-between bg-[#001840] px-4 py-3 shrink-0">
            <span className="text-white text-sm font-medium truncate max-w-xs">{previewModal.name}</span>
            <button
              onClick={() => setPreviewModal(null)}
              className="flex items-center gap-1.5 text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
            >
              <X size={14} /> Close
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {previewModal.isPdf ? (
              <iframe src={previewModal.url} className="w-full h-full border-0" title={previewModal.name} />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-4">
                <img src={previewModal.url} alt={previewModal.name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save progress dialog */}
      {showBackDialog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-[#001840] mb-2">Save your progress?</h3>
            <p className="text-sm text-gray-600 mb-5">Your details are saved in this browser. Return with the same account and browser to continue. Files must be reselected until submission.</p>
            <div className="flex gap-3">
              <button onClick={() => { clearDraft(); navigate("/enroll"); }} className="flex-1 py-2.5 border-2 border-red-300 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-all">Discard & Leave</button>
              <button onClick={() => { if (!saveDraft()) return; setShowBackDialog(false); navigate("/enroll"); }} className="flex-1 py-2.5 bg-[#102A71] text-white rounded-xl text-sm font-semibold hover:bg-[#001840] transition-all">Save & Leave</button>
            </div>
            <button onClick={() => setShowBackDialog(false)} className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-gray-600">Stay on form</button>
          </div>
        </div>
      )}

      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-16 lg:top-20 z-40">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          {/* Back button */}
          <button onClick={handleBack} className="flex items-center gap-1.5 text-sm text-[#102A71] hover:text-[#001840] font-medium mb-3 transition-colors">
            <ArrowLeft size={15} /> Back to Level Selection
          </button>
          <div className="flex items-center justify-between mb-3 relative">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0" />
            <div className="absolute top-4 left-0 h-0.5 bg-[#102A71] z-0 transition-all duration-500" style={{ width: `${pct}%` }} />
            {labels.map((lbl, i) => {
              const sid = i + 1;
              const stageDisabled = sid > lastRequiredStep;
              const active = sid === step;
              const fill = stepFill(sid);
              const complete = fill === 100 && sid !== step;
              // Circle style: active=yellow, complete=solid blue, partial=conic-gradient, empty=outline only
              const circleStyle = complete
                ? { background: "#102A71", border: "2px solid #102A71", color: "#fff" }
                : active
                  ? { background: "#F5C400", border: "2px solid #F5C400", color: "#001840" }
                  : fill > 0
                    ? { background: `conic-gradient(#102A71 ${fill * 3.6}deg, #e5e7eb ${fill * 3.6}deg)`, border: "2px solid #102A71", color: "#102A71" }
                    : { background: "#fff", border: "2px solid #d1d5db", color: "#9ca3af" };
              return (
                <button key={sid} type="button" onClick={() => jumpToStep(sid)} disabled={stageDisabled} aria-label={`Stage ${sid}: ${lbl}`} className={`flex flex-col items-center border-0 bg-transparent p-0 text-inherit z-10 gap-1 ${stageDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer group"}`}>
                  <div style={circleStyle} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
                    {/* Inner white circle for partial fill to show number */}
                    {fill > 0 && !complete && !active ? (
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-[#102A71]">{sid}</div>
                    ) : complete ? <CheckCircle2 size={14} /> : sid}
                  </div>
                  <span className={`text-[9px] font-medium hidden sm:block text-center leading-tight max-w-15 transition-colors ${active ? "text-[#001840]" : complete ? "text-[#102A71]" : fill > 0 ? "text-[#102A71]" : "text-gray-400 group-hover:text-[#102A71]"}`}>{lbl}</span>
                </button>
              );
            })}          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-linear-to-r from-[#102A71] to-[#F5C400] h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} /></div>
          <p className="text-xs text-gray-400 mt-1 text-right">Step {step} of {lastRequiredStep}</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-3 sm:px-4 pt-4 pb-24 sm:pb-8">

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[#001840]">{labels[step - 1]}</h2>
          <p className="text-sm text-gray-500 mt-1">Step {step} of {lastRequiredStep}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
          {step === 1 && (<div className="space-y-5">
            {/* Lock education level and grade level for SSC completion */}
            {isSSCCompletion ? (
              <div className={`flex gap-3 p-3 rounded-xl border ${sscChosenClass === 'Regular'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-yellow-50 border-yellow-200'
                }`}>
                <div>
                  <p className={`text-xs font-semibold ${sscChosenClass === 'Regular' ? 'text-blue-800' : 'text-yellow-800'}`}>Education Level</p>
                  <p className="text-sm font-bold text-[#001840]">
                    Junior High School — Grade 7 {sscChosenClass === 'SSC' ? '(SSC)' : '(Regular)'}
                  </p>

                </div>
              </div>
            ) : isEditMode || isCarryOver ? (
              /* Edit mode — lock level and grade, show as read-only */
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 mb-1">Education Level & Grade</p>
                <p className="text-sm font-bold text-[#001840]">
                  {form.educationLevel} — {form.gradeLevel || '—'}
                  {form.strand ? ` (${form.strand})` : ''}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Locked — education level cannot be changed after submission</p>
              </div>
            ) : (
              <>
                {/* Education level is locked to whatever was chosen on the Level Selection page */}
                <div className="flex gap-3 mb-2">
                  {["JHS", "SHS"].map(lvl => (
                    <button key={lvl} type="button" disabled={lvl !== form.educationLevel}
                      className={`px-6 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${form.educationLevel === lvl
                          ? "border-[#102A71] bg-[#EEF2FF] text-[#001840]"
                          : "border-gray-100 text-gray-300 cursor-not-allowed"
                        }`}>
                      {lvl}
                    </button>
                  ))}
                </div>
                <F label="Grade Level" required error={errors.gradeLevel}><S value={form.gradeLevel} error={errors.gradeLevel} onChange={e => { const gradeLevel = e.target.value; setF(prev => ({ ...prev, gradeLevel, strand: "", enrollmentType: normalizeEnrollmentType(prev.educationLevel, gradeLevel, prev.enrollmentType) })); }}><option value="">Select grade level</option>{grades.map(g => <option key={g} value={g}>{g}</option>)}</S></F>
                {isSHS && (<F label="Strand" required error={errors.strand}><S value={form.strand} error={errors.strand} onChange={e => set("strand", e.target.value)}><option value="">Select strand</option>{SHS_STRANDS.map(s => <option key={s} value={s}>{s}</option>)}</S></F>)}
              </>
            )}
            {/* Enrollment type — hide for SSC or carry-over (always New/Old respectively) */}
            {!isSSCCompletion && !isCarryOver && (
              <F label="Enrollment Type" required error={errors.enrollmentType}>
                <div className="flex gap-3 flex-wrap">
                  {enrollmentTypeOptions.map(t => (
                    <button key={t.value} type="button" disabled={t.disabled} onClick={() => set("enrollmentType", t.value)}
                      className={`px-5 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${t.disabled ? "border-gray-100 text-gray-300 cursor-not-allowed" : form.enrollmentType === t.value ? "border-[#102A71] bg-[#EEF2FF] text-[#001840]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {errors.enrollmentType && <p className="text-xs text-red-500 mt-1">{errors.enrollmentType}</p>}
              </F>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <F label="School Year"><I value={form.academicYear} placeholder="2025-2026" maxLength={20} onChange={e => set("academicYear", e.target.value)} /></F>
              {!isIncomingGrade7 && (
              <F label="Student ID Number" required={form.enrollmentType === 'old'} error={errors.studentNumber}>
                <I
                  value={form.studentNumber}
                  error={errors.studentNumber}
                  placeholder="e.g. A-9869 or 2025-00123"
                  maxLength={20}
                  onChange={e => {
                    const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
                    set("studentNumber", cleaned);
                  }}
                />
                <p className="text-[10px] text-gray-400 mt-1">Format: A-9869 or YYYY-NNNNN · Required for continuing students</p>

                {errors.studentNumber && <p className="text-xs text-red-500 mt-0.5">{errors.studentNumber}</p>}
              </F>
              )}
            </div>
            {needsReportedAverage && <F label="Previous Year General Average" required error={errors.previousGeneralAverage}><I type="number" min={maintainingAverage} max="100" step="0.01" value={form.previousGeneralAverage ?? ''} onChange={event => set('previousGeneralAverage', event.target.value)} placeholder={`At least ${maintainingAverage}`} /></F>}
          </div>)}
          {step === 2 && (<div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <F label="Last Name" required error={errors.familyName}><I value={form.familyName} maxLength={100} error={errors.familyName} placeholder="Last Name" onKeyDown={onlyLetters} onChange={e => set("familyName", keepNameCharacters(e.target.value, 100))} /></F>
              <F label="First Name" required error={errors.firstName}><I value={form.firstName} maxLength={100} error={errors.firstName} placeholder="First Name" onKeyDown={onlyLetters} onChange={e => set("firstName", keepNameCharacters(e.target.value, 100))} /></F>
              <F label="Middle Name (optional)"><I value={form.middleName} maxLength={100} placeholder="Middle Name" onKeyDown={onlyLetters} onChange={e => set("middleName", keepNameCharacters(e.target.value, 100))} /></F>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <F label="LRN" required error={errors.lrn || (lrnTaken ? "This LRN is already registered" : undefined)}><I value={form.lrn} placeholder="12-digit LRN" maxLength={12} inputMode="numeric" onKeyDown={onlyDigits} error={errors.lrn || lrnTaken} onChange={e => { const lrn = keepDigits(e.target.value, 12); set("lrn", lrn); checkLrn(lrn); }} /></F>
              <F label="Sex" required error={errors.sex}><S value={form.sex} error={errors.sex} onChange={e => set("sex", e.target.value)}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></S></F>
              <F label="Date of Birth" required error={errors.dateOfBirth}><BirthdayPicker value={form.dateOfBirth} error={errors.dateOfBirth} onChange={value => set("dateOfBirth", value)} /></F>
            </div>
            <F label="Place of Birth" required error={errors.placeOfBirth}><I error={errors.placeOfBirth} value={form.placeOfBirth} placeholder="Place of birth" onChange={e => set("placeOfBirth", e.target.value)} /></F>
          </div>)}
          {step === 3 && (<div className="space-y-5">
            {['father', 'mother', 'guardian'].map(key => {
              const phoneKey = key === 'guardian' ? 'guardianTelephone' : `${key}MobileNumber`;
              return <Fragment key={key}><section className="rounded-xl border border-gray-200 p-4 space-y-4"><h3 className="border-b pb-2 text-sm font-bold capitalize text-[#001840]">{key} details <span className="ml-2 text-xs font-normal normal-case text-gray-500">{familySections[key] ? 'Contact details provided' : 'Leave blank if not applicable'}</span></h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <F label="Full Name" required={familySections[key]} error={errors[`${key}Name`]}><I value={form[`${key}Name`]} error={errors[`${key}Name`]} maxLength={200} onKeyDown={onlyLetters} onChange={event => set(`${key}Name`, keepNameCharacters(event.target.value, 200))} /></F>
                <F label="Mobile Number" required={familySections[key]} error={errors[phoneKey]}><I value={form[phoneKey] || ''} error={errors[phoneKey]} placeholder="09XXXXXXXXX" maxLength={11} inputMode="numeric" onKeyDown={onlyDigits} onChange={event => set(phoneKey, keepDigits(event.target.value, 11))} /></F>
                <F label="Occupation (optional)"><I value={form[`${key}Occupation`]} maxLength={100} onChange={event => set(`${key}Occupation`, event.target.value)} /></F>
                {key === 'guardian' && <F label="Guardian Address" required={familySections.guardian} error={errors.guardianAddress}><I value={form.guardianAddress} error={errors.guardianAddress} maxLength={500} onChange={event => set('guardianAddress', event.target.value)} /></F>}
              </div></section>
              {key === 'mother' && (<F label="Parent Address" required={familySections.father || familySections.mother} error={errors.parentsAddress}><I value={form.parentsAddress} error={errors.parentsAddress} maxLength={500} placeholder="Complete address" onChange={event => set('parentsAddress', event.target.value)} /></F>)}
              </Fragment>;
            })}

          </div>)}
          {step === 4 && (<div className="space-y-5">
            <div><h3 className="text-sm font-bold text-[#001840] mb-3 pb-2 border-b border-gray-100">Grade VI School</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><F label="School Name"><I value={form.grade6School} maxLength={200} placeholder="School name" onChange={e => set("grade6School", e.target.value)} /></F><F label="School Address"><I value={form.grade6SchoolAddress} maxLength={200} placeholder="Address" onChange={e => set("grade6SchoolAddress", e.target.value)} /></F><F label="Section"><I value={form.grade6Section} maxLength={50} placeholder="Section" onChange={e => set("grade6Section", e.target.value)} /></F><F label="General Average" error={errors.grade6Average}><I type="number" min="0" max="100" step="0.01" inputMode="decimal" value={form.grade6Average} placeholder="e.g. 88" error={errors.grade6Average} onChange={e => set("grade6Average", e.target.value)} /></F><F label="SY Start" error={errors.grade6SYStart}><I value={form.grade6SYStart} placeholder="2020" maxLength={4} inputMode="numeric" onKeyDown={onlyDigits} error={errors.grade6SYStart} onChange={e => set("grade6SYStart", keepDigits(e.target.value, 4))} /></F><F label="SY End" error={errors.grade6SYEnd}><I value={form.grade6SYEnd} placeholder="2021" maxLength={4} inputMode="numeric" onKeyDown={onlyDigits} error={errors.grade6SYEnd} onChange={e => set("grade6SYEnd", keepDigits(e.target.value, 4))} /></F></div></div>
            {!isGrade7 && (
            <div>
              <h3 className="text-sm font-bold text-[#001840] mb-1 pb-2 border-b border-gray-100">
                Last High School Attended
                {isTransferee && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">Required for Transferees</span>}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <F label="School Name" required={isTransferee} error={errors.lastHSSchool}><I value={form.lastHSSchool} maxLength={200} placeholder="School name" error={errors.lastHSSchool} onChange={e => set("lastHSSchool", e.target.value)} /></F>
                <F label="Curriculum Year" required={isTransferee} error={errors.lastHSCurriculumYear}><I value={form.lastHSCurriculumYear} maxLength={20} placeholder="e.g. G7" error={errors.lastHSCurriculumYear} onChange={e => set("lastHSCurriculumYear", e.target.value)} /></F>
                <F label="Section"><I value={form.lastHSSection} maxLength={50} placeholder="Section" onChange={e => set("lastHSSection", e.target.value)} /></F>
                <F label="SY Start" required={isTransferee} error={errors.lastHSSYStart}><I value={form.lastHSSYStart} placeholder="2023" maxLength={4} inputMode="numeric" onKeyDown={onlyDigits} error={errors.lastHSSYStart} onChange={e => set("lastHSSYStart", keepDigits(e.target.value, 4))} /></F>
                <F label="SY End" required={isTransferee} error={errors.lastHSSYEnd}><I value={form.lastHSSYEnd} placeholder="2024" maxLength={4} inputMode="numeric" onKeyDown={onlyDigits} error={errors.lastHSSYEnd} onChange={e => set("lastHSSYEnd", keepDigits(e.target.value, 4))} /></F>
              </div>
            </div>
            )}
          </div>)}
          {step === docStep && (<div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-[#001840] mb-1">Upload Required Documents <span className="text-red-500">*</span></p>
              {isTransferee ? (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4">
                  <p className="text-xs font-bold text-orange-800 mb-1">Transferee Requirements</p>
                  <p className="text-xs text-orange-700 leading-relaxed">
                    As a transferee, all four documents below are <strong>required</strong>. Make sure they are from your previous school with official dry seal.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-500 mb-4">Upload a clear scan or photo of each document. At least one is required.</p>
              )}
            </div>
            {activeCreds.map(cred => {
              const file = form.docFiles[cred.key];
              const savedDocument = savedDocs.find(doc => doc.documentType === cred.key);
              const hasDocument = !!file || !!savedDocument;
              return (
                <div key={cred.key} className={`rounded-xl border-2 p-4 transition-all ${hasDocument ? "border-green-200 bg-green-50/40" : cred.required ? "border-red-200 bg-red-50/30" : "border-gray-200 bg-gray-50"}`}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#001840]">{cred.label}</span>
                    {!hasDocument && cred.required && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600">Required</span>}
                    {hasDocument && <span className="text-xs font-medium text-green-700">{file ? savedDocument ? 'Replacement selected' : 'Selected' : 'On file'}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                    <FileText size={16} className="shrink-0 text-[#102A71]" />
                    <span className="min-w-0 flex-1 break-all text-xs text-gray-600">{file?.name || savedDocument?.originalName || savedDocument?.documentLabel || 'No file selected'}</span>
                    <div className="ml-auto flex shrink-0 items-center gap-2">
                      {hasDocument && <button type="button" aria-label={`View ${cred.label}`} disabled={!file && openingSavedDocument === savedDocument?.id}
                        onClick={() => file ? setPreviewModal({ url: URL.createObjectURL(file), name: file.name, isPdf: file.type === 'application/pdf' }) : viewSavedDocument(savedDocument)}
                        className="flex items-center gap-1 rounded-lg border border-[#102A71]/30 px-3 py-1.5 text-xs font-semibold text-[#102A71] hover:bg-[#EEF2FF] disabled:opacity-50">
                        {!file && openingSavedDocument === savedDocument?.id && <Loader2 size={12} className="animate-spin" />} View
                      </button>}
                      <button type="button" aria-label={`${hasDocument ? 'Replace' : 'Upload'} ${cred.label}`} disabled={checkingDocument !== null || submitting} onClick={() => documentInputs.current[cred.key]?.click()}
                        className="flex items-center gap-1.5 rounded-lg bg-[#102A71] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#001840] disabled:opacity-50">
                        <Upload size={13} /> {hasDocument ? 'Replace' : 'Upload'}
                      </button>
                      {file && <button type="button" aria-label={savedDocument ? `Undo replacement for ${cred.label}` : `Remove selected ${cred.label}`} disabled={checkingDocument !== null || submitting}
                        onClick={() => { set('docFiles', { ...form.docFiles, [cred.key]: null }); if (documentInputs.current[cred.key]) documentInputs.current[cred.key].value = ''; setDocumentErrors(previous => ({ ...previous, [cred.key]: '' })); }}
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50"><X size={14} /></button>}
                    </div>
                  </div>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={checkingDocument !== null || submitting} ref={node => { documentInputs.current[cred.key] = node; }} aria-label={`Upload ${cred.label}`} className="hidden" onChange={e => {
                        const f = e.target.files[0];
                        if (!f) return;
                        const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
                        const allowedExt = ['.pdf', '.jpg', '.jpeg', '.png'];
                        const ext = '.' + f.name.split('.').pop().toLowerCase();
                        if (!allowed.includes(f.type) || !allowedExt.includes(ext)) {
                          toast.error(`Invalid file type "${f.name}". Only PDF, JPG, JPEG, and PNG files are allowed.`);
                          e.target.value = ''; return;
                        }
                        if (f.size > 10 * 1024 * 1024) { toast.error("File exceeds 10MB limit. Please choose a smaller file."); e.target.value = ''; return; }
                        selectDocument(cred.key, f, e.target);
                      }} />
                  {checkingDocument === cred.key && <p role="status" className="mt-2 text-xs text-gray-500">Checking file...</p>}
                  {documentErrors[cred.key] && <p role="alert" className="mt-2 text-xs text-red-600">{documentErrors[cred.key]}</p>}
                  <p className="text-[10px] text-gray-400 mt-2 italic">Formats: PDF, JPG, JPEG, PNG · Max file size: 10 MB</p>
                </div>
              );
            })}
            {errors.credentials && <p className="text-xs text-red-500">{errors.credentials}</p>}
            {errors.docFiles && <p className="text-xs text-red-500">{errors.docFiles}</p>}
          </div>)}
        </div>
        {!readOnly && (
          <div className="mt-6">
            {draftSaveError && <p role="alert" className="mb-3 text-sm text-red-600">{draftSaveError}</p>}
            {step === 3 && <p role={errors.family ? 'alert' : undefined} className={`mb-3 text-sm font-semibold sm:text-right ${errors.family ? 'text-red-600' : 'text-[#001840]'}`}>Provide details for at least one parent or guardian.</p>}
          <div className="flex flex-wrap gap-3 justify-between items-center">
            {step > 1 ? <button type="button" onClick={() => goToStep(step - 1)} className="px-4 sm:px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50">Previous</button> : <span />}
            <div className="flex flex-wrap gap-3 items-center">
              <button type="button" onClick={continueStage} disabled={submitting || checkingDocument !== null} className="flex items-center gap-2 px-8 py-3 bg-[#F5C400] text-[#001840] rounded-xl font-bold hover:bg-[#FFDC5F] transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed">
                {submitting
                  ? <><Loader2 size={18} className="animate-spin" /> Submitting...</>
                  : step === lastRequiredStep
                    ? <><CheckCircle2 size={18} /> Submit Enrollment</>
                    : 'Continue'
                }
              </button>
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
