import { Calendar, CheckCircle2, Clock, RefreshCw, RotateCcw, ChevronRight, Users } from "lucide-react";
import { StatusBadge } from "./RegistrarShared";

// ── Overview Tab ──────────────────────────────────────────────────────────────
export function OverviewTab({ stats, recentEnrollments, onRefresh, onNavigate }) {
  const s = stats || {};

  // Cards reflect the registrar's action queue in workflow order
  const cards = [
    {
      label: 'Needs Review',
      sublabel: 'Submitted applications',
      value: s.submitted ?? 0,
      icon: Clock,
      bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100',
      tab: 'enrollments',
    },
    {
      label: 'Pending SSC Exam',
      sublabel: 'Awaiting exam schedule / result',
      value: s.pending_exam ?? 0,
      icon: Calendar,
      bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100',
      tab: 'ssc',
    },
    {
      label: 'Approved / Enrolled',
      sublabel: 'Fully processed this year',
      value: (s.approved ?? 0) + (s.enrolled ?? 0),
      icon: CheckCircle2,
      bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100',
      tab: 'enrollments',
    },
    {
      label: 'Returned to Student',
      sublabel: 'Waiting for corrections',
      value: s.returned ?? 0,
      icon: RotateCcw,
      bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100',
      tab: 'enrollments',
    },
    {
      label: 'Total Students',
      sublabel: 'Enrolled this school year',
      value: s.totalStudents ?? 0,
      icon: Users,
      bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100',
      tab: 'students',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards — clickable to jump to relevant tab */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {cards.map(card => (
          <button
            key={card.label}
            type="button"
            onClick={() => onNavigate?.(card.tab)}
            className={`bg-white rounded-2xl border ${card.border} p-5 flex items-center gap-4 text-left hover:shadow-sm transition-shadow group w-full`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.bg} ${card.text}`}>
              <card.icon size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold text-[#001840]">{card.value}</p>
              <p className="text-xs font-medium text-gray-600 leading-tight">{card.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{card.sublabel}</p>
            </div>
            <ChevronRight size={14} className="text-gray-300 shrink-0 group-hover:text-gray-500 transition-colors" />
          </button>
        ))}
      </div>

      {/* Level breakdown */}
      {((s.jhs ?? 0) + (s.shs ?? 0)) > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'JHS Applications', value: s.jhs ?? 0, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
            { label: 'SHS Applications', value: s.shs ?? 0, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
          ].map(b => (
            <div key={b.label} className={`bg-white rounded-2xl border ${b.border} px-5 py-4 flex items-center justify-between`}>
              <span className="text-sm text-gray-500">{b.label}</span>
              <span className={`text-xl font-bold ${b.color}`}>{b.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent Enrollments table */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-[#001840] text-sm">Recent Enrollments</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate?.('enrollments')}
              className="text-xs text-[#001840] font-medium hover:underline flex items-center gap-1"
            >
              View all <ChevronRight size={12} />
            </button>
            <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <RefreshCw size={14} className="text-gray-400" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                {['Student', 'Level', 'Program / Grade', 'Status', 'Submitted'].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentEnrollments.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400 text-sm">No recent enrollments</td></tr>
              ) : recentEnrollments.slice(0, 10).map(e => (
                <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-800">
                    {(e.firstName || e.familyName)
                      ? `${e.firstName || ''} ${e.familyName || ''}`.trim()
                      : (e.user_name || `Student #${e.userId || e.id}`)}
                  </td>
                  <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{e.educationLevel || '—'}</td>
                  <td className="px-6 py-3 text-gray-500 max-w-40 truncate">{e.course || e.gradeLevel || '—'}</td>
                  <td className="px-6 py-3"><StatusBadge status={e.status} /></td>
                  <td className="px-6 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-PH') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
