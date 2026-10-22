import { useState } from "react";
import { User, Mail, ShieldCheck, Lock, Eye, EyeOff, Save, X } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { Navbar } from "../../components/Navbar";
import { API, tok } from "./RegistrarShared";

export function RegistrarProfile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  // Edit name state
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);

  // Change password state
  const [changingPw, setChangingPw] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false });
  const [savingPw, setSavingPw] = useState(false);

  const handleTabChange = (tab) => {
    if (tab === "overview")   navigate("/registrar");
    if (tab === "enrollments") navigate("/registrar/enrollments");
    if (tab === "students")   navigate("/registrar/students");
    if (tab === "ssc")        navigate("/registrar/scheduling");
    if (tab === "schedules")  navigate("/registrar/schedules");
    if (tab === "sections")   navigate("/registrar/sections");
  };

  async function saveName(e) {
    e.preventDefault();
    if (!nameValue.trim()) { toast.error("Name cannot be empty"); return; }
    setSavingName(true);
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: "PUT",
        headers: tok(),
        body: JSON.stringify({ name: nameValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to update name");
      // update context so the navbar reflects the new name immediately
      if (updateUser) updateUser({ name: nameValue.trim() });
      toast.success("Name updated successfully");
      setEditingName(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    if (!pwForm.current) { toast.error("Current password is required"); return; }
    if (pwForm.next.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error("Passwords do not match"); return; }
    setSavingPw(true);
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: "PUT",
        headers: tok(),
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to change password");
      toast.success("Password changed successfully");
      setChangingPw(false);
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 lg:pl-65">
      <Navbar variant="registrar" activeTab="overview" onTabChange={handleTabChange} />

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-20 shadow-sm mt-16 lg:mt-0">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[#001840]">Profile</h1>
          </div>
          <div className="w-8 h-8 bg-[#001840] rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">{(user?.name || user?.email || "R")[0].toUpperCase()}</span>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-2xl">
          <div className="space-y-4">

            {/* Name */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2 text-[#102A71]">
                  <User size={16} />
                  <p className="font-semibold text-sm">Full Name</p>
                </div>
                {!editingName && (
                  <button
                    onClick={() => { setNameValue(user?.name || ""); setEditingName(true); }}
                    className="text-xs text-[#001840] font-medium hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
              <div className="px-6 py-4">
                {editingName ? (
                  <form onSubmit={saveName} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={nameValue}
                      onChange={e => setNameValue(e.target.value)}
                      maxLength={100}
                      autoFocus
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]"
                    />
                    <button type="submit" disabled={savingName}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#001840] text-white rounded-lg text-xs font-medium hover:bg-[#102A71] transition-colors disabled:opacity-60">
                      <Save size={13} /> {savingName ? "Saving…" : "Save"}
                    </button>
                    <button type="button" onClick={() => setEditingName(false)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                      <X size={13} className="text-gray-500" />
                    </button>
                  </form>
                ) : (
                  <p className="text-gray-700">{user?.name || <span className="text-gray-400 italic">Not set</span>}</p>
                )}
              </div>
            </div>

            {/* Email — read-only */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 text-[#102A71] px-6 py-4 border-b border-gray-100">
                <Mail size={16} />
                <p className="font-semibold text-sm">Email Address</p>
              </div>
              <div className="px-6 py-4 flex items-center justify-between">
                <p className="text-gray-700">{user?.email || "Not available"}</p>
                <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">read-only</span>
              </div>
            </div>

            {/* Role */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 text-[#102A71] px-6 py-4 border-b border-gray-100">
                <ShieldCheck size={16} />
                <p className="font-semibold text-sm">Role</p>
              </div>
              <div className="px-6 py-4">
                <p className="text-gray-700 capitalize">{user?.role || "registrar"}</p>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2 text-[#102A71]">
                  <Lock size={16} />
                  <p className="font-semibold text-sm">Password</p>
                </div>
                {!changingPw && (
                  <button
                    onClick={() => setChangingPw(true)}
                    className="text-xs text-[#001840] font-medium hover:underline"
                  >
                    Change
                  </button>
                )}
              </div>

              {changingPw ? (
                <form onSubmit={savePassword} className="px-6 py-4 space-y-3">
                  {/* Current password */}
                  {[
                    { key: "current", label: "Current Password", show: showPw.current, toggle: () => setShowPw(p => ({ ...p, current: !p.current })) },
                    { key: "next",    label: "New Password (min 8 chars)", show: showPw.next, toggle: () => setShowPw(p => ({ ...p, next: !p.next })) },
                  ].map(({ key, label, show, toggle }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                      <div className="relative">
                        <input
                          type={show ? "text" : "password"}
                          value={pwForm[key]}
                          onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]"
                        />
                        <button type="button" onClick={toggle} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                          {show ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={pwForm.confirm}
                      onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001840]/20 focus:border-[#001840]"
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => { setChangingPw(false); setPwForm({ current: "", next: "", confirm: "" }); }}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={savingPw}
                      className="flex-1 px-4 py-2 bg-[#001840] text-white rounded-lg text-sm font-medium hover:bg-[#102A71] transition-colors disabled:opacity-60">
                      {savingPw ? "Changing…" : "Change Password"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="px-6 py-4">
                  <p className="text-sm text-gray-400">••••••••</p>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
