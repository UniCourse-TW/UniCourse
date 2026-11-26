import { expect, test } from '@playwright/test';

const API = 'http://127.0.0.1:3001';

test('shows historical enrollment, filters the ranking and browses a school and its department', async ({ page, request }) => {
  await page.goto('/');

  const ranking = page.getByRole('region', { name: '歷史累計修課人數排行' });
  const linearAlgebra = ranking.getByRole('listitem').filter({ hasText: 'DEMO201' });
  await expect(linearAlgebra.getByRole('link', { name: '線性代數' })).toHaveAttribute('href', /^\/courses\/\d+$/);
  await expect(linearAlgebra.getByText('Linear Algebra (Demo)')).toBeVisible();
  await expect(linearAlgebra.getByText('國立清華大學 · DEMO201')).toBeVisible();
  await expect(linearAlgebra.getByText('示範', { exact: true })).toBeVisible();
  await expect(linearAlgebra.getByText('開課學期數 2')).toBeVisible();
  await expect(linearAlgebra.getByText('累計修課人數 113')).toBeVisible();
  await expect(ranking.getByText(/若校方未公布修課人數，則以累計名額替代/)).toBeVisible();
  await expect(ranking.getByText('人數與名額未公布').first()).toBeVisible();

  const rankSchool = ranking.getByLabel('排行範圍');
  await rankSchool.selectOption('nthu');
  await ranking.getByRole('button', { name: '套用' }).click();
  await expect(page).toHaveURL(/[?&]rank_school=nthu(&|$)/);
  await expect(rankSchool).toHaveValue('nthu');
  await expect(ranking.getByRole('listitem')).toHaveCount(4);
  await expect(ranking.getByRole('link', { name: '資料結構' })).toHaveCount(0);

  await expect(page.getByRole('region', { name: '資料總覽' })).toHaveCount(0);

  // The coverage line counts live schools with imported terms and their distinct terms, from the API.
  const { institutions } = await (await request.get(`${API}/api/institutions`)).json();
  const live = institutions.filter(
    (school: { status: string; terms: string[] }) => school.status === 'live' && school.terms.length > 0
  );
  const terms = new Set(live.flatMap((school: { terms: string[] }) => school.terms));
  await expect(ranking.getByText(`目前收錄 ${live.length} 校、${terms.size} 個學期 · 查看各校收錄狀態`)).toBeVisible();
  await ranking.getByRole('link', { name: '查看各校收錄狀態' }).click();
  await expect(page).toHaveURL('/schools');

  const school = page.getByRole('table').getByRole('row').filter({ hasText: '國立清華大學' });
  await expect(school.getByText('已收錄', { exact: true })).toBeVisible();
  await expect(school.locator('time')).toHaveAttribute('datetime', /T/);
  await school.getByRole('link', { name: '國立清華大學' }).click();
  await expect(page).toHaveURL('/schools/nthu');
  await expect(page.getByRole('heading', { name: '國立清華大學' })).toBeVisible();
  await expect(page.getByText('已匯入學期：115-1、114-2')).toBeVisible();

  await page.getByRole('link', { name: '示範數學系' }).click();
  await expect(page).toHaveURL(`/schools/nthu/departments/${encodeURIComponent('示範數學系')}`);
  await expect(page.getByRole('heading', { name: '示範數學系' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3 })).toHaveText(['115-1 學期', '114-2 學期']);
  await expect(page.getByRole('link', { name: '線性代數' })).toHaveCount(2);

  await page.getByRole('link', { name: '王示範' }).first().click();
  await expect(page).toHaveURL(`/instructors/nthu/${encodeURIComponent('王示範')}`);
  await expect(page.getByRole('heading', { name: '王示範' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3 })).toHaveText(['115-1 學期', '114-2 學期']);
});

test('returns a localized 404 for an unknown department', async ({ page }) => {
  const response = await page.goto('/schools/nthu/departments/not-found');
  expect(response?.status()).toBe(404);
  await expect(page.getByText('找不到這個開課單位。')).toBeVisible();
});

test('lists every institution with its crawl status and filters by status', async ({ page, request }) => {
  const { institutions } = await (await request.get(`${API}/api/institutions`)).json();
  const partialCount = institutions.filter((school: { status: string }) => school.status === 'partial').length;

  await page.goto('/schools');
  await expect(page.getByRole('heading', { level: 1, name: '各校收錄狀態' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '主要導覽' }).getByRole('link', { name: '學校' })).toHaveAttribute(
    'aria-current',
    'page'
  );

  const chips = page.getByRole('list', { name: '收錄狀態統計' }).getByRole('link');
  await expect(chips).toHaveText([/^已收錄 \d+$/, /^部分 \d+$/, /^受阻 \d+$/, /^規劃中 \d+$/, /^尚未開始 \d+$/]);
  await expect(chips.filter({ hasText: '部分' })).toHaveText(`部分 ${partialCount}`);

  const table = page.getByRole('table', { name: /大專校院收錄狀態/ });
  const rows = table.locator('tbody tr:not(.group)');
  await expect(rows).toHaveCount(institutions.length);
  await expect(table.getByRole('rowheader', { name: /^一般大學/ })).toBeVisible();

  const ntua = rows.filter({ hasText: '國立臺灣藝術大學' });
  await expect(ntua.getByText('（0029）')).toBeVisible();
  await expect(ntua.getByText('部分', { exact: true })).toBeVisible();
  await expect(ntua.getByRole('link', { name: '#3' })).toHaveAttribute(
    'href',
    'https://github.com/UniCourse-TW/UniCourse/issues/3'
  );
  // No imported offerings in the fixtures, so no internal school page link.
  await expect(ntua.getByRole('link', { name: '國立臺灣藝術大學', exact: true })).toHaveCount(0);

  // NCKU's own site blocks crawling; its data comes from the national platform.
  const ncku = rows.filter({ hasText: '國立成功大學' });
  await expect(ncku.getByText('已收錄', { exact: true })).toBeVisible();
  await expect(ncku.getByText(/資料來源：大學校院課程資源網/)).toBeVisible();

  const nthu = rows.filter({ hasText: '國立清華大學' });
  await expect(nthu.getByRole('link', { name: '國立清華大學', exact: true })).toHaveAttribute('href', '/schools/nthu');
  await expect(nthu.getByText(/^2 學期 \/ \d+ 班次$/)).toBeVisible();

  const status = page.getByRole('combobox', { name: '狀態' });
  await status.selectOption('partial');
  await page.getByRole('button', { name: '篩選' }).click();
  await expect(page).toHaveURL(/\/schools\?.*status=partial/);
  await expect(status).toHaveValue('partial');
  await expect(rows).toHaveCount(partialCount);
  await expect(rows.filter({ hasText: '國立臺灣藝術大學' })).toHaveCount(1);
  await expect(rows.filter({ hasText: '國立清華大學' })).toHaveCount(0);
  await expect(chips.filter({ hasText: '部分' })).toHaveAttribute('aria-current', 'true');

  // Keyword search accepts 台 for 臺 and matches school codes.
  await page.goto('/schools?q=台灣大學');
  await expect(rows.filter({ hasText: '國立臺灣大學' })).toHaveCount(1);
  await page.goto('/schools?q=0002');
  await expect(rows).toHaveCount(1);
});
