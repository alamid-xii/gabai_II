const SCHOOL_LEVELS = new Set(['all', 'jhs_regular', 'jhs_ssc', 'shs']);
const ENROLLMENT_TYPES = new Set(['all', 'new', 'old', 'returnee', 'transferee']);
const STATUS_LABELS = {
  submitted: 'Submitted', pending_exam: 'Pending SSC exam', verified: 'Verified',
  returned: 'Returned for correction', approved: 'Approved', subjects_enrolled: 'Subjects enrolled',
  enrolled: 'Enrolled', active: 'Active', completed: 'Completed', rejected: 'Rejected',
};
const truthy = value => value === true || value === 1 || value === '1';
const timestamp = value => value ? new Date(value).getTime() || 0 : 0;

export function schoolLevelOf(record) {
  if (record.educationLevel === 'SHS') return 'shs';
  if (record.educationLevel !== 'JHS') return null;
  const ssc = record.sscClass === 'SSC' ||
    (truthy(record.sscApplied) && !record.sscClass && record.sscResult !== 'failed');
  return ssc ? 'jhs_ssc' : 'jhs_regular';
}

function sectionLevelOf(section) {
  if (section.course === 'SHS') return 'shs';
  if (section.course !== 'JHS') return null;
  return section.strand === 'SSC' ? 'jhs_ssc' : 'jhs_regular';
}

export function dashboardFilters(query = {}) {
  const schoolLevel = query.schoolLevel ?? 'all';
  const enrollmentType = query.enrollmentType ?? 'all';
  if (!SCHOOL_LEVELS.has(schoolLevel) || !ENROLLMENT_TYPES.has(enrollmentType) ||
      (query.academicYear != null && (typeof query.academicYear !== 'string' || query.academicYear.length > 20))) {
    const error = new Error('Choose a valid school year, school level and enrollment type.');
    error.status = 400;
    throw error;
  }
  return { academicYear: query.academicYear || null, schoolLevel, enrollmentType };
}

export function resolveDashboardYear(schoolYears, requestedYear) {
  if (requestedYear && !schoolYears.some(year => year.year === requestedYear)) {
    const error = new Error('The selected school year does not exist.');
    error.status = 400;
    throw error;
  }
  return requestedYear || schoolYears.find(year => truthy(year.isActive))?.year || null;
}

function isEnrolled(record) {
  return ['enrolled', 'active'].includes(record.status) &&
    !['dropped', 'transferred_out', 'retained', 'completed'].includes(record.lifeStatus);
}

function distinctStudents(records) {
  const students = new Map();
  for (const record of records) {
    const key = record.userId ? `user:${record.userId}` : `record:${record.id}`;
    const existing = students.get(key);
    if (!existing || timestamp(record.updatedAt) > timestamp(existing.updatedAt) ||
        (timestamp(record.updatedAt) === timestamp(existing.updatedAt) && Number(record.id) > Number(existing.id))) students.set(key, record);
  }
  return [...students.values()];
}

// Pure aggregation keeps dashboard counts testable without a running database.
export function buildRegistrarDashboard({ records = [], sections = [], schoolYears = [], query = {} }) {
  const filters = dashboardFilters(query);
  const academicYear = resolveDashboardYear(schoolYears, filters.academicYear);
  const yearRecords = academicYear ? records.filter(record => record.academicYear === academicYear) : [];
  const matches = record => schoolLevelOf(record) &&
    (filters.schoolLevel === 'all' || schoolLevelOf(record) === filters.schoolLevel) &&
    (filters.enrollmentType === 'all' || record.enrollmentType === filters.enrollmentType);
  const applications = yearRecords.filter(record => record.status !== 'draft' && matches(record));
  const enrolled = distinctStudents(applications.filter(isEnrolled));
  const sectionsInScope = academicYear ? sections.filter(section => truthy(section.isActive) && section.schoolYear === academicYear &&
    sectionLevelOf(section) && (filters.schoolLevel === 'all' || sectionLevelOf(section) === filters.schoolLevel)) : [];
  const capacity = sectionsInScope.map(section => {
    // Seats reflect every current occupant, regardless of the enrollment-type chart filter.
    const occupants = distinctStudents(yearRecords.filter(record => Number(record.sectionId) === Number(section.id) && isEnrolled(record)));
    const limit = Math.max(0, Number(section.capacity) || 0);
    return {
      id: section.id, code: section.code, yearLevel: Number(section.yearLevel), course: section.course,
      strand: section.strand || null, capacity: limit, enrolled: occupants.length,
      available: Math.max(0, limit - occupants.length),
    };
  }).sort((a, b) => (b.enrolled / (b.capacity || 1)) - (a.enrolled / (a.capacity || 1)) || a.yearLevel - b.yearLevel || String(a.code).localeCompare(String(b.code)));
  const reviewQueue = applications.filter(record => ['submitted', 'verified'].includes(record.status));
  const recentActivity = [];
  for (const record of applications) {
    const student = [record.firstName, record.familyName].filter(Boolean).join(' ').trim() || record.user_name || `Student #${record.userId || record.id}`;
    const events = [
      ['created', 'Application record created', record.createdAt],
      ['verified', 'Application verified', record.verified_at],
      ['approval', record.status === 'rejected' ? 'Application rejected' : 'Application approved', record.approved_at],
    ];
    const specificTimes = new Set(events.map(([, , date]) => timestamp(date)));
    if (!specificTimes.has(timestamp(record.updatedAt))) events.push(['updated', 'Enrollment record updated', record.updatedAt]);
    for (const [type, label, date] of events) {
      if (!timestamp(date)) continue;
      recentActivity.push({ id: `${record.id}-${type}`, enrollmentId: record.id, student, label, timestamp: new Date(date).toISOString() });
    }
  }
  recentActivity.sort((a, b) => timestamp(b.timestamp) - timestamp(a.timestamp) || String(a.id).localeCompare(String(b.id)));
  return {
    academicYear,
    schoolYears: schoolYears.map(year => ({ year: year.year, isActive: truthy(year.isActive) })),
    filters: { schoolLevel: filters.schoolLevel, enrollmentType: filters.enrollmentType },
    summary: {
      enrolled: enrolled.length, needsReview: reviewQueue.length,
      awaitingSection: applications.filter(record => ['approved', 'subjects_enrolled'].includes(record.status) && !record.sectionId).length,
      availableSections: capacity.filter(section => section.available > 0).length,
      availableSlots: capacity.reduce((sum, section) => sum + section.available, 0),
    },
    gradeDistribution: Array.from({ length: 6 }, (_, index) => {
      const grade = index + 7;
      return { grade: `Grade ${grade}`, enrolled: enrolled.filter(record => Number(String(record.gradeLevel || '').replace(/\D/g, '')) === grade).length };
    }),
    statusDistribution: Object.entries(STATUS_LABELS).map(([status, label]) => ({ status, label, count: applications.filter(record => record.status === status).length })),
    pendingApplications: reviewQueue.sort((a, b) => timestamp(a.createdAt) - timestamp(b.createdAt) || Number(a.id) - Number(b.id)).slice(0, 8).map(record => ({
      id: record.id, firstName: record.firstName, familyName: record.familyName, user_name: record.user_name || null,
      gradeLevel: record.gradeLevel, enrollmentType: record.enrollmentType, status: record.status, createdAt: record.createdAt,
    })),
    sections: capacity,
    recentActivity: recentActivity.slice(0, 8),
  };
}
