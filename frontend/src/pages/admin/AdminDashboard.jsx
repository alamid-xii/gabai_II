import { AdminAdmissionSettings } from "./AdminAdmissionSettings";
import { AdminSchoolProfile } from "./AdminSchoolProfile";
import { AdminEnrollmentGuide } from "./AdminEnrollmentGuide";
import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import {
  ClipboardList, School, MapPin, Users, MessageSquare, FileText, BarChart3, Settings, LogOut,
  Bell, Search, TrendingUp, AlertCircle, CheckCircle2, Clock, RefreshCw, Menu, X,
  Plus, Edit, Trash2, Eye, Building2, Home, Target, BookOpen,
  CheckCircle, XCircle, Download, Calendar, Filter, ChevronLeft, ChevronRight,
  UserPlus, Archive, Activity
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { AcademicSetup } from "../../components/admin/AcademicSetup";
import { SectionManagement } from "./SectionManagement";
import { useAuth } from "../../contexts/AuthContext";
import { Navbar } from "../../components/Navbar";
import { API } from "../../config/api";

import { AdminDashboardView } from "./AdminDashboardView";
import { AdminEnrollmentsView } from "./AdminEnrollmentsView";
import { AdminFAQs } from "./AdminFAQs";
import { AdminArchives } from "./AdminArchives";
import { AdminUsers } from "./AdminUsers";
import { AdminBuildings } from "./AdminBuildings";
import { AdminSettings } from "./AdminSettings";
import { AdminSystemLogs } from "./AdminSystemLogs";

export function AdminDashboard({ initialTab = "dashboard" }) {
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => location.state?.tab || initialTab);
  const [stats, setStats] = useState(null);
  const [faqs, setFAQs] = useState([]);
  const [users, setUsers] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [editingFAQ, setEditingFAQ] = useState(null);
  const [showFAQForm, setShowFAQForm] = useState(false);

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [location.state, initialTab]);

  // Auth guard — wait for auth to finish loading first
  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn || user?.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchDashboardData();
  }, [authLoading, isLoggedIn, user, navigate]);

  async function fetchDashboardData() {
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };

      const [statsRes, faqsRes, usersRes, buildingsRes] = await Promise.all([
        fetch(`${API}/admin/stats`, { headers }),
        fetch(`${API}/admin/faqs`, { headers }),
        fetch(`${API}/admin/users`, { headers }),
        fetch(`${API}/buildings`, { headers })
      ]);

      if (statsRes.status === 401 || statsRes.status === 403) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      const [statsData, faqsData, usersData, buildingsData] = await Promise.all([
        statsRes.json(),
        faqsRes.json(),
        usersRes.json(),
        buildingsRes.json()
      ]);

      setStats(statsData.stats);
      setFAQs(faqsData);
      setUsers(usersData);
      setBuildings(buildingsData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  }

  async function handleCreateFAQ(faqData) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API}/admin/faqs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(faqData)
      });

      if (response.ok) {
        fetchDashboardData();
        setShowFAQForm(false);
      }
    } catch (error) {
      console.error("Error creating FAQ:", error);
    }
  }

  async function handleUpdateFAQ(id, faqData) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API}/admin/faqs/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(faqData)
      });

      if (response.ok) {
        fetchDashboardData();
        setEditingFAQ(null);
      }
    } catch (error) {
      console.error("Error updating FAQ:", error);
    }
  }

  async function handleDeleteFAQ(id) {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API}/admin/faqs/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchDashboardData();
      }
    } catch (error) {
      console.error("Error deleting FAQ:", error);
    }
  }

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "enrollments", label: "Enrollments", icon: FileText },
    { id: "sections", label: "Section Management", icon: Users },
    { id: "academic", label: "Academic Setup", icon: BookOpen },
    { id: "archives", label: "Archives", icon: Archive },
    { id: "faqs", label: "Manage FAQs", icon: MessageSquare },
    { id: "users", label: "Manage Users", icon: Users },
    { id: "buildings", label: "Manage Buildings", icon: Building2 },
    { id: "profile-settings", label: "School Profile & Contacts", icon: School },
    { id: "admission", label: "Admission Settings", icon: ClipboardList },
    { id: "guide", label: "Enrollment Guide", icon: BookOpen },
    { id: "logs", label: "System Logs", icon: Activity },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // Wait for auth context to initialize before rendering
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FFFDF0] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#F5C400] border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 lg:pl-65">
      <Navbar variant="admin" activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-20 shadow-sm mt-16 lg:mt-0">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[#001840]">
              {menuItems.find((item) => item.id === activeTab)?.label}
            </h1>
          </div>
          <div id="admin-header-slot" className="flex items-center justify-end gap-2 ml-auto"></div>
          {activeTab === "dashboard" && (
            <>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date().toLocaleDateString("en-PH", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <button onClick={fetchDashboardData} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Refresh">
                <RefreshCw size={15} className="text-gray-500" />
              </button>
              <div className="w-8 h-8 bg-[#001840] rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">{(user?.name || user?.email || "A")[0].toUpperCase()}</span>
              </div>
            </>
          )}
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6">
          {activeTab === "dashboard" && <AdminDashboardView stats={stats} />}
          {activeTab === "faqs" && (
            <AdminFAQs
              faqs={faqs}
              onDelete={handleDeleteFAQ}
              onEdit={setEditingFAQ}
              onAdd={() => setShowFAQForm(true)}
              editingFAQ={editingFAQ}
              showForm={showFAQForm}
              onSave={editingFAQ ? handleUpdateFAQ : handleCreateFAQ}
              onCancel={() => {
                setEditingFAQ(null);
                setShowFAQForm(false);
              }}
            />
          )}
          {activeTab === "users" && <AdminUsers users={users} />}
          {activeTab === "enrollments" && <AdminEnrollmentsView />}
          {activeTab === "sections" && <SectionManagement />}
          {activeTab === "buildings" && <AdminBuildings buildings={buildings} onRefresh={fetchDashboardData} />}
          {activeTab === "academic" && <AcademicSetup />}
          {activeTab === "archives" && <AdminArchives />}
          {activeTab === "profile-settings" && <AdminSchoolProfile />}
          {activeTab === "admission" && <AdminAdmissionSettings />}
          {activeTab === "guide" && <AdminEnrollmentGuide />}
          {activeTab === "logs" && <AdminSystemLogs />}
          {activeTab === "settings" && <AdminSettings />}
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}


