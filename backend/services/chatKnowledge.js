// Reference: frontend/src/pages/student/HSEnrollmentForm.jsx, HS_CREDS,
// TRANSFEREE_CREDS, and document-step validation. Keep in sync with that form.
// These describe the portal's checklist, not additional institutional policy.
export const PORTAL_FAQS = [
  {
    id: null,
    source: 'portal',
    question: 'What are the requirements for enrollment?',
    keywords: JSON.stringify(['enrollment', 'enrolment', 'admission', 'requirements', 'documents', 'document', 'kailangan', 'requirements sa enrollment', 'enroll', 'mag enroll', 'mag-enroll']),
    answer: 'For JHS/SHS, the current EMC enrollment portal lists these documents:\n\nFor regular applicants:\n• F-138 (Report Card)\n• Certificate of Good Moral Character\n• F-137-A (Permanent Record) and F-137-E (Elementary Record) are listed as optional.\n\nFor transferees, the portal requires:\n• F-138 from the previous school\n• F-137-A (Permanent Record / TOR)\n• GMRC / Certificate of Good Moral Character\n• Honorable Dismissal / Transfer Credential\n\nThis is the portal checklist; confirm any additional requirements with the Registrar. Are you applying for JHS or SHS, and are you a new student or transferee?'
  }
];

