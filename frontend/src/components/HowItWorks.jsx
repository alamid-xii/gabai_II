import { MessageCircle, FileText, Smartphone, CheckCircle } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: MessageCircle,
      title: "Ask Questions",
      description: "Start a conversation with the GabAI chatbot and ask any admission-related questions in natural language"
    },
    {
      number: "02",
      icon: FileText,
      title: "Review Requirements",
      description: "Get personalized admission requirements, document checklists, and important timelines for your program"
    },
    {
      number: "03",
      icon: Smartphone,
      title: "Explore with Virtual Tour",
      description: "Use the 360° virtual campus tour to explore buildings, offices, and facilities before you even arrive"
    },
    {
      number: "04",
      icon: CheckCircle,
      title: "Complete Enrollment",
      description: "Follow the guided enrollment steps with progress tracking to ensure you don't miss any important tasks"
    }
  ];

  return (
    <section className="bg-[#FFFDF0] py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#001840] mb-6">
            How It Works
          </h2>
          <p className="text-lg text-gray-700">
            Four simple steps to a stress-free enrollment experience
          </p>
        </div>

        <div className="relative">
          {/* Connection Lines - Hidden on mobile */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-1 bg-linear-to-r from-[#F5C400] via-[#FFDC5F] to-[#F5C400] opacity-30 mx-24"></div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative">
                  <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-200 h-full">
                    {/* Step Number */}
                    <div className="bg-[#001840] text-[#F5C400] w-16 h-16 rounded-full flex items-center justify-center mb-6 font-bold text-xl mx-auto relative z-10">
                      {step.number}
                    </div>

                    {/* Icon */}
                    <div className="bg-[#FFFDF0] w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-7 h-7 text-[#102A71]" />
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold text-[#001840] mb-3 text-center">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 text-center leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Arrow - Hidden on last item and mobile */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-24 -right-4 z-20">
                      <div className="w-8 h-8 bg-[#F5C400] rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#001840]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-lg text-gray-700 mb-6">
            Ready to simplify your enrollment process?
          </p>
          <button className="bg-[#102A71] hover:bg-[#1a3a8f] text-white px-8 py-4 rounded-lg font-semibold transition-colors duration-200">
            Start Your Journey
          </button>
        </div>
      </div>
    </section>
  );
}
