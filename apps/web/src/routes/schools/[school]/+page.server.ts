import { error } from '@sveltejs/kit';
import { catalog } from '$lib/server/catalog';
import type { PageServerLoad } from './$types';

const UNAVAILABLE = '暫時無法載入學校資料，請稍後再試。';

export const load: PageServerLoad = async ({ fetch, params, url }) => {
  const client = catalog(fetch);
  const path = { school: params.school };
  const includeNonAcademic = url.searchParams.get('include_non_academic') === 'true';
  const rankingQuery = { ...path, limit: 10, academic: !includeNonAcademic };
  const [result, institutionResult, trendResult, rankingResult] = await Promise.all([
    client.GET('/api/schools/{school}', { params: { path } }).catch(() => error(503, UNAVAILABLE)),
    client.GET('/api/institutions').catch(() => null),
    client.GET('/api/schools/{school}/trends', { params: { path } }).catch(() => null),
    client.GET('/api/rankings/courses', { params: { query: rankingQuery } }).catch(() => null)
  ]);

  if (result.response.status === 404) error(404, '找不到這所學校。');
  if (!result.data) error(503, UNAVAILABLE);
  const { departments, ...school } = result.data;
  const query = (url.searchParams.get('unit') ?? '').trim().slice(0, 100);
  const normalize = (value: string) => value.toLocaleLowerCase('zh-TW').replaceAll('台', '臺');
  const matches = departments.filter(({ name }) => normalize(name).includes(normalize(query)))
    .sort((left, right) => right.offerings - left.offerings || left.name.localeCompare(right.name, 'zh-TW'));
  const pageSize = 24;
  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
  const requestedPage = Number(url.searchParams.get('page'));
  const page = Number.isSafeInteger(requestedPage) ? Math.min(Math.max(1, requestedPage), totalPages) : 1;
  return {
    school,
    institution: institutionResult?.data?.institutions.find(({ slug }) => slug === school.slug) ?? null,
    trends: trendResult?.data ?? null,
    rankings: rankingResult?.data ?? null,
    includeNonAcademic,
    units: {
      query, page, totalPages, total: departments.length, matched: matches.length, start: (page - 1) * pageSize + 1,
      max: departments.reduce((highest, unit) => Math.max(highest, unit.offerings), 0),
      rows: matches.slice((page - 1) * pageSize, page * pageSize)
    }
  };
};
