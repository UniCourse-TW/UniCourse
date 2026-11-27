import { fail, redirect } from '@sveltejs/kit';
import { safeNext } from '$lib/community-paths';
import { coverage } from '$lib/institutions';
import { overviewSearchHref, searchPageSize, searchSorts, type OverviewSearchFilters } from '$lib/overview-paths';
import { catalog } from '$lib/server/catalog';
import type { Actions, PageServerLoad } from './$types';

function editDistance(left: string, right: string) {
  const leftChars = Array.from(left.normalize('NFC').toLowerCase());
  const rightChars = Array.from(right.normalize('NFC').toLowerCase());
  if (Math.abs(leftChars.length - rightChars.length) > 2) return Infinity;
  let previous = Array.from({ length: rightChars.length + 1 }, (_, index) => index);
  for (const [index, char] of leftChars.entries()) {
    const next = [index + 1];
    for (const [offset, other] of rightChars.entries()) {
      next.push(Math.min(next[offset] + 1, previous[offset + 1] + 1, previous[offset] + Number(char !== other)));
    }
    previous = next;
  }
  return previous[rightChars.length];
}

export const load: PageServerLoad = async ({ fetch, url }) => {
  const client = catalog(fetch);
  const params = url.searchParams;
  const query = params.get('q')?.trim() ?? '';
  const school = params.get('school')?.trim() ?? '';
  const requestedDepartment = params.get('department')?.trim() ?? '';
  const requestedTerm = params.get('all_terms') === '1' ? 'all' : params.get('term');
  const requestedSort = params.get('sort');
  const requestedGroup = params.get('group');
  const group = requestedGroup === 'term' || requestedGroup === 'title' || requestedGroup === 'none' ? requestedGroup : undefined;
  const sort = searchSorts.find((option) => option.value === requestedSort)?.value ?? 'relevance';
  const requestedPage = Number(params.get('page'));
  const page = Number.isSafeInteger(requestedPage * searchPageSize) && requestedPage > 0 && Number.isInteger(requestedPage)
    ? requestedPage : 1;
  const isSearch = Boolean(query || school || requestedTerm || requestedDepartment || requestedSort || page > 1);

  const base = Promise.all([
    client.GET('/api/schools').catch(() => null),
    client.GET('/api/terms').catch(() => null)
  ]);

  if (!isSearch) {
    const rankSchool = params.get('rank_school') || '';
    const diverse = !rankSchool && params.get('rank_view') !== 'overall';
    const expanded = params.get('rank_limit') === '50';
    const includeNonAcademic = params.get('include_non_academic') === 'true';
    const rankingQuery = { school: rankSchool || undefined, limit: diverse ? 100 : expanded ? 50 : 10, academic: !includeNonAcademic };
    const [[schools, terms], rankings, directory] = await Promise.all([
      base,
      client.GET('/api/rankings/courses', {
        params: { query: rankingQuery }
      }).catch(() => null),
      client.GET('/api/institutions').catch(() => null)
    ]);
    const institutions = directory?.data?.institutions ?? null;
    const counts = new Map<string, number>();
    const rankedRows = diverse ? rankings?.data?.filter((row) => {
      if (row.enrolledTotal == null) return false;
      const count = counts.get(row.school) ?? 0;
      counts.set(row.school, count + 1);
      return count < 2;
    }).slice(0, expanded ? 50 : 10) : rankings?.data;

    return {
      schools: schools?.data ?? [], terms: terms?.data ?? [],
      content: {
        kind: 'overview' as const, rankSchool, diverse, expanded, includeNonAcademic, rankings: rankedRows ?? null,
        totals: institutions ? coverage(institutions) : null, latest: directory?.data?.updatedAt ?? null, institutions
      }
    };
  }

  const [[schools, terms], departments] = await Promise.all([
    base,
    school ? client.GET('/api/departments', { params: { query: { school } } }).catch(() => null) : null
  ]);
  const term = requestedTerm || terms?.data?.[0] || 'all';
  const knownDepartments = departments?.data ?? [];
  const departmentMatches = requestedDepartment && requestedDepartment.length <= 100 && !knownDepartments.includes(requestedDepartment)
    ? knownDepartments.filter((name) => name.toLowerCase().includes(requestedDepartment.toLowerCase())) : [];
  const department = departmentMatches.length === 1 ? departmentMatches[0] : requestedDepartment;
  const filters: OverviewSearchFilters = { query, school, department, term, sort, group };
  const options = terms?.data ?? [];
  const scope = { school: school || undefined, term: term === 'all' ? undefined : term, department: department || undefined };
  const result = await client.GET('/api/courses/search', {
    params: { query: { ...scope, q: query || undefined, sort, offset: (page - 1) * searchPageSize } }
  }).catch(() => null);
  const totalPages = Math.max(1, Math.ceil((result?.data?.total ?? 0) / searchPageSize));
  if (result?.data && page > totalPages) redirect(307, overviewSearchHref({ ...filters, page: totalPages }));

  const looksLikeName = /^\p{Script=Han}{3,24}$/u.test(query) || /^[a-z][a-z ]{3,23}$/i.test(query);
  const codePrefix = query.match(/^([A-Za-z]{1,8}\d{3,12})[-\s]+\w+$/)?.[1];
  const chars = Array.from(query);
  const chunk = Math.max(2, Math.min(6, Math.floor(chars.length / 2)));
  const fragments = codePrefix ? [codePrefix] : looksLikeName ? [chars.slice(0, chunk).join('').trim(), chars.slice(-chunk).join('').trim()] : [];
  const nearby = result?.data?.total === 0 ? await Promise.all([...new Set(fragments)].filter((fragment) => fragment.length >= 2).map((fragment) => client.GET('/api/courses/search', {
    params: { query: { ...scope, q: fragment, sort: 'relevance' } }
  }).catch(() => null))) : [];
  const candidates = new Set(nearby.flatMap((response) => (response?.data?.courses ?? []).flatMap(({ title, titleEn, courseCode, instructors }) =>
    codePrefix ? [courseCode] : [title, ...(titleEn ? [titleEn] : []), ...instructors])));
  const suggestions = [...candidates].map((text) => ({ text, distance: editDistance(codePrefix ?? query, text) }))
    .filter(({ distance }) => distance <= (chars.length < 7 ? 1 : 2))
    .sort((left, right) => left.distance - right.distance).slice(0, 5).map(({ text }) => text);

  return {
    schools: schools?.data ?? [],
    terms: term !== 'all' && !options.includes(term) ? [term, ...options] : options,
    content: {
      kind: 'search' as const, filters, page, totalPages, result: result?.data ? { ...result.data, courses: result.data.courses.slice(0, searchPageSize) } : null,
      suggestions,
      invalid: result?.response.status === 400,
      departments: departments?.data ?? [...new Set((result?.data?.courses ?? []).flatMap((course) => course.department ? [course.department] : []))].sort()
    }
  };
};

export const actions = {
  theme: async ({ cookies, request, url }) => {
    const form = await request.formData();
    const theme = form.get('theme');
    if (theme !== 'light' && theme !== 'dark') return fail(400);

    cookies.set('uc_theme', theme, {
      path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: true, secure: url.protocol === 'https:'
    });
    const next = form.get('returnTo');
    redirect(303, safeNext(typeof next === 'string' ? next : null));
  }
} satisfies Actions;
