import { Link, useNavigate } from "react-router";
import { User, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Navbar } from "../../components/Navbar";

export function TeacherProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleViewChange = (view) => {
    if (view === "sections") navigate("/teacher/sections");
    if (view === "classes") navigate("/teacher/classes");
  };

  return (
    <div className="min-h-screen bg-gray-50 lg:pl-65">
      <Navbar variant="teacher" activeView="sections" onViewChange={handleViewChange} />

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-20 shadow-sm mt-16 lg:mt-0">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[#001840]">Profile</h1>
          </div>
          <div className="w-8 h-8 bg-[#001840] rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">{(user?.name || user?.email || "T")[0].toUpperCase()}</span>
          </div>
        </header>

        <main className="flex-1 p-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              

              <div className="p-6 md:p-8 grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-3 text-[#102A71] mb-2">
                    <User size={18} />
                    <p className="font-semibold">Full Name</p>
                  </div>
                  <p className="text-gray-700">{user?.name || "Not available"}</p>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-3 text-[#102A71] mb-2">
                    <Mail size={18} />
                    <p className="font-semibold">Email</p>
                  </div>
                  <p className="text-gray-700">{user?.email || "Not available"}</p>
                </div>

                <div className="rounded-xl border border-gray-200 p-4 md:col-span-2">
                  <div className="flex items-center gap-3 text-[#102A71] mb-2">
                    <ShieldCheck size={18} />
                    <p className="font-semibold">Role</p>
                  </div>
                  <p className="text-gray-700 capitalize">{user?.role || "teacher"}</p>
                </div>
              </div>
            </div>
          
        </main>
      </div>
    </div>
  );
}
