// Allowed enrollment (applicant) types per grade level.
// Shared by the level-selection modal and the enrollment form so both enforce the same rules.
export const ENROLLMENT_TYPE_LABELS = {
  new: "New",
  old: "Continuing",
  transferee: "Transferee",
  returnee: "Returnee",
};

export const ENROLLMENT_TYPES_BY_GRADE = {
  "Grade 7": ["new", "transferee"],
  "Grade 8": ["old", "transferee", "returnee"],
  "Grade 9": ["old", "transferee", "returnee"],
  "Grade 10": ["old", "transferee", "returnee"],
  "Grade 11": ["new", "old", "transferee"],
  "Grade 12": ["old", "transferee", "returnee"],
};

export const GRADES_BY_LEVEL = {
  JHS: ["Grade 7", "Grade 8", "Grade 9", "Grade 10"],
  SHS: ["Grade 11", "Grade 12"],
};

export function allowedEnrollmentTypes(gradeLevel) {
  return ENROLLMENT_TYPES_BY_GRADE[gradeLevel] || [];
}

// Keeps the chosen type if it is valid for the grade; otherwise falls back to the grade's first allowed type.
export function normalizeEnrollmentType(gradeLevel, enrollmentType) {
  const allowed = allowedEnrollmentTypes(gradeLevel);
  if (!allowed.length) return enrollmentType || "new";
  return allowed.includes(enrollmentType) ? enrollmentType : allowed[0];
}
