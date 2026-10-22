import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "react-router";

const heroImage = "/emc_building.jpg";
const emcLogo = "/emc_logo_nobg.png";

export function Hero() {
  return (
    <section className="relative text-white overflow-hidden min-h-[620px] sm:min-h-screen flex flex-col justify-center">
      {/* Full Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Dr. Angel Francisco Hall - Eastern Mindoro College"
          className="w-full h-full object-cover object-[center_top] scale-[4] sm:scale-[3.25] lg:scale-[1.5] lg:-translate-y-8 origin-top transition-transform duration-700"
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-[#001840] opacity-80" />
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-r from-[#001840] via-[#001840]/70 to-transparent" />
      </div>

      {/* EMC Logo Watermark — half visible on left edge */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none select-none"
        style={{ transform: "translateY(-50%) translateX(-50%)" }}
      >
        <img
          src={emcLogo}
          alt="Eastern Mindoro College Logo"
          className="w-[700px] h-[700px] object-contain rounded-full"
          style={{ opacity: 0.08 }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-10 sm:px-6 lg:px-8 py-24 lg:py-32 -translate-y-8 lg:-translate-y-12">
        <div className="max-w-2xl lg:max-w-3xl space-y-8">
          

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight drop-shadow-lg">
            Navigate Your{" "}
            <span className="text-[#F5C400]">EMC Journey</span>{" "}
            with Confidence
          </h1>

          {/* Subtext */}
          <p className="text-lg sm:text-xl text-[#FFDC5F] leading-relaxed max-w-xl">
            A smart admission and campus guide powered by Natural Language
            Processing and Campus Virtual Tour (360 images) to simplify enrollment and campus
            navigation at Eastern Mindoro College.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Link
              to="/enrollment-guide"
              className="bg-[#F5C400] hover:bg-[#FFDC5F] text-[#001840] px-8 py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Explore Admissions
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              to="/ar-navigation"
              className="bg-transparent hover:bg-[#102A71]/60 text-white px-8 py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 border-2 border-white/40 hover:border-[#FFDC5F]"
            >
              Try Campus Navigation
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/20 max-w-sm">
            <div>
              <div className="text-3xl font-bold text-[#F5C400]">24/7</div>
              <div className="text-sm text-[#FFDC5F] mt-1">Available</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#F5C400]">360°</div>
              <div className="text-sm text-[#FFDC5F] mt-1">Virtual Tour</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#F5C400]">RAG</div>
              <div className="text-sm text-[#FFDC5F] mt-1">Chatbot</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Virtual Tour Card — bottom right */}
      <div className="absolute bottom-42 right-8 lg:right-16 z-10 hidden md:block">
        <div className="bg-[#FFFDF0] p-5 rounded-xl shadow-2xl max-w-xs border border-[#F5C400]/30">
          <div className="flex items-start gap-3">
            <div className="bg-[#F5C400] p-3 rounded-lg shrink-0">
              <MapPin className="w-5 h-5 text-[#001840]" />
            </div>
            <div>
              <h4 className="font-semibold text-[#001840]">Campus Virtual Tour Active</h4>
              <p className="text-sm text-gray-600 mt-1">Explore campus with 360° images</p>
            </div>
          </div>
        </div>
      </div>

      {/* Wave Divider */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <svg viewBox="0 0 1440 100" className="w-full h-[72px] md:h-[120px]" preserveAspectRatio="none">
          <path
            fill="#FFFDF0"
            d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,100L1360,100C1280,100,1120,100,960,100C800,100,640,100,480,100C320,100,160,100,80,100L0,100Z"
          />
        </svg>
      </div>
    </section>
  );
}