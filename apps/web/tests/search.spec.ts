import { expect, test } from '@playwright/test';

test('searches Chinese titles, filters by school and opens the mobile details page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('combobox', { name: /^學期/ })).toHaveValue('115-1');
  await page.getByRole('searchbox', { name: '關鍵字' }).fill('資料');
  await page.getByRole('button', { name: '搜尋' }).click();
  // The overview page also lists demo courses named 資料結構 in the ranking, so wait for the search URL.
  await page.waitForURL(/[?&]q=/);
  await expect(page.getByRole('link', { name: '資料結構' })).toHaveCount(2);
  await expect(page.getByText('共 2 班次')).toBeVisible();
  await page.waitForLoadState('networkidle');

  await page.locator('select[name="school"]').selectOption('ntnu');
  await expect(page).toHaveURL(/[?&]school=ntnu(&|$)/);
  await expect(page.getByRole('link', { name: '資料結構' })).toHaveCount(1);
  const course = page.getByRole('article');
  await expect(course.getByText('國立臺灣師範大學')).toBeVisible();
  await expect(course.getByText('115-1')).toBeVisible();
  await expect(course.getByText(/DEMO101/)).toBeVisible();

  await page.getByRole('link', { name: '資料結構' }).click();
  await expect(page.getByRole('heading', { name: '資料結構' })).toBeVisible();
  await expect(page.getByText('示範資料，非校方實際開課紀錄。')).toBeVisible();
  await expect(page.getByText('國立臺灣師範大學', { exact: true })).toBeVisible();
});

test('filters by term and shows snapshot v2 details', async ({ page }) => {
  await page.goto('/?q=線性&school=nthu', { waitUntil: 'networkidle' });
  const term = page.getByRole('combobox', { name: /^學期/ });
  await expect(term).toHaveValue('115-1');
  await expect(page.getByRole('link', { name: '線性代數' })).toHaveCount(1);
  const card = page.getByRole('article');
  for (const detail of ['示範數學系', '3 學分', '必修', 'T3T4R3 示範館101', '王示範', '國立清華大學', '115-1']) {
    await expect(card.getByText(detail, { exact: true })).toBeVisible();
  }
  await expect(card.getByText(/班次 01/)).toBeVisible();
  await expect(card.getByText('58 / 60', { exact: true })).toBeVisible();

  // fixtures/nthu-114-2.json has a 線性代數 offering too, so each term filter shows a different set.
  await term.selectOption('all');
  await expect(page).toHaveURL(/[?&]term=all(&|$)/);
  await expect(term).toHaveValue('all');
  await expect(page.getByRole('link', { name: '線性代數' })).toHaveCount(2);
  await page.getByLabel('排序').selectOption('enrolled');
  await expect(page).toHaveURL(/[?&]sort=enrolled(&|$)/);
  await expect(page.getByRole('article').first().getByText('115-1')).toBeVisible();

  await term.selectOption('114-2');
  await expect(page).toHaveURL(/[?&]term=114-2(&|$)/);
  await expect(term).toHaveValue('114-2');
  await expect(page.getByRole('link', { name: '線性代數' })).toHaveCount(1);
  await expect(card.getByText('114-2')).toBeVisible();
  await expect(card.getByText('115-1')).toHaveCount(0);

  await term.selectOption('115-1');
  await expect(page).toHaveURL(/[?&]term=115-1(&|$)/);
  await expect(page.getByRole('link', { name: '線性代數' })).toHaveCount(1);
  await page.getByRole('link', { name: '線性代數' }).click();
  await expect(page.getByRole('heading', { name: '線性代數' })).toBeVisible();
  await expect(page.getByText('Linear Algebra (Demo)')).toBeVisible();
  await expect(page.getByText('週二 第 3、4 節 · 示範館 101')).toBeVisible();
  // Key facts sit in the tiles above the fold; school fields are a definition list further down.
  const facts = page.getByRole('group', { name: '課程重點' });
  await expect(facts).toContainText('3學分');
  await expect(facts).toContainText('必修');
  await expect(facts.getByText('/ 60 人')).toBeVisible();
  await expect(page.locator('#extra').locator('xpath=ancestor::details')).toContainText('授課方式講授');
  await expect(page.getByRole('link', { name: '課綱' })).toBeVisible();
  // Cross-term history: 115-1 is this page, 114-2 links to its own offering.
  const history = page.getByRole('table', { name: /各學期開課與修課人數/ });
  await expect(history.getByRole('row', { name: /115-1/ })).toContainText('本頁');
  await expect(history.getByRole('row', { name: /114-2/ }).getByRole('link', { name: /114-2/ })).toHaveAttribute('href', /^\/courses\/\d+$/);

  await page.getByRole('navigation', { name: '所在位置' }).getByRole('link', { name: '示範數學系' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '示範數學系' })).toBeVisible();
  await page.goto('/?school=nthu&term=115-1&department=示範數學系');
  await expect(page.getByRole('combobox', { name: '開課單位' })).toHaveValue('示範數學系');
  await expect(page.getByRole('link', { name: '移除篩選：示範數學系' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(1);
});

test('uses a desktop table and keeps all parts inside the phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?q=線性&school=nthu&term=all');
  const table = page.getByRole('table', { name: /開課班次/ });
  await expect(table.getByRole('columnheader', { name: '修課人數／名額' })).toBeVisible();
  await expect(table.getByRole('rowheader').first()).toContainText('線性代數');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('article')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('keeps global filters on pagination redirects and offers applicable empty-state actions', async ({ page }) => {
  await page.goto('/?q=線性&school=nthu&term=all&sort=title&page=9');
  await expect(page).toHaveURL('/?q=%E7%B7%9A%E6%80%A7&school=nthu&term=all&sort=title');
  await expect(page.getByText('顯示 1–2 筆 · 共 2 筆')).toBeVisible();
  await page.goto('/?q=zzzz&term=all');
  const results = page.getByRole('region', { name: '搜尋結果' });
  await expect(results.getByText('找不到「zzzz」的課程')).toBeVisible();
  await expect(results.getByRole('link', { name: '查全部學期' })).toHaveCount(0);
  await results.getByRole('link', { name: '清除關鍵字' }).click();
  await expect(page).toHaveURL('/?term=all');
  await expect(results.getByRole('article').first()).toBeVisible();
});

test('submits a search and persists the SSR theme without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: 'light' });
  const page = await context.newPage();
  try {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: '主要導覽' });
    await nav.getByRole('button', { name: '切換為深色主題' }).click();
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(10, 10, 10)');
    await page.getByRole('searchbox', { name: '關鍵字' }).fill('資料');
    await page.getByRole('button', { name: '搜尋', exact: true }).click();
    await expect(page.getByRole('heading', { name: '搜尋「資料」' })).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(10, 10, 10)');
    await nav.getByRole('button', { name: '切換為淺色主題' }).click();
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.getByRole('heading', { name: '搜尋「資料」' })).toBeVisible();
  } finally {
    await context.close();
  }
});
