import { useState, useEffect, useRef } from "react";
import { Clock, Smile, TrendingUp, Heart, Target, Users, GraduationCap, UserCheck } from "lucide-react";
import { API } from "../config/api";

function AnimatedCounter({ end, duration = 2000, suffix = "+" }) {
  const [count, setCount] = useState(0);
  const countRef = useRef(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const node = countRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasStarted) return;

    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentVal = Math.floor(easeProgress * end);

      setCount(currentVal);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    const frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [hasStarted, end, duration]);

  return (
    <span ref={countRef}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

export function Impact() {
  const [stats, setStats] = useState({
    activeUsers: 1228,
    students: 1205,
    faculty: 22,
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      try {
        const res = await fetch(`${API}/public-stats`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success) {
          setStats({
            activeUsers: Number(data.activeUsers) || 0,
            students: Number(data.students) || 0,
            faculty: Number(data.faculty) || 0,
          });
        }
      } catch (err) {
        console.warn("Could not load real-time stats, using cached stats:", err);
      }
    }

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);
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

        {/* Stats Banner: Active Users, Students, Faculty */}
        <div className="mt-16 bg-linear-to-r from-[#001840] via-[#102A71] to-[#001840] rounded-2xl p-8 sm:p-12 shadow-xl border border-[#F5C400]/20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 text-center divide-y sm:divide-y-0 sm:divide-x divide-white/10">
            <div className="pt-2 sm:pt-0">
              <div className="w-12 h-12 mx-auto rounded-xl bg-[#F5C400]/20 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-[#F5C400]" />
              </div>
              <div className="text-4xl sm:text-5xl font-extrabold text-[#F5C400] mb-2 tracking-tight">
                <AnimatedCounter end={stats.activeUsers} suffix="+" />
              </div>
              <div className="text-[#FFFDF0] font-semibold text-lg">Active Users</div>
              <p className="text-xs text-[#FFDC5F]/75 mt-1">Platform community</p>
            </div>

            <div className="pt-6 sm:pt-0 sm:px-4">
              <div className="w-12 h-12 mx-auto rounded-xl bg-[#F5C400]/20 flex items-center justify-center mb-3">
                <GraduationCap className="w-6 h-6 text-[#F5C400]" />
              </div>
              <div className="text-4xl sm:text-5xl font-extrabold text-[#F5C400] mb-2 tracking-tight">
                <AnimatedCounter end={stats.students} suffix="+" />
              </div>
              <div className="text-[#FFFDF0] font-semibold text-lg">Students</div>
              <p className="text-xs text-[#FFDC5F]/75 mt-1">JHS & SHS learners</p>
            </div>

            <div className="pt-6 sm:pt-0 sm:px-4">
              <div className="w-12 h-12 mx-auto rounded-xl bg-[#F5C400]/20 flex items-center justify-center mb-3">
                <UserCheck className="w-6 h-6 text-[#F5C400]" />
              </div>
              <div className="text-4xl sm:text-5xl font-extrabold text-[#F5C400] mb-2 tracking-tight">
                <AnimatedCounter end={stats.faculty} suffix="+" />
              </div>
              <div className="text-[#FFFDF0] font-semibold text-lg">Faculty & Staff</div>
              <p className="text-xs text-[#FFDC5F]/75 mt-1">Dedicated educators</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}