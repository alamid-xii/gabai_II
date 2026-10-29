import { AdmissionSettings } from "../models/admissionSettingsModel.js";
import { checklist } from "./admissionPolicy.js";
import { SchoolProfile } from "../models/schoolProfileModel.js";
import { EnrollmentGuide } from "../models/enrollmentGuideModel.js";
import { FAQ } from '../models/faqModel.js';
import { sequelize } from '../models/db.js';
import { PORTAL_FAQS } from './chatKnowledge.js';

const STOP = new Set('a an the is are was were be been i you we they it my your our what how when where who which why do does did can could would should will to of in on at for with about by from and or but if so this that please tell me give show need want know po ko ba ang ng na sa ay mo nang ano paano mga meron mayroon emc school eastern mindoro college'.split(' '));
const ALIASES = { enrolment: 'enroll', enrollment: 'enroll', enrolling: 'enroll', admission: 'enroll', admissions: 'enroll', requirements: 'requirement', documents: 'document', strands: 'strand', subjects: 'subject', scholarships: 'scholarship', buildings: 'building', fees: 'fee', schedules: 'schedule', kailangan: 'requirement', lokasyon: 'location', saan: 'location', bayad: 'payment' };
function tokens(text) {
  return [...new Set(String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP.has(w) && !['mag', 'available', 'currently', 'naman'].includes(w)).map(w => ALIASES[w] || w))];
}
function keywordList(value) {
  try { const parsed = Array.isArray(value) ? value : JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : []; } catch { return []; }
}
export function scoreFAQ(message, faq) {
  const input = tokens(message);
  if (faq.topic === 'profile' && !input.length && /emc|eastern mindoro|school|paaralan/i.test(message)) return 1;
  if (!input.length) return 0;
  if (faq.topic === 'programs' && !/program|course|offered|offering|education level/i.test(message)) return 0;
  if (faq.topic === 'documents' && (!input.some(w => ['requirement', 'document', 'credential'].includes(w)) || /scholarship|tuition|payment|job|visa|college/i.test(message))) return 0;
  const question = tokens(faq.question);
  const keys = tokens(keywordList(faq.keywords).join(' '));
  const answer = tokens(faq.answer).slice(0, 100);
  const hits = list => input.filter(w => list.includes(w)).length / input.length;
  const coverage = hits([...question, ...keys]);
  // Full-word matching prevents 'class' from accidentally matching 'classmate'.
  return Math.min(1, Math.round((coverage * 0.7 + hits(question) * 0.2 + hits(answer) * 0.1) * 1000) / 1000);
}
const list = value => {
  if (Array.isArray(value)) return value.join(', ');
  try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed.join(', ') : String(value || ''); } catch { return String(value || ''); }
};

// Explicit public column allowlist: no users, grades, applications, documents,
// personal exam results, credentials, or arbitrary filesystem reads.
const SOURCES = [
  { name: 'Current programs', pattern: /program|course|strand|stem|abm|humss|tvl|offering|offered/i,
    sql: 'SELECT code, name, majors FROM programs WHERE isActive = 1 ORDER BY code LIMIT 60',
    format: r => `${r.code}: ${r.name}${r.majors ? `; majors: ${list(r.majors)}` : ''}` },
  { name: 'Subjects and curriculum', pattern: /subject|curriculum|units|grade \d|asignatura/i,
    sql: 'SELECT code, description, units, programCode, strand, gradeLevel, semester FROM subjects WHERE isActive = 1 ORDER BY programCode, gradeLevel, semester, code LIMIT 100',
    format: r => `${r.code}: ${r.description}; ${r.programCode}${r.strand ? ` / ${r.strand}` : ''}; Grade ${r.gradeLevel}; ${r.units} units; semester ${r.semester}` },
  { name: 'Class sections and schedules', pattern: /section|class|room|schedule|iskedyul/i,
    sql: 'SELECT code, course, yearLevel, strand, semester, schoolYear, schedule, room FROM sections WHERE isActive = 1 ORDER BY course, yearLevel LIMIT 60',
    format: r => `${r.code}: ${r.course}${r.strand ? ` / ${r.strand}` : ''}; Grade ${r.yearLevel}; SY ${r.schoolYear}; semester ${r.semester}; schedule: ${r.schedule || 'not recorded'}; room: ${r.room || 'not recorded'}` },
  { name: 'Campus buildings and offices', pattern: /building|office|location|where|saan|campus|registrar|library|gym|canteen|clinic|hours|oras|facilit/i,
    sql: 'SELECT name, shortName, category, description, offices, hours FROM Buildings WHERE isActive = 1 LIMIT 60',
    format: r => `${r.name}${r.shortName ? ` (${r.shortName})` : ''}: ${r.category}; ${r.description || ''}; offices: ${list(r.offices) || 'not recorded'}; hours: ${r.hours || 'not recorded'}` },
  { name: 'Active school year', pattern: /school year|academic year|taon|current year/i,
    sql: 'SELECT year FROM school_years WHERE isActive = 1 LIMIT 1',
    format: r => r.year }
];

