/**
 * The course-site landscape (`/landscape`): every course-related website per school, read from
 * `data/course-sites.json` and `data/institutions.json` at build time. Labels, filters and the
 * grouping used by the page live here so the route stays a thin view.
 */
import rawSites from '../../../../data/course-sites.json';
import rawInstitutions from '../../../../data/institutions.json';
import type { EducationSystem, Ownership } from '$lib/institutions';
import { systemLabels, systems } from '$lib/institutions';

export type SiteScope = 'school' | 'multi_school' | 'national';
export type SiteOperator = 'official' | 'student' | 'company' | 'government' | 'community' | 'unknown';
export type SiteStatus = 'active' | 'inactive' | 'unknown';
export type SiteLogin = boolean | 'partial' | 'unknown';
export type SiteCategory =
  | 'course_query' | 'syllabus' | 'course_map' | 'enrollment' | 'lms' | 'review' | 'schedule_planner'
  | 'aggregator' | 'open_data' | 'grade_distribution' | 'forum' | 'api' | 'other';
export type SiteSource = 'web' | 'app_ios' | 'app_android' | 'browser_extension' | 'github' | 'line_bot' | 'discord';

export interface Site {
  name: string;
  url: string;
  /** MOE school codes; empty for cross-school platforms. */
  schools: string[];
  scope: SiteScope;
  operator: SiteOperator;
  operatorName: string | null;
  category: SiteCategory[];
  features: string | null;
  loginRequired: SiteLogin;
  status: SiteStatus;
  lastChecked: string;
  sourceType: SiteSource;
  repo: string | null;
  notes: string | null;
}

export interface LandscapeInstitution {
  code: string;
  name: string;
  nameEn: string | null;
  slug: string | null;
  system: EducationSystem;
  ownership: Ownership;
  city: string | null;
}

// Only the fields the page shows are kept; the research `evidence` URLs would double the payload.
export const sites: Site[] = (rawSites as (Site & { evidence?: unknown })[]).map(
  ({ name, url, schools, scope, operator, operatorName, category, features, loginRequired, status, lastChecked, sourceType, repo, notes }) => ({
    name, url, schools, scope, operator, operatorName, category, features, loginRequired, status, lastChecked, sourceType, repo, notes
  })
);
export const institutions = (rawInstitutions as LandscapeInstitution[])
  .slice()
  .sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
export const institutionsByCode = new Map(institutions.map((institution) => [institution.code, institution]));

/** All sites were checked on the same day; the page reports that date as the survey date. */
export const checkedAt = sites.reduce((latest, site) => (site.lastChecked > latest ? site.lastChecked : latest), '');

export const categoryLabels: Record<SiteCategory, string> = {
  course_query: '課程查詢',
  syllabus: '教學大綱',
  course_map: '課程地圖',
  enrollment: '選課',
  lms: 'LMS',
  review: '評價',
  schedule_planner: '排課',
  aggregator: '彙整',
  open_data: '開放資料',
  grade_distribution: '成績分布',
  forum: '討論',
  api: 'API',
  other: '其他'
};
export const categories = Object.keys(categoryLabels) as SiteCategory[];

export const operatorLabels: Record<SiteOperator, string> = {
  official: '校方',
  government: '政府',
  student: '學生',
  company: '公司',
  community: '社群',
  unknown: '不明'
};

export const statusLabels: Record<SiteStatus, string> = { active: '運作中', inactive: '停止', unknown: '不明' };
export const siteStatuses = Object.keys(statusLabels) as SiteStatus[];

export const sourceLabels: Record<SiteSource, string> = {
  web: '網站',
  app_ios: 'iOS App',
  app_android: 'Android App',
  browser_extension: '瀏覽器擴充',
  github: 'GitHub',
  line_bot: 'LINE Bot',
  discord: 'Discord'
};

export function loginLabel(login: SiteLogin) {
  if (login === true) return '需登入';
  if (login === false) return '免登入';
  return login === 'partial' ? '部分需登入' : '登入不明';
}

