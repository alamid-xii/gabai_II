import { Building } from '../models/buildingModel.js';
import { validateScript, voiceConfig, signature, synthesize, saveAudio, removeAudio } from '../services/buildingVoiceover.js';

export function createVoiceoverHandlers(deps = {}) {
  const model = deps.model || Building;
  const generateAudio = deps.synthesize || synthesize;
  const save = deps.save || saveAudio;
  const remove = deps.remove || removeAudio;
  const config = deps.config || voiceConfig;
  const active = new Set();
  const lastAttempt = new Map();
  const find = req => model.findOne({ where: { id: req.params.id, isActive: true } });
  return {
    get: async (req, res) => {
      try {
        const building = await find(req);
        if (!building) return res.status(404).json({ error: 'Building not found' });
        const settings = config();
        return res.json({ building, configured: Boolean(settings.apiKey && settings.voiceId) });
      } catch { return res.status(500).json({ error: 'Could not load voiceover settings' }); }
    },
    generate: async (req, res) => {
      const lock = String(req.params.id);
      const actor = String(req.user?.id || req.session?.userId || 'admin');
      if (active.has(lock)) return res.status(409).json({ error: 'A voiceover is already being generated for this building.' });
      active.add(lock);
      let newUrl;
      let committed = false;
      try {
        const building = await find(req);
        if (!building) return res.status(404).json({ error: 'Building not found' });
        const script = building.voiceoverScript?.trim();
        if (!validateScript(script)) return res.status(400).json({ error: 'Save a custom voiceover script of 1–2,500 characters first.' });
        const settings = config();
        const hash = signature(script, settings);
        if (building.voiceoverSignature === hash && building.voiceoverAudioUrl && req.body?.regenerate !== true) return res.json({ building, cached: true });
        const now = Date.now();
        for (const [id, time] of lastAttempt) if (now - time >= 60000) lastAttempt.delete(id);
        if (lastAttempt.has(actor)) return res.status(429).json({ error: 'Wait one minute between voice generations.' });
        if (active.size > 2) return res.status(429).json({ error: 'Voice generation is busy. Try again shortly.' });
        lastAttempt.set(actor, now);
        const audio = await generateAudio(script, settings);
        newUrl = await save(audio);
        // Do not attach audio to a script changed by a different admin mid-request.
        const [changed] = await model.update({ voiceoverAudioUrl: newUrl, voiceoverAudioScript: script, voiceoverSignature: hash, voiceoverPublished: false }, { where: { id: building.id, isActive: true, voiceoverScript: building.voiceoverScript } });
        if (!changed) {
          await remove(newUrl);
          return res.status(409).json({ error: 'The building script changed during generation. Reload before generating again. This request may have used credits.' });
        }
        committed = true;
        await remove(building.voiceoverAudioUrl);
        return res.json({ building: await find(req), cached: false });
      } catch (error) {
        if (newUrl && !committed) await remove(newUrl);
        return res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not save voiceover. Check usage before trying again.' });
      } finally { active.delete(lock); }
    },
    publish: async (req, res) => {
      if (typeof req.body?.published !== 'boolean') return res.status(400).json({ error: 'published must be a boolean' });
      try {
        const building = await find(req);
        if (!building) return res.status(404).json({ error: 'Building not found' });
        if (req.body.published && (!building.voiceoverAudioUrl || !building.voiceoverScript?.trim() || building.voiceoverScript.trim() !== building.voiceoverAudioScript)) return res.status(409).json({ error: 'Generate and preview audio for the saved script before publishing.' });
        const [changed] = await model.update({ voiceoverPublished: req.body.published }, { where: { id: building.id, isActive: true, voiceoverScript: building.voiceoverScript, voiceoverAudioUrl: building.voiceoverAudioUrl } });
        if (!changed) return res.status(409).json({ error: 'Building changed. Reload and try again.' });
        return res.json({ building: await find(req) });
      } catch { return res.status(500).json({ error: 'Could not update voiceover publication' }); }
    }
  };
}
export const buildingVoiceover = createVoiceoverHandlers();
