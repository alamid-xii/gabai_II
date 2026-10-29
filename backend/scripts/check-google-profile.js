// Synthetic browser checks only: all API calls are intercepted before reaching the server.
// Requires the optional Playwright install used by check-registrar-dashboard.js and a running Vite server.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { profileUpdates } from '../services/userProfile.js';

const require = createRequire(path.join(os.tmpdir(), 'gabai-mobile-check', 'package.json'));
const { chromium } = require('playwright');
const origin = process.env.FRONTEND_URL || 'http://localhost:5173';
const initialUser = {
  id: 99, name: 'Google Name', email: 'new@example.com', role: 'student', authProvider: 'google',
  firstName: 'Maria', middleName: null, lastName: 'Santos', mobileNumber: null, profileCompleted: false,
};
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
});
const checks = [];
const errors = [];
let debugPage;

async function fixture(width, completed = false) {
  let user = { ...initialUser, profileCompleted: completed };
  const saves = [];
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
  if (completed) await context.addInitScript(() => localStorage.setItem('token', 'google-profile-test-token'));
  const page = await context.newPage();
  debugPage = page;
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'GET,PUT,POST,OPTIONS',
      'access-control-allow-headers': 'Content-Type,Authorization',
    };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    let status = 200;
    let result = [];
    if (url.pathname === '/api/auth/google/session') result = { user, token: 'google-profile-test-token' };
    else if (url.pathname === '/api/auth/me') result = { user };
    else if (url.pathname === '/api/auth/profile' && request.method() === 'PUT') {
      const body = request.postDataJSON();
      try {
        const changes = profileUpdates(body, user);
        saves.push(body);
        user = { ...user, ...changes };
        result = { user, message: 'Profile updated successfully' };
      } catch (error) {
        status = error.status || 500;
        result = { error: error.message };
      }
    } else if (url.pathname === '/api/school-profile') {
      result = { content: { schoolName: 'Eastern Mindoro College, Inc.', shortName: 'EMC' } };
    } else if (url.pathname === '/api/academic/school-years/active') result = { year: '2026-2027', isActive: true };
    else if (request.method() !== 'GET') {
      status = 400;
      result = { error: 'Unexpected synthetic API mutation blocked.' };
    }
    return route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(result) });
  });
  return { page, context, saves };
}

async function noOverflow(page, description) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), description);
}

async function displayedDetail(page, label, value) {
  const entry = page.locator('dl > div').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) });
  assert.equal((await entry.locator('dd').innerText()).trim(), value);
}

