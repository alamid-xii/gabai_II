import { AlertCircle, FileQuestion, MapPinOff, Navigation } from "lucide-react";

export function ProblemStatement() {
  const problems = [
    {
      icon: FileQuestion,
      title: "Scattered Information",
      description: "Admission information is hard to find and difficult to follow across multiple sources"
    },
    {
      icon: AlertCircle,
      title: "Confusing Procedures",
      description: "Multi-step enrollment procedures create confusion and uncertainty for new students"
    },
    {
      icon: MapPinOff,
      title: "Campus Navigation",
      description: "Difficulty understanding campus layout before visiting or during first days"
    },
    {
      icon: Navigation,
      title: "Limited Access",
      description: "Limited access to physical campus tours, especially for remote students"
    }
  ];

  return (
    <section className="bg-[#FFFDF0] py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#001840] mb-6">
            Common Challenges Faced by Incoming Students
          </h2>
          <p className="text-lg text-gray-700">
            Starting your college journey shouldn't be overwhelming. Here are the problems GabAI solves:
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((problem, index) => {
            const Icon = problem.icon;
            return (
              <div
                key={index}
                className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100"
              >
                <div className="bg-[#FFDC5F] w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-7 h-7 text-[#001840]" />
                </div>
                <h3 className="text-xl font-semibold text-[#001840] mb-3">
                  {problem.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {problem.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Highlight Box */}
        <div className="mt-12 bg-[#102A71] p-8 rounded-2xl text-center">
          <p className="text-[#FFDC5F] text-lg font-medium">
            These challenges can lead to missed deadlines, increased stress, and a difficult start to college life
          </p>
        </div>
      </div>
    </section>
  );
}
