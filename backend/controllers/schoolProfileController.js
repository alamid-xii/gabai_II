import { SchoolProfile } from '../models/schoolProfileModel.js';
import { validateProfile } from '../services/schoolProfile.js';

export async function getSchoolProfile(req, res) {
  try {
    const profile = await SchoolProfile.findByPk(1);
    if (!profile) return res.status(503).json({ error: 'School profile is not configured yet.' });
    res.set('Cache-Control', 'no-store');
    return res.json(profile);
  } catch { return res.status(503).json({ error: 'School profile is temporarily unavailable.' }); }
}
export async function updateSchoolProfile(req, res) {
  try {
    if (!Number.isSafeInteger(req.body?.revision) || req.body.revision < 1) return res.status(400).json({ error: 'A valid profile revision is required.' });
    const content = validateProfile(req.body.content);
    const [changed] = await SchoolProfile.update({ content, revision: req.body.revision + 1 }, { where: { id: 1, revision: req.body.revision } });
    if (!changed) return res.status(409).json({ error: 'Another administrator changed the profile. Reload before saving.' });
    return res.json(await SchoolProfile.findByPk(1));
  } catch (error) { return res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not save school profile.' }); }
}
