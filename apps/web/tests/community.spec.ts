import { expect, test, type Page } from '@playwright/test';

const API = 'http://127.0.0.1:3001';

/** The rating count shown in the course's 課程評價 summary. */
async function ratingCount(page: Page) {
  const text = await page.locator('#ratings').getByText(/\d+ 則評價/).textContent();
  return Number(text?.match(/(\d+) 則評價/)?.[1]);
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
  await ratings.getByRole('link', { name: '登入' }).click();
  await expect(page).toHaveURL(/\/auth\?next=/);

  await page.getByRole('link', { name: '註冊', exact: true }).click();
  await expect(page.getByRole('heading', { name: '建立帳號' })).toBeVisible();
  await page.getByLabel('帳號').fill(username);
  await page.getByLabel('密碼').fill('correct horse battery');
  await page.getByLabel('顯示名稱（選填）').fill('測試同學');
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

  // Post a question linked to the course from its 相關討論 link.
  await page.getByRole('link', { name: '相關討論' }).click();
  await expect(page).toHaveURL(/\/forum\?school=nthu&courseCode=DEMO201/);
  await expect(page.getByLabel('相關課號（選填）')).toHaveValue('DEMO201');
  await page.getByLabel('文章類型').selectOption('question');
  await page.getByLabel('標題').fill(title);
  await page.getByLabel('內容', { exact: true }).fill('第一行\n<b>不是粗體</b>');
  await page.getByLabel('標籤（選填', { exact: false }).fill('期中考, 線代');
  await page.getByRole('button', { name: '發表' }).click();

  await expect(page).toHaveURL(/\/forum\/\d+$/);
  const thread = page.getByRole('article', { name: title });
  await expect(thread.getByRole('heading', { name: title })).toBeVisible();
  // Plain text: the markup is shown literally and the line break is kept.
  const content = thread.locator('.content');
  await expect(content).toBeVisible();
  expect(await content.innerText()).toBe('第一行\n<b>不是粗體</b>');
  await expect(thread.locator('b')).toHaveCount(0);
  await expect(thread.getByRole('link', { name: '#期中考' })).toBeVisible();

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
  await expect(thread.getByLabel('文章分數')).toHaveText('1');

  // The forum list for the course shows the thread with its reply and score.
  await page.goto('/forum?school=nthu&courseCode=DEMO201');
  await expect(page.getByRole('link', { name: title })).toBeVisible();

  // Both show up on the public profile.
  await account.click();
  await nav.getByRole('link', { name: '個人頁面' }).click();
  await expect(page.getByRole('heading', { name: '測試同學' })).toBeVisible();
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
  await account.click();
  await nav.getByRole('button', { name: '登出' }).click();
  await expect(nav.getByRole('link', { name: '登入／註冊' })).toBeVisible();
  await page.goto(`/courses/${course.id}`);
  await expect(ratings.getByRole('link', { name: '登入' })).toBeVisible();
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
    await expect(page.getByText('已儲存。')).toBeVisible();
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
