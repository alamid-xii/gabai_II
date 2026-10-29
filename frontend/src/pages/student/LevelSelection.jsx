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
  const [sscAverage, setSscAverage] = useState('');
  const [sscPreviousGwa, setSscPreviousGwa] = useState('');
  const [sscGwaError, setSscGwaError] = useState('');
  const [continuingStudentId, setContinuingStudentId] = useState('');
  const [continuingStudentIdError, setContinuingStudentIdError] = useState('');
  const [selectedRegularStrand, setSelectedRegularStrand] = useState('');
  const [selected, setSelected] = useState(null); // 'JHS' | 'SHS'
  const [showSSCModal, setShowSSCModal] = useState(false);
  const [sscMode, setSscMode] = useState('new'); // 'new' | 'continuing'
  const [sscContinuingGrade, setSscContinuingGrade] = useState('Grade 8');
  const [sscFile, setSscFile] = useState(null);
  const [sscFileError, setSscFileError] = useState('');
  const [submittingSSC, setSubmittingSSC] = useState(false);
  const [sscDone, setSscDone] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingEnrollment, setExistingEnrollment] = useState(null);
  const [completedEnrollment, setCompletedEnrollment] = useState(null); // for carry-over
  const [pastRecord, setPastRecord] = useState(null); // preserves past enrollment data even if manual grade selected
  const [showStrandPicker, setShowStrandPicker] = useState(false); // Grade 10 → SHS
  const [showRegularModal, setShowRegularModal] = useState(false); // Modal after skip SSC or SHS select
  const [targetLevel, setTargetLevel] = useState('JHS'); // 'JHS' | 'SHS'
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [submittingDirect, setSubmittingDirect] = useState(false);
  const [showDirectConfirm, setShowDirectConfirm] = useState(false);
  const [directTarget, setDirectTarget] = useState(null);

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
      const enrollments = Array.isArray(data) ? data : (data.enrollments || []);

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
    const hasSystemGrades = Boolean(completed.gradesComplete && completed.computedGwa !== null && completed.computedGwa !== undefined);
    const manualGwa = !hasSystemGrades && sscPreviousGwa !== '' && Number.isFinite(Number(sscPreviousGwa)) ? Number(sscPreviousGwa) : null;
    const effectiveGwa = hasSystemGrades ? Number(completed.computedGwa) : manualGwa;
    const sscDisqualified = Boolean(
      isSSC && (
        (hasSystemGrades && (Number(completed.computedGwa) < maintainingAverage || completed.hasFailedSubject)) ||
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

  function handleCarryOver(strand = null) {
    if (!completedEnrollment) return;
    const next = getNextLevel(completedEnrollment);
    if (!next) return;
    const finalStrand = strand || next.strand;
    navigate('/hs-enrollment-form', {
      state: {
        educationLevel: next.educationLevel,
        carryOver: true,
        previousEnrollmentId: completedEnrollment.id,
        prefill: {
          educationLevel: next.educationLevel,
          gradeLevel: next.gradeLevel,
          strand: finalStrand,
          sscClass: next.sscClass || null,
          enrollmentType: 'old',
          studentNumber: completedEnrollment.studentNumber || '',
          // Personal info
          familyName: completedEnrollment.familyName,
          firstName: completedEnrollment.firstName,
          middleName: completedEnrollment.middleName,
          sex: completedEnrollment.sex,
          dateOfBirth: completedEnrollment.dateOfBirth,
          placeOfBirth: completedEnrollment.placeOfBirth,
          email: completedEnrollment.email,
          mobileNumber: completedEnrollment.mobileNumber,
          lrn: completedEnrollment.lrn,
          // Family
          fatherName: completedEnrollment.fatherName,
          fatherOccupation: completedEnrollment.fatherOccupation,
          fatherAddress: completedEnrollment.fatherAddress,
          motherName: completedEnrollment.motherName,
          motherOccupation: completedEnrollment.motherOccupation,
          motherAddress: completedEnrollment.motherAddress,
          guardianName: completedEnrollment.guardianName,
          guardianOccupation: completedEnrollment.guardianOccupation,
          guardianAddress: completedEnrollment.guardianAddress,
          guardianTelephone: completedEnrollment.guardianTelephone,
          parentsAddress: completedEnrollment.parentsAddress,
          // Education background
          grade6School: completedEnrollment.grade6School,
          grade6Average: completedEnrollment.grade6Average,
          grade6SchoolAddress: completedEnrollment.grade6SchoolAddress,
          grade6Section: completedEnrollment.grade6Section,
          grade6SYStart: completedEnrollment.grade6SYStart,
          grade6SYEnd: completedEnrollment.grade6SYEnd,
          lastHSSchool: completedEnrollment.lastHSSchool,
          lastHSSection: completedEnrollment.lastHSSection,
          lastHSSYStart: completedEnrollment.lastHSSYStart,
          lastHSSYEnd: completedEnrollment.lastHSSYEnd,
        }
      }
    });
  }

  const handleOpenDirectConfirm = (strand = null, overrideGrade = null, overrideLevel = null, overrideSscClass = null) => {
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
    setDirectTarget({
      record,
      educationLevel: finalLvl,
      gradeLevel: finalG,
      strand: finalS,
      sscClass: finalSscClass,
    });
    setShowDirectConfirm(true);
  };

  const validateContinuingStudentId = (inputVal, recordOnFile = null) => {
    const trimmed = String(inputVal || '').trim().toUpperCase();
    const pattern = /^([A-Z]{1,3}-\d{3,6}|\d{4}-\d{4,6})$/i;
    if (!trimmed) {
      return { valid: false, error: 'Please enter your EMC Student ID (e.g., A-9869 or 2025-00123) to confirm your identity.' };
    }
    if (!pattern.test(trimmed)) {
      return { valid: false, error: 'Invalid Student ID format. Use your EMC ID (e.g., A-9869) or Portal ID (e.g., 2025-00123).' };
    }
    const existingId = recordOnFile?.studentNumber ? String(recordOnFile.studentNumber).trim().toUpperCase() : '';
    if (existingId && existingId !== trimmed) {
      return { valid: false, error: `The Student ID you entered (${trimmed}) does not match your Student ID on file. Please enter your registered EMC Student ID.` };
    }
    return { valid: true, value: trimmed };
  };

  const submitDirectContinuingEnrollment = async (educationLevel, gradeLevel, strand = null, sscClass = null, previousGeneralAverage = null) => {
    const recordForValidation = completedEnrollment || pastRecord || {};
    const idCheck = validateContinuingStudentId(continuingStudentId, recordForValidation);
    if (!idCheck.valid) {
      setContinuingStudentIdError(idCheck.error);
      toast.error(idCheck.error);
      return;
    }
    setContinuingStudentIdError('');
    setSubmittingDirect(true);
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const record = completedEnrollment || pastRecord || {};

      const cleanedNameParts = (user.name || '').replace(/\d+/g, '').trim().split(/\s+/).filter(Boolean);
      const finalFirstName = record.firstName || user.firstName || cleanedNameParts[0] || 'Student';
      const finalFamilyName = record.familyName || user.lastName || user.familyName || cleanedNameParts.slice(1).join(' ') || cleanedNameParts[0] || 'Student';
      const resolvedSscClass = educationLevel === 'JHS' ? (sscClass || (record.sscClass === 'SSC' ? 'SSC' : null)) : null;

      const payload = {
        educationLevel,
        gradeLevel,
        strand: educationLevel === 'SHS' ? (strand || record.strand || null) : null,
        ...(resolvedSscClass === 'SSC' ? { sscClass: 'SSC' } : resolvedSscClass === 'Regular' ? { sscClass: 'Regular' } : {}),
        ...(previousGeneralAverage !== null && previousGeneralAverage !== '' && Number.isFinite(Number(previousGeneralAverage))
          ? { previousGeneralAverage: Number(previousGeneralAverage) }
          : sscPreviousGwa !== '' && Number.isFinite(Number(sscPreviousGwa))
            ? { previousGeneralAverage: Number(sscPreviousGwa) }
            : {}),
        enrollmentType: 'old',
        studentType: 'Old',
        studentNumber: idCheck.value,
        lrn: record.lrn || user.lrn || null,
        familyName: finalFamilyName,
        firstName: finalFirstName,
        middleName: record.middleName || user.middleName || '',
        sex: record.sex || user.sex || 'Male',
        dateOfBirth: record.dateOfBirth || user.dateOfBirth || '2010-01-01',
        placeOfBirth: record.placeOfBirth || '',
        email: record.email || user.email || '',
        mobileNumber: record.mobileNumber || user.mobileNumber || '',
        fatherName: record.fatherName || '',
        fatherOccupation: record.fatherOccupation || '',
        fatherAddress: record.fatherAddress || '',
        motherName: record.motherName || '',
        motherOccupation: record.motherOccupation || '',
        motherAddress: record.motherAddress || '',
        guardianName: record.guardianName || '',
        guardianOccupation: record.guardianOccupation || '',
        guardianAddress: record.guardianAddress || '',
        guardianTelephone: record.guardianTelephone || '',
        parentsAddress: record.parentsAddress || '',
        grade6School: record.grade6School || '',
        grade6Average: record.grade6Average || '',
        grade6SchoolAddress: record.grade6SchoolAddress || '',
        grade6Section: record.grade6Section || '',
        grade6SYStart: record.grade6SYStart || '',
        grade6SYEnd: record.grade6SYEnd || '',
        lastHSSchool: record.lastHSSchool || '',
        lastHSSection: record.lastHSSection || '',
        lastHSSYStart: record.lastHSSYStart || '',
        lastHSSYEnd: record.lastHSSYEnd || '',
        previousEnrollmentId: record.id || null,
        status: 'draft',
      };

      const res = await fetch(`${API}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        const detailedError = Array.isArray(data.errors) && data.errors.length > 0 ? data.errors[0].message : data.message;
        if (data.errors?.some(e => e.field === 'studentNumber') || /student id/i.test(detailedError || '')) {
          setContinuingStudentIdError(detailedError);
        }
        throw new Error(detailedError || 'Failed to initialize enrollment');
      }
      const eid = data.enrollment?.id;
      if (!eid) throw new Error('No enrollment ID received from server');

      const submitRes = await fetch(`${API}/enrollments/${eid}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData.message || 'Failed to submit enrollment');

      toast.success(
        resolvedSscClass === 'SSC'
          ? 'Continuing SSC enrollment submitted! Waiting for registrar approval.'
          : 'Continuing enrollment submitted! Waiting for registrar approval.'
      );
      setShowSSCModal(false);
      setShowRegularModal(false);
      setShowDirectConfirm(false);
      navigate('/my-enrollments');
    } catch (err) {
      toast.error(err.message || 'Failed to directly submit enrollment');
    } finally {
      setSubmittingDirect(false);
    }
  };

  const executeDirectSubmit = async () => {
    const target = directTarget || {
      educationLevel: targetLevel,
      gradeLevel: selectedGrade,
      strand: targetLevel === 'SHS' ? activeStrands[0] || null : null,
      sscClass: null,
    };
    await submitDirectContinuingEnrollment(target.educationLevel, target.gradeLevel, target.strand, target.sscClass);
  };

  const handleConfirmContinuingSSC = async () => {
    if (pastRecord?.lifeStatus === 'retained' && pastRecord?.gradeLevel && sscContinuingGrade !== pastRecord.gradeLevel) {
      toast.error(`Enrollment blocked: You were retained in ${pastRecord.gradeLevel} due to failing grades and must repeat ${pastRecord.gradeLevel}.`);
      return;
    }
    const hasSystemGrades = Boolean(
      pastRecord?.educationLevel === 'JHS' &&
      pastRecord?.gradesComplete &&
      pastRecord?.computedGwa !== null &&
      pastRecord?.computedGwa !== undefined
    );
    if (hasSystemGrades) {
      if (Number(pastRecord.computedGwa) < maintainingAverage || pastRecord.hasFailedSubject) {
        toast.error(`Your previous General Average (${pastRecord.computedGwa}) did not meet the SSC maintaining grade of ${maintainingAverage}. You are only eligible for the Regular Class.`);
        return;
      }
      await submitDirectContinuingEnrollment('JHS', sscContinuingGrade, null, 'SSC');
      return;
    }
    const numGwa = sscPreviousGwa === '' ? NaN : Number(sscPreviousGwa);
    if (!Number.isFinite(numGwa) || numGwa < 0 || numGwa > 100) {
      setSscGwaError('Please enter your previous year General Average (between 60 and 100).');
      return;
    }
    if (numGwa < maintainingAverage) {
      setSscGwaError(`Your General Average (${numGwa}) is below the SSC maintaining grade of ${maintainingAverage}. You are only eligible for the Regular Class.`);
      return;
    }
    setSscGwaError('');
    await submitDirectContinuingEnrollment('JHS', sscContinuingGrade, null, 'SSC', numGwa);
  };

  const openRegularModal = (lvl, defaultGrade = '') => {
    if (pastRecord?.lifeStatus === 'retained' && (lvl === 'SHS' || (defaultGrade && defaultGrade !== pastRecord.gradeLevel))) {
      toast.error(`You were retained in ${pastRecord.gradeLevel || 'Grade 10'} due to failing grades. You cannot advance to Senior High School and must re-enroll in ${pastRecord.gradeLevel || 'Grade 10'}.`);
      return;
    }
    setTargetLevel(lvl);
    const initialG = defaultGrade || (lvl === 'SHS' ? 'Grade 11' : (pastRecord?.lifeStatus === 'retained' ? pastRecord.gradeLevel : 'Grade 7'));
    setSelectedGrade(initialG);
    const allowed = allowedEnrollmentTypes(initialG);
    setSelectedType(allowed[0] || 'new');
    setSelectedRegularStrand(pastRecord?.strand || activeStrands[0] || '');
    setContinuingStudentIdError('');
    setShowRegularModal(true);
  };

  const handleSelect = (level) => {
    if (pastRecord?.lifeStatus === 'retained' && level.id === 'SHS') {
      toast.error(`You cannot advance to Senior High School. You were retained in ${pastRecord.gradeLevel || 'Grade 10'} due to failing grades and must repeat ${pastRecord.gradeLevel || 'Grade 10'}.`);
      return;
    }
    if (level.id === 'JHS' && settings.content.ssc.enabled) {
      setSelected('JHS');
      // Pre-select SSC mode and continuing grade if student has a past JHS/SSC record
      if (pastRecord?.educationLevel === 'JHS') {
        const nextG = getNextLevel(pastRecord)?.gradeLevel;
        if (pastRecord.lifeStatus === 'retained' && pastRecord.gradeLevel) {
          setSscContinuingGrade(pastRecord.gradeLevel);
        } else if (nextG && ['Grade 8', 'Grade 9', 'Grade 10'].includes(nextG)) {
          setSscContinuingGrade(nextG);
        } else {
          setSscContinuingGrade('Grade 8');
        }
        if (pastRecord.sscClass === 'SSC') {
          setSscMode('continuing');
        } else {
          setSscMode('new');
        }
      } else {
        setSscMode('new');
        setSscContinuingGrade('Grade 8');
      }
      // Check if student already has an SSC application
      const token = localStorage.getItem('token');
      fetch(`${API}/enrollments/ssc-application/status`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).then(data => {
        if (data.applied) { setSscDone(true); }
      }).catch(() => { });
      setShowSSCModal(true);
    } else {
      openRegularModal(level.id);
    }
  };

  const handleSkipSSC = () => {
    setShowSSCModal(false);
    openRegularModal('JHS', 'Grade 7');
  };

  const handleConfirmRegular = async () => {
    if (pastRecord?.lifeStatus === 'retained' && (targetLevel === 'SHS' || selectedGrade !== pastRecord.gradeLevel)) {
      toast.error(`Enrollment blocked: You were retained in ${pastRecord.gradeLevel || 'Grade 10'} due to failing grades and must repeat ${pastRecord.gradeLevel || 'Grade 10'}.`);
      return;
    }
    if (selectedType === 'old') {
      // Continuing students submit directly! DO NOT navigate to the 5-step form
      await submitDirectContinuingEnrollment(
        targetLevel,
        selectedGrade,
        targetLevel === 'SHS' ? (selectedRegularStrand || pastRecord?.strand || activeStrands[0] || null) : null
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

      {/* SSC Modal */}
      {showSSCModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 max-w-lg w-full relative max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <FlaskConical className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#001840]">Special Science Class (SSC)</h3>
                  <p className="text-xs text-gray-500">
                    {sscMode === 'continuing' ? 'Direct Enrollment for Continuing SSC Students' : 'Grade 7 SSC Admission & Continuing SSC'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowSSCModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            {/* Side-by-Side SSC Admission vs Continuing SSC Toggle */}
            <div className="grid grid-cols-2 gap-2.5 p-1 bg-gray-100 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setSscMode('new')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${sscMode === 'new'
                  ? 'bg-white text-[#001840] shadow-xs border border-yellow-300'
                  : 'text-gray-600 hover:text-[#001840]'
                  }`}
              >
                <FlaskConical size={13} className={sscMode === 'new' ? 'text-yellow-600' : 'text-gray-400'} />
                <span>Grade 7 SSC Admission</span>
              </button>
              <button
                type="button"
                onClick={() => setSscMode('continuing')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${sscMode === 'continuing'
                  ? 'bg-[#102A71] text-white shadow-xs'
                  : 'text-gray-600 hover:text-[#001840]'
                  }`}
              >
                <UserCheck size={13} className={sscMode === 'continuing' ? 'text-[#F5C400]' : 'text-gray-400'} />
                <span>Continuing SSC (Direct)</span>
              </button>
            </div>

            {sscMode === 'continuing' ? (
              <>
                <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 mb-4">
                  <p className="text-xs text-[#001840] leading-relaxed">
                    <strong>Continuing Special Science Class (SSC)</strong> students can submit their enrollment <strong>directly</strong> without filling out the 5-step form. Maintaining General Average required: <strong>{maintainingAverage}</strong>.
                  </p>
                </div>

                {/* Step 1: Select SSC Grade Level */}
                <div className="mb-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                    Select SSC Grade Level
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(pastRecord?.lifeStatus === 'retained' && pastRecord?.gradeLevel === 'Grade 7'
                      ? ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10']
                      : ['Grade 8', 'Grade 9', 'Grade 10']
                    ).map((g) => {
                      const isSelected = sscContinuingGrade === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setSscContinuingGrade(g)}
                          className={`p-3 rounded-xl border-2 text-left font-semibold text-sm transition-all ${isSelected
                            ? 'border-[#102A71] bg-[#EEF2FF] text-[#102A71] shadow-xs'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{g}</span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-[#102A71]" />}
                          </div>
                          <p className="text-[10px] font-medium text-yellow-700 mt-0.5">SSC Section</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Applicant Status (Locked to Continuing SSC) */}
                <div className="mb-5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                    Applicant Type for {sscContinuingGrade} (SSC)
                  </label>
                  <div className="p-3 rounded-xl border-2 border-[#F5C400] bg-[#FFFDF0] text-[#001840]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">Continuing — Special Science Class (SSC)</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#102A71]" />
                    </div>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      Previously enrolled in SSC at EMC • Direct submission without 5-step form
                    </p>
                  </div>
                </div>

                {/* Step 3: SSC Maintaining Grade Eligibility Check */}
                {(() => {
                  const hasSystemGrades = Boolean(
                    pastRecord?.educationLevel === 'JHS' &&
                    pastRecord?.gradesComplete &&
                    pastRecord?.computedGwa !== null &&
                    pastRecord?.computedGwa !== undefined
                  );
                  const systemGwa = hasSystemGrades ? Number(pastRecord.computedGwa) : null;
                  const manualGwa = sscPreviousGwa !== '' && Number.isFinite(Number(sscPreviousGwa)) ? Number(sscPreviousGwa) : null;
                  const isBelowMaintaining = hasSystemGrades
                    ? (systemGwa < maintainingAverage || Boolean(pastRecord?.hasFailedSubject))
                    : (manualGwa !== null && manualGwa < maintainingAverage);
                  const isEligible = hasSystemGrades
                    ? !isBelowMaintaining
                    : (manualGwa !== null && manualGwa >= maintainingAverage && manualGwa <= 100);

                  return (
                    <>
                      <div className="mb-4">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                          SSC Maintaining Grade Eligibility (Required GWA: {maintainingAverage})
                        </label>
                        {hasSystemGrades ? (
                          <div className={`p-3.5 rounded-xl border-2 ${isBelowMaintaining ? 'border-amber-300 bg-amber-50' : 'border-green-300 bg-green-50'}`}>
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="text-gray-600 font-medium">Your Previous GWA ({pastRecord.gradeLevel}):</span>
                              <span className={`font-bold text-sm ${isBelowMaintaining ? 'text-amber-800' : 'text-green-800'}`}>{systemGwa}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs mb-2">
                              <span className="text-gray-600 font-medium">SSC Maintaining Grade:</span>
                              <span className="font-bold text-[#001840]">{maintainingAverage}</span>
                            </div>
                            {isBelowMaintaining ? (
                              <div className="flex items-start gap-2 pt-2 border-t border-amber-200 text-xs text-amber-900">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-bold">Not Eligible for SSC — Regular Class Only</p>
                                  <p className="mt-0.5 leading-relaxed">
                                    {pastRecord?.hasFailedSubject
                                      ? `Your previous record has a failing subject grade (GWA: ${systemGwa}). You are only eligible to enroll in the Regular Class for ${sscContinuingGrade}.`
                                      : `Your previous General Average (${systemGwa}) did not meet the SSC maintaining grade of ${maintainingAverage}. You are only eligible to enroll in the Regular Class for ${sscContinuingGrade}.`}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 pt-2 border-t border-green-200 text-xs text-green-800 font-semibold">
                                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                                <span>Eligible to continue in Special Science Class (SSC)</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50">
                              <label className="block text-xs font-semibold text-[#001840] mb-1.5">
                                Previous Grade Level General Average (GWA) *
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
                              <p className="text-[11px] text-gray-500 mt-1.5">
                                Continuing SSC students must maintain a General Average of at least <strong>{maintainingAverage}</strong>. Students below {maintainingAverage} will be enrolled in the Regular Class.
                              </p>
                              {sscGwaError && <p className="text-xs text-red-600 font-medium mt-1.5">{sscGwaError}</p>}
                            </div>

                            {manualGwa !== null && (
                              isBelowMaintaining ? (
                                <div className="p-3 rounded-xl border-2 border-amber-300 bg-amber-50 flex items-start gap-2 text-xs text-amber-900">
                                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-bold">Not Eligible for SSC — Regular Class Only</p>
                                    <p className="mt-0.5 leading-relaxed">
                                      Your General Average ({manualGwa}) is below the required SSC maintaining grade of <strong>{maintainingAverage}</strong>. You are only eligible to enroll in the <strong>Regular Class</strong> for {sscContinuingGrade}.
                                    </p>
                                  </div>
                                </div>
                              ) : isEligible ? (
                                <div className="p-3 rounded-xl border-2 border-green-300 bg-green-50 flex items-center gap-2 text-xs text-green-800 font-semibold">
                                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                                  <span>Your General Average ({manualGwa}) meets the {maintainingAverage} maintaining grade requirement for SSC.</span>
                                </div>
                              ) : null
                            )}
                          </div>
                        )}
                      </div>

                      {/* Step 4: Identity Confirmation — EMC Student ID */}
                      <div className="mb-5 p-3.5 rounded-xl border border-[#102A71]/25 bg-[#EEF2FF]/60">
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#001840] mb-1.5">
                          Confirm Your EMC Student ID *
                        </label>
                        <input
                          aria-label="Confirm Your EMC Student ID"
                          type="text"
                          maxLength={20}
                          placeholder="e.g. A-9869 or 2025-00123"
                          value={continuingStudentId}
                          onChange={(e) => {
                            setContinuingStudentId(e.target.value.toUpperCase());
                            setContinuingStudentIdError('');
                          }}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-[#102A71]"
                        />
                        <p className="text-[11px] text-gray-600 mt-1.5">
                          Enter your official EMC Student ID (e.g., <strong>A-9869</strong> or <strong>2025-00123</strong>) to confirm your identity before submitting.
                        </p>
                        {continuingStudentIdError && (
                          <p className="text-xs text-red-600 font-medium mt-1.5">{continuingStudentIdError}</p>
                        )}
                      </div>

                      <div className="flex gap-3 pt-2 border-t border-gray-100">
                        {isBelowMaintaining ? (
                          <button
                            type="button"
                            onClick={() => submitDirectContinuingEnrollment('JHS', sscContinuingGrade, null, 'Regular')}
                            disabled={submittingDirect}
                            className="w-full py-2.5 bg-[#102A71] text-white rounded-xl text-sm font-semibold hover:bg-[#001840] transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
                          >
                            {submittingDirect ? (
                              <><Loader2 size={15} className="animate-spin" /> Submitting...</>
                            ) : (
                              <><CheckCircle2 size={15} /> Directly Enroll in {sscContinuingGrade} (Regular Class)</>
                            )}
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={handleSkipSSC}
                              disabled={submittingDirect}
                              className="flex-1 py-2.5 border-2 border-gray-300 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
                            >
                              Skip — Enroll Regular
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmContinuingSSC}
                              disabled={!sscContinuingGrade || submittingDirect}
                              className="flex-1 py-2.5 bg-[#102A71] text-white rounded-xl text-sm font-semibold hover:bg-[#001840] transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
                            >
                              {submittingDirect ? (
                                <><Loader2 size={15} className="animate-spin" /> Submitting...</>
                              ) : (
                                <><CheckCircle2 size={15} /> Submit SSC Enrollment</>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  );
                })()}
                {false && (<><div className="flex gap-3 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleSkipSSC}
                    disabled={submittingDirect}
                    className="flex-1 py-2.5 border-2 border-gray-300 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
                  >
                    Skip — Enroll Regular
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmContinuingSSC}
                    disabled={!sscContinuingGrade || submittingDirect}
                    className="flex-1 py-2.5 bg-[#102A71] text-white rounded-xl text-sm font-semibold hover:bg-[#001840] transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
                  >
                    {submittingDirect ? (
                      <><Loader2 size={15} className="animate-spin" /> Submitting...</>
                    ) : (
                      <><CheckCircle2 size={15} /> Submit SSC Enrollment</>
                    )}
                  </button>
                </div>
              </>
                )}
              </>
            ) : sscDone ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-[#001840] mb-2">SSC Application Submitted!</h3>
                <p className="text-sm text-gray-600 mb-4">
                  The registrar will review your Grade 6 Report Card, schedule your entrance exam, and notify you of the result. You can proceed to fill out your enrollment form in the meantime.
                </p>
                <button
                  type="button"
                  onClick={() => setSscMode('continuing')}
                  className="text-xs font-semibold text-[#102A71] hover:underline"
                >
                  Are you a Continuing SSC student (Grade 8–10)? Click here for direct enrollment →
                </button>
              </div>
            ) : (
              <>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
                  <p className="text-xs text-yellow-800 leading-relaxed">
                    Incoming Grade 7 students with a Grade 6 General Average of <strong>{settings.content.ssc.minimumAverage} or higher</strong> may apply for the Special Science Class. The registrar will verify your report card, schedule an entrance exam, and inform you of the result.
                  </p>
                </div>

                <p className="text-sm font-semibold text-[#001840] mb-3">Grade 7 SSC Entrance Application</p>

                <label className="block text-sm font-medium text-[#001840] mb-3">Grade 6 general average
                  <input aria-label="Grade 6 general average" type="number" min={settings.content.ssc.minimumAverage} max={100} step="0.01" value={sscAverage} onChange={event => setSscAverage(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <UploadBox
                  label="Grade 6 Report Card *"
                  file={sscFile}
                  onFile={setSscFile}
                  error={sscFileError}
                />

                <div className="flex flex-wrap gap-2.5 mt-5">
                  <button
                    type="button"
                    onClick={handleSkipSSC}
                    className="flex-1 py-2.5 px-3 border-2 border-gray-300 text-gray-600 rounded-xl text-xs sm:text-sm font-semibold hover:bg-gray-50 transition-all"
                  >
                    Skip — Enroll Regular
                  </button>
                  <button
                    type="button"
                    onClick={() => setSscMode('continuing')}
                    className="flex-1 py-2.5 px-3 border-2 border-[#F5C400] bg-[#FFFDF0] text-[#001840] rounded-xl text-xs sm:text-sm font-bold hover:bg-yellow-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    <UserCheck size={14} className="text-[#102A71]" />
                    Continuing SSC
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitSSC}
                    disabled={submittingSSC}
                    className="w-full sm:flex-1 py-2.5 px-3 bg-[#102A71] text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-[#001840] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {submittingSSC ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : 'Apply for SSC'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Regular Enrollment (Grade & Student Type Selection) Modal */}
      {showRegularModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 max-w-lg w-full relative max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-[#102A71]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#001840]">
                    {targetLevel === 'SHS' ? 'Senior High School' : 'Junior High School'} Enrollment
                  </h3>
                  <p className="text-xs text-gray-500">Select your grade level and student status</p>
                </div>
              </div>
              <button
                onClick={() => setShowRegularModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Step 1: Grade Level Selection */}
            <div className="mb-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                Select Grade Level
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {(targetLevel === 'SHS' ? ['Grade 11', 'Grade 12'] : ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10']).map((g) => {
                  const isSelected = selectedGrade === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setSelectedGrade(g);
                        const allowed = allowedEnrollmentTypes(g);
                        if (!allowed.includes(selectedType)) {
                          setSelectedType(allowed[0] || 'new');
                        }
                      }}
                      className={`p-3 rounded-xl border-2 text-left font-semibold text-sm transition-all ${isSelected
                        ? 'border-[#102A71] bg-[#EEF2FF] text-[#102A71] shadow-xs'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{g}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#102A71]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Student Type Options tailored to selected Grade */}
            {selectedGrade && (
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                  Select Applicant Type for {selectedGrade}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {allowedEnrollmentTypes(selectedGrade).map((typeKey) => {
                    const isSelected = selectedType === typeKey;
                    const label = typeKey === 'old' ? 'Continuing' : ENROLLMENT_TYPE_LABELS[typeKey];
                    return (
                      <button
                        key={typeKey}
                        type="button"
                        onClick={() => setSelectedType(typeKey)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${isSelected
                          ? 'border-[#F5C400] bg-[#FFFDF0] text-[#001840] shadow-xs'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">{label}</span>
                          {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-[#102A71]" />}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {typeKey === 'new' && 'First-time enrollment'}
                          {typeKey === 'old' && 'Previously enrolled at EMC'}
                          {typeKey === 'transferee' && 'Transferring from another school'}
                          {typeKey === 'returnee' && 'Returning after taking leave'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {showRegularModal && selectedGrade && selectedType === 'old' && (
              <div className="mb-5 space-y-4">
                {targetLevel === 'SHS' && activeStrands.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
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

                <div className="p-3.5 rounded-xl border border-[#102A71]/25 bg-[#EEF2FF]/60">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#001840] mb-1.5">
                    Confirm Your EMC Student ID *
                  </label>
                  <input
                    aria-label="Confirm Your EMC Student ID"
                    type="text"
                    maxLength={20}
                    placeholder="e.g. A-9869 or 2025-00123"
                    value={continuingStudentId}
                    onChange={(e) => {
                      setContinuingStudentId(e.target.value.toUpperCase());
                      setContinuingStudentIdError('');
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-[#102A71]"
                  />
                  <p className="text-[11px] text-gray-600 mt-1.5">
                    Enter your official EMC Student ID (e.g., <strong>A-9869</strong> or <strong>2025-00123</strong>) to confirm your identity before submitting.
                  </p>
                  {continuingStudentIdError && (
                    <p className="text-xs text-red-600 font-medium mt-1.5">{continuingStudentIdError}</p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-gray-100">
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
                disabled={!selectedGrade || !selectedType || submittingDirect}
                className="flex-1 py-2.5 bg-[#102A71] text-white rounded-xl text-sm font-semibold hover:bg-[#001840] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {submittingDirect ? (
                  <><Loader2 size={15} className="animate-spin" /> Submitting...</>
                ) : selectedType === 'old' ? (
                  <><CheckCircle2 size={15} /> Submit Enrollment</>
                ) : (
                  <>Proceed to Form <ArrowRight size={15} /></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Enrollment Confirmation Modal for Continuing Students */}
      {showDirectConfirm && directTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 max-w-md w-full relative max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#001840]">Direct Enrollment</h3>
                  <span className="inline-block bg-[#102A71]/10 text-[#102A71] text-[11px] font-semibold px-2 py-0.5 rounded-full">
                    Continuing Student
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowDirectConfirm(false)}
                disabled={submittingDirect}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 mb-4 text-xs text-[#001840] leading-relaxed">
              As a <strong>continuing student</strong>, you can submit your enrollment directly without going through the 5 steps. Your personal, family, and educational background on file will be carried over automatically.
            </div>

            {/* Summary Details */}
            <div className="bg-gray-50 rounded-xl p-3.5 space-y-2 border border-gray-100 text-xs mb-5">
              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500">Student Name</span>
                <span className="font-bold text-[#001840]">
                  {directTarget.record.firstName} {directTarget.record.familyName}
                </span>
              </div>
              {directTarget.record.studentNumber && (
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Student ID</span>
                  <span className="font-semibold text-[#102A71]">Confirm below</span>
                </div>
              )}
              {directTarget.record.lrn && (
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">LRN</span>
                  <span className="font-mono font-semibold text-gray-700">{directTarget.record.lrn}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500">Enrolling In</span>
                <span className="font-bold text-[#102A71]">
                  {directTarget.educationLevel} — {directTarget.gradeLevel}
                  {directTarget.strand ? ` (${directTarget.strand})` : directTarget.sscClass === 'SSC' ? ' (SSC)' : directTarget.sscClass === 'Regular' ? ' (Regular Class)' : ''}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Applicant Status</span>
                <span className="font-semibold text-green-700">
                  {directTarget.sscClass === 'SSC' ? 'Continuing SSC Student' : 'Continuing Student'}
                </span>
              </div>
            </div>

            {showRegularModal && selectedGrade && selectedType === 'old' && (
              <div className="mb-5 space-y-4">
                {targetLevel === 'SHS' && activeStrands.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
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

                <div className="p-3.5 rounded-xl border border-[#102A71]/25 bg-[#EEF2FF]/60">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#001840] mb-1.5">
                    Confirm Your EMC Student ID *
                  </label>
                  <input
                    aria-label="Confirm Your EMC Student ID"
                    type="text"
                    maxLength={20}
                    placeholder="e.g. A-9869 or 2025-00123"
                    value={continuingStudentId}
                    onChange={(e) => {
                      setContinuingStudentId(e.target.value.toUpperCase());
                      setContinuingStudentIdError('');
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-[#102A71]"
                  />
                  <p className="text-[11px] text-gray-600 mt-1.5">
                    Enter your official EMC Student ID (e.g., <strong>A-9869</strong> or <strong>2025-00123</strong>) to confirm your identity before submitting.
                  </p>
                  {continuingStudentIdError && (
                    <p className="text-xs text-red-600 font-medium mt-1.5">{continuingStudentIdError}</p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mb-4 p-3.5 rounded-xl border border-[#102A71]/25 bg-[#EEF2FF]/60">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#001840] mb-1.5">
                Confirm Your EMC Student ID *
              </label>
              <input
                aria-label="Confirm Your EMC Student ID"
                type="text"
                maxLength={20}
                placeholder="e.g. A-9869 or 2025-00123"
                value={continuingStudentId}
                onChange={(e) => {
                  setContinuingStudentId(e.target.value.toUpperCase());
                  setContinuingStudentIdError('');
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-[#102A71]"
              />
              <p className="text-[11px] text-gray-600 mt-1.5">
                Enter your official EMC Student ID (e.g., <strong>A-9869</strong> or <strong>2025-00123</strong>) to confirm your identity before submitting.
              </p>
              {continuingStudentIdError && (
                <p className="text-xs text-red-600 font-medium mt-1.5">{continuingStudentIdError}</p>
              )}
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={executeDirectSubmit}
                disabled={submittingDirect}
                className="w-full py-3 bg-[#102A71] text-white rounded-xl text-sm font-bold hover:bg-[#001840] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {submittingDirect ? (
                  <><Loader2 size={16} className="animate-spin" /> Submitting Enrollment...</>
                ) : (
                  <><CheckCircle2 size={16} /> Confirm & Directly Submit</>
                )}
              </button>

              <button
                type="button"
                disabled={submittingDirect}
                onClick={() => {
                  setShowDirectConfirm(false);
                  handleCarryOver(directTarget.strand);
                }}
                className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-all text-center"
              >
                Review or edit details in 5-step form instead →
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
                      handleOpenDirectConfirm(s);
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
                            ? `Your previous record has a failing subject grade (GWA: ${next.previousGwa}). You did not meet the SSC maintaining requirement (${maintainingAverage}) and are only eligible to enroll in the Regular Class for ${next.gradeLevel}.`
                            : `Your previous General Average (${next.previousGwa}) did not meet the required SSC maintaining grade of ${maintainingAverage}. You are only eligible to enroll in the Regular Class for ${next.gradeLevel}.`}
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
                  onClick={() => next.needsStrand ? setShowStrandPicker(true) : handleOpenDirectConfirm()}
                  className="flex-1 py-3 bg-[#102A71] text-white rounded-xl font-bold hover:bg-[#001840] transition-all flex items-center justify-center gap-2 shadow-sm">
                  <CheckCircle2 size={16} />
                  {next.needsStrand
                    ? 'Select Strand & Submit →'
                    : next.isRetained
                      ? `Directly Re-enroll for ${next.gradeLevel}${next.sscDisqualified ? ' (Regular Class)' : next.sscClass === 'SSC' ? ' (SSC)' : ''}`
                      : `Directly Enroll for ${next.gradeLevel}${next.sscDisqualified ? ' (Regular Class)' : next.sscClass === 'SSC' ? ' (SSC)' : ''}`}
                </button>
                <button
                  type="button"
                  onClick={() => next.needsStrand ? setShowStrandPicker(true) : handleCarryOver()}
                  className="px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold text-xs hover:bg-gray-50 transition-all text-center">
                  Review / Edit in 5-Step Form
                </button>
              </div>

              <p className="text-center text-xs text-gray-400 mt-3">
                Enrolling as a <span className="font-semibold">continuing student{next.isRetained ? ' (retained)' : ''}</span> — you can directly submit without filling in the 5 steps.
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
