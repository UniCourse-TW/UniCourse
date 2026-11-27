import { error } from '@sveltejs/kit';
import { catalog } from '$lib/server/catalog';
import { loadCourseExternalReviews } from '$lib/server/course-external-reviews';
import { browseRatings } from '$lib/schools-offering-ratings';
import { buildTeachingMatrix, offeringEdition } from '$lib/schools-offerings';
import type { PageServerLoad } from './$types';

const UNAVAILABLE = '暫時無法載入教師資料，請稍後再試。';

export const load: PageServerLoad = async ({ fetch, params, url }) => {
  const client = catalog(fetch);
  const path = { school: params.school, name: params.name };
  const [result, trendResult, externalReviews] = await Promise.all([
    client.GET('/api/instructors/{school}/{name}', { params: { path } }).catch(() => error(503, UNAVAILABLE)),
    client.GET('/api/instructors/{school}/{name}/trends', { params: { path } }).catch(() => null),
    client.GET('/api/instructors/{school}/{name}/external-reviews', { params: { path } }).catch(() => null)
  ]);

  if (result.response.status === 404) error(404, '找不到這位教師。');
  if (!result.data) error(503, UNAVAILABLE);
  const { offerings, ...instructor } = result.data;
  const courseOptions = [...new Map([...offerings].reverse().map(({ courseCode, title }) => [courseCode, title]))]
    .sort((left, right) => left[1].localeCompare(right[1], 'zh-TW'))
    .map(([value, title]) => ({ value, label: `${title} · ${value}` }));
  const term = url.searchParams.get('term') ?? '';
  const courseCode = url.searchParams.get('course') ?? '';
  const oldestFirst = url.searchParams.get('sort') === 'oldest';
  const matches = offerings.filter((row) => (!term || row.term === term) && (!courseCode || row.courseCode === courseCode));
  if (oldestFirst) matches.sort((left, right) => left.term.localeCompare(right.term, undefined, { numeric: true }));
  const requestedPage = Number(url.searchParams.get('page'));
  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
  const page = Number.isSafeInteger(requestedPage) ? Math.min(Math.max(1, requestedPage), totalPages) : 1;
  const rows = matches.slice((page - 1) * pageSize, page * pageSize);
  const recentCodes = [...new Set(offerings.map(({ courseCode }) => courseCode))].slice(0, 5);
  const [summaryRatings, courseReviews] = await Promise.all([
    browseRatings(client, instructor.school, offerings),
    externalReviews?.data && !externalReviews.data.posts.length ? Promise.all(recentCodes.map(async (code) => {
      const row = offerings.find(({ courseCode }) => courseCode === code)!;
      const reviews = await loadCourseExternalReviews(fetch, instructor.school, code);
      return { id: row.id, title: row.title, count: reviews?.sources.reduce((sum, source) => sum + source.count, 0) ?? 0 };
    })) : []
  ]);

  return {
    instructor, courses: courseOptions, term, courseCode, oldestFirst, rows, matched: matches.length, page, totalPages,
    listedTerms: [...new Set(offerings.map(({ term }) => term))].sort().reverse(), firstRow: (page - 1) * pageSize + 1,
    matrix: buildTeachingMatrix(offerings, offerings.length === instructor.summary.offerings), trends: trendResult?.data ?? null, summaryRatings,
    externalReviews: externalReviews?.data ?? null,
    courseReviews: courseReviews.filter(({ count }) => count > 0),
    listed: offerings.length,
    updatedAt: offeringEdition(offerings)
  };
};
