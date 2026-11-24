import { MessageSquare, Camera, Map, ClipboardCheck, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router";

export function Solution() {
  const features = [
    {
      icon: MessageSquare,
      tag: "AI Assistant",
      title: "NLP-Powered Chatbot",
      description: "Ask admission questions in English or Taglish and get instant answers backed by official EMC guidelines.",
      to: "/qa",
      cta: "Ask GabAI",
      featured: true,
    },
    {
      icon: Camera,
      tag: "Immersive",
      title: "360° Virtual Campus Tour",
      description: "Preview campus buildings, offices, and facilities through interactive 360° panoramic views before visiting.",
      to: "/ar-navigation",
      cta: "Open Virtual Tour",
      featured: true,
    },
    {
      icon: Map,
      tag: "Wayfinding",
      title: "Interactive Campus Map",
      description: "Click building pins to inspect office hours, locations, and facility details in seconds.",
      to: "/ar-navigation",
      cta: "Explore Campus Map",
      featured: false,
    },
    {
      icon: ClipboardCheck,
      tag: "Step-by-Step",
      title: "Digital Enrollment Guide",
      description: "Clear checklists for JHS & SHS requirements, track eligibility, and online application stages.",
      to: "/enrollment-guide",
      cta: "View Enrollment Guide",
      featured: false,
    },
  ];

  return (
    <section className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-14">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#102A71] bg-[#EEF2FF] px-3.5 py-1.5 rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#F5C400]" />
            The Solution
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#001840] tracking-tight mb-4">
            Everything You Need in One Portal
          </h2>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
            GabAI brings together intelligent admission guidance, online enrollment, and 360° campus navigation for Eastern Mindoro College.
          </p>
        </div>

        {/* 2x2 Asymmetric Contrast Bento Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const dark = feature.featured;
            return (
              <Link
                key={index}
                to={feature.to}
                className={`group rounded-2xl p-7 sm:p-8 flex flex-col justify-between transition-all duration-200 border ${
                  dark
                    ? "bg-[#001840] text-white border-[#102A71] hover:border-[#F5C400]/60 shadow-md hover:shadow-xl"
                    : "bg-[#FFFDF0] text-[#001840] border-[#001840]/10 hover:border-[#102A71]/40 shadow-2xs hover:shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        dark ? "bg-[#F5C400] text-[#001840]" : "bg-[#102A71] text-[#F5C400]"
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        dark
                          ? "bg-white/10 text-[#FFDC5F]"
                          : "bg-[#102A71]/8 text-[#102A71]"
                      }`}
                    >
                      {feature.tag}
                    </span>
                  </div>
                  <h3
                    className={`text-xl sm:text-2xl font-bold mb-3 transition-colors ${
                      dark ? "text-white group-hover:text-[#F5C400]" : "text-[#001840] group-hover:text-[#102A71]"
                    }`}
                  >
                    {feature.title}
                  </h3>
                  <p className={`text-sm sm:text-base leading-relaxed ${dark ? "text-gray-200" : "text-gray-600"}`}>
                    {feature.description}
                  </p>
                </div>

                <div
                  className={`mt-6 inline-flex items-center gap-2 text-sm font-bold ${
                    dark ? "text-[#F5C400] group-hover:text-[#FFDC5F]" : "text-[#102A71]"
                  }`}
                >
                  <span>{feature.cta}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Clean CTA Banner */}
        <div className="bg-linear-to-r from-[#001840] to-[#102A71] rounded-2xl p-8 sm:p-10 flex flex-col lg:flex-row items-center justify-between gap-6 border border-[#102A71]">
          <div className="text-center lg:text-left">
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Ready to Start Your EMC Enrollment?
            </h3>
            <p className="text-[#FFDC5F] text-sm sm:text-base max-w-xl">
              Complete your JHS or SHS application online and track your status from submission to section assignment.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <Link
              to="/enroll"
              className="bg-[#F5C400] hover:bg-[#FFDC5F] text-[#001840] px-6 py-3.5 rounded-xl font-bold text-sm transition-colors duration-200 shadow-sm"
            >
              Get Started Now
            </Link>
            <Link
              to="/qa"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/25 px-6 py-3.5 rounded-xl font-semibold text-sm transition-colors duration-200"
            >
              Ask a Question
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
