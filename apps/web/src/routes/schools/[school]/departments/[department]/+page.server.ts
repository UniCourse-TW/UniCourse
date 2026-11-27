import { error } from '@sveltejs/kit';
import { catalog } from '$lib/server/catalog';
import { searchSorts } from '$lib/overview-paths';
import { browseRatings } from '$lib/schools-offering-ratings';
import { offeringEdition } from '$lib/schools-offerings';
import type { PageServerLoad } from './$types';

const UNAVAILABLE = '暫時無法載入開課單位，請稍後再試。';

export const load: PageServerLoad = async ({ fetch, params, url }) => {
  const client = catalog(fetch);
  const path = { school: params.school, department: params.department };
  const rawTerm = url.searchParams.get('term');
  const requestedTerm = rawTerm === 'all' || (rawTerm && /^\d{3,4}-[1-9]$/.test(rawTerm)) ? rawTerm : undefined;
  const detail = (term?: string) => client.GET('/api/schools/{school}/departments/{department}', {
    params: { path, query: { term: term === 'all' ? undefined : term } }
  }).catch(() => error(503, UNAVAILABLE));
  const trendRequest = client.GET('/api/schools/{school}/departments/{department}/trends', { params: { path } }).catch(() => null);
  const institutionRequest = client.GET('/api/institutions').catch(() => null);
  const [trendResult, requestedResult] = await Promise.all([trendRequest, requestedTerm ? detail(requestedTerm) : null]);
  const trends = trendResult?.data ?? null;
  let term = requestedTerm ?? trends?.[0]?.term;
  let result = requestedResult ?? await detail(term);

  if (result.response.status === 404) error(404, '找不到這個開課單位。');
  if (!result.data) error(503, UNAVAILABLE);
  if (!term) {
    term = result.data.terms[0] ?? 'all';
    result = await detail(term);
    if (!result.data) error(503, UNAVAILABLE);
  }

  const { offerings: sample, terms, total, ...department } = result.data;
  const query = (url.searchParams.get('q') ?? '').trim().replace(/[\r\n\0]/g, ' ').slice(0, 100);
  const sort = searchSorts.find(({ value }) => value === url.searchParams.get('sort'))?.value ?? (query ? 'relevance' : 'enrolled');
  const classFilter = ['required', 'elective'].find((value) => value === url.searchParams.get('class_filter')) ?? '';
  const requestedPage = Number(url.searchParams.get('page'));
  // Search returns up to 50 rows per request. Retain the full batch while a
  // requirement is applied, so a small term is filtered in full.
  const pageSize = classFilter ? 50 : 24;
  const safePage = Number.isSafeInteger(requestedPage) ? Math.max(1, requestedPage) : 1;
  let page = Math.min(safePage, Math.max(1, Math.ceil(total / pageSize)));
  const results = (pageNumber: number) => client.GET('/api/courses/search', {
    params: { query: { ...path, term: term === 'all' ? undefined : term, q: query || undefined, sort, offset: (pageNumber - 1) * pageSize } }
  }).catch(() => null);
  let offerings = sample;
  let matches = total;
  let resultsError = false;
  if (total || query) {
    let search = await results(page);
    const finalPage = Math.max(1, Math.ceil((search?.data?.total ?? total) / pageSize));
    if (page > finalPage) {
      page = finalPage;
      search = await results(page);
    }
    offerings = search?.data?.courses.slice(0, pageSize) ?? [];
    matches = search?.data?.total ?? 0;
    resultsError = !search?.data;
  }

  const [institution, ratings] = await Promise.all([institutionRequest, browseRatings(client, department.school, offerings)]);
  return {
    department, trends, terms, term, total, offerings, ratings, query, sort, classFilter, resultsError, matches, page,
    totalPages: Math.max(1, Math.ceil(matches / pageSize)), firstRow: (page - 1) * pageSize + 1,
    updatedAt: offeringEdition(sample),
    complete: sample.length === total,
    breakdown: {
      required: sample.filter(({ requirement }) => requirement === 'required').length,
      elective: sample.filter(({ requirement }) => requirement === 'elective').length,
      general: sample.filter(({ requirement }) => requirement === 'general').length,
      other: sample.filter(({ requirement }) => requirement === 'other').length,
      unknown: sample.filter(({ requirement }) => !requirement).length
    },
    courses: new Set(sample.map(({ courseCode }) => courseCode)).size,
    teachers: new Set(sample.flatMap(({ instructors }) => instructors)).size,
    sampleSize: sample.length,
    website: institution?.data?.institutions.find(({ slug }) => slug === department.school)?.website ?? null
  };
};
