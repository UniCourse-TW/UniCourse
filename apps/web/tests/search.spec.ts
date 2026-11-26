import { expect, test } from '@playwright/test';

test('searches Chinese titles, filters by school and opens the mobile details page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('學期')).toHaveValue('115-1');
  await page.getByRole('searchbox', { name: '關鍵字' }).fill('資料');
  await page.getByRole('button', { name: '搜尋' }).click();
  // The overview page also lists demo courses named 資料結構 in the ranking, so wait for the search URL.
  await page.waitForURL(/[?&]q=/);
  await expect(page.getByRole('link', { name: '資料結構' })).toHaveCount(2);

  await page.locator('select[name="school"]').selectOption('ntnu');
  await page.getByRole('button', { name: '搜尋' }).click();
  await expect(page.getByRole('link', { name: '資料結構' })).toHaveCount(1);
  await expect(page.getByText('國立臺灣師範大學 · 115-1 · DEMO101')).toBeVisible();

  await page.getByRole('link', { name: '資料結構' }).click();
  await expect(page.getByRole('heading', { name: '資料結構' })).toBeVisible();
  await expect(page.getByText('示範資料，非校方實際開課紀錄。')).toBeVisible();
  await expect(page.getByText('國立臺灣師範大學', { exact: true })).toBeVisible();
});

test('filters by term and shows snapshot v2 details', async ({ page }) => {
  await page.goto('/?q=線性&school=nthu');
  const term = page.getByLabel('學期');
  await expect(term).toHaveValue('115-1');
  await expect(page.getByRole('link', { name: '線性代數' })).toHaveCount(1);
  await expect(page.getByText('示範數學系 · 3 學分 · 必修 · T3T4R3 示範館101 · 王示範')).toBeVisible();

  await expect(page.getByText('國立清華大學 · 115-1 · DEMO201 · 班次 01')).toBeVisible();

  // fixtures/nthu-114-2.json has a 線性代數 offering too, so each term filter shows a different set.
  await term.selectOption('all');
  await page.getByRole('button', { name: '搜尋' }).click();
  await expect(page).toHaveURL(/[?&]term=all(&|$)/);
  await expect(term).toHaveValue('all');
  await expect(page.getByRole('link', { name: '線性代數' })).toHaveCount(2);

  await term.selectOption('114-2');
  await page.getByRole('button', { name: '搜尋' }).click();
  await expect(page).toHaveURL(/[?&]term=114-2(&|$)/);
  await expect(term).toHaveValue('114-2');
  await expect(page.getByRole('link', { name: '線性代數' })).toHaveCount(1);
  await expect(page.getByText('國立清華大學 · 114-2 · DEMO201 · 班次 01')).toBeVisible();
  await expect(page.getByText(/· 115-1 ·/)).toHaveCount(0);

  await term.selectOption('115-1');
  await page.getByRole('button', { name: '搜尋' }).click();
  await expect(page.getByRole('link', { name: '線性代數' })).toHaveCount(1);
  await page.getByRole('link', { name: '線性代數' }).click();
  await expect(page.getByRole('heading', { name: '線性代數' })).toBeVisible();
  await expect(page.getByText('Linear Algebra (Demo)')).toBeVisible();
  await expect(page.getByText('週二 第 3、4 節 · 示範館 101')).toBeVisible();
  await expect(page.getByText('60 人')).toBeVisible();
  await expect(page.getByRole('row', { name: '授課方式 講授' })).toBeVisible();
  await expect(page.getByRole('link', { name: '課綱' })).toBeVisible();

  await page.getByRole('link', { name: '示範數學系' }).click();
  await expect(page.getByText('只看開課單位「示範數學系」')).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(1);
});
