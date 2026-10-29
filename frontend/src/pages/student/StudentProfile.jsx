import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  UserRound,
  BookOpen,
  GraduationCap,
  School,
  CheckCircle2,
  Clock,
  Users,
  IdCard,
  Edit3,
  Save,
  X,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { ProfileDetailsForm } from "../../components/ProfileDetailsForm";
import { getUserEnrollments } from "../../services/enrollmentApi";
import { API } from "../../config/api";

const keepDigits = (value, maxLength) => (value || "").replace(/\D/g, "").slice(0, maxLength);
const keepNameChars = (value, maxLength) =>
  (value || "").replace(/[^\p{L}\p{M}\s\-'.]/gu, "").slice(0, maxLength);

export function StudentProfile() {
  const { user, updateUser } = useAuth();
  const [editingAccount, setEditingAccount] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingFamily, setEditingFamily] = useState(false);
  const [savingSection, setSavingSection] = useState(false);
  const [savedBanner, setSavedBanner] = useState("");
  const [enrollments, setEnrollments] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);

  const [personalForm, setPersonalForm] = useState({
    firstName: "",
    middleName: "",
    familyName: "",
    lrn: "",
    sex: "",
    dateOfBirth: "",
    placeOfBirth: "",
    mobileNumber: "",
  });

  const [familyForm, setFamilyForm] = useState({
    fatherName: "",
    fatherOccupation: "",
    motherName: "",
    motherOccupation: "",
    parentsAddress: "",
    guardianName: "",
    guardianOccupation: "",
    guardianAddress: "",
    guardianTelephone: "",
  });

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    getUserEnrollments(user.id)
      .then((data) => {
        if (isMounted) {
          setEnrollments(Array.isArray(data) ? data : data?.enrollments || []);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch student enrollments for profile:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingEnrollments(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Sort enrollments newest first
  const sorted = Array.isArray(enrollments)
    ? [...enrollments].sort((a, b) => Number(b.id) - Number(a.id))
    : [];

  // Primary enrollment record with personal/family data (prefer one that has firstName filled, else latest)
  const currentEnrollment = sorted.find((e) => e.firstName || e.familyName) || sorted[0] || null;

  // Determine whether the student is a Continuing / Enrolled student who can optionally update Step 2 & Step 3
  const isContinuingOrEnrolled = Boolean(
    currentEnrollment &&
      (["old", "returnee"].includes((currentEnrollment.enrollmentType || "").toLowerCase()) ||
        currentEnrollment.studentType === "Old" ||
        ["completed", "enrolled", "active"].includes(currentEnrollment.status) ||
        sorted.length > 1)
  );

  // Sync local edit forms whenever currentEnrollment or user changes
  useEffect(() => {
    setPersonalForm({
      firstName: currentEnrollment?.firstName || user?.firstName || "",
      middleName: currentEnrollment?.middleName || user?.middleName || "",
      familyName: currentEnrollment?.familyName || user?.lastName || "",
      lrn: currentEnrollment?.lrn || "",
      sex: currentEnrollment?.sex || "",
      dateOfBirth: currentEnrollment?.dateOfBirth
        ? String(currentEnrollment.dateOfBirth).slice(0, 10)
        : "",
      placeOfBirth: currentEnrollment?.placeOfBirth || "",
      mobileNumber: user?.mobileNumber || currentEnrollment?.mobileNumber || "",
    });

    setFamilyForm({
      fatherName: currentEnrollment?.fatherName || "",
      fatherOccupation: currentEnrollment?.fatherOccupation || "",
      motherName: currentEnrollment?.motherName || "",
      motherOccupation: currentEnrollment?.motherOccupation || "",
      parentsAddress: currentEnrollment?.parentsAddress || "",
      guardianName: currentEnrollment?.guardianName || "",
      guardianOccupation: currentEnrollment?.guardianOccupation || "",
      guardianAddress: currentEnrollment?.guardianAddress || "",
      guardianTelephone: currentEnrollment?.guardianTelephone || "",
    });
  }, [currentEnrollment, user]);

  // Identify student's previous section
  let previousSectionInfo = null;
  const priorEnrollmentWithSection = sorted.find((e, idx) => {
    if (
      idx === 0 &&
      sorted.length > 1 &&
      ["submitted", "pending_exam", "verified", "returned", "approved", "enrolled", "draft"].includes(
        e.status
      )
    ) {
      return false;
    }
    return Boolean(e.sectionName && e.sectionName.trim());
  });

  if (priorEnrollmentWithSection) {
    previousSectionInfo = {
      section: priorEnrollmentWithSection.sectionName,
      gradeLevel: priorEnrollmentWithSection.gradeLevel,
      academicYear: priorEnrollmentWithSection.academicYear,
      educationLevel: priorEnrollmentWithSection.educationLevel,
    };
  } else {
    const recordWithGrade6 = sorted.find((e) => e.grade6Section && e.grade6Section.trim());
    if (recordWithGrade6) {
      previousSectionInfo = {
        section: recordWithGrade6.grade6Section,
        gradeLevel: "Grade 6",
        academicYear: recordWithGrade6.grade6SYStart
          ? `${recordWithGrade6.grade6SYStart}–${recordWithGrade6.grade6SYEnd}`
          : null,
        educationLevel: "Elementary",
      };
    }
  }

  const currentSection = currentEnrollment?.sectionName || null;
  const studentNumber = currentEnrollment?.studentNumber || null;

  async function handleSaveProfileSection(sectionType, payload) {
    if (!currentEnrollment?.id) return;

    if (sectionType === "personal") {
      if (!payload.firstName?.trim() || !payload.familyName?.trim()) {
        toast.error("First name and Last name are required.");
        return;
      }
      if (payload.lrn && !/^\d{12}$/.test(payload.lrn)) {
        toast.error("LRN must be exactly 12 digits.");
        return;
      }
      if (payload.mobileNumber && !/^09\d{9}$/.test(payload.mobileNumber)) {
        toast.error("Mobile number must be 11 digits starting with 09.");
        return;
      }
    }

    if (sectionType === "family") {
      if (payload.guardianTelephone && !/^09\d{9}$/.test(payload.guardianTelephone)) {
        toast.error("Guardian telephone/mobile must be 11 digits starting with 09.");
        return;
      }
    }

    setSavingSection(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/enrollments/${currentEnrollment.id}/profile-sections`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to save profile section");
      }

      if (data.enrollment) {
        setEnrollments((prev) =>
          prev.map((item) => (item.id === data.enrollment.id ? { ...item, ...data.enrollment } : item))
        );
      }
      if (data.user) {
        updateUser(data.user);
      }

      if (sectionType === "personal") {
        setEditingPersonal(false);
        setSavedBanner("Your Personal Information has been updated.");
      } else {
        setEditingFamily(false);
        setSavedBanner("Your Family & Guardian Information has been updated.");
      }
      toast.success("Profile section updated!");
    } catch (err) {
      toast.error(err.message || "Could not update profile section.");
    } finally {
      setSavingSection(false);
    }
  }

  const accountSummary = [
    ["Email address", user?.email],
    ["Mobile number", user?.mobileNumber || currentEnrollment?.mobileNumber],
    ["Sign-in method", user?.authProvider === "google" ? "Google" : "Email and password"],
    ...(studentNumber ? [["Student ID Number", studentNumber]] : []),
    ...(currentEnrollment?.enrollmentType
      ? [
          [
            "Student Classification",
            currentEnrollment.enrollmentType === "old"
              ? "Continuing / Old Student"
              : currentEnrollment.enrollmentType.charAt(0).toUpperCase() +
                currentEnrollment.enrollmentType.slice(1),
          ],
        ]
      : []),
  ];

  const personalInfoItems = [
    ["Last Name", currentEnrollment?.familyName || user?.lastName],
    ["First Name", currentEnrollment?.firstName || user?.firstName],
    ["Middle Name", currentEnrollment?.middleName || user?.middleName],
    ["Learner Reference Number (LRN)", currentEnrollment?.lrn],
    ["Sex", currentEnrollment?.sex],
    [
      "Date of Birth",
      currentEnrollment?.dateOfBirth
        ? new Date(currentEnrollment.dateOfBirth).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : null,
    ],
    ["Place of Birth", currentEnrollment?.placeOfBirth],
    ["Mobile Number", user?.mobileNumber || currentEnrollment?.mobileNumber],
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#102A71]/10 text-[#102A71]">
            <UserRound size={25} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#001840]">Student Profile</h1>
            <p className="text-sm text-gray-500">
              Your account credentials, academic placement, personal information, and family background.
            </p>
          </div>
        </div>

        {studentNumber && (
          <div className="px-3.5 py-2 rounded-xl bg-[#001840] text-white text-xs font-semibold flex items-center gap-2">
            <span className="text-white/60">Student ID:</span>
            <span className="font-mono text-[#F5C400] font-bold">{studentNumber}</span>
          </div>
        )}
      </div>

      {/* Info Banner explaining automatic vs optional updates */}
      {currentEnrollment && (
        <div
          className={`rounded-2xl border p-4 flex items-start gap-3 ${
            isContinuingOrEnrolled
              ? "bg-[#EEF2FF] border-[#102A71]/20 text-[#001840]"
              : "bg-[#FFFDF0] border-[#F5C400]/50 text-[#001840]"
          }`}
        >
          <Sparkles
            size={18}
            className={`shrink-0 mt-0.5 ${
              isContinuingOrEnrolled ? "text-[#102A71]" : "text-amber-600"
            }`}
          />
          <div className="text-xs leading-relaxed">
            {isContinuingOrEnrolled ? (
              <>
                <span className="font-bold">Continuing / Enrolled Student Profile:</span> Your{" "}
                <strong>Personal Information</strong> and <strong>Family &amp; Guardian</strong>{" "}
                sections below are carried over from your school record. It is completely optional to
                update them—click <strong>Update</strong> on either section only if any of your
                details have changed.
              </>
            ) : (
              <>
                <span className="font-bold">Automatically Synced from Enrollment:</span> As a{" "}
                <strong className="capitalize">{currentEnrollment.enrollmentType || "new"}</strong>{" "}
                applicant, your <strong>Personal Information</strong> (Step 2) and{" "}
                <strong>Family &amp; Guardian</strong> (Step 3) sections are automatically populated
                from your 5-step enrollment form.
              </>
            )}
          </div>
        </div>
      )}

      {savedBanner && (
        <p
          role="status"
          className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800 flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-600 shrink-0" />
            <span>{savedBanner}</span>
          </span>
          <button
            type="button"
            onClick={() => setSavedBanner("")}
            className="text-green-700 hover:text-green-900"
          >
            <X size={15} />
          </button>
        </p>
      )}

      {/* 1. Account & Academic Placement Card */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7 shadow-sm space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#102A71]/10 text-[#102A71]">
              <GraduationCap size={19} />
            </span>
            <div>
              <h2 className="font-bold text-[#001840]">Account &amp; Academic Placement</h2>
              <p className="text-xs text-gray-500">
                Sign-in credentials, grade level, and official section assignment.
              </p>
            </div>
          </div>

          {!editingAccount && !currentEnrollment && (
            <button
              type="button"
              onClick={() => {
                setSavedBanner("");
                setEditingAccount(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#102A71] hover:underline"
            >
              <Edit3 size={14} /> Edit account details
            </button>
          )}
        </div>

        {editingAccount ? (
          <ProfileDetailsForm
            user={user}
            onSaved={(savedUser) => {
              updateUser(savedUser);
              setEditingAccount(false);
              setSavedBanner("Your account details have been saved.");
            }}
            onCancel={() => setEditingAccount(false)}
          />
        ) : (
          <>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4 pt-1">
              {accountSummary.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-medium text-gray-500">{label}</dt>
                  <dd className="mt-1 break-words text-sm font-medium text-[#001840]">
                    {value || "Not set"}
                  </dd>
                </div>
              ))}
            </dl>

            {(previousSectionInfo || currentEnrollment) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                {/* Current Section Placement */}
                <div className="p-4 rounded-xl border border-gray-100 bg-slate-50/70 flex flex-col justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Current Academic Level
                    </p>
                    <p className="text-sm font-bold text-[#001840] mt-1">
                      {currentEnrollment?.educationLevel || "High School"}{" "}
                      {currentEnrollment?.gradeLevel ? `• ${currentEnrollment.gradeLevel}` : ""}
                      {currentEnrollment?.strand ? ` (${currentEnrollment.strand})` : ""}
                    </p>
                    {currentEnrollment?.academicYear && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        S.Y. {currentEnrollment.academicYear}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-gray-200/60 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Current Section:</span>
                    {currentSection ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={12} /> {currentSection}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock size={12} /> Pending Assignment
                      </span>
                    )}
                  </div>
                </div>

                {/* Previous Section Card */}
                {previousSectionInfo ? (
                  <div className="p-4 rounded-xl border border-[#F5C400]/40 bg-[#FFFDF0] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900/70 flex items-center gap-1">
                          <BookOpen size={13} className="text-amber-700" />
                          Previous Section
                        </p>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-800">
                          On Record
                        </span>
                      </div>

                      <p className="text-base font-bold text-[#001840] mt-1.5">
                        {previousSectionInfo.section}
                      </p>

                      <p className="text-xs text-gray-600 mt-0.5">
                        {[
                          previousSectionInfo.educationLevel,
                          previousSectionInfo.gradeLevel,
                          previousSectionInfo.academicYear && `S.Y. ${previousSectionInfo.academicYear}`,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-[#F5C400]/30 text-[11px] text-amber-900/80 flex items-center justify-between">
                      <span>Class placement history</span>
                      <span className="font-semibold text-emerald-700">Verified</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 flex flex-col justify-center items-center text-center">
                    <School size={24} className="text-gray-300 mb-1" />
                    <p className="text-xs font-medium text-gray-500">No Previous Section</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      First-time or incoming student
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* 2. Step 2: Personal Information Section */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7 shadow-sm space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#102A71]/10 text-[#102A71]">
              <IdCard size={19} />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-[#001840]">Personal Information</h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  Enrollment Step 2
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Full legal name, Learner Reference Number (LRN), birth details, and contact number.
              </p>
            </div>
          </div>

          {currentEnrollment ? (
            isContinuingOrEnrolled ? (
              !editingPersonal && (
                <button
                  type="button"
                  onClick={() => {
                    setSavedBanner("");
                    setEditingPersonal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#102A71]/20 bg-[#EEF2FF] text-xs font-semibold text-[#102A71] hover:bg-[#102A71] hover:text-white transition-colors"
                >
                  <Edit3 size={13} /> Update Personal Info (Optional)
                </button>
              )
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={12} /> Auto-filled from Enrollment
              </span>
            )
          ) : null}
        </div>

        {loadingEnrollments ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Loader2 size={15} className="animate-spin" /> Loading personal information...
          </div>
        ) : editingPersonal ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveProfileSection("personal", personalForm);
            }}
            className="space-y-4 pt-2 border-t border-gray-100"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#001840] mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={personalForm.familyName}
                  onChange={(e) =>
                    setPersonalForm((p) => ({
                      ...p,
                      familyName: keepNameChars(e.target.value, 100),
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#102A71]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#001840] mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={personalForm.firstName}
                  onChange={(e) =>
                    setPersonalForm((p) => ({
                      ...p,
                      firstName: keepNameChars(e.target.value, 100),
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#102A71]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#001840] mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={personalForm.middleName}
                  onChange={(e) =>
                    setPersonalForm((p) => ({
                      ...p,
                      middleName: keepNameChars(e.target.value, 100),
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#102A71]/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#001840] mb-1">
                  12-Digit LRN
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="12-digit LRN"
                  value={personalForm.lrn}
                  onChange={(e) =>
                    setPersonalForm((p) => ({ ...p, lrn: keepDigits(e.target.value, 12) }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#102A71]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#001840] mb-1">Sex</label>
                <select
                  value={personalForm.sex}
                  onChange={(e) => setPersonalForm((p) => ({ ...p, sex: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#102A71]/20"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#001840] mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={personalForm.dateOfBirth}
                  onChange={(e) => setPersonalForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#102A71]/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#001840] mb-1">
                  Place of Birth
                </label>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="City / Municipality, Province"
                  value={personalForm.placeOfBirth}
                  onChange={(e) => setPersonalForm((p) => ({ ...p, placeOfBirth: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#102A71]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#001840] mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="09171234567"
                  value={personalForm.mobileNumber}
                  onChange={(e) =>
                    setPersonalForm((p) => ({
                      ...p,
                      mobileNumber: keepDigits(e.target.value, 11),
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#102A71]/20"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={savingSection}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#102A71] text-white text-xs font-semibold hover:bg-[#001840] transition-colors disabled:opacity-60"
              >
                {savingSection ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {savingSection ? "Saving..." : "Save Personal Info"}
              </button>
              <button
                type="button"
                disabled={savingSection}
                onClick={() => setEditingPersonal(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5 pt-2 border-t border-gray-100">
            {personalInfoItems.map(([label, value]) => (
              <div key={label} className={label === "Place of Birth" ? "sm:col-span-2" : ""}>
                <dt className="text-xs font-medium text-gray-500">{label}</dt>
                <dd className="mt-1 break-words text-sm font-medium text-[#001840]">
                  {value || (label === "Middle Name" ? "Not provided" : "Not set")}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* 3. Step 3: Family & Guardian Background Section */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7 shadow-sm space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#102A71]/10 text-[#102A71]">
              <Users size={19} />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-[#001840]">Family &amp; Guardian Background</h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  Enrollment Step 3
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Parents&apos; names, occupations, home address, and emergency guardian contact.
              </p>
            </div>
          </div>

          {currentEnrollment ? (
            isContinuingOrEnrolled ? (
              !editingFamily && (
                <button
                  type="button"
                  onClick={() => {
                    setSavedBanner("");
                    setEditingFamily(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#102A71]/20 bg-[#EEF2FF] text-xs font-semibold text-[#102A71] hover:bg-[#102A71] hover:text-white transition-colors"
                >
                  <Edit3 size={13} /> Update Family Info (Optional)
                </button>
              )
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={12} /> Auto-filled from Enrollment
              </span>
            )
          ) : null}
        </div>

        {loadingEnrollments ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Loader2 size={15} className="animate-spin" /> Loading family details...
          </div>
        ) : !currentEnrollment ? (
          <div className="p-6 rounded-xl bg-gray-50 border border-dashed border-gray-200 text-center space-y-2">
            <p className="text-sm font-medium text-gray-600">No enrollment record submitted yet</p>
            <p className="text-xs text-gray-400">
              Once you submit your 5-step enrollment form, your Family &amp; Guardian details will
              automatically appear here.
            </p>
            <Link
              to="/enroll"
              className="inline-block mt-1 text-xs font-semibold text-[#102A71] hover:underline"
            >
              Proceed to Enrollment &rarr;
            </Link>
          </div>
        ) : editingFamily ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveProfileSection("family", familyForm);
            }}
            className="space-y-5 pt-2 border-t border-gray-100"
          >
            {/* Father */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                Father&apos;s Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#001840] mb-1">
                    Father&apos;s Full Name
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    placeholder="Father's full name"
                    value={familyForm.fatherName}
                    onChange={(e) =>
                      setFamilyForm((p) => ({
                        ...p,
                        fatherName: keepNameChars(e.target.value, 200),
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#102A71]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#001840] mb-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="Occupation"
                    value={familyForm.fatherOccupation}
                    onChange={(e) =>
                      setFamilyForm((p) => ({ ...p, fatherOccupation: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#102A71]/20"
                  />
                </div>
              </div>
            </div>

            {/* Mother */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                Mother&apos;s Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#001840] mb-1">
                    Mother&apos;s Full Name
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    placeholder="Mother's full name"
                    value={familyForm.motherName}
                    onChange={(e) =>
                      setFamilyForm((p) => ({
                        ...p,
                        motherName: keepNameChars(e.target.value, 200),
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#102A71]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#001840] mb-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="Occupation"
                    value={familyForm.motherOccupation}
                    onChange={(e) =>
                      setFamilyForm((p) => ({ ...p, motherOccupation: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#102A71]/20"
                  />
                </div>
              </div>
            </div>

            {/* Parents Address */}
            <div>
              <label className="block text-xs font-semibold text-[#001840] mb-1">
                Parents&apos; Complete Address
              </label>
              <input
                type="text"
                maxLength={500}
                placeholder="Complete home address"
                value={familyForm.parentsAddress}
                onChange={(e) => setFamilyForm((p) => ({ ...p, parentsAddress: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#102A71]/20"
              />
            </div>

            {/* Guardian */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                Guardian (If Any)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#001840] mb-1">
                    Guardian&apos;s Full Name
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    placeholder="Guardian's full name"
                    value={familyForm.guardianName}
                    onChange={(e) =>
                      setFamilyForm((p) => ({
                        ...p,
                        guardianName: keepNameChars(e.target.value, 200),
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#102A71]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#001840] mb-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="Guardian's occupation"
                    value={familyForm.guardianOccupation}
                    onChange={(e) =>
                      setFamilyForm((p) => ({ ...p, guardianOccupation: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#102A71]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#001840] mb-1">
                    Guardian&apos;s Address
                  </label>
                  <input
                    type="text"
                    maxLength={500}
                    placeholder="Guardian's address"
                    value={familyForm.guardianAddress}
                    onChange={(e) =>
                      setFamilyForm((p) => ({ ...p, guardianAddress: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#102A71]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#001840] mb-1">
                    Guardian Telephone / Mobile
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="09XXXXXXXXX"
                    value={familyForm.guardianTelephone}
                    onChange={(e) =>
                      setFamilyForm((p) => ({
                        ...p,
                        guardianTelephone: keepDigits(e.target.value, 11),
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#102A71]/20"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={savingSection}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#102A71] text-white text-xs font-semibold hover:bg-[#001840] transition-colors disabled:opacity-60"
              >
                {savingSection ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {savingSection ? "Saving..." : "Save Family Info"}
              </button>
              <button
                type="button"
                disabled={savingSection}
                onClick={() => setEditingFamily(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-5 pt-2 border-t border-gray-100">
            {/* Parents Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-100 space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Father&apos;s Information
                </p>
                <div>
                  <p className="text-xs text-gray-500">Full Name</p>
                  <p className="text-sm font-semibold text-[#001840]">
                    {currentEnrollment.fatherName || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Occupation</p>
                  <p className="text-sm font-medium text-[#001840]">
                    {currentEnrollment.fatherOccupation || "Not provided"}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-100 space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Mother&apos;s Information
                </p>
                <div>
                  <p className="text-xs text-gray-500">Full Name</p>
                  <p className="text-sm font-semibold text-[#001840]">
                    {currentEnrollment.motherName || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Occupation</p>
                  <p className="text-sm font-medium text-[#001840]">
                    {currentEnrollment.motherOccupation || "Not provided"}
                  </p>
                </div>
              </div>
            </div>

            {/* Parents Address */}
            <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-100">
              <p className="text-xs text-gray-500">Parents&apos; Complete Address</p>
              <p className="text-sm font-medium text-[#001840] mt-0.5">
                {currentEnrollment.parentsAddress || "Not provided"}
              </p>
            </div>

            {/* Guardian Info */}
            <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-100 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Guardian Information (If Any)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Full Name</p>
                  <p className="text-sm font-semibold text-[#001840]">
                    {currentEnrollment.guardianName || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Occupation</p>
                  <p className="text-sm font-medium text-[#001840]">
                    {currentEnrollment.guardianOccupation || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Telephone / Mobile</p>
                  <p className="text-sm font-medium text-[#001840]">
                    {currentEnrollment.guardianTelephone || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="text-sm font-medium text-[#001840]">
                    {currentEnrollment.guardianAddress || "Not provided"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between pt-1">
        <Link
          to="/my-enrollments"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#102A71] hover:underline"
        >
          View my enrollments &rarr;
        </Link>
        {isContinuingOrEnrolled && (
          <Link
            to="/enroll"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#001840] hover:underline"
          >
            Go to Level Selection &rarr;
          </Link>
        )}
      </div>
    </main>
  );
}

export default StudentProfile;
