import { fail, redirect } from '@sveltejs/kit';
import { safeNext } from '$lib/community-paths';
import { coverage } from '$lib/institutions';
import { overviewSearchHref, searchPageSize, searchSorts } from '$lib/overview-paths';
import { catalog } from '$lib/server/catalog';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url }) => {
  const client = catalog(fetch);
  const params = url.searchParams;
  const query = params.get('q')?.trim() ?? '';
  const school = params.get('school')?.trim() ?? '';
  const requestedDepartment = params.get('department')?.trim() ?? '';
  const requestedTerm = params.get('term');
  const requestedSort = params.get('sort');
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
    const expanded = params.get('rank_limit') === '50';
    const includeNonAcademic = params.get('include_non_academic') === 'true';
    const rankingQuery = { school: rankSchool || undefined, limit: expanded ? 50 : 10, academic: !includeNonAcademic };
    const [[schools, terms], rankings, directory] = await Promise.all([
      base,
      client.GET('/api/rankings/courses', {
        params: { query: rankingQuery }
      }).catch(() => null),
      client.GET('/api/institutions').catch(() => null)
    ]);
    const institutions = directory?.data?.institutions ?? null;

    return {
      schools: schools?.data ?? [], terms: terms?.data ?? [],
      content: {
        kind: 'overview' as const, rankSchool, expanded, includeNonAcademic, rankings: rankings?.data ?? null,
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
  const filters = { query, school, department, term, sort };
  const options = terms?.data ?? [];
  const scope = { school: school || undefined, term: term === 'all' ? undefined : term, department: department || undefined };
  const result = await client.GET('/api/courses/search', {
    params: { query: { ...scope, q: query || undefined, sort, offset: (page - 1) * searchPageSize } }
  }).catch(() => null);
  const totalPages = Math.max(1, Math.ceil((result?.data?.total ?? 0) / searchPageSize));
  if (result?.data && page > totalPages) redirect(307, overviewSearchHref({ ...filters, page: totalPages }));

  const titlePrefix = query.match(/^\p{Script=Han}{4,}/u)?.[0];
  const codePrefix = query.match(/^([A-Za-z]{1,8}\d{3,12})[-\s]+\w+$/)?.[1];
  const shorter = titlePrefix ? Array.from(titlePrefix).slice(0, -1).slice(0, 6).join('') : codePrefix;
  const near = result?.data?.total === 0 && shorter ? await client.GET('/api/courses/search', {
    params: { query: { ...scope, q: shorter, sort: 'relevance' } }
  }).catch(() => null) : null;

  return {
    schools: schools?.data ?? [],
    terms: term !== 'all' && !options.includes(term) ? [term, ...options] : options,
    content: {
      kind: 'search' as const, filters, page, totalPages, result: result?.data ? { ...result.data, courses: result.data.courses.slice(0, searchPageSize) } : null,
      suggestion: shorter && near?.data?.total ? shorter : null,
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
