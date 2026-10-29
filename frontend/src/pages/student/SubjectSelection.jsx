import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { BookOpen, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { API } from '../../config/api';

const getToken = () => localStorage.getItem('token');

export function SubjectSelection() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [enrollment, setEnrollment] = useState(null);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState(new Set());
  const [totalUnits, setTotalUnits] = useState(0);
  const [maxUnits, setMaxUnits] = useState(24);

  useEffect(() => {
    loadSubjects();
  }, [id]);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      
      // Get available subjects
      const res = await fetch(`${API}/enrollments/${id}/available-subjects`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      
      if (!res.ok) throw new Error('Failed to load subjects');
      
      const data = await res.json();
      setEnrollment(data.enrollment);
      setAvailableSubjects(data.subjects || []);
      
      // Auto-select all subjects for regular students (not irregular, not transferee)
      const needsManualSelection = data.enrollment.studentStatus === 'irregular' || data.enrollment.enrollmentType === 'transferee';
      if (!needsManualSelection) {
        const allIds = new Set(data.subjects.map(s => s.id));
        setSelectedSubjects(allIds);
        const units = data.subjects.reduce((sum, s) => sum + parseFloat(s.units || 0), 0);
        setTotalUnits(units);
      }
      
      // Set max units based on level
      if (data.enrollment.educationLevel === 'SHS') {
        setMaxUnits(20);
      } else if (data.enrollment.educationLevel === 'College') {
        setMaxUnits(24);
      }
    } catch (error) {
      console.error('Load subjects error:', error);
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectToggle = (subjectId, units) => {
    const newSelected = new Set(selectedSubjects);
    const currentTotal = totalUnits;
    const subjectUnits = parseFloat(units || 0);
    
    if (newSelected.has(subjectId)) {
      newSelected.delete(subjectId);
      setTotalUnits(currentTotal - subjectUnits);
    } else {
      if (currentTotal + subjectUnits > maxUnits) {
        toast.error(`Cannot exceed ${maxUnits} units`);
        return;
      }
      newSelected.add(subjectId);
      setTotalUnits(currentTotal + subjectUnits);
    }
    
    setSelectedSubjects(newSelected);
  };

  const handleConfirmSubjects = async () => {
    try {
      if (selectedSubjects.size === 0) {
        toast.error('Please select at least one subject');
        return;
      }
      
      setSubmitting(true);
      
      const subjectIds = Array.from(selectedSubjects);
      const res = await fetch(`${API}/enrollments/${id}/enroll-subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ subjectIds })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to enroll in subjects');
      }
      
      const result = await res.json();
      toast.success(`Successfully enrolled in ${result.subjectsEnrolled} subjects!`);
      
      // Redirect to student dashboard
      setTimeout(() => navigate(`/student-dashboard/${id}`), 1500);
    } catch (error) {
      console.error('Confirm subjects error:', error);
      toast.error(error.message || 'Failed to confirm subjects');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-5rem)] bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0] flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-[#102A71] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading subjects...</p>
        </div>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-5rem)] bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Enrollment not found</p>
        </div>
      </div>
    );
  }

  // Regular = auto subjects, no manual selection
  // Irregular OR transferee = manual selection
  const isManualSelection = enrollment.studentStatus === 'irregular' || enrollment.enrollmentType === 'transferee';
  const isRegular = !isManualSelection;

  const enrollmentTypeLabel = enrollment.educationLevel === 'SHS'
    ? `${enrollment.gradeLevel} - ${enrollment.strand}`
    : `${enrollment.course}${enrollment.major ? ` (${enrollment.major})` : ''}`;

  return (
    <div className="min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-5rem)] bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0] py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/enrollment/${id}`)}
            className="flex items-center gap-2 text-[#102A71] hover:text-[#001840] mb-4 font-medium"
          >
            ← Back to Enrollment Details
          </button>
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-8 h-8 text-[#102A71]" />
            <h1 className="text-2xl sm:text-3xl font-bold text-[#001840]">Subject Selection</h1>
          </div>
          <p className="text-gray-600">
            {isManualSelection
              ? `You are ${enrollment.enrollmentType === 'transferee' ? 'a transferee' : 'an irregular student'} — please select the subjects you want to enroll in this semester.`
              : 'Your subjects have been automatically loaded based on your program curriculum. Review and confirm below.'}
          </p>
        </div>

        {/* Enrollment Info Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Enrollment Type</p>
              <p className="text-lg font-semibold text-[#001840]">{enrollmentTypeLabel}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Student Status</p>
              <p className="text-lg font-semibold text-[#102A71] capitalize">
                {enrollment.studentStatus || 'Regular'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Units</p>
              <p className="text-lg font-semibold text-[#F5C400]">
                {totalUnits} / {maxUnits}
              </p>
            </div>
          </div>
        </div>

        {/* Subjects Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
          <div className="bg-[#FFFDF0] border-b border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-[#001840]">
              Available Subjects ({availableSubjects.length})
            </h2>
          </div>

          {availableSubjects.length === 0 ? (
            <div className="px-4 py-8 sm:p-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No subjects available for your program</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {isManualSelection && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Select</th>}
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Units</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {availableSubjects.map(subject => (
                    <tr key={subject.id} className="hover:bg-[#FFFDF0] transition-colors">
                      {isManualSelection && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedSubjects.has(subject.id)}
                            onChange={() => handleSubjectToggle(subject.id, subject.units)}
                            className="w-4 h-4 rounded border-gray-300 text-[#102A71] focus:ring-[#F5C400]"
                          />
                        </td>
                      )}
                      {!isManualSelection && (
                        <td className="px-4 py-3">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </td>
                      )}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Unit Warning */}
        {totalUnits > maxUnits * 0.8 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-yellow-900">High Unit Load</p>
              <p className="text-sm text-yellow-800">You are approaching the maximum unit limit ({maxUnits} units)</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => navigate('/my-enrollments')}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-all font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmSubjects}
            disabled={submitting || selectedSubjects.size === 0}
            className="px-6 py-3 bg-[#102A71] text-white rounded-lg hover:bg-[#001840] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {isManualSelection ? `Confirm Subjects (${selectedSubjects.size})` : 'Confirm Enrollment'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
