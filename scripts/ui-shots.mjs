#!/usr/bin/env node
// Captures every page of the UI climb (docs/ui-climb/plan.md) at phone and desktop size, light
// and dark, as full-page PNGs named <page>-<phone|desktop>-<light|dark>.png.
//
//   node scripts/ui-shots.mjs --base http://127.0.0.1:5273 --out docs/ui-climb/shots/r1
//     [--api http://127.0.0.1:3101] [--only course,search] [--no-login]
//
// Example URLs come from the `just seed` fixtures (nthu/ntnu/nycu demo courses) and are looked up
// through the API, so ids stay right after a reseed. Pages that need community content (thread,
// profile, ratings on the course page) get it from a throwaway account the script registers on
// the API and reuses on later runs; the same account's session cookie makes the logged-in shots
// (settings, forum compose, rating form).
//
// Playwright comes from apps/web/node_modules (no install at the repo root needed).

import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = createRequire(path.join(root, 'apps/web/package.json'))('@playwright/test');

const args = parseArgs(process.argv.slice(2));
const base = (args.base ?? 'http://127.0.0.1:5273').replace(/\/$/, '');
const api = (args.api ?? process.env.API_ORIGIN ?? 'http://127.0.0.1:3101').replace(/\/$/, '');
const out = path.resolve(args.out ?? 'docs/ui-climb/shots/r0');
const only = args.only ? new Set(args.only.split(',')) : null;
const login = !('no-login' in args);

const VIEWPORTS = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 }
};
const SCHEMES = ['light', 'dark'];
/** Tallest capture in CSS px; judges see the top of long tables, which is where the design lives. */
const MAX_HEIGHT = 4500;

// Throwaway account for the community pages. Password lives only here and in the local database.
const ACCOUNT = { username: 'ui_climb_demo', password: 'ui-climb-demo-pass', displayName: 'UI 示範帳號' };
/** A username the script locks on purpose (more than 10 failed sign-ins), to show the too-many-attempts state. */
const LOCKED = 'ui_climb_locked';

const fixtures = await prepareFixtures();
const pages = examplePages(fixtures);

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const failures = [];
for (const page of pages) {
  if (only && !only.has(page.id)) continue;
  for (const [device, options] of Object.entries(VIEWPORTS)) {
    for (const scheme of SCHEMES) {
      const context = await browser.newContext({ ...options, colorScheme: scheme, locale: 'zh-TW', timezoneId: 'Asia/Taipei' });
      if (page.loggedIn && fixtures.session) {
        const { hostname } = new URL(base);
        await context.addCookies([{ name: 'uc_session', value: fixtures.session, domain: hostname, path: '/' }]);
      }
      const tab = await context.newPage();
      const file = path.join(out, `${page.id}-${device}-${scheme}.png`);
      try {
        const response = await tab.goto(base + page.url, { waitUntil: 'networkidle', timeout: 60_000 });
        const status = response?.status();
        if (status !== (page.status ?? 200)) failures.push(`${page.id}: HTTP ${status} for ${page.url}`);
        // State shots drive the page (fill a form, submit) before the capture.
        if (page.act) await page.act(tab);
        // Let fonts and any late layout settle before the capture.
        await tab.evaluate(() => document.fonts?.ready);
        await tab.waitForTimeout(250);
        // Full page, but capped so a 150-row table does not become a 13 MB PNG.
        const height = Math.min(await tab.evaluate(() => document.documentElement.scrollHeight), page.maxHeight ?? MAX_HEIGHT);
        await tab.screenshot({ path: file, fullPage: true, type: 'png', clip: { x: 0, y: 0, width: options.viewport.width, height } });
        // The document title goes to the log, so judges can check <title> without opening the page.
        console.log(`${path.basename(file)}  ${status}  ${await tab.title()}`);
      } catch (error) {
        failures.push(`${page.id} ${device} ${scheme}: ${error.message.split('\n')[0]}`);
      }
      await context.close();
    }
  }
}
await browser.close();

if (failures.length) {
  console.error('\nProblems:\n  ' + failures.join('\n  '));
  process.exitCode = 1;
}

