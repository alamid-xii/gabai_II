// Allowed enrollment (applicant) types per grade level.
// Shared by the level-selection modal and the enrollment form so both enforce the same rules.
export const ENROLLMENT_TYPE_LABELS = {
  new: "New",
  old: "Continuing",
  transferee: "Transferee",
  returnee: "Returnee",
};

import { allowedEnrollmentTypes } from '../../../shared/enrollmentRules.mjs';
export { ENROLLMENT_TYPES_BY_GRADE, GRADES_BY_LEVEL, allowedEnrollmentTypes } from '../../../shared/enrollmentRules.mjs';

// Keeps the chosen type if it is valid for the grade; otherwise falls back to the grade's first allowed type.
export function normalizeEnrollmentType(gradeLevel, enrollmentType) {
  const allowed = allowedEnrollmentTypes(gradeLevel);
  if (!allowed.length) return enrollmentType || "new";
  return allowed.includes(enrollmentType) ? enrollmentType : allowed[0];
}
