import { expect, test } from '@playwright/test';

test('shows historical enrollment, filters the ranking and browses a school and its department', async ({ page }) => {
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

  const stats = page.getByRole('region', { name: '資料總覽' });
  await expect(stats.locator('dt')).toHaveText(['開課班次', '課程', '學校', '學期']);
  await expect(stats.locator('dd')).toHaveText(['8', '7', '3', '2']);

  const school = stats.getByRole('table').getByRole('row').filter({ hasText: '國立清華大學' });
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
