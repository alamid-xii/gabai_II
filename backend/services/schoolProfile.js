import { SchoolProfile } from '../models/schoolProfileModel.js';
import { EnrollmentGuide } from '../models/enrollmentGuideModel.js';

export const PROFILE_FIELDS = { schoolName: 200, shortName: 40, tagline: 1000, address: 1000, phone: 100, email: 254, websiteUrl: 1000, facebookUrl: 1000, registrarLocation: 500, registrarHours: 500 };
export const CONTACT_FIELDS = ['phone', 'email', 'registrarLocation', 'registrarHours'];
const invalid = message => Object.assign(new Error(message), { status: 400 });
export function validateProfile(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid('A school profile is required.');
  const value = {};
  for (const [field, max] of Object.entries(PROFILE_FIELDS)) {
    const text = input[field] ?? '';
    if (typeof text !== 'string' || text.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) throw invalid(`Invalid ${field}. Maximum ${max} characters.`);
    value[field] = text.trim();
  }
  if (!value.schoolName) throw invalid('School name is required.');
  if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) throw invalid('Enter a valid contact email.');
  if (/[\r\n]/.test(value.email) || /[^0-9+().,\s\-/a-zA-Z]/.test(value.phone)) throw invalid('Invalid contact details.');
  for (const field of ['websiteUrl', 'facebookUrl']) {
    if (!value[field]) continue;
    try {
      const url = new URL(value[field]);
      if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || /\s|\\/.test(value[field])) throw Error();
    } catch { throw invalid(`${field} must be a full HTTPS URL.`); }
  }
  return value;
}
export async function initializeSchoolProfile() {
  if (await SchoolProfile.findByPk(1)) return;
  const guide = await EnrollmentGuide.findByPk(1);
  const old = guide?.content || {};
  const initial = validateProfile({
    schoolName: 'Eastern Mindoro College, Inc.', shortName: 'EMC',
    tagline: 'Your intelligent admission and campus navigation companion powered by a retrieval-based chatbot and 360-degree virtual tour technology.',
    address: 'Vicente Ylagan St. Bagong Bayan II, Bongabong, Philippines, 5211',
    phone: old.phone?.includes('123-4567') ? '' : old.phone || '', email: old.email || 'emc_1945@yahoo.com',
    websiteUrl: '', facebookUrl: 'https://www.facebook.com/share/1GyebKYixH/',
    registrarLocation: old.registrarLocation || 'Admin Building, Ground Floor', registrarHours: old.registrarHours || 'Mon-Fri: 8:00 AM - 5:00 PM'
  });
  await SchoolProfile.findOrCreate({ where: { id: 1 }, defaults: { content: initial, revision: 1 } });
}
export async function guideWithProfile(document) {
  const guide = document.toJSON ? document.toJSON() : { ...document };
  const profile = await SchoolProfile.findByPk(1);
  return { ...guide, content: { ...guide.content, ...Object.fromEntries(CONTACT_FIELDS.map(key => [key, profile?.content[key] || ''])) }, schoolName: profile?.content.schoolName || '', profileRevision: profile?.revision || null };
}