/** Official = run by the school or a government body; everything else counts as third party. */
export function isOfficial(site: Pick<Site, 'operator'>) {
  return site.operator === 'official' || site.operator === 'government';
}

/** A site that belongs to exactly one school (cross-school platforms are listed separately). */
export function isSchoolSite(site: Pick<Site, 'scope' | 'schools'>) {
  return site.scope === 'school' && site.schools.length === 1;
}

/**
 * How UniCourse treats a third-party site's content (plan.md): posts from boards whose robots
 * `Content-Signal` allows search get a ≤ 120-character excerpt in the review index; every other
 * site only gets an outbound link.
 */
export type IndexPolicy = 'excerpt' | 'link';
export const indexPolicyLabels: Record<IndexPolicy, string> = { excerpt: '索引摘要', link: '只給連結' };
export function indexPolicy(site: Pick<Site, 'url'>): IndexPolicy {
  try {
    return new URL(site.url).hostname.endsWith('ptt.cc') ? 'excerpt' : 'link';
  } catch {
    return 'link';
  }
}

export type SiteKind = 'official' | 'third';
export const kindLabels: Record<SiteKind, string> = { official: '官方', third: '第三方' };

export interface LandscapeFilters {
  q: string;
  system: EducationSystem | '';
  kind: SiteKind | '';
  category: SiteCategory | '';
  status: SiteStatus | '';
  /** Only schools with at least one third-party site. */
  third: boolean;
}

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | '' {
  return allowed.includes(value as T) ? (value as T) : '';
}

export function parseLandscapeFilters(params: URLSearchParams): LandscapeFilters {
  return {
    q: (params.get('q') ?? '').trim().slice(0, 100),
    system: pick(params.get('system'), systems),
    kind: pick(params.get('kind'), ['official', 'third'] as const),
    category: pick(params.get('category'), categories),
    status: pick(params.get('status'), siteStatuses),
    third: params.get('third') === '1'
  };
}

export function isFiltered(filters: LandscapeFilters) {
  return !!(filters.q || filters.system || filters.kind || filters.category || filters.status || filters.third);
}

// The MOE list spells 臺; most people type 台.
const normalize = (value: string) => value.toLowerCase().replaceAll('台', '臺');

function siteMatches(site: Site, filters: LandscapeFilters, schoolNames: string[]) {
  if (filters.kind === 'official' && !isOfficial(site)) return false;
  if (filters.kind === 'third' && isOfficial(site)) return false;
  if (filters.status && site.status !== filters.status) return false;
  if (filters.category && !site.category.includes(filters.category)) return false;
  if (!filters.q) return true;
  const needle = normalize(filters.q);
  return [site.name, site.url, site.features, site.notes, site.operatorName, ...schoolNames].some(
    (field) => !!field && normalize(field).includes(needle)
  );
}

export interface SchoolSection {
  code: string;
  /** Anchor id: crawler slug when there is one, otherwise `s-<code>`. */
  id: string;
  name: string;
  slug: string | null;
  system: EducationSystem;
  systemLabel: string;
  ownership: Ownership;
  city: string | null;
  official: Site[];
  third: Site[];
  /** Cross-school platforms that list this school. */
  via: Pick<Site, 'name' | 'url'>[];
}

export interface Landscape {
  filters: LandscapeFilters;
  checkedAt: string;
  totalSites: number;
  totalSchools: number;
  /** Schools with at least one surveyed site, whole dataset (the filtered count is in `stats`). */
  surveyedSchools: number;
  shownSites: number;
  stats: {
    schools: number;
    official: number;
    third: number;
    active: number;
    inactive: number;
    unknown: number;
  };
  /** Status split per education system (filtered set), for the stacked bars. */
  bySystem: { system: EducationSystem; label: string; active: number; inactive: number; unknown: number }[];
  /** Schools with the most third-party sites (whole dataset). */
  topThird: { code: string; id: string; name: string; count: number }[];
  thirdParty: Site[];
  cross: Site[];
  schools: SchoolSection[];
}

