// Keep applicant choices identical in the browser and at every server entry point.
export const ENROLLMENT_TYPES_BY_GRADE = Object.freeze({
  'Grade 7': Object.freeze(['new', 'transferee']),
  'Grade 8': Object.freeze(['old', 'transferee', 'returnee']),
  'Grade 9': Object.freeze(['old', 'transferee', 'returnee']),
  'Grade 10': Object.freeze(['old', 'transferee', 'returnee']),
  'Grade 11': Object.freeze(['new', 'old', 'transferee']),
  'Grade 12': Object.freeze(['old', 'transferee', 'returnee']),
});

export const GRADES_BY_LEVEL = Object.freeze({
  JHS: Object.freeze(['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10']),
  SHS: Object.freeze(['Grade 11', 'Grade 12']),
});

export function allowedEnrollmentTypes(gradeLevel) {
  return ENROLLMENT_TYPES_BY_GRADE[gradeLevel] || [];
}
