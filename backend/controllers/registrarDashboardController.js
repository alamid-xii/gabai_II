import { EnrollmentRecord } from '../models/enrollmentRecordModel.js';
import { Section } from '../models/sectionModel.js';
import { SchoolYear } from '../models/schoolYearModel.js';
import { buildRegistrarDashboard, dashboardFilters, resolveDashboardYear } from '../services/registrarDashboard.js';

export const getRegistrarDashboard = async (req, res) => {
  try {
    const query = dashboardFilters(req.query);
    const schoolYears = await SchoolYear.findAll({ attributes: ['year', 'isActive'], order: [['year', 'DESC']], raw: true });
    const academicYear = resolveDashboardYear(schoolYears, query.academicYear);
    // An unconfigured active year must never silently combine every school year.
    const [records, sections] = academicYear ? await Promise.all([
      EnrollmentRecord.findAll({
        attributes: ['id', 'userId', 'firstName', 'familyName', 'educationLevel', 'gradeLevel', 'academicYear',
          'enrollmentType', 'sscClass', 'sscApplied', 'sscResult', 'status', 'lifeStatus', 'sectionId',
          'createdAt', 'updatedAt', 'verified_at', 'approved_at'],
        where: { academicYear }, raw: true,
      }),
      Section.findAll({
        attributes: ['id', 'code', 'course', 'yearLevel', 'strand', 'capacity', 'schoolYear', 'isActive'],
        where: { schoolYear: academicYear, isActive: true }, raw: true,
      }),
    ]) : [[], []];
    res.set('Cache-Control', 'no-store');
    return res.json(buildRegistrarDashboard({ records, sections, schoolYears, query: { ...query, academicYear } }));
  } catch (error) {
    if (!error.status) console.error('Registrar dashboard error:', error);
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Unable to load the registrar dashboard. Please try again.' });
  }
};
