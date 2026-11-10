export const gradeNumber = value => Number(String(value ?? '').replace(/^Grade\s+/i, ''));

export function validateProgramGrade(program, grade) {
  if (!['JHS', 'SHS'].includes(program)) throw new Error('Program must be JHS or SHS.');
  const number = gradeNumber(grade);
  if (!Number.isInteger(number) || (program === 'JHS' ? number < 7 || number > 10 : number < 11 || number > 12)) {
    throw new Error(program === 'JHS' ? 'JHS grades must be 7 to 10.' : 'SHS grades must be 11 or 12.');
  }
}

export function enrollmentTrack(enrollment) {
  return enrollment.educationLevel === 'SHS' ? enrollment.strand : enrollment.sscClass === 'SSC' ? 'SSC' : 'Regular';
}

export function assertSectionCompatible(enrollment, section) {
  validateProgramGrade(enrollment.educationLevel, enrollment.gradeLevel);
  if (section.course !== enrollment.educationLevel || Number(section.yearLevel) !== gradeNumber(enrollment.gradeLevel)
      || !enrollment.academicYear || section.schoolYear !== enrollment.academicYear) {
    throw new Error('The section must match the enrollment program, grade, and school year.');
  }
  const targetTrack = section.strand || (section.course === 'JHS' ? 'Regular' : '');
  if (targetTrack !== enrollmentTrack(enrollment)) throw new Error('The section must match the enrollment strand or class.');
}

export function subjectMatchesScope(subject, section) {
  return subject.programCode === section.course && Number(subject.gradeLevel) === Number(section.yearLevel)
    && (!subject.strand || subject.strand === (section.strand || (section.course === 'JHS' ? 'Regular' : '')))
    && subject.semester === section.semester;
}

export function validateSectionConfiguration(input) {
  validateProgramGrade(input.course, input.yearLevel);
  if (typeof input.code !== 'string' || !input.code.trim() || input.code.length > 20) throw new Error('Section code is required and must be at most 20 characters.');
  if (!Number.isInteger(Number(input.capacity ?? 40)) || Number(input.capacity ?? 40) < 1 || Number(input.capacity ?? 40) > 100) throw new Error('Capacity must be a whole number between 1 and 100.');
  if (typeof input.schoolYear !== 'string' || !/^\d{4}-\d{4}$/.test(input.schoolYear) || Number(input.schoolYear.slice(5)) !== Number(input.schoolYear.slice(0, 4)) + 1) throw new Error('Use a valid consecutive school year.');
  if (input.course === 'JHS' && input.strand && !['Regular', 'SSC'].includes(input.strand)) throw new Error('JHS class must be Regular or SSC.');
}
