import { useSchoolProfile } from "../hooks/useSchoolProfile";
import { Link } from "react-router";
import {
  GraduationCap,
  Sparkles,
  Bot,
  Compass,
  FileCheck2,
  BookOpen,
  Award,
  Users,
  ShieldCheck,
  Building2,
  ArrowRight,
  MessageCircle,
  Lightbulb,
  HeartHandshake,
} from "lucide-react";

export function About() {
  const { profile } = useSchoolProfile();
  const schoolName = profile?.schoolName || "Eastern Mindoro College, Inc.";
  const tagline = profile?.tagline || "Excellence in Academics and Character Formation";

  const pillars = [
    {
      icon: Bot,
      title: "AI-Powered Admissions Assistant",
      desc: "Instant, natural-language answers to questions about admissions, requirements, tuition, and school policies in both English and Filipino.",
      badge: "Natural Language AI",
    },
    {
      icon: Compass,
      title: "360° Virtual Campus Tour",
      desc: "Explore every corner of the EMC campus through high-definition 360-degree interactive panoramic views and voiceover building narrations.",
      badge: "Interactive Exploration",
    },
    {
      icon: FileCheck2,
      title: "Digital Enrollment Guide",
      desc: "A structured, step-by-step checklist tracking document submissions, office visits, and requirements from start to final enrollment.",
      badge: "Seamless Checklist",
    },
    {
      icon: Users,
      title: "Integrated Student Portal",
      desc: "Centralized access to class schedules, section assignments, academic notifications, and streamlined enrollment validation.",
      badge: "Connected Campus",
    },
  ];

  const academicPrograms = [
    {
      title: "Junior High School (JHS)",
      grades: "Grades 7 to 10",
      description:
        "Comprehensive foundational education fostering critical thinking, ethical values, and creative problem solving.",
      tags: ["Regular Curriculum", "Special Science Class (SSC)"],
    },
    {
      title: "Senior High School (SHS)",
      grades: "Grades 11 to 12",
      description:
        "DepEd-recognized tracks tailored to prepare students for college excellence, entrepreneurship, or employment.",
      tags: ["STEM Strand", "ABM Strand", "HUMSS Strand", "TVL Track"],
    },
  ];

  const coreValues = [
    {
      icon: Award,
      name: "Academic Excellence",
      detail: "Commitment to rigorous academic standards and holistic intellectual development.",
    },
    {
      icon: ShieldCheck,
      name: "Integrity & Honor",
      detail: "Cultivating honesty, moral responsibility, and transparency in all aspects of life.",
    },
    {
      icon: HeartHandshake,
      name: "Community & Service",
      detail: "Instilling deep civic consciousness, cultural pride, and service to society.",
    },
    {
      icon: Lightbulb,
      name: "Innovation & Technology",
      detail: "Pioneering digital solutions like GabAI to enhance the learning and school experience.",
    },
  ];

  return (
    <main className="bg-[#FFFDF0] min-h-screen text-[#001840]">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-linear-to-br from-[#001840] via-[#102A71] to-[#001840] text-white py-20 lg:py-28">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#F5C400_1px,transparent_1px)] [background-size:20px_20px]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-[#F5C400]/20 border border-[#F5C400]/40 px-4 py-1.5 rounded-full mb-6 text-sm text-[#FFDC5F] font-semibold animate-fadeIn">
            <Sparkles className="w-4 h-4 text-[#F5C400]" />
            About GabAI & Eastern Mindoro College
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 max-w-4xl mx-auto leading-tight">
            Guiding Every Student with <span className="text-[#F5C400]">Innovation</span> & <span className="text-[#FFDC5F]">Excellence</span>
          </h1>

          <p className="text-base sm:text-xl text-gray-200 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            Discover the legacy of {schoolName} and how GabAI is redefining educational admissions through artificial intelligence and interactive digital exploration.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/ar-navigation"
              className="inline-flex items-center gap-2 bg-[#F5C400] hover:bg-[#FFDC5F] text-[#001840] font-bold px-6 py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <Compass className="w-5 h-5" />
              Explore Campus Tour
            </Link>
            <Link
              to="/enrollment-guide"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold px-6 py-3.5 rounded-xl transition-all backdrop-blur-xs"
            >
              <FileCheck2 className="w-5 h-5 text-[#F5C400]" />
              Enrollment Guide
            </Link>
          </div>
        </div>
      </section>

      {/* ── Institution Heritage & Overview ── */}
      <section className="py-16 lg:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <div className="inline-block bg-[#102A71]/10 px-3.5 py-1 rounded-full text-xs font-bold text-[#102A71] tracking-wider uppercase mb-4">
              Our Educational Heritage
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#001840] mb-6 leading-tight">
              A Tradition of Quality Education in Mindoro
            </h2>
            <p className="text-gray-700 text-base sm:text-lg leading-relaxed mb-6">
              <strong className="text-[#001840]">{schoolName}</strong> has stood as a beacon of learning, dedicated to cultivating intellectual curiosity, moral integrity, and social responsibility among generations of Mindoreños.
            </p>
            <p className="text-gray-600 leading-relaxed mb-8">
              {tagline}. From junior high school to pre-university preparation in senior high, our institution provides learners with modern curricula, dedicated faculty mentorship, and a nurturing environment designed to unlock each student's highest potential.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-[#F5C400]/30 shadow-xs">
                <p className="text-3xl font-extrabold text-[#102A71] mb-1">JHS & SHS</p>
                <p className="text-xs text-gray-500 font-medium">Comprehensive Programs</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-[#F5C400]/30 shadow-xs">
                <p className="text-3xl font-extrabold text-[#F5C400]">24/7</p>
                <p className="text-xs text-gray-500 font-medium">Digital AI Guidance</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-[#001840]">
              <img
                src="/emc_building.jpg"
                alt="Eastern Mindoro College Campus Building"
                className="w-full h-80 sm:h-96 object-cover hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#001840] via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <span className="bg-[#F5C400] text-[#001840] text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider inline-block mb-2">
                  Campus Facilities
                </span>
                <p className="text-lg font-bold leading-snug">
                  Modern classrooms, laboratories, and vibrant campus life at EMC.
                </p>
              </div>
            </div>
            
            {/* Floating Logo Badge */}
            <div className="absolute -bottom-6 -left-6 bg-white p-3 rounded-2xl shadow-xl border border-gray-100 hidden sm:flex items-center gap-3">
              <img src="/GabAi_Logo.png" alt="GabAI Logo" className="w-12 h-12 rounded-xl object-contain shadow" />
              <div>
                <p className="text-xs font-bold text-[#001840]">GabAI Smart Campus</p>
                <p className="text-[10px] text-gray-500">Official Admissions Tech</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The GabAI Solution ── */}
      <section className="bg-white py-16 lg:py-24 border-y border-[#F5C400]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-block bg-[#F5C400]/20 px-4 py-1.5 rounded-full mb-4">
              <span className="text-[#102A71] text-xs font-bold uppercase tracking-wider">
                Digital Transformation
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#001840] mb-4">
              What is GabAI?
            </h2>
            <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
              <strong>GabAI</strong> (derived from the Filipino word <em>Gabay</em>, meaning "guide") is Eastern Mindoro College's next-generation digital companion. It combines natural language processing, 360-degree virtual tour technology, and automated enrollment workflow to eliminate queues, answer student inquiries, and guide future Mindoreños effortlessly.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={idx}
                  className="bg-[#FFFDF0] border border-[#F5C400]/30 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#102A71] to-[#001840] text-[#FFDC5F] flex items-center justify-center mb-5 shadow-md">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold text-[#102A71] bg-[#102A71]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block mb-3">
                      {pillar.badge}
                    </span>
                    <h3 className="text-xl font-bold text-[#001840] mb-3 leading-snug">
                      {pillar.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Academic Offerings ── */}
      <section className="py-16 lg:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-block bg-[#102A71]/10 px-3.5 py-1 rounded-full text-xs font-bold text-[#102A71] tracking-wider uppercase mb-3">
            Academics
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#001840] mb-4">
            Curriculum & Program Pathways
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Structured for excellence, college readiness, and career advancement.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {academicPrograms.map((prog, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl p-8 border-2 border-[#102A71]/10 shadow-lg hover:border-[#F5C400] transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider bg-[#F5C400] text-[#001840] px-3 py-1 rounded-lg">
                  {prog.grades}
                </span>
                <BookOpen className="w-6 h-6 text-[#102A71]" />
              </div>
              <h3 className="text-2xl font-bold text-[#001840] mb-3">{prog.title}</h3>
              <p className="text-gray-600 leading-relaxed mb-6">{prog.description}</p>
              
              <div className="border-t border-gray-100 pt-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Key Strands & Tracks:
                </p>
                <div className="flex flex-wrap gap-2">
                  {prog.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="bg-[#FFFDF0] border border-[#F5C400]/40 text-[#001840] text-xs font-medium px-3 py-1.5 rounded-xl"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Core Values ── */}
      <section className="bg-linear-to-b from-[#FFFDF0] to-white py-16 lg:py-20 border-t border-[#F5C400]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-bold text-[#001840] mb-3">Our Core Principles</h2>
            <p className="text-gray-600 text-sm">
              The foundational pillars guiding Eastern Mindoro College and the GabAI platform.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreValues.map((val, idx) => {
              const Icon = val.icon;
              return (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#F5C400]/20 text-[#001840] flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-[#102A71]" />
                  </div>
                  <h4 className="font-bold text-lg text-[#001840] mb-2">{val.name}</h4>
                  <p className="text-gray-600 text-xs leading-relaxed">{val.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Call To Action ── */}
      <section className="bg-linear-to-r from-[#001840] via-[#102A71] to-[#001840] text-white py-16 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="w-14 h-14 bg-[#F5C400] text-[#001840] rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-xl">
            <MessageCircle className="w-7 h-7" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            Have Questions About Admissions?
          </h2>
          <p className="text-gray-200 text-sm sm:text-base leading-relaxed mb-8">
            Click the floating GabAI assistant button at the bottom-right of your screen anytime to ask admissions questions in natural language, or explore the enrollment guide for requirements.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/enrollment-guide"
              className="bg-[#F5C400] hover:bg-[#FFDC5F] text-[#001840] font-bold px-6 py-3.5 rounded-xl transition-all shadow-md inline-flex items-center gap-2"
            >
              Check Requirements <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/signup"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold px-6 py-3.5 rounded-xl transition-all"
            >
              Create Student Account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
