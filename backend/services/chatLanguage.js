// Normalize common Filipino/Taglish school terms before keyword retrieval.
// Keep the original user message for the assistant's response language.
const TERMS = {
  kailangan: 'requirements', kinakailangan: 'requirements', kailangang: 'requirements',
  dokumento: 'documents', papeles: 'documents',
  'mag-enroll': 'enroll', magenroll: 'enroll', 'magpatala': 'enroll', pagpapatala: 'enrollment',
  kurso: 'course', kursong: 'course', programa: 'program', inaalok: 'offered',
  asignatura: 'subject', aralin: 'subject', iskedyul: 'schedule',
  silid: 'room', aklatan: 'library', gusali: 'building', tanggapan: 'office',
  paaralan: 'school', telepono: 'phone', makontak: 'contact',
  nakalimutan: 'forgot', ibalik: 'recover', palitan: 'reset',
  hakbang: 'steps', proseso: 'process', bayarin: 'fees', matrikula: 'tuition',
  iskolarship: 'scholarship', kailan: 'when', magkano: 'cost',
};

export function normalizeSchoolQuery(message) {
  return message.toLowerCase().replace(/mag[ -]enroll/g, 'enroll')
    .replace(/[a-z]+/g, word => TERMS[word] || word);
}

export function prefersFilipino(message) {
  return /\b(ano|paano|pano|saan|nasaan|kailan|magkano|kailangan|kinakailangan|papeles|dokumento|kurso|inaalok|paaralan|nakalimutan|kumusta|kamusta|filipino|tagalog|taglish)\b/i.test(message);
}