/** One entry per page id in plan.md, plus a few state shots judges need for the `states` dimension. */
function examplePages(f) {
  return [
    { id: 'home', url: '/' },
    { id: 'search', url: `/?q=${encodeURIComponent('資料')}&school=&term=all` },
    { id: 'course', url: `/courses/${f.courseId}`, loggedIn: true },
    // Optional: a course with indexed external reviews (UI_SHOTS_REVIEWED_COURSE=<offering id>).
    ...(process.env.UI_SHOTS_REVIEWED_COURSE ? [{ id: 'course-reviewed', url: `/courses/${process.env.UI_SHOTS_REVIEWED_COURSE}` }] : []),
    { id: 'schools', url: '/schools' },
    { id: 'school', url: `/schools/${f.school}` },
    { id: 'department', url: `/schools/${f.school}/departments/${encodeURIComponent(f.department)}` },
    { id: 'instructor', url: `/instructors/${f.school}/${encodeURIComponent(f.instructor)}` },
    { id: 'forum', url: '/forum', loggedIn: true },
    { id: 'thread', url: f.postId ? `/forum/${f.postId}` : '/forum', loggedIn: true },
    // The same thread without a session (登入後即可回覆), and a thread nobody has answered yet.
    { id: 'thread-signed-out', url: f.postId ? `/forum/${f.postId}` : '/forum' },
    { id: 'thread-empty', url: f.emptyPostId ? `/forum/${f.emptyPostId}` : '/forum', loggedIn: true },
    { id: 'auth', url: '/auth' },
    { id: 'settings', url: '/settings', loggedIn: true },
    { id: 'settings-saved', url: '/settings', loggedIn: true, act: saveSettings },
    { id: 'profile', url: `/u/${ACCOUNT.username}` },
    { id: 'landscape', url: '/landscape', maxHeight: 9000 },
    { id: 'legal', url: '/terms' },
    { id: 'legal-privacy', url: '/privacy' },
    // Extra state shots (not page ids): empty search, 404, auth register tab and the auth states
    // (wrong password, locked username, already signed in, register with a taken name).
    { id: 'search-empty', url: `/?q=${encodeURIComponent('zzzz-no-such-course')}&term=all` },
    { id: 'notfound', url: '/courses/999999999', status: 404 },
    { id: 'auth-register', url: '/auth?mode=register' },
    // The sign-in request held open, so the page shows its pending state (登入中…, aria-busy).
    { id: 'auth-pending', url: '/auth', act: pendingLogin },
    { id: 'auth-error', url: `/auth?next=${encodeURIComponent('/forum?compose=1')}`, act: (tab) => failLogin(tab, `nobody_${Date.now().toString(36)}`) },
    { id: 'auth-locked', url: '/auth', act: async (tab) => { await lockUsername(); await failLogin(tab, LOCKED); } },
    { id: 'auth-signed-in', url: '/auth', loggedIn: true },
    { id: 'auth-register-error', url: '/auth?mode=register', act: registerTaken }
  ];
}

/** Submits the sign-in form with a wrong password and waits for the alert. */
async function failLogin(tab, username) {
  await tab.getByLabel('帳號').fill(username);
  await tab.getByLabel('密碼').fill('not-the-password');
  await tab.getByRole('button', { name: '登入' }).click();
  await tab.getByRole('alert').waitFor();
}

/**
 * Changes the bio and saves, then waits for the 已儲存 status. The two sentences alternate between runs,
 * so there is always a change to save and the profile keeps a natural-looking bio.
 */
async function saveSettings(tab) {
  // Every variant must show the same saved text, so judges can compare light and dark. Saving needs a
  // change, so when the bio already holds the final sentence, save the other one first (not captured).
  const bio = tab.getByLabel('自我介紹');
  const [interim, final] = ['資工系大三，常修跨院的通識與統計課。', '資工系大三，喜歡演算法與系統課。'];
  const save = async (text) => {
    await bio.fill(text);
    await tab.getByRole('button', { name: '儲存' }).click();
    await tab.getByRole('status').getByText('已儲存').waitFor();
  };
  if ((await bio.inputValue()) === final) await save(interim);
  await save(final);
}

/** Holds the sign-in request for a while and captures the form while it is pending. */
async function pendingLogin(tab) {
  await tab.route((url) => url.pathname === '/auth' && url.search.startsWith('?/login'), async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 15_000));
    await route.continue();
  });
  await tab.getByLabel('帳號').fill(ACCOUNT.username);
  await tab.getByLabel('密碼').fill(ACCOUNT.password);
  await tab.getByRole('button', { name: '登入' }).click();
  await tab.locator('button[aria-busy="true"]').waitFor();
}

/** Submits the register form with the throwaway account's name, which is already taken. */
async function registerTaken(tab) {
  await tab.getByLabel('帳號').fill(ACCOUNT.username);
  await tab.getByLabel('密碼').fill('correct horse battery');
  await tab.getByRole('button', { name: '建立帳號' }).click();
  await tab.getByRole('alert').waitFor();
}

/**
 * Finds example ids in the seeded catalog and makes sure the throwaway account, one thread with a
 * reply and one rating exist, so every page has something to show.
 */
