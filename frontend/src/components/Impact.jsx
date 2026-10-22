import { Clock, Smile, TrendingUp, Heart, Target, GraduationCap } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function Impact() {
  const benefits = [
    {
      icon: Clock,
      title: "Faster Enrollment",
      description: "Complete the enrollment process more quickly with guided steps and instant answers"
    },
    {
      icon: Smile,
      title: "Reduced Stress",
      description: "Clear information and easy navigation eliminate confusion and anxiety"
    },
    {
      icon: TrendingUp,
      title: "Better Experience",
      description: "Improved student satisfaction and confidence from day one"
    },
    {
      icon: Heart,
      title: "Strong First Impression",
      description: "Modern, supportive technology showcases EMC's commitment to students"
    },
    {
      icon: Target,
      title: "SDG 4 Aligned",
      description: "Supports inclusive and equitable quality education for all"
    }
  ];

  return (
    <section className="bg-[#FFFDF0] py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#001840] mb-6">
            Impact & Benefits
          </h2>
          <p className="text-lg text-gray-700">
            Real outcomes that make a difference in your college journey
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="bg-linear-to-br from-[#F5C400] to-[#FFDC5F] w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-7 h-7 text-[#001840]" />
                </div>
                <h3 className="text-xl font-semibold text-[#001840] mb-3">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            );
          })}
          
          {/* Featured Card - SDG Highlight */}
          <div className="sm:col-span-2 lg:col-span-1 bg-[#102A71] p-8 rounded-2xl text-white flex flex-col justify-center">
            <div className="bg-[#F5C400] w-14 h-14 rounded-xl flex items-center justify-center mb-4">
              <Target className="w-7 h-7 text-[#001840]" />
            </div>
            <h3 className="text-xl font-semibold mb-3">
              Supporting SDG 4
            </h3>
            <p className="text-[#FFFDF0] leading-relaxed">
              Quality Education: Ensuring inclusive and equitable quality education and promoting lifelong learning opportunities for all
            </p>
          </div>
        </div>

        {/* Success Story Section */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="grid lg:grid-cols-2">
            <div className="relative h-64 lg:h-auto">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1758270705902-f50dde4add9f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGNvbGxlZ2UlMjBmcmVzaG1hbnxlbnwxfHx8fDE3NzIwODM4MTl8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Happy college freshman"
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="p-8 lg:p-12 flex flex-col justify-center">
              <div className="inline-block bg-[#FFFDF0] px-4 py-2 rounded-full mb-6 self-start">
                <span className="text-[#102A71] font-semibold">Student Success</span>
              </div>
              
              <blockquote className="text-xl text-gray-700 mb-6 leading-relaxed">
                "GabAI made my enrollment process so much easier. I was able to get all my questions answered instantly and navigate the campus before I even arrived. It really reduced my anxiety about starting college."
              </blockquote>
              
              <div className="flex items-center gap-4">
                <div className="bg-[#F5C400] w-12 h-12 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-[#001840]" />
                </div>
                <div>
                  <div className="font-semibold text-[#001840]">Maria Santos</div>
                  <div className="text-sm text-gray-600">Freshman Student, EMC</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Banner */}
        <div className="mt-16 bg-linear-to-r from-[#001840] to-[#102A71] rounded-2xl p-12">
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-[#F5C400] mb-2">85%</div>
              <div className="text-[#FFFDF0]">Faster enrollment completion</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#F5C400] mb-2">90%</div>
              <div className="text-[#FFFDF0]">Student satisfaction rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#F5C400] mb-2">Zero</div>
              <div className="text-[#FFFDF0]">Missed deadlines</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}