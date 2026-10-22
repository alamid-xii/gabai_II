import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import { toast } from 'sonner';
import { getEnrollmentById, downloadEnrollmentPDF, deleteEnrollment } from '../../services/enrollmentApi';
import { HSEnrollmentForm } from './HSEnrollmentForm';
import { 
  FileText, Download, Edit, Trash2,
  CheckCircle, Clock, XCircle, AlertCircle, BarChart3, BookOpen
} from 'lucide-react';

export function EnrollmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Check if user came from admin panel — only trust router state, not referrer
  const isFromAdmin = location.state?.fromAdmin === true;
  
  // Also check user role as a fallback
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdminUser = currentUser.role === 'admin' || currentUser.role === 'registrar';
  
  useEffect(() => {
    loadEnrollment();
  }, [id]);
  
  const loadEnrollment = async () => {
    try {
      setLoading(true);
      const data = await getEnrollmentById(id);
      setEnrollment(data);
    } catch (error) {
      toast.error(error.message || 'Failed to load enrollment');
      navigate(isFromAdmin ? '/admin/enrollments' : '/my-enrollments');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownloadPDF = async () => {
    try {
      await downloadEnrollmentPDF(id);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to download PDF');
    }
  };
  
  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteEnrollment(id);
      toast.success('Enrollment deleted successfully!');
      navigate(isFromAdmin ? '/admin/enrollments' : '/my-enrollments');
    } catch (error) {
      toast.error(error.message || 'Failed to delete enrollment');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };
  
  const handleBackToList = () => {
    if (isFromAdmin || isAdminUser) {
      navigate('/admin', { state: { tab: 'enrollments' } });
    } else {
      navigate('/my-enrollments');
    }
  };

  const handleGoToDashboard = () => {
    navigate(`/student-dashboard/${id}`);
  };

  const handleSelectSubjects = () => {
    navigate(`/subject-selection/${id}`);
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
        icon: Clock,
        color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        label: 'Pending Exam'
      },
      approved: {
        icon: CheckCircle,
        color: 'bg-green-100 text-green-700 border-green-300',
        label: 'Approved'
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
  
  const calculateProgress = () => {
    if (!enrollment) return 0;
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

  const getNextAction = () => {
    if (!enrollment) return null;
    const status = enrollment.status;
    
    if (status === 'approved') {
      return {
        label: 'View Dashboard',
        action: handleGoToDashboard,
        icon: BarChart3,
        color: 'bg-green-600 hover:bg-green-700'
      };
    }
    if (status === 'enrolled' || status === 'subjects_enrolled') {
      return {
        label: 'View Dashboard',
        action: handleGoToDashboard,
        icon: BarChart3,
        color: 'bg-green-600 hover:bg-green-700'
      };
    }
    if (status === 'submitted' || status === 'pending_exam') {
      return {
        label: 'Waiting for Approval',
        action: null,
        icon: Clock,
        color: 'bg-gray-400 cursor-not-allowed',
        disabled: true
      };
    }
    return null;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#F5C400] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading enrollment...</p>
        </div>
      </div>
    );
  }
  
  if (!enrollment) {
    return null;
  }
  
  // Determine which form to show based on education level
  const isHS = enrollment.educationLevel === 'JHS' || enrollment.educationLevel === 'SHS';
  
  // If admin/registrar is viewing — show clean read-only summary, NOT the editable form
  if (isFromAdmin || isAdminUser) {
    const statusConfig = getStatusConfig(enrollment.status || 'draft');
    const StatusIcon = statusConfig.icon;
    const e = enrollment;

    const SectionBlock = ({ title, children }) => (
      <div className="mb-6">
        <h3 className="text-sm font-bold text-[#001840] uppercase tracking-wider mb-3 pb-2 border-b-2 border-[#F5C400]">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
      </div>
    );
    const F = ({ label, value }) => value ? (
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-[#001840]">{value}</p>
      </div>
    ) : null;

    return (
      <div className="min-h-screen bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0] py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Action Bar */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 mb-6 flex flex-wrap items-center gap-3">
            <button onClick={handleBackToList} className="px-4 py-2 border-2 border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 font-medium">
              ← Back to List
            </button>
            <button onClick={handleDownloadPDF} className="px-4 py-2 bg-[#102A71] text-white rounded-lg hover:bg-[#001840] font-medium flex items-center gap-2">
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <div className="ml-auto">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${statusConfig.color}`}>
                <StatusIcon className="w-4 h-4" />
                <span className="font-semibold text-sm">{statusConfig.label}</span>
              </div>
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
              <img src="/emc_logo_nobg.png" alt="EMC" className="w-12 h-12" />
              <div>
                <h1 className="text-xl font-bold text-[#001840]">
                  {e.firstName} {e.middleName ? e.middleName + ' ' : ''}{e.familyName}
                </h1>
                <p className="text-sm text-gray-500">
                  {e.educationLevel}{e.course ? ` — ${e.course}` : e.gradeLevel ? ` — ${e.gradeLevel}` : ''}
                  {e.strand ? ` (${e.strand})` : ''}{e.major ? ` — ${e.major}` : ''}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  ID: #{e.id} · Submitted: {e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '—'}
                </p>
              </div>
            </div>

            <SectionBlock title="Enrollment Details">
              <F label="Education Level" value={e.educationLevel} />
              <F label="Enrollment Type" value={e.enrollmentType} />
              <F label="Student Status" value={e.studentStatus} />
              <F label="Student Type" value={e.studentType} />
              <F label="Course / Grade" value={e.course || e.gradeLevel} />
              <F label="Strand" value={e.strand} />
              <F label="Major" value={e.major} />
              <F label="Semester" value={e.semester} />
              <F label="Academic Year" value={e.academicYear} />
              <F label="Student Number" value={e.studentNumber} />
              <F label="Section" value={e.sectionName ? `Section ${e.sectionName}` : null} />
            </SectionBlock>

            <SectionBlock title="Personal Information">
              <F label="Full Name" value={`${e.firstName || ''} ${e.middleName || ''} ${e.familyName || ''}`.trim()} />
              <F label="Sex" value={e.sex} />
              <F label="Date of Birth" value={e.dateOfBirth} />
              <F label="Place of Birth" value={e.placeOfBirth} />
              <F label="Email" value={e.email} />
              <F label="Mobile Number" value={e.mobileNumber} />
            </SectionBlock>

            <SectionBlock title="Family Background">
              <F label="Father" value={e.fatherName} />
              <F label="Father Occupation" value={e.fatherOccupation} />
              <F label="Mother" value={e.motherName} />
              <F label="Mother Occupation" value={e.motherOccupation} />
              <F label="Guardian" value={e.guardianName} />
              <F label="Guardian Occupation" value={e.guardianOccupation} />
            </SectionBlock>

            {e.sscApplied ? (
              <SectionBlock title="SSC Information">
                <F label="SSC Applied" value="Yes" />
                <F label="Qualified" value={e.sscQualified ? 'Yes' : 'No'} />
                <F label="Exam Date" value={e.sscExamDate} />
                <F label="Exam Score" value={e.sscExamScore ? String(e.sscExamScore) : null} />
                <F label="Result" value={e.sscResult} />
                <F label="Class" value={e.sscClass} />
              </SectionBlock>
            ) : null}

            {e.registrar_remarks ? (
              <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-1">Registrar Remarks</p>
                <p className="text-sm text-orange-800">{e.registrar_remarks}</p>
              </div>
            ) : null}

            {e.admin_comments ? (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">Admin Comments</p>
                <p className="text-sm text-red-800">{e.admin_comments}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
  
  const statusConfig = getStatusConfig(enrollment.status || 'draft');
  const StatusIcon = statusConfig.icon;
  const progress = calculateProgress();
  const nextAction = getNextAction();
  
  return (
    <div className="min-h-screen bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0] py-8">
      {/* Action Bar - No Print */}
      <div className="max-w-6xl mx-auto mb-6 px-4 no-print">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={handleBackToList}
              className="px-4 py-2 border-2 border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-all font-medium"
            >
              ← Back to List
            </button>
            
            {!isFromAdmin && !isAdminUser && (
              <button 
                onClick={() => {
                  navigate(`/hs-enrollment-form/${id}`, { state: { educationLevel: enrollment.educationLevel } });
                }}
                className="px-4 py-2 bg-[#102A71] text-white rounded-lg hover:bg-[#001840] transition-all font-medium flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )}
            
            <button 
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-medium flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            
            {!isFromAdmin && !isAdminUser && (
              <>
                {nextAction && (
                  <button 
                    onClick={nextAction.action}
                    disabled={nextAction.disabled}
                    className={`px-4 py-2 text-white rounded-lg transition-all font-medium flex items-center gap-2 ${nextAction.color} ${nextAction.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <nextAction.icon className="w-4 h-4" />
                    {nextAction.label}
                  </button>
                )}
                
                {/* Only allow delete for statuses where it makes sense */}
                {['draft', 'submitted', 'returned', 'rejected'].includes(enrollment.status) && (
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium flex items-center gap-2 ml-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4">
        {/* Status Card - No Print */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6 no-print">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${statusConfig.color}`}>
                <StatusIcon className="w-5 h-5" />
                <span className="font-semibold">{statusConfig.label}</span>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Enrollment ID</p>
                <p className="font-semibold text-[#102A71]">#{enrollment.id}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Level</p>
                <p className="font-semibold">{enrollment.educationLevel}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="font-semibold">{new Date(enrollment.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            
            {/* Progress Indicator */}
            <div className="w-full sm:w-auto">
              <div className="flex items-center gap-3">
                <div className="flex-1 sm:w-48">
                  <div className="flex justify-between text-sm mb-1">
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
        </div>
        
        {/* Enrollment Details */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-6 h-6 text-[#102A71]" />
            <h1 className="text-2xl font-bold text-[#001840]">Enrollment Details</h1>
          </div>
          
          {/* Student Information */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-[#102A71] mb-4 pb-2 border-b-2 border-[#F5C400]">
              Student Information
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <InfoField label="Student Type" value={enrollment.studentType} />
              <InfoField label="Student Number" value={enrollment.studentNumber} />
              <InfoField label="Full Name" value={`${enrollment.firstName || ''} ${enrollment.middleName || ''} ${enrollment.familyName || ''}`} />
              <InfoField label="Sex" value={enrollment.sex} />
              <InfoField label="Date of Birth" value={enrollment.dateOfBirth} />
              <InfoField label="Place of Birth" value={enrollment.placeOfBirth} />
              <InfoField label="Email" value={enrollment.email} />
              <InfoField label="Mobile Number" value={enrollment.mobileNumber} />
            </div>
          </div>
          
          {/* Enrollment Period */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-[#102A71] mb-4 pb-2 border-b-2 border-[#F5C400]">
              Enrollment Period
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <InfoField label="Semester" value={enrollment.semester} />
              <InfoField label="Academic Year" value={enrollment.academicYear} />
              <InfoField label="Date Enrolled" value={enrollment.dateEnrolled} />
            </div>
          </div>
          
          {/* Education Level Information */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-[#102A71] mb-4 pb-2 border-b-2 border-[#F5C400]">
              Education Level Information
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <InfoField label="Grade Level" value={enrollment.gradeLevel} />
              <InfoField label="Strand" value={enrollment.strand} />
              <InfoField label="Enrollment Type" value={enrollment.enrollmentType} />
            </div>
          </div>

          {/* SSC Status (Only for JHS) */}
          {enrollment.educationLevel === 'JHS' && (
            <div className="mb-8 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-blue-900 mb-4 pb-2 border-b-2 border-blue-300">
                Special Science Class (SSC) Status
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <InfoField 
                  label="SSC Applied" 
                  value={enrollment.sscApplied ? 'Yes' : 'No'} 
                />
                {enrollment.sscApplied && (
                  <>
                    <InfoField 
                      label="SSC Qualified" 
                      value={enrollment.sscQualified ? 'Yes' : 'No'} 
                    />
                    <InfoField 
                      label="SSC Class" 
                      value={enrollment.sscClass || '—'} 
                    />
                    <InfoField 
                      label="SSC Result" 
                      value={enrollment.sscResult || '—'} 
                    />
                    {enrollment.sscExamDate && (
                      <InfoField 
                        label="Exam Date" 
                        value={new Date(enrollment.sscExamDate).toLocaleDateString()} 
                      />
                    )}
                    {enrollment.sscExamScore && (
                      <InfoField 
                        label="Exam Score" 
                        value={`${enrollment.sscExamScore}/100`} 
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Subjects */}
          {enrollment.subjects && enrollment.subjects.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[#102A71] mb-4 pb-2 border-b-2 border-[#F5C400]">
                Enrolled Subjects
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#FFFDF0]">
                      <th className="border border-gray-300 px-4 py-2 text-left">Code</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Units</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Time</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Day/Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollment.subjects.map((subject, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2">{subject.code}</td>
                        <td className="border border-gray-300 px-4 py-2">{subject.description}</td>
                        <td className="border border-gray-300 px-4 py-2">{subject.units}</td>
                        <td className="border border-gray-300 px-4 py-2">{subject.time}</td>
                        <td className="border border-gray-300 px-4 py-2">{subject.dayTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              <span className="font-bold text-[#102A71]">E</span>nriching{' '}
              <span className="font-bold text-[#102A71]">M</span>inds of{' '}
              <span className="font-bold text-[#102A71]">C</span>hampion
            </p>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Enrollment?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this enrollment? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-all font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
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

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="font-medium text-gray-900">{value || '—'}</p>
    </div>
  );
}
