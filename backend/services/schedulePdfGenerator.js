import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

// 15-minute intervals from 7:30 AM to 5:30 PM (41 slot marks, 40 intervals)
const TIME_SLOTS = [
  "7:30 AM", "7:45 AM", "8:00 AM", "8:15 AM", "8:30 AM", "8:45 AM",
  "9:00 AM", "9:15 AM", "9:30 AM", "9:45 AM", "10:00 AM", "10:15 AM",
  "10:30 AM", "10:45 AM", "11:00 AM", "11:15 AM", "11:30 AM", "11:45 AM",
  "12:00 PM", "12:15 PM", "12:30 PM", "12:45 PM", "1:00 PM", "1:15 PM",
  "1:30 PM", "1:45 PM", "2:00 PM", "2:15 PM", "2:30 PM", "2:45 PM",
  "3:00 PM", "3:15 PM", "3:30 PM", "3:45 PM", "4:00 PM", "4:15 PM",
  "4:30 PM", "4:45 PM", "5:00 PM", "5:15 PM", "5:30 PM"
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3] ? match[3].toUpperCase() : null;

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

const timeToIndex = (timeStr) => {
  const min = parseTimeToMinutes(timeStr);
  if (min === null) return -1;
  const startMin = 7 * 60 + 30; // 7:30 AM = 450 min
  const slotIdx = Math.round((min - startMin) / 15);
  return (slotIdx >= 0 && slotIdx < TIME_SLOTS.length) ? slotIdx : -1;
};

/**
 * Generate a clean, strictly 1-PAGE landscape PDF for Student Weekly Class Schedule
 */
