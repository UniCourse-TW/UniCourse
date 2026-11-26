import { error } from '@sveltejs/kit';
import { catalog } from '$lib/server/catalog';
import type { PageServerLoad } from './$types';

const UNAVAILABLE = '暫時無法查詢課程，請稍後再試。';

export const load: PageServerLoad = async ({ fetch, url }) => {
  const query = url.searchParams.get('q')?.trim() ?? '';
  const school = url.searchParams.get('school') || '';
  const department = url.searchParams.get('department')?.trim() || '';
  const termParam = url.searchParams.get('term');
  const client = catalog(fetch);

  const [schools, terms] = await Promise.all([client.GET('/api/schools'), client.GET('/api/terms')]).catch(() =>
    error(503, UNAVAILABLE)
  );
  if (!schools.data || !terms.data) error(503, UNAVAILABLE);
  const term = termParam === 'all' ? '' : termParam || terms.data[0] || '';
  const termOptions = term && !terms.data.includes(term) ? [term, ...terms.data] : terms.data;
  const filters = { query, school, term, department, schools: schools.data, terms: termOptions };

  if (!query && !school && !termParam && !department) {
    const rankSchool = url.searchParams.get('rank_school') || '';
    const [rankings, stats] = await Promise.all([
      client.GET('/api/rankings/courses', { params: { query: { school: rankSchool || undefined, limit: 20 } } }),
      client.GET('/api/stats/overview')
    ]).catch(() => error(503, '暫時無法載入課程總覽，請稍後再試。'));
    if (!rankings.data || !stats.data) error(503, '暫時無法載入課程總覽，請稍後再試。');

    return { ...filters, content: { kind: 'overview' as const, rankSchool, rankings: rankings.data, stats: stats.data } };
  }

  const courses = await client
    .GET('/api/courses', {
      params: {
        query: {
          q: query,
          school: school || undefined,
          term: term || undefined,
          department: department || undefined
        }
      }
    })
    .catch(() => error(503, UNAVAILABLE));
  if (courses.response.status === 400) error(400, '搜尋請使用 100 字以內的關鍵字。');
  if (!courses.data) error(503, UNAVAILABLE);

  return { ...filters, content: { kind: 'search' as const, courses: courses.data } };
};
