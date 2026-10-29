import { useSchoolProfile } from "../hooks/useSchoolProfile";
import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  Download,
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
  RefreshCw,
  Share2,
  Printer,
} from "lucide-react";

import { API, BACKEND_URL } from '../config/api';
const ICONS = { FileText, ClipboardList, CreditCard, UserCheck, BookOpen, Camera };

export function EnrollmentGuide() {
  const { profile } = useSchoolProfile();
  const [guide, setGuide] = useState(null);
  const [completed, setCompleted] = useState(new Set());
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
      try { const saved = JSON.parse(localStorage.getItem(`enrollmentProgress_${data.revision}`) || '[]'); setCompleted(new Set(Array.isArray(saved) ? saved : [])); } catch { setCompleted(new Set()); }
    }).catch(error => { if (!controller.signal.aborted) setLoadError(error.message); });
    return () => controller.abort();
  }, [reload]);
  const steps = guide?.content.steps || [];
  const info = { ...guide?.content, ...(profile ? { phone: profile.phone, email: profile.email, registrarLocation: profile.registrarLocation, registrarHours: profile.registrarHours } : {}) };



  useEffect(() => {
    if (guide) { try { localStorage.setItem(`enrollmentProgress_${guide.revision}`, JSON.stringify([...completed])); } catch { /* Progress storage is optional. */ } }
  }, [completed, guide]);

  function toggle(id) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  function toggleComplete(id) {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function resetProgress() {
    if (confirm("Are you sure you want to reset your enrollment progress?")) {
      setCompleted(new Set());
      localStorage.removeItem(`enrollmentProgress_${guide.revision}`);
    }
  }

  function printGuide() {
    window.print();
  }

  function shareGuide() {
    if (navigator.share) {
      navigator.share({
        title: `${profile?.schoolName || 'School'} Enrollment Guide`,
        text: `Check out the enrollment guide for ${profile?.schoolName || 'the school'}`,
        url: window.location.href
      });
    } else {
      alert('Share link copied to clipboard!');
      navigator.clipboard.writeText(window.location.href);
    }
  }

  const completedCount = steps.filter(step => completed.has(step.id)).length;
  const progress = steps.length ? Math.round((completedCount / steps.length) * 100) : 0;
  if (!guide) return <div className="p-8 text-center bg-[#FFFDF0] min-h-screen"><p role="status">{loadError || 'Loading enrollment guide...'}</p>{loadError && <button onClick={() => { setLoadError(''); setReload(value => value + 1); }} className="mt-4 underline">Try again</button>}</div>;
  function downloadStep(step) {
    if (step.downloadUrl) { window.open(step.downloadUrl.startsWith('/uploads/') ? `${BACKEND_URL}${step.downloadUrl}` : step.downloadUrl, '_blank', 'noopener,noreferrer'); return; }
    const blob = new Blob([`${step.title}\n\n${step.description}\n\n${step.requirements.join('\n')}\n\n${step.tips}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `enrollment-step-${step.id}.txt`; link.click(); URL.revokeObjectURL(url);
  }
  const nextStep = steps.find(s => !completed.has(s.id));

  return (
    <div className="min-h-screen bg-[#FFFDF0]">
      

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">

        {/* Progress Tracker */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[#001840] font-bold text-lg">Enrollment Progress</h2>
            <span className="text-[#102A71] font-bold text-2xl">{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden shadow-inner">
            <div
              className="h-4 rounded-full bg-linear-to-r from-[#F5C400] to-[#FFDC5F] transition-all duration-500 shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">{completedCount} completed</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">{steps.length - completedCount} remaining</span>
            </div>
            {nextStep && (
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Next: {nextStep.title}</span>
              </div>
            )}
          </div>

          {/* Step indicators */}
          <div className="flex gap-2 mt-5 flex-wrap">
            {steps.map((s, index) => (
              <button
                key={s.id}
                onClick={() => setExpanded(s.id)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                  completed.has(s.id)
                    ? "bg-green-500 text-white shadow-lg"
                    : expanded === s.id
                    ? "bg-[#F5C400] text-[#001840] shadow-md"
                    : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                }`}
                title={s.title}
              >
                {completed.has(s.id) ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Important Info Cards */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-linear-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Enrollment Period</h3>
                <p className="text-sm text-blue-800">{info.enrollmentPeriod || 'Schedule to be announced'}</p>
                <p className="text-xs text-blue-700 mt-1">{info.enrollmentAudience}</p>
              </div>
            </div>
          </div>

          <div className="bg-linear-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">Registrar's Office</h3>
                <p className="text-sm text-green-800">{info.registrarLocation}</p>
                <p className="text-xs text-green-700 mt-1">{info.registrarHours}</p>
              </div>
            </div>
          </div>

          <div className="bg-linear-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-purple-900 mb-1">Contact Us</h3>
                <p className="text-sm text-purple-800">{info.phone || 'Contact the Registrar on campus'}</p>
                <p className="text-xs text-purple-700 mt-1">{info.email || 'Email to be announced'}</p>
              </div>
            </div>
          </div>

          <div className="bg-linear-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900 mb-1">Important</h3>
                <p className="text-sm text-orange-800">{info.importantNotice}</p>
                <p className="text-xs text-orange-700 mt-1">{info.importantDetail}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Step Cards */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = ICONS[step.icon] || FileText;
            const isOpen = expanded === step.id;
            const done = completed.has(step.id);

            return (
              <div
                key={step.id}
                className={`bg-white rounded-2xl shadow-lg border-2 transition-all duration-200 overflow-hidden ${
                  done ? "border-green-400" : isOpen ? "border-[#F5C400]" : "border-gray-100"
                }`}
              >
                {/* Card Header */}
                <div
                  className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 cursor-pointer select-none hover:bg-gray-50 transition-colors"
                  onClick={() => toggle(step.id)}
                >
                  {/* Step number */}
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 font-bold text-sm transition-all ${
                      done ? "bg-green-500 text-white shadow-lg" : "bg-[#102A71] text-[#FFDC5F]"
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-6 h-6" /> : String(index + 1).padStart(2, '0')}
                  </div>

                  {/* Icon */}
                  <div
                    className={`hidden sm:flex w-12 h-12 rounded-xl items-center justify-center shrink-0 bg-linear-to-br ${"from-[#001840] to-[#102A71]"} shadow-md`}
                  >
                    <Icon className="w-6 h-6 text-[#FFDC5F]" />
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#001840] text-base sm:text-lg">{step.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{step.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{step.estimatedTime}</span>
                    </div>
                  </div>

                  {/* Expand toggle */}
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                  )}
                </div>

                {/* Expanded Content */}
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 border-t border-gray-100">
                    <p className="text-gray-700 text-sm mt-4 mb-4 leading-relaxed">{step.description}</p>

                    {/* Pro Tip */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="flex gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-1">Pro Tip</p>
                          <p className="text-xs text-blue-800">{step.tips}</p>
                        </div>
                      </div>
                    </div>

                    {/* Requirements list */}
                    <div className="bg-[#FFFDF0] rounded-xl p-4 mb-4 border border-gray-200">
                      <h4 className="text-[#001840] text-sm font-bold mb-3 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" />
                        Requirements / Instructions:
                      </h4>
                      <ul className="space-y-2.5">
                        {step.requirements.map((req, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                            <div className="w-5 h-5 rounded-full bg-[#F5C400] flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-[#001840] text-xs font-bold">{i + 1}</span>
                            </div>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button onClick={() => downloadStep(step)} className="flex items-center justify-center gap-2 bg-[#F5C400] hover:bg-[#FFDC5F] text-[#001840] px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg">
                        <Download className="w-4 h-4" />
                        {step.downloadLabel}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComplete(step.id);
                        }}
                        className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                          done
                            ? "border-green-500 bg-green-50 text-green-700 hover:bg-green-100"
                            : "border-[#102A71] text-[#102A71] hover:bg-[#102A71] hover:text-white"
                        }`}
                      >
                        {done ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" /> Completed
                          </>
                        ) : (
                          <>
                            <Circle className="w-4 h-4" /> Mark as Complete
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* All done banner */}
        {steps.length > 0 && completedCount === steps.length && (
          <div className="mt-8 bg-linear-to-r from-green-500 to-green-600 rounded-2xl p-8 text-center shadow-2xl animate-fadeIn">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-3">{info.completionTitle}</h3>
            <p className="text-white text-lg mb-4">
              {info.completionMessage}
            </p>
            <p className="text-white/90 text-sm">
              {info.completionDetail}
            </p>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-[#001840] mb-4">Need Help?</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-[#102A71] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Call Us</p>
                <p className="text-sm text-gray-600">{info.phone || 'Contact the Registrar on campus'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#102A71] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Email Us</p>
                <p className="text-sm text-gray-600">{info.email || 'Email to be announced'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
