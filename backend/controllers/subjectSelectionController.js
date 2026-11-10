import { Op } from 'sequelize';
import { enrollmentTrack, gradeNumber } from '../services/academicScope.js';
import { moveToSection } from '../services/sectionAssignment.js';
import { EnrollmentRecord } from '../models/enrollmentRecordModel.js';
import { EnrollmentSubject } from '../models/enrollmentSubjectModel.js';
import { Subject } from '../models/subjectModel.js';

/**
 * Get available subjects for a student based on their enrollment
 * GET /api/enrollments/:id/available-subjects
 */
export const getAvailableSubjects = async (req, res) => {
  try {
    const { id } = req.params;
    
    const enrollment = await EnrollmentRecord.findByPk(id);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }
    
    // Check authorization
    if (!['admin', 'registrar'].includes(req.user.role) && Number(enrollment.userId) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const subjects = await Subject.findAll({ where: {
      isActive: true, programCode: enrollment.educationLevel,
      gradeLevel: gradeNumber(enrollment.gradeLevel), semester: '1st',
      [Op.or]: [{ strand: enrollmentTrack(enrollment) }, { strand: null }, { strand: '' }],
    } });

    res.json({
      enrollment: {
        id: enrollment.id,
        educationLevel: enrollment.educationLevel,
        gradeLevel: enrollment.gradeLevel,
        strand: enrollment.strand,
        course: enrollment.course,
        major: enrollment.major,
        studentStatus: enrollment.studentStatus
      },
      subjects: subjects,
      totalSubjects: subjects.length,
      totalUnits: subjects.reduce((sum, s) => sum + parseFloat(s.units || 0), 0)
    });
  } catch (error) {
    console.error('Get available subjects error:', error);
    res.status(500).json({ message: 'Failed to fetch available subjects' });
  }
};

/**
 * Enroll student in subjects
 * POST /api/enrollments/:id/enroll-subjects
 * Body: { subjectIds: [1, 2, 3] } for irregular students
 *       or {} for regular students (auto-enroll all available)
 */
export const enrollSubjects = async (req, res) => {
  try {
    if (!['admin', 'registrar'].includes(req.user.role)) return res.status(403).json({ message: 'Subjects are assigned by the registrar after approval.' });
    const enrollment = await EnrollmentRecord.findByPk(req.params.id);
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
    if (!['approved', 'subjects_enrolled', 'enrolled', 'active'].includes(enrollment.status)) return res.status(409).json({ message: 'Approve the enrollment before assigning subjects.' });
    if (!enrollment.sectionId) return res.status(409).json({ message: 'Assign a compatible section before enrolling subjects.' });
    const result = await moveToSection(Number(enrollment.id), Number(enrollment.sectionId));
    if (!result.success) return res.status(400).json({ message: result.reason });
    const subjects = await EnrollmentSubject.findAll({ where: { enrollmentId: enrollment.id } });
    res.json({ message: 'Curriculum subjects assigned.', enrollmentId: enrollment.id, subjectsEnrolled: subjects.length,
      totalUnits: subjects.reduce((sum, subject) => sum + Number(subject.units || 0), 0) });
  } catch (error) {
    console.error('Enroll subjects error:', error);
    res.status(500).json({ message: 'Failed to enroll in subjects' });
  }
};

/**
 * Get enrolled subjects for a student
 * GET /api/enrollments/:id/subjects
 */
export const getEnrolledSubjects = async (req, res) => {
  try {
    const { id } = req.params;
    
    const enrollment = await EnrollmentRecord.findByPk(id);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }
    
    // Check authorization
    if (!['admin', 'registrar'].includes(req.user.role) && Number(enrollment.userId) !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const enrolledSubjects = await EnrollmentSubject.findAll({
      where: { enrollmentId: id },
      include: [
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'code', 'description', 'units']
        }
      ]
    });
    
    // Format response with section info
    const subjects = enrolledSubjects.map(es => ({
      id: es.id,
      code: es.subjectCode,
      description: es.subjectDescription,
      units: es.units,
      section: es.sectionName || null,
      schedule: es.schedule || null,
      instructor: es.instructor || null,
      room: es.room || null,
      status: es.status
    }));
    
    const totalUnits = enrolledSubjects.reduce((sum, es) => sum + parseFloat(es.units || 0), 0);
    
    res.json({
      enrollmentId: id,
      subjects: subjects,
      totalSubjects: enrolledSubjects.length,
      totalUnits: totalUnits
    });
  } catch (error) {
    console.error('Get enrolled subjects error:', error);
    res.status(500).json({ message: 'Failed to fetch enrolled subjects' });
  }
};

/**
 * Admin: Assign section to enrolled subjects
 * PUT /api/admin/enrollments/:id/assign-section
 * Body: { sectionId, sectionName, schedule, instructor, room }
 */
export const assignSection = async (req, res) => {
  const result = await moveToSection(Number(req.params.id), Number(req.body.sectionId));
  if (!result.success) return res.status(400).json({ message: result.reason });
  res.json({ message: 'Section assigned.', enrollmentId: Number(req.params.id), sectionInfo: result.section });
};

/**
 * Get total units for an enrollment
 * GET /api/enrollments/:id/total-units
 */
export const getTotalUnits = async (req, res) => {
  try {
    const { id } = req.params;
    
    const enrollment = await EnrollmentRecord.findByPk(id);
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }
    
    if (!['admin', 'registrar'].includes(req.user.role) && Number(enrollment.userId) !== Number(req.user.id)) return res.status(403).json({ message: 'Not authorized' });

    const enrolledSubjects = await EnrollmentSubject.findAll({
      where: { enrollmentId: id }
    });
    
    const totalUnits = enrolledSubjects.reduce((sum, es) => sum + parseFloat(es.units || 0), 0);
    
    res.json({
      enrollmentId: id,
      totalSubjects: enrolledSubjects.length,
      totalUnits: totalUnits
    });
  } catch (error) {
    console.error('Get total units error:', error);
    res.status(500).json({ message: 'Failed to calculate total units' });
  }
};
