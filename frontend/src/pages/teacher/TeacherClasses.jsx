import { useEffect } from "react";
import { useNavigate } from "react-router";
import { RefreshCw } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { useAuth } from "../../contexts/AuthContext";
import { MyClassesView } from "./TeacherDashboard";

export function TeacherClasses() {
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!isLoggedIn || user?.role !== "teacher")) navigate(!isLoggedIn ? "/login" : "/", { replace: true });
  }, [authLoading, isLoggedIn, user, navigate]);

  if (authLoading || !isLoggedIn || user?.role !== "teacher") return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><RefreshCw size={20} className="animate-spin text-gray-400" /></div>;

  return <div className="min-h-screen bg-gray-50 lg:pl-65">
    <Navbar variant="teacher" activeView="classes" onViewChange={(view) => navigate(`/teacher/${view}`)} />
    <main className="min-h-screen pt-20 lg:pt-6 p-6"><div className="max-w-7xl mx-auto">
      <header className="mb-6"><h1 className="text-2xl font-bold text-[#001840]">My Classes</h1></header>
      <MyClassesView />
    </div></main>
  </div>;
}
