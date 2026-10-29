# Admission Settings

Admin → Admission Settings manages SHS strand availability, SSC application availability/minimum Grade 6 average, and document catalogs/checklists for JHS/SHS × new/old/transferee/returnee. Checklist entries can be Required, Optional, or Not requested. New document keys must be unique safe identifiers; saved applications retain their own copies of labels and requirements.

Public GET `/api/admission-settings` provides current rules. Admin-only PUT `/api/admin/admission-settings` validates the document and uses an atomic revision check; stale edits return 409. Changes publish immediately. This version deliberately leaves school years and exam passing scores in their existing academic/Registrar workflows.

New applications save a server-owned `admissionPolicy` and `admissionRevision` snapshot when first created. Existing applications without a snapshot use the former rules, including the old continuing-JHS exception; existing unsnapshotted drafts adopt current rules on their next save. Existing submitted records are not rewritten during initialization. Startup creates the singleton settings document only if missing and adds the two nullable enrollment columns without dropping data.

Submission flow is now:

1. POST `/api/enrollments` or PUT `/api/enrollments/:id` saves a draft; client-supplied status and admission snapshots are not accepted.
2. Upload documents to `/api/enrollments/:id/documents` using configured catalog keys. Only editable applications accept student document changes. Each file must be PDF/JPG/JPEG/PNG, up to 10 MB; maximum 20 files per request.
3. POST `/api/enrollments/:id/submit` checks ownership, personal fields, grade/strand selection, SSC eligibility, and actual persisted document rows. It updates the status transactionally and sends the submission email only after success. Repeating an already completed submission is idempotent.

The browser retains the new draft ID during an upload retry so retrying does not create another application. After a browser reload, the saved draft can be opened from My Enrollments. Returned applications and their resubmission screen use their original snapshot. New settings do not silently replace existing student rules.

SSC-only application upload now requires the declared Grade 6 average plus the report card. Both browser and server enforce current availability and average. The Registrar remains responsible for verifying the actual report-card information. Exam passing scores are separate from eligibility averages.

The chatbot reads the current settings for strands, requirements, and SSC questions. Existing manually written guide text, FAQ prose, and recorded narration are not rewritten automatically.

Verification: `node --test backend/controllers/admissionSettingsController.test.js`, frontend lint/build, and a synthetic browser flow covering admin saves, SSC eligibility, missing documents, upload failure/retry, and create→upload→submit ordering. Browser tests intercepted all API mutations; no real student application or email was created.
