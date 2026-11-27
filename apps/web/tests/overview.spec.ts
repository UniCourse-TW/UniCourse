import { expect, test } from '@playwright/test';

const API = 'http://127.0.0.1:3001';

test('keeps sign-in and error pages neutral and shows progress during client navigation', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: '主要導覽' });
  const login = nav.getByRole('link', { name: '登入／註冊' });
  const progress = page.locator('.site-header .progress');
  await page.goto('/auth?next=%2Fschools');
  await expect(login).toHaveAttribute('href', '/auth?next=%2Fschools');
  await expect(nav.locator('[aria-current]')).toHaveCount(0);

  expect((await page.goto('/courses/999999999'))?.status()).toBe(404);
  await expect(nav.locator('[aria-current]')).toHaveCount(0);
  await expect(progress).toHaveCount(0);
  await page.waitForLoadState('networkidle');

  const release = Promise.withResolvers<void>();
  await page.route('**/schools/__data.json*', async (route) => {
    await release.promise;
    await route.continue();
  });
  try {
    await nav.getByRole('link', { name: '學校', exact: true }).click();
    await expect(progress).toBeVisible();
    await expect(progress).toHaveCSS('height', '2px');
    await expect(progress).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  } finally {
    release.resolve();
  }
  await expect(page).toHaveURL('/schools');
  await expect(progress).toHaveCount(0);
  await expect(nav.getByRole('link', { name: '學校', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('shows historical enrollment, filters the ranking and browses a school and its department', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const ranking = page.getByRole('region', { name: '歷史累計修課人數排行' });
  const rankingViews = ranking.getByRole('navigation', { name: '排行檢視' });
  await expect(rankingViews.getByRole('link', { name: '跨校排行' })).toHaveAttribute('aria-current', 'true');
  const linearAlgebra = ranking.getByRole('listitem').filter({ hasText: 'DEMO201' });
  await expect(linearAlgebra.getByRole('link', { name: '線性代數' })).toHaveAttribute('href', /^\/courses\/\d+$/);
  await expect(linearAlgebra.getByText('Linear Algebra (Demo)')).toBeHidden();
  await expect(linearAlgebra.getByText(/國立清華大學\s*DEMO201/)).toBeVisible();
  await expect(linearAlgebra.getByText('示範', { exact: true })).toBeVisible();
  await expect(linearAlgebra.getByText(/2 學期/)).toBeVisible();
  await expect(linearAlgebra.getByText('2 期有數值')).toBeVisible();
  await expect(linearAlgebra.getByText('114-2 55 人')).toBeVisible();
  await expect(linearAlgebra.getByText('最近開課 115-1')).toBeVisible();
  await expect(linearAlgebra.getByText('較 114-2')).toBeVisible();
  await expect(linearAlgebra.getByText('+3', { exact: true })).toBeVisible();
  await expect(linearAlgebra.locator('svg')).toHaveCount(0);
  const singleTerm = ranking.getByRole('listitem').filter({ hasText: 'DEMO202' });
  await expect(singleTerm).toHaveCount(0);
  await rankingViews.getByRole('link', { name: '整體排行' }).click();
  await expect(rankingViews.getByRole('link', { name: '整體排行' })).toHaveAttribute('aria-current', 'true');
  await expect(singleTerm.getByText('72 人', { exact: true })).toBeVisible();
  await expect(singleTerm.getByText('最近開課 115-1')).toBeVisible();
  await expect(singleTerm.locator('svg')).toHaveCount(0);
  expect((await linearAlgebra.boundingBox())?.height).toBeLessThan(100);
  await ranking.getByText('計算方式', { exact: true }).click();
  await expect(ranking.getByText(/列在有修課人數的課之後/)).toBeVisible();
  await expect(ranking.getByRole('list').getByText('人數與名額未公布').first()).toBeVisible();

  const rankSchool = ranking.getByLabel('排行範圍');
  await rankSchool.selectOption('nthu');
  await expect(page).toHaveURL(/[?&]rank_school=nthu([&#]|$)/);
  await expect(rankSchool).toHaveValue('nthu');
  await expect(ranking.getByRole('listitem')).toHaveCount(4);
  await expect(ranking.getByRole('link', { name: '資料結構' })).toHaveCount(0);
  await ranking.getByRole('checkbox', { name: '納入零學分及行政活動' }).check();
  await expect(page).toHaveURL(/[?&]include_non_academic=true([&#]|$)/);

  const snapshot = page.getByRole('region', { name: '目前收錄' });
  await expect(snapshot.getByText('開課班次')).toBeVisible();
  await expect(snapshot.getByText('114-2 至 115-1')).toBeVisible();
  await expect(page.getByRole('region', { name: '搜尋課程' }).getByRole('link', { name: '看累計修課排行' })).toHaveAttribute('href', '#ranking');
  const coverage = page.getByRole('region', { name: '各校收錄摘要' });
  await expect(coverage.getByText(/涵蓋 4 個學期以上/)).toBeVisible();
  await coverage.getByRole('link', { name: /查看全部 \d+ 所學校/ }).click();
  await expect(page).toHaveURL('/schools');

  const school = page.getByRole('table').getByRole('row').filter({ hasText: '國立清華大學' });
  await school.getByLabel('國立清華大學的收錄明細').click();
  await expect(school.locator('time').filter({ visible: true })).toHaveAttribute('datetime', /T/);
  await school.getByRole('link', { name: '國立清華大學', exact: true }).click();
  await expect(page).toHaveURL('/schools/nthu');
  await expect(page.getByRole('heading', { name: '國立清華大學' })).toBeVisible();
  const historySection = page.getByRole('region', { name: '歷年收錄' });
  await expect(historySection.getByRole('link', { name: '114-2' })).toBeVisible();
  await expect(historySection.getByRole('link', { name: '115-1', exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: '校內累計修課人次排行' })).toBeVisible();
  await expect(historySection.getByText('每學期開課班次 · 114-2 至 115-1')).toBeVisible();
  await expect(page.getByRole('region', { name: /開課單位/ }).getByRole('searchbox', { name: '搜尋開課單位' })).toBeVisible();

  await page.getByRole('link', { name: '示範數學系' }).click();
  await expect(page).toHaveURL(`/schools/nthu/departments/${encodeURIComponent('示範數學系')}`);
  await expect(page.getByRole('heading', { name: '示範數學系' })).toBeVisible();
  const termLinks = page.getByRole('navigation', { name: '切換學期' });
  await expect(termLinks.getByRole('link', { name: '115-1' })).toHaveAttribute('aria-current', 'true');
  await expect(page.getByRole('list', { name: '必選修分布（班次）' })).toBeVisible();
  await expect(page.getByRole('region', { name: '歷年開課變化' }).getByText('已公布修課人次')).toBeVisible();
  await expect(page.getByRole('list', { name: '115-1 學期開課班次' }).getByText(/週二 第 3、4 節/)).toBeVisible();
  await expect(page.getByRole('list', { name: '115-1 學期開課班次' }).getByText('餘 2')).toBeVisible();
  await termLinks.getByRole('link', { name: '114-2' }).click();
  await expect(page).toHaveURL(/[?&]term=114-2/);
  await expect(page.getByRole('list', { name: '114-2 學期開課班次' }).getByText(/週一 第 3、4 節/)).toBeVisible();

  await page.getByRole('link', { name: '王示範' }).first().click();
  await expect(page).toHaveURL(`/instructors/nthu/${encodeURIComponent('王示範')}`);
  await expect(page.getByRole('heading', { name: '王示範' })).toBeVisible();
  const history = page.getByRole('table', { name: '課程與學年授課紀錄' });
  await expect(history.getByRole('link', { name: /115 學年.*58 人.*查看最新班次/ })).toBeVisible();
  await expect(page.getByRole('list', { name: '授課班次' }).getByRole('link', { name: '王示範' })).toHaveCount(0);
  await page.getByRole('combobox', { name: '學期' }).selectOption('114-2');
  await page.getByRole('button', { name: '套用' }).click();
  await expect(page.getByRole('list', { name: '授課班次' }).getByRole('listitem')).toHaveCount(1);
});

test('returns a localized 404 for an unknown department', async ({ page }) => {
  const response = await page.goto('/schools/nthu/departments/not-found');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: '找不到這個開課單位' })).toBeVisible();
  // Every 404 offers a way out: back to the school plus the nationwide status page.
  await expect(page.getByRole('link', { name: '回學校頁' })).toHaveAttribute('href', '/schools/nthu');
  await expect(page.getByRole('link', { name: '看各校收錄狀態' })).toBeVisible();
});

test('shows indexed instructor discussions separately from outbound searches', async ({ page }) => {
  await page.goto(`/instructors/nthu/${encodeURIComponent('王示範')}`);
  await page.getByRole('link', { name: '看網路討論 ↓' }).click();
  const discussions = page.getByRole('region', { name: '網路上的討論' });
  await expect(discussions.getByText('已索引 2 篇')).toBeVisible();
  await expect(discussions.getByRole('link', { name: /線性代數 王示範/ })).toHaveAttribute('href', 'https://example.com/demo/ptt/DEMO_Course/1');
  await expect(discussions.getByText(/示範資料：老師講解清楚/)).toBeVisible();
  await expect(discussions.getByRole('heading', { name: '到其他網站搜尋' })).toBeVisible();
  await expect(discussions.getByRole('link', { name: /搜尋 Dcard/ })).toHaveAttribute('href', /^https:\/\/www\.dcard\.tw\/search\?/);
});

test('shows recovery links for an empty semester and an unknown teacher', async ({ page }) => {
  const department = `/schools/nthu/departments/${encodeURIComponent('示範數學系')}`;
  await page.goto(`${department}?term=999-1`);
  await expect(page.getByText('999-1 學期沒有開課紀錄')).toBeVisible();
  await page.getByRole('link', { name: '查看所有學期' }).click();
  await expect(page.getByRole('list', { name: '所有學期開課班次' }).getByRole('listitem')).toHaveCount(3);

  const response = await page.goto('/instructors/nthu/not-found');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('link', { name: '用教師名搜尋課程' })).toHaveAttribute('href', '/?school=nthu&term=all&q=not-found');
});

test('derives directory coverage from crawler status and imported offerings', async ({ page, request }) => {
  const { institutions } = await (await request.get(`${API}/api/institutions`)).json();
  type School = { status: string; offerings: number; terms: string[] };
  const blockedCount = institutions.filter((school: School) => school.status === 'blocked').length;
  const liveCount = institutions.filter((school: School) => school.status === 'live' && school.offerings > 0 && school.terms.length).length;
  const pendingCount = institutions.filter((school: School) => ['live', 'partial'].includes(school.status) && (!school.offerings || !school.terms.length)).length;

  await page.goto('/schools', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1, name: '各校收錄狀態' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '主要導覽' }).getByRole('link', { name: '學校' })).toHaveAttribute(
    'aria-current',
    'page'
  );

  const shortcuts = page.getByRole('list', { name: '收錄狀態統計' });
  async function openShortcuts() {
    if (!(await shortcuts.isVisible())) await page.getByText('篩選與排序').click();
    await expect(shortcuts).toBeVisible();
  }
  await openShortcuts();
  const chips = shortcuts.getByRole('link');
  await expect(chips.filter({ hasNotText: '待匯入' }).filter({ hasText: /(^|\s)0 所/ })).toHaveCount(0);
  await expect(chips.filter({ hasText: '已收錄' })).toContainText(`已收錄 ${liveCount} 所`);
  if (pendingCount) await expect(chips.filter({ hasText: '待匯入' })).toContainText(`待匯入 ${pendingCount} 所`);
  else await expect(chips.filter({ hasText: '待匯入' })).toHaveCount(0);
  const blockedChip = chips.filter({ hasText: '受阻' });
  if (blockedCount) await expect(blockedChip).toContainText(`受阻 ${blockedCount} 所`);
  else await expect(blockedChip).toHaveCount(0);

  const table = page.getByRole('table', { name: /大專校院收錄狀態/ });
  const rows = table.locator('tbody tr:not(.group)');
  await expect(rows).toHaveCount(Math.min(20, institutions.length));
  await expect(page.getByRole('combobox', { name: '每頁' })).toHaveValue('20');
  await expect(page.getByRole('combobox', { name: '名錄排序' })).toHaveValue('terms:desc');
  await expect(page.getByRole('navigation', { name: '依教育體系篩選' }).getByRole('link', { name: /一般大學 \d+/ })).toBeVisible();

  // NCKU's own site asks for a CAPTCHA, so its data comes from the national platform. The e2e fixtures
  // hold no NCKU offerings, so it is waiting for import and has no school page link yet.
  const ncku = rows.filter({ hasText: '國立成功大學' });
  await expect(ncku.getByText('0005', { exact: true })).toBeVisible();
  await ncku.getByLabel('國立成功大學的收錄明細').click();
  await expect(ncku.getByRole('link', { name: '課程資源網說明' })).toHaveAttribute('href', '#resource-network');
  await expect(ncku.getByRole('link', { name: '國立成功大學收錄紀錄 ↗' })).toHaveAttribute(
    'href',
    'https://github.com/UniCourse-TW/UniCourse/issues/1'
  );
  await expect(ncku.getByRole('link', { name: '國立成功大學', exact: true })).toHaveCount(0);

  const nthu = rows.filter({ hasText: '國立清華大學' });
  await expect(nthu.getByRole('link', { name: '國立清華大學', exact: true })).toHaveAttribute('href', '/schools/nthu');
  await expect(nthu.getByRole('img', { name: /國立清華大學.*114 學年：1 學期/ })).toBeVisible();

  if (institutions.length > 20) {
    await expect(page.getByRole('navigation', { name: '學校名錄上方分頁' }).getByRole('link', { name: '下一頁' })).toBeVisible();
    await page.getByRole('navigation', { name: '學校名錄分頁' }).getByRole('link', { name: '下一頁' }).click();
    await expect(page).toHaveURL(/\?page=2/);
    await expect(rows).toHaveCount(Math.min(20, institutions.length - 20));
    await page.waitForLoadState('networkidle');
    await openShortcuts();
    const sort = page.getByRole('combobox', { name: '名錄排序' });
    await sort.selectOption('offerings:desc');
    await expect(page).toHaveURL(/directory_order=offerings%3Adesc/);
    await openShortcuts();
    await expect(sort).toHaveValue('offerings:desc');
  }

  const status = page.getByRole('combobox', { name: '收錄狀態' });
  // A cold dev server can re-render the page after the first click and close the disclosure again.
  await expect(async () => {
    if (!(await status.isVisible())) await page.getByText('篩選與排序', { exact: true }).click();
    await expect(status).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 20_000 });
  await status.selectOption('live');
  await page.getByRole('button', { name: '套用篩選' }).click();
  await expect(page).toHaveURL(/\/schools\?.*status=live/);
  await expect(status).toHaveValue('live');
  await openShortcuts();
  await expect(rows).toHaveCount(Math.min(20, liveCount));
  await expect(rows.filter({ hasText: '國立清華大學' })).toHaveCount(1);
  await expect(rows.filter({ hasText: '國立成功大學' })).toHaveCount(0);
  await expect(chips.filter({ hasText: '已收錄' })).toHaveAttribute('aria-current', 'true');
  await expect(page.getByText(/本頁皆已收錄/)).toBeVisible();
  await expect(table.locator('th').filter({ hasText: /^收錄狀態/ })).toHaveCount(0);

  await chips.filter({ hasText: '待匯入' }).click();
  await expect(page).toHaveURL(/status=pending_import/);
  await expect(rows).toHaveCount(Math.min(20, pendingCount));
  const ntu = rows.filter({ hasText: '國立臺灣大學' });
  await expect(page.getByText(/本頁皆待匯入/)).toBeVisible();
  await ntu.getByLabel('國立臺灣大學的收錄明細').click();
  await expect(ntu.getByText('爬蟲已接入，本站尚無匯入').filter({ visible: true })).toBeVisible();
  await expect(ntu.getByRole('link', { name: '國立臺灣大學', exact: true })).toHaveCount(0);

  // Keyword search accepts 台 for 臺 and matches school codes.
  await page.goto('/schools?q=台灣大學');
  await expect(rows.filter({ hasText: '國立臺灣大學' })).toHaveCount(1);
  await page.goto('/schools?q=0002');
  await expect(rows).toHaveCount(1);
});

test('keeps school and department navigation usable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: 'http://127.0.0.1:5173' });
  try {
    const page = await context.newPage();
    await page.goto('/schools');
    await page.getByRole('searchbox', { name: '搜尋學校' }).fill('0002');
    await page.getByRole('button', { name: '搜尋', exact: true }).click();
    await expect(page.getByRole('table').locator('tbody tr:not(.group)')).toHaveCount(1);
    await page.getByRole('link', { name: '國立清華大學', exact: true }).click();
    await page.getByRole('link', { name: '示範數學系' }).click();
    await page.getByRole('navigation', { name: '切換學期' }).getByRole('link', { name: '114-2' }).click();
    await expect(page).toHaveURL(/[?&]term=114-2/);
    await expect(page.getByRole('region', { name: '114-2 學期課表' }).getByText(/週一 第 3、4 節/).filter({ visible: true })).toBeVisible();
  } finally {
    await context.close();
  }
});
