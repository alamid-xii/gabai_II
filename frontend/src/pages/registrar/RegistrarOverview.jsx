import { useEffect, useState } from "react";
import { Link } from "react-router";
import { AlertCircle, ArrowRight, CheckCircle2, ClipboardList, Clock, Download, Layers, RefreshCw, Users } from "lucide-react";
import { BarChart, Bar, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { API, tok, StatusBadge } from "./RegistrarShared";

const STATUS_COLORS = { submitted: "#2563eb", pending_exam: "#d97706", verified: "#7c3aed", returned: "#ea580c", approved: "#0d9488", subjects_enrolled: "#4f46e5", enrolled: "#059669", active: "#0891b2", completed: "#64748b", rejected: "#dc2626" };
const TYPES = { new: "New", old: "Continuing", transferee: "Transferee", returnee: "Returnee" };
const LEVELS = { all: "All school levels", jhs_regular: "JHS Regular", jhs_ssc: "JHS SSC", shs: "SHS" };
const studentName = (e) => `${e.firstName || ""} ${e.familyName || ""}`.trim() || e.user_name || `Application #${e.id}`;
const formatDate = (date) => date ? new Date(date).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const selectClass = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#001840] focus:outline-none focus:ring-2 focus:ring-[#102A71]/30";

function DashboardLink({ enabled, children, to, ...props }) {
  if (!enabled) return <span {...props} aria-disabled="true" className={`${props.className || ""} opacity-50`}>{children}</span>;
  return <Link to={to} {...props}>{children}</Link>;
}

function Panel({ title, description, action, children }) {
  return <section className="min-w-0 rounded-2xl border border-gray-200 bg-white">
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
      <div><h2 className="text-sm font-semibold text-[#001840]">{title}</h2>{description && <p className="mt-1 text-xs text-gray-500">{description}</p>}</div>{action}
    </div>{children}
  </section>;
}

export function OverviewTab({ refreshKey = 0 }) {
  const [filters, setFilters] = useState({ academicYear: "", schoolLevel: "all", enrollmentType: "all" });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams(filters);
        if (!filters.academicYear) params.delete("academicYear");
        const response = await fetch(`${API}/registrar/dashboard?${params}`, { headers: tok(), signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || result.message || "Unable to load the registrar dashboard.");
        if (!controller.signal.aborted) setData(result);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message || "Unable to connect to the server.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [filters, refreshKey, retry]);

  function changeFilter(key, value) {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }
  function enrollmentLink(extra = {}) {
    const params = new URLSearchParams({ ...filters, academicYear: filters.academicYear || data?.academicYear || "", ...extra });
    if (!params.get("academicYear")) params.delete("academicYear");
    return `/registrar/enrollments?${params}`;
  }
  const sectionParams = new URLSearchParams({ academicYear: filters.academicYear || data?.academicYear || "", schoolLevel: filters.schoolLevel });
  const sectionLink = `/registrar/sections?${sectionParams}`;
  const summary = data?.summary || {};
  const statusData = (data?.statusDistribution || []).filter((item) => item.count > 0);
  const gradeData = (data?.gradeDistribution || []).filter((item) => filters.schoolLevel === "shs" ? /11|12/.test(item.grade) : filters.schoolLevel.startsWith("jhs") ? !/11|12/.test(item.grade) : true);
  const cards = [
    { label: "Enrolled students", value: summary.enrolled, description: "Enrolled and active students", icon: Users, color: "bg-emerald-50 text-emerald-700", to: enrollmentLink({ status: "enrolled_active" }) },
    { label: "Needs review", value: summary.needsReview, description: "Submitted and verified applications", icon: ClipboardList, color: "bg-blue-50 text-blue-700", to: enrollmentLink({ status: "needs_review" }) },
    { label: "Awaiting section", value: summary.awaitingSection, description: "Approved, without a section", icon: Clock, color: "bg-amber-50 text-amber-700", to: enrollmentLink({ status: "awaiting_section" }) },
    { label: "Sections with space", value: summary.availableSections, description: `${summary.availableSlots ?? 0} available slots`, icon: Layers, color: "bg-violet-50 text-violet-700", to: sectionLink },
  ];

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold text-[#001840]">Enrollment overview{data?.academicYear ? ` · SY ${data.academicYear}` : ""}</p><p className="text-xs text-gray-500 mt-1">Monitor applications, student enrollment and available section slots.</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full xl:w-auto">
        <label className="space-y-1"><span className="text-xs font-medium text-gray-600">School year</span><select aria-label="School year" value={filters.academicYear || data?.academicYear || ""} onChange={(e) => changeFilter("academicYear", e.target.value)} className={selectClass}>
          {!data?.academicYear && !filters.academicYear && <option value="">Select a school year</option>}
          {(data?.schoolYears || []).map((year) => <option key={year.year} value={year.year}>{year.year}{year.isActive ? " (current)" : ""}</option>)}
        </select></label>
        <label className="space-y-1"><span className="text-xs font-medium text-gray-600">School level / class</span><select aria-label="School level / class" value={filters.schoolLevel} onChange={(e) => changeFilter("schoolLevel", e.target.value)} className={selectClass}>{Object.entries(LEVELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="space-y-1"><span className="text-xs font-medium text-gray-600">Enrollment type</span><select aria-label="Enrollment type" value={filters.enrollmentType} onChange={(e) => changeFilter("enrollmentType", e.target.value)} className={selectClass}><option value="all">All enrollment types</option>{Object.entries(TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
    </div>

    {loading ? <div role="status" className="flex items-center justify-center gap-2 py-24 text-sm text-gray-500"><RefreshCw size={18} className="animate-spin" /> Loading dashboard...</div> : error ? <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"><AlertCircle size={20} /><span className="flex-1">{error}</span><button className="rounded-lg border border-red-200 px-3 py-2 font-medium" onClick={() => setRetry((value) => value + 1)}>Try again</button></div> : <>
      {!data?.academicYear && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No active school year is configured. Select an existing school year to view its records, or ask the administrator to activate one.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => { const { label, value, description, icon: Icon, color, to } = card; return <DashboardLink enabled={Boolean(data?.academicYear)} key={label} to={to} className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 hover:border-[#102A71]/30 hover:shadow-sm transition-all focus-visible:outline-2 focus-visible:outline-[#102A71]">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon size={21} /></span>
          <div><p className="text-3xl font-bold text-[#001840] tabular-nums">{(value || 0).toLocaleString()}</p><p className="text-sm font-medium text-gray-700 mt-1">{label}</p><p className="text-xs text-gray-500 mt-1">{description}</p></div>
        </DashboardLink>; })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Enrollment by grade level" description="Enrolled and active students in the selected filters.">
          <div className="p-5">
            {summary.enrolled > 0 ? <div className="h-64" role="img" aria-label={gradeData.map((grade) => `${grade.grade}: ${grade.enrolled}`).join(", ")}>
              <ResponsiveContainer width="100%" height="100%"><BarChart data={gradeData} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" /><XAxis dataKey="grade" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#f1f5f9" }} /><Bar dataKey="enrolled" name="Students" radius={[5, 5, 0, 0]} maxBarSize={48}>{gradeData.map((grade) => <Cell key={grade.grade} fill={/11|12/.test(grade.grade) ? "#d97706" : "#102A71"} />)}</Bar></BarChart></ResponsiveContainer>
            </div> : <div className="h-64 flex items-center justify-center text-sm text-gray-500">No enrolled students for these filters.</div>}
            <div className="flex justify-center gap-5 mt-3 text-xs text-gray-500"><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-[#102A71]" />JHS</span><span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-amber-600" />SHS</span></div>
          </div>
        </Panel>
        <Panel title="Application status" description="Application records by current status; drafts are excluded.">
          {statusData.length ? <div className="flex flex-col sm:flex-row items-center gap-3 p-5">
            <div className="h-64 w-full sm:w-1/2" role="img" aria-label={statusData.map((item) => `${item.label}: ${item.count}`).join(", ")}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="count" nameKey="label" innerRadius="58%" outerRadius="85%" paddingAngle={2}>{statusData.map((item) => <Cell key={item.status} fill={STATUS_COLORS[item.status] || "#64748b"} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
            <ul className="w-full sm:w-1/2 space-y-2">{statusData.map((item) => <li key={item.status} className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[item.status] || "#64748b" }} /><span className="flex-1 text-gray-600">{item.label}</span><span className="font-semibold text-[#001840] tabular-nums">{item.count}</span></li>)}</ul>
          </div> : <div className="h-72 flex items-center justify-center text-sm text-gray-500">No submitted applications for these filters.</div>}
        </Panel>
      </div>

      <Panel title="Applications needing review" description="Oldest submitted and verified applications first. Returned applications are waiting for student corrections." action={<DashboardLink enabled={Boolean(data?.academicYear)} to={enrollmentLink({ status: "needs_review" })} className="text-xs font-semibold text-[#102A71] inline-flex items-center gap-1">View queue <ArrowRight size={14} /></DashboardLink>}>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-xs text-gray-500"><tr>{["Student", "Grade", "Enrollment type", "Status", "Created", "Action"].map((title) => <th key={title} scope="col" className="px-5 py-3 text-left font-medium whitespace-nowrap">{title}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">{(data?.pendingApplications || []).map((application) => <tr key={application.id} className="hover:bg-gray-50/50"><td className="px-5 py-3 font-medium text-[#001840]">{studentName(application)}</td><td className="px-5 py-3 whitespace-nowrap text-gray-600">{application.gradeLevel || "—"}</td><td className="px-5 py-3 text-gray-600">{TYPES[application.enrollmentType] || "—"}</td><td className="px-5 py-3"><StatusBadge status={application.status} /></td><td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(application.createdAt)}</td><td className="px-5 py-3"><DashboardLink enabled={Boolean(data?.academicYear)} to={enrollmentLink({ application: application.id })} className="inline-flex items-center gap-1 rounded-lg bg-[#102A71] text-white px-3 py-2 text-xs font-medium" aria-label={`Review ${studentName(application)}`}>Review <ArrowRight size={12} /></DashboardLink></td></tr>)}
            {!data?.pendingApplications?.length && <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-500"><CheckCircle2 size={22} className="mx-auto mb-2 text-emerald-600" />No applications awaiting review for these filters.</td></tr>}
          </tbody></table></div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Section capacity" description="Fullest active sections first. Occupancy includes all enrollment types to show actual remaining space." action={<DashboardLink enabled={Boolean(data?.academicYear)} to={sectionLink} className="text-xs font-semibold text-[#102A71]">Manage sections</DashboardLink>}>
          <div className="p-5 space-y-5 max-h-96 overflow-y-auto">{(data?.sections || []).map((section) => {
            const full = section.available <= 0;
            const percent = section.capacity > 0 ? Math.min(100, section.enrolled / section.capacity * 100) : 0;
            return <div key={section.id}><div className="flex justify-between gap-3 text-sm"><span className="font-medium text-[#001840]">Grade {section.yearLevel} · {section.code}<span className="block text-xs text-gray-500 font-normal mt-0.5">{section.course}{section.strand ? ` · ${section.strand}` : " · Regular"}</span></span><span className="shrink-0 text-right"><span className="font-semibold text-gray-700">{section.enrolled}/{section.capacity}</span><span className={`block text-xs mt-0.5 ${full ? "text-red-600" : "text-emerald-700"}`}>{full ? "Full" : `${section.available} slots left`}</span></span></div><div className="h-2 mt-2 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-label={`${section.code} occupancy`} aria-valuemin={0} aria-valuemax={Math.max(section.capacity, section.enrolled, 1)} aria-valuenow={section.enrolled}><div className={`h-full rounded-full ${full ? "bg-red-500" : percent >= 85 ? "bg-amber-500" : "bg-[#102A71]"}`} style={{ width: `${percent}%` }} /></div></div>;
          })}{!data?.sections?.length && <p className="text-center py-8 text-sm text-gray-500">No active sections for this school year and level.</p>}</div>
        </Panel>
        <Panel title="Recent record activity" description="Recorded updates and workflow events, with the latest changes first.">
          <ul className="divide-y divide-gray-100">{(data?.recentActivity || []).map((activity) => <li key={activity.id}><DashboardLink enabled={Boolean(data?.academicYear)} to={enrollmentLink({ application: activity.enrollmentId })} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50"><span className="mt-1.5 h-2 w-2 rounded-full bg-[#F5C400] shrink-0" /><span className="flex-1 min-w-0"><span className="block text-sm text-gray-700">{activity.label}</span><span className="block text-xs text-gray-500 mt-1 truncate">{activity.student}</span></span><time dateTime={activity.timestamp} className="text-xs text-gray-400 whitespace-nowrap">{formatDate(activity.timestamp)}</time></DashboardLink></li>)}{!data?.recentActivity?.length && <li className="p-10 text-center text-sm text-gray-500">No recorded activity for these filters.</li>}</ul>
        </Panel>
      </div>

      <Panel title="Quick actions">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 p-4">{[
          { label: "Review applications", sub: "Open the review queue", icon: ClipboardList, to: enrollmentLink({ status: "needs_review" }) },
          { label: "Manage enrollment", sub: "Browse application records", icon: Users, to: enrollmentLink() },
          { label: "Manage sections", sub: "Check assignments and capacity", icon: Layers, to: sectionLink },
          { label: "Export enrollment report", sub: "Use Export Excel on Enrollments", icon: Download, to: enrollmentLink() },
        ].map((action) => { const { label, sub, icon: Icon, to } = action; return <DashboardLink enabled={Boolean(data?.academicYear)} key={label} to={to} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 hover:bg-gray-50"><Icon size={19} className="text-[#102A71] shrink-0" /><span><span className="block text-sm font-medium text-[#001840]">{label}</span><span className="block text-xs text-gray-500 mt-1">{sub}</span></span></DashboardLink>; })}</div>
      </Panel>
    </>}
  </div>;
}
