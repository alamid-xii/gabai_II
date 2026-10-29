import { EnrollmentGuide } from '../models/enrollmentGuideModel.js';
import { initialGuide } from './enrollmentGuideDefaults.js';

const ICONS = new Set(['FileText', 'ClipboardList', 'CreditCard', 'UserCheck', 'BookOpen', 'Camera']);
export const GUIDE_FIELDS = ['enrollmentPeriod', 'enrollmentAudience', 'importantNotice', 'importantDetail', 'completionTitle', 'completionMessage', 'completionDetail'];
function invalid() { return Object.assign(new Error('Invalid guide. Check required titles, unique step IDs, text lengths, and download links.'), { status: 400 }); }
function text(value, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw invalid();
  return value.trim();
}
export function validateGuide(input) {
  if (!input || !Array.isArray(input.steps) || input.steps.length < 1 || input.steps.length > 20) throw invalid();
  const value = {};
  for (const field of GUIDE_FIELDS) value[field] = text(input[field] ?? '', 1000);
  if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) throw invalid();
  const ids = new Set();
  value.steps = input.steps.map(step => {
    if (!step || !Number.isSafeInteger(step.id) || step.id < 1 || ids.has(step.id) || !ICONS.has(step.icon) || !Array.isArray(step.requirements) || step.requirements.length > 30) throw invalid();
    ids.add(step.id);
    const url = text(step.downloadUrl ?? '', 1000);
    if (url && (!/^https:\/\/[^\s]+$/i.test(url) && !/^\/(?!\/)[^\s\\]*$/.test(url))) throw invalid();
    return { id: step.id, icon: step.icon, title: text(step.title, 160, true), description: text(step.description, 3000, true), requirements: step.requirements.map(item => text(item, 500, true)), tips: text(step.tips ?? '', 2000), estimatedTime: text(step.estimatedTime ?? '', 100), downloadLabel: text(step.downloadLabel || 'Download checklist', 100), downloadUrl: url };
  });
  return value;
}
export async function initializeEnrollmentGuide() {
  await EnrollmentGuide.findOrCreate({ where: { id: 1 }, defaults: { content: validateGuide(initialGuide), revision: 1 } });
}
