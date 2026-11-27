import { expect, test, type Page } from '@playwright/test';

const API = 'http://127.0.0.1:3001';

/** The rating count shown in the course's 課程評價 summary. */
async function ratingCount(page: Page) {
  const ratings = page.locator('#ratings');
  if (await ratings.getByText('尚無評價', { exact: true }).count()) return 0;
  const text = await ratings.getByText(/\d+ 則評價/).textContent();
  return Number(text?.match(/(\d+) 則評價/)?.[1]);
}

/**
 * Opens the nav's account menu. It closes after each navigation, and a click that lands before
 * hydration can be undone by it, so retry until the menu's links are visible.
 */
async function openMenu(page: Page) {
  const nav = page.getByRole('navigation', { name: '主要導覽' });
  const account = nav.getByLabel('帳號選單');
  await expect(async () => {
    // The summary's parent is the menu's <details>.
    if (!(await account.locator('xpath=..').evaluate((details) => (details as HTMLDetailsElement).open))) {
      await account.click();
    }
    await expect(nav.getByRole('link', { name: '個人頁面' })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 10_000 });
}

test('registers, rates a course, posts a linked question, replies, votes and logs out', async ({ page, request }) => {
  // The fixture's 115-1 線性代數 offering at nthu (DEMO201), looked up through the API.
  const search = await request.get(`${API}/api/courses`, { params: { q: '線性', school: 'nthu', term: '115-1' } });
  const [course] = (await search.json()) as { id: string; courseCode: string }[];
  expect(course?.courseCode).toBe('DEMO201');

  const username = `e2e_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const title = `請問 ${username} 期中考範圍`;

  // Anonymous visitors get a sign-in link that comes back to the course.
  await page.goto(`/courses/${course.id}`);
  const ratings = page.locator('#ratings');
  await expect(ratings.getByRole('heading', { name: '課程評價' })).toBeVisible();
  await ratings.getByRole('link', { name: '登入', exact: true }).click();
  await expect(page).toHaveURL(/\/auth\?next=/);

  await page.getByRole('link', { name: '註冊', exact: true }).click();
  await expect(page.getByRole('heading', { name: '建立帳號' })).toBeVisible();
  await page.getByLabel('帳號').fill(username);
  await page.getByLabel('密碼').fill('correct horse battery');
  // The optional display name sits in a collapsed「加上顯示名稱」section.
  await page.getByText('加上顯示名稱').click();
  await page.getByLabel('顯示名稱').fill('測試同學');
  await page.getByRole('button', { name: '註冊' }).click();

  await expect(page).toHaveURL(new RegExp(`/courses/${course.id}`));
  const nav = page.getByRole('navigation', { name: '主要導覽' });
  const account = nav.getByLabel('帳號選單');
  await expect(account).toContainText(`@${username}`);

  // Rate it; the stats count goes up by one and the review is listed.
  const before = await ratingCount(page);
  await ratings.getByRole('radio', { name: '4 分', exact: true }).check();
  await ratings.getByLabel('評論（選填）').fill(`老師講解清楚。\n作業偏多 ${username}`);
  await ratings.getByRole('button', { name: '送出評價' }).click();
  await expect(ratings.getByText('已儲存你的評價。')).toBeVisible();
  await expect(ratings.getByText(`${before + 1} 則評價`)).toBeVisible();
  await expect(ratings.getByRole('listitem').filter({ hasText: `作業偏多 ${username}` })).toContainText('測試同學');
  await expect(ratings.getByRole('button', { name: '更新評價' })).toBeVisible();
  await expect(ratings.getByRole('radio', { name: '4 分', exact: true })).toBeChecked();

  // Post a question linked to the course from its 站內討論 section.
  await page.getByRole('region', { name: /站內討論/ }).getByRole('link', { name: '在論壇查看' }).click();
  await expect(page).toHaveURL(/\/forum\?school=nthu&courseCode=DEMO201/);
  await expect(page.getByRole('group', { name: '已套用的篩選' })).toContainText('DEMO201');
  // The compose drawer opens from the page head and is prefilled with the course.
  const compose = page.getByRole('region', { name: '發表文章' });
  // A cold dev server can reload the page right after navigation, which closes the drawer, so open it
  // and wait for the course lookup as one retried step.
  await expect(async () => {
    const drawer = page.locator('summary', { hasText: '發表文章' });
    if (!(await compose.getByLabel('標題').isVisible())) await drawer.click();
    await expect(compose.getByLabel('相關課號')).toHaveValue('DEMO201', { timeout: 1000 });
    await expect(compose.getByText('✓ 線性代數')).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 30_000 });
  await compose.getByRole('radio', { name: '提問' }).check();
  await compose.getByLabel('標題').fill(title);
  await compose.getByLabel('內容', { exact: true }).fill('第一行\n<b>不是粗體</b>');
  await compose.getByLabel('標籤').fill('期中考, 線代');
  await compose.getByRole('button', { name: '發表', exact: true }).click();

  await expect(page).toHaveURL(/\/forum\/\d+$/);
  const thread = page.getByRole('article', { name: title });
  await expect(thread.getByRole('heading', { name: title })).toBeVisible();
  // Plain text: the markup is shown literally and the line break is kept.
  const content = thread.locator('.content');
  await expect(content).toBeVisible();
  expect(await content.innerText()).toBe('第一行\n<b>不是粗體</b>');
  await expect(thread.locator('b')).toHaveCount(0);
  await expect(thread.getByRole('link', { name: '#期中考' })).toBeVisible();
  // The side card links back to the course.
  const card = page.getByRole('complementary', { name: '這門課' });
  await expect(card.getByRole('link', { name: '查看課程' })).toHaveAttribute('href', `/courses/${course.id}`);

  // Reply, then upvote the question.
  await page.getByLabel('我要回覆').fill(`同問 ${username}`);
  await page.getByRole('button', { name: '送出回覆' }).click();
  await expect(page.getByRole('heading', { name: '回覆（1）' })).toBeVisible();
  await expect(page.getByRole('article', { name: '測試同學 的回覆' }).locator('.content')).toHaveText(`同問 ${username}`);
  await expect(page.getByLabel('我要回覆')).toHaveValue('');

  // The author can edit their reply.
  const reply = page.getByRole('article', { name: '測試同學 的回覆' });
  await reply.locator('summary', { hasText: '編輯' }).click();
  await reply.getByLabel('內容').fill(`同問，補充 ${username}`);
  await reply.getByRole('button', { name: '儲存修改' }).click();
  await expect(reply.locator('.content')).toHaveText(`同問，補充 ${username}`);

  const upvote = thread.getByRole('button', { name: '推', exact: true });
  await expect(upvote).toHaveAttribute('aria-pressed', 'false');
  await upvote.click();
  await expect(upvote).toHaveAttribute('aria-pressed', 'true');
  await expect(thread.getByLabel('文章分數')).toHaveText('+1');

  // The forum list for the course shows the thread with its reply and score.
  await page.goto('/forum?school=nthu&courseCode=DEMO201');
  await expect(page.getByRole('link', { name: title })).toBeVisible();

  // Both show up on the public profile, linked from the account menu.
  // The menu closes on every navigation (including late hydration), so open and click as one retried step.
  await expect(async () => {
    await openMenu(page);
    await nav.getByRole('link', { name: '個人頁面' }).click({ timeout: 1000 });
    await expect(page).toHaveURL(/\/u\//, { timeout: 2000 });
  }).toPass({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: '測試同學' })).toBeVisible();
  await expect(page.getByRole('group', { name: '活動統計' })).toContainText('課程評價');
  await expect(page.getByRole('img', { name: '4 分（滿分 5 分）' })).toBeVisible();
  await expect(page.getByRole('link', { name: '線性代數' })).toHaveAttribute('href', `/courses/${course.id}`);
  await expect(page.getByText(`作業偏多 ${username}`)).toBeVisible();
  await expect(page.getByRole('link', { name: title })).toBeVisible();

  // Deleting the thread takes a confirm step; afterwards it is a 404.
  await page.getByRole('link', { name: title }).click();
  await expect(page).toHaveURL(/\/forum\/\d+$/);
  const threadUrl = page.url();
  await thread.locator('summary', { hasText: '刪除' }).click();
  await thread.getByRole('button', { name: '確定刪除' }).click();
  await expect(page).toHaveURL(/\/forum$/);
  expect((await page.goto(threadUrl))?.status()).toBe(404);

  // Logging out is a POST; afterwards the nav offers sign-in again and rating needs a login.
  await openMenu(page);
  await nav.getByRole('button', { name: '登出' }).click();
  await expect(nav.getByRole('link', { name: '登入／註冊' })).toBeVisible();
  await page.goto(`/courses/${course.id}`);
  await expect(ratings.getByRole('link', { name: '登入', exact: true })).toBeVisible();
  await expect(ratings.getByRole('button', { name: '送出評價' })).toHaveCount(0);
});

test('rejects a wrong password inline and keeps next on the same origin', async ({ page }) => {
  await page.goto('/auth?next=//evil.example/');
  await page.getByLabel('帳號').fill('nobody_here');
  await page.getByLabel('密碼').fill('wrong password');
  await page.getByRole('button', { name: '登入' }).click();
  await expect(page.getByRole('alert')).toHaveText('帳號或密碼錯誤。');
  await expect(page.locator('input[name="next"]')).toHaveValue('/');
});

test('a missing thread is a 404 page', async ({ page }) => {
  const response = await page.goto('/forum/999999999');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: '找不到這篇文章' })).toBeVisible();
  await expect(page.getByRole('link', { name: '回論壇' })).toHaveAttribute('href', '/forum');
});

test('the forum lists posts with category counts and an empty state', async ({ page }) => {
  await page.goto('/forum');
  const types = page.getByRole('navigation', { name: '文章分類' });
  await expect(types.getByRole('link', { name: /^全部/ })).toHaveAttribute('aria-current', 'true');
  await types.getByRole('link', { name: /^提問/ }).click();
  await expect(page).toHaveURL(/type=question/);
  await page.goto('/forum?q=zzzz-no-such-post');
  await expect(page.getByText('沒有符合的文章')).toBeVisible();
  await expect(page.getByRole('link', { name: '清除篩選' })).toHaveAttribute('href', '/forum');
  // Signed out, 發表文章 leads to sign-in and back to the compose drawer.
  await expect(page.getByRole('link', { name: '發表文章' }).first()).toHaveAttribute('href', /\/auth\?next=%2Fforum%3Fcompose%3D1/);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('plain form posts sign in, keep the session and sign out', async ({ page }) => {
    const username = `nojs_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
    await page.goto('/auth?mode=register&next=/settings');
    await page.getByLabel('帳號').fill(username);
    await page.getByLabel('密碼').fill('correct horse battery');
    await page.getByRole('button', { name: '註冊' }).click();

    await expect(page).toHaveURL(/\/settings$/);
    await page.getByLabel('自我介紹').fill('第一行\n第二行');
    await page.getByRole('button', { name: '儲存' }).click();
    await expect(page.getByRole('status').getByText('已儲存')).toBeVisible();
    await page.goto(`/u/${username}`);
    expect(await page.locator('.bio').innerText()).toBe('第一行\n第二行');

    const nav = page.getByRole('navigation', { name: '主要導覽' });
    await nav.getByLabel('帳號選單').click();
    await nav.getByRole('button', { name: '登出' }).click();
    await expect(nav.getByRole('link', { name: '登入／註冊' })).toBeVisible();
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/auth\?next=%2Fsettings$/);
  });
});
