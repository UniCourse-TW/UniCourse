import { expect, test } from '@playwright/test';

test('the old static address redirects and the page renders from the bundled data', async ({ page }) => {
  const response = await page.goto('/landscape.html');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL('/landscape');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('臺灣大專校院課程網站總覽');
  const tiles = page.getByRole('group', { name: '網站統計' });
  for (const label of ['已盤點到網站的學校', '官方系統', '第三方服務', '運作中']) await expect(tiles.getByRole('term').filter({ hasText: label })).toBeVisible();
  // Desktop shows the sortable table; phones get one short row per site instead.
  const thirdParty = page.getByRole('table', { name: /第三方查課網站/ }).or(page.getByRole('list', { name: '第三方查課網站' }));
  await expect(thirdParty.filter({ visible: true })).toHaveCount(1);
  // Schools keep their anchor and link to the status page when they have imported offerings.
  const ntu = page.locator('#ntu');
  await expect(ntu.getByRole('heading', { level: 2 })).toContainText('國立臺灣大學');
  await expect(ntu.getByRole('list', { name: '國立臺灣大學的課程網站' })).toBeVisible();
});

test('filters are plain query parameters and narrow the school sections', async ({ page }) => {
  await page.goto('/landscape?q=%E8%87%BA%E5%A4%A7&kind=third');
  await expect(page.getByRole('status')).toContainText(/符合 \d+ \/ \d+ 個系統/);
  await expect(page.getByRole('link', { name: '移除篩選：「臺大」' })).toBeVisible();
  await expect(page.getByRole('link', { name: '移除篩選：第三方' })).toBeVisible();
  const sections = page.locator('.schools section.school');
  await expect(sections.first()).toContainText('國立臺灣大學');
  await expect(sections.first().locator('.kind')).toHaveText(Array((await sections.first().locator('.kind').count())).fill('第三方'));

  await page.goto('/landscape?q=zzzz-no-such-site');
  await expect(page.getByText('沒有符合的網站')).toBeVisible();
  await expect(page.getByRole('link', { name: '清除篩選' })).toHaveAttribute('href', '/landscape');
});

test('the legal documents have a table of contents and the review-index sections', async ({ page }) => {
  await page.goto('/terms');
  const toc = page.getByRole('navigation', { name: '目錄' });
  // Phones start with the contents collapsed; desktop CSS keeps them open.
  if (!(await toc.getByRole('link', { name: '外部評論索引' }).isVisible())) await toc.getByText('目錄').click();
  await expect(toc.getByRole('link', { name: '外部評論索引' })).toHaveAttribute('href', '#reviews');
  await expect(page.locator('#reviews')).toHaveText('外部評論索引');
  await expect(page.getByText('不超過 120 字的摘要')).toBeVisible();
  await expect(page.getByRole('link', { name: /在 GitHub 建立 issue/ })).toHaveAttribute('href', /github\.com/);

  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: '外部評論索引儲存的資料' })).toBeVisible();
  await expect(page.getByRole('table').nth(1).getByRole('row')).toHaveCount(6);
});

test('unknown pages and courses get a helpful 404 with a search box', async ({ page }) => {
  let response = await page.goto('/no-such-page');
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle('找不到這個頁面｜UniCourse');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('找不到這個頁面');
  await expect(page.getByRole('button', { name: '搜尋課程' })).toBeVisible();
  await expect(page.getByRole('link', { name: '回首頁' })).toHaveAttribute('href', '/');

  response = await page.goto('/courses/999999999');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('找不到這門課程');
  await page.getByRole('searchbox').fill('資料');
  await page.getByRole('button', { name: '搜尋課程' }).click();
  await expect(page).toHaveURL(/\/\?term=all&q=%E8%B3%87%E6%96%99$/);
});
