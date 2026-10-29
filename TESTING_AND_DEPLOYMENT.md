# Enrollment audit and handoff

Automated verification completed locally against an isolated MySQL database with the real HTTP routes and a mobile Chrome browser. The test copied table structure only, created synthetic users and applications, intercepted SMTP, and removed only its generated scratch database. Real student data and existing admissions settings were not changed.

Results: 66 integration/browser checks, 24 controller/service tests, and the production frontend build passed. Earlier responsive checks covered 320, 375, 390, 768, and 1280 pixel widths. The integration browser submitted an actual synthetic application through the UI, HTTP API, file uploads, and MySQL.

## Fixes found during the audit

- MySQL approval failed when generating a student number with `CAST(... AS INTEGER)`. Replaced duplicate generators with a MySQL sequence protected by a transaction; concurrent requests generate unique numbers.
- Drafts could be approved without finishing their requirements. Admin/Registrar approval now checks submission state and saved document rules.
- Repeated approval could increment section occupancy or replace subject records. Approval and section assignment now avoid duplicate assignment; existing subject grades are preserved.
- Section fallback could select the wrong year, grade, or strand. Assignment now requires the exact cohort; an approved application without a matching section remains awaiting assignment.
- Bulk approval contained SQLite date syntax and could reprocess unrelated IDs. It now processes eligible verified applications through the same approval validation, defaults to the active year, and reports individual failures.
- Numeric Grade 6 averages failed update validation. Valid numeric values are normalized before the existing range checks.
- Raw student document URLs were public. They now require an active owner/admin/Registrar, including encoded-path checks. Login and session restoration include cookies so image/PDF previews work.
- Google login callback referenced an undefined frontend API variable. It now uses the shared API configuration.
- Static/document storage paths now resolve independently of the shell's working directory. Unknown CORS origins are no longer reflected as allowed. Session secret and HTTPS proxy settings can be configured from the environment.

## What to check manually before the professor demo

1. Restart the backend, reload the frontend, and log in again if a document preview asks you to sign in.
2. Review School Profile, Enrollment Guide, Admission Settings, and the active school year. Confirm current real requirements with the school.
3. Create one regular JHS, one SHS, and one SSC application using test accounts. Check missing/invalid uploads, return/resubmit, verify, approve, section, subjects, and timetable.
4. Ensure matching sections exist for the active school year, grade, and strand/class, with capacity. Missing sections intentionally leave the application approved but unassigned.
5. Download the enrollment PDF and schedule PDF. View documents both as owner and Registrar.
6. Test on an actual phone with its keyboard open, not only the desktop device emulator.
7. Check the real mailbox for registration/OTP, password reset, and enrollment notifications. Automated tests intercepted delivery, so successful SMTP delivery was not verified.
8. Check the real Google sign-in callback, chatbot, saved narration playback, and panorama labels on the target domain. External services were not exercised by the enrollment audit.

## Repeatable checks

From `backend`:

```powershell
npm test
npm run test:flow
```

`test:flow` needs local MySQL credentials that can create a scratch database. It creates only a generated `gabai_flow_test_<timestamp>` database, reads the source schema without copying rows, and cleans up that generated database. It does not send real email. Its generated test files live in the OS temp folder. Optional `--browser` uses the temporary Playwright installation used during this session and a locally running frontend; it is not a production dependency.

From `frontend`:

```powershell
npm run build
```

## Registrar dashboard checks

Restart the backend after pulling the dashboard changes, then log in as a registrar and open `/registrar`. Dashboard totals come from the selected school year, school level/class, and enrollment type. The default is the active school year; no active year shows a message and requires choosing a year.

