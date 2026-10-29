import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { API } from '../../config/api';

const fields = {
  enrollmentPeriod: 'Enrollment period / dates', enrollmentAudience: 'Who can enroll',
  importantNotice: 'Important notice', importantDetail: 'Additional notice', completionTitle: 'Checklist completion heading',
  completionMessage: 'Checklist completion message', completionDetail: 'Additional completion message'
};
const icons = ['FileText', 'ClipboardList', 'CreditCard', 'UserCheck', 'BookOpen', 'Camera'];
export function AdminEnrollmentGuide() {
  const [guide, setGuide] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API}/enrollment-guide`, { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Could not load guide');
      setGuide(data); setError('');
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [reload]);
  function field(key, value) { setGuide(previous => ({ ...previous, content: { ...previous.content, [key]: value } })); }
  function stepField(index, key, value) { field('steps', guide.content.steps.map((step, i) => i === index ? { ...step, [key]: value } : step)); }
  function move(index, offset) { const steps = [...guide.content.steps]; [steps[index], steps[index + offset]] = [steps[index + offset], steps[index]]; field('steps', steps); }
  async function save(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...guide, content: { ...guide.content, steps: guide.content.steps.map(step => ({ ...step, requirements: step.requirements.map(line => line.trim()).filter(Boolean) })) } };
      const response = await fetch(`${API}/admin/enrollment-guide`, {
        method: 'PUT', headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Could not save guide');
      toast.success('Enrollment guide saved successfully.');
      setGuide(data);
    } catch (error) { setError(error.message); toast.error(error.message || "Could not save changes. Please try again."); }
    finally { setSaving(false); }
  }
  const inputClass = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm';
  return <div className="space-y-4">
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <button type="button" disabled={saving} onClick={() => { if (!guide || window.confirm('Reload the saved guide? Unsaved changes will be discarded.')) setReload(value => value + 1); }} className="text-sm underline">Reload saved guide</button>
    {!guide ? <p>Loading guide…</p> : <form onSubmit={save}>
      <fieldset disabled={saving} className="space-y-5">
        <section className="grid sm:grid-cols-2 gap-4 rounded-xl bg-white border p-5">
          {Object.entries(fields).map(([key, label]) => <label key={key} className="text-sm font-medium">{label}<textarea rows={2} maxLength={1000} value={guide.content[key] || ''} onChange={event => field(key, event.target.value)} className={inputClass} /></label>)}
        </section>
        {guide.content.steps.map((step, index) => <section key={step.id} className="rounded-xl border bg-white p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-3"><h3 className="font-bold flex-1">Step {index + 1}</h3>
            <button type="button" disabled={!index} onClick={() => move(index, -1)} className="text-sm underline disabled:opacity-30">Move up</button>
            <button type="button" disabled={index === guide.content.steps.length - 1} onClick={() => move(index, 1)} className="text-sm underline disabled:opacity-30">Move down</button>
            <button type="button" disabled={guide.content.steps.length <= 1} onClick={() => { if (window.confirm('Remove this guide step?')) field('steps', guide.content.steps.filter(item => item.id !== step.id)); }} className="text-sm text-red-700 disabled:opacity-30">Remove</button>
          </div>
          <label className="block text-sm">Title<input required maxLength={160} value={step.title} onChange={event => stepField(index, 'title', event.target.value)} className={inputClass} /></label>
          <label className="block text-sm">Description<textarea required maxLength={3000} rows={3} value={step.description} onChange={event => stepField(index, 'description', event.target.value)} className={inputClass} /></label>
          <label className="block text-sm">Requirements / instructions (one per line)<textarea maxLength={15000} rows={5} value={step.requirements.join('\n')} onChange={event => stepField(index, 'requirements', event.target.value.split('\n'))} className={inputClass} /></label>
          <label className="block text-sm">Tip<textarea rows={2} maxLength={2000} value={step.tips} onChange={event => stepField(index, 'tips', event.target.value)} className={inputClass} /></label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm">Estimated time<input maxLength={100} value={step.estimatedTime} onChange={event => stepField(index, 'estimatedTime', event.target.value)} className={inputClass} /></label>
            <label className="text-sm">Icon<select value={step.icon} onChange={event => stepField(index, 'icon', event.target.value)} className={inputClass}>{icons.map(icon => <option key={icon}>{icon}</option>)}</select></label>
            <label className="text-sm">Download button text<input maxLength={100} value={step.downloadLabel} onChange={event => stepField(index, 'downloadLabel', event.target.value)} className={inputClass} /></label>
            <label className="text-sm">Download link (optional)<input maxLength={1000} value={step.downloadUrl} onChange={event => stepField(index, 'downloadUrl', event.target.value)} placeholder="https://… or /uploads/…" className={inputClass} /></label>
          </div>
          <p className="text-xs text-gray-500">Without a link, Download provides a text checklist using this step's saved content.</p>
        </section>)}
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={guide.content.steps.length >= 20} onClick={() => field('steps', [...guide.content.steps, { id: Math.max(0, ...guide.content.steps.map(step => step.id)) + 1, icon: 'FileText', title: '', description: '', requirements: [], tips: '', estimatedTime: '', downloadLabel: 'Download checklist', downloadUrl: '' }])} className="rounded-lg border px-4 py-2">Add step</button>
          <button type="submit" className="rounded-lg bg-[#001840] px-4 py-2 text-white">{saving ? 'Saving…' : 'Save enrollment guide'}</button>
        </div>
      </fieldset>
    </form>}
  </div>;
}
