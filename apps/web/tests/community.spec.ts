import { expect, test, type Locator, type Page } from '@playwright/test';

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

/** Open the author tools disclosure when the current page uses one. */
async function openAuthorTools(item: Locator) {
  const more = item.locator('details.more > summary').first();
  if (await more.isVisible()) await more.click();
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
  // 「站內評價與討論」 while the course has neither ratings nor posts,「課程評價」 otherwise.
  await expect(ratings.getByRole('heading', { name: /^(課程評價|站內評價與討論)$/ })).toBeVisible();
  // Exactly one sign-in link whatever the count: 「登入後成為第一個評分」 with none,「登入後加上你的評分」
  // with one or two, 「登入」 under the list from three on.
  await expect(ratings.getByRole('link', { name: /^登入/ })).toHaveCount(1);
  await ratings.getByRole('link', { name: /^登入/ }).click();
  await expect(page).toHaveURL(/\/auth\?next=/);

  await page.getByRole('link', { name: '建立帳號', exact: true }).click();
  await expect(page.getByRole('heading', { name: '建立 UniCourse 帳號' })).toBeVisible();
  await page.getByLabel('帳號').fill(username);
  await page.getByLabel('密碼').fill('correct horse battery');
  await page.getByText('顯示名稱（選填）', { exact: false }).click();
  await page.getByLabel('顯示名稱').fill('測試同學');
  await page.getByRole('button', { name: '建立帳號' }).click();

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
  // On phones the course link stays visible and the historical figures expand on demand.
  await expect(card.getByRole('link', { name: '線性代數', exact: true }).first()).toHaveAttribute('href', `/courses/${course.id}`);

  // Reply (the thread's 寫回覆 link jumps to the box, which names the signed-in identity), then upvote the question.
  await thread.getByRole('link', { name: /^寫回覆/ }).click();
  await expect(page.getByLabel('寫第一則回覆')).toBeFocused();
  await expect(page.locator('#reply-form')).toContainText('以 測試同學 的身分');
  // A thread with no replies asks for the first one; afterwards the box is the plain 寫回覆.
  await page.getByLabel('寫第一則回覆').fill(`同問 ${username}`);
  await page.getByRole('button', { name: '送出回覆' }).click();
  await expect(page.getByRole('heading', { name: '回覆（1）' })).toBeVisible();
  await expect(page.getByRole('article', { name: '測試同學 的回覆' }).locator('.content')).toHaveText(`同問 ${username}`);
  await expect(page.getByLabel('寫回覆', { exact: true })).toHaveValue('');

  // The author can edit their reply.
  const reply = page.getByRole('article', { name: '測試同學 的回覆' });
  await openAuthorTools(reply);
  await reply.locator('details.panel > summary', { hasText: '編輯' }).click();
  await reply.getByLabel('內容').fill(`同問，補充 ${username}`);
  await reply.getByRole('button', { name: '儲存修改' }).click();
  await expect(reply.locator('.content')).toHaveText(`同問，補充 ${username}`);
  const replyUpvote = reply.getByRole('button', { name: '推這則回覆' });
  await expect(replyUpvote).toHaveText('▲推');
  await replyUpvote.click();
  await expect(replyUpvote).toHaveAttribute('aria-pressed', 'true');
  await expect(reply.getByLabel('回覆分數')).toHaveText('+1');

  const upvote = thread.getByRole('button', { name: '推這篇文章', exact: true });
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
  const activity = page.getByRole('group', { name: '活動統計' });
  // Below the sample threshold only the ratings section explains why there is no average or distribution.
  await expect(activity).not.toContainText('樣本不足');
  await expect(page.getByRole('region', { name: '課程評價（1）' })).toContainText('樣本不足（1／3 則）');
  await expect(page.getByText('樣本不足', { exact: false })).toHaveCount(1);
  // The count tiles double as jump links to their sections.
  await expect(activity.getByRole('link', { name: /查看評價，共 1 則/ })).toHaveAttribute('href', '#ratings');
  // The number is the accessible score and the adjacent stars are decorative.
  await expect(page.getByRole('table', { name: /的課程評價/ }).getByText('4 / 5', { exact: true })).toBeVisible();
  // Exact: the post rows also name the course (「國立清華大學 線性代數 DEMO201」) in their forum link.
  await expect(page.getByRole('link', { name: '線性代數', exact: true })).toHaveAttribute('href', `/courses/${course.id}`);
  await expect(page.getByText(`作業偏多 ${username}`)).toBeVisible();
  await expect(page.getByRole('link', { name: title })).toBeVisible();

  // Deleting the thread takes a confirm step; afterwards it is a 404.
  await page.getByRole('link', { name: title }).click();
  await expect(page).toHaveURL(/\/forum\/\d+$/);
  const threadUrl = page.url();
  await openAuthorTools(thread);
  await thread.locator('details.panel > summary', { hasText: '刪除' }).click();
  await thread.getByRole('button', { name: '確定刪除' }).click();
  await expect(page).toHaveURL(/\/forum$/);
  expect((await page.goto(threadUrl))?.status()).toBe(404);

  // Logging out is a POST; afterwards the nav offers sign-in again and rating needs a login.
  await openMenu(page);
  await nav.getByRole('button', { name: '登出' }).click();
  await expect(nav.getByRole('link', { name: '登入／註冊' })).toBeVisible();
  await page.goto(`/courses/${course.id}`);
  await expect(ratings.getByRole('link', { name: /^登入/ })).toHaveCount(1);
  await expect(ratings.getByRole('button', { name: '送出評價' })).toHaveCount(0);
});

