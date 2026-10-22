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

// ── Archives View ─────────────────────────────────────────────────────────────
export function AdminArchives() {
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [archiveData, setArchiveData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const tok = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });

  useEffect(() => {
    fetch('http://localhost:3000/api/academic/school-years')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          // Only show past (non-active) school years
          const past = data.filter(sy => !sy.isActive);
          setSchoolYears(past);
          if (past.length > 0) setSelectedYear(past[0].year);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedYear) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    fetch(`http://localhost:3000/api/admin/archive/${encodeURIComponent(selectedYear)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => setArchiveData(data))
      .catch(() => setArchiveData(null))
      .finally(() => setLoading(false));
  }, [selectedYear]);

  const filtered = (archiveData?.enrollments || []).filter(e =>
    !search ||
    `${e.firstName} ${e.familyName}`.toLowerCase().includes(search.toLowerCase()) ||
    (e.studentNumber || '').includes(search) ||
    (e.gradeLevel || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#001840]">Enrollment Archives</h2>
          <p className="text-sm text-gray-500 mt-0.5">Read-only view of past school year enrollment data</p>
        </div>
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#001840]/20 bg-white text-[#001840]">
          {schoolYears.length === 0 && <option value="">No past school years</option>}
          {schoolYears.map(sy => (
            <option key={sy.id} value={sy.year}>{sy.year}</option>
          ))}
        </select>
      </div>

      {schoolYears.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
          <Archive size={40} className="mx-auto mb-4 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No archived school years yet</p>
          <p className="text-xs text-gray-400 mt-1">Archives appear here after a school year is closed and a new one is set as active.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-[#001840] rounded-full animate-spin" />
          Loading archive...
        </div>
      ) : archiveData ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total', value: archiveData.summary.total, color: 'bg-[#001840] text-white' },
              { label: 'Enrolled', value: archiveData.summary.enrolled, color: 'bg-emerald-600 text-white' },
              { label: 'Completed', value: archiveData.summary.completed, color: 'bg-green-500 text-white' },
              { label: 'Rejected', value: archiveData.summary.rejected, color: 'bg-red-500 text-white' },
              { label: 'JHS', value: archiveData.summary.jhs, color: 'bg-indigo-500 text-white' },
              { label: 'SHS', value: archiveData.summary.shs, color: 'bg-purple-500 text-white' },
            ].map(c => (
              <div key={c.label} className={`${c.color} rounded-xl p-4`}>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs opacity-80 mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, student ID, grade level..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]" />
            </div>
          </div>

          {/* Enrollment Table — read only */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <FileText size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-400">No records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Student', 'Student ID', 'Level / Grade', 'Strand', 'Section', 'Status', 'Enrolled Date'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#001840]">{e.firstName} {e.familyName}</p>
                          <p className="text-xs text-gray-400">{e.user_email}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{e.studentNumber || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{e.educationLevel} {e.gradeLevel ? `· ${e.gradeLevel}` : ''}</td>
                        <td className="px-4 py-3">
                          {e.strand
                            ? <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">{e.strand}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{e.sectionName || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            e.status === 'completed' ? 'bg-green-100 text-green-700' :
                            e.status === 'enrolled'  ? 'bg-emerald-100 text-emerald-700' :
                            e.status === 'rejected'  ? 'bg-red-100 text-red-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>{e.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {e.approved_at ? new Date(e.approved_at).toLocaleDateString() : e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3 border-t border-gray-50 bg-gray-50/30 text-xs text-gray-400">
                  {filtered.length} record{filtered.length !== 1 ? 's' : ''} · School Year {selectedYear} · Read-only archive
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

// ── Create Staff User Modal ───────────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'teacher', department: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      toast.success(`${form.role.charAt(0).toUpperCase() + form.role.slice(1)} account created successfully`);
      onCreated(data.user);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-[#001840]">Create Staff Account</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Role</label>
            <div className="flex gap-3">
              {['teacher', 'registrar'].map(r => (
                <button key={r} type="button" onClick={() => set('role', r)}
                  className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                    form.role === r ? 'border-[#001840] bg-[#EEF2FF] text-[#001840]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Full Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Maria Santos"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${errors.name ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-[#001840]/20 focus:border-[#001840]'}`} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email <span className="text-red-500">*</span></label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="teacher@emc.edu.ph"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${errors.email ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-[#001840]/20 focus:border-[#001840]'}`} />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* Department (optional) */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Department <span className="text-gray-400 font-normal">(optional)</span></label>
            <input value={form.department} onChange={e => set('department', e.target.value)}
              placeholder="e.g. JHS Department"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]" />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Password <span className="text-red-500">*</span></label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
              placeholder="Min. 8 characters"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${errors.password ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-[#001840]/20 focus:border-[#001840]'}`} />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            <p className="text-xs text-gray-400 mt-1">Share this password with the staff member. They can change it after logging in.</p>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 bg-[#001840] text-white rounded-xl text-sm font-semibold hover:bg-[#102A71] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? 'Creating...' : <><UserPlus className="w-4 h-4" /> Create Account</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

