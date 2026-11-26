import { error } from '@sveltejs/kit';
import { catalog } from '$lib/server/catalog';
import { browseRatings } from '$lib/schools-offering-ratings';
import { buildTeachingMatrix, offeringEdition } from '$lib/schools-offerings';
import type { PageServerLoad } from './$types';

const UNAVAILABLE = '暫時無法載入教師資料，請稍後再試。';

export const load: PageServerLoad = async ({ fetch, params, url }) => {
  const client = catalog(fetch);
  const path = { school: params.school, name: params.name };
  const [result, trendResult] = await Promise.all([
    client.GET('/api/instructors/{school}/{name}', { params: { path } }).catch(() => error(503, UNAVAILABLE)),
    client.GET('/api/instructors/{school}/{name}/trends', { params: { path } }).catch(() => null)
  ]);

  if (result.response.status === 404) error(404, '找不到這位教師。');
  if (!result.data) error(503, UNAVAILABLE);
  const { offerings, ...instructor } = result.data;
  const courseOptions = [...new Map([...offerings].reverse().map(({ courseCode, title }) => [courseCode, title]))]
    .sort((left, right) => left[1].localeCompare(right[1], 'zh-TW'))
    .map(([value, title]) => ({ value, label: `${title} · ${value}` }));
  const term = url.searchParams.get('term') ?? '';
  const courseCode = url.searchParams.get('course') ?? '';
  const matches = offerings.filter((row) => (!term || row.term === term) && (!courseCode || row.courseCode === courseCode));
  const requestedPage = Number(url.searchParams.get('page'));
  const pageSize = 30;
  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
  const page = Number.isSafeInteger(requestedPage) ? Math.min(Math.max(1, requestedPage), totalPages) : 1;
  const rows = matches.slice((page - 1) * pageSize, page * pageSize);
  const [summaryRatings, ratings] = await Promise.all([
    browseRatings(client, instructor.school, offerings),
    term || courseCode || page > 1 ? browseRatings(client, instructor.school, rows) : null
  ]);

  return {
    instructor, courses: courseOptions, term, courseCode, rows, matched: matches.length, page, totalPages,
    listedTerms: [...new Set(offerings.map(({ term }) => term))].sort().reverse(), firstRow: (page - 1) * pageSize + 1,
    matrix: buildTeachingMatrix(offerings), trends: trendResult?.data ?? null, summaryRatings,
    ratings: ratings ?? summaryRatings,
    listed: offerings.length,
    updatedAt: offeringEdition(offerings)
  };
};
