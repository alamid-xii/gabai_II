import express from 'express';
import { authenticateToken, requireTeacher } from '../middleware/auth.js';
import { getTeacherSections, getSectionStudents } from '../controllers/teacherController.js';
import { getTeacherClasses, getGradeSheet, saveGrade } from '../controllers/gradingController.js';
import { getTeacherSchedule, downloadTeacherSchedulePDF } from '../controllers/scheduleController.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireTeacher);

// GET /api/teacher/sections — all sections where this teacher is the adviser
router.get('/sections', getTeacherSections);

// GET /api/teacher/sections/:id/students — students in a specific section
router.get('/sections/:id/students', getSectionStudents);

// GET /api/teacher/classes — all subject+section combos assigned to this teacher
router.get('/classes', getTeacherClasses);

// GET /api/teacher/classes/:sectionId/:subjectCode/grades — grade sheet for a subject+section
router.get('/classes/:sectionId/:subjectCode/grades', getGradeSheet);

// PUT /api/teacher/grades/:enrollmentSubjectId — save a quarterly grade
router.put('/grades/:enrollmentSubjectId', saveGrade);

// GET /api/teacher/my-schedule — teacher's own teaching schedule
router.get('/my-schedule', getTeacherSchedule);

// GET /api/teacher/my-schedule/pdf — download teacher's schedule PDF
router.get('/my-schedule/pdf', downloadTeacherSchedulePDF);

export default router;
