import { fail, redirect } from '@sveltejs/kit';
import { safeNext } from '$lib/community-paths';
import { overviewSearchHref, searchPageSize, searchSorts } from '$lib/overview-paths';
import { catalog } from '$lib/server/catalog';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url }) => {
  const client = catalog(fetch);
  const params = url.searchParams;
  const query = params.get('q')?.trim() ?? '';
  const school = params.get('school')?.trim() ?? '';
  const department = params.get('department')?.trim() ?? '';
  const requestedTerm = params.get('term');
  const requestedSort = params.get('sort');
  const sort = searchSorts.find((option) => option.value === requestedSort)?.value ?? 'relevance';
  const requestedPage = Number(params.get('page'));
  const page = Number.isSafeInteger(requestedPage * searchPageSize) && requestedPage > 0 && Number.isInteger(requestedPage)
    ? requestedPage : 1;
  const isSearch = Boolean(query || school || requestedTerm || department || requestedSort || page > 1);

  const base = Promise.all([
    client.GET('/api/schools').catch(() => null),
    client.GET('/api/terms').catch(() => null)
  ]);

  if (!isSearch) {
    const rankSchool = params.get('rank_school') || '';
    const expanded = params.get('rank_limit') === '50';
    const [[schools, terms], rankings, overview, institutions] = await Promise.all([
      base,
      client.GET('/api/rankings/courses', {
        params: { query: { school: rankSchool || undefined, limit: expanded ? 50 : 10 } }
      }).catch(() => null),
      client.GET('/api/stats/overview').catch(() => null),
      client.GET('/api/institutions').catch(() => null)
    ]);

    return {
      schools: schools?.data ?? [], terms: terms?.data ?? [],
      content: {
        kind: 'overview' as const, rankSchool, expanded, rankings: rankings?.data ?? null,
        totals: overview?.data?.totals ?? null, schoolStats: overview?.data?.schools ?? [],
        institutions: institutions?.data?.institutions ?? null
      }
    };
  }

  const [[schools, terms], departments] = await Promise.all([
    base,
    school ? client.GET('/api/departments', { params: { query: { school } } }).catch(() => null) : null
  ]);
  const term = requestedTerm || terms?.data?.[0] || 'all';
  const filters = { query, school, department, term, sort };
  const options = terms?.data ?? [];
  const result = await client.GET('/api/courses/search', {
    params: {
      query: {
        q: query || undefined, school: school || undefined, term: term === 'all' ? undefined : term,
        department: department || undefined, sort, offset: (page - 1) * searchPageSize
      }
    }
  }).catch(() => null);
  const totalPages = Math.max(1, Math.ceil((result?.data?.total ?? 0) / searchPageSize));
  if (result?.data && page > totalPages) redirect(307, overviewSearchHref({ ...filters, page: totalPages }));

  return {
    schools: schools?.data ?? [],
    terms: term !== 'all' && !options.includes(term) ? [term, ...options] : options,
    content: {
      kind: 'search' as const, filters, page, totalPages, result: result?.data ?? null,
      invalid: result?.response.status === 400, departments: departments?.data ?? null
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
