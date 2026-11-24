import { GraduationCap, Users, MapPinned } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function TargetUsers() {
  const users = [
    {
      icon: GraduationCap,
      title: "Incoming Grade 7 & Grade 11 Students",
      description: "New Junior & Senior High School students beginning their Eastern Mindoro College journey"
    },
    {
      icon: Users,
      title: "Continuing & Transfer Students",
      description: "Returning EMC learners and transferees transitioning from other schools"
    },
    {
      icon: MapPinned,
      title: "Parents & Campus Visitors",
      description: "Families and prospective students exploring campus buildings and admission requirements"
    }
  ];

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <div className="inline-block bg-[#FFFDF0] px-4 py-2 rounded-full mb-6">
              <span className="text-[#102A71] font-semibold">Who Benefits?</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#001840] mb-6">
              Built for Every Student
            </h2>
            
            <p className="text-lg text-gray-700 mb-8">
              GabAI is designed to support all students at Eastern Mindoro College, ensuring accessible and inclusive education for everyone.
            </p>

            <div className="space-y-6">
              {users.map((user, index) => {
                const Icon = user.icon;
                return (
                  <div
                    key={index}
                    className="flex gap-4 items-start bg-[#FFFDF0] p-6 rounded-xl hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="bg-[#F5C400] w-12 h-12 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-[#001840]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-[#001840] mb-2">
                        {user.title}
                      </h3>
                      <p className="text-gray-600">
                        {user.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 p-6 bg-[#102A71] rounded-xl">
              <p className="text-[#FFFDF0] leading-relaxed">
                <span className="text-[#F5C400] font-semibold">Accessibility First:</span> We believe in reducing stress, eliminating confusion, and creating equal opportunities for all students, regardless of their background or location.
              </p>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
              <ImageWithFallback
                src="/emc_campus_map.webp"
                alt="Eastern Mindoro College Campus Map"
                className="w-full h-[520px] sm:h-[580px] object-contain bg-white p-3"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#001840]/60 via-[#001840]/15 to-transparent"></div>
            </div>

            {/* Floating Stats */}
            <div className="absolute bottom-8 left-8 right-8 grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <div className="text-2xl font-bold text-[#102A71]">JHS &amp; SHS</div>
                <div className="text-sm text-gray-600">Grades 7 to 12</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <div className="text-2xl font-bold text-[#102A71]">24/7</div>
                <div className="text-sm text-gray-600">AI &amp; Virtual Tour</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
