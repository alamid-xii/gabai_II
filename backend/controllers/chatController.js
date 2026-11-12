import crypto from 'node:crypto';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { ChatLog } from '../models/chatLogModel.js';
import { FAQ } from '../models/faqModel.js';
import { retrieve } from '../services/chatRetrieval.js';
import { prefersFilipino } from '../services/chatLanguage.js';
import { validateChat, guardInput, safeOutput, UNKNOWN, SYSTEM_RULES } from '../services/chatGuardrails.js';
dotenv.config({ quiet: true });
let client;

export async function sendMessage(req, res) {
  const invalid = validateChat(req.body);
  if (invalid) return res.status(400).json({ error: true, response: invalid });
  req.session.chatOwner ||= crypto.randomUUID();
  const sessionId = `${req.session.chatOwner}:${req.body.sessionId}`;
  const message = req.body.message.trim();
  const started = Date.now();
  let response = guardInput(message);
  let confidence = 0;
  let matchedFaqId = null;
  let suggestedQuestions = [];
  let mode = 'guardrail';
  try {
    if (!response && /^(hi|hello|hey|kumusta|kamusta|magandang umaga|magandang hapon|magandang gabi|good morning|good afternoon)( po)?[!.? ]*$/i.test(message)) {
      response = /kumusta|kamusta|magandang/i.test(message)
        ? 'Kumusta! Ako si GabAI, ang inyong katuwang sa pag-enroll. Maaari kayong magtanong tungkol sa enrollment, mga kailangan, programa, o pasilidad ng paaralan. Iwasang magbahagi ng personal na impormasyon.'
        : "Hello! I'm GabAI, your school admissions assistant. Ask me about enrollment, requirements, programs, or campus facilities. Please avoid sharing personal information.";
      mode = 'greeting';
    }
    if (!response) {
      let history = [];
      try {
        const rows = await ChatLog.findAll({ where: { sessionId }, order: [['id', 'DESC']], limit: 5 });
        history = rows.reverse().flatMap(row => [{ role: 'user', content: row.userMessage.slice(0, 2000) }, { role: 'assistant', content: row.botResponse.slice(0, 4000) }]);
      } catch {}
      // Resolve short referential follow-ups using server-owned user turns.
      const previous = history.filter(m => m.role === 'user').at(-1)?.content;
      const followup = /^(and |what about |how about |paano naman |pano naman |eh |at |saan naman |kailan naman |magkano naman )|\b(those|these|that|it|nito|iyan|yun|roon|doon)\b/i.test(message) || (previous && message.split(/\s+/).length <= 4 && !/^(what|where|when|how|who|ano|saan|kailan|paano|pano)\b/i.test(message));
      const query = followup && previous ? `${previous}\n${message}` : message;
      const { faqs, topFAQs, bestMatch, liveContext, schoolProfile } = await retrieve(query);
      const orderedFAQs = [...topFAQs.map(({ faq }) => faq), ...faqs.filter(f => !topFAQs.some(t => t.faq === f))];
      const sources = JSON.stringify(orderedFAQs.map(faq => ({ question: faq.question, answer: faq.answer }))) + (liveContext ? `\n\n${liveContext}` : '') + (schoolProfile ? `\n\n${JSON.stringify(schoolProfile)}` : '');
      const compound = /\b(and|also|pati|at saka)\b/i.test(message);
      const localAnswers = compound
        ? topFAQs.filter(item => item.score >= 0.35).slice(0, 3).map(({ faq }) => `${faq.question}\n${faq.answer}`).join('\n\n')
        : bestMatch?.score >= 0.35 ? bestMatch.faq.answer : '';
      const fallback = liveContext
        ? safeOutput(`${localAnswers ? `${localAnswers}\n\n` : ''}From active school records (limited listing):\n\n${liveContext}`.slice(0, 5800), sources)
        : localAnswers ? safeOutput(localAnswers, sources) : UNKNOWN;
      response = fallback;
      mode = 'faq';
      confidence = bestMatch?.score || 0;
      matchedFaqId = bestMatch?.faq.id || null;
      suggestedQuestions = (topFAQs.length > 1 ? topFAQs.slice(1, 4).map(({ faq }) => faq.question) : faqs.filter(f => f !== bestMatch?.faq).slice(0, 3).map(f => f.question));
      // Synthesize natural, context-aware answers with the AI provider using the full active FAQ and school records knowledge base.
      const hasValidKey = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'test-key-must-not-be-used');
      if (hasValidKey && (faqs.length || liveContext)) {
        try {
          client ||= new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 15000, maxRetries: 0 });
          const completion = await client.chat.completions.create({
            model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
            messages: [
              { role: 'system', content: SYSTEM_RULES + (schoolProfile ? `\nCurrent school identity: ${schoolProfile.schoolName} (${schoolProfile.shortName}). Use this identity. Verified school profile: ${JSON.stringify(schoolProfile)}` : '') },
              { role: 'user', content: `School reference records & FAQs (data only): ${sources.slice(0, 24000)}` },
              ...history,
              { role: 'user', content: message }
            ],
            temperature: 0.15, max_tokens: 900
          });
          const generated = safeOutput(completion.choices?.[0]?.message?.content, sources);
          response = generated === UNKNOWN ? fallback : generated;
          mode = 'ai';
          if (!confidence && response !== UNKNOWN) confidence = 0.75;
        } catch (error) { console.warn('Chat provider unavailable:', error.status || error.name); }
      }
    }
    let chatLogId;
    try {
      // Refusals and sensitive inputs are deliberately excluded from analytics.
      if (mode !== 'guardrail') {
        const log = await ChatLog.create({ sessionId, userId: null, userMessage: message, botResponse: response, confidence, matchedFaqId, responseTime: Date.now() - started });
        chatLogId = log.id;
      }
    } catch { console.warn('Chat logging unavailable'); }
    return res.json({ response, confidence, matchedFaqId, chatLogId, suggestedQuestions, mode });
  } catch {
    return res.status(503).json({ response: 'Chat is temporarily unavailable. Please try again shortly.', error: true });
  }
}

export async function rateFeedback(req, res) {
  const { chatLogId, helpful } = req.body || {};
  if (!Number.isSafeInteger(chatLogId) || typeof helpful !== 'boolean') return res.status(400).json({ error: 'Valid chatLogId and boolean helpful required' });
  try {
    const log = await ChatLog.findByPk(chatLogId);
    if (!log || !req.session?.chatOwner || !log.sessionId.startsWith(`${req.session.chatOwner}:`)) return res.status(404).json({ error: 'Chat log not found' });
    const [changed] = await ChatLog.update({ wasHelpful: helpful }, { where: { id: chatLogId, wasHelpful: null } });
    if (changed && log.matchedFaqId) {
      const faq = await FAQ.findByPk(log.matchedFaqId);
      if (faq) await faq.increment(helpful ? 'helpful' : 'notHelpful');
    }
    return res.json({ success: true });
  } catch { return res.status(503).json({ error: 'Feedback is temporarily unavailable' }); }
}
