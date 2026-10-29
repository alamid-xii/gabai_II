import { useEffect, useState } from 'react';
import { API, BACKEND_URL } from '../../config/api';

export function BuildingVoiceoverEditor({ buildingId, script, onScriptLoaded, onRefresh }) {
  const [building, setBuilding] = useState(null);
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [previewed, setPreviewed] = useState(false);
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

  const unsaved = script.trim() !== (building?.voiceoverScript || '').trim();
  const current = Boolean(building?.voiceoverAudioUrl && script.trim() && script.trim() === building.voiceoverAudioScript);
  async function action(kind, body) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API}/admin/buildings/${buildingId}/voiceover/${kind}`, {
        method: kind === 'generate' ? 'POST' : 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Voiceover request failed');
      setBuilding(data.building);
      if (kind === 'generate') setPreviewed(false);
      onRefresh?.();
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3 text-sm">
    {!buildingId ? <p className="text-gray-500">Save this building first, then generate and preview its narration here.</p> : <>
      {!configured && <p className="text-amber-800">Voice generation needs setup: add the ElevenLabs API key and voice ID to the backend environment, then restart the backend.</p>}
      <p className="text-gray-600">{unsaved ? 'Save the building to apply your script changes before generating.' : current ? (building?.voiceoverPublished ? 'Published: students can hear this narration.' : 'Audio ready. Preview it, then publish when approved.') : 'Voiceover needs generation for the saved script.'}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || !building || !configured || unsaved || !script.trim()}
          onClick={() => {
            if (current && !window.confirm('Generate a new take? This uses ElevenLabs credits.')) return;
            action('generate', { regenerate: current });
          }} className="px-3 py-2 rounded-lg bg-[#001840] text-white disabled:opacity-40">
          {busy ? 'Working…' : current ? 'Regenerate audio' : 'Generate audio'}
        </button>
        {building?.voiceoverAudioUrl && <button type="button" disabled={busy || (!building.voiceoverPublished && (!current || unsaved || !previewed))}
          onClick={() => action('publish', { published: !building.voiceoverPublished })}
          className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-40">
          {building.voiceoverPublished ? 'Unpublish narration' : 'Publish narration'}
        </button>}
      </div>
      <p className="text-xs text-gray-500">Generation sends this script to ElevenLabs and uses credits. Student playback and listening to the saved preview do not generate new audio.</p>
      {building?.voiceoverAudioUrl && <div>
        <audio key={building.voiceoverAudioUrl} controls preload="none" onPlay={() => setPreviewed(true)} onError={() => { setPreviewed(false); setError('Audio preview could not load. Check the saved audio before publishing.'); }} className="w-full" src={`${BACKEND_URL}${building.voiceoverAudioUrl}`} />
        {!current && <p className="text-xs text-amber-800 mt-1">This preview is for an older script. Generate updated audio before publishing.</p>}
      </div>}
    </>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </div>;
}
