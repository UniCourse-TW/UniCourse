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
  const latestByCourse = new Map([...offerings].reverse().map((row) => [row.courseCode, row]));
  const courseOptions = [...latestByCourse.values()]
    .sort((left, right) => left.title.localeCompare(right.title, 'zh-TW'))
    .map(({ courseCode, title }) => ({ value: courseCode, label: `${title} · ${courseCode}` }));
  const term = url.searchParams.get('term') ?? '';
  const year = url.searchParams.get('year')?.match(/^\d{3,4}$/)?.[0] ?? '';
  const courseCode = url.searchParams.get('course') ?? '';
  const oldestFirst = url.searchParams.get('sort') === 'oldest';
  const matches = offerings.filter((row) => (!year || row.term.startsWith(`${year}-`)) && (!term || row.term === term) && (!courseCode || row.courseCode === courseCode));
  if (oldestFirst) matches.sort((left, right) => left.term.localeCompare(right.term, undefined, { numeric: true }));
  const requestedPage = Number(url.searchParams.get('page'));
  const pageSize = 50;
  const groups = new Map<string, typeof offerings>();
  for (const row of matches) {
    let group = groups.get(row.courseCode);
    if (!group) groups.set(row.courseCode, group = []);
    group.push(row);
  }
  const grouped = [...groups.values()].flat();
  const termsByCourse = new Map([...groups].map(([code, group]) => {
    const termCounts = new Map<string, number>();
    for (const { term } of group) termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
    return [code, [...termCounts]];
  }));
  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
  const page = Number.isSafeInteger(requestedPage) ? Math.min(Math.max(1, requestedPage), totalPages) : 1;
  const rows = grouped.slice((page - 1) * pageSize, page * pageSize);
  const recentCodes = [...new Set(offerings.map(({ courseCode }) => courseCode))].slice(0, 5);
  const [summaryRatings, courseReviews] = await Promise.all([
    browseRatings(client, instructor.school, offerings),
    externalReviews?.data && !externalReviews.data.posts.length ? Promise.all(recentCodes.map(async (code) => {
      const row = offerings.find(({ courseCode }) => courseCode === code)!;
      const reviews = await loadCourseExternalReviews(fetch, instructor.school, code);
      return { id: row.id, title: row.title, count: reviews?.sources.reduce((sum, source) => sum + source.count, 0) ?? 0 };
    })) : []
  ]);
  const ratedCourses = [...latestByCourse.values()].flatMap((row) => {
    const stats = summaryRatings.get(row.courseCode);
    return stats?.average != null && stats.count > 0 ? [{ id: row.id, courseCode: row.courseCode, title: row.title, average: stats.average, count: stats.count }] : [];
  }).sort((left, right) => right.count - left.count);

  const matrix = buildTeachingMatrix(offerings, offerings.length === instructor.summary.offerings);
  const matrixRows = matrix.rows.map((row) => ({ ...row, department: latestByCourse.get(row.id)?.department ?? null }));

  return {
    instructor, courses: courseOptions, term, year, courseCode, oldestFirst, rows, termsByCourse, matched: matches.length, page, totalPages,
    listedTerms: [...new Set(offerings.map(({ term }) => term).filter((term) => !year || term.startsWith(`${year}-`)))].sort().reverse(), firstRow: (page - 1) * pageSize + 1,
    matrix: { periods: matrix.periods, rows: matrixRows }, trends: trendResult?.data ?? null, summaryRatings, ratedCourses,
    externalReviews: externalReviews?.data ?? null,
    courseReviews: courseReviews.filter(({ count }) => count > 0),
    listed: offerings.length,
    updatedAt: offeringEdition(offerings)
  };
};