- **Enrolled students** counts distinct enrolled/active students and excludes dropped, transferred-out, retained, and completed records. Approved applications awaiting a section are shown separately.
- **Needs review** includes submitted and verified applications. Returned records await student correction; pending SSC exams appear in the status chart.
- Section capacity includes every current occupant for the selected year and class, regardless of enrollment-type filtering. Check that the dashboard and Sections page agree.
- Change between JHS Regular, JHS SSC, and SHS. Check the grade chart, status chart, review queue, and recent record activity. The activity feed uses saved timestamps and does not invent resubmission or assignment events.
- Open **Review** and confirm the correct record opens. Check that shortcuts preserve the year/class/type filters and that **Export enrollment report** opens the existing Enrollments export screen.

From `backend`, run the dashboard aggregation tests:

```powershell
node --test services/registrarDashboard.test.js
```

With the frontend running at `http://localhost:5173` and the optional temporary Playwright installation described above available:

```powershell
node scripts/check-registrar-dashboard.js
```

The browser check uses synthetic API responses, checks phone/tablet/desktop widths, filters, record links, section links, error recovery, and missing-active-year behavior. It does not modify the database or send email. A separate read-only local check verified the dashboard and section queries against MySQL.

## Google signup profile completion

Restart the backend to add the nullable name/mobile columns and the profile-completion flag. Existing accounts default to completed. New Google signups must confirm their first name and last name, optionally add a middle name, and provide a valid Philippine mobile number before continuing to enrollment. An unfinished profile is prompted again after login or reload.

Saved details are available through **Profile** in the student menu (`/profile`), where the student can edit them. Google email stays read-only; the display name is composed from the saved name fields. Mobile numbers must be exactly 11 digits, start with `09`, and contain numbers only (for example, `09171234567`).

First, middle, and last name each allow up to 100 characters; the combined display name must fit within 255 characters. Name fields show character counts and block paste. The backend independently validates name lengths and allowed characters; paste blocking is a UI restriction, not a security boundary.

From `backend`:

```powershell
node --test services/userProfile.test.js controllers/userProfile.test.js
node scripts/check-google-profile.js
```

The browser check requires the running local frontend and the optional temporary Playwright installation described above. It uses synthetic OAuth/API responses to check first-signup redirection, required fields, optional middle name, validation, saving/editing, session restoration, and mobile/desktop layout. It does not contact Google or change real users; test the real Google signup redirect separately after restarting the backend.

## Deployment checks before going live

- Back up MySQL and `backend/public/uploads`, including saved narration and panorama photos. Keep uploads on persistent storage.
- Use real production database credentials, a strong JWT secret, a separate random `SESSION_SECRET`, `NODE_ENV=production`, and the correct HTTPS `FRONTEND_URL`/`CLIENT_URL`.
- If HTTPS terminates at a trusted reverse proxy, set `TRUST_PROXY=1` for one proxy hop and forward `Host`, `X-Forwarded-Proto`, and `X-Forwarded-For` correctly. Secure session cookies require HTTPS in production. Do not use this production cookie configuration for plain-HTTP local testing.
- Prefer one public origin: serve `frontend/dist` and proxy both `/api/` and `/uploads/` to Node. **Do not expose `uploads/documents` through a direct Nginx alias, CDN, or public object-store bucket**, which would bypass the application's document access checks.
- Build the frontend with the intended `VITE_API_URL`; leave it empty for same-origin proxying. This value is compiled into the frontend build.
- Configure the real Google OAuth callback URL and API/email credentials on the server, never in the frontend.
- Application startup creates absent settings tables/columns without dropping student data. **Do not run `npm run migrate` or `npm run db:refresh` against existing production data**; those maintenance flows can reset tables/data.
- Express sessions still use the default in-memory store. For multiple backend instances or sessions that must survive restarts, configure a shared persistent session store. JWT login restoration remains separate.
- Verify public HTTPS login, document previews, uploads, PDFs, and an enrollment cycle on the actual host. Local success is not verification of DNS, TLS, reverse proxy, SMTP delivery, or external-provider quotas.

No live deployment was performed during this audit. The frontend build still emits a bundle-size warning; it does not prevent the build, but slower mobile connections will benefit from future code splitting.
