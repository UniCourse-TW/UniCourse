import { expect, test } from '@playwright/test';

const API = 'http://127.0.0.1:3001';

test('course page lists external reviews from the demo index and outbound search links', async ({ page, request }) => {
  // The fixture's 115-1 線性代數 offering at nthu (DEMO201); fixtures/external-reviews/ptt-demo.json has one
  // matched post for it, by the offering's own teacher 王示範.
  const search = await request.get(`${API}/api/courses`, { params: { q: '線性', school: 'nthu', term: '115-1' } });
  const [course] = (await search.json()) as { id: string; courseCode: string }[];
  expect(course?.courseCode).toBe('DEMO201');

  await page.goto(`/courses/${course.id}`);

  // The page head links to the section with its size.
  await expect(page.getByRole('navigation', { name: '跳到本頁段落' }).getByRole('link', { name: /外部評價/ })).toContainText('PTT 1 篇');

  const section = page.locator('#external-reviews');
  await expect(section.getByRole('heading', { name: /外部評價/ })).toContainText('1 篇');
  await expect(section).toContainText('只存標題、日期、作者帳號與開頭摘要');
  await expect(section).toContainText('DEMO_Course 板');

  // Summary first: this offering's teacher, then per-teacher filter buttons.
  const summary = section.locator('aside', { hasText: '依教師篩選' });
  await expect(summary).toContainText('本班教師');
  await expect(summary.getByRole('button', { name: /王示範/ })).toContainText('本班');

  const post = section.getByRole('listitem').filter({ hasText: '[心得] 114-2 線性代數 王示範' });
  await expect(post).toContainText('本班教師');
  await expect(post).toContainText('推 +12');
  await expect(post).toContainText('示範資料：老師講解清楚');
  await expect(post).toContainText('demo_user1');
  const link = post.getByRole('link', { name: /線性代數 王示範/ });
  await expect(link).toHaveAttribute('href', 'https://example.com/demo/ptt/DEMO_Course/1');
  await expect(link).toHaveAttribute('target', '_blank');

  // Filters work after hydration and say what they narrowed to.
  const chips = section.getByRole('group', { name: '文章類型' });
  await expect(chips.getByRole('button', { name: /全部/ })).toHaveAttribute('aria-pressed', 'true');
  const reviews = chips.getByRole('button', { name: /心得評價/ });
  await expect(reviews).toBeEnabled();
  await reviews.click();
  await expect(reviews).toHaveAttribute('aria-pressed', 'true');
  await expect(section.getByRole('button', { name: '清除篩選' })).toBeVisible();
  await expect(post).toBeVisible();

  // Link-only sources: search buttons, nothing copied from those sites.
  const elsewhere = section.getByRole('list', { name: '到其他網站搜尋' });
  await expect(elsewhere.getByRole('link', { name: /在 OPT 歐趴糖 搜尋/ })).toHaveAttribute(
    'href',
    /^https:\/\/www\.1111opt\.com\.tw\/search-result\//
  );
  await expect(elsewhere.getByRole('link', { name: /在 Dcard 搜尋/ })).toHaveAttribute(
    'href',
    'https://www.dcard.tw/search?query=%E6%B8%85%E5%A4%A7%20%E7%B7%9A%E6%80%A7%E4%BB%A3%E6%95%B8%20%E7%8E%8B%E7%A4%BA%E7%AF%84'
  );

  // No horizontal page scroll on a phone.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
