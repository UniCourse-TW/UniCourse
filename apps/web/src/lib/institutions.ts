import type { CrawlStatus, EducationSystem, Institution, Ownership } from '@unicourse/api-client';

export type { CrawlStatus, EducationSystem, Institution, Ownership } from '@unicourse/api-client';

export const statusLabels: Record<CrawlStatus, string> = {
  live: '已收錄',
  partial: '部分',
  blocked: '受阻',
  planned: '規劃中',
  none: '尚未開始'
};
export const statuses = ['live', 'partial', 'pending_import', 'blocked', 'planned', 'none'] as const;
export type DirectoryStatus = (typeof statuses)[number];
export const directoryStatusLabels: Record<DirectoryStatus, string> = { ...statusLabels, pending_import: '待匯入' };

export function hasImportedOfferings(institution: Institution) {
  return institution.terms.length > 0 && institution.offerings > 0;
}

export function directoryStatus(institution: Institution): DirectoryStatus {
  if ((institution.status === 'live' || institution.status === 'partial') && !hasImportedOfferings(institution)) {
    return 'pending_import';
  }
  return institution.status;
}

export const systemLabels: Record<EducationSystem, string> = {
  general: '一般大學',
  technical: '技職校院',
  military_police: '軍警校院',
  religious: '宗教研修學院',
  open: '空中大學'
};
export const systems = Object.keys(systemLabels) as EducationSystem[];

export const ownershipLabels: Record<Ownership, string> = { public: '公立', private: '私立' };
export const ownerships = Object.keys(ownershipLabels) as Ownership[];

const kindLabels: Record<Institution['kind'], string> = {
  university: '大學',
  college: '學院',
  junior_college: '專科學校'
};

export function kindLabel(institution: Pick<Institution, 'ownership' | 'kind'>) {
  return `${ownershipLabels[institution.ownership]}${kindLabels[institution.kind]}`;
}

export const ISSUES_URL = 'https://github.com/UniCourse-TW/UniCourse/issues';

/**
 * `/schools/{slug}` 404s until a school has imported offerings, so only crawled schools with
 * data get an internal link.
 */
export function hasSchoolPage(institution: Institution): boolean {
  return (
    (institution.status === 'live' || institution.status === 'partial') &&
    hasImportedOfferings(institution)
  );
}

export function coverage(institutions: Institution[]) {
  const schools = institutions.filter(hasImportedOfferings);
  const terms = [...new Set(schools.flatMap((school) => school.terms))].sort().reverse();
  return {
    schools: schools.length,
    terms,
    offerings: schools.reduce((total, school) => total + school.offerings, 0),
    courses: schools.reduce((total, school) => total + school.courses, 0)
  };
}

export function coveragePeriod(terms: readonly string[]) {
  const ordered = [...terms].sort();
  return ordered.length > 1 ? `${ordered[0]} 至 ${ordered.at(-1)}` : ordered[0] ?? null;
}

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | '' {
  return allowed.includes(value as T) ? (value as T) : '';
}

// The MOE list spells 臺; most people type 台.
const normalize = (value: string) => value.toLowerCase().replaceAll('台', '臺');

export function parseFilters(params: URLSearchParams) {
  return {
    system: pick(params.get('system'), systems),
    ownership: pick(params.get('ownership'), ownerships),
    status: pick(params.get('status'), statuses),
    q: (params.get('q') ?? '').trim().slice(0, 100)
  };
}
export type Filters = ReturnType<typeof parseFilters>;

export function matches(institution: Institution, filters: Filters) {
  if (filters.system && institution.system !== filters.system) return false;
  if (filters.ownership && institution.ownership !== filters.ownership) return false;
  if (filters.status && directoryStatus(institution) !== filters.status) return false;
  if (!filters.q) return true;
  const needle = normalize(filters.q);
  return [institution.name, institution.code, institution.nameEn, institution.slug].some(
    (field) => !!field && normalize(field).includes(needle)
  );
}

export const schoolSorts = ['status', 'name', 'terms', 'offerings', 'updated'] as const;
export type SchoolSort = (typeof schoolSorts)[number];
const schoolNames = new Intl.Collator('zh-TW-u-co-stroke');

export function sortInstitutions(institutions: Institution[], sort: SchoolSort, direction: 'asc' | 'desc') {
  const compare: Record<SchoolSort, (left: Institution, right: Institution) => number> = {
    status: (left, right) => statuses.indexOf(directoryStatus(left)) - statuses.indexOf(directoryStatus(right)),
    name: (left, right) => schoolNames.compare(left.name, right.name),
    terms: (left, right) => left.terms.length - right.terms.length,
    offerings: (left, right) => left.offerings - right.offerings,
    updated: (left, right) => (left.latestImportedAt ?? '').localeCompare(right.latestImportedAt ?? '')
  };
  return [...institutions].sort((left, right) => (
    (direction === 'asc' ? 1 : -1) * compare[sort](left, right) || left.code.localeCompare(right.code)
  ));
}

export function coverageYears(institutions: Institution[]) {
  const years = coverage(institutions).terms.filter((term) => /^\d{3,4}-[12]$/.test(term)).map((term) => Number(term.split('-')[0]));
  if (!years.length) return [];
  const first = Math.min(...years);
  return Array.from({ length: Math.max(...years) - first + 1 }, (_, index) => String(first + index));
}

export function yearCoverage(terms: string[], years: string[]) {
  const counts = new Map<string, number>();
  for (const term of new Set(terms)) {
    const [year, semester] = term.split('-');
    if (semester === '1' || semester === '2') counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return years.map((period) => ({ period, value: counts.get(period) ?? 0 }));
}

export function groupBySystem(institutions: Institution[]) {
  return systems
    .map((system) => ({
      system,
      label: systemLabels[system],
      institutions: institutions.filter((institution) => institution.system === system)
    }))
    .filter((group) => group.institutions.length > 0);
}