// Reviewed public content only. Do not index arbitrary files, uploads, .env,
// student records, or administrative account data into the chatbot.
const entry = (question, keywords, answer, reference, topic) => ({
  id: null, source: 'portal', question, keywords: JSON.stringify(keywords), answer, reference, topic
});
PORTAL_FAQS[0].reference = 'frontend/src/pages/student/HSEnrollmentForm.jsx';
PORTAL_FAQS[0].topic = 'documents';
PORTAL_FAQS.push({
  ...entry('About Eastern Mindoro College', ['institution', 'school profile', 'paaralan'],
    'Eastern Mindoro College, Inc. is the school served by this GabAI portal. The displayed address is Vicente Ylagan St., Bagong Bayan II, Bongabong, Philippines, 5211. The portal supports JHS (Grades 7–10), SHS (Grades 11–12), online enrollment, school information, and a 360-degree campus tour.',
    'frontend/src/components/Footer.jsx; frontend/src/pages/student/LevelSelection.jsx'),
  topic: 'profile'
});
PORTAL_FAQS.push(
  entry('What programs are offered in the enrollment portal?', ['program', 'programs', 'course', 'courses', 'offered', 'offering', 'education levels'],
    'The current enrollment interface supports Junior High School (Grades 7–10) and Senior High School (Grades 11–12), with an SSC application option for eligible JHS applicants. The SHS form lists STEM, ABM, HUMSS, TVL, Sports, and Arts and Design. These describe portal options; use current program records or confirm with the Registrar for actual availability or college-level offerings.', 'frontend/src/pages/student/LevelSelection.jsx; frontend/src/pages/student/HSEnrollmentForm.jsx', 'programs'),
  entry('What is GabAI and what can it do?', ['gabai', 'assistant', 'features', 'chatbot', 'help', 'tulong'],
    'GabAI is the admission and campus navigation companion for Eastern Mindoro College, Inc. It provides school information through this chat, an enrollment guide, online enrollment, and a 360-degree campus tour. It cannot change enrollment or disclose private student records.', 'frontend/src/components/Footer.jsx; frontend/src/pages/Home.jsx'),
  entry('Where is Eastern Mindoro College located?', ['location', 'address', 'located', 'saan', 'bongabong', 'eastern mindoro college'],
    'The school address displayed in the portal is Vicente Ylagan St., Bagong Bayan II, Bongabong, Philippines, 5211.', 'frontend/src/components/Footer.jsx'),
  entry('How can I contact EMC?', ['contact', 'email', 'makontak', 'telephone', 'phone'],
    'The portal displays emc_1945@yahoo.com as the school email. You can also visit the Registrar on campus. The displayed telephone number is a placeholder, so please confirm a current number through official school channels.', 'frontend/src/components/Footer.jsx'),
  entry('What is the difference between JHS and SHS?', ['jhs', 'shs', 'junior high', 'senior high', 'grade', 'levels', 'difference', 'pagkakaiba'],
    'In the enrollment portal, Junior High School (JHS) covers Grades 7?10, while Senior High School (SHS) covers Grades 11?12. Choose the appropriate level before completing your enrollment form.', 'frontend/src/pages/student/LevelSelection.jsx'),
  entry('What SHS strands can I select?', ['strand', 'strands', 'shs strands', 'stem', 'abm', 'humss', 'tvl', 'sports', 'arts and design'],
    'The SHS enrollment form lists STEM, ABM, HUMSS, TVL, Sports, and Arts and Design as strand options. These are portal options; confirm current offerings and availability with the Registrar or the current program records.', 'frontend/src/pages/student/HSEnrollmentForm.jsx'),
  entry('How do I apply for the Special Science Class SSC?', ['ssc', 'special science', 'science class', 'entrance', 'exam', 'examination', 'average'],
    'The JHS portal says students with a Grade 6 general average of 85 or higher may apply for the Special Science Class (SSC). Select Junior High School and upload your Grade 6 report card for SSC review. The Registrar verifies the card, schedules the entrance exam, and informs you of the result. You may continue filling out the enrollment form while waiting. Confirm your individual schedule in your account; this chat cannot access private results.', 'frontend/src/pages/student/LevelSelection.jsx'),
  entry('How do I enroll online at EMC?', ['enroll', 'enrollment process', 'enrolment', 'apply', 'application', 'online', 'steps', 'paano', 'mag enroll'],
    'Sign in to your student account, open Admissions / enrollment, and select JHS or SHS. Complete your student, family, and previous-school details, choose your grade and SHS strand if applicable, upload the requested documents, review the form, and submit. Track the application in My Enrollments. JHS applicants can apply for SSC during level selection.', 'frontend/src/pages/student/LevelSelection.jsx; frontend/src/pages/student/HSEnrollmentForm.jsx; frontend/src/components/Footer.jsx'),
  entry('Where can I check my enrollment status or class schedule?', ['status', 'track', 'tracking', 'my enrollments', 'my schedule', 'application status'],
    'Sign in to your own student account and open My Enrollments to view your application and its updates. Use My Schedule for your assigned class schedule when available. This public chatbot cannot look up private applications, grades, or individual exam results.', 'frontend/src/pages/student/MyEnrollments.jsx; frontend/src/pages/student/MySchedule.jsx'),
  entry('What file types can I upload for enrollment?', ['upload', 'file', 'files', 'format', 'pdf', 'jpg', 'png', 'size'],
    'The enrollment upload interface accepts PDF, JPG/JPEG, and PNG files, with a maximum of 10 MB per file. Upload documents through the enrollment form rather than sharing personal records in this chat.', 'frontend/src/pages/student/LevelSelection.jsx'),
  entry('How can I explore the campus or use the virtual tour?', ['tour', '360', 'navigation', 'navigate', 'map', 'campus', 'buildings', 'facilities'],
    'Open the campus navigation / virtual tour page to explore EMC using 360-degree views. Select a building to view available information and photos. Building locations, offices, and hours can also be answered from active campus records when provided.', 'frontend/src/pages/ARNavigation.jsx; frontend/src/components/Footer.jsx'),
  entry('How do I recover my forgotten password?', ['forgot password', 'reset password', 'recover', 'recovery', 'login', 'account access'],
    'Use Forgot Password on the sign-in page, enter your account email, and follow the reset link sent to your inbox. Set a new password through that page. Never share your password, reset token, or OTP in this chat.', 'frontend/src/pages/PasswordRecovery.jsx'),
);
