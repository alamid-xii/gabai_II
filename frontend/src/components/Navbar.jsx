import { SchoolName } from "./SchoolName";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { MapPin, Menu, X, ArrowRight, LogIn, LogOut, User, ChevronDown, BookOpen, ClipboardList, GraduationCap, LayoutDashboard, Calendar, Users, BarChart3, FileText, Archive, MessageSquare, Building2, Settings, Clock, Activity } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Virtual Tour", to: "/ar-navigation" },
  { label: "Enrollment Guide", to: "/enrollment-guide" },
];

// Role-based dashboard links
function getDashboardLink(role) {
  if (role === "admin") return "/admin";
  if (role === "registrar") return "/registrar";
  if (role === "teacher") return "/teacher";
  return "/my-enrollments";
}

function getDashboardLabel(role) {
  if (role === "admin") return "Admin Dashboard";
  if (role === "registrar") return "Registrar Dashboard";
  if (role === "teacher") return "Teacher Portal";
  return "Enrollments";
}

function getProfileLink(role) {
  if (role === "admin") return "/admin/profile";
  if (role === "registrar") return "/registrar/profile";
  if (role === "teacher") return "/teacher/profile";
  if (role === "student") return "/profile";
  return "/login";
}

function TeacherNavbar({ activeView, onViewChange }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isProfileActive = location.pathname === getProfileLink(user?.role);
  const viewButtons = [
    { id: "sections", label: "My Sections", icon: BookOpen },
    { id: "classes", label: "My Classes", icon: ClipboardList },
    { id: "schedule", label: "My Schedule", icon: Calendar },
  ];

  function handleLogout() {
    logout();
    setOpen(false);
  }

  function selectView(view) {
    onViewChange?.(view);
    setOpen(false);
  }

  return (
    <>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-65 flex-col bg-[#001840] text-white shadow-lg">
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10"><img src="/GabAi_Logo.png" alt="" aria-hidden="true" className="w-8 h-8 shrink-0 object-contain rounded-md" /><div><span className="font-bold text-xl tracking-wide">GabAI</span><p className="text-[9px] text-[#FFDC5F] leading-tight tracking-wide sm:tracking-widest uppercase truncate max-w-[210px] sm:max-w-none"><SchoolName /></p></div></div>
        <nav className="flex-1 px-2 py-4 space-y-1" aria-label="Teacher navigation">
          {viewButtons.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => selectView(id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${activeView === id && !isProfileActive ? "bg-[#F5C400] text-[#001840] font-semibold" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>
        <div className="px-2 py-4 border-t border-white/10">
          <Link to={getProfileLink(user?.role)} onClick={() => setOpen(false)} className={`block px-3 py-2 mb-1 rounded-xl transition-colors ${isProfileActive ? "bg-[#F5C400] text-[#001840] font-semibold" : "hover:bg-white/5 text-white"}`}>
            <p className={`${isProfileActive ? "text-[#001840]" : "text-white"} text-sm font-medium truncate`}>{user?.name || user?.email}</p>
            <p className={`${isProfileActive ? "text-[#001840]/70" : "text-white/40"} text-xs capitalize`}>{user?.role}</p>
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-300 hover:bg-red-900/20 transition-all text-left text-sm">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#001840] text-white shadow-lg">
        <div className="h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><GraduationCap className="text-[#F5C400]" size={20} /><span className="font-bold">Teacher Portal</span></div>
          <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-[#102A71]" aria-label="Toggle teacher menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {open && <nav className="px-4 pb-4 space-y-1 border-t border-[#102A71]" aria-label="Teacher navigation">
          {viewButtons.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => selectView(id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm ${activeView === id && !isProfileActive ? "bg-[#F5C400] text-[#001840] font-semibold" : "text-white/80 hover:bg-[#102A71]"}`}>
              <Icon size={16} /> {label}
            </button>
          ))}
          <Link to={getProfileLink(user?.role)} onClick={() => setOpen(false)} className={`block px-3 py-2 mt-2 rounded-lg transition-colors ${isProfileActive ? "bg-[#F5C400] text-[#001840] font-semibold" : "bg-[#102A71] text-white"}`}>
            <p className={`${isProfileActive ? "text-[#001840]" : "text-white"} text-sm font-medium truncate`}>{user?.name || user?.email}</p>
            <p className={`${isProfileActive ? "text-[#001840]/70" : "text-white/40"} text-xs capitalize`}>{user?.role}</p>
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm text-red-300 hover:bg-red-900/20"><LogOut size={16} /> Logout</button>
        </nav>}
      </header>
    </>
  );
}

function RegistrarNavbar({ activeTab, onTabChange }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isProfileActive = location.pathname === getProfileLink(user?.role);
  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "enrollments", label: "Enrollments", icon: ClipboardList },
    { id: "students", label: "Students", icon: Users },
    { id: "ssc", label: "SSC Scheduling", icon: Calendar },
    { id: "schedules", label: "Schedules", icon: Clock },
    { id: "sections", label: "Sections", icon: BookOpen },
  ];

  function handleLogout() {
    logout();
    setOpen(false);
  }

  function selectTab(tab) {
    onTabChange(tab);
    setOpen(false);
  }

  return (
    <>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-65 flex-col bg-[#001840] text-white shadow-lg">
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10"><img src="/GabAi_Logo.png" alt="" aria-hidden="true" className="w-8 h-8 shrink-0 object-contain rounded-md" /><div><span className="font-bold text-xl tracking-wide">GabAI</span><p className="text-[9px] text-[#FFDC5F] leading-tight tracking-wide sm:tracking-widest uppercase truncate max-w-[210px] sm:max-w-none"><SchoolName /></p></div></div>
        <nav className="flex-1 px-2 py-4 space-y-1" aria-label="Registrar navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => selectTab(id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${activeTab === id && !isProfileActive ? "bg-[#F5C400] text-[#001840] font-semibold" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
              <Icon size={17} /> {label}
            </button>
          ))}
        </nav>
        <div className="px-2 py-4 border-t border-white/10">
          <Link to={getProfileLink(user?.role)} onClick={() => setOpen(false)} className={`block px-3 py-2 mb-1 rounded-xl transition-colors ${isProfileActive ? "bg-[#F5C400] text-[#001840] font-semibold" : "hover:bg-white/5 text-white"}`}>
            <p className={`${isProfileActive ? "text-[#001840]" : "text-white"} text-sm font-medium truncate`}>{user?.name || user?.email}</p>
            <p className={`${isProfileActive ? "text-[#001840]/70" : "text-white/40"} text-xs capitalize`}>{user?.role}</p>
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-300 hover:bg-red-900/20 transition-all text-left text-sm">
            <LogOut size={17} /> Logout
          </button>
        </div>
      </aside>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#001840] text-white shadow-lg">
        <div className="h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="text-[#F5C400]" size={20} /><span className="font-bold">Registrar Portal</span></div>
          <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-[#102A71]" aria-label="Toggle registrar menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {open && <nav className="px-4 pb-4 space-y-1 border-t border-[#102A71]" aria-label="Registrar navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => selectTab(id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm ${activeTab === id && !isProfileActive ? "bg-[#F5C400] text-[#001840] font-semibold" : "text-white/80 hover:bg-[#102A71]"}`}>
              <Icon size={16} /> {label}
            </button>
          ))}
          <Link to={getProfileLink(user?.role)} onClick={() => setOpen(false)} className={`block px-3 py-3 mt-2 rounded-lg text-left text-sm transition-colors ${isProfileActive ? "bg-[#F5C400] text-[#001840] font-semibold" : "text-white/80 hover:bg-[#102A71]"}`}>
            <p className={`${isProfileActive ? "text-[#001840]" : "text-white"} font-medium truncate`}>{user?.name || user?.email}</p>
            <p className={`${isProfileActive ? "text-[#001840]/70" : "text-white/40"} text-xs capitalize`}>{user?.role}</p>
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm text-red-300 hover:bg-red-900/20"><LogOut size={16} /> Logout</button>
        </nav>}
      </header>
    </>
  );
}

function AdminNavbar({ activeTab, onTabChange }) {
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isProfileActive = location.pathname === getProfileLink(user?.role);
  const navGroups = [
    {
      label: "Enrollment & academics", items: [
        { id: "enrollments", label: "Enrollments", icon: FileText },
        { id: "sections", label: "Section Management", icon: Users },
        { id: "academic", label: "Academic Setup", icon: BookOpen },
        { id: "archives", label: "Archives", icon: Archive },
      ]
    },
    {
      label: "People & campus", items: [
        { id: "users", label: "Manage Users", icon: Users },
        { id: "buildings", label: "Manage Buildings", icon: Building2 },
      ]
    },
    {
      label: "School & settings", items: [
        { id: "profile-settings", label: "School Profile & Contacts", icon: Building2 },
        { id: "admission", label: "Admission Settings", icon: ClipboardList },
        { id: "guide", label: "Enrollment Guide", icon: BookOpen },
        { id: "faqs", label: "Manage FAQs", icon: MessageSquare },
        { id: "logs", label: "System Logs", icon: Activity },
        { id: "settings", label: "Settings", icon: Settings },
      ]
    },
  ];

  function handleLogout() {
    logout();
    setOpen(false);
  }

  function selectTab(tab) {
    if (location.pathname !== "/admin") {
      navigate("/admin", { state: { tab } });
    } else {
      onTabChange?.(tab);
    }
    setOpen(false);
  }

  const links = (mobile = false) => (
    <nav id={mobile ? "admin-mobile-navigation" : undefined} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-2" aria-label="Admin navigation">
      <div>
        <button
          type="button"
          onClick={() => selectTab("dashboard")}
          aria-current={activeTab === "dashboard" && !isProfileActive ? "page" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${
            activeTab === "dashboard" && !isProfileActive
              ? "bg-[#F5C400] text-[#001840] font-semibold"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <BarChart3 size={17} className="shrink-0" />
          <span>Dashboard</span>
        </button>
      </div>

      {navGroups.map(({ label: groupLabel, items }, groupIndex) => {
        const containsActivePage = !isProfileActive && items.some(({ id }) => id === activeTab);
        const expanded = containsActivePage || Boolean(expandedGroups[groupLabel]);
        const panelId = `admin-${mobile ? "mobile" : "desktop"}-group-${groupIndex}`;
        return (
          <section key={groupLabel} aria-label={groupLabel}>
            <h2>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                aria-disabled={containsActivePage}
                onClick={() => {
                  if (!containsActivePage) setExpandedGroups((previous) => ({ ...previous, [groupLabel]: !expanded }));
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-3 rounded-lg text-left text-xs font-semibold transition-colors ${containsActivePage ? "text-[#FFDC5F] bg-white/5" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
              >
                <span>{groupLabel}</span>
                <ChevronDown size={15} aria-hidden="true" className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
            </h2>
            <div id={panelId} hidden={!expanded} className="mt-1 ml-3 pl-2 border-l border-white/10 space-y-1">
              {items.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => selectTab(id)} aria-current={activeTab === id && !isProfileActive ? "page" : undefined} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${activeTab === id && !isProfileActive ? "bg-[#F5C400] text-[#001840] font-semibold" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
                  <Icon size={17} className="shrink-0" /> <span>{label}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </nav>
  );

  const accountControls = (
    <div className="shrink-0 px-3 py-3 border-t border-white/10 bg-[#001840]">
      <Link to={getProfileLink(user?.role)} onClick={() => setOpen(false)} className={`block px-3 py-2 mb-1 rounded-lg transition-colors ${isProfileActive ? "bg-[#F5C400] text-[#001840] font-semibold" : "hover:bg-white/5 text-white"}`}>
        <p className="text-sm font-medium truncate">{user?.name || user?.email}</p>
        <p className={`text-xs capitalize ${isProfileActive ? "text-[#001840]/70" : "text-white/40"}`}>{user?.role}</p>
      </Link>
      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-300 hover:bg-red-900/20 transition-all text-left text-sm"><LogOut size={17} className="shrink-0" /> Logout</button>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-65 min-h-0 overflow-hidden flex-col bg-[#001840] text-white shadow-lg">
        <button
          type="button"
          onClick={() => selectTab("dashboard")}
          className="shrink-0 flex items-center gap-3 px-4 py-4 border-b border-white/10 text-left hover:bg-white/5 transition-colors cursor-pointer w-full"
        >
          <img src="/GabAi_Logo.png" alt="" aria-hidden="true" className="w-8 h-8 shrink-0 object-contain rounded-md" />
          <div className="min-w-0"><span className="font-bold text-xl tracking-wide">GabAI</span><p className="text-[9px] text-[#FFDC5F] leading-tight tracking-wide uppercase truncate"><SchoolName /></p></div>
        </button>
        {links()}
        {accountControls}
      </aside>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 flex max-h-dvh flex-col overflow-hidden bg-[#001840] text-white shadow-lg">
        <div className="h-16 shrink-0 px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => selectTab("dashboard")}
            className="flex items-center gap-2 text-left"
          >
            <img src="/GabAi_Logo.png" alt="" aria-hidden="true" className="w-6 h-6 shrink-0 object-contain rounded-md" />
            <span className="font-bold">Admin Portal</span>
          </button>
          <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-[#102A71]" aria-label="Toggle admin menu" aria-expanded={open} aria-controls="admin-mobile-navigation">{open ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
        {open && <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-white/10">
          {links(true)}
          {accountControls}
        </div>}
      </header>
    </>
  );
}

export function Navbar({ variant = "public", activeView, onViewChange, activeTab, onTabChange }) {
  if (variant === "teacher") return <TeacherNavbar activeView={activeView} onViewChange={onViewChange} />;
  if (variant === "registrar") return <RegistrarNavbar activeTab={activeTab} onTabChange={onTabChange} />;
  if (variant === "admin") return <AdminNavbar activeTab={activeTab} onTabChange={onTabChange} />;

  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useAuth();

  function handleLogout() {
    logout();
    setUserMenuOpen(false);
    setOpen(false);
  }

  return (
    <header className="bg-[#001840] text-white fixed top-0 left-0 right-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 min-w-0 max-w-[calc(100%-3.5rem)] lg:max-w-none">
            <img src="/GabAi_Logo.png" alt="" aria-hidden="true" className="w-9 h-9 rounded-lg object-contain shadow shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-xl tracking-wide">GabAI</span>
              <p className="text-[9px] text-[#FFDC5F] leading-tight tracking-wide sm:tracking-widest uppercase truncate max-w-[210px] sm:max-w-none">
                <SchoolName />
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const active =
                link.to === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-150 ${active
                    ? "bg-[#102A71] text-[#FFDC5F]"
                    : "text-[#FFFDF0] hover:bg-[#102A71]/60 hover:text-[#FFDC5F]"
                    }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isLoggedIn && user ? (
              /* Logged in — show user dropdown */
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="hidden lg:flex items-center gap-2 bg-[#102A71] hover:bg-[#102A71]/80 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
                >
                  <div className="w-7 h-7 bg-[#F5C400] rounded-full flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-[#001840]" />
                  </div>
                  <span className="text-[#FFFDF0] max-w-30 truncate">{user.name || user.email}</span>
                  <ChevronDown className={`w-4 h-4 text-[#FFDC5F] transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                    {/* User info */}
                    <Link
                      to={getProfileLink(user.role)}
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-3 bg-[#FFFDF0] border-b border-gray-100 hover:bg-[#f9f7eb] transition-colors"
                    >
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{user.role}</p>
                      <p className="text-sm font-semibold text-[#001840] truncate">{user.name || user.email}</p>
                    </Link>
                    {/* Navigation links */}
                    {user.role === "student" ? (
                      <>
                        <Link to="/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm text-[#001840] hover:bg-[#FFFDF0] transition-colors font-medium">
                          <User className="w-4 h-4 text-[#102A71]" />Profile
                        </Link>
                        <Link
                          to="/student-dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-[#001840] hover:bg-[#FFFDF0] transition-colors font-medium"
                        >
                          <LayoutDashboard className="w-4 h-4 text-[#102A71]" />
                          Dashboard
                        </Link>
                        <Link
                          to="/my-enrollments"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-[#001840] hover:bg-[#FFFDF0] transition-colors font-medium border-t border-gray-50"
                        >
                          <ClipboardList className="w-4 h-4 text-[#102A71]" />
                          Enrollments
                        </Link>
                        <Link
                          to="/my-schedule"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-[#001840] hover:bg-[#FFFDF0] transition-colors font-medium border-t border-gray-50"
                        >
                          <Clock className="w-4 h-4 text-[#102A71]" />
                          Schedule
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          to={getDashboardLink(user.role)}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-[#001840] hover:bg-[#FFFDF0] transition-colors font-medium"
                        >
                          <User className="w-4 h-4 text-[#102A71]" />
                          {getDashboardLabel(user.role)}
                        </Link>
                        {user.role === "teacher" && (
                          <Link
                            to="/teacher/schedule"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 text-sm text-[#001840] hover:bg-[#FFFDF0] transition-colors font-medium border-t border-gray-50"
                          >
                            <Calendar className="w-4 h-4 text-[#102A71]" />
                            My Schedule
                          </Link>
                        )}
                      </>
                    )}
                    {/* Logout */}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium border-t border-gray-100"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Not logged in — show Login + Get Started */
              <>
                <Link
                  to="/login"
                  className="hidden lg:flex items-center gap-2 border border-[#FFDC5F] text-[#FFDC5F] hover:bg-[#FFDC5F] hover:text-[#001840] px-4 py-2 rounded-lg font-semibold text-sm transition-colors duration-150"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="hidden lg:flex items-center gap-2 bg-[#F5C400] hover:bg-[#FFDC5F] text-[#001840] px-5 py-2 rounded-lg font-semibold text-sm transition-colors duration-150 shadow"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}

            {/* Hamburger */}
            <button
              onClick={() => setOpen(!open)}
              className="lg:hidden p-2 rounded-lg hover:bg-[#102A71] transition-colors"
              aria-label="Toggle menu"
              aria-expanded={open}
            >
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="lg:hidden bg-[#001840] border-t border-[#102A71] max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
            {navLinks.map((link) => {
              const active =
                link.to === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={`px-4 py-4.5 rounded-lg text-sm font-medium transition-colors duration-150 ${active
                    ? "bg-[#102A71] text-[#FFDC5F]"
                    : "text-[#FFFDF0] hover:bg-[#102A71]/60"
                    }`}
                >
                  {link.label}
                </Link>
              );
            })}

            {isLoggedIn && user ? (
              <>
                {/* User info */}
                <Link
                  to={getProfileLink(user.role)}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 mt-2 bg-[#102A71] rounded-lg hover:bg-[#102A71]/80 transition-colors"
                >
                  <p className="text-xs text-[#FFDC5F] font-medium uppercase tracking-wider">{user.role}</p>
                  <p className="text-sm font-semibold text-white truncate">{user.name || user.email}</p>
                </Link>
                {user.role === "student" ? (
                  <>
                    <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-[#FFFDF0] hover:bg-[#102A71]/60 transition-colors">
                      <User className="w-4 h-4 text-[#FFDC5F]" />Profile
                    </Link>
                    <Link
                      to="/student-dashboard"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-[#FFFDF0] hover:bg-[#102A71]/60 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-[#FFDC5F]" />
                      Dashboard
                    </Link>
                    <Link
                      to="/my-enrollments"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-[#FFFDF0] hover:bg-[#102A71]/60 transition-colors"
                    >
                      <ClipboardList className="w-4 h-4 text-[#FFDC5F]" />
                      My Enrollments
                    </Link>
                    <Link
                      to="/my-schedule"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-[#FFFDF0] hover:bg-[#102A71]/60 transition-colors"
                    >
                      <Clock className="w-4 h-4 text-[#FFDC5F]" />
                      My Schedule
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to={getDashboardLink(user.role)}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-[#FFFDF0] hover:bg-[#102A71]/60 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      {getDashboardLabel(user.role)}
                    </Link>
                    {user.role === "teacher" && (
                      <Link
                        to="/teacher/schedule"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-[#FFFDF0] hover:bg-[#102A71]/60 transition-colors"
                      >
                        <Calendar className="w-4 h-4" />
                        My Schedule
                      </Link>
                    )}
                  </>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-red-300 hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-[#FFDC5F] border border-[#FFDC5F]/40 hover:bg-[#102A71]/60 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setOpen(false)}
                  className="mt-1 flex items-center justify-center gap-2 bg-[#F5C400] hover:bg-[#FFDC5F] text-[#001840] px-5 py-3 rounded-lg font-semibold text-sm transition-colors duration-150"
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Close user menu on outside click */}
      {userMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
      )}
    </header>
  );
}
