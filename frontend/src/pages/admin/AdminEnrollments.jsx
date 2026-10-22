import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { API } from '../../config/api';
import { 
  Search, Filter, Download, CheckCircle, XCircle, 
  FileText, TrendingUp, Users, Calendar, Eye, BookOpen,
  ChevronLeft, ChevronRight
} from 'lucide-react';

export function AdminEnrollments() {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [filteredEnrollments, setFilteredEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [selectedEnrollments, setSelectedEnrollments] = useState([]);
  const [showApprovalModal, setShowApprovalModal] = useState(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  useEffect(() => {
    loadEnrollments();
  }, []);
  
  useEffect(() => {
    filterEnrollments();
  }, [searchQuery, statusFilter, courseFilter, enrollments]);
  
  const loadEnrollments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.warn('No token found in localStorage');
        toast.error('Authentication required. Please log in again.');
        setEnrollments([]);
        setLoading(false);
        return;
      }
      
      console.log('Loading enrollments with token:', token.substring(0, 20) + '...');
      
      const response = await fetch(`${API}/admin/enrollments`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to load enrollments: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Enrollments loaded:', data);
      setEnrollments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Load enrollments error:', error);
      toast.error('Failed to load enrollments: ' + error.message);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  };
  
  const filterEnrollments = () => {
    if (!Array.isArray(enrollments)) {
      setFilteredEnrollments([]);
      return;
    }
    
    let filtered = [...enrollments];
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(e => 
        e.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.familyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.studentNumber?.includes(searchQuery) ||
        e.course?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }
    
    // Course filter
    if (courseFilter !== 'all') {
      filtered = filtered.filter(e => e.course === courseFilter);
    }
    
    setFilteredEnrollments(filtered);
    setPage(1);
  };
  
  const handleApprove = async (id, comment) => {
    try {
      const res = await fetch(`${API}/admin/enrollments/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ comment })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve');

      if (data.sectionAssignment?.assigned) {
        const subCount = data.sectionAssignment.subjectsEnrolled;
        toast.success(
          `Enrollment approved & assigned to section ${data.sectionAssignment.section.code}!`,
          { description: subCount > 0 ? `${subCount} subject(s) auto-enrolled` : 'No curriculum subjects found — add subjects in Academic Setup', duration: 6000 }
        );
      } else if (data.sectionAssignment?.reason) {
        toast.success('Enrollment approved!');
        toast.warning(`No section auto-assigned: ${data.sectionAssignment.reason}`, { duration: 6000 });
      } else {
        toast.success('Enrollment approved!');
      }
      loadEnrollments();
      setShowApprovalModal(null);
      setApprovalComment('');
    } catch (error) {
      toast.error(error.message || 'Failed to approve enrollment');
    }
  };
  
  const handleReject = async (id, comment) => {
    try {
      await fetch(`${API}/admin/enrollments/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ comment })
      });
      toast.success('Enrollment rejected');
      loadEnrollments();
      setShowApprovalModal(null);
      setApprovalComment('');
    } catch (error) {
      toast.error('Failed to reject enrollment');
    }
  };

  const handleScheduleSSCExam = async (id) => {
    try {
      if (!sscExamDate) {
        toast.error('Please select an exam date');
        return;
      }
      await fetch(`${API}/enrollments/${id}/ssc-schedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          examDate: sscExamDate,
          passingScore: parseFloat(sscPassingScore) || 75
        })
      });
      toast.success('SSC exam scheduled!');
      loadEnrollments();
      setShowSSCModal(null);
      setSSCExamDate('');
      setSSCPassingScore('75');
    } catch (error) {
      toast.error('Failed to schedule exam');
    }
  };

  const handleRecordSSCResult = async (id) => {
    try {
      if (!sscExamScore) {
        toast.error('Please enter the exam score');
        return;
      }
      const res = await fetch(`${API}/enrollments/${id}/ssc-result`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ examScore: parseFloat(sscExamScore) })
      });
      const result = await res.json();
      toast.success(result.message);
      loadEnrollments();
      setShowSSCModal(null);
      setSSCExamScore('');
    } catch (error) {
      toast.error('Failed to record exam result');
    }
  };
  
  const handleBulkExport = async () => {
    if (selectedEnrollments.length === 0) {
      toast.error('Please select enrollments to export');
      return;
    }
    
    try {
      const response = await fetch(`${API}/admin/enrollments/bulk-export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ids: selectedEnrollments })
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enrollments-${Date.now()}.zip`;
      a.click();
      
      toast.success(`Exported ${selectedEnrollments.length} enrollments`);
      setSelectedEnrollments([]);
    } catch (error) {
      toast.error('Failed to export enrollments');
    }
  };
  
  const toggleSelectAll = () => {
    if (selectedEnrollments.length === filteredEnrollments.length) {
      setSelectedEnrollments([]);
    } else {
      setSelectedEnrollments(filteredEnrollments.map(e => e.id));
    }
  };
  
  const toggleSelect = (id) => {
    setSelectedEnrollments(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  // Analytics
  const stats = {
    total: enrollments.length,
    pending: enrollments.filter(e => e.status === 'submitted').length,
    pendingExam: enrollments.filter(e => e.status === 'pending_exam').length,
    approved: enrollments.filter(e => e.status === 'approved').length,
    rejected: enrollments.filter(e => e.status === 'rejected').length
  };
  
  const courseStats = enrollments.reduce((acc, e) => {
    acc[e.course] = (acc[e.course] || 0) + 1;
    return acc;
  }, {});
  
  const uniqueCourses = [...new Set(enrollments.map(e => e.course))].filter(Boolean);
  

  const totalPages = Math.max(1, Math.ceil(filteredEnrollments.length / pageSize));
  const paginatedEnrollments = filteredEnrollments.slice((page - 1) * pageSize, page * pageSize);

  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
    if (page >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0] py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#001840] mb-2">Enrollment Management</h1>
          <p className="text-gray-600">Review, approve, and manage student enrollments</p>
        </div>
        
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <StatCard 
            icon={FileText}
            label="Total Enrollments"
            value={stats.total}
            color="bg-[#102A71]"
          />
          <StatCard 
            icon={Calendar}
            label="Pending Review"
            value={stats.pending}
            color="bg-blue-600"
          />
          <StatCard 
            icon={AlertCircle}
            label="Pending SSC Exam"
            value={stats.pendingExam}
            color="bg-yellow-600"
          />
          <StatCard 
            icon={CheckCircle}
            label="Approved"
            value={stats.approved}
            color="bg-green-600"
          />
          <StatCard 
            icon={XCircle}
            label="Rejected"
            value={stats.rejected}
            color="bg-red-600"
          />
        </div>
        
        {/* Filters & Actions */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, student #, course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C400] focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C400] focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="pending_exam">Pending SSC Exam</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            
            {/* Course Filter */}
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C400] focus:border-transparent"
            >
              <option value="all">All Courses</option>
              {uniqueCourses.map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
            
            {/* Bulk Export */}
            <button
              onClick={handleBulkExport}
              disabled={selectedEnrollments.length === 0}
              className="px-4 py-2 bg-[#F5C400] text-[#001840] rounded-lg hover:bg-[#FFDC5F] transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export ({selectedEnrollments.length})
            </button>
          </div>
        </div>
        
        {/* Enrollments Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-[#F5C400] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading enrollments...</p>
            </div>
          ) : enrollments.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No enrollments found</p>
              <p className="text-gray-500 text-sm mt-2">Enrollments will appear here once students submit their forms.</p>
            </div>
          ) : filteredEnrollments.length === 0 ? (
            <div className="p-12 text-center">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No enrollments match your filters</p>
              <p className="text-gray-500 text-sm mt-2">Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#FFFDF0] border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedEnrollments.length === filteredEnrollments.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Course</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedEnrollments.map(enrollment => (
                    <tr key={enrollment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedEnrollments.includes(enrollment.id)}
                          onChange={() => toggleSelect(enrollment.id)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {enrollment.firstName} {enrollment.familyName}
                          </p>
                          <p className="text-sm text-gray-500">{enrollment.studentNumber}</p>
                          {enrollment.sscApplied && (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                              SSC Applicant
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900">
                          {`${enrollment.educationLevel} ${enrollment.gradeLevel || ''}`}
                        </span>
                        {enrollment.strand && <span className="text-xs text-purple-600 block">{enrollment.strand}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {enrollment.enrollmentType ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${
                            enrollment.enrollmentType === 'new' ? 'bg-blue-100 text-blue-700' :
                            enrollment.enrollmentType === 'old' ? 'bg-green-100 text-green-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {enrollment.enrollmentType}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={enrollment.status} />
                        {enrollment.sectionName && (
                          <p className="text-xs text-purple-600 font-medium mt-1">
                            {enrollment.sectionName}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {new Date(enrollment.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/enrollment/${enrollment.id}`, { state: { fromAdmin: true } })}
                            className="p-2 text-[#102A71] hover:bg-[#FFFDF0] rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {enrollment.status === 'approved' && (
                            <button
                              onClick={() => navigate(`/admin/sections`)}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Assign Section"
                            >
                              <BookOpen className="w-4 h-4" />
                            </button>
                          )}
                          {enrollment.status === 'pending_exam' && (
                            <>
                              {!enrollment.sscExamDate ? (
                                <button
                                  onClick={() => setShowSSCModal({ id: enrollment.id, action: 'schedule' })}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Schedule SSC Exam"
                                >
                                  <Calendar className="w-4 h-4" />
                                </button>
                              ) : !enrollment.sscExamScore ? (
                                <button
                                  onClick={() => setShowSSCModal({ id: enrollment.id, action: 'record' })}
                                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                  title="Record Exam Result"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              ) : null}
                            </>
                          )}
                          {enrollment.status === 'verified' && (
                            <>
                              <button
                                onClick={() => setShowApprovalModal({ id: enrollment.id, action: 'approve' })}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setShowApprovalModal({ id: enrollment.id, action: 'reject' })}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-white">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-500">
                  Showing <span className="font-semibold text-gray-800">{(page - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-semibold text-gray-800">{Math.min(page * pageSize, filteredEnrollments.length)}</span> of{' '}
                  <span className="font-semibold text-gray-800">{filteredEnrollments.length}</span> enrollments
                </p>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span>Show:</span>
                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="px-2 py-1 border border-gray-200 rounded-md text-xs text-gray-700 bg-white focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-normal rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={15} className="text-gray-400" />
                    <span>Previous</span>
                  </button>

                  {getPageNumbers().map((p, idx) => {
                    if (p === '...') {
                      return (
                        <span key={'ellipsis-' + idx} className="w-8 h-8 flex items-center justify-center text-sm text-gray-400 select-none">
                          ...
                        </span>
                      );
                    }
                    const isCurrent = p === page;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={'w-8 h-8 rounded-lg text-sm transition-colors flex items-center justify-center ' + (
                          isCurrent
                            ? 'bg-[#F5C400] text-gray-900 font-semibold shadow-xs'
                            : 'text-gray-700 hover:bg-gray-100 font-normal'
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-normal rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight size={15} className="text-gray-400" />
                  </button>
                </div>
              )}
            </div>
            </>
          )}
        </div>
        
        {/* Course Analytics */}
        <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#102A71]" />
            <h2 className="text-lg font-semibold text-[#001840]">Enrollment by Course</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(courseStats).map(([course, count]) => (
              <div key={course} className="p-4 bg-[#FFFDF0] rounded-lg border border-[#F5C400]/30">
                <p className="text-2xl font-bold text-[#102A71]">{count}</p>
                <p className="text-sm text-gray-600">{course}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Approval/Rejection Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {showApprovalModal.action === 'approve' ? 'Approve Enrollment' : 'Reject Enrollment'}
            </h3>
            <p className="text-gray-600 mb-4">
              Add a comment (optional):
            </p>
            <textarea
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              placeholder="Enter your comments here..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C400] focus:border-transparent mb-4"
              rows={4}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowApprovalModal(null);
                  setApprovalComment('');
                }}
                className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showApprovalModal.action === 'approve') {
                    handleApprove(showApprovalModal.id, approvalComment);
                  } else {
                    handleReject(showApprovalModal.id, approvalComment);
                  }
                }}
                className={`px-5 py-2.5 text-white rounded-lg transition-all font-medium ${
                  showApprovalModal.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {showApprovalModal.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SSC Exam Modal */}
      {showSSCModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {showSSCModal.action === 'schedule' ? 'Schedule SSC Entrance Exam' : 'Record SSC Exam Result'}
            </h3>
            
            {showSSCModal.action === 'schedule' ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exam Date</label>
                  <input
                    type="date"
                    value={sscExamDate}
                    onChange={(e) => setSSCExamDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C400] focus:border-transparent"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Passing Score</label>
                  <input
                    type="number"
                    value={sscPassingScore}
                    onChange={(e) => setSSCPassingScore(e.target.value)}
                    placeholder="75"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C400] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Default: 75</p>
                </div>
              </>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Exam Score</label>
                <input
                  type="number"
                  value={sscExamScore}
                  onChange={(e) => setSSCExamScore(e.target.value)}
                  placeholder="Enter score (0-100)"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5C400] focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  System will auto-route: Pass → SSC class, Fail → Regular class
                </p>
              </div>
            )}
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSSCModal(null);
                  setSSCExamDate('');
                  setSSCExamScore('');
                  setSSCPassingScore('75');
                }}
                className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showSSCModal.action === 'schedule') {
                    handleScheduleSSCExam(showSSCModal.id);
                  } else {
                    handleRecordSSCResult(showSSCModal.id);
                  }
                }}
                className="px-5 py-2.5 bg-[#102A71] text-white rounded-lg hover:bg-[#001840] transition-all font-medium"
              >
                {showSSCModal.action === 'schedule' ? 'Schedule Exam' : 'Record Result'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-[#001840]">{value}</p>
        </div>
        <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const configs = {
    draft:             { color: 'bg-gray-100 text-gray-700',    label: 'Draft' },
    submitted:         { color: 'bg-blue-100 text-blue-700',    label: 'Submitted' },
    pending_exam:      { color: 'bg-yellow-100 text-yellow-700',label: 'Pending SSC Exam' },
    verified:          { color: 'bg-purple-100 text-purple-700',label: 'Verified' },
    returned:          { color: 'bg-orange-100 text-orange-700',label: 'Returned' },
    approved:          { color: 'bg-green-100 text-green-700',  label: 'Approved' },
    subjects_enrolled: { color: 'bg-teal-100 text-teal-700',   label: 'Subjects Enrolled' },
    enrolled:          { color: 'bg-emerald-100 text-emerald-700', label: 'Enrolled' },
    rejected:          { color: 'bg-red-100 text-red-700',      label: 'Rejected' },
  };
  const config = configs[status] || configs.draft;
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
      {config.label}
    </span>
  );
}
