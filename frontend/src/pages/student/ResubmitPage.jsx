import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { AlertCircle, Upload, X, FileText, CheckCircle2, Loader2, ChevronLeft } from "lucide-react";
import { getEnrollmentById, getEnrollmentDocuments, uploadEnrollmentDocuments, deleteEnrollmentDocument, resubmitEnrollment } from "../../services/enrollmentApi";

const CREDENTIALS = [
  { key: "f138", label: "F-138" },
  { key: "f137a", label: "F-137-A" },
  { key: "cgmc", label: "CGMC" },
  { key: "tor", label: "TOR" },
  { key: "birthCert", label: "Birth Certificate" },
  { key: "marriageCert", label: "Marriage Certificate", optional: true },
  { key: "cert", label: "Certificate" },
  { key: "f137e", label: "F-137-E" },
];

export function ResubmitPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [enrollment, setEnrollment] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [newFiles, setNewFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      getEnrollmentById(id),
      getEnrollmentDocuments(id),
    ]).then(([enrData, docs]) => {
      setEnrollment(enrData.enrollment || enrData);
      setUploadedDocs(Array.isArray(docs) ? docs : []);
    }).catch(() => toast.error("Failed to load enrollment"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDeleteDoc(docId) {
    try {
      await deleteEnrollmentDocument(id, docId);
      setUploadedDocs(prev => prev.filter(d => d.id !== docId));
      toast.success("Document removed");
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleUploadNew(key, file) {
    if (!file) return;
    try {
      const result = await uploadEnrollmentDocuments(id, { [key]: file });
      setUploadedDocs(result.documents || []);
      setNewFiles(prev => ({ ...prev, [key]: null }));
      toast.success("Document uploaded");
    } catch (err) {
      toast.error(err.message || "Upload failed");
    }
  }

  async function handleResubmit() {
    // Check all required credentials have files
    const checkedKeys = Array.isArray(enrollment?.admissionCredentials)
      ? enrollment.admissionCredentials
      : [];
    const missing = checkedKeys.filter(k => {
      const cred = CREDENTIALS.find(c => c.key === k);
      if (cred?.optional) return false;
      return !uploadedDocs.find(d => d.documentType === k);
    });
    if (missing.length > 0) {
      const labels = missing.map(k => CREDENTIALS.find(c => c.key === k)?.label || k);
      toast.error(`Please upload files for: ${labels.join(", ")}`);
      return;
    }
    setSubmitting(true);
    try {
      await resubmitEnrollment(id);
      toast.success("Enrollment resubmitted! The registrar will review your documents.");
      navigate("/my-enrollments");
    } catch (err) {
      toast.error(err.message || "Failed to resubmit");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFDF0]">
        <Loader2 className="w-8 h-8 animate-spin text-[#102A71]" />
      </div>
    );
  }

  if (!enrollment) return null;

  const checkedKeys = Array.isArray(enrollment.admissionCredentials)
    ? enrollment.admissionCredentials
    : [];

  return (
    <div className="min-h-screen bg-linear-to-br from-[#FFFDF0] via-[#FFF9E6] to-[#FFFDF0] py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Back */}
        <button onClick={() => navigate("/my-enrollments")}
          className="flex items-center gap-2 text-[#102A71] hover:text-[#001840] mb-6 font-medium">
          <ChevronLeft size={18} /> Back to My Enrollments
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/emc_logo_nobg.png" alt="EMC" className="w-10 h-10" />
            <div className="text-left">
              <p className="font-bold text-[#001840] text-sm">Eastern Mindoro College, Inc.</p>
              <p className="text-xs text-gray-500">Re-upload Documents</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[#001840] mt-2">Fix & Resubmit Enrollment</h1>
          <p className="text-sm text-gray-500 mt-1">
            {enrollment.firstName} {enrollment.familyName} — {enrollment.course || enrollment.gradeLevel || enrollment.educationLevel}
          </p>
        </div>

        {/* Registrar Remarks */}
        {enrollment.registrar_remarks && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-orange-800 mb-1">Registrar Remarks</p>
                <p className="text-sm text-orange-700">{enrollment.registrar_remarks}</p>
              </div>
            </div>
          </div>
        )}

        {/* Documents */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-4">
          <div>
            <h2 className="font-bold text-[#001840] mb-1">Your Documents</h2>
            <p className="text-xs text-gray-500">Remove incorrect files and upload the correct ones. All required documents must be uploaded before resubmitting.</p>
          </div>

          {checkedKeys.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No credentials on record.</p>
          ) : (
            <div className="space-y-3">
              {checkedKeys.map(key => {
                const cred = CREDENTIALS.find(c => c.key === key);
                const uploaded = uploadedDocs.find(d => d.documentType === key);
                return (
                  <div key={key} className={`p-4 rounded-xl border-2 transition-all ${uploaded ? "border-green-300 bg-green-50" : "border-red-200 bg-red-50"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#001840]">{cred?.label || key}</span>
                        {cred?.optional && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Optional</span>}
                        {!cred?.optional && !uploaded && <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full font-medium">Required</span>}
                      </div>
                      {uploaded && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><CheckCircle2 size={11} /> Uploaded</span>}
                    </div>
                    {uploaded ? (
                      <div className="flex items-center gap-3">
                        <a href={`http://localhost:3000${uploaded.filePath}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline truncate flex-1">
                          <FileText size={13} /> {uploaded.originalName}
                        </a>
                        <button type="button" onClick={() => handleDeleteDoc(uploaded.id)}
                          className="text-xs text-red-500 hover:text-red-700 shrink-0 flex items-center gap-1">
                          <X size={13} /> Remove
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Upload size={14} className="text-gray-400" />
                        <span className="text-xs text-gray-500">Click to upload (PDF, JPG, PNG — max 10MB)</span>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                          onChange={e => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const ALLOWED = ['application/pdf','image/jpeg','image/jpg','image/png'];
                            const ALLOWED_EXT = ['.pdf','.jpg','.jpeg','.png'];
                            const ext = '.' + file.name.split('.').pop().toLowerCase();
                            if (!ALLOWED.includes(file.type) || !ALLOWED_EXT.includes(ext)) {
                              toast.error(`Invalid file type. Only PDF, JPG, and PNG are allowed.`);
                              e.target.value = '';
                              return;
                            }
                            if (file.size > 10 * 1024 * 1024) {
                              toast.error('File exceeds 10MB limit. Please choose a smaller file.');
                              e.target.value = '';
                              return;
                            }
                            handleUploadNew(key, file);
                          }} />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm mb-4">
              <span className="text-gray-600">
                {uploadedDocs.filter(d => checkedKeys.includes(d.documentType)).length} of {checkedKeys.filter(k => !CREDENTIALS.find(c => c.key === k)?.optional).length} required documents uploaded
              </span>
              <span className={`font-semibold ${
                checkedKeys.filter(k => !CREDENTIALS.find(c => c.key === k)?.optional && !uploadedDocs.find(d => d.documentType === k)).length === 0
                  ? "text-green-600" : "text-red-500"
              }`}>
                {checkedKeys.filter(k => !CREDENTIALS.find(c => c.key === k)?.optional && !uploadedDocs.find(d => d.documentType === k)).length === 0
                  ? "Ready to resubmit" : "Missing documents"}
              </span>
            </div>
            <button onClick={handleResubmit} disabled={submitting}
              className="w-full py-3 bg-[#102A71] hover:bg-[#001840] text-white rounded-xl font-bold transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {submitting ? <><Loader2 size={18} className="animate-spin" /> Resubmitting...</> : <><CheckCircle2 size={18} /> Resubmit to Registrar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}