async function prepareFixtures() {
  // Prefer the most-taken course that is still offered, so course/school/department/instructor pages show
  // several terms of history; fall back to any offering for the small demo fixtures.
  const ranked = await getJson(`${api}/api/rankings/courses?limit=20`);
  const top = Array.isArray(ranked) ? ranked.find((r) => r.latestActiveOfferingId && r.terms > 1) : null;
  const topOffering = top ? await getJson(`${api}/api/courses/${top.latestActiveOfferingId}`) : null;
  const courses = await getJson(`${api}/api/courses?limit=50`);
  if (!Array.isArray(courses) || courses.length === 0) {
    throw new Error(`No offerings at ${api}; run \`just seed\` against this API's database first.`);
  }
  // Prefer an offering with department, instructors and enrolment so the detail page is full.
  const course =
    (topOffering?.department && topOffering.instructors?.length ? topOffering : null) ??
    courses.find((c) => c.department && c.instructors.length && c.enrolled != null) ??
    courses.find((c) => c.department && c.instructors.length) ??
    courses[0];
  const fixtures = {
    courseId: course.id,
    school: course.school,
    courseCode: course.courseCode,
    department: course.department ?? '',
    instructor: course.instructors[0] ?? '',
    session: null,
    postId: null,
    emptyPostId: null
  };
  if (!login) return fixtures;

  fixtures.session = await signIn();
  if (!fixtures.session) {
    console.warn('Could not sign in on the API; logged-in shots will render signed out.');
    return fixtures;
  }
  const headers = { 'content-type': 'application/json', cookie: `uc_session=${fixtures.session}` };

  // One thread about the example course, with one reply, created once and reused.
  // Pick the thread that has replies: the newest post may be the zero-reply fixture below.
  const mine = await getJson(`${api}/api/posts?school=${course.school}&courseCode=${encodeURIComponent(course.courseCode)}&pageSize=50`);
  const answered = mine?.posts?.find((post) => post.replyCount > 0);
  if (answered) {
    fixtures.postId = answered.id;
  } else {
    const post = await fetch(`${api}/api/posts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'question',
        title: `${course.title} 作業量和給分如何？`,
        content: '想請問修過的同學：\n\n1. 每週作業大概要花多少時間？\n2. 期中期末的比重？\n3. 老師上課會點名嗎？\n\n先謝謝大家。',
        school: course.school,
        courseCode: course.courseCode,
        tags: ['作業', '給分']
      })
    }).then((r) => (r.ok ? r.json() : null));
    if (post?.id) {
      fixtures.postId = post.id;
      await fetch(`${api}/api/posts/${post.id}/replies`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: '作業每週約 3 小時，期中 30%、期末 40%，其餘是作業。老師不點名，但小考會算分。' })
      });
      await fetch(`${api}/api/posts/${post.id}/vote`, { method: 'PUT', headers, body: JSON.stringify({ value: 1 }) });
    }
  }

  // A second thread about the course with no replies, for the empty-replies state; created once and reused.
  const EMPTY_TITLE = `${course.title} 有人想一起組讀書會嗎？`;
  const listed = await getJson(`${api}/api/posts?school=${course.school}&courseCode=${encodeURIComponent(course.courseCode)}&pageSize=50`);
  const empty = listed?.posts?.find((post) => post.title === EMPTY_TITLE && post.replyCount === 0);
  if (empty) {
    fixtures.emptyPostId = empty.id;
  } else {
    const post = await fetch(`${api}/api/posts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'article',
        title: EMPTY_TITLE,
        content: '這學期修這門課，想找幾位同學每週一起討論作業和整理筆記。\n\n有興趣的話回覆一下，再約時間。',
        school: course.school,
        courseCode: course.courseCode,
        tags: ['讀書會']
      })
    }).then((r) => (r.ok ? r.json() : null));
    if (post?.id) fixtures.emptyPostId = post.id;
  }

  // One rating with a review on the example course.
  await fetch(`${api}/api/courses/${course.school}/${encodeURIComponent(course.courseCode)}/ratings/me`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ score: 4, review: '講解清楚，作業量適中。期末範圍很大，建議平時就跟上進度。' })
  });
  return fixtures;
}

/** Burns the per-username limit (10 failed attempts a minute) on LOCKED right before its shot, so the lock is fresh. */
async function lockUsername() {
  for (let i = 0; i < 11; i++) {
    await fetch(`${api}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: LOCKED, password: `wrong-password-${i}` })
    });
  }
}

/** Registers the throwaway account (or signs in when it already exists) and returns the session token. */
async function signIn() {
  for (const route of ['register', 'login']) {
    const body = route === 'register' ? ACCOUNT : { username: ACCOUNT.username, password: ACCOUNT.password };
    const response = await fetch(`${api}/api/auth/${route}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) continue;
    for (const header of response.headers.getSetCookie()) {
      const match = /^uc_session=([^;]+)/.exec(header);
      if (match) return match[1];
    }
  }
  return null;
}

async function getJson(url) {
  const response = await fetch(url);
  return response.ok ? response.json() : null;
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      i++;
    } else parsed[key] = true;
  }
  return parsed;
}