const schoolNameCache = new Map<Site, string[]>();
function schoolNames(site: Site) {
  let names = schoolNameCache.get(site);
  if (!names) {
    names = site.schools.flatMap((code) => {
      const institution = institutionsByCode.get(code);
      return institution ? [institution.name, institution.nameEn ?? '', institution.slug ?? ''] : [];
    });
    schoolNameCache.set(site, names);
  }
  return names;
}

const byStatusThenName = (a: Site, b: Site) =>
  Number(a.status !== 'active') - Number(b.status !== 'active') || a.name.localeCompare(b.name, 'zh-Hant');

const inSystem = (site: Site, system: EducationSystem) =>
  site.schools.some((code) => institutionsByCode.get(code)?.system === system);

export function buildLandscape(filters: LandscapeFilters): Landscape {
  const kept = sites.filter(
    (site) => siteMatches(site, filters, schoolNames(site)) && (!filters.system || inSystem(site, filters.system))
  );
  const cross = kept
    .filter((site) => !isSchoolSite(site))
    .sort((a, b) => Number(a.scope !== 'national') - Number(b.scope !== 'national') || byStatusThenName(a, b));

  const schools: SchoolSection[] = [];
  for (const institution of institutions) {
    if (filters.system && institution.system !== filters.system) continue;
    const own = kept.filter((site) => isSchoolSite(site) && site.schools[0] === institution.code);
    const official = own.filter(isOfficial).sort(byStatusThenName);
    const third = own.filter((site) => !isOfficial(site)).sort(byStatusThenName);
    if (filters.third && third.length === 0) continue;
    // Keep schools that have nothing when the list is unfiltered, so the survey gaps stay visible.
    if (own.length === 0 && isFiltered(filters)) continue;
    const via = sites
      .filter((site) => !isSchoolSite(site) && site.schools.includes(institution.code))
      .map(({ name, url }) => ({ name, url }));
    schools.push({
      code: institution.code,
      id: institution.slug ?? `s-${institution.code}`,
      name: institution.name,
      slug: institution.slug,
      system: institution.system,
      systemLabel: systemLabels[institution.system],
      ownership: institution.ownership,
      city: institution.city,
      official,
      third,
      via
    });
  }

  const count = (predicate: (site: Site) => boolean) => kept.filter(predicate).length;

  const bySystem = systems
    .map((system) => {
      const rows = kept.filter((site) => inSystem(site, system));
      return {
        system,
        label: systemLabels[system],
        active: rows.filter((site) => site.status === 'active').length,
        inactive: rows.filter((site) => site.status === 'inactive').length,
        unknown: rows.filter((site) => site.status === 'unknown').length
      };
    })
    .filter((row) => row.active + row.inactive + row.unknown > 0);

  const thirdCounts = new Map<string, number>();
  for (const site of sites) {
    if (isOfficial(site) || !isSchoolSite(site)) continue;
    thirdCounts.set(site.schools[0], (thirdCounts.get(site.schools[0]) ?? 0) + 1);
  }
  const topThird = [...thirdCounts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, 6)
    .flatMap(([code, count]) => {
      const institution = institutionsByCode.get(code);
      return institution ? [{ code, id: institution.slug ?? `s-${code}`, name: institution.name, count }] : [];
    });

  return {
    filters,
    checkedAt,
    totalSites: sites.length,
    totalSchools: institutions.length,
    surveyedSchools: new Set(sites.flatMap((site) => site.schools)).size,
    shownSites: kept.length,
    stats: {
      schools: new Set(kept.flatMap((site) => site.schools)).size,
      official: count(isOfficial),
      third: count((site) => !isOfficial(site)),
      active: count((site) => site.status === 'active'),
      inactive: count((site) => site.status === 'inactive'),
      unknown: count((site) => site.status === 'unknown')
    },
    bySystem,
    topThird,
    thirdParty: kept.filter((site) => !isOfficial(site)).sort(byStatusThenName),
    cross,
    schools
  };
}
