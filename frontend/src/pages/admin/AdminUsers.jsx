import { useState, useEffect, useMemo, useRef } from "react";
import {
  Users, Search, X, Plus, ChevronLeft, ChevronRight,
  UserPlus, Target, MapPin, Pencil, KeyRound, UserCheck, UserX, Copy, Check, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";

export function AdminUsers({ users: initialUsers = [] }) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingUser, setEditingUser] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const currentAuthUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    if (Array.isArray(initialUsers)) {
      setUsers(initialUsers);
    }
  }, [initialUsers]);

  async function handleToggleStatus(u) {
    if (currentAuthUser.id === u.id) {
      toast.error("You cannot change the status of your own account.");
      return;
    }
    setTogglingId(u.id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/admin/users/${u.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user status');

      setUsers(prev => prev.map(user =>
        user.id === u.id ? { ...user, isActive: data.isActive } : user
      ));
      toast.success(data.message || `Account ${data.isActive ? 'activated' : 'suspended'} successfully`);
    } catch (err) {
      toast.error(err.message || 'Failed to update user status');
    } finally {
      setTogglingId(null);
    }
  }

  function handleUserUpdated(updatedUser) {
    setUsers(prev => prev.map(user =>
      user.id === updatedUser.id ? { ...user, ...updatedUser } : user
    ));
    setEditingUser(null);
  }

  function handleUserCreated(newUser) {
    setUsers(prev => [newUser, ...prev]);
    setShowCreateModal(false);
  }

  const filtered = useMemo(() => {
    return users.filter(u => {
      // Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const nameMatch = (u.name || '').toLowerCase().includes(q);
        const emailMatch = (u.email || '').toLowerCase().includes(q);
        const roleMatch = (u.role || '').toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !roleMatch) return false;
      }
      // Role filter
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      // Status filter
      if (statusFilter === 'active' && u.isActive === false) return false;
      if (statusFilter === 'inactive' && u.isActive !== false) return false;

      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (page >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  const hasActiveFilters = Boolean(search || roleFilter !== 'all' || statusFilter !== 'all');
  const handleResetFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  // User counts
  const counts = {
    total: users.length,
    teachers: users.filter(u => u.role === 'teacher').length,
    students: users.filter(u => u.role === 'student' || u.role === 'user').length,
    staff: users.filter(u => u.role === 'admin' || u.role === 'registrar').length,
  };

  return (
    <div className="space-y-5">
      {/* Overview Stat Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#001840] text-white rounded-xl p-4 shadow-xs">
          <p className="text-2xl font-bold">{counts.total}</p>
          <p className="text-xs opacity-80 mt-0.5">Total Registered Accounts</p>
        </div>
        <div className="bg-emerald-600 text-white rounded-xl p-4 shadow-xs">
          <p className="text-2xl font-bold">{counts.teachers}</p>
          <p className="text-xs opacity-80 mt-0.5">Faculty / Teachers</p>
        </div>
        <div className="bg-blue-600 text-white rounded-xl p-4 shadow-xs">
          <p className="text-2xl font-bold">{counts.students}</p>
          <p className="text-xs opacity-80 mt-0.5">Students</p>
        </div>
        <div className="bg-purple-600 text-white rounded-xl p-4 shadow-xs">
          <p className="text-2xl font-bold">{counts.staff}</p>
          <p className="text-xs opacity-80 mt-0.5">Staff & Administrators</p>
        </div>
      </div>

      {/* Filter & Action Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search users by name, email, role..."
            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#001840] transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            className={`px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors ${
              roleFilter !== 'all' ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="registrar">Registrars</option>
            <option value="teacher">Teachers</option>
            <option value="student">Students</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className={`px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors ${
              statusFilter !== 'all' ? 'border-[#001840] bg-[#001840]/5 font-medium text-[#001840]' : 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              title="Clear all filters"
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors font-medium"
            >
              <X size={12} /> Clear
            </button>
          )}

          {/* Create Staff Account Button */}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#001840] text-white rounded-lg text-sm font-semibold hover:bg-[#102A71] transition-colors shadow-xs"
          >
            <UserPlus size={15} /> Create Staff Account
          </button>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Users size={36} className="mb-3 opacity-30 text-gray-400" />
            <p className="text-sm font-semibold text-gray-600">No users found</p>
            <p className="text-xs mt-1 text-gray-400">
              {hasActiveFilters ? 'Try adjusting your search query or filter options' : 'Users will appear here once registered.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 px-3 py-1.5 text-xs text-[#001840] bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-colors"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">User</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Role</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Joined Date</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map((u) => {
                    const initials = (u.name || u.email || 'U').substring(0, 2).toUpperCase();
                    const isProtected = u.role === 'admin' || u.role === 'registrar';

                    return (
                      <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                        {/* User Details */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#102A71]/10 text-[#102A71] font-bold text-xs flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{u.name || 'Unnamed User'}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            u.role === 'admin' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            u.role === 'registrar' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            u.role === 'teacher' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}>
                            {u.role}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            u.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            {u.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        {/* Joined Date */}
                        <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-PH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : '—'}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {/* 1. Edit User Details */}
                            <button
                              type="button"
                              onClick={() => setEditingUser(u)}
                              title="Edit user details"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
                            >
                              <Pencil size={15} />
                            </button>

                            {/* 2. Reset Password */}
                            <button
                              type="button"
                              onClick={() => setResetPasswordUser(u)}
                              title="Reset temporary password"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors"
                            >
                              <KeyRound size={15} />
                            </button>

                            {/* 3. Toggle Status (Active / Suspended) */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              disabled={togglingId === u.id || currentAuthUser.id === u.id}
                              title={
                                currentAuthUser.id === u.id
                                  ? "Cannot modify own status"
                                  : u.isActive !== false
                                  ? "Suspend account"
                                  : "Reactivate account"
                              }
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                u.isActive !== false
                                  ? 'text-red-500 hover:text-red-700 hover:bg-red-50 border-transparent hover:border-red-200'
                                  : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 border-transparent hover:border-emerald-200'
                              }`}
                            >
                              {togglingId === u.id ? (
                                <Loader2 size={15} className="animate-spin text-gray-500" />
                              ) : u.isActive !== false ? (
                                <UserX size={15} />
                              ) : (
                                <UserCheck size={15} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-white">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-500">
                  Showing <span className="font-semibold text-gray-800">{(page - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-semibold text-gray-800">{Math.min(page * pageSize, filtered.length)}</span> of{' '}
                  <span className="font-semibold text-gray-800">{filtered.length}</span> users
                </p>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span>Show:</span>
                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="px-2 py-1 border border-gray-200 rounded-md text-xs text-gray-700 bg-white focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-normal rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={15} className="text-gray-400" />
                    <span>Previous</span>
                  </button>

                  {getPageNumbers().map((p, idx) => {
                    if (p === '...') {
                      return (
                        <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-sm text-gray-400 select-none">
                          ...
                        </span>
                      );
                    }
                    const isCurrent = p === page;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded-lg text-sm transition-colors flex items-center justify-center ${
                          isCurrent
                            ? 'bg-[#F5C400] text-gray-900 font-semibold shadow-xs'
                            : 'text-gray-700 hover:bg-gray-100 font-normal'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-normal rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight size={15} className="text-gray-400" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdated={handleUserUpdated}
        />
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
        />
      )}

      {/* Create Staff Account Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleUserCreated}
        />
      )}
    </div>
  );
}

// ── Edit User Modal ───────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    role: user.role || 'student',
    department: user.department || '',
    isActive: user.isActive !== false
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.email.trim()) errs.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email address format';
    
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      
      toast.success('User updated successfully');
      onUpdated(data);
    } catch (err) {
      toast.error(err.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-[#001840]">Edit User Details</h3>
            <p className="text-xs text-gray-500 mt-0.5">Modify personal info, role, or status</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Juan Dela Cruz"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.name ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-[#001840]/20 focus:border-[#001840]'
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="e.g. juan@emc.edu.ph"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                errors.email ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-[#001840]/20 focus:border-[#001840]'
              }`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Account Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'student', label: 'Student' },
                { value: 'teacher', label: 'Teacher' },
                { value: 'registrar', label: 'Registrar' },
                { value: 'admin', label: 'Admin' }
              ].map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set('role', r.value)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold capitalize transition-all ${
                    form.role === r.value
                      ? 'border-[#001840] bg-[#EEF2FF] text-[#001840] shadow-xs'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Department (if registrar) */}
          {form.role === 'registrar' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Department
              </label>
              <input
                type="text"
                value={form.department}
                onChange={e => set('department', e.target.value)}
                placeholder="e.g. Admissions, Records"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]"
              />
            </div>
          )}

          {/* Account Status Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div>
              <p className="text-xs font-semibold text-gray-800">Account Access</p>
              <p className="text-xs text-gray-500">
                {form.isActive ? 'Active — allowed to sign in' : 'Suspended — access blocked'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => set('isActive', !form.isActive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                form.isActive ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  form.isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#001840] text-white rounded-lg text-sm font-semibold hover:bg-[#102A71] disabled:opacity-60 transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Reset Password Modal ──────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose }) {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  function generatePassword() {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setCopied(false);
  }

  function handleCopy() {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    toast.info("Password copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      toast.success(data.message || `Password reset successfully for ${user.name}`);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-[#001840]">Reset Temporary Password</h3>
            <p className="text-xs text-gray-500 mt-0.5">Assign a new password to this account</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Target Account</p>
            <p className="text-sm font-semibold text-[#001840] mt-0.5">{user.name}</p>
            <p className="text-xs text-blue-700">{user.email}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                New Temporary Password <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={generatePassword}
                className="text-xs font-semibold text-[#001840] hover:underline"
              >
                Generate Random
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setCopied(false); }}
                placeholder="Enter or generate temporary password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]"
              />
              {newPassword && (
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy password"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Minimum 6 characters. The user will use this new password to sign in.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !newPassword}
              className="flex-1 px-4 py-2 bg-[#001840] text-white rounded-lg text-sm font-semibold hover:bg-[#102A71] disabled:opacity-60 transition-colors"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Create Staff Account Modal ────────────────────────────────────────────────
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-[#001840]">Create Staff Account</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Role</label>
            <div className="flex gap-3">
              {['teacher', 'registrar'].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => set('role', r)}
                  className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                    form.role === r ? 'border-[#001840] bg-[#EEF2FF] text-[#001840]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Full Name <span className="text-red-500">*</span></label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Maria Santos"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${errors.name ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-[#001840]/20 focus:border-[#001840]'}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="e.g. maria@emc.edu.ph"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${errors.email ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-[#001840]/20 focus:border-[#001840]'}`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Initial Password <span className="text-red-500">*</span></label>
            <input
              type="password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="At least 8 characters"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${errors.password ? 'border-red-400 focus:ring-red-200' : 'border-gray-200 focus:ring-[#001840]/20 focus:border-[#001840]'}`}
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#001840] text-white rounded-lg text-sm font-semibold hover:bg-[#102A71] disabled:opacity-60 transition-colors"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Aerial Photo Pin Picker (Used across Admin Buildings) ─────────────────────
export function AerialPinPicker({ position, onPositionChange, onClose }) {
  const [localPos, setLocalPos] = useState(position || null);
  const imgRef = useRef(null);

  function handleImageClick(e) {
    e.stopPropagation();
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setLocalPos({ x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)) });
  }

  function handleConfirm(e) {
    e.stopPropagation();
    if (localPos) { onPositionChange(localPos); onClose(); }
  }

  function handleCancel(e) {
    e.stopPropagation();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-black/70">
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '100%', maxWidth: '780px', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0 bg-[#FFFDF0]">
          <div>
            <h3 className="font-bold text-[#001840] text-sm">Pin Building Location</h3>
            <p className="text-xs text-gray-400 mt-0.5">Click on the photo to place a pin · Click again to move it</p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-auto relative cursor-crosshair select-none bg-gray-100">
          <div className="relative inline-block w-full" onClick={handleImageClick}>
            <img
              ref={imgRef}
              src="/emc_aerial.jpg"
              alt="EMC Campus"
              className="w-full h-auto block"
              draggable={false}
            />
            {localPos && (
              <div
                style={{ left: `${localPos.x}%`, top: `${localPos.y}%`, position: 'absolute', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}
              >
                <div className="w-9 h-9 bg-[#F5C400] border-2 border-white rounded-full shadow-xl flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-[#001840]" />
                </div>
                <div className="absolute inset-0 rounded-full bg-[#F5C400] opacity-30 animate-ping" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-white shrink-0">
          <p className="text-xs text-gray-500">
            {localPos
              ? <span className="text-green-600 font-medium">✅ Pin placed — x: {localPos.x}%, y: {localPos.y}%</span>
              : <span className="text-gray-400">Click anywhere on the photo to place a pin</span>}
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!localPos}
              className="px-4 py-2 bg-[#001840] text-white rounded-lg text-sm font-medium hover:bg-[#102A71] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              <Target className="w-4 h-4" /> Confirm Pin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
