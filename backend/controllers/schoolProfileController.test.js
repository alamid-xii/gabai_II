import test from 'node:test';
import assert from 'node:assert/strict';
import { SchoolProfile } from '../models/schoolProfileModel.js';
import { EnrollmentGuide } from '../models/enrollmentGuideModel.js';
import { FAQ } from '../models/faqModel.js';
import { sequelize } from '../models/db.js';
import { validateProfile, guideWithProfile } from '../services/schoolProfile.js';
import { getSchoolProfile, updateSchoolProfile } from './schoolProfileController.js';
import { retrieve } from '../services/chatRetrieval.js';

const profile = { schoolName: 'Test School', shortName: 'TS', address: 'New campus address', phone: '09171234567', email: 'office@example.edu', websiteUrl: 'https://example.edu', facebookUrl: 'https://www.facebook.com/example', registrarLocation: 'Building B', registrarHours: 'Monday 9 AM to 4 PM', tagline: 'Learn together' };
const response = () => ({ code: 200, headers: {}, set(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
test('validates public profile fields and safe contact/link values', () => {
  assert.deepEqual(validateProfile(profile), profile);
  for (const change of [{ schoolName: '' }, { email: 'bad\r\nBcc: injected@example.edu' }, { websiteUrl: 'javascript:alert(1)' }, { facebookUrl: '//example.com' }, { websiteUrl: 'https://user:password@example.edu' }, { address: 'x'.repeat(1001) }]) assert.throws(() => validateProfile({ ...profile, ...change }), error => error.status === 400);
  assert.equal(validateProfile({ schoolName: 'School' }).phone, '');
  assert.equal(validateProfile({ ...profile, apiKey: 'ignored' }).apiKey, undefined);
});
test('saved profile drives guide and chatbot, overriding legacy contact FAQs', async () => {
  const originals = { find: SchoolProfile.findByPk, update: SchoolProfile.update, guide: EnrollmentGuide.findByPk, faqs: FAQ.findAll, query: sequelize.query };
  let stored = { id: 1, content: profile, revision: 1 };
  try {
    SchoolProfile.findByPk = async () => structuredClone(stored);
    SchoolProfile.update = async (values, options) => {
      if (options.where.revision !== stored.revision) return [0];
      stored = { ...stored, ...values }; return [1];
    };
    EnrollmentGuide.findByPk = async () => null;
    FAQ.findAll = async () => [{ id: 99, question: 'What is the school email?', keywords: '["school", "email"]', answer: 'Outdated: old@example.edu' }];
    sequelize.query = async () => [[]];
    let res = response();
    await updateSchoolProfile({ body: { revision: 1, content: { ...profile, email: 'new@example.edu', registrarHours: 'Saturday mornings' } } }, res);
    assert.equal(res.code, 200); assert.equal(res.body.revision, 2);
    res = response(); await getSchoolProfile({}, res);
    assert.equal(res.headers['Cache-Control'], 'no-store'); assert.equal(res.body.content.email, 'new@example.edu');
    const guide = await guideWithProfile({ content: { phone: 'old', email: 'old@example.edu', registrarHours: 'old hours', steps: [] } });
    assert.equal(guide.content.email, 'new@example.edu'); assert.equal(guide.content.registrarHours, 'Saturday mornings');
    const matches = await retrieve('What is the school email?');
    assert.match(matches.bestMatch.faq.answer, /new@example.edu/);
    assert.ok(!matches.topFAQs.some(item => item.faq.answer.includes('old@example.edu')));
    const address = await retrieve('Where is the school located?');
    assert.match(address.bestMatch.faq.answer, /New campus address/);
    res = response(); await updateSchoolProfile({ body: { revision: 1, content: profile } }, res);
    assert.equal(res.code, 409); assert.equal(stored.content.email, 'new@example.edu');
  } finally {
    SchoolProfile.findByPk = originals.find; SchoolProfile.update = originals.update; EnrollmentGuide.findByPk = originals.guide; FAQ.findAll = originals.faqs; sequelize.query = originals.query;
  }
});
test.after(async () => { await sequelize.close(); });
