import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import EnrollmentApplicationReview, { EnrollmentReviewNavigation } from '../../pages/registrar/EnrollmentApplicationReview';
import { getEnrollmentById, getEnrollmentDocuments } from '../../services/enrollmentApi';

export default function EnrollmentDetailsModal({ enrollmentId, onClose }) {
  const sections = useRef([]);
  const [enrollment, setEnrollment] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documentsError, setDocumentsError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getEnrollmentById(enrollmentId), getEnrollmentDocuments(enrollmentId)]).then(([application, files]) => {
      if (cancelled) return;
      if (application.status === 'fulfilled') { setEnrollment(application.value.enrollment || application.value); setError(''); }
      else setError(application.reason?.message || 'Could not load your enrollment.');
      if (files.status === 'fulfilled') { setDocuments(Array.isArray(files.value) ? files.value : []); setDocumentsError(''); }
      else { setDocuments([]); setDocumentsError(files.reason?.message || 'Could not load your documents.'); }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [enrollmentId, revision]);
  const retry = () => { setLoading(true); setRevision(value => value + 1); };
  const name = enrollment ? [enrollment.firstName, enrollment.middleName, enrollment.familyName].filter(Boolean).join(' ') || enrollment.user?.name : '';
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="flex h-[92dvh] max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl bg-slate-50 p-0 sm:max-w-4xl">
      <div className="shrink-0 space-y-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="pr-8"><DialogTitle className="text-[#001840]">Enrollment Details</DialogTitle>
          <DialogDescription className="mt-1 text-xs text-slate-500">{name || 'Your enrollment application'}{enrollment ? ` / ${enrollment.gradeLevel || enrollment.educationLevel} / ${enrollment.academicYear || ''}` : ''}</DialogDescription>
        </div>
        {enrollment && <EnrollmentReviewNavigation enrollment={enrollment} disabled={loading || !!error} onJump={index => sections.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />}
      </div>
      <div tabIndex={0} aria-label="Enrollment details" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
        {loading ? <p role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" /> Loading enrollment...</p>
          : error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error} <button type="button" onClick={retry} className="font-semibold underline">Retry</button></div>
          : enrollment && <>
            {enrollment.status === 'returned' && enrollment.registrar_remarks && <div className="rounded-xl border border-orange-200 bg-orange-50 p-4"><h3 className="text-sm font-semibold text-orange-800">Registrar Remarks</h3><p className="mt-1 whitespace-pre-wrap text-sm text-orange-700">{enrollment.registrar_remarks}</p></div>}
            <EnrollmentApplicationReview enrollment={enrollment} documents={documents} documentsError={documentsError} onRetry={retry} sectionsRef={sections} />
          </>}
      </div>
      <div className="flex shrink-0 justify-end border-t border-slate-200 bg-white px-4 py-3 sm:px-6"><button type="button" onClick={onClose} className="rounded-lg bg-[#102A71] px-5 py-2 text-sm font-semibold text-white hover:bg-[#001840]">Close</button></div>
    </DialogContent>
  </Dialog>;
}
