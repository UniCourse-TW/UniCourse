// `@unicourse/api-client` only re-exports the catalog types, so the schema is imported by path.
import type { components } from '../../../../packages/api-client/src/schema';

export type Institution = components['schemas']['Institution'];
export type CrawlStatus = Institution['status'];
export type EducationSystem = Institution['system'];
export type Ownership = Institution['ownership'];

export const statusLabels: Record<CrawlStatus, string> = {
  live: '已收錄',
  partial: '部分',
  blocked: '受阻',
  planned: '規劃中',
  none: '尚未開始'
};
export const statuses = Object.keys(statusLabels) as CrawlStatus[];

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
  return (institution.status === 'live' || institution.status === 'partial') && institution.terms.length > 0;
}

/** Live schools with imported data and the distinct terms they cover. */
export function coverage(institutions: Institution[]) {
  const live = institutions.filter((institution) => institution.status === 'live' && institution.terms.length > 0);
  return { schools: live.length, terms: new Set(live.flatMap((institution) => institution.terms)).size };
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
  if (filters.status && institution.status !== filters.status) return false;
  if (!filters.q) return true;
  const needle = normalize(filters.q);
  return [institution.name, institution.code, institution.nameEn, institution.slug].some(
    (field) => !!field && normalize(field).includes(needle)
  );
}

/** Rows grouped by education system (fixed order, empty groups dropped), each sorted by code. */
export function groupBySystem(institutions: Institution[]) {
  return systems
    .map((system) => ({
      system,
      label: systemLabels[system],
      institutions: institutions
        .filter((institution) => institution.system === system)
        .sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0))
    }))
    .filter((group) => group.institutions.length > 0);
}
