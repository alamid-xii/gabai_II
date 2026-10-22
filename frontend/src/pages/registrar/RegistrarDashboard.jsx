import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { RefreshCw } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { useAuth } from "../../contexts/AuthContext";
import { EnrollmentsTab } from "./RegistrarEnrollments";
import { OverviewTab } from "./RegistrarOverview";
import { SectionsTab } from "./RegistrarSections";
import { SSCBulkTab } from "./RegistrarScheduling";
import { SchedulesTab } from "./RegistrarSchedules";
import { StudentsTab } from "./RegistrarStudents";
import { API } from "../../config/api";

const tok = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

const TAB_LABELS = {
  overview: "Overview",
  enrollments: "Enrollments",
  students: "Students",
  ssc: "SSC Scheduling",
  schedules: "Schedules",
  sections: "Sections",
};

export function RegistrarDashboard({ initialTab = "overview" }) {
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const tabFromPath = location.pathname.match(/^\/registrar\/(overview|enrollments|students|scheduling|schedules|sections)/)?.[1];
  const resolvedTab = tabFromPath === "scheduling" ? "ssc" : tabFromPath || initialTab;
  const [activeTab, setActiveTab] = useState(resolvedTab);
  const [stats, setStats] = useState(null);
  const [recentEnrollments, setRecentEnrollments] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setActiveTab(resolvedTab);
  }, [resolvedTab]);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (user?.role !== "registrar") navigate("/");
  }, [authLoading, isLoggedIn, user, navigate]);

  useEffect(() => {
    if (authLoading || !isLoggedIn || user?.role !== "registrar") return;
    setDataLoading(true);
    Promise.all([
      fetch(`${API}/registrar/stats`, { headers: tok() }),
      fetch(`${API}/registrar/enrollments`, { headers: tok() }),
    ])
      .then(async ([statsResponse, enrollmentsResponse]) => {
        if (statsResponse.status === 401 || statsResponse.status === 403) {
          navigate("/login");
          return;
        }
        if (statsResponse.ok) {
          const data = await statsResponse.json();
          setStats(data.summary || data.stats || data);
        }
        if (enrollmentsResponse.ok) {
          const data = await enrollmentsResponse.json();
          setRecentEnrollments(Array.isArray(data) ? data : data.enrollments || []);
        }
      })
      .catch(console.error)
      .finally(() => setDataLoading(false));
  }, [authLoading, isLoggedIn, user, navigate, refreshKey]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <RefreshCw size={20} className="animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || user?.role !== "registrar") return null;

  function handleTabChange(tab) {
    setActiveTab(tab);
    if (tab === "overview") {
      navigate("/registrar");
      return;
    }
    const path = tab === "ssc" ? "scheduling" : tab;
    navigate(`/registrar/${path}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 lg:pl-65">
      <Navbar variant="registrar" activeTab={activeTab} onTabChange={handleTabChange} />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-sm mt-16 lg:mt-0 min-h-[64px]">
          <div className="shrink-0">
            <h1 className="text-2xl font-bold text-[#001840]">{TAB_LABELS[activeTab]}</h1>
          </div>
          <div id="registrar-header-slot" className="flex-1 flex items-center justify-end gap-2 flex-wrap ml-auto">
            {activeTab === "overview" && (
              <>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date().toLocaleDateString("en-PH", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <button onClick={() => setRefreshKey((key) => key + 1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Refresh">
                  <RefreshCw size={15} className="text-gray-500" />
                </button>
                <div className="w-8 h-8 bg-[#001840] rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{(user?.name || user?.email || "R")[0].toUpperCase()}</span>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-6">
          {activeTab === "overview" && (dataLoading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-gray-400 text-sm"><RefreshCw size={15} className="animate-spin" /> Loading dashboard...</div>
          ) : (
            <OverviewTab stats={stats} recentEnrollments={recentEnrollments} onRefresh={() => setRefreshKey((key) => key + 1)} />
          ))}
          {activeTab === "enrollments" && <EnrollmentsTab onActionSuccess={() => setRefreshKey((key) => key + 1)} />}
          {activeTab === "students" && <StudentsTab />}
          {activeTab === "ssc" && <SSCBulkTab />}
          {activeTab === "schedules" && <SchedulesTab />}
          {activeTab === "sections" && <SectionsTab />}
        </main>
      </div>
    </div>
  );
}

export default RegistrarDashboard;
