// Read-only browser checks. Uses synthetic API responses; never changes the database.
// Reuses the optional Playwright installation documented in TESTING_AND_DEPLOYMENT.md.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { buildRegistrarDashboard, schoolLevelOf } from '../services/registrarDashboard.js';

const require = createRequire(path.join(os.tmpdir(), 'gabai-mobile-check', 'package.json'));
const { chromium } = require('playwright');
const schoolYears = [{ year: '2026-2027', isActive: true }, { year: '2025-2026', isActive: false }];
const base = { academicYear: '2026-2027', educationLevel: 'JHS', enrollmentType: 'new', lifeStatus: 'enrolled', gradeLevel: 'Grade 7', firstName: 'Test', familyName: 'Student', createdAt: '2026-10-01T08:00:00Z', updatedAt: '2026-10-02T08:00:00Z' };
const records = [
  { ...base, id: 1, userId: 1, status: 'enrolled', sectionId: 1 },
  { ...base, id: 2, userId: 2, status: 'active', educationLevel: 'SHS', gradeLevel: 'Grade 11', sectionId: 2, enrollmentType: 'old' },
  { ...base, id: 3, userId: 3, status: 'submitted', gradeLevel: 'Grade 9' },
  { ...base, id: 4, userId: 4, status: 'verified', educationLevel: 'SHS', gradeLevel: 'Grade 11', enrollmentType: 'transferee' },
  { ...base, id: 5, userId: 5, status: 'approved' },
  { ...base, id: 6, userId: 6, status: 'returned' },
  { ...base, id: 7, userId: 7, status: 'pending_exam', sscApplied: true },
];
const sections = [
  { id: 1, code: 'Regular A', course: 'JHS', yearLevel: 7, capacity: 40, schoolYear: '2026-2027', isActive: true },
  { id: 2, code: 'STEM A', course: 'SHS', strand: 'STEM', yearLevel: 11, capacity: 40, schoolYear: '2026-2027', isActive: true },
];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [];
const checks = [];
let debugPage;
try {
  const context = await browser.newContext();
  await context.addInitScript(() => localStorage.setItem('token', 'dashboard-test-token'));
  const page = await context.newPage();
  debugPage = page;
  page.on('pageerror', error => errors.push(error.message));
  let failDashboard = false;
  let noActiveYear = false;
  const requests = [];
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const query = Object.fromEntries(url.searchParams);
    let result = [];
    let status = 200;
    if (url.pathname === '/api/auth/me') result = { user: { id: 99, name: 'Test Registrar', role: 'registrar' } };
    else if (url.pathname === '/api/registrar/dashboard') {
      requests.push(query);
      if (failDashboard) { status = 503; result = { error: 'Dashboard unavailable for test' }; }
      else result = buildRegistrarDashboard({ records, sections, schoolYears: noActiveYear ? schoolYears.map(year => ({ ...year, isActive: false })) : schoolYears, query });
    } else if (url.pathname === '/api/academic/school-years') result = schoolYears;
    else if (url.pathname === '/api/registrar/enrollments') {
      result = records.filter(record => (!query.academicYear || record.academicYear === query.academicYear) &&
        (!query.schoolLevel || query.schoolLevel === 'all' || schoolLevelOf(record) === query.schoolLevel) &&
        (!query.enrollmentType || query.enrollmentType === 'all' || record.enrollmentType === query.enrollmentType));
    } else if (/^\/api\/enrollments\/\d+$/.test(url.pathname)) result = records.find(record => record.id === Number(url.pathname.split('/').pop()));
    else if (url.pathname === '/api/admin/sections') result = sections;
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(result), headers: { 'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true' } });
  });
  async function selectFilter(label, value, parameter) {
    const response = page.waitForResponse(result => {
      const url = new URL(result.url());
      return url.pathname === '/api/registrar/dashboard' && url.searchParams.get(parameter) === value;
    });
    await page.getByLabel(label, { exact: true }).selectOption(value);
    await response;
    await page.getByRole('heading', { name: 'Enrollment by grade level' }).waitFor();
  }

  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('http://localhost:5173/registrar', { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Enrollment by grade level' }).waitFor();
    await page.getByRole('heading', { name: 'Application status', exact: true }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Review Test Student', exact: true }).count(), 2);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `Page overflow at ${width}px`);
    checks.push(`Live dashboard layout and charts at ${width}px`);
  }

  await selectFilter('School level / class', 'shs', 'schoolLevel');
  await page.getByRole('heading', { name: 'Application status', exact: true }).waitFor();
  await page.waitForLoadState('networkidle');
  assert.equal(requests.at(-1).schoolLevel, 'shs');
  assert.equal(await page.getByRole('link', { name: 'Review Test Student', exact: true }).count(), 1);
  await selectFilter('Enrollment type', 'new', 'enrollmentType');
  await page.waitForLoadState('networkidle');
  await page.getByText('No applications awaiting review for these filters.').waitFor();
  checks.push('School-level and type filters update the queue and empty state');

  await selectFilter('School year', '2025-2026', 'academicYear');
  await page.waitForLoadState('networkidle');
  assert.equal(requests.at(-1).academicYear, '2025-2026');
  await page.getByText('No enrolled students for these filters.').waitFor();
  checks.push('Historical school-year filtering and empty chart');

  await page.goto('http://localhost:5173/registrar', { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: 'Review Test Student', exact: true }).first().click();
  await page.waitForURL(/application=3/);
  await page.getByRole('button', { name: /Verify & Approve/ }).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('academicYear'), '2026-2027');
  checks.push('Review link opens the existing actionable enrollment detail');

  await page.goto('http://localhost:5173/registrar', { waitUntil: 'networkidle' });
  await selectFilter('School level / class', 'shs', 'schoolLevel');
  await page.waitForLoadState('networkidle');
  await page.getByRole('link', { name: 'Manage sections', exact: true }).click();
  await page.waitForURL(/registrar\/sections/);
  assert.equal(new URL(page.url()).searchParams.get('schoolLevel'), 'shs');
  assert.equal(new URL(page.url()).searchParams.get('academicYear'), '2026-2027');
  checks.push('Section shortcut preserves school-year and school-level context');

  failDashboard = true;
  await page.goto('http://localhost:5173/registrar', { waitUntil: 'networkidle' });
  await page.getByRole('alert').filter({ hasText: 'Dashboard unavailable for test' }).waitFor();
  failDashboard = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByRole('heading', { name: 'Enrollment by grade level' }).waitFor();
  checks.push('Server errors show a retry action that restores the dashboard');
  noActiveYear = true;
  await page.goto('http://localhost:5173/registrar', { waitUntil: 'networkidle' });
  await page.getByText(/No active school year is configured/).waitFor();
  assert.equal(await page.getByRole('link', { name: /Review applications/ }).count(), 0);
  await selectFilter('School year', '2025-2026', 'academicYear');
  assert.equal(await page.getByRole('link', { name: /Review applications/ }).count(), 1);
  checks.push('No active year disables shortcuts until a school year is chosen');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} catch (error) {
  console.error('Browser diagnostic:', { url: debugPage?.url(), errors, text: await debugPage?.locator('body').innerText().catch(() => '') });
  throw error;
} finally { await browser.close(); }
