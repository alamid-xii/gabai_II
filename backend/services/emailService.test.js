import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
test('SSC schedule email includes the exam date and original report card reminder', async () => {
  const createTransport = nodemailer.createTransport;
  const originalUser = process.env.EMAIL_USER, originalPassword = process.env.EMAIL_PASSWORD;
  const messages = [];
  try {
    process.env.EMAIL_USER = 'test@example.com'; process.env.EMAIL_PASSWORD = 'test-placeholder';
    nodemailer.createTransport = () => ({ sendMail: async message => { messages.push(message); return {}; } });
    const { sendSSCExamScheduledEmail, sendSSCResultEmail, sendEnrollmentReturnedEmail } = await import('./emailService.js');
    await sendSSCExamScheduledEmail({ name: 'Test Student', email: 'student@example.com' }, { id: 1, sscExamDate: '2027-03-20', sscPassingScore: 75 });
    assert.equal(messages.length, 1);
    assert.equal(messages[0].to, 'student@example.com');
    assert.match(messages[0].html, /original report card/);
    assert.match(messages[0].html, /scheduled exam date/);
    assert.match(messages[0].html, /March/);
    assert.match(messages[0].html, /2027/);
    assert.match(messages[0].html, /valid school ID/);
    await sendSSCResultEmail({ name: 'Test Student', email: 'student@example.com' }, { id: 1, sscResult: 'passed', sscExamScore: 90, sscClass: 'SSC' });
    assert.match(messages[1].html, /five-step enrollment form/);
    assert.match(messages[1].html, /my-enrollments/);
    assert.match(messages[1].html, /PASSED/);
    await sendEnrollmentReturnedEmail({ name: 'Test Student', email: 'student@example.com' }, { id: 7 }, 'Correct parent contact');
    assert.match(messages[2].html, /hs-enrollment-form\/7/);
    assert.doesNotMatch(messages[2].html, /\/resubmit\//);
  } finally {
    nodemailer.createTransport = createTransport;
    if (originalUser === undefined) delete process.env.EMAIL_USER; else process.env.EMAIL_USER = originalUser;
    if (originalPassword === undefined) delete process.env.EMAIL_PASSWORD; else process.env.EMAIL_PASSWORD = originalPassword;
  }
});
