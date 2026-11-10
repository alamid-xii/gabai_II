import { useEffect, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverAnchor, PopoverContent } from '../../components/ui/popover';
import { API } from '../../config/api';

export default function EnrollmentPdfButton({ enrollmentId }) {
  const [open, setOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const resource = useRef({ url: '', pending: null, controller: null, disposed: false });
  const openTimer = useRef(null);
  const closeTimer = useRef(null);
  const touch = useRef(false);
  useEffect(() => {
    const current = resource.current;
    current.disposed = false;
    return () => {
      current.disposed = true;
      current.controller?.abort();
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
      if (current.url) URL.revokeObjectURL(current.url);
    };
  }, []);

  function loadPdf() {
    const current = resource.current;
    if (current.url) return Promise.resolve(current.url);
    if (current.pending) return current.pending;
    current.controller = new AbortController();
    setLoading(true);
    setError('');
    current.pending = (async () => {
      try {
        const response = await fetch(`${API}/enrollments/${enrollmentId}/pdf`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, signal: current.controller.signal,
        });
        if (!response.ok) throw new Error('Could not load the enrollment PDF. Please try again.');
        const blob = await response.blob();
        if (current.disposed) return null;
        current.url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        setPdfUrl(current.url);
        return current.url;
      } catch (failure) {
        if (!current.disposed) setError(failure.message || 'Could not load the enrollment PDF.');
        throw failure;
      } finally {
        current.pending = null;
        if (!current.disposed) setLoading(false);
      }
    })();
    return current.pending;
  }
  function showPreview() {
    clearTimeout(closeTimer.current);
    setOpen(true);
    loadPdf().catch(() => {});
  }
  function closePreview() {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  }
  async function download() {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    setOpen(false);
    setDownloading(true);
    try {
      const url = await loadPdf();
      if (!url || resource.current.disposed) return;
      const link = document.createElement('a');
      link.href = url;
      link.download = `enrollment-${enrollmentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (failure) {
      if (!resource.current.disposed) toast.error(failure.message || 'Failed to download PDF');
    } finally { if (!resource.current.disposed) setDownloading(false); }
  }
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverAnchor asChild>
      <button type="button" disabled={downloading} aria-label="Download enrollment PDF" aria-describedby={open ? `pdf-preview-${enrollmentId}` : undefined}
        onPointerEnter={event => {
          if (event.pointerType === 'touch') return;
          touch.current = false;
          clearTimeout(closeTimer.current);
          clearTimeout(openTimer.current);
          openTimer.current = setTimeout(showPreview, 300);
        }}
        onPointerLeave={closePreview}
        onPointerDown={event => { touch.current = event.pointerType === 'touch'; if (touch.current) { clearTimeout(openTimer.current); setOpen(false); } }}
        onFocus={() => { if (!touch.current) showPreview(); }} onBlur={closePreview}
        onClick={download}
        className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50">
        {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} PDF
      </button>
    </PopoverAnchor>
    <PopoverContent side="top" align="end" sideOffset={8} collisionPadding={12}
      onOpenAutoFocus={event => event.preventDefault()} onCloseAutoFocus={event => event.preventDefault()}
      onPointerEnter={() => clearTimeout(closeTimer.current)} onPointerLeave={closePreview}
      className="z-[60] w-[min(32rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-2xl">
      <div id={`pdf-preview-${enrollmentId}`} className="border-b border-slate-100 px-4 py-3"><p className="text-sm font-semibold text-[#001840]">Enrollment PDF preview</p><p className="mt-0.5 text-xs text-slate-500">Click the PDF button to download.</p></div>
      {loading ? <div role="status" className="flex h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" /> Preparing preview...</div>
        : error ? <div role="alert" className="p-4 text-sm text-red-600">{error} <button type="button" onClick={() => loadPdf().catch(() => {})} className="font-semibold underline">Retry</button></div>
        : pdfUrl ? <iframe title="Enrollment PDF preview" src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`} className="h-[min(60dvh,36rem)] min-h-48 w-full bg-slate-100" /> : null}
    </PopoverContent>
  </Popover>;
}
