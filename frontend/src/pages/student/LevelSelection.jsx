import { useAdmissionSettings } from "../../hooks/useAdmissionSettings";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { BookOpen, School, ArrowLeft, FlaskConical, X, Upload, FileText, Loader2, CheckCircle2, UserCheck, ArrowRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../../config/api';
import { allowedEnrollmentTypes, ENROLLMENT_TYPE_LABELS } from '../../utils/enrollmentTypes';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED = '.pdf,.jpg,.jpeg,.png';
const FILE_HINT = 'PDF, JPG, JPEG, or PNG. Maximum file size: 10 MB.';

const levels = [
  { id: 'JHS', label: 'Junior High School', subtitle: 'Grade 7 – Grade 10', icon: School },
  { id: 'SHS', label: 'Senior High School', subtitle: 'Grade 11 – Grade 12 · STEM · ABM · HUMSS', icon: BookOpen },
];

function UploadBox({ label, file, onFile, error }) {
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png'];

  const handleChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    // Check MIME type (primary check)
    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error(`Invalid file type "${f.name}". Only PDF, JPG, JPEG, and PNG files are allowed.`);
      e.target.value = '';
      return;
    }
    // Check extension as secondary guard
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      toast.error(`Invalid file extension "${ext}". Only .pdf, .jpg, .jpeg, .png files are allowed.`);
      e.target.value = '';
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error("File exceeds 10MB limit. Please choose a smaller file.");
      e.target.value = '';
      return;
    }
    onFile(f);
  };
  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${file ? "border-green-400 bg-green-50" : error ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}>
      <p className="text-sm font-semibold text-[#001840] mb-2">{label}</p>
      {file ? (
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-green-600 shrink-0" />
          <span className="text-xs text-green-700 truncate flex-1">{file.name}</span>
          <button type="button" onClick={() => onFile(null)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
        </div>
      ) : (
        <label className="flex items-center gap-2 cursor-pointer">
          <Upload size={14} className="text-gray-400" />
          <span className="text-xs text-gray-500">Drag and Drop or Upload File</span>
          <input type="file" accept={ACCEPTED} className="hidden" onChange={handleChange} />
        </label>
      )}
      <p className="text-[10px] text-gray-400 mt-2 italic">{FILE_HINT}</p>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export function LevelSelection() {
  const navigate = useNavigate();
  const { settings, error: settingsError, retry: retrySettings } = useAdmissionSettings();
  const activeStrands = settings?.content.strands.filter(item => item.active).map(item => item.name) || [];
  const maintainingAverage = Number(settings?.content?.ssc?.maintainingAverage ?? settings?.content?.ssc?.minimumAverage ?? 85);
  const [activeSchoolYear, setActiveSchoolYear] = useState('');
  const [sscAverage, setSscAverage] = useState('');
  const [sscPreviousGwa, setSscPreviousGwa] = useState('');
  const [sscGwaError, setSscGwaError] = useState('');
  const [selectedRegularStrand, setSelectedRegularStrand] = useState('');
  const [sscFile, setSscFile] = useState(null);
  const [sscFileError, setSscFileError] = useState('');
  const [submittingSSC, setSubmittingSSC] = useState(false);
  const [sscDone, setSscDone] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingEnrollment, setExistingEnrollment] = useState(null);
  const [passedSSCApplication, setPassedSSCApplication] = useState(null);
  const [classChoice, setClassChoice] = useState('SSC');
  const [savingClassChoice, setSavingClassChoice] = useState(false);
  const [completedEnrollment, setCompletedEnrollment] = useState(null); // for carry-over
  const [pastRecord, setPastRecord] = useState(null); // preserves past enrollment data even if manual grade selected
  const [showStrandPicker, setShowStrandPicker] = useState(false); // Grade 10 → SHS
  const [showRegularModal, setShowRegularModal] = useState(false); // Modal after skip SSC or SHS select
  const [targetLevel, setTargetLevel] = useState('JHS'); // 'JHS' | 'SHS'
  const [jhsProgram, setJhsProgram] = useState('regular'); // 'regular' | 'ssc'
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Check if student already has an active enrollment for the current active school year
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token || !user.id) { setChecking(false); return; }

    Promise.all([
      fetch(`${API}/academic/school-years/active`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API}/enrollments/user/${user.id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []).catch(() => [])
    ]).then(([sy, data]) => {
      const currentActiveYear = sy?.year || null;
      setActiveSchoolYear(currentActiveYear || '');
      const enrollments = Array.isArray(data) ? data : (data.enrollments || []);

      const passedSSC = enrollments.find(enrollment => enrollment.sscApplied && enrollment.sscResult === 'passed' && !enrollment.firstName && ['draft', 'submitted'].includes(enrollment.status) && (!currentActiveYear || enrollment.academicYear === currentActiveYear));
      if (passedSSC) { setPassedSSCApplication(passedSSC); setClassChoice(passedSSC.sscClass || 'SSC'); setChecking(false); return; }

      // Active = ongoing application for the CURRENT active school year
      // (exclude rejected, completed, draft, or enrollments from a previous academic year)
      const active = enrollments.find(e =>
        !['rejected', 'completed', 'draft'].includes(e.status) &&
        (!currentActiveYear || !e.academicYear || e.academicYear === currentActiveYear)
      );
      if (active) { setExistingEnrollment(active); setChecking(false); return; }

      // Completed or past enrollment eligible for advancement / carry-over:
      // Status is 'completed', OR status is 'enrolled' from a previous school year that has ended
      const completed = enrollments
        .filter(e =>
          e.status === 'completed' ||
          (e.status === 'enrolled' && currentActiveYear && e.academicYear && e.academicYear !== currentActiveYear)
        )
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))[0];

      if (completed) {
        setCompletedEnrollment(completed);
        setPastRecord(completed);
      } else {
        const anyPast = enrollments.find(e => e.firstName && !['draft'].includes(e.status)) || enrollments.find(e => e.firstName) || enrollments[0];
        if (anyPast) setPastRecord(anyPast);
      }
    })
      .catch(() => { })
      .finally(() => setChecking(false));
  }, []);

  // If student already has an active enrollment, block and redirect
  if (checking || (!settings && !settingsError)) {
    return (
      <div className="min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-5rem)] flex items-center justify-center bg-[#FFFDF0]">
        <Loader2 className="w-8 h-8 animate-spin text-[#102A71]" />
      </div>
    );
  }

  if (settingsError && !settings) return <div className="p-8 text-center"><p>{settingsError}</p><button onClick={retrySettings} className="mt-3 underline">Try again</button></div>;

  if (passedSSCApplication) {
    const proceed = async () => {
      setSavingClassChoice(true);
      try {
        const response = await fetch(`${API}/enrollments/${passedSSCApplication.id}/ssc-choice`, {
          method: 'PUT', headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ choice: classChoice }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || 'Could not save your class choice');
        navigate('/hs-enrollment-form', { state: { educationLevel: 'JHS', sscEnrollmentId: passedSSCApplication.id } });
      } catch (error) { toast.error(error.message); }
      finally { setSavingClassChoice(false); }
    };
    return <div className="min-h-[70vh] flex items-center justify-center bg-[#FFFDF0] p-4"><section className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-[#001840]">Choose your Grade 7 class</h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">You passed the SSC entrance exam. You may proceed with the Special Science Class or choose the Regular class before completing the five-step enrollment form.</p>
      <div role="group" aria-label="Class selection" className="my-6 grid gap-3 sm:grid-cols-2">{[{ value: 'SSC', title: 'Special Science Class', detail: 'Proceed with the SSC curriculum.' }, { value: 'Regular', title: 'Regular Class', detail: 'Proceed with the regular curriculum.' }].map(option => <button key={option.value} type="button" disabled={savingClassChoice} aria-pressed={classChoice === option.value} onClick={() => setClassChoice(option.value)} className={`rounded-xl border-2 p-4 text-left ${classChoice === option.value ? 'border-[#102A71] bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}><span className="block font-semibold text-[#001840]">{option.title}</span><span className="mt-2 block text-xs text-gray-500">{option.detail}</span></button>)}</div>
      <button onClick={proceed} disabled={savingClassChoice} className="w-full rounded-xl bg-[#102A71] px-4 py-3 font-semibold text-white disabled:opacity-50">{savingClassChoice ? 'Saving choice...' : `Continue with ${classChoice} Class`}</button>
    </section></div>;
  }

  if (existingEnrollment) {
    return (
      <div className="min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-5rem)] bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-[#001840] mb-2">You already have an active enrollment</h2>
          <p className="text-sm text-gray-500 mb-1">
            {existingEnrollment.firstName
              ? `${existingEnrollment.firstName} ${existingEnrollment.familyName} — ${existingEnrollment.educationLevel} ${existingEnrollment.gradeLevel || ''}`
              : `${existingEnrollment.educationLevel} enrollment`}
          </p>
          <p className="text-xs text-gray-400 mb-6 capitalize">
            Status: <span className="font-semibold text-[#102A71]">{existingEnrollment.status === 'submitted' ? 'Pending' : existingEnrollment.status.replace('_', ' ')}</span>
          </p>
          <p className="text-sm text-gray-600 mb-6">
            You cannot start a new enrollment while you have an active application.
            Please wait for your current enrollment to be processed.
          </p>
          <button
            onClick={() => navigate('/my-enrollments')}
            className="w-full py-3 bg-[#102A71] text-white rounded-xl font-semibold hover:bg-[#001840] transition-all"
          >
            View Enrollment
          </button>
        </div>
      </div>
    );
  }

  // ── Carry-over helper: determine next grade level ────────────────────────────
  function getNextLevel(completed) {
    const isSSC = completed.educationLevel === 'JHS' && completed.sscClass === 'SSC';
    const hasSystemGrades = Boolean(completed.gradesComplete && typeof completed.sscEligible === 'boolean');
    const manualGwa = !hasSystemGrades && sscPreviousGwa !== '' && Number.isFinite(Number(sscPreviousGwa)) ? Number(sscPreviousGwa) : null;
    const effectiveGwa = hasSystemGrades ? null : manualGwa;
    const sscDisqualified = Boolean(
      isSSC && (
        (hasSystemGrades && !completed.sscEligible) ||
        (!hasSystemGrades && manualGwa !== null && manualGwa < maintainingAverage)
      )
    );
    const needsGwaInput = Boolean(isSSC && !hasSystemGrades);
    const effectiveSscClass = isSSC ? (sscDisqualified ? 'Regular' : 'SSC') : null;
    if (completed.lifeStatus === 'retained') {
      return {
        educationLevel: completed.educationLevel,
        gradeLevel: completed.gradeLevel,
        strand: completed.strand || null,
        sscClass: effectiveSscClass,
        sscDisqualified,
        previousGwa: effectiveGwa,
        needsGwaInput,
        hasFailedSubject: Boolean(completed.hasFailedSubject),
        isRetained: true
      };
    }
    const gradeNum = parseInt((completed.gradeLevel || '').replace(/\D/g, ''));
    if (isNaN(gradeNum)) return null;
    if (gradeNum < 10) {
      // JHS: Grade 7→8, 8→9, 9→10 (preserve SSC class if enrolled in SSC)
      return {
        educationLevel: 'JHS',
        gradeLevel: `Grade ${gradeNum + 1}`,
        strand: null,
        sscClass: effectiveSscClass,
        sscDisqualified,
        previousGwa: effectiveGwa,
        needsGwaInput,
        hasFailedSubject: Boolean(completed.hasFailedSubject),
      };
    }
    if (gradeNum === 10) {
      // Grade 10 → SHS Grade 11 (needs strand selection)
      return { educationLevel: 'SHS', gradeLevel: 'Grade 11', strand: null, needsStrand: true };
    }
    if (gradeNum === 11) {
      // SHS: Grade 11 → Grade 12, keep same strand
      return { educationLevel: 'SHS', gradeLevel: 'Grade 12', strand: completed.strand || null };
    }
    return null; // Grade 12 completed = no next level in this system
  }

  const handleContinueEnrollment = (strand = null, overrideGrade = null, overrideLevel = null, overrideSscClass = null) => {
    const record = completedEnrollment || pastRecord;
    if (!record) return;
    const next = getNextLevel(record) || {};
    const finalLvl = overrideLevel || next.educationLevel || targetLevel;
    const finalG = overrideGrade || next.gradeLevel || selectedGrade || (finalLvl === 'SHS' ? 'Grade 11' : 'Grade 7');
    const finalS = strand || next.strand || (finalLvl === 'SHS' ? activeStrands[0] || null : null);
    const finalSscClass = overrideSscClass !== null ? overrideSscClass : (finalLvl === 'JHS' ? (next.sscClass || (record.sscClass === 'SSC' ? 'SSC' : null)) : null);
    if (finalSscClass === 'SSC' && next.needsGwaInput) {
      const numGwa = sscPreviousGwa === '' ? NaN : Number(sscPreviousGwa);
      if (!Number.isFinite(numGwa) || numGwa < 0 || numGwa > 100) {
        setSscGwaError('Please enter your previous year General Average (GWA) to verify SSC maintaining grade eligibility.');
        toast.error('Please enter your previous year General Average (GWA) first.');
        return;
      }
      setSscGwaError('');
    }
    proceedContinuingEnrollment(finalLvl, finalG, finalS, finalSscClass, sscPreviousGwa || next.previousGwa);
  };

  function proceedContinuingEnrollment(educationLevel, gradeLevel, strand = null, sscClass = null, previousGeneralAverage = null) {
    const record = completedEnrollment || pastRecord || {};
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const resolvedClass = educationLevel === 'JHS' ? (sscClass || record.sscClass || 'Regular') : null;
    setShowRegularModal(false);
    navigate('/hs-enrollment-form', {
      state: {
        educationLevel, gradeLevel, enrollmentType: 'old', carryOver: true,
        previousEnrollmentId: record.id || null,
        prefill: {
          ...record,
          educationLevel, gradeLevel, strand: educationLevel === 'SHS' ? strand || record.strand || '' : '',
          enrollmentType: 'old', studentType: 'Old', sscClass: resolvedClass, sscApplied: false,
          academicYear: activeSchoolYear || '',
          previousGeneralAverage: previousGeneralAverage ?? record.computedGwa ?? record.previousGeneralAverage ?? '',
          studentNumber: record.studentNumber || '',
          familyName: record.familyName || user.lastName || '', firstName: record.firstName || user.firstName || '', middleName: record.middleName || user.middleName || '',
          fatherMobileNumber: record.fatherMobileNumber || '', motherMobileNumber: record.motherMobileNumber || '',
        },
      },
    });
  }

  const openRegularModal = (lvl, defaultGrade = '') => {
    if (pastRecord?.lifeStatus === 'retained' && (lvl === 'SHS' || (defaultGrade && defaultGrade !== pastRecord.gradeLevel))) {
      toast.error(`You were retained in ${pastRecord.gradeLevel || 'Grade 10'} due to failing grades. You cannot advance to Senior High School and must re-enroll in ${pastRecord.gradeLevel || 'Grade 10'}.`);
      return;
    }
    setTargetLevel(lvl);
    if (lvl === 'JHS') {
      const isPastSsc = pastRecord?.educationLevel === 'JHS' && pastRecord?.sscClass === 'SSC';
      setJhsProgram(isPastSsc && settings?.content?.ssc?.enabled ? 'ssc' : 'regular');
    }
    const initialG = defaultGrade || (lvl === 'SHS' ? 'Grade 11' : (pastRecord?.lifeStatus === 'retained' ? pastRecord.gradeLevel : 'Grade 7'));
    setSelectedGrade(initialG);
    const allowed = allowedEnrollmentTypes(initialG);
    setSelectedType(allowed[0] || 'new');
    setSelectedRegularStrand(pastRecord?.strand || activeStrands[0] || '');
    setSscGwaError('');
    setSscFileError('');
    setShowRegularModal(true);
  };

  const handleSelect = (level) => {
    if (pastRecord?.lifeStatus === 'retained' && level.id === 'SHS') {
      toast.error(`You cannot advance to Senior High School. You were retained in ${pastRecord.gradeLevel || 'Grade 10'} due to failing grades and must repeat ${pastRecord.gradeLevel || 'Grade 10'}.`);
      return;
    }
    setTargetLevel(level.id);
    setSscGwaError('');
    setSscFileError('');

    if (level.id === 'JHS') {
      const isPastSsc = pastRecord?.educationLevel === 'JHS' && pastRecord?.sscClass === 'SSC';
      const initialProg = isPastSsc && settings?.content?.ssc?.enabled ? 'ssc' : 'regular';
      setJhsProgram(initialProg);

      let initialGrade = 'Grade 7';
      if (pastRecord?.lifeStatus === 'retained' && pastRecord?.gradeLevel) {
        initialGrade = pastRecord.gradeLevel;
      } else if (pastRecord?.educationLevel === 'JHS') {
        const nextG = getNextLevel(pastRecord)?.gradeLevel;
        if (nextG && ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'].includes(nextG)) {
          initialGrade = nextG;
        }
      }
      if (initialProg === 'ssc' && initialGrade === 'Grade 7' && pastRecord?.lifeStatus !== 'retained') {
        initialGrade = 'Grade 7';
      }
      setSelectedGrade(initialGrade);

      const allowed = allowedEnrollmentTypes(initialGrade);
      if (initialProg === 'ssc') {
        setSelectedType(initialGrade === 'Grade 7' ? 'new' : 'old');
      } else {
        const preferred = (pastRecord?.educationLevel === 'JHS' && allowed.includes('old')) ? 'old' : (allowed[0] || 'new');
        setSelectedType(preferred);
      }

      // Check SSC application status if applicable
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`${API}/enrollments/ssc-application/status`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()).then(data => {
          if (data.applied) { setSscDone(true); }
        }).catch(() => { });
      }

      setShowRegularModal(true);
    } else {
      openRegularModal('SHS');
    }
  };

  const handleConfirmRegular = async () => {
    if (pastRecord?.lifeStatus === 'retained' && (targetLevel === 'SHS' || selectedGrade !== pastRecord.gradeLevel)) {
      toast.error(`Enrollment blocked: You were retained in ${pastRecord.gradeLevel || 'Grade 10'} due to failing grades and must repeat ${pastRecord.gradeLevel || 'Grade 10'}.`);
      return;
    }

    // JHS Special Science Class (SSC) flow
    if (targetLevel === 'JHS' && jhsProgram === 'ssc') {
      if (selectedGrade === 'Grade 7') {
        // Incoming Grade 7 SSC Admission application
        if (sscDone) {
          setShowRegularModal(false);
          navigate('/hs-enrollment-form', {
            state: {
              educationLevel: 'JHS',
              gradeLevel: 'Grade 7',
              enrollmentType: 'new',
            }
          });
          return;
        }
        await handleSubmitSSC();
        return;
      } else {
        // Continuing SSC (Grade 8-10)
        await proceedContinuingEnrollment('JHS', selectedGrade, null, 'SSC');
        return;
      }
    }

    if (selectedType === 'old') {
      // Continuing students review the first three steps before submission.
      await proceedContinuingEnrollment(
        targetLevel,
        selectedGrade,
        targetLevel === 'SHS' ? (selectedRegularStrand || pastRecord?.strand || activeStrands[0] || null) : null,
        targetLevel === 'JHS' ? 'Regular' : null
      );
      return;
    }

    setShowRegularModal(false);
    navigate('/hs-enrollment-form', {
      state: {
        educationLevel: targetLevel,
        gradeLevel: selectedGrade,
        enrollmentType: selectedType,
      }
    });
  };

  const handleSubmitSSC = async () => {
    if (sscAverage === '' || !Number.isFinite(Number(sscAverage)) || Number(sscAverage) < settings.content.ssc.minimumAverage || Number(sscAverage) > 100) { setSscFileError(`Enter a Grade 6 average of at least ${settings.content.ssc.minimumAverage}.`); return; }
    if (!sscFile) { setSscFileError("Please upload your Grade 6 Report Card."); return; }
    setSscFileError('');
    setSubmittingSSC(true);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('sscCard', sscFile);
      fd.append('grade6Average', sscAverage);
      const res = await fetch(`${API}/enrollments/ssc-application`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        // If already applied, treat it as success — let them continue
        if (res.status === 400 && data.message?.toLowerCase().includes('already')) {
          setSscDone(true);
          return;
        }
        throw new Error(data.message || 'Failed to submit SSC application');
      }
      setSscDone(true);
    } catch (err) {
      setSscFileError(err.message);
    } finally {
      setSubmittingSSC(false);
    }
  };

  return (
    <div className="min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-5rem)] bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0] flex items-start justify-center pt-10 pb-6 px-4">
      {/* Back button */}
      <button
        onClick={() => navigate('/my-enrollments')}
        className="fixed top-20 left-6 flex items-center gap-2 text-[#102A71] hover:text-[#001840] font-medium text-sm transition-colors z-10"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Unified Enrollment Modal */}
      {showRegularModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 max-w-lg w-full relative max-h-[calc(100dvh-2rem)] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center">
                  {targetLevel === 'SHS' ? (
                    <BookOpen className="w-5 h-5 text-[#102A71]" />
                  ) : jhsProgram === 'ssc' ? (
                    <FlaskConical className="w-5 h-5 text-yellow-600" />
                  ) : (
                    <School className="w-5 h-5 text-[#102A71]" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#001840]">
                    {targetLevel === 'SHS' ? 'Senior High School Enrollment' : 'Junior High School Enrollment'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {targetLevel === 'SHS'
                      ? 'Select your grade level and student status'
                      : 'Choose your program, grade level, and status'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRegularModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* JHS ONLY: 1. PROGRAM SELECTION FIRST */}
            {targetLevel === 'JHS' && (
              <div className="mb-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                  1. Select JHS Program Track
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Regular Track Card */}
                  <button
                    type="button"
                    onClick={() => {
                      setJhsProgram('regular');
                      setSscGwaError('');
                      setSscFileError('');
                      const allowed = allowedEnrollmentTypes(selectedGrade || 'Grade 7');
                      if (!allowed.includes(selectedType)) {
                        setSelectedType(allowed[0] || 'new');
                      }
                    }}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all ${jhsProgram === 'regular'
                      ? 'border-[#102A71] bg-[#EEF2FF] shadow-xs'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-[#001840] flex items-center gap-1.5">
                        <School size={16} className="text-[#102A71]" /> Regular Class
                      </span>
                      {jhsProgram === 'regular' && (
                        <CheckCircle2 className="w-4 h-4 text-[#102A71]" />
                      )}
                    </div>

                  </button>

                  {/* SSC Track Card */}
                  {settings?.content?.ssc?.enabled && (
                    <button
                      type="button"
                      onClick={() => {
                        setJhsProgram('ssc');
                        setSscGwaError('');
                        setSscFileError('');
                        if (selectedGrade === 'Grade 7') {
                          setSelectedType('new');
                        } else {
                          setSelectedType('old');
                        }
                      }}
                      className={`p-3.5 rounded-xl border-2 text-left transition-all ${jhsProgram === 'ssc'
                        ? 'border-[#F5C400] bg-[#FFFDF0] shadow-xs'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-[#001840] flex items-center gap-1.5">
                          <FlaskConical size={16} className="text-yellow-600" /> Special Science (SSC)
                        </span>
                        {jhsProgram === 'ssc' && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#F5C400]" />
                        )}
                      </div>

                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 2. GRADE LEVEL & APPLICANT TYPE DROPDOWNS */}
            <div className="mb-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                {targetLevel === 'JHS' ? '2. Select Grade & Applicant Status' : '1. Select Grade & Applicant Status'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Grade Level Dropdown */}
                <div>
                  <label htmlFor="grade-select" className="block text-xs font-semibold text-[#001840] mb-1.5">
                    Grade Level *
                  </label>
                  <select
                    id="grade-select"
                    value={selectedGrade}
                    onChange={(e) => {
                      const newG = e.target.value;
                      setSelectedGrade(newG);
                      setSscGwaError('');
                      setSscFileError('');
                      if (targetLevel === 'JHS' && jhsProgram === 'ssc') {
                        setSelectedType(newG === 'Grade 7' ? 'new' : 'old');
                      } else {
                        const allowed = allowedEnrollmentTypes(newG);
                        if (!allowed.includes(selectedType)) {
                          setSelectedType(allowed[0] || 'new');
                        }
                      }
                    }}
                    className="w-full h-11 px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-[#001840] focus:outline-none focus:border-[#102A71] transition-all cursor-pointer"
                  >
                    {(targetLevel === 'SHS'
                      ? ['Grade 11', 'Grade 12']
                      : ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10']
                    ).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Applicant Type Dropdown */}
                <div>
                  <label htmlFor="type-select" className="block text-xs font-semibold text-[#001840] mb-1.5">
                    Applicant Status *
                  </label>
                  {targetLevel === 'JHS' && jhsProgram === 'ssc' ? (
                    <div className="h-11 px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-xs font-semibold text-[#001840] flex items-center justify-between">
                      <span>{selectedGrade === 'Grade 7' ? 'Grade 7 SSC Applicant' : 'Continuing SSC Student'}</span>
                      <span className="text-[10px] text-yellow-700 font-bold bg-yellow-100 px-2 py-0.5 rounded">SSC</span>
                    </div>
                  ) : (
                    <select
                      id="type-select"
                      value={selectedType}
                      onChange={(e) => {
                        setSelectedType(e.target.value);
                      }}
                      className="w-full h-11 px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-[#001840] focus:outline-none focus:border-[#102A71] transition-all cursor-pointer"
                    >
                      {allowedEnrollmentTypes(selectedGrade || (targetLevel === 'SHS' ? 'Grade 11' : 'Grade 7')).map((typeKey) => (
                        <option key={typeKey} value={typeKey}>
                          {typeKey === 'old' ? 'Continuing Student' : ENROLLMENT_TYPE_LABELS[typeKey] || typeKey}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* 3. CONDITIONAL REQUIREMENTS & VERIFICATIONS */}
            {/* Case A: JHS SSC Grade 7 Application */}
            {targetLevel === 'JHS' && jhsProgram === 'ssc' && selectedGrade === 'Grade 7' && (
              <div className="mb-5 space-y-3.5">
                <div className="bg-yellow-50/90 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800 leading-relaxed">
                  Incoming Grade 7 students with a Grade 6 General Average of <strong>{settings?.content?.ssc?.minimumAverage ?? 85} or higher</strong> may apply for the Special Science Class. The registrar will review your report card and schedule an entrance examination.
                </div>

                {sscDone ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="font-bold text-sm text-green-900">SSC Report Card Already Submitted</p>
                    <p className="text-xs text-green-700 mt-1">
                      Your Grade 6 Report Card is on file. Click below to continue filling out your Grade 7 enrollment form.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label htmlFor="ssc-grade6-avg" className="block text-xs font-semibold text-[#001840] mb-1.5">
                        Grade 6 General Average (Minimum {settings?.content?.ssc?.minimumAverage ?? 85}) *
                      </label>
                      <input
                        id="ssc-grade6-avg"
                        aria-label="Grade 6 general average"
                        type="number"
                        min={settings?.content?.ssc?.minimumAverage ?? 85}
                        max={100}
                        step="0.01"
                        placeholder="e.g. 88.5"
                        value={sscAverage}
                        onChange={(e) => {
                          setSscAverage(e.target.value);
                          setSscFileError('');
                        }}
                        className="w-full h-11 rounded-xl border-2 border-gray-200 bg-white px-3 text-sm focus:outline-none focus:border-[#102A71]"
                      />
                    </div>

                    <UploadBox
                      label="Grade 6 Report Card *"
                      file={sscFile}
                      onFile={(file) => {
                        setSscFile(file);
                        setSscFileError('');
                      }}
                      error={sscFileError}
                    />
                  </>
                )}
              </div>
            )}

            {/* Case C: Continuing Regular Student (JHS Regular Old or SHS Old) */}
            {((targetLevel === 'JHS' && jhsProgram === 'regular' && selectedType === 'old') ||
              (targetLevel === 'SHS' && selectedType === 'old')) && (
                <div className="mb-5 space-y-3.5">
                  {targetLevel === 'SHS' && activeStrands.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                        Select SHS Strand for {selectedGrade} *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {activeStrands.map((s) => {
                          const isStrandSelected = (selectedRegularStrand || pastRecord?.strand || activeStrands[0]) === s;
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setSelectedRegularStrand(s)}
                              className={`p-2.5 rounded-xl border-2 text-left font-semibold text-xs transition-all flex items-center justify-between ${isStrandSelected
                                ? 'border-[#102A71] bg-[#EEF2FF] text-[#102A71]'
                                : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                              <span>{s}</span>
                              {isStrandSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#102A71]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}


                </div>
              )}

            {/* Actions */}
            <div className="flex gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowRegularModal(false)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRegular}
                disabled={!selectedGrade || !selectedType || submittingSSC}
                className="flex-1 py-2.5 bg-[#102A71] text-white rounded-xl text-sm font-semibold hover:bg-[#001840] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {submittingSSC ? (
                  <><Loader2 size={15} className="animate-spin" /> Submitting...</>
                ) : targetLevel === 'JHS' && jhsProgram === 'ssc' && selectedGrade === 'Grade 7' ? (
                  sscDone ? <>Proceed to Form <ArrowRight size={15} /></> : <><Upload size={15} /> Apply for SSC</>
                ) : selectedType === 'old' ? (
                  <>Proceed to Form <ArrowRight size={15} /></>
                ) : (
                  <>Proceed to Form <ArrowRight size={15} /></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/emc_logo_nobg.png" alt="EMC Logo" className="w-16 h-16 mx-auto mb-3" />
          <h1 className="text-2xl sm:text-3xl font-bold text-[#001840] mb-2">Student Enrollment</h1>
          <p className="text-gray-600 text-lg">
            {completedEnrollment ? 'Welcome back! Continue to the next grade level.' : 'Select your education level to get started'}
          </p>
        </div>

        {/* ── Carry-over: returning student ── */}
        {completedEnrollment && (() => {
          const next = getNextLevel(completedEnrollment);
          if (!next) {
            return (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-8 text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-[#001840] mb-2">Congratulations!</h2>
                <p className="text-gray-500 text-sm">You have completed Grade 12. Please contact the registrar for further guidance.</p>
              </div>
            );
          }

          if (next.needsStrand && showStrandPicker) {
            const strands = activeStrands;
            return (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-8 mb-6">
                <h2 className="text-xl font-bold text-[#001840] mb-2">Select Your SHS Strand</h2>
                <p className="text-sm text-gray-500 mb-5">
                  You are moving from <span className="font-semibold">Grade 10 JHS</span> to <span className="font-semibold">Grade 11 SHS</span>. Please select your strand.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {strands.map(s => (
                    <button key={s} onClick={() => {
                      setShowStrandPicker(false);
                      handleContinueEnrollment(s);
                    }}
                      className="px-4 py-3 rounded-xl border-2 border-[#102A71] text-[#001840] font-semibold text-sm hover:bg-[#EEF2FF] hover:border-[#F5C400] transition-all">
                      {s}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowStrandPicker(false)}
                  className="mt-4 text-xs text-gray-400 hover:text-gray-600 w-full text-center">
                  ← Back
                </button>
              </div>
            );
          }

          return (
            <div className="bg-white rounded-2xl border border-[#F5C400] shadow-md p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 ${next.isRetained ? 'bg-amber-100 text-amber-800' : 'bg-[#F5C400] text-[#001840]'} rounded-xl flex items-center justify-center shrink-0`}>
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-[#001840]">
                    {next.isRetained ? 'Re-enroll for Same Grade Level' : 'Continue to Next Level'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {next.isRetained
                      ? 'Student was retained. Your info from last year will be carried over.'
                      : 'Continuing student — your info from last year will be carried over'}
                  </p>
                </div>
              </div>

              <div className="bg-[#FFFDF0] border border-[#F5C400]/40 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-center text-sm">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Previous</p>
                    <p className="font-semibold text-gray-700">
                      {completedEnrollment.educationLevel} — {completedEnrollment.gradeLevel}
                      {completedEnrollment.strand ? ` (${completedEnrollment.strand})` : completedEnrollment.sscClass === 'SSC' ? ' (SSC)' : ''}
                    </p>
                  </div>
                  <div className="text-gray-400 text-lg">→</div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-0.5">{next.isRetained ? 'Re-enrolling In' : 'Next'}</p>
                    <p className="font-bold text-[#001840]">
                      {next.educationLevel} — {next.gradeLevel}
                      {next.strand ? ` (${next.strand})` : next.sscDisqualified ? ' (Regular Class)' : next.sscClass === 'SSC' ? ' (SSC)' : next.needsStrand ? ' (select strand)' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {completedEnrollment.educationLevel === 'JHS' && completedEnrollment.sscClass === 'SSC' && next.educationLevel === 'JHS' && (
                <div className="mb-4">
                  {next.needsGwaInput ? (
                    <div className="space-y-2.5">
                      <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50">
                        <label className="block text-xs font-bold text-[#001840] mb-1">
                          Previous Grade Level General Average (GWA) * <span className="text-gray-500 font-normal">(SSC Maintaining Grade: {maintainingAverage})</span>
                        </label>
                        <input
                          aria-label="Previous Grade Level General Average"
                          type="number"
                          min={60}
                          max={100}
                          step="0.01"
                          placeholder={`Enter your previous GWA (minimum ${maintainingAverage} for SSC)`}
                          value={sscPreviousGwa}
                          onChange={(e) => {
                            setSscPreviousGwa(e.target.value);
                            setSscGwaError('');
                          }}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#102A71]"
                        />
                        {sscGwaError && <p className="text-xs text-red-600 font-medium mt-1.5">{sscGwaError}</p>}
                      </div>
                      {next.previousGwa !== null && (
                        next.sscDisqualified ? (
                          <div className="p-3.5 rounded-xl border-2 border-amber-300 bg-amber-50 flex items-start gap-2.5 text-xs text-amber-900">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">SSC Maintaining Grade Not Met — Eligible for Regular Class Only</p>
                              <p className="mt-0.5 leading-relaxed">
                                Your previous General Average (<strong>{next.previousGwa}</strong>) is below the required SSC maintaining grade of <strong>{maintainingAverage}</strong>. Your next enrollment for {next.gradeLevel} has been switched to the <strong>Regular Class</strong>.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl border-2 border-green-300 bg-green-50 flex items-center gap-2 text-xs text-green-800 font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                            <span>SSC Maintaining Grade Met (GWA: {next.previousGwa} ≥ {maintainingAverage}) — Eligible to continue in SSC</span>
                          </div>
                        )
                      )}
                    </div>
                  ) : next.sscDisqualified ? (
                    <div className="p-3.5 rounded-xl border-2 border-amber-300 bg-amber-50 flex items-start gap-2.5 text-xs text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">SSC Maintaining Grade Not Met — Eligible for Regular Class Only</p>
                        <p className="mt-0.5 leading-relaxed">
                          {next.hasFailedSubject
                            ? `Your academic record does not meet SSC eligibility. Contact the registrar.`
                            : `Your academic record does not meet SSC eligibility. Contact the registrar.`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border-2 border-green-300 bg-green-50 flex items-center gap-2 text-xs text-green-800 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      <span>SSC Maintaining Grade Met (Previous GWA: {next.previousGwa} ≥ {maintainingAverage}) — Eligible to continue in SSC</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => next.needsStrand ? setShowStrandPicker(true) : handleContinueEnrollment()}
                  className="flex-1 py-3 bg-[#102A71] text-white rounded-xl font-bold hover:bg-[#001840] transition-all flex items-center justify-center gap-2 shadow-sm">
                  <CheckCircle2 size={16} />
                  {next.needsStrand
                    ? 'Select Strand & Continue →'
                    : next.isRetained
                      ? `Continue Enrollment for ${next.gradeLevel}${next.sscDisqualified ? ' (Regular Class)' : next.sscClass === 'SSC' ? ' (SSC)' : ''}`
                      : `Continue Enrollment for ${next.gradeLevel}${next.sscDisqualified ? ' (Regular Class)' : next.sscClass === 'SSC' ? ' (SSC)' : ''}`}
                </button>

              </div>

              <p className="text-center text-xs text-gray-400 mt-3">
                Enrolling as a <span className="font-semibold">continuing student{next.isRetained ? ' (retained)' : ''}</span> — review Grade & Type, Personal Info, and Family before submitting.
              </p>

              <div className="text-center mt-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCompletedEnrollment(null)}
                  className="text-xs text-gray-400 hover:text-[#102A71] underline transition-colors"
                >
                  Need to choose a different grade level or program? Click here to select manually
                </button>
              </div>
            </div>
          );
        })()}

        {/* ── Level Cards (new students or no completed enrollment) ── */}
        {!completedEnrollment && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl mx-auto">
              {levels.map((level) => {
                const Icon = level.icon;
                return (
                  <div key={level.id} onClick={() => handleSelect(level)}
                    className="relative flex flex-col h-full rounded-2xl border-2 p-8 transition-all duration-200 select-none border-[#102A71] bg-white text-[#001840] hover:bg-[#FFFDF0] hover:border-[#F5C400] hover:shadow-xl cursor-pointer">
                    <div className="flex flex-1 flex-col items-center text-center gap-4">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[#EEF2FF]">
                        <Icon className="w-8 h-8 text-[#102A71]" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold mb-1">{level.label}</h2>
                        {level.id === 'SHS' ? (
                          <>
                            <p className="text-sm text-gray-500">Grade 11 – Grade 12</p>
                            <p className="text-xs text-gray-400 mt-1">{activeStrands.length ? activeStrands.join(' · ') : 'No strands currently accepting applications'}</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">{level.subtitle}</p>
                        )}
                      </div>
                      <span className="mt-auto px-4 py-1.5 bg-[#102A71] text-white text-sm font-semibold rounded-lg">
                        Enroll Now
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SSC info note */}
            {settings.content.ssc.enabled && <div className="mt-6 flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <FlaskConical className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-800">Applying for Grade 7 Special Science Class?</p>
                <p className="text-xs text-yellow-700 mt-0.5">Select Junior High School — you'll be asked to upload your Grade 6 Report Card before proceeding to the enrollment form. The registrar will schedule your SSC entrance exam.</p>
              </div>
            </div>}
          </>
        )}

        <p className="text-center text-sm text-gray-400 mt-6">
          {completedEnrollment ? 'Continue your academic journey at Eastern Mindoro College.' : 'Select your education level to begin the enrollment process.'}
        </p>
      </div>
    </div>
  );
}
