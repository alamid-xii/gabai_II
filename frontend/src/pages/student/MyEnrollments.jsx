import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { getUserEnrollments, downloadEnrollmentPDF, deleteEnrollment } from '../../services/enrollmentApi';
import { 
  FileText, Download, Eye, Trash2, Plus, Upload, 
  CheckCircle, Clock, XCircle, AlertCircle, Calendar, BookOpen,
  UserX, ArrowRightLeft, RotateCcw, FlaskConical, Loader2
} from 'lucide-react';
import { API } from '../../config/api';

const tok = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });

export function MyEnrollments() {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [sscChoiceLoading, setSscChoiceLoading] = useState(null);

  async function handleSscChoice(enrollmentId, choice) {
    setSscChoiceLoading(enrollmentId);
    try {
      const res = await fetch(`${API}/enrollments/${enrollmentId}/ssc-choice`, {
        method: 'PUT',
        headers: tok(),
        body: JSON.stringify({ choice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save choice');
      toast.success(data.message);
      // Refresh the enrollment list to reflect the new sscClass and sscChoiceMade
      const updated = await getUserEnrollments();
      setEnrollments(Array.isArray(updated) ? updated : (updated.enrollments || []));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSscChoiceLoading(null);
    }
  }
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeYear, setActiveYear] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    // Load active school year and enrollments in parallel
    Promise.all([
      fetch(`${API}/academic/school-years/active`).then(r => r.ok ? r.json() : null),
      (async () => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return getUserEnrollments(user.id);
      })()
    ]).then(([sy, data]) => {
      if (sy?.year) setActiveYear(sy.year);
      setEnrollments(data || []);
    }).catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);
  
  const handleDownloadPDF = async (id) => {
    try {
      await downloadEnrollmentPDF(id);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  const handleDelete = async (id) => {
    try {
      setDeleting(true);
      await deleteEnrollment(id);
      toast.success('Enrollment deleted successfully!');
      setDeleteConfirm(null);
      loadEnrollments();
    } catch (error) {
      toast.error(error.message || 'Failed to delete enrollment');
    } finally {
      setDeleting(false);
    }
  };
  
  const getStatusConfig = (status) => {
    const configs = {
      draft: {
        icon: Clock,
        color: 'bg-gray-100 text-gray-700 border-gray-300',
        label: 'Draft'
      },
      submitted: {
        icon: AlertCircle,
        color: 'bg-blue-100 text-blue-700 border-blue-300',
        label: 'Submitted'
      },
      pending_exam: {
        icon: Calendar,
        color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        label: 'Pending SSC Exam'
      },
      verified: {
        icon: CheckCircle,
        color: 'bg-purple-100 text-purple-700 border-purple-300',
        label: 'Verified'
      },
      returned: {
        icon: AlertCircle,
        color: 'bg-orange-100 text-orange-700 border-orange-300',
        label: 'Returned'
      },
      approved: {
        icon: CheckCircle,
        color: 'bg-green-100 text-green-700 border-green-300',
        label: 'Approved'
      },
      subjects_enrolled: {
        icon: BookOpen,
        color: 'bg-teal-100 text-teal-700 border-teal-300',
        label: 'Subjects Enrolled'
      },
      enrolled: {
        icon: CheckCircle,
        color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        label: 'Enrolled'
      },
      rejected: {
        icon: XCircle,
        color: 'bg-red-100 text-red-700 border-red-300',
        label: 'Rejected'
      }
    };
    return configs[status] || configs.draft;
  };
  
  const calculateProgress = (enrollment) => {
    const fields = [
      enrollment.studentType,
      enrollment.course || enrollment.gradeLevel,
      enrollment.familyName,
      enrollment.firstName,
      enrollment.sex,
      enrollment.dateOfBirth,
      enrollment.email
    ];
    const filled = fields.filter(f => f && f !== '').length;
    return Math.round((filled / fields.length) * 100);
  };

  async function loadEnrollments() {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const data = await getUserEnrollments(user.id);
      setEnrollments(data || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  // Split: current year active enrollments vs past completed enrollments
  const currentEnrollments = enrollments.filter(e =>
    e.status !== 'completed' ||
    !activeYear ||
    e.academicYear === activeYear ||
    !e.academicYear
  );

  const pastEnrollments = enrollments.filter(e =>
    e.status === 'completed' &&
    activeYear &&
    e.academicYear &&
    e.academicYear !== activeYear
  );

  // Group past enrollments by academic year, sorted newest first
  const pastByYear = pastEnrollments.reduce((acc, e) => {
    const yr = e.academicYear || 'Unknown';
    if (!acc[yr]) acc[yr] = [];
    acc[yr].push(e);
    return acc;
  }, {});
  const pastYears = Object.keys(pastByYear).sort((a, b) => b.localeCompare(a));

  const filteredEnrollments = filterStatus === 'all'
    ? currentEnrollments
    : filterStatus === 'enrolled'
      ? currentEnrollments.filter(e => e.status === 'enrolled' || e.status === 'subjects_enrolled')
      : currentEnrollments.filter(e => (e.status || 'draft') === filterStatus);

  const hasActiveEnrollment = currentEnrollments.some(e =>
    !['rejected', 'completed', 'draft'].includes(e.status)
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0] py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[#001840] mb-2">My Enrollments</h1>
              <p className="text-gray-600">Manage and track your enrollment forms</p>
            </div>
          </div>
        </div>
        
        {/* Enrollments List */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-[#F5C400] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading enrollments...</p>
            </div>
          ) : filteredEnrollments.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                {filterStatus === 'all' 
                  ? "You haven't created any enrollment forms yet" 
                  : `No ${filterStatus} enrollments found`}
              </p>
              {filterStatus === 'all' && !hasActiveEnrollment && (
                <button
                  onClick={() => navigate('/enroll')}
                  className="px-6 py-2.5 bg-[#102A71] text-white rounded-lg hover:bg-[#001840] transition-all font-medium"
                >
                  Create Your First Enrollment
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredEnrollments.map(enrollment => {
                const statusConfig = getStatusConfig(enrollment.status || 'draft');
                const StatusIcon = statusConfig.icon;
                const progress = calculateProgress(enrollment);
                
                return (
                  <div 
                    key={enrollment.id} 
                    className="p-6 hover:bg-[#FFFDF0] transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Left Section - Info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            <BookOpen className="w-5 h-5 text-[#102A71]" />
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-[#001840]">
                                {`${enrollment.educationLevel} — ${enrollment.gradeLevel || ''}${enrollment.strand ? ` (${enrollment.strand})` : ''}`}
                              </h3>
                              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${statusConfig.color} text-sm font-medium`}>
                                <StatusIcon className="w-4 h-4" />
                                {statusConfig.label}
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>Created: {new Date(enrollment.createdAt).toLocaleDateString()}</span>
                              </div>
                              {enrollment.semester && (
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                                  {enrollment.semester} • {enrollment.academicYear}
                                </span>
                              )}
                              {enrollment.studentNumber ? (
                                <span className="text-xs font-mono bg-[#EEF2FF] text-[#102A71] border border-[#102A71]/20 px-2.5 py-1 rounded-lg font-semibold">
                                  ID: {enrollment.studentNumber}
                                </span>
                              ) : ['approved','enrolled','active'].includes(enrollment.status) ? (
                                <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2.5 py-1 rounded-lg">
                                  ID: Pending assignment
                                </span>
                              ) : null}
                            </div>

                            {/* Section Assignment Banner */}
                            {enrollment.status === 'enrolled' && enrollment.sectionName && (
                              <div className="mt-3 flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
                                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                                  <BookOpen className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <p className="text-xs text-emerald-600 font-medium">Assigned Section</p>
                                  <p className="text-sm font-bold text-emerald-800">Section {enrollment.sectionName}</p>
                                </div>
                              </div>
                            )}

                            {/* Returned remarks */}
                            {enrollment.status === 'returned' && enrollment.registrar_remarks && (
                              <div className="mt-3 flex items-start gap-2.5 bg-orange-50 border border-orange-200 rounded-lg px-4 py-2.5">
                                <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-xs text-orange-600 font-medium">Returned — Action Required</p>
                                  <p className="text-sm text-orange-800">{enrollment.registrar_remarks}</p>
                                </div>
                              </div>
                            )}

                            {/* Rejection reason */}
                            {enrollment.status === 'rejected' && enrollment.admin_comments && (
                              <div className="mt-3 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                                <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-xs text-red-600 font-medium">Rejection Reason</p>
                                  <p className="text-sm text-red-800">{enrollment.admin_comments}</p>
                                </div>
                              </div>
                            )}

                            {/* SSC Exam Info */}
                            {enrollment.status === 'pending_exam' && (
                              <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 space-y-1.5">
                                <p className="text-xs font-bold text-yellow-800 uppercase tracking-wide">Special Science Class (SSC) Exam</p>
                                {enrollment.sscExamDate ? (
                                  <>
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-yellow-700">Exam Date</span>
                                      <span className="font-semibold text-yellow-900">{new Date(enrollment.sscExamDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                    </div>
                                    {enrollment.sscPassingScore && (
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-yellow-700">Passing Score</span>
                                        <span className="font-semibold text-yellow-900">{enrollment.sscPassingScore}</span>
                                      </div>
                                    )}
                                    <p className="text-xs text-yellow-600 mt-1">Please come on time and bring your school ID.</p>
                                  </>
                                ) : (
                                  <p className="text-sm text-yellow-700">Your exam schedule has not been set yet. The registrar will notify you soon.</p>
                                )}
                              </div>
                            )}

                            {/* SSC Result */}
                            {enrollment.sscResult && (
                              <div className={`mt-3 rounded-lg px-4 py-3 border ${enrollment.sscResult === 'passed' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <p className="text-xs font-bold uppercase tracking-wide mb-1 ${enrollment.sscResult === 'passed' ? 'text-green-800' : 'text-red-800'}">SSC Exam Result</p>
                                <div className="flex items-center justify-between text-sm">
                                  <span className={enrollment.sscResult === 'passed' ? 'text-green-700' : 'text-red-700'}>
                                    {enrollment.sscResult === 'passed' ? 'Passed — You qualify for the Special Science Class' : 'Did not pass — You will be enrolled in the Regular class'}
                                  </span>
                                  {enrollment.sscExamScore && (
                                    <span className={`font-bold text-base ${enrollment.sscResult === 'passed' ? 'text-green-800' : 'text-red-800'}`}>
                                      {enrollment.sscExamScore}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Life Status Banner — shown when registrar has updated student status */}
                            {enrollment.lifeStatus && enrollment.lifeStatus !== 'enrolled' && (
                              <div className={`mt-3 flex items-start gap-2.5 rounded-lg px-4 py-3 border ${
                                enrollment.lifeStatus === 'dropped'
                                  ? 'bg-red-50 border-red-200'
                                  : enrollment.lifeStatus === 'transferred_out'
                                  ? 'bg-orange-50 border-orange-200'
                                  : enrollment.lifeStatus === 'retained'
                                  ? 'bg-yellow-50 border-yellow-200'
                                  : enrollment.lifeStatus === 'transferred_in'
                                  ? 'bg-blue-50 border-blue-200'
                                  : 'bg-slate-50 border-slate-200'
                              }`}>
                                <div className={`mt-0.5 shrink-0 ${
                                  enrollment.lifeStatus === 'dropped' ? 'text-red-500' :
                                  enrollment.lifeStatus === 'transferred_out' ? 'text-orange-500' :
                                  enrollment.lifeStatus === 'retained' ? 'text-yellow-600' :
                                  enrollment.lifeStatus === 'transferred_in' ? 'text-blue-500' :
                                  'text-slate-400'
                                }`}>
                                  {enrollment.lifeStatus === 'dropped' && <UserX className="w-4 h-4" />}
                                  {enrollment.lifeStatus === 'transferred_out' && <ArrowRightLeft className="w-4 h-4" />}
                                  {enrollment.lifeStatus === 'transferred_in' && <ArrowRightLeft className="w-4 h-4" />}
                                  {enrollment.lifeStatus === 'retained' && <RotateCcw className="w-4 h-4" />}
                                </div>
                                <div>
                                  <p className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${
                                    enrollment.lifeStatus === 'dropped' ? 'text-red-700' :
                                    enrollment.lifeStatus === 'transferred_out' ? 'text-orange-700' :
                                    enrollment.lifeStatus === 'retained' ? 'text-yellow-700' :
                                    enrollment.lifeStatus === 'transferred_in' ? 'text-blue-700' :
                                    'text-slate-600'
                                  }`}>
                                    {{
                                      dropped: 'Enrollment Dropped',
                                      transferred_out: 'Transferred Out',
                                      transferred_in: 'Transferred In',
                                      retained: 'Retained — Will Re-enroll Same Grade',
                                      completed: 'Completed',
                                    }[enrollment.lifeStatus] || enrollment.lifeStatus}
                                  </p>
                                  {enrollment.lifeStatusReason && (
                                    <p className="text-xs text-gray-600">{enrollment.lifeStatusReason}</p>
                                  )}
                                  {enrollment.destinationSchool && (
                                    <p className="text-xs text-gray-500 mt-0.5">Transferred to: <span className="font-medium">{enrollment.destinationSchool}</span></p>
                                  )}
                                  {enrollment.lifeStatusDate && (
                                    <p className="text-xs text-gray-400 mt-0.5">Effective: {new Date(enrollment.lifeStatusDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Progress Bar */}
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-gray-600">Completion</span>
                                <span className="font-semibold text-[#102A71]">{progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-linear-to-r from-[#F5C400] to-[#FFDC5F] h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Right Section - Actions */}
                      <div className="flex flex-wrap lg:flex-col gap-2 lg:w-48">

                        {/* SSC passed — show choice prompt if not yet chosen */}
                        {enrollment.sscApplied && !enrollment.firstName && enrollment.sscResult === 'passed' && !enrollment.sscChoiceMade && (
                          <div className="w-full bg-linear-to-br from-[#001840] to-[#102A71] rounded-xl p-4 text-white">
                            <div className="flex items-center gap-2 mb-2">
                              <FlaskConical className="w-4 h-4 text-[#F5C400] shrink-0" />
                              <p className="text-sm font-bold">You passed the SSC exam!</p>
                            </div>
                            {enrollment.sscExamScore && (
                              <p className="text-xs text-white/70 mb-3">
                                Score: <span className="font-semibold text-white">{enrollment.sscExamScore}</span>
                                {enrollment.sscPassingScore && <span> · Passing: {enrollment.sscPassingScore}</span>}
                              </p>
                            )}
                            <p className="text-xs text-white/80 mb-3">Choose your class for Grade 7:</p>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                disabled={sscChoiceLoading === enrollment.id}
                                onClick={() => handleSscChoice(enrollment.id, 'SSC')}
                                className="flex flex-col items-center gap-1 px-3 py-2.5 bg-[#F5C400] text-[#001840] rounded-lg font-bold text-xs hover:bg-[#FFDC5F] transition-all disabled:opacity-50"
                              >
                                {sscChoiceLoading === enrollment.id
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <FlaskConical className="w-4 h-4" />}
                                SSC Class
                                <span className="font-normal text-[10px] leading-tight text-center">Advanced science curriculum</span>
                              </button>
                              <button
                                disabled={sscChoiceLoading === enrollment.id}
                                onClick={() => handleSscChoice(enrollment.id, 'Regular')}
                                className="flex flex-col items-center gap-1 px-3 py-2.5 bg-white/10 border border-white/20 text-white rounded-lg font-bold text-xs hover:bg-white/20 transition-all disabled:opacity-50"
                              >
                                {sscChoiceLoading === enrollment.id
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <BookOpen className="w-4 h-4" />}
                                Regular Class
                                <span className="font-normal text-[10px] leading-tight text-center">Standard curriculum</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Choice made — show Complete Enrollment Form button */}
                        {enrollment.sscApplied && !enrollment.firstName && enrollment.sscResult === 'passed' && enrollment.sscChoiceMade && (
                          <div className="w-full space-y-2">
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                              enrollment.sscClass === 'SSC'
                                ? 'bg-[#F5C400]/20 text-[#001840] border border-[#F5C400]/40'
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                              {enrollment.sscClass === 'SSC'
                                ? <><FlaskConical className="w-3.5 h-3.5 shrink-0 text-[#F5C400]" /> Enrolled in SSC Class</>
                                : <><BookOpen className="w-3.5 h-3.5 shrink-0" /> Enrolled in Regular Class</>
                              }
                            </div>
                            <button
                              onClick={() => navigate('/hs-enrollment-form', {
                                state: { educationLevel: 'JHS', sscEnrollmentId: enrollment.id }
                              })}
                              className="flex-1 lg:flex-none w-full px-4 py-2 bg-[#F5C400] text-[#001840] rounded-lg hover:bg-[#FFDC5F] transition-all font-bold flex items-center justify-center gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              Complete Enrollment Form
                            </button>
                          </div>
                        )}

                        {/* View Details — only show when form is actually filled */}
                        {enrollment.firstName && (
                          <button
                            onClick={() => navigate(`/enrollment/${enrollment.id}`, {
                              state: { educationLevel: enrollment.educationLevel }
                            })}
                            className="flex-1 lg:flex-none px-4 py-2 bg-[#102A71] text-white rounded-lg hover:bg-[#001840] transition-all font-medium flex items-center justify-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </button>
                        )}
                        
                        {enrollment.status === 'returned' && enrollment.firstName && (
                          <button
                            onClick={() => navigate(`/resubmit/${enrollment.id}`)}
                            className="flex-1 lg:flex-none px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all font-medium flex items-center justify-center gap-2"
                          >
                            <Upload className="w-4 h-4" />
                            Fix and Resubmit
                          </button>
                        )}

                        {enrollment.status === 'approved' && (
                          <button
                            onClick={() => navigate(`/student-dashboard/${enrollment.id}`)}
                            className="flex-1 lg:flex-none px-4 py-2 bg-[#F5C400] text-[#001840] rounded-lg hover:bg-[#FFDC5F] transition-all font-medium flex items-center justify-center gap-2"
                          >
                            <BookOpen className="w-4 h-4" />
                            View Dashboard
                          </button>
                        )}
                        
                        {(enrollment.status === 'enrolled' || enrollment.status === 'subjects_enrolled') && (
                          <button
                            onClick={() => navigate(`/student-dashboard/${enrollment.id}`)}
                            className="flex-1 lg:flex-none px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            View Dashboard
                          </button>
                        )}

                        {['approved', 'subjects_enrolled', 'enrolled', 'active'].includes(enrollment.status) && (
                          <button
                            onClick={() => navigate('/my-schedule')}
                            className="flex-1 lg:flex-none px-4 py-2 bg-[#001840] text-white rounded-lg hover:bg-[#102A71] transition-all font-medium flex items-center justify-center gap-2"
                          >
                            <Calendar className="w-4 h-4 text-[#FFDC5F]" />
                            View Schedule
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDownloadPDF(enrollment.id)}
                          className="flex-1 lg:flex-none px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-medium flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download PDF
                        </button>
                        
                        {/* Only allow delete when status is draft, submitted, or returned */}
                        {['draft', 'submitted', 'returned', 'rejected'].includes(enrollment.status) && (
                          <button
                            onClick={() => setDeleteConfirm(enrollment.id)}
                            className="flex-1 lg:flex-none px-4 py-2 border-2 border-red-300 text-red-600 bg-white rounded-lg hover:bg-red-50 transition-all font-medium flex items-center justify-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* ── Enrollment History (past school years) ── */}
      {pastYears.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setHistoryOpen(h => !h)}
            className="flex items-center justify-between w-full bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-gray-500" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-[#001840] text-sm">Enrollment History</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {pastEnrollments.length} past enrollment{pastEnrollments.length !== 1 ? 's' : ''} across {pastYears.length} school year{pastYears.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <span className="text-xs text-gray-400 font-medium">
              {historyOpen ? '▲ Hide' : '▼ Show'}
            </span>
          </button>

          {historyOpen && (
            <div className="mt-3 space-y-4">
              {pastYears.map(yr => (
                <div key={yr} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Year header */}
                  <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">School Year</span>
                    <span className="text-sm font-bold text-[#001840]">{yr}</span>
                    <span className="ml-auto text-xs text-gray-400">{pastByYear[yr].length} enrollment{pastByYear[yr].length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {pastByYear[yr].map(enrollment => {
                      const statusConfig = getStatusConfig(enrollment.status || 'completed');
                      const StatusIcon = statusConfig.icon;
                      return (
                        <div key={enrollment.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <BookOpen className="w-4 h-4 text-gray-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold text-[#001840] text-sm">
                                {enrollment.educationLevel} — {enrollment.gradeLevel || ''}
                                {enrollment.strand ? ` (${enrollment.strand})` : ''}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {enrollment.sectionName ? `Section ${enrollment.sectionName}` : 'No section'}
                                {enrollment.studentNumber ? ` · ID: ${enrollment.studentNumber}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${statusConfig.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </div>
                            <button
                              onClick={() => navigate(`/enrollment/${enrollment.id}`, { state: { educationLevel: enrollment.educationLevel } })}
                              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(enrollment.id)}
                              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                            >
                              PDF
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Enrollment?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this enrollment? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-all font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterTab({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-all ${
        active 
          ? 'bg-[#102A71] text-white shadow-md' 
          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
      }`}
    >
      {label} <span className={`ml-1 ${active ? 'text-[#F5C400]' : 'text-gray-500'}`}>({count})</span>
    </button>
  );
}
