import { readFileSync } from 'node:fs';

/** One row of `data/institutions.json` (MOE open data; see `data/institutions.README.md`). */
export interface Institution {
  /** MOE 學校代碼, e.g. `0009`. */
  code: string;
  /** Official Chinese name, e.g. `國立中山大學`. */
  name: string;
  nameEn: string | null;
  /** Snapshot `school` value, unique and stable, e.g. `nsysu`. */
  slug: string;
  kind: 'university' | 'college' | 'junior_college';
  ownership: 'public' | 'private';
  city: string | null;
  website: string | null;
  system: 'general' | 'technical' | 'military_police' | 'religious' | 'open';
}

/** Every institution; `data/institutions.json` is the single source of truth for slugs. */
export const INSTITUTIONS: readonly Institution[] = JSON.parse(
  readFileSync(new URL('../../../data/institutions.json', import.meta.url), 'utf8')
);

export const SCHOOLS: Readonly<Record<string, { name: string; nameEn?: string; code: string }>> = Object.fromEntries(
  INSTITUTIONS.map((institution) => [
    institution.slug,
    { name: institution.name, nameEn: institution.nameEn ?? undefined, code: institution.code }
  ])
);

export type SchoolSlug = string;

export function isSchoolSlug(slug: string): boolean {
  return Object.hasOwn(SCHOOLS, slug);
}
