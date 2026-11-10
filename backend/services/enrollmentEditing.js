export function assertEnrollmentEditable(enrollment) {
  if (enrollment.sscApplied && !enrollment.sscResult && enrollment.status === 'pending_exam') {
    throw Object.assign(Error('Wait for your SSC exam result before completing the enrollment form.'), { status: 409 });
  }
  // Older SSC exam result handlers left a blank placeholder in submitted status.
  // This exception ends as soon as the applicant starts the full form.
  const completedExamPlaceholder = enrollment.sscApplied && enrollment.sscResult && !enrollment.firstName && enrollment.status === 'submitted';
  if (!['draft', 'returned'].includes(enrollment.status) && !completedExamPlaceholder) {
    throw Object.assign(Error(`Enrollment cannot be edited with status: ${enrollment.status}`), { status: 400 });
  }
}
