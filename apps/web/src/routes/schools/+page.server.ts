import { error } from '@sveltejs/kit';
import { groupBySystem, matches, parseFilters, statuses, systems } from '$lib/institutions';
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

  return {
    filters,
    updatedAt: updatedAt ?? null,
    total: institutions.length,
    counts: statuses.map((status) => ({
      status,
      count: institutions.filter((institution) => institution.status === status).length
    })),
    // Only offer systems that have schools (the MOE list has no 軍警校院 rows).
    systems: systems.filter((system) => institutions.some((institution) => institution.system === system)),
    shown: shown.length,
    groups: groupBySystem(shown)
  };
};
