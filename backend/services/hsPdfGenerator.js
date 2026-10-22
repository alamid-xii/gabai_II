import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate High School (JHS/SHS) Enrollment PDF
 * Matches the actual EMC High School Enrollment Slip format
 * Page height auto-fits content — no whitespace at bottom
 */
export const generateHSEnrollmentPDF = (enrollment) => {
  return new Promise((resolve, reject) => {
    try {
      const L = 36, R = 576, W = 540;
      const ROW = 18, SROW = 15;

      const pledgeItems = [
        'Ibibigay ko ang lahat ng kailangan sa pagpapatala at ang mga ito ay hindi ko na makukuha pagkatapos na ako ay makapagpatala sapagkat ang mga ito ay magiging bahagi at pag-aari ng paaralan.',
        'MAGBABAYAD AKO SA TAKDANG ORAS NG AKING MGA OBLIGASYON TULAD NG ENTRANCE FEE, TUITION FEE AT IBA PANG DAPAT BAYARAN. Umaayon din ako na magbabayad ng ano mang pagtataas sa mga obligasyon na sinang-ayunan ng DEPED at ito ay may bisa mula sa buwan ng Hunyo.',
        'Hindi ko pababayaan ang aking pag-aaral at gagawin ang mga kinakailangan ng bawat antas.',
        'Isusuot ko araw-araw ang itinalagang uniform ng paaralan at hindi rin papasok na mahaba o magulo ang buhok.',
        'Hindi ako papasok na huli, liliban sa klase o magbubulakbol sa oras ng klase.',
        'Hindi ako papasok na nakainom, lasing, tutulog o maninigarilyo sa paaralan.',
        'Hindi ako magdadala ng anumang patalim o manggugulo at sasali sa pag-aklas o demonstrasyon.',
        'Hindi ako magdadala o magpapaputok ng anumang klase ng paputok tulad ng rebentador sa paaralan.',
        'Hindi ako magdadala, iinom o kakain ng anumang ipinagbabawal na gamot o sasapi sa mga fraternies.',
        'Hindi ko hahamunin ng away ang aking mga kamag-aral at mga guro.',
        'Hindi ako magdadala, magnanakaw o maninira ng anumang gamit, maghuhuwad ng mga records o lulukuhin ang mga kamag-aral, guro at iba pa.',
        'Hindi ako magsusugal sa loob at labas ng paaralan, at magiging matapat, malinis, maayos, at masunurin.',
        "Ako'y makikiisa sa lahat ng gawaing pampaaralan.",
        'Lalagyan ko ng pabalat ang aking mga hiniram na aklat at isasauli bago matapos ang taong panuruan at babayaran ang anumang kasiraan at pagkawala nito.',
        'Handa akong sumama sa pagtataas ng watawat araw-araw at taos pusong aawitin ang Pambansang Awit ng Pilipinas at ang "EMC Loyalty Song".',
        'Handa akong tumanggap ng anumang nauukol na kaparusahan kapag sinuway ko ang mga nabanggi na kautusan.',
      ];

      // ── Real doc ──────────────────────────────────────────────────────────
      // Page height will be calculated after measuring pledge content in the real doc.
      // Standard 8.5 x 13 inch paper (Philippine Long / Folio): 8.5 * 72 = 612pt, 13 * 72 = 936pt
      const doc = new PDFDocument({
        size: [612, 936],
        margins: { top: 36, bottom: 36, left: 36, right: 36 }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // L, R, W, ROW, SROW already declared above
      let y = 36;

      // ─── helpers ───────────────────────────────────────────────────────────

      const line = (x1, y1, x2, y2) => doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
      const box  = (x, bY, w, h)    => doc.rect(x, bY, w, h).stroke();
      const val  = (text, x, vY, w, opts = {}) => {
        doc.fontSize(9).font('Helvetica').text(String(text || ''), x, vY, { width: w, lineBreak: false, ellipsis: true, ...opts });
      };
      const label = (text, x, lY, opts = {}) => {
        doc.fontSize(10).font('Helvetica').text(text, x, lY, { lineBreak: false, ...opts });
      };
      const labelBold = (text, x, lY, opts = {}) => {
        doc.fontSize(10).font('Helvetica-Bold').text(text, x, lY, { lineBreak: false, ...opts });
      };
      // underlined field: draws a line and places value above it
      const field = (text, x, fY, w) => {
        line(x, fY + 12, x + w, fY + 12);
        val(text, x + 2, fY + 1, w - 4);
      };

      // ─── HEADER ────────────────────────────────────────────────────────────
      try {
        const logoPath = path.join(__dirname, '../public/emc_logo_nobg.png');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, L, y, { width: 52, height: 52 });
        }
      } catch (e) { /* skip logo if missing */ }

      doc.fontSize(12).font('Helvetica-Bold')
        .text('EASTERN MINDORO COLLEGE, INC.', L + 60, y + 8);
      doc.fontSize(9).font('Helvetica')
        .text('Calapan City, Oriental Mindoro', L + 60, y + 23);

      doc.fontSize(13).font('Helvetica-Bold')
        .text('HIGH SCHOOL ENROLLMENT SLIP', R - 210, y + 10, { width: 210, align: 'right' });

      y += 60;

      // ─── ROW 1: Grade Level / STRAND  +  Student Number ────────────────────
      label('Grade Level / STRAND', L, y);
      box(L + 118, y - 2, 120, 15);
      const gradeStrand = [enrollment.gradeLevel, enrollment.strand].filter(Boolean).join(' / ');
      val(gradeStrand, L + 121, y, 114);

      label('Student Number', R - 168, y);
      const sNum = (enrollment.studentNumber || '000000').padEnd(6, '0').substring(0, 6);
      let bx = R - 78;
      for (let i = 0; i < 6; i++) {
        box(bx, y - 2, 13, 15);
        doc.fontSize(10).font('Helvetica-Bold').text(sNum[i] || '0', bx + 3, y);
        bx += 13;
      }
      y += ROW + 4;

      // ─── ROW 2: New/Old  +  School Year  +  Date Enrolled ──────────────────
      label('New', L, y);
      box(L + 24, y - 1, 11, 11);
      if (enrollment.studentType === 'New') {
        doc.fontSize(11).font('ZapfDingbats').text('4', L + 25, y + 7);
      }

      label('Old', L + 42, y);
      box(L + 62, y - 1, 11, 11);
      if (enrollment.studentType === 'Old') {
        doc.fontSize(11).font('ZapfDingbats').text('4', L + 63, y + 7);
      }

      label('School Year:', L + 84, y);
      box(L + 148, y - 2, 100, 15);
      val(enrollment.academicYear || '', L + 151, y, 94);

      label('Date Enrolled', R - 168, y);
      box(R - 88, y - 2, 88, 15);
      val(enrollment.dateEnrolled || '', R - 85, y, 82);
      y += ROW + 4;

      // ─── CREDENTIALS ───────────────────────────────────────────────────────
      box(L, y, W, ROW + 2);
      const credY = y + 5;
      labelBold('CREDENTIAL SUBMITTED:', L + 5, credY);

      const creds = [
        { key: 'f138',  label: 'F138',  x: 155 },
        { key: 'f137a', label: 'F137A', x: 225 },
        { key: 'cert',  label: 'Cert',  x: 300 },
        { key: 'f137e', label: 'F137E', x: 370 },
      ];
      creds.forEach(c => {
        const checked = Array.isArray(enrollment.admissionCredentials) &&
          enrollment.admissionCredentials.includes(c.key);
        // Draw checkbox first, then label to the left of it
        const cbX = L + c.x;
        box(cbX, credY, 11, 11);
        if (checked) {
          // Use ZapfDingbats '4' which renders as a checkmark
          doc.fontSize(10).font('ZapfDingbats').text('4', cbX + 1, credY + 8, { lineBreak: false });
          doc.font('Helvetica'); // reset font
        }
        // Label sits to the left of the checkbox with a small gap
        const lw = doc.fontSize(10).font('Helvetica').widthOfString(c.label);
        label(c.label, cbX - lw - 4, credY);
      });
      y += ROW + 6;

      // ─── PERSONAL INFO BOX ─────────────────────────────────────────────────
      const piTop = y;
      y = piTop + 6;

      // 1. Name + LRN + Sex
      label('1.', L + 4, y);
      label('Name:', L + 16, y);
      const fullName = [enrollment.familyName, enrollment.firstName, enrollment.middleName]
        .filter(Boolean).join(', ');
      field(fullName, L + 46, y, 280);
      label('LRN:', L + 334, y);
      field(enrollment.lrn || '', L + 358, y, 80);
      label('Sex:', L + 446, y);
      field(enrollment.sex || '', L + 468, y, R - L - 468 - 4);
      y += SROW;

      doc.fontSize(8).font('Helvetica')
        .text('(Family Name, First Name, Middle Name)', L + 46, y, { lineBreak: false });
      y += SROW;

      // 2. Date of Birth + Place of Birth
      label('2.', L + 4, y);
      label('Date of Birth:', L + 16, y);
      field(enrollment.dateOfBirth || '', L + 88, y, 110);
      label('Place of Birth:', L + 206, y);
      field(enrollment.placeOfBirth || '', L + 278, y, R - L - 278 - 4);
      y += ROW;

      // 3. Father
      label('3.', L + 4, y);
      label('Father:', L + 16, y);
      field(enrollment.fatherName || '', L + 52, y, 230);
      label('Occupation:', L + 290, y);
      field(enrollment.fatherOccupation || '', L + 352, y, R - L - 352 - 4);
      y += ROW;

      // 4. Mother
      label('4.', L + 4, y);
      label('Mother:', L + 16, y);
      field(enrollment.motherName || '', L + 52, y, 230);
      label('Occupation:', L + 290, y);
      field(enrollment.motherOccupation || '', L + 352, y, R - L - 352 - 4);
      y += ROW;

      // 5. Address of Parents
      label('5.', L + 4, y);
      label('Address of Parents:', L + 16, y);
      field(enrollment.parentsAddress || '', L + 118, y, R - L - 118 - 4);
      y += ROW;

      // 6. Guardian
      label('6.', L + 4, y);
      label('Guardian if any:', L + 16, y);
      field(enrollment.guardianName || '', L + 100, y, 180);
      label('Occupation:', L + 288, y);
      field(enrollment.guardianOccupation || '', L + 350, y, R - L - 350 - 4);
      y += ROW;

      // 7. Address of Guardian
      label('7.', L + 4, y);
      label('Address of Guardian:', L + 16, y);
      field(enrollment.guardianAddress || '', L + 120, y, 190);
      label('Telephone/Mobile no.', L + 318, y);
      field(enrollment.guardianTelephone || '', L + 432, y, R - L - 432 - 4);
      y += ROW;

      // 8. Grade VI School
      label('8.', L + 4, y);
      label('School where you finish Grade VI', L + 16, y);
      field(enrollment.grade6School || '', L + 188, y, R - L - 188 - 4);
      y += ROW;

      label('Located at', L + 16, y);
      field(enrollment.grade6SchoolAddress || '', L + 68, y, 220);
      label('Grade Six, Section', L + 296, y);
      field(enrollment.grade6Section || '', L + 390, y, R - L - 390 - 4);
      y += ROW;

      label('School Year Graduated', L + 16, y);
      field(enrollment.grade6SYStart || '', L + 120, y, 42);
      label('-', L + 165, y);
      field(enrollment.grade6SYEnd || '', L + 172, y, 42);
      label('General Average', L + 222, y);
      field(enrollment.grade6Average || '', L + 308, y, 44);
      label('Remarks', L + 360, y);
      field(enrollment.grade6Remarks || '', L + 400, y, R - L - 400 - 4);
      y += ROW;

      // 9. Last HS Attended
      label('9.', L + 4, y);
      label('Last High School Attended:', L + 16, y);
      field(enrollment.lastHSSchool || '', L + 152, y, R - L - 152 - 4);
      y += ROW;

      doc.fontSize(8.5).font('Helvetica').text('Curriculum Year (G7-G8-G9-G10-G11-G12)', L + 16, y + 1, { lineBreak: false });
      field(enrollment.lastHSCurriculumYear || '', L + 195, y, 55);
      label('Section', L + 258, y);
      field(enrollment.lastHSSection || '', L + 296, y, 76);
      label('School Year', L + 380, y);
      field(enrollment.lastHSSYStart || '', L + 438, y, 36);
      label('-', L + 478, y);
      field(enrollment.lastHSSYEnd || '', L + 486, y, R - L - 486 - 4);
      y += ROW + 4;

      // Draw Personal Info box cleanly around items 1 to 9
      box(L, piTop, W, y - piTop);
      y += 8;

      // ─── PLEDGE BOX ────────────────────────────────────────────────────────
      const pledgeLine1 = 'Ako ay nangangako sa aking pagpapatala na aking susundin ang lahat ng mga alituntunin at regulasyon ng paaralan';
      const pledgeLine2 = 'upang makatapos ng High School sa EASTERN MINDORO COLLEGE';

      const pledgeStartY = y;
      y += 6; // top padding inside box header

      // Title — 2 lines cleanly spaced
      doc.fontSize(9).font('Helvetica-Bold')
        .text(pledgeLine1, L + 6, y, { width: W - 12, align: 'center', lineBreak: false });
      y += 12;
      doc.fontSize(9).font('Helvetica-Bold')
        .text(pledgeLine2, L + 6, y, { width: W - 12, align: 'center', lineBreak: false });
      y += 14;

      // Divider line separating pledge header from numbered items
      line(L, y, R, y);
      y += 8; // clear padding before item 1

      // Pledge items
      doc.fontSize(8.5).font('Helvetica');
      pledgeItems.forEach((item, i) => {
        const text = `${i + 1}. ${item}`;
        const h = doc.heightOfString(text, { width: W - 20, align: 'justify' });
        doc.text(text, L + 10, y, { width: W - 20, align: 'justify', lineGap: 0.5 });
        y += h + 2.5;
      });
      y += 6; // bottom padding

      // Now draw the box around all the content
      box(L, pledgeStartY, W, y - pledgeStartY);

      // ─── SIGNATURES BOX ────────────────────────────────────────────────────
      const sigH = 56;
      box(L, y, W, sigH);
      y += 14;

      // Left signature
      const sigL = L + 30;
      const sigR = R - 30;
      const sigMid = L + W / 2;

      line(sigL, y + 18, sigMid - 20, y + 18);
      doc.fontSize(8.5).font('Helvetica')
        .text('Pangalan at Lagda ng Magulang/Guardian', sigL, y + 20, {
          width: sigMid - 20 - sigL, align: 'center'
        });

      // Right signature
      line(sigMid + 20, y + 18, sigR, y + 18);
      doc.fontSize(8.5).font('Helvetica')
        .text('Pangalan at Lagda ng Mag-aaral', sigMid + 20, y + 20, {
          width: sigR - (sigMid + 20), align: 'center'
        });

      // Write names above lines if provided
      if (enrollment.parentGuardianSignature) {
        doc.fontSize(8).text(enrollment.parentGuardianSignature, sigL, y + 6, {
          width: sigMid - 20 - sigL, align: 'center'
        });
      }
      if (enrollment.studentSignature) {
        doc.fontSize(8).text(enrollment.studentSignature, sigMid + 20, y + 6, {
          width: sigR - (sigMid + 20), align: 'center'
        });
      }

      y += sigH + 6;

      // ─── FOOTER ────────────────────────────────────────────────────────────
      const footerWords = ['Enriching', 'Minds', 'of', 'Champion'];
      const boldFirst = [true, true, false, true]; // E, M, C bold
      let fx = L + W / 2 - 60;

      footerWords.forEach((word, i) => {
        if (boldFirst[i]) {
          doc.fontSize(10).font('Helvetica-Bold').text(word[0], fx, y, { continued: false, lineBreak: false });
          fx += doc.widthOfString(word[0]);
          doc.fontSize(10).font('Helvetica').text(word.slice(1) + (i < 3 ? ' ' : ''), fx, y, { lineBreak: false });
          fx += doc.widthOfString(word.slice(1) + (i < 3 ? ' ' : ''));
        } else {
          doc.fontSize(10).font('Helvetica').text(word + ' ', fx, y, { lineBreak: false });
          fx += doc.widthOfString(word + ' ');
        }
      });

      doc.end();
    } catch (error) {
      console.error('HS PDF Generation Error:', error);
      reject(error);
    }
  });
};
