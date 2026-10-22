import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { toast } from 'sonner';
import { BookOpen, Clock, MapPin, User, Loader, AlertCircle, ArrowLeft, Award, CheckCircle, XCircle } from 'lucide-react';
import { API } from '../../config/api';

const getToken = () => localStorage.getItem('token');

export function StudentDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState(null);
  const [enrolledSubjects, setEnrolledSubjects] = useState([]);
  const [totalUnits, setTotalUnits] = useState(0);
  const [adviserName, setAdviserName] = useState(null);
  const [grades, setGrades] = useState([]);
  const [gradesSummary, setGradesSummary] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, [id]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      
      // Get enrollment details
      const enrollRes = await fetch(`${API}/enrollments/${id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      
      if (!enrollRes.ok) throw new Error('Failed to load enrollment');
      const enrollData = await enrollRes.json();
      setEnrollment(enrollData);
      
      // adviserName comes directly from the enrollment response
      if (enrollData.adviserName) setAdviserName(enrollData.adviserName);

      // Get enrolled subjects
      const subjectsRes = await fetch(`${API}/enrollments/${id}/subjects`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      
      if (subjectsRes.ok) {
        const subjectsData = await subjectsRes.json();
        setEnrolledSubjects(subjectsData.subjects || []);
        setTotalUnits(subjectsData.totalUnits || 0);
      }

      // Get grades
      try {
        const gradesRes = await fetch(`${API}/enrollments/${id}/grades`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (gradesRes.ok) {
          const gradesData = await gradesRes.json();
          setGrades(gradesData.grades || []);
          setGradesSummary(gradesData.summary || null);
        }
      } catch (_) {} // grades are optional — don't fail the whole dashboard
    } catch (error) {
      console.error('Load dashboard error:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0] flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-[#102A71] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Enrollment not found</p>
        </div>
      </div>
    );
  }

  const enrollmentTypeLabel = (() => {
    if (enrollment.educationLevel === 'JHS') {
      return `${enrollment.gradeLevel || 'JHS'}`;
    }
    if (enrollment.educationLevel === 'SHS') {
      return `${enrollment.gradeLevel || 'SHS'}${enrollment.strand ? ` — ${enrollment.strand}` : ''}`;
    }
    // College
    return `${enrollment.course || ''}${enrollment.major ? ` (${enrollment.major})` : ''}`;
  })();

  return (
    <div className="min-h-screen bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0] py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/enrollment/${id}`)}
            className="flex items-center gap-2 text-[#102A71] hover:text-[#001840] mb-4 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Enrollment Details
          </button>
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-8 h-8 text-[#102A71]" />
            <h1 className="text-3xl font-bold text-[#001840]">Student Dashboard</h1>
          </div>
          <p className="text-gray-600">View your enrolled subjects and schedule</p>
        </div>

        {/* Enrollment Info Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Student Name</p>
              <p className="text-lg font-semibold text-[#001840]">
                {enrollment.firstName} {enrollment.familyName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Student Number</p>
              {enrollment.studentNumber ? (
                <p className="text-lg font-bold text-[#102A71] font-mono tracking-wider">
                  {enrollment.studentNumber}
                </p>
              ) : (
                <p className="text-sm text-yellow-600 font-medium">Pending ID assignment</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Program</p>
              <p className="text-lg font-semibold text-[#001840]">{enrollmentTypeLabel}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Units</p>
              <p className="text-lg font-semibold text-[#F5C400]">{totalUnits}</p>
            </div>
          </div>

          {/* Section Assignment */}
          {enrollment.sectionName && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-3">
              <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3 flex-1 min-w-50">
                <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Assigned Section</p>
                  <p className="text-xl font-bold text-emerald-800">Section {enrollment.sectionName}</p>
                </div>
              </div>
              {adviserName && (
                <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-3 flex-1 min-w-50">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Class Adviser</p>
                    <p className="text-base font-bold text-blue-800">{adviserName}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-end flex-1 min-w-50">
                <Link
                  to="/my-schedule"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-[#001840] hover:bg-[#102A71] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
                >
                  <Clock className="w-4 h-4 text-[#FFDC5F]" />
                  <span>View Class Timetable</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Enrolled Subjects */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-[#FFFDF0] border-b border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-[#001840]">
              Enrolled Subjects ({enrolledSubjects.length})
            </h2>
          </div>

          {enrolledSubjects.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No subjects enrolled yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Units</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Section</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Instructor</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Schedule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {enrolledSubjects.map(subject => (
                    <tr key={subject.id} className="hover:bg-[#FFFDF0] transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-[#102A71]">
                          {subject.code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-900">{subject.description}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-[#FFFDF0] rounded-full text-sm font-semibold text-[#102A71]">
                          {subject.units}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {subject.section ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                            {subject.section}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {subject.instructor ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{subject.instructor}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {subject.schedule ? (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{subject.schedule}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-blue-900">Schedule Information</p>
            <p className="text-sm text-blue-800 mt-1">
              Section assignments and instructor information will be updated by the admin. Check back regularly for updates.
            </p>
          </div>
        </div>

        {/* ── Grades Section ── */}
        {grades.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mt-6">
            <div className="bg-[#FFFDF0] border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-[#F5C400]" />
                <h2 className="text-lg font-semibold text-[#001840]">My Grades</h2>
              </div>
              {gradesSummary && gradesSummary.gwa !== null && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">General Weighted Average</p>
                  <p className={`text-xl font-bold ${gradesSummary.gwa >= 75 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {gradesSummary.gwa}
                  </p>
                </div>
              )}
            </div>

            {/* Summary chips */}
            {gradesSummary && (
              <div className="flex gap-3 px-4 py-3 border-b border-gray-100 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                  <CheckCircle className="w-3 h-3" /> Passed: {gradesSummary.passed}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                  <XCircle className="w-3 h-3" /> Failed: {gradesSummary.failed}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                  <Clock className="w-3 h-3" /> Incomplete: {gradesSummary.incomplete}
                </span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Subject</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Q1</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Q2</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Q3</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Q4</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Final</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {grades.map(g => (
                    <tr key={g.id} className="hover:bg-[#FFFDF0] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-mono text-sm font-semibold text-[#102A71]">{g.subjectCode}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{g.subjectDescription}</p>
                      </td>
                      {['q1','q2','q3','q4'].map(q => (
                        <td key={q} className="px-4 py-3 text-center">
                          <span className={`text-sm font-semibold ${
                            g[q] === null || g[q] === undefined ? 'text-gray-300' :
                            parseFloat(g[q]) >= 75 ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            {g[q] !== null && g[q] !== undefined ? g[q] : '—'}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-bold ${
                          g.finalGrade === null || g.finalGrade === undefined ? 'text-gray-300' :
                          parseFloat(g.finalGrade) >= 75 ? 'text-emerald-700' : 'text-red-600'
                        }`}>
                          {g.finalGrade !== null && g.finalGrade !== undefined ? g.finalGrade : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!g.remarks || g.remarks === 'Incomplete' ? (
                          <span className="text-xs text-gray-400 italic">Incomplete</span>
                        ) : g.remarks === 'Passed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                            <CheckCircle className="w-3 h-3" /> Passed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                            <XCircle className="w-3 h-3" /> Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-400">
              Grades are entered by your subject teachers. Contact the Registrar if you see any discrepancy.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
