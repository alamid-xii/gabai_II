import { GraduationCap, Users, MapPinned, Globe } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function TargetUsers() {
  const users = [
    {
      icon: GraduationCap,
      title: "Incoming Freshmen",
      description: "New students beginning their Eastern Mindoro College journey"
    },
    {
      icon: Users,
      title: "Transfer Students",
      description: "Students transitioning from other institutions"
    },
    {
      icon: MapPinned,
      title: "Campus Visitors",
      description: "Prospective students and families exploring the campus"
    },
    {
      icon: Globe,
      title: "Remote Students",
      description: "Students from underserved or distant areas needing virtual access"
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
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1758270705518-b61b40527e76?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaXZlcnNlJTIwc3R1ZGVudHMlMjBzdHVkeWluZyUyMHRvZ2V0aGVyfGVufDF8fHx8MTc3MjA1MDI0Nnww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Diverse group of students studying together"
                className="w-full h-[600px] object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#001840]/50 to-transparent"></div>
            </div>

            {/* Floating Stats */}
            <div className="absolute bottom-8 left-8 right-8 grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <div className="text-2xl font-bold text-[#102A71]">100%</div>
                <div className="text-sm text-gray-600">Inclusive</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <div className="text-2xl font-bold text-[#102A71]">24/7</div>
                <div className="text-sm text-gray-600">Support</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
