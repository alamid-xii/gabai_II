const STATUSES = ['submitted', 'pending_exam', 'verified', 'returned', 'approved', 'subjects_enrolled', 'enrolled', 'active', 'completed', 'rejected'];
export const WORKFLOW_FILTERS = {
  needs_review: 'Needs review',
  enrolled_active: 'Enrolled / active students',
  awaiting_section: 'Awaiting section assignment',
};

export function matchesRegistrarStatus(record, status) {
  if (!status || status === 'all') return true;
  if (status === 'needs_review') return ['submitted', 'verified'].includes(record.status);
  if (status === 'enrolled_active') return ['enrolled', 'active'].includes(record.status) && !['dropped', 'transferred_out', 'retained', 'completed'].includes(record.lifeStatus);
  if (status === 'awaiting_section') return ['approved', 'subjects_enrolled'].includes(record.status) && record.sectionId == null;
  return record.status === status;
}

export function availableRegistrarStatuses(records, selected = '') {
  const present = new Set(records.map(record => record.status));
  return STATUSES.filter(status => status === 'returned' || present.has(status) || status === selected);
}