test('rejects a wrong password inline and keeps next on the same origin', async ({ page }) => {
  await page.goto('/auth?next=//evil.example/');
  await page.getByLabel('帳號').fill('nobody_here');
  await page.getByLabel('密碼').fill('wrong password');
  await page.getByRole('button', { name: '登入' }).click();
  await expect(page.getByRole('alert')).toContainText('帳號或密碼錯誤');
  await expect(page.locator('input[name="next"]')).toHaveValue('/');
  // Password help is folded under the form; 「忘記密碼？」 beside the field opens it in place (no e-mail
  // reset, what to send, no GitHub alternative).
  const reset = page.locator('#reset-help');
  await expect(reset).not.toHaveAttribute('open', '');
  await page.getByRole('link', { name: '忘記密碼？', exact: true }).click();
  await expect(reset).toHaveAttribute('open', '');
  await expect(reset).toContainText('不要寫密碼');
  await expect(reset.getByRole('link', { name: /開啟私密回報表單/ })).toHaveAttribute('href', /github\.com/);
});

test('registration moves focus to the summary when both credentials need correction', async ({ page }) => {
  await page.goto('/auth?mode=register');
  await expect(page.getByRole('button', { name: '顯示密碼' })).toBeVisible();
  await page.getByLabel('帳號', { exact: true }).fill('bad!');
  const password = page.getByLabel('密碼', { exact: true });
  await password.fill('short');
  await page.getByRole('button', { name: '建立帳號' }).click();

  const summary = page.getByRole('alert').filter({ hasText: '有多個欄位需要修正' });
  await expect(summary).toBeFocused();
  await password.fill('a-valid-test-password');
  await expect(summary).toBeHidden();
});

test('saves a profile while the phone preview is open', async ({ page }) => {
  const username = `preview_${Date.now().toString(36)}`;
  await page.goto('/auth?mode=register&next=/settings');
  await expect(page.getByRole('button', { name: '顯示密碼' })).toBeVisible();
  await page.getByLabel('帳號', { exact: true }).fill(username);
  await page.getByLabel('密碼', { exact: true }).fill('a-valid-test-password');
  await page.getByRole('button', { name: '建立帳號' }).click();
  await expect(page).toHaveURL(/\/settings$/);

  const save = page.getByRole('button', { name: '儲存', exact: true });
  await expect(save).toBeDisabled();
  const bio = page.getByLabel('自我介紹', { exact: true });
  await bio.fill('這是草稿。');
  const preview = page.locator('.preview-fold summary');
  await expect(preview).toContainText('預覽變更後的個人頁');
  await preview.click();
  await expect(page.locator('.preview-fold .bio')).toHaveText('這是草稿。');
  await save.click();

  await expect(page.getByRole('status')).toContainText('已儲存，個人頁已更新');
  await expect(preview).toContainText('已儲存的版本');
  await bio.fill('這次還沒儲存。');
  await expect(page.getByRole('status')).toContainText('有 1 項變更尚未儲存');
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
  // With no public questions the 提問 chip is shown disabled (not a link), so open the category directly.
  await expect(types.getByText(/^提問/)).toBeVisible();
  await page.goto('/forum?type=question');
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
    await page.getByRole('button', { name: '建立帳號' }).click();

    await expect(page).toHaveURL(/\/settings$/);
    await page.getByLabel('自我介紹').fill('第一行\n第二行');
    // The school is a plain select, so it works here too.
    await page.getByLabel('所屬學校').selectOption({ index: 1 });
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
