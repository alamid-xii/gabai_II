import { guideWithProfile } from "../services/schoolProfile.js";
import { EnrollmentGuide } from '../models/enrollmentGuideModel.js';
import { validateGuide } from '../services/enrollmentGuide.js';

export async function getEnrollmentGuide(req, res) {
  try {
    const guide = await EnrollmentGuide.findByPk(1);
    if (!guide) return res.status(503).json({ error: 'The enrollment guide has not been configured yet.' });
    res.set('Cache-Control', 'no-store');
    return res.json(await guideWithProfile(guide));
  } catch { return res.status(503).json({ error: 'The enrollment guide is temporarily unavailable.' }); }
}
export async function updateEnrollmentGuide(req, res) {
  try {
    if (!Number.isSafeInteger(req.body?.revision) || req.body.revision < 1) return res.status(400).json({ error: 'A valid guide revision is required.' });
    const content = validateGuide(req.body.content);
    const [changed] = await EnrollmentGuide.update({ content, revision: req.body.revision + 1 }, { where: { id: 1, revision: req.body.revision } });
    if (!changed) return res.status(409).json({ error: 'Another administrator updated this guide. Reload it before saving your changes.' });
    return res.json(await EnrollmentGuide.findByPk(1));
  } catch (error) { return res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not save the enrollment guide.' }); }
}
