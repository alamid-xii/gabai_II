import { SchoolProfile } from "../models/schoolProfileModel.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGuide } from '../services/enrollmentGuide.js';
import { initialGuide } from '../services/enrollmentGuideDefaults.js';
import { EnrollmentGuide } from '../models/enrollmentGuideModel.js';
import { FAQ } from '../models/faqModel.js';
import { sequelize } from '../models/db.js';
import { getEnrollmentGuide, updateEnrollmentGuide } from './enrollmentGuideController.js';
import { retrieve } from '../services/chatRetrieval.js';
const response = () => ({ code: 200, set() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
test('validates guide structure and prevents unsafe download links and duplicate IDs', () => {
  const valid = validateGuide(initialGuide);
  assert.equal(valid.steps.length, 6);
  for (const url of ['javascript:alert(1)', '//evil.example', '/\\evil.example', 'data:text/html,test']) {
    assert.throws(() => validateGuide({ ...valid, steps: [{ ...valid.steps[0], downloadUrl: url }] }), error => error.status === 400);
  }
  assert.throws(() => validateGuide({ ...valid, steps: [] }));
  assert.throws(() => validateGuide({ ...valid, steps: [valid.steps[0], valid.steps[0]] }));
});
test('guide updates persist, reject stale revisions, and immediately feed chatbot retrieval', async () => {
  const original = { find: EnrollmentGuide.findByPk, update: EnrollmentGuide.update, faqs: FAQ.findAll, query: sequelize.query, profile: SchoolProfile.findByPk };
  let stored = { id: 1, content: validateGuide(initialGuide), revision: 1 };
  try {
    SchoolProfile.findByPk = async () => ({ content: { schoolName: 'School', email: 'school@example.edu', registrarLocation: 'Admin Office' }, revision: 1 });
    EnrollmentGuide.findByPk = async () => structuredClone(stored);
    EnrollmentGuide.update = async (values, options) => {
      if (stored.revision !== options.where.revision) return [0];
      stored = { ...stored, ...values }; return [1];
    };
    FAQ.findAll = async () => [];
    sequelize.query = async () => [[]];
    const content = { ...stored.content, enrollmentPeriod: 'November 1–15, 2026', email: 'guide@example.edu', steps: [{ id: 99, icon: 'FileText', title: 'Updated tuition fees', description: 'Request the new assessment at the Finance Office.', requirements: ['Bring your assessment slip'], tips: '', estimatedTime: '15 minutes', downloadLabel: 'Download', downloadUrl: '' }] };
    let res = response(); await updateEnrollmentGuide({ body: { content, revision: 1 } }, res);
    assert.equal(res.code, 200); assert.equal(stored.revision, 2);
    res = response(); await getEnrollmentGuide({}, res); assert.equal(res.body.content.steps[0].id, 99);
    res = response(); await updateEnrollmentGuide({ body: { content, revision: 1 } }, res); assert.equal(res.code, 409);
    const retrieved = await retrieve('Updated tuition fees');
    assert.match(retrieved.bestMatch.faq.answer, /Finance Office/);
    assert.ok(!retrieved.topFAQs.some(item => item.faq.answer.includes('UniFAST')));
    const contacts = await retrieve('What is the school email?');
    assert.match(contacts.bestMatch.faq.answer, /school@example.edu/);
  } finally {
    SchoolProfile.findByPk = original.profile;
    EnrollmentGuide.findByPk = original.find; EnrollmentGuide.update = original.update; FAQ.findAll = original.faqs; sequelize.query = original.query;
  }
});
test.after(async () => { await sequelize.close(); });
