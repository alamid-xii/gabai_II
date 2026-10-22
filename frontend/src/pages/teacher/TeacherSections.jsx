import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { BookOpen, FlaskConical, RefreshCw, School, Users } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "../../components/Navbar";
import { useAuth } from "../../contexts/AuthContext";
import { SectionView } from "./TeacherDashboard";

const API = "http://localhost:3000/api";
const tok = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

export function TeacherSections() {
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    if (!authLoading && (!isLoggedIn || user?.role !== "teacher")) navigate(!isLoggedIn ? "/login" : "/", { replace: true });
  }, [authLoading, isLoggedIn, user, navigate]);

  useEffect(() => {
    if (authLoading || !isLoggedIn || user?.role !== "teacher") return;
    fetch(`${API}/teacher/sections`, { headers: tok() })
      .then((response) => response.ok ? response.json() : Promise.reject("Failed"))
      .then((data) => setSections(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load sections"))
      .finally(() => setLoading(false));
  }, [authLoading, isLoggedIn, user]);

  if (authLoading || !isLoggedIn || user?.role !== "teacher") return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><RefreshCw size={20} className="animate-spin text-gray-400" /></div>;

  return <div className="min-h-screen bg-gray-50 lg:pl-65">
    <Navbar variant="teacher" activeView="sections" onViewChange={(view) => navigate(`/teacher/${view}`)} />
    <main className="min-h-screen pt-20 lg:pt-6 p-6"><div className="max-w-7xl mx-auto">
      <header className="mb-6"><h1 className="text-2xl font-bold text-[#001840]">My Sections</h1></header>
      {activeSection ? <SectionView section={activeSection} onBack={() => setActiveSection(null)} /> : <SectionList sections={sections} loading={loading} onSelect={setActiveSection} />}
    </div></main>
  </div>;
}

function SectionList({ sections, loading, onSelect }) {
  if (loading) return <div className="flex items-center justify-center py-20 gap-2 text-gray-400 text-sm"><RefreshCw size={15} className="animate-spin" /> Loading...</div>;
  if (sections.length === 0) return <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center"><BookOpen size={40} className="mx-auto mb-4 text-gray-300" /><p className="text-sm font-medium text-gray-500">No sections assigned yet</p><p className="text-xs text-gray-400 mt-1">Contact the admin to assign sections to your account.</p></div>;
  const totalStudents = sections.reduce((sum, section) => sum + (Number(section.studentCount) || 0), 0);
  return <div className="space-y-5">
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4"><div className="bg-[#001840] text-white rounded-2xl p-5"><p className="text-3xl font-bold">{sections.length}</p><p className="text-xs opacity-70 mt-1">My Sections</p></div><div className="bg-emerald-600 text-white rounded-2xl p-5"><p className="text-3xl font-bold">{totalStudents}</p><p className="text-xs opacity-70 mt-1">Total Students</p></div></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{sections.map((section) => { const enrolled = Number(section.studentCount) || 0; const capacity = section.capacity || 0; const percentage = capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0; const isSsc = section.strand === "SSC"; return <button key={section.id} onClick={() => onSelect(section)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:shadow-md hover:border-[#102A71]/30 transition-all"><div className="flex items-start justify-between mb-3"><div><div className="flex items-center gap-2 mb-1"><p className="font-bold text-[#001840]">Section {section.code}</p>{isSsc ? <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full"><FlaskConical size={9} /> SSC</span> : <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full"><School size={9} /> Regular</span>}</div><p className="text-xs text-gray-500">{section.course} · Grade {section.yearLevel}{section.strand && section.strand !== "SSC" ? ` · ${section.strand}` : ""}</p></div><div className="w-9 h-9 bg-[#EEF2FF] rounded-xl flex items-center justify-center shrink-0"><Users size={15} className="text-[#102A71]" /></div></div>{section.schedule && <p className="text-xs text-gray-400 mb-3">{section.schedule}{section.room ? ` · ${section.room}` : ""}</p>}<div className="flex justify-between text-xs mb-1"><span className="text-gray-500">{enrolled} students</span><span className="text-gray-400">{capacity} capacity</span></div><div className="w-full bg-gray-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${percentage >= 100 ? "bg-red-500" : percentage >= 80 ? "bg-yellow-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(percentage, 100)}%` }} /></div><div className="mt-3 pt-3 border-t border-gray-50"><span className="text-xs text-[#102A71] font-semibold">View Students →</span></div></button>; })}</div>
  </div>;
}
