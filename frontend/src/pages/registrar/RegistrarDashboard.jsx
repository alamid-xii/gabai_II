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

const TAB_LABELS = {
  overview: "Registrar Dashboard",
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
  const activeTab = resolvedTab;
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (user?.role !== "registrar") navigate("/");
  }, [authLoading, isLoggedIn, user, navigate]);

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
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20 shadow-sm mt-16 lg:mt-0 min-h-[64px]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#001840]">{TAB_LABELS[activeTab]}</h1>
          </div>
          <div id="registrar-header-slot" className="flex-1 flex items-center justify-end gap-2 flex-wrap ml-auto">
            {activeTab === "overview" && (
              <>
                <p className="hidden sm:block text-xs text-gray-400 mt-0.5">
                  {new Date().toLocaleDateString("en-PH", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <button onClick={() => setRefreshKey((key) => key + 1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Refresh dashboard" aria-label="Refresh dashboard">
                  <RefreshCw size={15} className="text-gray-500" />
                </button>
                <div className="w-8 h-8 bg-[#001840] rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{(user?.name || user?.email || "R")[0].toUpperCase()}</span>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          {activeTab === "overview" && <OverviewTab refreshKey={refreshKey} />}
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