export const generateStudentSchedulePDF = ({ student, section, schedules, adviserName }) => {
  return new Promise((resolve, reject) => {
    try {
      // Landscape US Letter: 792 x 612 pt
      const doc = new PDFDocument({
        size: [792, 612],
        margins: { top: 16, bottom: 12, left: 24, right: 24 },
        autoFirstPage: true
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const LEFT = 24;
      const RIGHT = 792 - 24; // 768
      const USABLE_W = RIGHT - LEFT; // 744 pt

      // ── Top Header ───────────────────────────────────────────────────────────
      const headerY = 16;
      const logoPath = path.join(process.cwd(), 'public', 'GabAi_Logo.png');
      const hasLogo = fs.existsSync(logoPath);
      if (hasLogo) {
        try {
          doc.image(logoPath, LEFT, headerY, { width: 34, height: 34 });
        } catch (_) {}
      }

      const textStartX = hasLogo ? LEFT + 42 : LEFT;

      doc.font('Helvetica-Bold').fontSize(12).fillColor('#001840')
        .text('EASTERN MINDORO COLLEGE, INC.', textStartX, headerY + 2, { lineBreak: false });
      
      doc.font('Helvetica').fontSize(8).fillColor('#475569')
        .text('Office of the Registrar • Student Official Class Timetable', textStartX, headerY + 18, { lineBreak: false });

      // School Year & Printed Date on Top Right
      const sy = section?.schoolYear || student?.academicYear || '2026-2027';
      const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#001840')
        .text(`School Year: ${sy}`, RIGHT - 160, headerY + 2, { width: 160, align: 'right', lineBreak: false });
      doc.font('Helvetica').fontSize(7).fillColor('#64748B')
        .text(`Date Generated: ${todayStr}`, RIGHT - 160, headerY + 16, { width: 160, align: 'right', lineBreak: false });

      // Navy divider line
      doc.strokeColor('#001840').lineWidth(1.2)
        .moveTo(LEFT, headerY + 38).lineTo(RIGHT, headerY + 38).stroke();

      // ── Student Info Block ──────────────────────────────────────────────────
      const infoY = headerY + 42;
      const colW = USABLE_W / 4;

      const studentFullName = student?.firstName
        ? `${student.firstName} ${student.middleName ? student.middleName + '. ' : ''}${student.familyName}`
        : (student?.name || 'Student');

      const lrn = student?.lrn || student?.studentNumber || 'N/A';
      const secLabel = section ? `Grade ${section.yearLevel} - ${section.code}` : (student?.gradeLevel || 'N/A');
      const adviser = adviserName || section?.instructor || 'To be announced';

      // Col 1: Student Name
      doc.font('Helvetica').fontSize(6.5).fillColor('#64748B')
        .text('STUDENT NAME', LEFT, infoY, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#001840')
        .text(studentFullName, LEFT, infoY + 9, { width: colW - 6, lineBreak: false, ellipsis: true });

      // Col 2: LRN / Student No
      doc.font('Helvetica').fontSize(6.5).fillColor('#64748B')
        .text('LRN / STUDENT NO.', LEFT + colW, infoY, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#001840')
        .text(lrn, LEFT + colW, infoY + 9, { width: colW - 6, lineBreak: false, ellipsis: true });

      // Col 3: Grade & Section
      doc.font('Helvetica').fontSize(6.5).fillColor('#64748B')
        .text('GRADE & SECTION', LEFT + colW * 2, infoY, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#001840')
        .text(secLabel, LEFT + colW * 2, infoY + 9, { width: colW - 6, lineBreak: false, ellipsis: true });

      // Col 4: Class Adviser
      doc.font('Helvetica').fontSize(6.5).fillColor('#64748B')
        .text('CLASS ADVISER', LEFT + colW * 3, infoY, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#001840')
        .text(adviser, LEFT + colW * 3, infoY + 9, { width: colW - 6, lineBreak: false, ellipsis: true });

      // Divider line under student info
      doc.strokeColor('#CBD5E1').lineWidth(0.5)
        .moveTo(LEFT, infoY + 22).lineTo(RIGHT, infoY + 22).stroke();

      // ── Weekly Timetable Grid ───────────────────────────────────────────────
      const gridTopY = infoY + 26;
      const TIME_COL_W = 58;
      const DAY_COL_W = (USABLE_W - TIME_COL_W) / 5; // (744 - 58) / 5 = 137.2 pt
      const HEADER_H = 17;
      const NUM_ROWS = 40; // 40 intervals from 7:30 AM to 5:30 PM (15 mins each)
      const ROW_H = 11.25; // 40 * 11.25 = 450 pt. Grid total height = 467 pt
      const GRID_H = HEADER_H + NUM_ROWS * ROW_H; // 467 pt

      // Draw Header Background
      doc.rect(LEFT, gridTopY, USABLE_W, HEADER_H).fillColor('#F1F5F9').fill();
      doc.rect(LEFT, gridTopY, USABLE_W, GRID_H).strokeColor('#94A3B8').lineWidth(0.75).stroke();

      // Header Labels
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#334155');
      doc.text('Time', LEFT, gridTopY + 4.5, { width: TIME_COL_W, align: 'center', lineBreak: false });

      DAYS_OF_WEEK.forEach((day, idx) => {
        const x = LEFT + TIME_COL_W + idx * DAY_COL_W;
        doc.text(day, x, gridTopY + 4.5, { width: DAY_COL_W, align: 'center', lineBreak: false });
      });

      // Horizontal Lines & Time Labels
      for (let r = 0; r <= NUM_ROWS; r++) {
        const currentY = gridTopY + HEADER_H + r * ROW_H;
        const isMajor = r % 2 === 0;
        
        // Horizontal line
        doc.strokeColor(isMajor ? '#CBD5E1' : '#F1F5F9').lineWidth(isMajor ? 0.5 : 0.3)
          .moveTo(LEFT, currentY).lineTo(RIGHT, currentY).stroke();

        // Time slot label
        if (r < NUM_ROWS) {
          if (isMajor) {
            doc.font('Helvetica-Bold').fontSize(5.8).fillColor('#334155')
              .text(TIME_SLOTS[r], LEFT, currentY + 2.5, { width: TIME_COL_W, align: 'center', lineBreak: false });
          } else {
            doc.font('Helvetica').fontSize(4.8).fillColor('#94A3B8')
              .text(TIME_SLOTS[r], LEFT, currentY + 3, { width: TIME_COL_W, align: 'center', lineBreak: false });
          }
        }
      }

      // Vertical Lines
      // Time col divider
      doc.strokeColor('#CBD5E1').lineWidth(0.75)
        .moveTo(LEFT + TIME_COL_W, gridTopY).lineTo(LEFT + TIME_COL_W, gridTopY + GRID_H).stroke();

      for (let d = 1; d <= 5; d++) {
        const lineX = LEFT + TIME_COL_W + d * DAY_COL_W;
        doc.strokeColor('#E2E8F0').lineWidth(0.5)
          .moveTo(lineX, gridTopY).lineTo(lineX, gridTopY + GRID_H).stroke();
      }

      // Outer border on grid
      doc.rect(LEFT, gridTopY, USABLE_W, GRID_H).strokeColor('#94A3B8').lineWidth(0.75).stroke();

      // ── Draw Scheduled Class Cards ──────────────────────────────────────────
      if (Array.isArray(schedules) && schedules.length > 0) {
        schedules.forEach((item) => {
          const dayIdx = DAYS_OF_WEEK.indexOf(item.dayOfWeek);
          if (dayIdx === -1) return;

          const startIdx = timeToIndex(item.startTime);
          const endIdx = timeToIndex(item.endTime);
          if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return;

          const cardX = LEFT + TIME_COL_W + dayIdx * DAY_COL_W + 1.5;
          const cardY = gridTopY + HEADER_H + startIdx * ROW_H + 1.5;
          const cardW = DAY_COL_W - 3;
          const cardH = (endIdx - startIdx) * ROW_H - 3;

          const isItemBreak = item.subjectCode === 'BREAK' ||
            item.subjectCode === 'HEALTH-BREAK' ||
            item.subjectCode === 'LUNCH-BREAK' ||
            (item.subjectName && (item.subjectName.toLowerCase().includes('break') || item.subjectName.toLowerCase().includes('recess'))) ||
            item.teacherName === 'No Teacher';

          const isLunch = item.subjectCode === 'LUNCH-BREAK' || (item.subjectName && item.subjectName.toLowerCase().includes('lunch'));
          const fillColor = isItemBreak ? (isLunch ? '#FFEDD5' : '#FEF3C7') : '#DCFCE7';
          const strokeColor = isItemBreak ? (isLunch ? '#FED7AA' : '#FDE68A') : '#86EFAC';
          const titleColor = isItemBreak ? (isLunch ? '#7C2D12' : '#78350F') : '#0F172A';
          const timeColor = isItemBreak ? (isLunch ? '#9A3412' : '#92400E') : '#065F46';

          // Background Fill
          doc.roundedRect(cardX, cardY, cardW, cardH, 3)
            .fillColor(fillColor).fill();

          // Border
          doc.roundedRect(cardX, cardY, cardW, cardH, 3)
            .strokeColor(strokeColor).lineWidth(0.75).stroke();

          // Text inside card
          let textY = cardY + 3;
          
          // 1. Subject Name (Bold)
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(titleColor)
            .text(item.subjectName || '', cardX + 3, textY, {
              width: cardW - 6,
              align: 'center',
              lineBreak: false,
              ellipsis: true
            });
          textY += 10;

          // 2. Time range
          if (cardH > 18) {
            doc.font('Helvetica-Bold').fontSize(6.5).fillColor(timeColor)
              .text(`${item.startTime} – ${item.endTime}`, cardX + 2, textY, {
                width: cardW - 4,
                align: 'center',
                lineBreak: false,
                ellipsis: true
              });
            textY += 8.5;
          }

          // 3. Teacher Name or Break badge
          if (cardH > 27) {
            if (!isItemBreak && item.teacherName && item.teacherName !== 'No Teacher') {
              doc.font('Helvetica').fontSize(6.5).fillColor('#334155')
                .text(item.teacherName, cardX + 2, textY, {
                  width: cardW - 4,
                  align: 'center',
                  lineBreak: false,
                  ellipsis: true
                });
              textY += 8.5;
            } else if (isItemBreak) {
              doc.font('Helvetica-Oblique').fontSize(6).fillColor(titleColor)
                .text(isLunch ? 'Lunch Time' : 'Wellness Break', cardX + 2, textY, {
                  width: cardW - 4,
                  align: 'center',
                  lineBreak: false,
                  ellipsis: true
                });
              textY += 8.5;
            }
          }

          // 4. Room
          if (cardH > 38 && item.room) {
            doc.font('Helvetica-Oblique').fontSize(6).fillColor(timeColor)
              .text(`Room: ${item.room}`, cardX + 2, textY, {
                width: cardW - 4,
                align: 'center',
                lineBreak: false,
                ellipsis: true
              });
          }
        });
      } else {
        // If no schedules
        doc.font('Helvetica-Oblique').fontSize(9).fillColor('#94A3B8')
          .text('No class schedule assigned for this section yet.', LEFT, gridTopY + GRID_H / 2 - 10, {
            width: USABLE_W,
            align: 'center',
            lineBreak: false
          });
      }

      // ── Footer (Compact single-line) ─────────────────────────────────────────
      const footerY = gridTopY + GRID_H + 8; // 86 + 467 + 8 = 561 pt (well below bottom 600 pt)
      doc.font('Helvetica').fontSize(6.5).fillColor('#94A3B8')
        .text('Eastern Mindoro College, Inc. • Official Student Schedule Document • Generated via GabAI Portal', LEFT, footerY, {
          width: USABLE_W,
          align: 'center',
          lineBreak: false
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generate a clean, strictly 1-PAGE landscape PDF for Teacher / Faculty Weekly Schedule
 */
export const generateTeacherSchedulePDF = ({ teacher, schedules = [], advisorySections = [] }) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [792, 612],
        margins: { top: 16, bottom: 12, left: 24, right: 24 },
        autoFirstPage: true
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const LEFT = 24;
      const RIGHT = 792 - 24;
      const USABLE_W = RIGHT - LEFT;

      // ── Top Header ───────────────────────────────────────────────────────────
      const headerY = 16;
      const logoPath = path.join(process.cwd(), 'public', 'GabAi_Logo.png');
      const hasLogo = fs.existsSync(logoPath);
      if (hasLogo) {
        try {
          doc.image(logoPath, LEFT, headerY, { width: 34, height: 34 });
        } catch (_) {}
      }

      const textStartX = hasLogo ? LEFT + 42 : LEFT;

      doc.font('Helvetica-Bold').fontSize(12).fillColor('#001840')
        .text('EASTERN MINDORO COLLEGE, INC.', textStartX, headerY + 2, { lineBreak: false });
      
      doc.font('Helvetica').fontSize(8).fillColor('#475569')
        .text('Faculty Official Teaching Timetable • Office of Academic Affairs', textStartX, headerY + 18, { lineBreak: false });

      const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#001840')
        .text(`Academic Faculty Load`, RIGHT - 160, headerY + 2, { width: 160, align: 'right', lineBreak: false });
      doc.font('Helvetica').fontSize(7).fillColor('#64748B')
        .text(`Date Generated: ${todayStr}`, RIGHT - 160, headerY + 16, { width: 160, align: 'right', lineBreak: false });

      // Navy divider line
      doc.strokeColor('#001840').lineWidth(1.2)
        .moveTo(LEFT, headerY + 38).lineTo(RIGHT, headerY + 38).stroke();

      // ── Teacher Info Block ──────────────────────────────────────────────────
      const infoY = headerY + 42;
      const colW = USABLE_W / 4;

      const teacherName = teacher?.name || 'Faculty Member';
      const email = teacher?.email || 'N/A';
      const advisoryText = advisorySections.length > 0
        ? advisorySections.map(s => `Grade ${s.yearLevel} - ${s.code}`).join(', ')
        : 'None Assigned';

      // Col 1: Teacher Name
      doc.font('Helvetica').fontSize(6.5).fillColor('#64748B')
        .text('FACULTY INSTRUCTOR', LEFT, infoY, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#001840')
        .text(teacherName, LEFT, infoY + 9, { width: colW - 6, lineBreak: false, ellipsis: true });

      // Col 2: Email
      doc.font('Helvetica').fontSize(6.5).fillColor('#64748B')
        .text('EMAIL ADDRESS', LEFT + colW, infoY, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#001840')
        .text(email, LEFT + colW, infoY + 9, { width: colW - 6, lineBreak: false, ellipsis: true });

      // Col 3: Teaching Load
      doc.font('Helvetica').fontSize(6.5).fillColor('#64748B')
        .text('SCHEDULED LOAD', LEFT + colW * 2, infoY, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#001840')
        .text(`${schedules.length} class${schedules.length !== 1 ? 'es' : ''} scheduled`, LEFT + colW * 2, infoY + 9, { width: colW - 6, lineBreak: false, ellipsis: true });

      // Col 4: Advisory Class
      doc.font('Helvetica').fontSize(6.5).fillColor('#64748B')
        .text('ADVISORY SECTION', LEFT + colW * 3, infoY, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#001840')
        .text(advisoryText, LEFT + colW * 3, infoY + 9, { width: colW - 6, lineBreak: false, ellipsis: true });

      // Divider line
      doc.strokeColor('#CBD5E1').lineWidth(0.5)
        .moveTo(LEFT, infoY + 22).lineTo(RIGHT, infoY + 22).stroke();

      // ── Weekly Timetable Grid ───────────────────────────────────────────────
      const gridTopY = infoY + 26;
      const TIME_COL_W = 60;
      const DAY_COL_W = (USABLE_W - TIME_COL_W) / 5;
      const HEADER_H = 17;
      const NUM_ROWS = 40; // 40 intervals from 7:30 AM to 5:30 PM (15 mins each)
      const ROW_H = 11.25; // 40 * 11.25 = 450 pt. Grid total height = 467 pt
      const GRID_H = HEADER_H + NUM_ROWS * ROW_H;

      // Header background
      doc.rect(LEFT, gridTopY, USABLE_W, HEADER_H).fill('#001840');

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF')
        .text('TIME', LEFT, gridTopY + 4.5, { width: TIME_COL_W, align: 'center', lineBreak: false });

      DAYS_OF_WEEK.forEach((day, i) => {
        const x = LEFT + TIME_COL_W + i * DAY_COL_W;
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF')
          .text(day.toUpperCase(), x, gridTopY + 4.5, { width: DAY_COL_W, align: 'center', lineBreak: false });
      });

      // Grid Rows
      const bodyTopY = gridTopY + HEADER_H;
      for (let r = 0; r < NUM_ROWS; r++) {
        const y = bodyTopY + r * ROW_H;
        const isMajor = r % 2 === 0;

        doc.rect(LEFT, y, TIME_COL_W, ROW_H).fill(isMajor ? '#F8FAFC' : '#FFFFFF');
        doc.rect(LEFT + TIME_COL_W, y, USABLE_W - TIME_COL_W, ROW_H).fill(isMajor ? '#FAFAFA' : '#FFFFFF');

        doc.strokeColor(isMajor ? '#CBD5E1' : '#F1F5F9').lineWidth(isMajor ? 0.5 : 0.3)
          .moveTo(LEFT, y + ROW_H).lineTo(RIGHT, y + ROW_H).stroke();

        const slotLabel = TIME_SLOTS[r];
        if (isMajor) {
          doc.font('Helvetica-Bold').fontSize(5.8).fillColor('#475569')
            .text(slotLabel, LEFT + 2, y + 2.5, { width: TIME_COL_W - 4, align: 'center', lineBreak: false });
        } else {
          doc.font('Helvetica').fontSize(4.8).fillColor('#94A3B8')
            .text(slotLabel, LEFT + 2, y + 3, { width: TIME_COL_W - 4, align: 'center', lineBreak: false });
        }
      }

      // Vertical column dividers
      doc.strokeColor('#CBD5E1').lineWidth(0.5);
      doc.moveTo(LEFT + TIME_COL_W, gridTopY).lineTo(LEFT + TIME_COL_W, gridTopY + GRID_H).stroke();
      for (let i = 1; i < 5; i++) {
        const colX = LEFT + TIME_COL_W + i * DAY_COL_W;
        doc.moveTo(colX, gridTopY).lineTo(colX, gridTopY + GRID_H).stroke();
      }

      // Outer border
      doc.strokeColor('#001840').lineWidth(0.8)
        .rect(LEFT, gridTopY, USABLE_W, GRID_H).stroke();

      // Render Scheduled Class Cards
      if (schedules && schedules.length > 0) {
        schedules.forEach(item => {
          const dayIdx = DAYS_OF_WEEK.indexOf(item.dayOfWeek);
          if (dayIdx === -1) return;

          const startIdx = timeToIndex(item.startTime);
          const endIdx = timeToIndex(item.endTime);
          if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return;

          const colX = LEFT + TIME_COL_W + dayIdx * DAY_COL_W;
          const cardX = colX + 1.5;
          const cardW = DAY_COL_W - 3;
          const cardY = bodyTopY + startIdx * ROW_H + 1.5;
          const cardH = (endIdx - startIdx) * ROW_H - 3;

          // Background card
          doc.rect(cardX, cardY, cardW, cardH).fill('#EFF6FF');
          doc.rect(cardX, cardY, 3, cardH).fill('#1E40AF');
          doc.strokeColor('#93C5FD').lineWidth(0.6)
            .rect(cardX, cardY, cardW, cardH).stroke();

          let textY = cardY + 3.5;

          // 1. Subject Name
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0F172A')
            .text(item.subjectName || '', cardX + 4, textY, {
              width: cardW - 7,
              align: 'center',
              lineBreak: false,
              ellipsis: true
            });
          textY += 10;

          // 2. Time range
          if (cardH > 18) {
            doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#1E3A8A')
              .text(`${item.startTime} – ${item.endTime}`, cardX + 3, textY, {
                width: cardW - 6,
                align: 'center',
                lineBreak: false,
                ellipsis: true
              });
            textY += 8.5;
          }

          // 3. Section Name
          if (cardH > 27 && item.sectionName) {
            doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#001840')
              .text(item.sectionName, cardX + 3, textY, {
                width: cardW - 6,
                align: 'center',
                lineBreak: false,
                ellipsis: true
              });
            textY += 8.5;
          }

          // 4. Room
          if (cardH > 38 && item.room) {
            doc.font('Helvetica-Oblique').fontSize(6).fillColor('#047857')
              .text(`Room: ${item.room}`, cardX + 3, textY, {
                width: cardW - 6,
                align: 'center',
                lineBreak: false,
                ellipsis: true
              });
          }
        });
      } else {
        doc.font('Helvetica-Oblique').fontSize(9).fillColor('#94A3B8')
          .text('No teaching schedule assigned yet.', LEFT, gridTopY + GRID_H / 2 - 10, {
            width: USABLE_W,
            align: 'center',
            lineBreak: false
          });
      }

      // ── Footer ─────────────────────────────────────────────────────────────
      const footerY = gridTopY + GRID_H + 8;
      doc.font('Helvetica').fontSize(6.5).fillColor('#94A3B8')
        .text('Eastern Mindoro College, Inc. • Official Faculty Teaching Schedule • Generated via GabAI Portal', LEFT, footerY, {
          width: USABLE_W,
          align: 'center',
          lineBreak: false
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

