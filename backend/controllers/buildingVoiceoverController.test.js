import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceoverHandlers } from './buildingVoiceoverController.js';
import { publicBuilding, signature, validateScript, synthesize } from '../services/buildingVoiceover.js';
import axios from 'axios';
import { sequelize } from '../models/db.js';

const config = () => ({ apiKey: 'test-only', voiceId: 'test-voice', modelId: 'test-model' });
const res = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const req = body => ({ params: { id: '1' }, user: { id: 5 }, body });
function setup() {
  const building = { id: 1, isActive: true, voiceoverScript: 'Welcome to the library.', voiceoverAudioUrl: null, voiceoverPublished: false };
  let calls = 0;
  const model = {
    findOne: async () => ({ ...building }),
    update: async values => { Object.assign(building, values); return [1]; }
  };
  const handlers = createVoiceoverHandlers({ model, config, synthesize: async () => { calls++; return Buffer.from('test audio'); }, save: async () => '/uploads/voiceovers/test.mp3', remove: async () => {} });
  return { building, handlers, model, calls: () => calls };
}
test('generation creates a draft; repeated generation reuses audio without provider charges', async () => {
  const s = setup();
  let response = res(); await s.handlers.generate(req({}), response);
  assert.equal(response.code, 200); assert.equal(s.calls(), 1);
  assert.equal(s.building.voiceoverPublished, false);
  assert.equal(s.building.voiceoverAudioScript, s.building.voiceoverScript);
  assert.equal(publicBuilding(s.building).voiceoverAudioUrl, null);
  response = res(); await s.handlers.generate(req({}), response);
  assert.equal(response.body.cached, true); assert.equal(s.calls(), 1);
  response = res(); await s.handlers.publish(req({ published: true }), response);
  assert.equal(response.code, 200);
  assert.ok(publicBuilding(s.building).voiceoverAudioUrl);
  s.building.voiceoverScript = 'Changed script';
  assert.equal(publicBuilding(s.building).voiceoverAudioUrl, null);
  response = res(); await s.handlers.publish(req({ published: true }), response);
  assert.equal(response.code, 409);
});
test('empty scripts, repeated paid attempts, and failed generations preserve existing audio', async () => {
  const s = setup(); s.building.voiceoverScript = '';
  let response = res(); await s.handlers.generate(req({}), response);
  assert.equal(response.code, 400); assert.equal(s.calls(), 0);
  s.building.voiceoverScript = 'Welcome';
  response = res(); await s.handlers.generate(req({}), response);
  response = res(); await s.handlers.generate(req({ regenerate: true }), response);
  assert.equal(response.code, 429); assert.equal(s.calls(), 1);
  const failing = createVoiceoverHandlers({ model: s.model, config, synthesize: async () => { throw Object.assign(Error('quota'), { status: 429 }); } });
  response = res(); await failing.generate(req({ regenerate: true }), response);
  assert.equal(response.code, 429); assert.ok(s.building.voiceoverAudioUrl);
});
test('a script edited while generation is running cannot publish stale audio', async () => {
  const s = setup(); let removed = false;
  const handlers = createVoiceoverHandlers({ model: { ...s.model, update: async () => [0] }, config,
    synthesize: async () => Buffer.from('test'), save: async () => '/uploads/voiceovers/test.mp3', remove: async () => { removed = true; } });
  const response = res(); await handlers.generate(req({}), response);
  assert.equal(response.code, 409); assert.equal(removed, true);
});
test('script validation and provider configuration are enforced before outbound requests', async () => {
  assert.equal(validateScript(' '.repeat(5)), false);
  assert.equal(validateScript('a'.repeat(2501)), false);
  assert.equal(validateScript('Welcome'), true);
  assert.notEqual(signature('hello', config()), signature('changed', config()));
  await assert.rejects(() => synthesize('hello', {}), error => error.status === 503);
});
test('provider request returns MP3 bytes and does not leak provider errors', async () => {
  const original = axios.post;
  try {
    axios.post = async (url, body, options) => {
      assert.match(url, /api.elevenlabs.io\/v1\/text-to-speech\/test-voice/);
      assert.equal(body.text, 'Hello'); assert.equal(options.headers['xi-api-key'], 'test-only');
      return { headers: { 'content-type': 'audio/mpeg' }, data: Buffer.from('audio') };
    };
    assert.equal((await synthesize('Hello', config())).toString(), 'audio');
    axios.post = async () => { throw { response: { status: 401, data: 'secret-provider-details' } }; };
    await assert.rejects(() => synthesize('Hello', config()), error => error.status === 502 && !error.message.includes('secret-provider-details'));
  } finally { axios.post = original; }
});
test.after(async () => { await sequelize.close(); });
