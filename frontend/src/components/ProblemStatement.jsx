import { AlertCircle, FileQuestion, MapPinOff, Navigation, ArrowRight } from "lucide-react";
import { Link } from "react-router";

export function ProblemStatement() {
  const problems = [
    {
      num: "01",
      icon: FileQuestion,
      title: "Scattered Information",
      description: "Admission requirements and deadlines are hard to track across separate announcements and offices."
    },
    {
      num: "02",
      icon: AlertCircle,
      title: "Confusing Procedures",
      description: "Multi-step enrollment stages create uncertainty for incoming JHS, SHS, and transferee students."
    },
    {
      num: "03",
      icon: MapPinOff,
      title: "Campus Navigation",
      description: "First-time visitors struggle to locate buildings, registrar windows, and classrooms on campus."
    },
    {
      num: "04",
      icon: Navigation,
      title: "Limited Remote Access",
      description: "Students living far from campus cannot easily preview facilities before enrollment day."
    }
  ];

  return (
    <section className="bg-[#FFFDF0] py-16 sm:py-20 lg:py-24 border-b border-[#001840]/5">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        {/* Editorial Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 lg:mb-14">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#102A71] bg-[#102A71]/8 px-3.5 py-1.5 rounded-full mb-4">
              Why GabAI Exists
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#001840] tracking-tight leading-tight">
              Built to Remove Enrollment Guesswork
            </h2>
          </div>
          <p className="text-base sm:text-lg text-gray-600 max-w-md leading-relaxed">
            Starting at Eastern Mindoro College shouldn&apos;t feel overwhelming. Here are the everyday bottlenecks GabAI eliminates.
          </p>
        </div>

        {/* 4-Column Numbered Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {problems.map((problem) => {
            const Icon = problem.icon;
            return (
              <div
                key={problem.num}
                className="group relative bg-white p-6 rounded-2xl border border-[#001840]/10 hover:border-[#102A71]/40 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="bg-[#FFF4C2] group-hover:bg-[#F5C400] w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-200">
                      <Icon className="w-5 h-5 text-[#001840]" />
                    </div>
                    <span className="text-xs font-bold tracking-widest text-gray-300 group-hover:text-[#102A71] transition-colors">
                      {problem.num}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#001840] mb-2">
                    {problem.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {problem.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sleek Bottom Callout Strip */}
        <div className="mt-8 bg-[#001840] rounded-2xl px-6 py-5 sm:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-[#102A71]">
          <p className="text-sm sm:text-base text-[#FFFDF0] font-medium">
            <span className="text-[#F5C400] font-bold">The result:</span> Fewer missed deadlines, faster document verification, and a stress-free first day on campus.
          </p>
          <Link
            to="/enrollment-guide"
            className="shrink-0 inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#001840] bg-[#F5C400] hover:bg-[#FFDC5F] px-4 py-2.5 rounded-xl transition-colors"
          >
            View Guide
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
