# School Profile & Contacts

Admin → School Profile & Contacts edits the shared public school name, abbreviation, footer description, address, phone, email, website/Facebook URLs, and Registrar location/hours. Save publishes immediately. Changes update the current app's profile cache; other open pages refresh on browser focus or reload.

GET `/api/school-profile` exposes public fields with no-store caching. PUT `/api/admin/school-profile` requires an active admin and `{ content, revision }`. The server validates field lengths, email, HTTPS links, and rejects stale revisions with 409. No API keys or account credentials belong in the school profile.

The `school_profile` table stores one JSON document. Startup creates missing tables and initializes only an absent profile. Existing enrollment-guide contacts migrate into the first profile, falling back to the previous Footer email and address when absent. The former placeholder telephone number is left blank. Initial values should be reviewed by the school. Saved profiles survive subsequent restarts.

The Footer, public navigation, login/recovery branding, and Enrollment Guide use the shared profile. Registrar/contact fields are no longer editable separately in the guide. The guide API overlays current profile fields for compatibility. Editing this profile does not change outbound SMTP settings, enrollment form rules, building-specific operating hours, or text already written into an admin's narration/FAQ script.

Chat retrieval reads this document per request. Identity/contact questions prioritize official profile records over old FAQs and building listings. No stale static address/contact fallback is served if the profile is unavailable.

Verification: `node --test backend/controllers/schoolProfileController.test.js backend/controllers/enrollmentGuideController.test.js backend/controllers/chatController.test.js` and the frontend build.
