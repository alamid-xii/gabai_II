// Normalize common Filipino/Taglish school terms before keyword retrieval.
// Keep the original user message for the assistant's response language.
const PHRASE_TERMS = [
  [/\bmag[ -]?enroll\b/gi, 'enroll'],
  [/\bmag[ -]?patala\b/gi, 'enroll'],
  [/\bmag[ -]?aapply\b|\bmag[ -]?apply\b/gi, 'apply enroll'],
  [/\bmag[ -]?tatransfer\b|\bmag[ -]?transfer\b|\blilipat\b|\blumipat\b/gi, 'transferee transfer'],
  [/\bbalik[ -]?aral\b|\bmagbabalik[ -]?aral\b|\bhuminto\b|\btumigil\b/gi, 'returnee'],
  [/\bold\s+student\b|\bcontinuing\s+student\b|\bdating\s+estudyante\b/gi, 'continuing old'],
  [/\bnew\s+student\b|\bbagong\s+estudyante\b/gi, 'new applicant'],
  [/\breport\s+card\b|\bform\s*138\b|\bsf\s*9\b/gi, 'f138 requirements documents'],
  [/\bform\s*137\b|\bsf\s*10\b|\bpermanent\s+record\b/gi, 'f137 requirements documents'],
  [/\bbirth\s+cert(?:ificate)?\b|\bpsa\b|\bnso\b/gi, 'birth certificate requirements documents'],
  [/\bgood\s+moral\b|\bgmrc\b|\bcgmc\b/gi, 'good moral requirements documents'],
  [/\bspecial\s+science\b|\bscience\s+class\b/gi, 'ssc'],
  [/\bjunior\s+high(?:\s+school)?\b/gi, 'jhs'],
  [/\bsenior\s+high(?:\s+school)?\b/gi, 'shs'],
  [/\bvirtual\s+tour\b|\bcampus\s+tour\b|\b360\s+tour\b/gi, 'tour 360 campus'],
  [/\bforgot\s+password\b|\breset\s+password\b|\bchange\s+password\b/gi, 'forgot reset password'],
];

const TERMS = {
  kailangan: 'requirements', kinakailangan: 'requirements', kailangang: 'requirements', rekisito: 'requirements',
  ipapasa: 'requirements', isusubmit: 'requirements', ipasa: 'requirements', dalhin: 'requirements', dadalhin: 'requirements',
  dokumento: 'documents', papeles: 'documents',
  magenroll: 'enroll', magpatala: 'enroll', pagpapatala: 'enrollment', mageenroll: 'enroll', eenroll: 'enroll',
  kurso: 'course', kursong: 'course', programa: 'program', inaalok: 'offered', meron: 'offered',
  asignatura: 'subject', aralin: 'subject', iskedyul: 'schedule', sched: 'schedule',
  seksyon: 'section', klase: 'class',
  silid: 'room', aklatan: 'library', gusali: 'building', tanggapan: 'office', opisina: 'office',
  paaralan: 'school', eskwelahan: 'school',
  telepono: 'phone', makontak: 'contact', kontak: 'contact', tawagan: 'phone', matawagan: 'phone', numero: 'phone',
  nakalimutan: 'forgot', nalimutan: 'forgot', ibalik: 'recover', palitan: 'reset',
  hakbang: 'steps', proseso: 'process', paraan: 'process',
  bayarin: 'fees', bayad: 'payment', matrikula: 'tuition', gastusin: 'fees',
  iskolarship: 'scholarship',
  kailan: 'when', kelan: 'when',
  magkano: 'cost', hm: 'cost', presyo: 'cost',
  paano: 'how', pano: 'how',
  saan: 'where', san: 'where', nasaan: 'where', lokasyon: 'location', matatagpuan: 'location', makikita: 'location',
  baitang: 'grade', antas: 'grade',
  pagsusulit: 'exam', eksaminasyon: 'exam',
  libot: 'tour', ikot: 'tour', mapa: 'map',
};

export function normalizeSchoolQuery(message) {
  let normalized = String(message || '').toLowerCase();
  for (const [pattern, replacement] of PHRASE_TERMS) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized.replace(/[a-z0-9]+/g, word => TERMS[word] || word);
}

export function prefersFilipino(message) {
  return /\b(ano|anong|paano|pano|saan|san|nasaan|kailan|kelan|magkano|kailangan|kinakailangan|papeles|dokumento|ipapasa|isusubmit|kurso|inaalok|paaralan|eskwelahan|nakalimutan|nalimutan|kumusta|kamusta|po|opo|ba|na|ng|sa|mga|yung|iyan|ito|dito|doon|kapag|pag|kung|para|pwede|puwede|meron|wala|lilipat|balik|filipino|tagalog|taglish)\b/i.test(message);
}
