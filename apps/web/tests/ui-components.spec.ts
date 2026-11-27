import { expect, test } from '@playwright/test';

test('uses native table semantics and sorts without changing server rows', async ({ page }) => {
  await page.goto('/_ui');
  const rankings = page.getByRole('table', { name: '課程修課人數排行' });
  const headers = rankings.getByRole('columnheader');
  await expect(headers).toHaveCount(6);
  for (const header of await headers.all()) await expect(header).toHaveAttribute('scope', 'col');

  const course = rankings.getByRole('rowheader', { name: /微積分一/ });
  await expect(course).toHaveAttribute('scope', 'row');
  await expect(course.getByRole('link')).toHaveAttribute('href', '#trend');
  const total = rankings.getByRole('columnheader', { name: '累計修課人數' });
  const sort = total.getByRole('button');
  await sort.focus();
  await sort.press('Enter');
  await expect(total).toHaveAttribute('aria-sort', 'descending');
  await sort.press('Enter');
  await expect(total).toHaveAttribute('aria-sort', 'ascending');
  await expect(rankings.getByRole('rowheader').first()).toContainText('資料結構');
  await expect(rankings.getByRole('rowheader').last()).toContainText('臺灣城市與文化');
});

test('shows chart labels, proportional marks, and the underlying numbers', async ({ page }) => {
  await page.goto('/_ui');
  const rankings = page.getByRole('region', { name: '歷年累計修課人數排行' });
  const sparkline = rankings.getByRole('img', { name: '微積分一近期修課人數走勢' });
  await expect(sparkline).toHaveAttribute('aria-label', '微積分一近期修課人數走勢');
  await expect(sparkline.locator('path[vector-effect]')).toHaveCount(2);
  const isolated = rankings.getByRole('img', { name: '普通心理學近期修課人數走勢' });
  await expect(isolated.locator('path[vector-effect]')).toHaveCount(1);
  await expect(isolated.locator('ellipse, circle')).toHaveCount(0);

  const trend = page.getByRole('region', { name: '歷年修課人數' });
  const chart = trend.getByRole('img', { name: /資料結構：歷年修課人數/ });
  await expect(chart.getByText('100', { exact: true })).toBeVisible();
  await expect(chart.locator('rect')).toHaveCount(9);
  const firstTwo = await chart.locator('rect').evaluateAll((bars) => bars.slice(0, 2).map((bar) => Number(bar.getAttribute('height'))));
  expect(firstTwo[0] / firstTwo[1]).toBeCloseTo(64 / 68);
  await trend.getByText('查看數值表格', { exact: true }).first().click();
  const values = trend.getByRole('table', { name: '資料結構：歷年修課人數：數值表格' });
  await expect(values.getByRole('row', { name: /^108-1/ }).getByRole('cell')).toHaveText('—');
  await expect(values.getByRole('row', { name: /^110-1/ }).getByRole('cell')).toHaveText('0');

  const coverage = page.getByRole('table', { name: '大專校院收錄狀態' });
  await expect(coverage.getByRole('img', { name: '國立清華大學收錄範圍：106 到 115 學年，8 學年有資料' })).toBeVisible();
  const matrix = page.getByRole('region', { name: '教師開課紀錄' });
  await expect(matrix.getByRole('link', { name: '資料結構，113-1 學期：2 班，156 人' })).toHaveAttribute('href', '#trend');
  await matrix.getByText('查看其他 1 門課程').click();
  await expect(matrix.getByRole('rowheader', { name: '計算機程式設計一' })).toBeVisible();
});

test('clears only the selected query parameter and restores SSR selections', async ({ page }) => {
  await page.goto('/_ui?school=nthu&term=115-1&page=2');
  await expect(page.getByLabel('學校', { exact: true })).toHaveValue('nthu');
  await expect(page.getByLabel('學期', { exact: true })).toHaveValue('115-1');
  await page.getByRole('link', { name: '移除篩選：國立清華大學' }).click();
  await expect(page).toHaveURL('/_ui?term=115-1&page=2');
  await expect(page.getByLabel('學校', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('學期', { exact: true })).toHaveValue('115-1');
  await page.getByRole('link', { name: '下一頁' }).click();
  await expect(page).toHaveURL('/_ui?term=115-1&page=3');
});

test('keeps horizontal scrolling inside data tables and applies both themes', async ({ page, isMobile }) => {
  if (isMobile) await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/_ui');

  const title = page.getByRole('heading', { name: '共用元件展示', exact: true });
  await expect(title).toHaveCSS('color', 'rgb(237, 237, 237)');
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await expect(title).toHaveCSS('color', 'rgb(24, 24, 27)');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await expect(title).toHaveCSS('color', 'rgb(237, 237, 237)');

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  expect(scrollWidth).toBe(clientWidth);
  const apply = page.getByRole('button', { name: '套用' });
  expect((await apply.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  if (isMobile) {
    const scroller = page.getByRole('region', { name: '課程修課人數排行（表格）' });
    const widths = await scroller.evaluate((element) => ({ inner: element.scrollWidth, outer: element.clientWidth }));
    expect(widths.inner).toBeGreaterThan(widths.outer);
    const course = scroller.getByRole('columnheader', { name: '課程' });
    await expect(course).toHaveCSS('position', 'sticky');
    await scroller.focus();
    await expect(scroller).toBeFocused();
    await scroller.press('ArrowRight');
    await expect.poll(() => scroller.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('renders selected options and submits a native GET', async ({ page }) => {
    await page.goto('/_ui?school=nthu&term=115-1');
    const school = page.getByLabel('學校', { exact: true });
    await expect(school.locator('option[selected]')).toHaveAttribute('value', 'nthu');
    await expect(page.getByRole('button', { name: '累計修課人數' })).toHaveCount(0);
    await school.selectOption('nycu');
    await page.getByRole('button', { name: '套用' }).click();
    await expect(page).toHaveURL('/_ui?school=nycu&term=115-1');
    await expect(page.getByRole('table', { name: '課程修課人數排行' }).getByRole('rowheader')).toHaveText(/計算機程式設計一/);
  });
});