export async function retrieve(message) {
  let stored = [];
  try { stored = await FAQ.findAll({ where: { isActive: true } }); }
  catch { console.warn('Chat FAQ lookup unavailable; using portal references'); }
  let guideFAQs = [];
  try {
    const document = await EnrollmentGuide.findByPk(1);
    const content = document?.content;
    if (content) {
      guideFAQs = content.steps.map(step => ({ id: null, source: 'portal', question: step.title,
        keywords: JSON.stringify([step.title, step.requirements.join(' '), 'enrollment guide']),
        answer: `According to the current published enrollment guide: ${step.description}\n${step.requirements.join('\n')}\n${step.tips}${step.estimatedTime ? `\nEstimated time: ${step.estimatedTime}` : ''}` }));
      guideFAQs.push({ id: null, source: 'portal', question: 'What are the enrollment guide steps?', keywords: '["guide", "steps", "process"]', answer: content.steps.map((step, index) => `${index + 1}. ${step.title}: ${step.description}`).join('\n') });
      guideFAQs.push({ id: null, source: 'portal', question: 'When is the enrollment period and deadline?', keywords: '["deadline", "period", "dates", "schedule"]', answer: [content.enrollmentPeriod || 'The enrollment schedule has not been announced in the guide.', content.enrollmentAudience, content.importantNotice, content.importantDetail].filter(Boolean).join('\n') });

    }
  } catch { console.warn('Chat enrollment guide unavailable'); }
  let profile = null;
  try { profile = (await SchoolProfile.findByPk(1))?.content || null; } catch { console.warn('Chat school profile unavailable'); }
  let admissionFAQs = [];
  try {
    const policy = (await AdmissionSettings.findByPk(1))?.content;
    if (policy) {
      const level = /\bshs|senior high/i.test(message) ? 'SHS' : 'JHS';
      const type = /transferee|transfer/i.test(message) ? 'transferee' : /returnee/i.test(message) ? 'returnee' : /continuing|old student/i.test(message) ? 'old' : 'new';
      const docs = checklist(policy, { educationLevel: level, enrollmentType: type });
      const strands = policy.strands.filter(item => item.active).map(item => item.name).join(', ');
      admissionFAQs = [
        { question: 'What are the requirements for enrollment?', topic: 'documents', keywords: '["requirements", "documents", "kailangan", "credentials", "enrollment", "transferee", "returnee"]', answer: `For ${level} / ${type} applicants, the current admission checklist is:\n${docs.length ? docs.map(doc => `${doc.label}: ${doc.required ? 'required' : 'optional'}`).join('\n') : 'No enrollment document uploads are requested for this applicant type.'}\nThese rules apply to new applications; existing applications follow their saved checklist. Tell me your education level and applicant type for the appropriate requirements.` },
        { question: 'What SHS strands can I select?', keywords: '["strand", "strands", "shs", "stem", "abm", "humss", "tvl"]', answer: strands ? `Strands currently accepting new applications in the portal: ${strands}.` : 'No SHS strands are currently accepting new applications in the portal.' },
        { question: 'How do I apply for the Special Science Class SSC?', keywords: '["ssc", "special science", "exam", "average", "eligibility"]', answer: policy.ssc.enabled ? `SSC applications are open for JHS Grade 7 applicants with a Grade 6 general average of at least ${policy.ssc.minimumAverage}. Enter your average and upload your Grade 6 report card through the SSC application screen. The Registrar verifies the card and schedules the examination. The minimum average is different from the exam passing score.` : 'New SSC applications are currently disabled. Regular JHS enrollment is still available.' },
        { question: 'What programs are offered in the enrollment portal?', topic: 'programs', keywords: '["program", "programs", "course", "courses", "offered"]', answer: `The portal supports JHS (Grades 7-10) and SHS (Grades 11-12). Current SHS strand choices: ${strands || 'none accepting applications'}.` }
      ].map(faq => ({ ...faq, id: null, source: 'portal' }));
    }
  } catch { console.warn('Chat admission settings unavailable'); }
  const localFAQs = PORTAL_FAQS.filter(faq => faq.topic !== 'documents' && faq.topic !== 'programs' && !['What SHS strands can I select?', 'How do I apply for the Special Science Class SSC?'].includes(faq.question)).filter(faq => faq.topic !== 'profile' && !['Where is Eastern Mindoro College located?', 'How can I contact EMC?'].includes(faq.question))
    .map(faq => ({ ...faq, answer: profile ? faq.answer.replaceAll('Eastern Mindoro College, Inc.', profile.schoolName).replaceAll('Eastern Mindoro College', profile.schoolName).replace(/\bEMC\b/g, profile.shortName || profile.schoolName) : faq.answer }));
  const profileFAQs = profile ? [
    { question: `About ${profile.schoolName}`, topic: 'profile', keywords: JSON.stringify(['school profile', 'institution', 'school name', profile.schoolName, profile.shortName]), answer: [profile.schoolName, profile.tagline, profile.address].filter(Boolean).join('\n') },
    { question: 'Where is the school located?', keywords: '["location", "address", "located", "saan", "lokasyon"]', answer: profile.address || 'The school address has not been provided yet.' },
    { question: 'How can I contact the school?', keywords: '["contact", "email", "phone", "telephone", "makontak", "website", "facebook"]', answer: [profile.phone ? `Phone: ${profile.phone}` : '', profile.email ? `Email: ${profile.email}` : '', profile.websiteUrl, profile.facebookUrl, profile.registrarLocation ? `Registrar: ${profile.registrarLocation}` : ''].filter(Boolean).join('\n') || 'School contact details have not been provided yet.' },
    { question: 'Where is the Registrar office and what are its hours?', keywords: '["registrar", "office", "hours", "oras"]', answer: [profile.registrarLocation, profile.registrarHours].filter(Boolean).join('\n') || 'Registrar details have not been provided yet.' }
  ].map(faq => ({ ...faq, id: null, source: 'portal', profile: true })) : [];
  const profileIntent = /\b(contact|email|telephone|phone|website|facebook|school name|school address)\b|\bwhere\b.*\b(emc|school|college)\b|\bregistrar\b.*\b(hours|office|location)\b/i.test(message);
  // Official profile fields win over legacy FAQs for identity/contact questions.
  const faqs = profileIntent && profileFAQs.length ? profileFAQs : [...profileFAQs, ...admissionFAQs, ...stored, ...guideFAQs, ...localFAQs];
  const topFAQs = faqs.map(faq => ({ faq, score: scoreFAQ(message, faq) }))
    .filter(item => item.score >= 0.35)
    .sort((a, b) => b.score - a.score || (a.faq.source === 'portal') - (b.faq.source === 'portal'))
    .slice(0, 6);
  const liveRecords = [];
  for (const source of SOURCES.filter(s => !profileIntent && s.pattern.test(message))) {
    try {
      const [rows] = await sequelize.query(source.sql);
      if (rows.length) liveRecords.push({ name: source.name, text: rows.map(source.format).join('\n') });
    } catch { console.warn(`Chat public source unavailable: ${source.name}`); }
  }
  const liveContext = liveRecords.map(r => `${r.name} (active records; limited listing):\n${r.text}`).join('\n\n');
  return { faqs, topFAQs, bestMatch: topFAQs[0], liveContext, liveRecords, schoolProfile: profile };
}