try {
  for (const width of [375, 1440]) {
    const { page, context, saves } = await fixture(width);
    await page.goto(`${origin}/login?google=success`, { waitUntil: 'networkidle' });
    await page.waitForURL('**/complete-profile');
    await page.getByRole('heading', { name: 'Complete your profile', exact: true }).waitFor();
    assert.equal(await page.locator('#profile-firstName').inputValue(), 'Maria');
    assert.equal(await page.locator('#profile-lastName').inputValue(), 'Santos');
    assert.equal(await page.locator('#profile-middleName').inputValue(), '');
    for (const id of ['firstName', 'lastName', 'mobileNumber']) assert.equal(await page.locator(`#profile-${id}`).evaluate(el => el.required), true);
    assert.equal(await page.locator('#profile-middleName').evaluate(el => el.required), false);
    await page.evaluate(() => navigator.clipboard.writeText('Pasted Name'));
    for (const id of ['firstName', 'middleName', 'lastName']) {
      const input = page.locator(`#profile-${id}`);
      const original = await input.inputValue();
      assert.equal(await input.getAttribute('maxlength'), '100');
      await input.focus();
      await input.press('Control+V');
      await page.getByRole('status').filter({ hasText: 'Pasting is disabled for name fields' }).waitFor();
      assert.equal(await input.inputValue(), original, `${id} blocks clipboard paste`);
      await input.fill('a'.repeat(101));
      assert.equal((await input.inputValue()).length, 100, `${id} is limited to 100 characters`);
      await input.fill(original);
    }
    checks.push(`All name fields block paste and enforce 100 characters at ${width}px`);
    await noOverflow(page, `Profile completion overflow at ${width}px`);
    checks.push(`Google callback opens required profile completion at ${width}px`);

    const mobile = page.locator('#profile-mobileNumber');
    assert.equal(await mobile.getAttribute('maxlength'), '11');
    assert.equal(await mobile.getAttribute('inputmode'), 'numeric');
    await mobile.fill('09abc- 12');
    assert.equal(await mobile.inputValue(), '0912', 'Non-digits are removed');
    await mobile.fill('0917123456789');
    assert.equal(await mobile.inputValue(), '09171234567', 'Mobile input is limited to 11 digits');
    await mobile.fill('08171234567');
    await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'starting with 09' }).waitFor();
    assert.equal(saves.length, 0, 'Incorrect prefix must not be saved');
    await mobile.fill('12345');
    await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Enter a valid mobile number' }).waitFor();
    assert.equal(saves.length, 0, 'Invalid mobile must not be saved');
    assert.match(page.url(), /\/complete-profile$/);
    checks.push(`Invalid phone blocked before save at ${width}px`);

    await page.goto(`${origin}/my-enrollments`, { waitUntil: 'networkidle' });
    await page.waitForURL('**/complete-profile');
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Complete your profile', exact: true }).waitFor();
    checks.push(`Incomplete account cannot skip completion or bypass it by reload at ${width}px`);

    await page.locator('#profile-mobileNumber').fill('09171234567');
    await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
    await page.waitForURL('**/my-enrollments');
    await page.getByRole('heading', { name: 'My Enrollments', exact: true }).waitFor();
    assert.equal(saves.length, 1);
    assert.equal(saves[0].middleName, '', 'Blank middle name is accepted');
    await noOverflow(page, `My enrollments overflow at ${width}px`);

    await page.goto(`${origin}/profile`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'My Profile', exact: true }).waitFor();
    await displayedDetail(page, 'First name', 'Maria');
    await displayedDetail(page, 'Middle name', 'Not provided');
    await displayedDetail(page, 'Last name', 'Santos');
    await displayedDetail(page, 'Mobile number', '09171234567');
    await displayedDetail(page, 'Sign-in method', 'Google');
    await noOverflow(page, `Profile overflow at ${width}px`);
    checks.push(`Saved structured name, optional middle name and phone appear in Profile at ${width}px`);

    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Edit details', exact: true }).click();
    assert.equal(await page.locator('#profile-firstName').inputValue(), 'Maria');
    assert.equal(await page.locator('#profile-middleName').inputValue(), '');
    assert.equal(await page.locator('#profile-mobileNumber').inputValue(), '09171234567');
    await page.locator('#profile-firstName').fill('Maria Clara');
    await page.locator('#profile-middleName').fill('Dela');
    await page.locator('#profile-mobileNumber').fill('09181234567');
    await page.getByRole('button', { name: 'Save details', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Your profile details have been saved' }).waitFor();
    assert.equal(saves.length, 2);
    await page.reload({ waitUntil: 'networkidle' });
    await displayedDetail(page, 'First name', 'Maria Clara');
    await displayedDetail(page, 'Middle name', 'Dela');
    await displayedDetail(page, 'Mobile number', '09181234567');
    await noOverflow(page, `Saved profile overflow at ${width}px`);
    checks.push(`Profile edits survive session restore and reload at ${width}px`);
    await context.close();
  }

  const legacy = await fixture(375, true);
  await legacy.page.goto(`${origin}/my-enrollments`, { waitUntil: 'networkidle' });
  await legacy.page.getByRole('heading', { name: 'My Enrollments', exact: true }).waitFor();
  assert.match(legacy.page.url(), /\/my-enrollments$/);
  await legacy.page.reload({ waitUntil: 'networkidle' });
  await legacy.page.getByRole('heading', { name: 'My Enrollments', exact: true }).waitFor();
  checks.push('Legacy completed Google accounts are not forced to complete profile');
  await legacy.context.close();
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} catch (error) {
  console.error('Google profile browser diagnostic:', { url: debugPage?.url(), errors, text: await debugPage?.locator('body').innerText().catch(() => '') });
  throw error;
} finally {
  await browser.close();
}
