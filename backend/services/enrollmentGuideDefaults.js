const steps = [
  {
    id: 1,
    icon: "UserCheck",
    title: "Create Your Account & Complete Profile",
    description:
      "Register on the GabAI portal using your email address or Google account, verify your email via the 6-digit OTP code, and complete your student profile details on your first login.",
    requirements: [
      "Sign up with a valid email address and create a strong password (or use Google Sign-In)",
      "Enter the 6-digit verification code sent to your email inbox",
      "Log in and complete your First Name, Middle Name, Last Name, and Mobile Number",
      "Explore the Campus Virtual Tour or ask the GabAI Chatbot if you have admission questions",
    ],
    downloadLabel: "Download Account Setup Checklist",
    color: "from-[#001840] to-[#102A71]",
    estimatedTime: "5-10 minutes",
    tips: "Use an active personal email address so you receive all OTP codes and official enrollment status updates."
  },
  {
    id: 2,
    icon: "BookOpen",
    title: "Select Education Level & Check SSC Eligibility",
    description:
      "Click Enroll from your student portal to choose Junior High School (Grades 7–10) or Senior High School (Grades 11–12) and your applicant type (New, Continuing, Transferee, or Returnee).",
    requirements: [
      "Choose Junior High School (JHS) or Senior High School (SHS) and your Grade Level",
      "For incoming Grade 7 Special Science Class (SSC) applicants: enter your Grade 6 General Average (at least 85) and upload your SF9 / Report Card for Registrar screening and entrance exam scheduling",
      "For Senior High School (Grades 11–12): select your academic track/strand (STEM, ABM, HUMSS, or GAS) and semester",
      "For Continuing / Old EMC students: verify your LRN and previous section record",
    ],
    downloadLabel: "Download Level & Track Guide",
    color: "from-[#102A71] to-[#1a3a8f]",
    estimatedTime: "5-15 minutes",
    tips: "Incoming Grade 7 SSC applicants must wait for the Registrar to verify their report card and release their SSC exam result before proceeding to the full enrollment form."
  },
  {
    id: 3,
    icon: "FileText",
    title: "Prepare & Scan Required Documents",
    description:
      "Gather your admission requirements based on your applicant type and prepare clear scanned copies or photos (PDF, JPG, or PNG up to 5 MB each) for online upload, while keeping the original hard copies ready.",
    requirements: [
      "SF9 / Form 138 (Report Card) with school seal",
      "PSA Birth Certificate (clear copy + original for verification)",
      "Certificate of Good Moral Character",
      "2x2 ID Picture (white background, formal attire)",
      "Certificate of Transfer / Honorable Dismissal & SF10 / Form 137 (required for Transferees)",
      "Medical Certificate (optional / if applicable)",
    ],
    downloadLabel: "Download Document Checklist",
    color: "from-[#001840] to-[#102A71]",
    estimatedTime: "1-3 days",
    tips: "Make sure uploaded photos or PDFs are clear and readable. Keep all original physical documents in a folder to bring to the campus."
  },
  {
    id: 4,
    icon: "ClipboardList",
    title: "Fill Out & Submit Online Enrollment Form",
    description:
      "Complete the multi-step online High School Enrollment Form in the GabAI portal, upload your digital document copies, review all entries, and submit your application.",
    requirements: [
      "Enter Student Information (LRN, full name, birthdate, birthplace, sex, religion, and mother tongue)",
      "Provide complete Current & Permanent Address and Parent / Guardian contact details",
      "Enter Academic Background (Elementary school graduated and Grade 6 completion school year)",
      "Upload required digital documents and submit the form to receive your Application Number (e.g., ENR-2026-XXXX)",
    ],
    downloadLabel: "Download Form Filling Guide",
    color: "from-[#102A71] to-[#1a3a8f]",
    estimatedTime: "15-20 minutes",
    tips: "Double-check your 12-digit LRN, birth date, and parent contact number before clicking Submit."
  },
  {
    id: 5,
    icon: "CreditCard",
    title: "Submit Hardcopy Documents & Settle Payment at Cashier's Office",
    description:
      "After submitting your online enrollment form, visit the campus to submit your physical documents for verification at the Registrar's Office and settle your enrollment fees at the Cashier's Office on the Ground Floor of the Admin Building.",
    requirements: [
      "Bring your Application Number and all original physical documents to the Registrar's Office (Admin Building, Ground Floor) for document verification",
      "Proceed to the Cashier's Office on the Ground Floor of the Admin Building to settle your enrollment and miscellaneous fees",
      "Keep your Official Receipt (OR) as proof of payment",
      "If the Registrar requests document corrections online, you can also use the Resubmit feature in My Enrollments",
    ],
    downloadLabel: "Download Verification & Payment Checklist",
    color: "from-[#001840] to-[#102A71]",
    estimatedTime: "30 minutes - 1 hour",
    tips: "Bring your original documents and visit during office hours (Monday–Friday, 8:00 AM – 5:00 PM) at the Ground Floor of the Admin Building."
  },
  {
    id: 6,
    icon: "Camera",
    title: "Track Approval, Section Assignment & Class Schedule",
    description:
      "Once your documents are verified and payment is settled, the Registrar will approve your enrollment and assign your class section. You can view and download your official schedule straight from your student portal.",
    requirements: [
      "Check your email or My Enrollments dashboard for your official Enrolled status and assigned Section",
      "Open the My Schedule page in your student portal to view your subjects, teachers, rooms, and class times",
      "Download or print your official Class Schedule PDF from the portal",
      "Coordinate with the Registrar / Guidance Office for your official EMC Student ID",
    ],
    downloadLabel: "Download Final Enrollment Checklist",
    color: "from-[#102A71] to-[#1a3a8f]",
    estimatedTime: "10-15 minutes",
    tips: "You will receive an email notification every time your enrollment status is updated by the Registrar."
  },
];

export const initialGuide = {
  enrollmentPeriod: 'S.Y. 2026–2027 Admissions Open',
  enrollmentAudience: 'Incoming Grade 7 & Grade 11, Continuing Students, Transferees & Returnees (JHS & SHS)',
  registrarLocation: 'Admin Building, Ground Floor (Registrar & Cashier\'s Office)',
  registrarHours: 'Mon–Fri: 8:00 AM – 5:00 PM',
  phone: '',
  email: '',
  importantNotice: 'After submitting your online enrollment form, submit your physical documents for verification at the Registrar\'s Office and settle payment at the Cashier\'s Office (Ground Floor, Admin Building).',
  importantDetail: 'Keep your Application Number and Official Receipt for verification and section assignment.',
  completionTitle: 'Enrollment Guide Checklist Complete!',
  completionMessage: 'You have completed all steps in the enrollment guide. Check My Enrollments and My Schedule in your student portal for your official section and class schedule.',
  completionDetail: 'Make sure your physical documents are verified at the Registrar\'s Office and payment is settled at the Cashier\'s Office (Ground Floor, Admin Building).',
  steps: steps.map(step => ({ ...step, downloadUrl: '' }))
};
