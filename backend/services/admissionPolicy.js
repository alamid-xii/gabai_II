import { DataTypes } from 'sequelize';
import { AdmissionSettings } from '../models/admissionSettingsModel.js';

export const TYPES = ['new', 'old', 'transferee', 'returnee'];
export const LEVELS = ['JHS', 'SHS'];
const documents = [
  { key: 'f138', label: 'F-138 (Report Card)' }, { key: 'cert', label: 'Certificate of Good Moral Character' },
  { key: 'f137a', label: 'F-137-A (Permanent Record / TOR)' }, { key: 'f137e', label: 'F-137-E / Transfer Credential' },
  { key: 'birthCert', label: 'Birth Certificate' }
];
export const initialAdmission = {
  strands: ['STEM', 'ABM', 'HUMSS', 'TVL', 'Sports', 'Arts and Design'].map(name => ({ name, active: true })),
  ssc: { enabled: true, minimumAverage: 85, maintainingAverage: 85 }, documents,
  requirements: Object.fromEntries(LEVELS.map(level => [level, Object.fromEntries(TYPES.map(type => [type,
    documents.filter(doc => doc.key !== 'birthCert').map(doc => ({ key: doc.key, required: type === 'transferee' || ['f138', 'cert'].includes(doc.key) }))
  ]))]))
};
const fail = message => Object.assign(new Error(message), { status: 400 });
export function validateAdmission(value) {
  const maintainingAverage = value?.ssc?.maintainingAverage === undefined ? value?.ssc?.minimumAverage : value?.ssc?.maintainingAverage;
  if (!value || !Array.isArray(value.strands) || !value.strands.length || value.strands.length > 25 || !Array.isArray(value.documents) || value.documents.length > 20 || !value.ssc || typeof value.ssc.enabled !== 'boolean' || !Number.isFinite(value.ssc.minimumAverage) || value.ssc.minimumAverage < 0 || value.ssc.minimumAverage > 100 || !Number.isFinite(maintainingAverage) || maintainingAverage < 0 || maintainingAverage > 100) throw fail('Invalid admission settings. SSC average must be between 0 and 100.');
  const names = new Set(), keys = new Set();
  const strands = value.strands.map(item => {
    if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 50 || names.has(item.name.trim().toLowerCase()) || typeof item.active !== 'boolean') throw fail('Strand names must be unique and at most 50 characters.');
    names.add(item.name.trim().toLowerCase()); return { name: item.name.trim(), active: item.active };
  });
  const docs = value.documents.map(item => {
    if (typeof item.key !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(item.key) || ['__proto__', 'constructor', 'prototype', 'sscCard'].includes(item.key) || keys.has(item.key) || typeof item.label !== 'string' || !item.label.trim() || item.label.length > 100) throw fail('Document keys must be unique safe names; labels must be 1–100 characters.');
    keys.add(item.key); return { key: item.key, label: item.label.trim() };
  });
  const requirements = {};
  for (const level of LEVELS) {
    requirements[level] = {};
    for (const type of TYPES) {
      const list = value.requirements?.[level]?.[type]; const seen = new Set();
      if (!Array.isArray(list) || list.length > docs.length) throw fail(`Invalid checklist for ${level} / ${type}.`);
      requirements[level][type] = list.map(item => {
        if (!keys.has(item.key) || seen.has(item.key) || typeof item.required !== 'boolean') throw fail(`Invalid document rule for ${level} / ${type}.`);
        seen.add(item.key); return { key: item.key, required: item.required };
      });
    }
  }
  return { strands, documents: docs, ssc: { enabled: value.ssc.enabled, minimumAverage: value.ssc.minimumAverage, maintainingAverage }, requirements };
}
export function legacyAdmission() {
  const value = structuredClone(initialAdmission);
  for (const level of LEVELS) for (const type of TYPES) if (type !== 'transferee') value.requirements[level][type].forEach(item => { item.required = false; });
  value.minimumDocuments = 1;
  return value;
}
export async function currentAdmission() {
  const settings = await AdmissionSettings.findByPk(1);
  if (!settings) throw Object.assign(new Error('Admission settings are temporarily unavailable.'), { status: 503 });
  return { policy: settings.content, revision: settings.revision };
}
export async function policyFor(enrollment) {
  let policy = enrollment.admissionPolicy;
  if (typeof policy === 'string') policy = JSON.parse(policy);
  if (policy) return { policy, revision: enrollment.admissionRevision || 0 };
  if (enrollment.status !== 'draft') return { policy: legacyAdmission(), revision: 0 };
  return currentAdmission();
}
export function checklist(policy, enrollment) {
  const rules = policy.requirements[enrollment.educationLevel]?.[enrollment.enrollmentType || 'new'] || [];
  return rules.map(rule => ({ ...rule, label: policy.documents.find(doc => doc.key === rule.key)?.label || rule.key }));
}
export function validateSelection(policy, body, { sscPlaceholder = false } = {}) {
  if (!LEVELS.includes(body.educationLevel) || !TYPES.includes(body.enrollmentType || 'new')) throw fail('Select a valid education level and applicant type.');
  const grades = body.educationLevel === 'JHS' ? ['Grade 7','Grade 8','Grade 9','Grade 10'] : ['Grade 11','Grade 12'];
  if (!grades.includes(body.gradeLevel)) throw fail('Choose a valid grade for your education level.');
  if (body.educationLevel === 'SHS' && !policy.strands.some(strand => strand.active && strand.name === body.strand)) throw fail('This SHS strand is not accepting applications under your admission rules.');
  if (body.sscApplied && (body.educationLevel !== 'JHS' || body.gradeLevel !== 'Grade 7')) throw fail('SSC is available only for JHS Grade 7.');
  if (body.sscApplied && !sscPlaceholder) {
    if (!policy.ssc.enabled) throw fail('SSC applications are not available for this selection.');
    const average = Number(body.grade6Average);
    if (body.grade6Average === '' || body.grade6Average == null || !Number.isFinite(average) || average < policy.ssc.minimumAverage || average > 100) throw fail(`SSC applicants need a Grade 6 average of at least ${policy.ssc.minimumAverage}.`);
  }
}
export function validateDocuments(policy, enrollment, uploaded) {
  // Continuing students have past records on file; direct submission without new documents is permitted
  if (['old', 'returnee'].includes(enrollment.enrollmentType)) {
    return;
  }
  const keys = new Set(uploaded.map(doc => doc.documentType));
  const missing = checklist(policy, enrollment).filter(doc => doc.required && !keys.has(doc.key));
  if (missing.length) throw fail(`Upload required documents: ${missing.map(doc => doc.label).join(', ')}.`);
  if (policy.minimumDocuments && !(enrollment.sscApplied && enrollment.sscResult) && !uploaded.some(doc => doc.documentType !== 'sscCard')) throw fail('Upload at least one enrollment document.');
}
export async function initializeAdmission(sequelize) {
  await AdmissionSettings.findOrCreate({ where: { id: 1 }, defaults: { content: validateAdmission(initialAdmission), revision: 1 } });
  const qi = sequelize.getQueryInterface(); const columns = await qi.describeTable('enrollment_records');
  if (!columns.admissionPolicy) await qi.addColumn('enrollment_records', 'admissionPolicy', { type: DataTypes.JSON, allowNull: true });
  if (!columns.admissionRevision) await qi.addColumn('enrollment_records', 'admissionRevision', { type: DataTypes.INTEGER, allowNull: true });
}
