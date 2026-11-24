import { useSchoolProfile } from "../hooks/useSchoolProfile";
import { useState, useEffect } from "react";
import {
  FileText,
  ClipboardList,
  CreditCard,
  UserCheck,
  BookOpen,
  Camera,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Clock,
} from "lucide-react";

import { API } from '../config/api';
const ICONS = { FileText, ClipboardList, CreditCard, UserCheck, BookOpen, Camera };

export function EnrollmentGuide() {
  const { profile } = useSchoolProfile();
  const [guide, setGuide] = useState(null);
  const [expanded, setExpanded] = useState(1);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API}/enrollment-guide`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw Error('The enrollment guide is temporarily unavailable.');
      const data = await response.json();
      if (controller.signal.aborted) return;
      setGuide(data); setExpanded(data.content.steps[0]?.id || null);
    }).catch(error => { if (!controller.signal.aborted) setLoadError(error.message); });
    return () => controller.abort();
  }, [reload]);
  const steps = guide?.content.steps || [];
  const info = { ...guide?.content, ...(profile ? { phone: profile.phone, email: profile.email, registrarLocation: profile.registrarLocation, registrarHours: profile.registrarHours } : {}) };

  function toggle(id) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  if (!guide) return <div className="p-8 text-center bg-[#FFFDF0] min-h-screen"><p role="status">{loadError || 'Loading enrollment guide...'}</p>{loadError && <button onClick={() => { setLoadError(''); setReload(value => value + 1); }} className="mt-4 underline">Try again</button>}</div>;

  return (
    <div className="min-h-screen bg-[#FFFDF0]">
      <div className="max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8">

        {/* Page Header */}
        <div className="mb-5 sm:mb-7">
          <h1 className="text-xl sm:text-3xl font-bold text-[#001840] tracking-tight leading-snug">
            JHS &amp; SHS Enrollment Guide
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1.5 leading-relaxed">
            Follow these steps to complete your online application, submit your physical documents for verification at the Registrar&apos;s Office, and settle your payment at the Cashier&apos;s Office (Ground Floor, Admin Building).
          </p>
        </div>

        {/* Important Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-linear-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3.5 sm:p-4">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <Calendar className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-blue-900 mb-0.5 sm:mb-1">Enrollment Period</h3>
                <p className="text-xs sm:text-sm text-blue-800 break-words leading-snug">{info.enrollmentPeriod || 'Schedule to be announced'}</p>
                {info.enrollmentAudience && (
                  <p className="text-[11px] sm:text-xs text-blue-700 mt-1 break-words leading-snug">{info.enrollmentAudience}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-linear-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-3.5 sm:p-4">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <MapPin className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-green-900 mb-0.5 sm:mb-1">Registrar &amp; Cashier&apos;s Office</h3>
                <p className="text-xs sm:text-sm text-green-800 break-words leading-snug">{info.registrarLocation || 'Admin Building, Ground Floor'}</p>
                <p className="text-[11px] sm:text-xs text-green-700 mt-1 break-words leading-snug">{info.registrarHours || 'Mon–Fri: 8:00 AM – 5:00 PM'}</p>
              </div>
            </div>
          </div>

          <div className="bg-linear-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-3.5 sm:p-4">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <Phone className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-purple-900 mb-0.5 sm:mb-1">Contact Us</h3>
                <p className="text-xs sm:text-sm text-purple-800 break-words leading-snug">{info.phone || 'Contact the Registrar on campus'}</p>
                <p className="text-[11px] sm:text-xs text-purple-700 mt-1 break-all leading-snug">{info.email || 'Email to be announced'}</p>
              </div>
            </div>
          </div>

          <div className="bg-linear-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-3.5 sm:p-4">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-orange-900 mb-0.5 sm:mb-1">Important</h3>
                <p className="text-xs sm:text-sm text-orange-800 break-words leading-snug">{info.importantNotice}</p>
                {info.importantDetail && (
                  <p className="text-[11px] sm:text-xs text-orange-700 mt-1 break-words leading-snug">{info.importantDetail}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Step Cards */}
        <div className="space-y-3 sm:space-y-4">
          {steps.map((step, index) => {
            const Icon = ICONS[step.icon] || FileText;
            const isOpen = expanded === step.id;

            return (
              <div
                key={step.id}
                className={`bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border-2 transition-all duration-200 overflow-hidden ${
                  isOpen ? "border-[#F5C400]" : "border-gray-100"
                }`}
              >
                {/* Card Header */}
                <button
                  type="button"
                  aria-expanded={isOpen}
                  className="w-full text-left flex items-start sm:items-center gap-3 sm:gap-4 p-3.5 sm:p-5 cursor-pointer select-none hover:bg-gray-50 transition-colors"
                  onClick={() => toggle(step.id)}
                >
                  {/* Step number */}
                  <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 font-bold text-xs sm:text-sm transition-all bg-[#102A71] text-[#FFDC5F] mt-0.5 sm:mt-0">
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  {/* Icon */}
                  <div
                    className={`hidden sm:flex w-12 h-12 rounded-xl items-center justify-center shrink-0 bg-linear-to-br ${"from-[#001840] to-[#102A71]"} shadow-md`}
                  >
                    <Icon className="w-6 h-6 text-[#FFDC5F]" />
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#001840] text-sm sm:text-lg leading-snug break-words">{step.title}</h3>
                    {!isOpen && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 sm:line-clamp-1">{step.description}</p>
                    )}
                    {step.estimatedTime && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="text-[11px] sm:text-xs text-gray-500">{step.estimatedTime}</span>
                      </div>
                    )}
                  </div>

                  {/* Expand toggle */}
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 shrink-0 mt-1 sm:mt-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 shrink-0 mt-1 sm:mt-0" />
                  )}
                </button>

                {/* Expanded Content */}
                {isOpen && (
                  <div className="px-3.5 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100">
                    <p className="text-gray-700 text-xs sm:text-sm mt-3.5 sm:mt-4 mb-3.5 sm:mb-4 leading-relaxed break-words">{step.description}</p>

                    {/* Pro Tip */}
                    {step.tips && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3.5 sm:mb-4">
                        <div className="flex gap-2">
                          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-blue-900 mb-0.5">Pro Tip</p>
                            <p className="text-xs text-blue-800 leading-relaxed break-words">{step.tips}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Requirements list */}
                    <div className="bg-[#FFFDF0] rounded-xl p-3 sm:p-4 border border-gray-200">
                      <h4 className="text-[#001840] text-xs sm:text-sm font-bold mb-2.5 sm:mb-3 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 shrink-0" />
                        <span>Requirements / Instructions:</span>
                      </h4>
                      <ul className="space-y-2 sm:space-y-2.5">
                        {step.requirements.map((req, i) => (
                          <li key={i} className="flex items-start gap-2 sm:gap-2.5 text-xs sm:text-sm text-gray-700 leading-relaxed">
                            <div className="w-5 h-5 rounded-full bg-[#F5C400] flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-[#001840] text-[11px] font-bold">{i + 1}</span>
                            </div>
                            <span className="min-w-0 break-words">{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Help Section */}
        <div className="mt-6 sm:mt-8 bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border border-gray-100 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-[#001840] mb-3 sm:mb-4">Need Help?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-[#102A71] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-gray-900">Call Us</p>
                <p className="text-xs sm:text-sm text-gray-600 break-words">{info.phone || 'Contact the Registrar on campus'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#102A71] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-gray-900">Email Us</p>
                <p className="text-xs sm:text-sm text-gray-600 break-all">{info.email || 'Email to be announced'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
