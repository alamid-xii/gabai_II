import { useEffect, useState } from 'react';
import { API, BACKEND_URL } from '../../config/api';
import { confirmAction } from '../../utils/confirmAction';

export function BuildingVoiceoverEditor({ buildingId, script, onScriptLoaded, onRefresh }) {
  const [building, setBuilding] = useState(null);
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!buildingId) return;
    const controller = new AbortController();
    fetch(`${API}/admin/buildings/${buildingId}/voiceover`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, signal: controller.signal
    }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Could not load voiceover');
      if (controller.signal.aborted) return;
      setBuilding(data.building); setConfigured(data.configured); setError('');
      onScriptLoaded(data.building.voiceoverScript || '');
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [buildingId, onScriptLoaded]);

  const normalize = (value) => String(value || '').replace(/\r\n?/g, '\n').trim();
  const normalizedScript = normalize(script);
  const unsaved = normalizedScript !== normalize(building?.voiceoverScript);
  const current = Boolean(building?.voiceoverAudioUrl && normalizedScript && normalizedScript === normalize(building.voiceoverAudioScript));
  async function action(kind, body) {
    setBusy(true); setError('');
    try {
      const token = localStorage.getItem('token');
      if (kind === 'generate' && unsaved && normalizedScript) {
        const saveRes = await fetch(`${API}/admin/buildings/${buildingId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ voiceoverScript: normalizedScript })
        });
        if (!saveRes.ok) {
          const errData = await saveRes.json().catch(() => ({}));
          throw Error(errData.error || 'Could not save voiceover script');
        }
      }
      const response = await fetch(`${API}/admin/buildings/${buildingId}/voiceover/${kind}`, {
        method: kind === 'generate' ? 'POST' : 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(kind === 'generate' ? { ...body, script: normalizedScript } : body)
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Voiceover request failed');
      setBuilding(data.building);
      onRefresh?.();
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3 text-sm">
    {!buildingId ? <p className="text-gray-500">Save this building first, then generate and preview its narration here.</p> : <>
      {!configured && <p className="text-amber-800">Voice generation needs setup: add the ElevenLabs API key and voice ID to the backend environment, then restart the backend.</p>}
      <div className="flex flex-wrap items-center gap-2">
        {building?.voiceoverAudioUrl && current && !unsaved && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${building.voiceoverPublished ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
            {building.voiceoverPublished ? 'Published on Virtual Tour' : 'Draft — Not yet published'}
          </span>
        )}
        <p className="text-gray-600">
          {unsaved
            ? 'Script modified — click Generate audio below to save and generate the new narration.'
            : current
              ? (building?.voiceoverPublished
                ? 'Students can hear this narration on the Campus Virtual Tour.'
                : 'Audio ready. Click "Publish narration" so students can hear it on the Virtual Tour.')
              : 'Voiceover needs generation for the saved script.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || !building || !configured || !normalizedScript}
          onClick={async () => {
            if (current && !(await confirmAction({ title: 'Regenerate Audio', message: 'Generate a new take? This uses ElevenLabs credits.', confirmText: 'Regenerate', variant: 'warning' }))) return;
            action('generate', { regenerate: current });
          }} className="px-3 py-2 rounded-lg bg-[#001840] text-white disabled:opacity-40 cursor-pointer">
          {busy ? 'Working…' : current ? 'Regenerate audio' : 'Generate audio'}
        </button>
        {building?.voiceoverAudioUrl && <button type="button" disabled={busy || (!building.voiceoverPublished && (!current || unsaved))}
          onClick={() => action('publish', { published: !building.voiceoverPublished })}
          className={`px-3 py-2 rounded-lg font-medium disabled:opacity-40 cursor-pointer ${building.voiceoverPublished ? 'border border-gray-300 text-gray-700 hover:bg-gray-100' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
          {building.voiceoverPublished ? 'Unpublish narration' : 'Publish narration'}
        </button>}
      </div>
      <p className="text-xs text-gray-500">Generation sends this script to ElevenLabs and uses credits. Student playback and listening to the saved preview do not generate new audio.</p>
      {building?.voiceoverAudioUrl && <div>
        <audio key={building.voiceoverAudioUrl} controls preload="none" onError={() => setError('Audio preview could not load. Check the saved audio before publishing.')} className="w-full" src={`${BACKEND_URL}${building.voiceoverAudioUrl}`} />
        {!current && <p className="text-xs text-amber-800 mt-1">This preview is for an older script. Generate updated audio before publishing.</p>}
      </div>}
    </>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </div>;
}
