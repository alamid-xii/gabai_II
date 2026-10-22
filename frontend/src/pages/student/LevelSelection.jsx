import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { BookOpen, School, ArrowLeft, FlaskConical, X, Upload, FileText, Loader2, CheckCircle2 } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED = ".pdf,.jpg,.jpeg,.png";
const FILE_HINT = "Formats: PDF, JPG, JPEG, PNG · Max file size: 10MB";
const API = 'http://localhost:3000/api';

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
      alert(`Invalid file type "${f.name}".\nOnly PDF, JPG, JPEG, and PNG files are allowed.`);
      e.target.value = '';
      return;
    }
    // Check extension as secondary guard
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      alert(`Invalid file extension "${ext}".\nOnly .pdf, .jpg, .jpeg, .png files are allowed.`);
      e.target.value = '';
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      alert("File exceeds 10MB limit. Please choose a smaller file.");
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
  const [selected, setSelected] = useState(null); // 'JHS' | 'SHS'
  const [showSSCModal, setShowSSCModal] = useState(false);
  const [sscFile, setSscFile] = useState(null);
  const [sscFileError, setSscFileError] = useState('');
  const [submittingSSC, setSubmittingSSC] = useState(false);
  const [sscDone, setSscDone] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingEnrollment, setExistingEnrollment] = useState(null);
  const [completedEnrollment, setCompletedEnrollment] = useState(null); // for carry-over
  const [showStrandPicker, setShowStrandPicker] = useState(false); // Grade 10 → SHS

  // Check if student already has an active enrollment
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token || !user.id) { setChecking(false); return; }
    fetch(`${API}/enrollments/user/${user.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const enrollments = Array.isArray(data) ? data : (data.enrollments || []);
        // Active = not yet done (exclude draft — unfinished forms shouldn't block)
        const active = enrollments.find(e =>
          !['rejected', 'completed', 'draft'].includes(e.status)
        );
        if (active) { setExistingEnrollment(active); setChecking(false); return; }
        // Completed = ready for carry-over
        const completed = enrollments
          .filter(e => e.status === 'completed')
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
        if (completed) setCompletedEnrollment(completed);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  // If student already has an active enrollment, block and redirect
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFDF0]">
        <Loader2 className="w-8 h-8 animate-spin text-[#102A71]" />
      </div>
    );
  }

  if (existingEnrollment) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0] flex items-center justify-center px-4">
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
            Status: <span className="font-semibold text-[#102A71]">{existingEnrollment.status.replace('_', ' ')}</span>
          </p>
          <p className="text-sm text-gray-600 mb-6">
            You cannot start a new enrollment while you have an active application. 
            Please wait for your current enrollment to be processed, or delete it first.
          </p>
          <button
            onClick={() => navigate('/my-enrollments')}
            className="w-full py-3 bg-[#102A71] text-white rounded-xl font-semibold hover:bg-[#001840] transition-all"
          >
            View My Enrollment
          </button>
        </div>
      </div>
    );
  }

  // ── Carry-over helper: determine next grade level ────────────────────────────
  function getNextLevel(completed) {
    const gradeNum = parseInt((completed.gradeLevel || '').replace(/\D/g, ''));
    if (isNaN(gradeNum)) return null;
    if (gradeNum < 10) {
      // JHS: Grade 7→8, 8→9, 9→10
      return { educationLevel: 'JHS', gradeLevel: `Grade ${gradeNum + 1}`, strand: null };
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
          enrollmentType: 'old',
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

  const handleSelect = (level) => {
    if (level.id === 'JHS') {
      setSelected('JHS');
      // Check if student already has an SSC application
      const token = localStorage.getItem('token');
      fetch('http://localhost:3000/api/enrollments/ssc-application/status', {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).then(data => {
        if (data.applied) { setSscDone(true); }
      }).catch(() => {});
      setShowSSCModal(true);
    } else {
      navigate('/hs-enrollment-form', { state: { educationLevel: level.id } });
    }
  };

  const handleSkipSSC = () => {
    setShowSSCModal(false);
    navigate('/hs-enrollment-form', { state: { educationLevel: 'JHS' } });
  };

  const handleSubmitSSC = async () => {
    if (!sscFile) { setSscFileError("Please upload your Grade 6 Report Card."); return; }
    setSscFileError('');
    setSubmittingSSC(true);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('sscCard', sscFile);
      const res = await fetch('http://localhost:3000/api/enrollments/ssc-application', {
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
    <div className="min-h-screen bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0] flex items-start justify-center pt-10 pb-6 px-4">
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
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            {sscDone ? (
              <div className="text-center py-4">
                <button onClick={() => setShowSSCModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={20} />
                </button>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-[#001840] mb-2">SSC Application Submitted!</h3>
                <p className="text-sm text-gray-600">
                  The registrar will review your Grade 6 Report Card, schedule your entrance exam, and notify you of the result. You can proceed to fill out your enrollment form in the meantime.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <FlaskConical className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#001840]">Special Science Class (SSC)</h3>
                      <p className="text-xs text-gray-500">Grade 7 applicants only</p>
                    </div>
                  </div>
                  <button onClick={() => setShowSSCModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
                  <p className="text-xs text-yellow-800 leading-relaxed">
                    Students with a Grade 6 General Average of <strong>85 or higher</strong> may apply for the Special Science Class. The registrar will verify your report card, schedule an entrance exam, and inform you of the result. You can then choose to enroll in SSC or Regular class.
                  </p>
                </div>

                <p className="text-sm font-semibold text-[#001840] mb-3">Would you like to apply for SSC?</p>

                <UploadBox
                  label="Grade 6 Report Card *"
                  file={sscFile}
                  onFile={setSscFile}
                  error={sscFileError}
                />

                <div className="flex gap-3 mt-5">
                  <button
                    onClick={handleSkipSSC}
                    className="flex-1 py-2.5 border-2 border-gray-300 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
                  >
                    Skip — Enroll Regular
                  </button>
                  <button
                    onClick={handleSubmitSSC}
                    disabled={submittingSSC}
                    className="flex-1 py-2.5 bg-[#102A71] text-white rounded-xl text-sm font-semibold hover:bg-[#001840] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {submittingSSC ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : 'Apply for SSC'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="relative w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/emc_logo_nobg.png" alt="EMC Logo" className="w-16 h-16 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-[#001840] mb-2">Student Enrollment</h1>
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
            const strands = ['STEM', 'ABM', 'HUMSS', 'TVL', 'Sports', 'Arts and Design'];
            return (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-8 mb-6">
                <h2 className="text-xl font-bold text-[#001840] mb-2">Select Your SHS Strand</h2>
                <p className="text-sm text-gray-500 mb-5">
                  You are moving from <span className="font-semibold">Grade 10 JHS</span> to <span className="font-semibold">Grade 11 SHS</span>. Please select your strand.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {strands.map(s => (
                    <button key={s} onClick={() => handleCarryOver(s)}
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
                <div className="w-10 h-10 bg-[#F5C400] rounded-xl flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-[#001840]" />
                </div>
                <div>
                  <p className="font-bold text-[#001840]">Continue to Next Level</p>
                  <p className="text-xs text-gray-500">Your info from last year will be pre-filled</p>
                </div>
              </div>

              <div className="bg-[#FFFDF0] border border-[#F5C400]/40 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-center text-sm">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Previous</p>
                    <p className="font-semibold text-gray-700">
                      {completedEnrollment.educationLevel} — {completedEnrollment.gradeLevel}
                      {completedEnrollment.strand ? ` (${completedEnrollment.strand})` : ''}
                    </p>
                  </div>
                  <div className="text-gray-400 text-lg">→</div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-0.5">Next</p>
                    <p className="font-bold text-[#001840]">
                      {next.educationLevel} — {next.gradeLevel}
                      {next.strand ? ` (${next.strand})` : next.needsStrand ? ' (select strand)' : ''}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => next.needsStrand ? setShowStrandPicker(true) : handleCarryOver()}
                className="w-full py-3 bg-[#102A71] text-white rounded-xl font-bold hover:bg-[#001840] transition-all">
                {next.needsStrand ? 'Select Strand & Continue →' : `Enroll for ${next.gradeLevel} →`}
              </button>

              <p className="text-center text-xs text-gray-400 mt-3">
                Enrolling as a <span className="font-semibold">returning student</span> — your personal info will be pre-filled. You only need to upload new documents.
              </p>
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
                    className="relative rounded-2xl border-2 p-8 transition-all duration-200 select-none border-[#102A71] bg-white text-[#001840] hover:bg-[#FFFDF0] hover:border-[#F5C400] hover:shadow-xl cursor-pointer">
                    <div className="flex flex-col items-center text-center gap-4">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[#EEF2FF]">
                        <Icon className="w-8 h-8 text-[#102A71]" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold mb-1">{level.label}</h2>
                        <p className="text-sm text-gray-500">{level.subtitle}</p>
                      </div>
                      <span className="mt-2 px-4 py-1.5 bg-[#102A71] text-white text-sm font-semibold rounded-lg">
                        Enroll Now
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SSC info note */}
            <div className="mt-6 flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <FlaskConical className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-800">Applying for Grade 7 Special Science Class?</p>
                <p className="text-xs text-yellow-700 mt-0.5">Select Junior High School — you'll be asked to upload your Grade 6 Report Card before proceeding to the enrollment form. The registrar will schedule your SSC entrance exam.</p>
              </div>
            </div>
          </>
        )}

        <p className="text-center text-sm text-gray-400 mt-6">
          {completedEnrollment ? 'Continue your academic journey at Eastern Mindoro College.' : 'Select your education level to begin the enrollment process.'}
        </p>
      </div>
    </div>
  );
}
