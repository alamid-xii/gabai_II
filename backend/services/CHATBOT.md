# GabAI chatbot

The existing `/api/chat/message` and `/api/chat/feedback` routes support guests through the Express session cookie. Restart the backend after changes. The frontend sends cookies with requests.

Set `GROQ_API_KEY` in `backend/.env`. `GROQ_MODEL` defaults to `openai/gpt-oss-120b`. Never put provider credentials in frontend environment variables. Without a provider key or during an outage, matched local references, active FAQs, and formatted public records remain available. Unknown details still refer to official school channels.

Maintain answers in the admin FAQ interface. Reviewed hardcoded school content lives in `chatKnowledge.js`, with source-file references; update it when the public pages change. It covers the school profile, contact/address, JHS/SHS, strand options, SSC, application process, requirements, tracking, uploads, tour, recovery help, and the published enrollment guide. Active programs, subjects, sections, buildings, and school year also supply context through an explicit public column allowlist. No arbitrary local files, uploads, user accounts, student applications, grades, or individual results are indexed. Reviewed records matter: generated responses are constrained by a prompt and output checks, but cannot be guaranteed accurate or immune to every prompt injection. School records and up to three previous chat turns are sent to Groq when AI generation is used. The assistant has no tools to change student data.

Protections include 2,000-character message validation, 20 requests per IP per minute shared across chat and feedback, selected injection/credential/harm/private-record refusals, server-stored history, response contact checks, cookie-bound feedback ownership, and duplicate feedback protection. Refused messages are excluded from chat logs. Other conversations are stored in ChatLogs; define retention appropriate to the school before production use.

The limiter is per process. Multiple backend instances need a shared gateway limiter. Production also needs the application's session secret, secure cookies, HTTPS, shared session storage, and proxy configuration reviewed; the existing application uses Express's default in-memory session store. Session ownership changes after a server restart, so feedback on earlier messages will no longer be available.

Validation:

```powershell
node --test backend/controllers/chatController.test.js backend/services/chatGuardrails.test.js
cd frontend
npm run build
```

Automated handler tests mock the database/provider. A minimal live Groq request passed during setup; the full database-to-provider check requires approval to transmit local school reference data.

Local knowledge distinguishes portal options and published guide statements from confirmed current offerings. The enrollment guide and online form have differing document lists, which are described as separate sources. Placeholder phone numbers are excluded. Password recovery guidance is permitted; sharing passwords or OTPs is blocked. Short referential follow-ups use server-owned conversation history.

Expanded regression coverage exercises public local topics with an empty FAQ database, every live source category with mocked rows, source outages, private-record refusal, unrelated calculation refusal, prompt overrides, and ownership checks. Live read-only retrieval checks can validate local database sources without sending their records to Groq.
