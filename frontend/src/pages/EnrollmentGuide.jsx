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

  if (!guide) return <div className="p-8 text-center bg-white min-h-screen text-gray-500"><p role="status">{loadError || 'Loading enrollment guide...'}</p>{loadError && <button onClick={() => { setLoadError(''); setReload(value => value + 1); }} className="mt-4 text-[#102A71] font-semibold underline">Try again</button>}</div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-24 sm:pb-14">

        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#102A71] bg-[#EEF2FF] px-3 py-1 rounded-full mb-3">
            <BookOpen className="w-3.5 h-3.5 text-[#F5C400]" />
            Admissions Guide
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#001840] tracking-tight leading-snug">
            JHS &amp; SHS Enrollment Guide
          </h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-2xl">
            Follow these steps to complete your online application, submit your physical documents for verification at the Registrar&apos;s Office, and settle your payment at the Cashier&apos;s Office.
          </p>
        </div>

        {/* Unified Key Info Strip */}
        <div className="bg-gray-50/70 border border-gray-200/80 rounded-2xl divide-y md:divide-y-0 md:divide-x divide-gray-200/80 grid grid-cols-1 md:grid-cols-3 mb-4">
          <div className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#102A71] flex items-center justify-center shrink-0 mt-0.5">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Enrollment Period</p>
              <p className="text-sm font-semibold text-[#001840] mt-0.5 leading-snug break-words">{info.enrollmentPeriod || 'Schedule to be announced'}</p>
              {info.enrollmentAudience && (
                <p className="text-xs text-gray-500 mt-0.5 leading-snug break-words">{info.enrollmentAudience}</p>
              )}
            </div>
          </div>

          <div className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#102A71] flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Registrar &amp; Cashier</p>
              <p className="text-sm font-semibold text-[#001840] mt-0.5 leading-snug break-words">{info.registrarLocation || 'Admin Building, Ground Floor'}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug break-words">{info.registrarHours || 'Mon–Fri: 8:00 AM – 5:00 PM'}</p>
            </div>
          </div>

          <div className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#102A71] flex items-center justify-center shrink-0 mt-0.5">
              <Phone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Contact Us</p>
              <p className="text-sm font-semibold text-[#001840] mt-0.5 leading-snug break-words">{info.phone || 'Contact the Registrar on campus'}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug break-all">{info.email || 'Email to be announced'}</p>
            </div>
          </div>
        </div>

        {/* Important Notice Banner */}
        {(info.importantNotice || info.importantDetail) && (
          <div className="bg-[#FFFDF0] border border-[#F5C400]/50 border-l-4 border-l-[#F5C400] rounded-xl px-4 py-3.5 mb-7 sm:mb-9 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-[#001840] shrink-0 mt-0.5" />
            <div className="min-w-0 text-xs sm:text-sm text-[#001840]/90 leading-relaxed space-y-1">
              {info.importantNotice && <p className="font-medium break-words">{info.importantNotice}</p>}
              {info.importantDetail && <p className="text-gray-600 break-words">{info.importantDetail}</p>}
            </div>
          </div>
        )}

        {/* Section Heading */}
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Step-by-Step Process
          </h2>
          <span className="text-xs font-medium text-gray-400">
            {steps.length} {steps.length === 1 ? 'step' : 'steps'}
          </span>
        </div>

        {/* Step Cards */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = ICONS[step.icon] || FileText;
            const isOpen = expanded === step.id;

            return (
              <div
                key={step.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${isOpen
                  ? "border-[#F5C400] shadow-sm ring-1 ring-[#F5C400]/30"
                  : "border-gray-200/90 hover:border-gray-300"
                  }`}
              >
                {/* Card Header */}
                <button
                  type="button"
                  aria-expanded={isOpen}
                  className="w-full text-left flex items-center gap-3.5 sm:gap-4 p-4 sm:p-5 cursor-pointer select-none hover:bg-gray-50/70 transition-colors"
                  onClick={() => toggle(step.id)}
                >
                  {/* Step number */}
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs sm:text-sm transition-colors ${isOpen ? "bg-[#001840] text-[#FFDC5F]" : "bg-[#EEF2FF] text-[#102A71]"
                    }`}>
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  {/* Icon (desktop) */}
                  <div className="hidden sm:flex w-10 h-10 rounded-xl items-center justify-center shrink-0 bg-gray-50 border border-gray-100 text-[#102A71]">
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#001840] text-sm sm:text-base leading-snug break-words">{step.title}</h3>
                    {step.estimatedTime && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="text-xs text-gray-500">{step.estimatedTime}</span>
                      </div>
                    )}
                  </div>

                  {/* Expand toggle */}
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-[#102A71] shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                  )}
                </button>

                {/* Expanded Content */}
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-4 border-t border-gray-100 space-y-4">
                    <p className="text-gray-600 text-sm leading-relaxed break-words">{step.description}</p>

                    {/* Pro Tip */}
                    {step.tips && (
                      <div className="bg-[#EEF2FF]/70 border border-[#102A71]/15 rounded-xl p-3.5">
                        <div className="flex gap-2.5">
                          <AlertCircle className="w-4 h-4 text-[#102A71] shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#001840] mb-0.5">Pro Tip</p>
                            <p className="text-xs text-gray-600 leading-relaxed break-words">{step.tips}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Requirements list */}
                    <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-200/80">
                      <h4 className="text-[#001840] text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                        <ClipboardList className="w-3.5 h-3.5 text-[#102A71] shrink-0" />
                        <span>Requirements / Instructions</span>
                      </h4>
                      <ul className="space-y-2.5">
                        {step.requirements.map((req, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
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
        <div className="mt-8 bg-gray-50/70 rounded-2xl border border-gray-200/80 p-5 sm:p-6">
          <h3 className="text-base font-bold text-[#001840] mb-3.5">Need Help?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-[#102A71]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900">Call Us</p>
                <p className="text-sm text-gray-600 break-words">{info.phone || 'Contact the Registrar on campus'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-[#102A71]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900">Email Us</p>
                <p className="text-sm text-gray-600 break-all">{info.email || 'Email to be announced'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
