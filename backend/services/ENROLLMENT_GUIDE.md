# Editable enrollment guide

Admin dashboard → Enrollment Guide manages the public document. Only authenticated active administrators can save it. Save publishes immediately; public readers refresh the guide page to see changes. Administrators can manage enrollment dates/audience, office location/hours, contacts, notices, completion copy, and up to 20 ordered steps with instructions, tips, estimated times, icons, and optional download links.

Content is stored in the `enrollment_guide` table as a validated JSON document. Startup creates the table through Sequelize sync and inserts initial content only if document 1 is absent. It never replaces saved admin changes. `enrollmentGuideDefaults.js` is a one-time starting template, not the content served on each request. Initial expired dates and placeholder contact details are blank; fill in verified information in the admin editor.

GET `/api/enrollment-guide` returns the saved document with no-store caching. PUT `/api/admin/enrollment-guide` accepts `{ content, revision }`, validates it, and increments the revision atomically. A stale revision returns 409 so a second admin cannot silently overwrite newer changes. Reload discards unsaved edits after confirmation.

The public guide shows a loading/error/retry state instead of serving stale hardcoded fallback content. Checklist progress is local to the browser and scoped to guide revision; changing the guide starts a fresh checklist. It does not change official enrollment status. Download links allow HTTPS or root-relative paths; blank links download the step as a text checklist. `/uploads/` links use the configured backend URL during local development.

Chatbot retrieval reads the saved guide on each question. The former static guide entries were removed. Enrollment form upload rules are separate application behavior; editing guide text does not change form validation or private student records.

Verify with `node --test backend/controllers/enrollmentGuideController.test.js` and the frontend production build.
