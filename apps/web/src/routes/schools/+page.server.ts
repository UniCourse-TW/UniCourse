import { error } from '@sveltejs/kit';
import { coverage, coverageYears, directoryStatus, groupBySystem, matches, parseFilters, schoolSorts, sortInstitutions, statuses, systems } from '$lib/institutions';
import { catalog } from '$lib/server/catalog';
import type { PageServerLoad } from './$types';

const UNAVAILABLE = '暫時無法載入各校收錄狀態，請稍後再試。';

export const load: PageServerLoad = async ({ fetch, url }) => {
  const result = await catalog(fetch)
    .GET('/api/institutions')
    .catch(() => error(503, UNAVAILABLE));
  if (!result.data) error(503, UNAVAILABLE);

  const { institutions, updatedAt } = result.data;
  const filters = parseFilters(url.searchParams);
  const shown = institutions.filter((institution) => matches(institution, filters));
  const sort = schoolSorts.find((value) => value === url.searchParams.get('sort')) ?? 'status';
  const order = url.searchParams.get('order');
  const direction = order === 'asc' || order === 'desc' ? order : sort === 'status' || sort === 'name' ? 'asc' : 'desc';
  const pageSize = 24;
  const totalPages = Math.max(1, Math.ceil(shown.length / pageSize));
  const requestedPage = Number(url.searchParams.get('page'));
  const page = Number.isSafeInteger(requestedPage) ? Math.min(Math.max(1, requestedPage), totalPages) : 1;
  const start = (page - 1) * pageSize;

  return {
    filters,
    sort,
    direction,
    page,
    totalPages,
    start,
    end: Math.min(start + pageSize, shown.length),
    years: coverageYears(institutions),
    updatedAt: updatedAt ?? null,
    total: institutions.length,
    coverage: coverage(institutions),
    counts: statuses.map((status) => ({
      status,
      count: institutions.filter((institution) => directoryStatus(institution) === status).length
    })),
    systems: systems.filter((system) => institutions.some((institution) => institution.system === system)),
    shown: shown.length,
    groups: groupBySystem(sortInstitutions(shown, sort, direction).slice(start, start + pageSize))
  };
};
