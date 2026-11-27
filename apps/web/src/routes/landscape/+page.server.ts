import type { DirectoryStatus } from '$lib/institutions';
import { directoryStatus, hasSchoolPage } from '$lib/institutions';
import { buildLandscape, parseLandscapeFilters } from '$lib/landscape-data';
import { catalog } from '$lib/server/catalog';
import type { PageServerLoad } from './$types';

export interface CrawlState {
  status: DirectoryStatus;
  /** `/schools/{slug}` when the school has imported offerings. */
  href: string | null;
}

/**
 * The site list is static (built from `data/course-sites.json`); only each school's UniCourse crawl
 * status comes from the API. When the API is down the page still renders and says the status is
 * unavailable instead of showing nothing.
 */
async function loadCrawlStatus(fetch: typeof globalThis.fetch): Promise<Record<string, CrawlState> | null> {
  try {
    const result = await catalog(fetch).GET('/api/institutions');
    if (!result.data) return null;
    return Object.fromEntries(
      result.data.institutions.map((institution) => [
        institution.code,
        { status: directoryStatus(institution), href: hasSchoolPage(institution) ? `/schools/${institution.slug}` : null }
      ])
    );
  } catch {
    return null;
  }
}

export const load: PageServerLoad = async ({ fetch, url }) => {
  const filters = parseLandscapeFilters(url.searchParams);
  const [landscape, crawl] = await Promise.all([buildLandscape(filters), loadCrawlStatus(fetch)]);
  return { ...landscape, crawl };
};
