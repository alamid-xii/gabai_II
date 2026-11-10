import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { toast } from 'sonner';
import { BookOpen, Clock, MapPin, User, Loader, AlertCircle, ArrowLeft, Award, CheckCircle, XCircle } from 'lucide-react';
import { API } from '../../config/api';
import { useAuth } from '../../contexts/authState';

const getToken = () => localStorage.getItem('token');

export function StudentDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState(null);
  const [enrolledSubjects, setEnrolledSubjects] = useState([]);
  const [adviserName, setAdviserName] = useState(null);

  const [userEnrollments, setUserEnrollments] = useState([]);

  const loadDashboard = useCallback(async () => {
    try {

      let targetId = id;

      // Fetch user's enrollments list
      let list = [];
      if (user?.id) {
        try {
          const userEnrollRes = await fetch(`${API}/enrollments/user/${user.id}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
          });
          if (userEnrollRes.ok) {
            list = await userEnrollRes.json();
            if (Array.isArray(list)) setUserEnrollments(list);
          }
        } catch { /* Optional summary information is unavailable. */ }
      }

      // If no id param is provided, resolve the student's active/latest enrollment
      if (!targetId && list.length > 0) {
        let activeSY = null;
        try {
          const syRes = await fetch(`${API}/academic/school-years/active`);
          if (syRes.ok) {
            const syData = await syRes.json();
            activeSY = syData?.year || null;
          }
        } catch { /* Optional summary information is unavailable. */ }

        // Prioritize active/enrolled in active school year
        const activeInSY = activeSY
          ? list.find(e => (!e.academicYear || e.academicYear === activeSY) && ['enrolled', 'subjects_enrolled', 'active', 'approved'].includes(e.status))
          : null;
        const activeAny = list.find(e => ['enrolled', 'subjects_enrolled', 'active', 'approved'].includes(e.status));
        const completed = list.find(e => e.status === 'completed');
        targetId = activeInSY?.id || activeAny?.id || completed?.id || list[0]?.id;
      }

      if (!targetId) {
        setEnrollment(null);
        return;
      }

      // Get enrollment details
      const enrollRes = await fetch(`${API}/enrollments/${targetId}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (!enrollRes.ok) throw new Error('Failed to load enrollment');
      const enrollData = await enrollRes.json();
      setEnrollment(enrollData);

      // adviserName comes directly from the enrollment response
      if (enrollData.adviserName) setAdviserName(enrollData.adviserName);

      // Get enrolled subjects
      const subjectsRes = await fetch(`${API}/enrollments/${targetId}/subjects`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (subjectsRes.ok) {
        const subjectsData = await subjectsRes.json();
        setEnrolledSubjects(subjectsData.subjects || []);
      }

    } catch (error) {
      console.error('Load dashboard error:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  if (loading) {
    return (
      <div className="min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-5rem)] bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0] flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-[#102A71] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-5rem)] bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0] flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-[#F5C400] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#001840] mb-2">No Active Enrollment Found</h2>
          <p className="text-gray-600 text-sm mb-6">
            You don't have an enrolled application yet. Please enroll or review your submitted applications.
          </p>
          <button
            onClick={() => navigate('/my-enrollments')}
            className="w-full py-2.5 px-4 bg-[#001840] hover:bg-[#102A71] text-white rounded-xl font-medium transition-colors"
          >
            Go to Enrollments
          </button>
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
    <div className="min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-5rem)] bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0] py-4 sm:py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-8 h-8 text-[#102A71]" />
              <h1 className="text-2xl sm:text-3xl font-bold text-[#001840]">Student Dashboard</h1>
            </div>
            <p className="text-gray-600">View your subjects and schedule</p>
          </div>
          {userEnrollments.length > 1 && (
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Academic Year:</span>
              <select
                value={enrollment.id}
                onChange={(e) => navigate(`/student-dashboard/${e.target.value}`)}
                className="min-w-0 flex-1 text-sm font-bold text-[#001840] bg-transparent focus:outline-hidden cursor-pointer"
              >
                {userEnrollments.map((enr) => (
                  <option key={enr.id} value={enr.id}>
                    {enr.academicYear || 'Year'} — {enr.gradeLevel || enr.educationLevel} ({enr.status === 'submitted' ? 'Pending' : enr.status})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Enrollment Info Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="text-sm text-gray-600 mb-1">Total Subjects</p>
              <p className="text-lg font-semibold text-[#102A71]">{enrolledSubjects.length}</p>
            </div>
          </div>

          {/* Section Assignment */}
          {enrollment.sectionName && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-3">
              <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3 flex-1 min-w-0 basis-full sm:basis-0 sm:min-w-50">
                <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Assigned Section</p>
                  <p className="text-xl font-bold text-emerald-800">Section {enrollment.sectionName}</p>
                </div>
              </div>
              {adviserName && (
                <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-3 flex-1 min-w-0 basis-full sm:basis-0 sm:min-w-50">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Class Adviser</p>
                    <p className="text-base font-bold text-blue-800">{adviserName}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-end flex-1 min-w-0 basis-full sm:basis-0 sm:min-w-50">
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
              Subjects ({enrolledSubjects.length})
            </h2>
          </div>

          {enrolledSubjects.length === 0 ? (
            <div className="px-4 py-8 sm:p-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No subjects enrolled yet</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View (block md:hidden) */}
              <div className="block md:hidden divide-y divide-gray-100">
                {enrolledSubjects.map(subject => (
                  <div key={subject.id} className="p-4 space-y-2.5 hover:bg-[#FFFDF0] transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#102A71] bg-[#EEF2FF] border border-[#102A71]/20 px-2.5 py-1 rounded-lg">
                        {subject.code}
                      </span>
                      {subject.section ? (
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-semibold">
                          {subject.section}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Pending Section</span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-gray-900 leading-snug">
                        {subject.description}
                      </h3>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex flex-col gap-1.5 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-gray-500">Instructor:</span>
                        <span className="font-medium text-gray-800 truncate">
                          {subject.instructor || '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-gray-500">Schedule:</span>
                        <span className="font-medium text-gray-800 truncate">
                          {subject.schedule || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
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
            </>
          )}
        </div>

      </div>
    </div>
  );
}
