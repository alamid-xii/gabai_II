import { MessageSquare, Camera, Map, ClipboardCheck } from "lucide-react";
import { Link } from "react-router";

export function Solution() {
  const features = [
    {
      icon: MessageSquare,
      title: "NLP-Powered Chatbot",
      description: "Ask admission questions naturally and receive instant, accurate responses tailored to your needs",
      color: "bg-[#F5C400]"
    },
    {
      icon: Camera,
      title: "360° Virtual Campus Tour",
      description: "Explore campus buildings, offices, and facilities through immersive 360° virtual tour images",
      color: "bg-[#FFDC5F]"
    },
    {
      icon: Map,
      title: "Interactive Campus Map",
      description: "Clickable building information, route previews, and facility details at your fingertips",
      color: "bg-[#F5C400]"
    },
    {
      icon: ClipboardCheck,
      title: "Digital Enrollment Guide",
      description: "Step-by-step checklist for documents, offices, and enrollment stages with progress tracking",
      color: "bg-[#FFDC5F]"
    }
  ];

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block bg-[#FFFDF0] px-4 py-2 rounded-full mb-6">
            <span className="text-[#102A71] font-semibold">The Solution</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#001840] mb-6">
            What is GabAI?
          </h2>
          <p className="text-lg text-gray-700">
            An all-in-one digital admission companion for Eastern Mindoro College that combines artificial intelligence with 360° virtual campus tour technology
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-[#102A71] p-8 rounded-2xl text-white hover:scale-[1.02] transition-transform duration-200"
              >
                <div className={`${feature.color} w-16 h-16 rounded-xl flex items-center justify-center mb-6`}>
                  <Icon className="w-8 h-8 text-[#001840]" />
                </div>
                <h3 className="text-2xl font-bold mb-4">
                  {feature.title}
                </h3>
                <p className="text-[#FFFDF0] text-lg leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA Banner */}
        <div className="bg-linear-to-r from-[#001840] to-[#102A71] rounded-2xl p-12 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Experience the Future of Admissions
          </h3>
          <p className="text-[#FFDC5F] text-lg mb-8 max-w-2xl mx-auto">
            GabAI combines cutting-edge technology with student-centered design to make your enrollment journey seamless
          </p>
          <Link to="/enroll" className="inline-block">
            <button className="bg-[#F5C400] hover:bg-[#FFDC5F] text-[#001840] px-8 py-4 rounded-lg font-semibold transition-colors duration-200">
              Get Started Now
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}