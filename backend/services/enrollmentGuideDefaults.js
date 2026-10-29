const steps = [
  {
    id: 1,
    icon: "FileText",
    title: "Gather Required Documents",
    description:
      "Collect all required documents before visiting the campus. Incomplete submissions will delay enrollment.",
    requirements: [
      "Original Form 138 / SF9 with school seal",
      "Certificate of Good Moral Character",
      "PSA Birth Certificate (original + 2 photocopies)",
      "4 pieces 2x2 ID photos (white background)",
      "Medical Certificate from licensed physician",
      "Barangay Clearance",
    ],
    downloadLabel: "Download Document Checklist",
    color: "from-[#001840] to-[#102A71]",
    estimatedTime: "1-2 weeks",
    tips: "Start gathering documents early. PSA Birth Certificate may take 3-5 days to process."
  },
  {
    id: 2,
    icon: "ClipboardList",
    title: "Fill Out Admission Form",
    description:
      "Accomplish the official EMC Admission Form accurately. Forms are available at the Registrar's Office or online.",
    requirements: [
      "Download or pick up admission form at Registrar's Office",
      "Fill in personal and academic information",
      "Attach 2x2 ID photo on the form",
      "Have parent / guardian sign the form",
      "Do not leave any field blank",
    ],
    downloadLabel: "Download Admission Form",
    color: "from-[#102A71] to-[#1a3a8f]",
    estimatedTime: "30 minutes",
    tips: "Use black ink only. Write legibly. Double-check all information before submission."
  },
  {
    id: 3,
    icon: "UserCheck",
    title: "Submit Documents & Interview",
    description:
      "Bring all requirements to the Registrar's Office. Undergo brief admission interview and document validation.",
    requirements: [
      "Visit Registrar's Office (Admin Building, Ground Floor)",
      "Submit all required documents",
      "Undergo document verification process",
      "Complete admission interview with guidance counselor",
      "Receive your student reference number",
    ],
    downloadLabel: "Download Interview Guide",
    color: "from-[#001840] to-[#102A71]",
    estimatedTime: "1-2 hours",
    tips: "Arrive early (8:00 AM) to avoid long queues. Dress appropriately for the interview."
  },
  {
    id: 4,
    icon: "BookOpen",
    title: "Entrance Examination",
    description:
      "Take the Eastern Mindoro College Entrance Exam (EMCEE). Results are released within 3–5 working days.",
    requirements: [
      "Bring admission slip and 2 valid IDs",
      "Arrive 30 minutes before the exam",
      "Exam covers English, Math, Science, and General Knowledge",
      "No electronic devices allowed inside the room",
      "Claim results at the Guidance Office after 3–5 days",
    ],
    downloadLabel: "Download Exam Tips & Coverage",
    color: "from-[#102A71] to-[#1a3a8f]",
    estimatedTime: "2-3 hours",
    tips: "Get enough sleep the night before. Bring pencils, eraser, and sharpener. No calculators allowed."
  },
  {
    id: 5,
    icon: "CreditCard",
    title: "Pay Enrollment Fees",
    description:
      "Proceed to the Cashier's Office to settle tuition and miscellaneous fees. Keep all official receipts.",
    requirements: [
      "Bring Enrollment Assessment Form from Registrar",
      "Pay at the EMC Cashier's Office (Admin Building, GF)",
      "Online payment available via GCash / Maya / Bank Transfer",
      "Request Official Receipt (OR) for all payments",
      "Free tuition available for qualified students (UniFAST)",
    ],
    downloadLabel: "Download Fee Schedule",
    color: "from-[#001840] to-[#102A71]",
    estimatedTime: "30 minutes - 1 hour",
    tips: "Payment plans available. Ask about scholarship opportunities. Keep all receipts safe."
  },
  {
    id: 6,
    icon: "Camera",
    title: "Get Your Student ID",
    description:
      "Present your Official Receipt to the Guidance Office for ID photo capture and student ID processing.",
    requirements: [
      "Bring Official Receipt of payment",
      "Visit Guidance Office (Admin Building, 2nd Floor)",
      "Have photo taken on-site (wear appropriate attire)",
      "ID released within 5–7 working days",
      "Wear student ID at all times while on campus",
    ],
    downloadLabel: "Download ID Guidelines",
    color: "from-[#102A71] to-[#1a3a8f]",
    estimatedTime: "15-30 minutes",
    tips: "Wear collared shirt for ID photo. Smile! You'll use this ID for 4 years."
  },
];

export const initialGuide = {
  enrollmentPeriod: '', enrollmentAudience: 'New students & transferees',
  registrarLocation: 'Admin Building, Ground Floor', registrarHours: 'Mon-Fri: 8:00 AM ? 5:00 PM',
  phone: '', email: '', importantNotice: 'Confirm the current enrollment deadline with the Registrar.', importantDetail: '',
  completionTitle: 'Guide checklist complete', completionMessage: 'You have marked all guide steps as complete. Check your student account for your official enrollment status.', completionDetail: '',
  steps: steps.map(step => ({ ...step, downloadUrl: '' }))
};
