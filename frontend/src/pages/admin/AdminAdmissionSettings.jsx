import { useState } from 'react';
import { toast } from 'sonner';
import { API } from '../../config/api';
import { confirmAction } from '../../components/ConfirmModal';
import { useAdmissionSettings } from '../../hooks/useAdmissionSettings';

export function AdminAdmissionSettings() {
  const { settings, error, retry } = useAdmissionSettings();
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [level, setLevel] = useState('JHS');
  const [type, setType] = useState('new');
  const [newStrand, setNewStrand] = useState('');
  const [docKey, setDocKey] = useState('');
  const [docLabel, setDocLabel] = useState('');
  const current = draft || settings;
  if (!current) return <div><p role="status">{error || 'Loading admission settings...'}</p>{error && <button onClick={retry}>Try again</button>}</div>;
  const content = current.content;
  function patch(values) { setDraft({ ...current, content: { ...content, ...values } }); }
  function changeRule(key, choice) {
    const rules = content.requirements[level][type].filter(rule => rule.key !== key);
    if (choice !== 'off') rules.push({ key, required: choice === 'required' });
    patch({ requirements: { ...content.requirements, [level]: { ...content.requirements[level], [type]: rules } } });
  }
  async function save(event) {
    event.preventDefault(); setSaving(true);
    try {
      const response = await fetch(`${API}/admin/admission-settings`, { method: 'PUT', headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' }, body: JSON.stringify(current) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Could not save settings.');
      setDraft(data); toast.success('Admission settings saved successfully.');
    } catch (error) { toast.error(error.message); }
    finally { setSaving(false); }
  }
  const input = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm min-w-0';
  return <form onSubmit={save}><fieldset disabled={saving} className="space-y-5">
    <p className="text-sm text-gray-600">Changes apply to newly created applications. Saved applications retain their admission rules. Existing applications without a rules snapshot follow the previous requirements.</p>
    <button type="button" onClick={async () => { if (await confirmAction('Discard unsaved changes and reload current settings?')) { setDraft(null); retry(); } }} className="text-sm underline">Reload saved settings</button>
    <section className="rounded-xl border bg-white p-4 sm:p-5 space-y-3">
      <h3 className="font-bold text-[#001840]">SHS strands</h3>
      {content.strands.map((strand, index) => <label key={strand.name} className="flex gap-3 items-center text-sm py-1"><input type="checkbox" checked={strand.active} onChange={event => patch({ strands: content.strands.map((item, i) => i === index ? { ...item, active: event.target.checked } : item) })} />{strand.name}</label>)}
      <div className="flex flex-wrap gap-2"><input aria-label="New strand name" maxLength={50} value={newStrand} onChange={event => setNewStrand(event.target.value)} className={input} placeholder="New strand name" /><button type="button" onClick={() => { if (!newStrand.trim()) return; if (content.strands.some(item => item.name.toLowerCase() === newStrand.trim().toLowerCase())) { toast.error('That strand already exists.'); return; } patch({ strands: [...content.strands, { name: newStrand.trim(), active: true }] }); setNewStrand(''); }} className="rounded-lg border px-3 py-2 text-sm">Add strand</button></div>
    </section>
    <section className="rounded-xl border bg-white p-4 sm:p-5 space-y-3">
      <h3 className="font-bold text-[#001840]">Special Science Class (SSC)</h3>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={content.ssc.enabled} onChange={event => patch({ ssc: { ...content.ssc, enabled: event.target.checked } })} />Accept new SSC applications</label>
      <label className="block text-sm">Minimum Grade 6 general average (Grade 7 entrance)<input type="number" min={0} max={100} step="0.01" required value={content.ssc.minimumAverage} onChange={event => patch({ ssc: { ...content.ssc, minimumAverage: event.target.value === '' ? '' : Number(event.target.value) } })} className={`${input} block mt-1 w-32`} /></label>
      <label className="block text-sm">SSC maintaining general average (Grade 8–10 continuing)<input type="number" min={0} max={100} step="0.01" required value={content.ssc.maintainingAverage ?? content.ssc.minimumAverage ?? 85} onChange={event => patch({ ssc: { ...content.ssc, maintainingAverage: event.target.value === '' ? '' : Number(event.target.value) } })} className={`${input} block mt-1 w-32`} /></label>
      <p className="text-xs text-gray-500">The Registrar still verifies the report card for Grade 7 applicants. Continuing SSC students (Grade 8–10) whose previous general average falls below the maintaining grade will only be eligible for the Regular Class.</p>
    </section>
    <section className="rounded-xl border bg-white p-4 sm:p-5 space-y-4">
      <h3 className="font-bold text-[#001840]">Document checklists</h3>
      <div className="flex flex-wrap gap-3"><select aria-label="Education level" value={level} onChange={event => setLevel(event.target.value)} className={input}><option>JHS</option><option>SHS</option></select><select aria-label="Applicant type" value={type} onChange={event => setType(event.target.value)} className={input}>{['new', 'old', 'transferee', 'returnee'].map(value => <option key={value} value={value}>{value === 'old' ? 'Old / Continuing' : value}</option>)}</select></div>
      {content.documents.map((doc, index) => {
        const rule = content.requirements[level][type].find(rule => rule.key === doc.key);
        return <div key={doc.key} className="grid sm:grid-cols-[1fr_180px] gap-2 border-t pt-3">
          <label className="text-sm">Document label <span className="text-xs text-gray-400">({doc.key})</span><input required maxLength={100} value={doc.label} onChange={event => patch({ documents: content.documents.map((item, i) => i === index ? { ...item, label: event.target.value } : item) })} className={`${input} block w-full mt-1`} /></label>
          <label className="text-sm">For {level} / {type}<select value={!rule ? 'off' : rule.required ? 'required' : 'optional'} onChange={event => changeRule(doc.key, event.target.value)} className={`${input} block w-full mt-1`}><option value="off">Not requested</option><option value="optional">Optional</option><option value="required">Required</option></select></label>
        </div>;
      })}
      <div className="grid sm:grid-cols-2 gap-2 border-t pt-4"><input aria-label="New document key" pattern="[a-zA-Z][a-zA-Z0-9_]{0,39}" maxLength={40} value={docKey} onChange={event => setDocKey(event.target.value)} placeholder="Upload key, e.g. birthCert" className={input} /><input aria-label="New document label" maxLength={100} value={docLabel} onChange={event => setDocLabel(event.target.value)} placeholder="Document label" className={input} /><button type="button" onClick={() => {
        if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(docKey) || !docLabel.trim() || ['constructor','prototype','__proto__','sscCard'].includes(docKey) || content.documents.some(doc => doc.key === docKey)) { toast.error('Use a unique upload key and document label.'); return; }
        patch({ documents: [...content.documents, { key: docKey, label: docLabel.trim() }] }); setDocKey(''); setDocLabel('');
      }} className="rounded-lg border px-3 py-2 text-sm">Add document</button></div>
      <p className="text-xs text-gray-500">Set each document separately for every education level and applicant type. A document marked “Not requested” will not appear on that checklist.</p>
    </section>
    <button type="submit" className="rounded-lg bg-[#001840] px-5 py-3 text-white">{saving ? 'Saving...' : 'Save admission settings'}</button>
  </fieldset></form>;
}
