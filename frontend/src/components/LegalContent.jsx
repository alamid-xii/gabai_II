import { useEffect } from "react";
import { Link } from "react-router";
import { Shield, FileText, X, CheckCircle2, ExternalLink } from "lucide-react";
import { useSchoolProfile } from "../hooks/useSchoolProfile";

const EFFECTIVE_DATE = "School Year 2026–2027";

function getSchoolInfo(profile) {
  return {
    name: profile?.schoolName || "Eastern Mindoro College, Inc.",
    shortName: profile?.shortName || "EMC",
    address:
      profile?.address ||
      "Vicente Ylagan St., Bagong Bayan II, Bongabong, Oriental Mindoro, Philippines 5211",
    email: profile?.email || "emc_1945@yahoo.com",
    phone: profile?.phone || null,
    registrarLocation: profile?.registrarLocation || "Office of the Registrar",
    registrarHours: profile?.registrarHours || null,
  };
}

export function TermsContent() {
  const { profile } = useSchoolProfile();
  const school = getSchoolInfo(profile);

  return (
    <div className="space-y-5 text-sm text-gray-700 leading-relaxed">
      <div className="bg-[#001840]/5 border border-[#001840]/10 rounded-xl p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#102A71]">
          Effective: {EFFECTIVE_DATE}
        </p>
        <p className="mt-1 text-gray-700">
          These Terms and Conditions govern your access to and use of the{" "}
          <strong className="text-[#001840]">GabAI Admissions &amp; Campus Portal</strong> operated
          for <strong className="text-[#001840]">{school.name}</strong>. By creating an account or
          using this portal, you agree to comply with these terms.
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="text-base font-bold text-[#001840]">1. Purpose and Scope of the Portal</h3>
        <p>
          GabAI is the official online admissions, enrollment, campus navigation, and academic
          information portal of {school.name} supporting Junior High School (Grades 7–10, Regular
          and Special Science Class) and Senior High School (Grades 11–12). Access is granted to
          prospective students, enrolled students, parents/guardians, faculty, registrars, and
          authorized school administrators.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-bold text-[#001840]">
          2. Account Registration and Security
        </h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            You must provide accurate, complete, and truthful personal details (full legal name,
            active email address, and valid Philippine mobile number) when creating an account.
          </li>
          <li>
            You are required to verify your email address before accessing enrollment services. If
            you register using Google Sign-In, you must complete your student profile before
            submitting applications.
          </li>
          <li>
            You are responsible for maintaining the confidentiality of your password and for all
            activity under your account. Never share your login credentials, OTP codes, or password
            reset links with others.
          </li>
          <li>
            Each student should maintain only one active portal account to prevent duplicate
            enrollment records.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-bold text-[#001840]">
          3. Online Enrollment and Document Submissions
        </h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Submitting an online enrollment form does not automatically confirm official enrollment.
            All applications are subject to review, credential verification, approval, and section
            assignment by the {school.registrarLocation}.
          </li>
          <li>
            All uploaded documents (such as Form 138 / Report Card, Certificate of Good Moral
            Character, Form 137, Birth Certificate, Transfer Credentials, or Grade 6 Report Card for
            SSC applicants) must be genuine, clear, and unaltered. Submission of falsified or
            tampered records is grounds for rejection or disciplinary action.
          </li>
          <li>
            Special Science Class (SSC) applications require meeting the published Grade 6 general
            average threshold, Registrar verification of the report card, and passing the scheduled
            entrance examination before final SSC enrollment.
          </li>
          <li>
            If an application is returned by the Registrar for corrections, you are responsible for
            updating the requested details or re-uploading valid documents within the enrollment
            period.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-bold text-[#001840]">4. Acceptable Use</h3>
        <p>When using the portal, you agree not to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Impersonate another student, parent, guardian, teacher, or school official.</li>
          <li>
            Attempt to access accounts, documents, grades, or administrative features that do not
            belong to you.
          </li>
          <li>
            Upload malicious files, automated spam, or content unrelated to school admissions and
            academic records.
          </li>
          <li>
            Interfere with the availability, integrity, or security of the portal or its servers.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-bold text-[#001840]">
          5. GabAI Assistant and Campus Virtual Tour
        </h3>
        <p>
          The GabAI chat assistant and 360° campus virtual tour are provided to help answer general
          questions about enrollment procedures, requirements, programs, and campus facilities.
          While we strive to keep information up to date, official school policies, admission
          decisions, class schedules, and academic records issued by the {school.registrarLocation}{" "}
          and School Administration always take precedence. Do not enter passwords, OTPs, or private
          sensitive information into the public chatbot.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-bold text-[#001840]">
          6. Account Suspension and Policy Updates
        </h3>
        <p>
          {school.name} reserves the right to suspend or deactivate accounts that violate these
          Terms, submit fraudulent records, or pose a security risk. We may update these Terms and
          Conditions as school policies or system features evolve; continued use of the portal
          constitutes acceptance of the updated terms.
        </p>
      </section>

      <section className="space-y-1.5 pt-2 border-t border-gray-200">
        <h3 className="text-base font-bold text-[#001840]">7. Contact Information</h3>
        <p>
          For questions regarding these Terms and Conditions or your enrollment application, please
          contact <strong className="text-[#001840]">{school.name}</strong>:
        </p>
        <ul className="text-xs text-gray-600 space-y-1 pt-1">
          <li>
            <strong>Office:</strong> {school.registrarLocation}
            {school.registrarHours ? ` (${school.registrarHours})` : ""}
          </li>
          <li>
            <strong>Address:</strong> {school.address}
          </li>
          <li>
            <strong>Email:</strong> {school.email}
          </li>
          {school.phone && (
            <li>
              <strong>Phone:</strong> {school.phone}
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

export function PrivacyContent() {
  const { profile } = useSchoolProfile();
  const school = getSchoolInfo(profile);

  return (
    <div className="space-y-5 text-sm text-gray-700 leading-relaxed">
      <div className="bg-[#001840]/5 border border-[#001840]/10 rounded-xl p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#102A71]">
          Effective: {EFFECTIVE_DATE} · Data Privacy Act of 2012 (R.A. 10173)
        </p>
        <p className="mt-1 text-gray-700">
          <strong className="text-[#001840]">{school.name}</strong> respects and protects the
          personal data of our students, applicants, parents, guardians, and staff in compliance
          with the Philippine{" "}
          <strong className="text-[#001840]">Data Privacy Act of 2012 (Republic Act No. 10173)</strong>{" "}
          and its Implementing Rules and Regulations.
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="text-base font-bold text-[#001840]">1. Personal Data We Collect</h3>
        <p>When you register and apply through GabAI, we collect only the information necessary for school admissions and academic administration:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Account Information:</strong> Full name (first, middle, last), email address,
            mobile number, encrypted password, and Google account identifier (if you choose Google
            Sign-In).
          </li>
          <li>
            <strong>Student &amp; Enrollment Details:</strong> Learner Reference Number (LRN),
            student number, sex, date and place of birth, education level (JHS/SHS), grade level,
            track/strand, SSC application details, previous school attended, and academic averages.
          </li>
          <li>
            <strong>Family &amp; Guardian Information:</strong> Father&apos;s, mother&apos;s, and
            guardian&apos;s names, occupations, contact numbers, and home addresses.
          </li>
          <li>
            <strong>Supporting Credentials:</strong> Uploaded academic and identity documents (e.g.,
            Form 138, Form 137, Certificate of Good Moral Character, Birth Certificate, Transfer
            Credentials, and Grade 6 Report Card).
          </li>
          <li>
            <strong>System &amp; Audit Logs:</strong> Login activity, enrollment workflow actions,
            timestamps, and IP addresses recorded for account protection and institutional auditing.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-bold text-[#001840]">2. How We Use Your Information</h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Verify your identity via email verification / OTP and secure your portal account.</li>
          <li>
            Evaluate, verify, and process JHS and SHS enrollment applications and Special Science
            Class (SSC) entrance exam eligibility.
          </li>
          <li>
            Assign approved students to sections, subjects, class schedules, and class advisers.
          </li>
          <li>
            Generate official enrollment forms, student schedules, and institutional school records
            required by {school.name} and the Department of Education (DepEd).
          </li>
          <li>
            Send important notifications regarding account verification, password resets, returned
            documents, SSC exam schedules, and enrollment status updates.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-bold text-[#001840]">
          3. Data Sharing and Role-Based Access
        </h3>
        <p>
          We do <strong>not</strong> sell, rent, or disclose your personal data to third-party
          marketers. Access to student records is strictly controlled through role-based
          permissions:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Students</strong> can view only their own profile, enrollment applications,
            uploaded documents, and assigned class schedule.
          </li>
          <li>
            <strong>Registrars &amp; Administrators</strong> access enrollment records and uploaded
            documents solely to review applications, manage sections, and maintain official school
            records.
          </li>
          <li>
            <strong>Teachers</strong> access only the class rosters, schedules, and grading sheets
            of sections and subjects assigned to them.
          </li>
          <li>
            Data may be disclosed to government educational authorities (such as DepEd) or as
            required by law.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-bold text-[#001840]">
          4. Data Protection, Storage, and Retention
        </h3>
        <p>
          Passwords are stored using strong one-way cryptographic hashing (bcrypt) and are never
          visible to staff. Uploaded enrollment documents are stored privately and served only to
          authenticated, authorized users. Public chatbot interactions do not access or disclose
          private student records. Personal and academic records are retained in accordance with{" "}
          {school.name} and DepEd record-retention standards.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-bold text-[#001840]">
          5. Students Under 18 (Minors&apos; Privacy)
        </h3>
        <p>
          Because Junior and Senior High School applicants are typically minors, enrollment
          submissions require parent or guardian information and acknowledgment. Parents and legal
          guardians may coordinate with the {school.registrarLocation} to review, update, or inquire
          about their child&apos;s enrollment records.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-bold text-[#001840]">
          6. Your Rights Under the Data Privacy Act
        </h3>
        <p>Under R.A. 10173, you have the right to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Be informed about how your personal data is collected and processed.</li>
          <li>Access your personal information and enrollment records held by the school.</li>
          <li>
            Request rectification or correction of inaccurate or outdated details through your
            profile settings or the {school.registrarLocation}.
          </li>
          <li>
            Object to unauthorized processing or request erasure/blocking of non-mandatory records
            subject to legal and academic record-keeping obligations.
          </li>
          <li>Lodge a concern with the school or the National Privacy Commission (NPC).</li>
        </ul>
      </section>

      <section className="space-y-1.5 pt-2 border-t border-gray-200">
        <h3 className="text-base font-bold text-[#001840]">7. Data Privacy Inquiries</h3>
        <p>
          To exercise your data privacy rights or report a privacy concern, contact{" "}
          <strong className="text-[#001840]">{school.name}</strong>:
        </p>
        <ul className="text-xs text-gray-600 space-y-1 pt-1">
          <li>
            <strong>Office:</strong> {school.registrarLocation}
            {school.registrarHours ? ` (${school.registrarHours})` : ""}
          </li>
          <li>
            <strong>Address:</strong> {school.address}
          </li>
          <li>
            <strong>Email:</strong> {school.email}
          </li>
          {school.phone && (
            <li>
              <strong>Phone:</strong> {school.phone}
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

export function LegalDocumentModal({ activeTab, onTabChange, onClose, onAgree }) {
  useEffect(() => {
    if (!activeTab) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, onClose]);

  if (!activeTab) return null;

  const isTerms = activeTab === "terms";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div
        className="bg-[#FFFDF0] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col border-2 border-[#F5C400]/30 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-linear-to-r from-[#001840] to-[#102A71] px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#F5C400]/20 border border-[#F5C400]/40 flex items-center justify-center text-[#FFDC5F]">
              {isTerms ? <FileText className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            </div>
            <div>
              <h2 id="legal-modal-title" className="text-lg font-bold leading-tight">
                {isTerms ? "Terms and Conditions" : "Privacy Policy"}
              </h2>
              <p className="text-xs text-[#FFDC5F]">
                GabAI — Eastern Mindoro College, Inc.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between px-6 border-b border-gray-200 bg-white shrink-0">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onTabChange("terms")}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                isTerms
                  ? "border-[#102A71] text-[#001840]"
                  : "border-transparent text-gray-500 hover:text-[#001840]"
              }`}
            >
              Terms and Conditions
            </button>
            <button
              type="button"
              onClick={() => onTabChange("privacy")}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                !isTerms
                  ? "border-[#102A71] text-[#001840]"
                  : "border-transparent text-gray-500 hover:text-[#001840]"
              }`}
            >
              Privacy Policy
            </button>
          </div>
          <Link
            to={isTerms ? "/terms" : "/privacy"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-[#102A71] hover:text-[#001840] inline-flex items-center gap-1"
          >
            Full page <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-6 py-5 flex-1 bg-[#FFFDF0]">
          {isTerms ? <TermsContent /> : <PrivacyContent />}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-gray-200 flex flex-col sm:flex-row items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          {onAgree && (
            <button
              type="button"
              onClick={onAgree}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-linear-to-r from-[#102A71] to-[#001840] hover:from-[#001840] hover:to-[#102A71] text-white text-sm font-semibold shadow-sm transition-all"
            >
              <CheckCircle2 className="w-4 h-4 text-[#FFDC5F]" />
              I Understand &amp; Agree
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
