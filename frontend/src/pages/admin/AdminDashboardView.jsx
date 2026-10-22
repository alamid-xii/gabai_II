import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import {
  MapPin, Users, MessageSquare, FileText, BarChart3, Settings, LogOut,
  Bell, Search, TrendingUp, AlertCircle, CheckCircle2, Clock, Menu, X,
  Plus, Edit, Trash2, Eye, Building2, Home, Target, BookOpen,
  CheckCircle, XCircle, Download, Calendar, Filter, ChevronLeft, ChevronRight,
  UserPlus, Archive
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


import { AdminStatusBadge } from "./AdminShared";

export function AdminDashboardView({ stats }) {
  const [enrollStats, setEnrollStats] = useState(null);
  const [recentEnrollments, setRecentEnrollments] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:3000/api/admin/enrollments/stats", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setEnrollStats(d.summary);
          setRecentEnrollments(d.recentEnrollments || []);
        }
      })
      .catch(() => { });
  }, []);

  const topCards = [
    { label: "Total Enrollments", value: enrollStats?.total ?? 0, color: "bg-[#001840]", icon: FileText },
    { label: "Pending Review", value: (enrollStats?.submitted ?? 0) + (enrollStats?.pending_exam ?? 0), color: "bg-blue-600", icon: Clock },
    { label: "Enrolled", value: enrollStats?.enrolled ?? 0, color: "bg-emerald-600", icon: CheckCircle2 },
    { label: "Rejected", value: enrollStats?.rejected ?? 0, color: "bg-red-500", icon: AlertCircle },
  ];

  const statusData = enrollStats ? [
    { label: "Submitted", value: enrollStats.submitted ?? 0, color: "bg-blue-500" },
    { label: "Pending Exam", value: enrollStats.pending_exam ?? 0, color: "bg-yellow-500" },
    { label: "Enrolled", value: enrollStats.enrolled ?? 0, color: "bg-emerald-600" },
    { label: "Rejected", value: enrollStats.rejected ?? 0, color: "bg-red-500" },
  ] : [];

  const levelData = enrollStats ? [
    { label: "JHS", value: enrollStats.jhs ?? 0, color: "bg-indigo-500" },
    { label: "SHS", value: enrollStats.shs ?? 0, color: "bg-purple-500" },
  ] : [];

  const maxStatus = Math.max(...statusData.map(d => d.value), 1);
  const maxLevel = Math.max(...levelData.map(d => d.value), 1);

  const systemCards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "bg-blue-500" },
    { label: "Active FAQs", value: stats?.totalFAQs ?? 0, icon: MessageSquare, color: "bg-green-500" },
    { label: "Buildings", value: stats?.totalBuildings ?? 0, icon: Building2, color: "bg-purple-500" },
    { label: "Total Chats", value: stats?.totalChats ?? 0, icon: BarChart3, color: "bg-orange-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Enrollment Stats Cards */}
      <div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {topCards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`${card.color} rounded-2xl p-5 text-white`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium opacity-80 mb-1">{card.label}</p>
                    <p className="text-3xl font-bold">{card.value}</p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Enrollment by Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Enrollments by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statusData.map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 font-medium">{item.label}</span>
                    <span className="font-bold text-gray-900">{item.value}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className={`${item.color} h-2.5 rounded-full transition-all duration-700`}
                      style={{ width: `${Math.round((item.value / maxStatus) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {statusData.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No enrollment data yet</p>}
            </div>
          </CardContent>
        </Card>

        {/* Enrollment by Level */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Enrollments by Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {levelData.map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 font-medium">{item.label}</span>
                    <span className="font-bold text-gray-900">{item.value}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-4">
                    <div
                      className={`${item.color} h-4 rounded-full transition-all duration-700 flex items-center justify-end pr-2`}
                      style={{ width: `${Math.max(Math.round((item.value / maxLevel) * 100), item.value > 0 ? 8 : 0)}%` }}
                    >
                      {item.value > 0 && <span className="text-white text-xs font-bold">{Math.round((item.value / maxLevel) * 100)}%</span>}
                    </div>
                  </div>
                </div>
              ))}
              {levelData.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No enrollment data yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Stats */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">System Overview</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {systemCards.map(card => {
            const Icon = card.icon;
            return (
              <Card key={card.label}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    </div>
                    <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader><CardTitle className="text-base">System Status</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { label: "Database Connection", status: "Active" },
              { label: "API Services", status: "Running" },
              { label: "Email Service", status: "Active" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">{item.label}</span>
                </div>
                <Badge className="bg-green-600 text-xs">{item.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

