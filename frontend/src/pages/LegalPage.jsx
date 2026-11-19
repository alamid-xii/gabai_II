import { Link } from "react-router";
import { Shield, FileText, ArrowLeft } from "lucide-react";
import { TermsContent, PrivacyContent } from "../components/LegalContent";
import { useSchoolProfile } from "../hooks/useSchoolProfile";

export function LegalPage({ type = "terms" }) {
  const { profile } = useSchoolProfile();
  const isTerms = type === "terms";

  return (
    <div className="min-h-screen bg-[#FFFDF0] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Top Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#102A71] hover:text-[#001840] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign Up
          </Link>

          <div className="inline-flex rounded-xl bg-white border border-gray-200 p-1 shadow-2xs">
            <Link
              to="/terms"
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                isTerms
                  ? "bg-[#001840] text-white"
                  : "text-gray-600 hover:text-[#001840]"
              }`}
            >
              Terms and Conditions
            </Link>
            <Link
              to="/privacy"
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                !isTerms
                  ? "bg-[#001840] text-white"
                  : "text-gray-600 hover:text-[#001840]"
              }`}
            >
              Privacy Policy
            </Link>
          </div>
        </div>

        {/* Document Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#001840]/10 overflow-hidden">
          <div className="bg-linear-to-r from-[#001840] via-[#102A71] to-[#001840] px-6 sm:px-8 py-8 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-[#F5C400]/20 border border-[#F5C400]/40 flex items-center justify-center text-[#FFDC5F]">
                {isTerms ? <FileText className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#FFDC5F]">
                  GabAI · {profile?.schoolName || "Eastern Mindoro College, Inc."}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {isTerms ? "Terms and Conditions" : "Privacy Policy"}
                </h1>
              </div>
            </div>
            <p className="text-sm text-white/80 mt-2 max-w-2xl">
              {isTerms
                ? "Rules, responsibilities, and guidelines for using the GabAI online admissions, enrollment, and campus portal."
                : "How we collect, safeguard, and process student and applicant personal data under the Data Privacy Act of 2012."}
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {isTerms ? <TermsContent /> : <PrivacyContent />}
          </div>
        </div>
      </div>
    </div>
  );
}
