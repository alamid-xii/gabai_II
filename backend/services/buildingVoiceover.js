import crypto from 'node:crypto';
import axios from 'axios';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataTypes } from 'sequelize';

export const audioDirectory = fileURLToPath(new URL('../public/uploads/voiceovers/', import.meta.url));
export const MAX_SCRIPT_LENGTH = 2500;
export function validateScript(script) {
  return typeof script === 'string' && script.trim().length > 0 && script.length <= MAX_SCRIPT_LENGTH;
}
export function voiceConfig() {
  return { apiKey: process.env.ELEVENLABS_API_KEY, voiceId: process.env.ELEVENLABS_VOICE_ID, modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2' };
}
export function signature(script, config = voiceConfig()) {
  return crypto.createHash('sha256').update(JSON.stringify([script.trim(), config.voiceId, config.modelId])).digest('hex');
}
export function isPublished(building) {
  return Boolean(building.isActive && building.voiceoverPublished && building.voiceoverAudioUrl && building.voiceoverScript?.trim() && building.voiceoverScript.trim() === building.voiceoverAudioScript);
}
export function publicBuilding(building) {
  const value = building.toJSON ? building.toJSON() : { ...building };
  const published = isPublished(value);
  delete value.voiceoverSignature;
  value.voiceoverScript = published ? value.voiceoverAudioScript : null;
  value.voiceoverAudioScript = published ? value.voiceoverAudioScript : null;
  value.voiceoverAudioUrl = published ? value.voiceoverAudioUrl : null;
  value.voiceoverPublished = published;
  return value;
}
export async function synthesize(script, config = voiceConfig()) {
  if (!validateScript(script)) throw Object.assign(new Error('Enter a voiceover script of 1–2,500 characters.'), { status: 400 });
  if (!config.apiKey || !config.voiceId) throw Object.assign(new Error('ElevenLabs is not configured. Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in the backend environment.'), { status: 503 });
  try {
    const response = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(config.voiceId)}?output_format=mp3_44100_128`, {
      text: script.trim(), model_id: config.modelId,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    }, { headers: { 'xi-api-key': config.apiKey, Accept: 'audio/mpeg', 'Content-Type': 'application/json' }, responseType: 'arraybuffer', timeout: 60000, maxContentLength: 12 * 1024 * 1024 });
    if (!response.headers['content-type']?.includes('audio/') || !response.data?.byteLength) throw new Error('Invalid audio response');
    return Buffer.from(response.data);
  } catch (error) {
    const status = error.response?.status;
    const message = status === 401 || status === 403 ? 'ElevenLabs rejected the API key, voice, or permissions.' : status === 429 || status === 402 ? 'ElevenLabs quota or rate limit reached. Check your account before trying again.' : 'Voice generation failed. Existing audio was preserved. Check ElevenLabs usage before retrying.';
    throw Object.assign(new Error(message), { status: status === 429 ? 429 : 502 });
  }
}
export async function saveAudio(buffer) {
  await fs.mkdir(audioDirectory, { recursive: true });
  const filename = `${crypto.randomUUID()}.mp3`;
  await fs.writeFile(path.join(audioDirectory, filename), buffer, { flag: 'wx' });
  return `/uploads/voiceovers/${filename}`;
}
export async function removeAudio(url) {
  if (!/^\/uploads\/voiceovers\/[a-f0-9-]+\.mp3$/.test(url || '')) return;
  await fs.unlink(path.join(audioDirectory, path.basename(url))).catch(() => {});
}
// Additive and repeatable; never drops tables or rewrites existing columns.
export async function ensureVoiceoverColumns(sequelize) {
  const qi = sequelize.getQueryInterface();
  const columns = await qi.describeTable('Buildings');
  const fields = {
    voiceoverScript: { type: DataTypes.TEXT, allowNull: true },
    voiceoverAudioUrl: { type: DataTypes.STRING, allowNull: true },
    voiceoverAudioScript: { type: DataTypes.TEXT, allowNull: true },
    voiceoverSignature: { type: DataTypes.STRING(64), allowNull: true },
    voiceoverPublished: { type: DataTypes.BOOLEAN, defaultValue: false }
  };
  for (const [name, definition] of Object.entries(fields)) if (!columns[name]) await qi.addColumn('Buildings', name, definition);
}
