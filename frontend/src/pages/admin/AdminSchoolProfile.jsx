import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { API } from '../../config/api';
import { refreshSchoolProfile } from '../../hooks/useSchoolProfile';
import { confirmAction } from '../../components/ConfirmModal';

const fields = {
  schoolName: ['School name', 200], shortName: ['Short name / abbreviation', 40], tagline: ['Footer description', 1000],
  address: ['School address', 1000], phone: ['Contact phone', 100], email: ['Contact email', 254],
  websiteUrl: ['Official website (HTTPS)', 1000], facebookUrl: ['Facebook link (HTTPS)', 1000],
  registrarLocation: ['Registrar office location', 500], registrarHours: ['Registrar office hours', 500]
};
export function AdminSchoolProfile() {
  const [document, setDocument] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API}/school-profile`, { signal: controller.signal, cache: 'no-store' }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Could not load school profile');
      if (!controller.signal.aborted) { setDocument(data); setError(''); }
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [reload]);
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(`${API}/admin/school-profile`, { method: 'PUT', headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' }, body: JSON.stringify(document) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Could not save school profile');
      setDocument(data);
      toast.success('School profile saved successfully.');
      await refreshSchoolProfile();
    } catch (error) { setError(error.message); toast.error(error.message || "Could not save changes. Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <button type="button" disabled={busy} onClick={async () => { if (!document || (await confirmAction('Reload saved details and discard unsaved edits?'))) setReload(value => value + 1); }} className="text-sm underline">Reload saved profile</button>
    {document ? <form onSubmit={save}><fieldset disabled={busy} className="rounded-xl border bg-white p-5 space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        {Object.entries(fields).map(([key, [label, maxLength]]) => <label key={key} className={`text-sm font-medium ${['address', 'tagline'].includes(key) ? 'sm:col-span-2' : ''}`}>{label}
          {['address', 'tagline'].includes(key) ? <textarea rows={3} maxLength={maxLength} value={document.content[key] || ''} onChange={event => { setDocument({ ...document, content: { ...document.content, [key]: event.target.value } }); }} className="mt-1 w-full rounded-lg border p-3" /> :
            <input type={key === 'email' ? 'email' : key.endsWith('Url') ? 'url' : 'text'} required={key === 'schoolName'} maxLength={maxLength} value={document.content[key] || ''} onChange={event => { setDocument({ ...document, content: { ...document.content, [key]: event.target.value } }); }} className="mt-1 w-full rounded-lg border p-3" />}
        </label>)}
      </div>
      <button type="submit" className="rounded-lg bg-[#001840] px-4 py-2 text-white">{busy ? 'Saving...' : 'Save school profile'}</button>
    </fieldset></form> : <p>Loading school profile...</p>}
  </div>;
}
