import { API as CONFIG_API } from '../../config/api';

export const API = CONFIG_API;
export const tok = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });

// ── Application status config (enrollment pipeline) ──────────────────────────
export const STATUS_CFG = {
  draft:             { label: 'Draft',             color: 'bg-gray-100 text-gray-700' },
  submitted:         { label: 'Pending approval',           color: 'bg-amber-100 text-amber-800' },
  pending_exam:      { label: 'Pending SSC exam',       color: 'bg-yellow-100 text-yellow-700' },
  verified:          { label: 'Verified',           color: 'bg-purple-100 text-purple-700' },
  returned:          { label: 'Returned for correction',           color: 'bg-orange-100 text-orange-700' },
  approved:          { label: 'Approved',           color: 'bg-green-100 text-green-700' },
  subjects_enrolled: { label: 'Subjects enrolled',  color: 'bg-indigo-100 text-indigo-700' },
  enrolled:          { label: 'Enrolled',           color: 'bg-emerald-100 text-emerald-700' },
  active:            { label: 'Active',             color: 'bg-cyan-100 text-cyan-700' },
  completed:         { label: 'Completed',          color: 'bg-slate-100 text-slate-700' },
  rejected:          { label: 'Rejected',           color: 'bg-red-100 text-red-700' },
};

// ── Life status config (what happened to the student after enrollment) ────────
export const LIFE_STATUS_CFG = {
  enrolled:         { label: 'Enrolled',          color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  dropped:          { label: 'Dropped',            color: 'bg-red-100 text-red-700',         dot: 'bg-red-500' },
  transferred_out:  { label: 'Transferred Out',    color: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-500' },
  transferred_in:   { label: 'Transferred In',     color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500' },
  retained:         { label: 'Retained',           color: 'bg-yellow-100 text-yellow-700',   dot: 'bg-yellow-500' },
  completed:        { label: 'Completed',          color: 'bg-slate-100 text-slate-600',     dot: 'bg-slate-400' },
};

