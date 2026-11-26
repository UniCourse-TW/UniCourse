import { readFileSync } from 'node:fs';
import { INSTITUTIONS, type Institution } from '@unicourse/crawler-kit';
import type { Site } from './parse.ts';

export interface StatusEntry {
  status: 'live' | 'partial' | 'blocked' | 'planned';
  note: string;
  issue: number | null;
  /** Crawler package producing this school's snapshots when it is not `crawlers/<slug>`. */
  source?: string;
}

export function readStatus(): Record<string, StatusEntry> {
  return JSON.parse(readFileSync(new URL('../../status.json', import.meta.url), 'utf8'));
}

/**
 * Schools this crawler may write. A school with its own entry in `crawlers/status.json` and no
 * `source` is crawled directly (`crawlers/<slug>`), and the dedicated crawler always wins, so it is
 * skipped. Schools without an entry, or whose entry names `source: "tvc"`, are eligible.
 */
export function eligibleSchools(
  institutions: readonly Institution[] = INSTITUTIONS,
  status: Record<string, StatusEntry> = readStatus()
): Institution[] {
  return institutions.filter((institution) => {
    const entry = status[institution.slug];
    return !entry || entry.source === 'tvc';
  });
}

/** Technical schools report to 技職校院課程資源網, the rest to 大學校院課程資源網; try the other second. */
export function sitesFor(institution: Institution): Site[] {
  return institution.system === 'technical' ? ['web_nt', 'web_nu'] : ['web_nu', 'web_nt'];
}

/**
 * Names the platform used in earlier years, by current MOE name (searched when the current name
 * finds nothing). Add entries when a renamed school's history is crawled.
 */
export const FORMER_NAMES: Record<string, string[]> = {
  台鋼科技大學: ['高苑科技大學'],
  中信科技大學: ['遠東科技大學'],
  敏實科技大學: ['大華科技大學'],
  臺北城市科技大學: ['北台灣科學技術學院'],
  宏國德霖科技大學: ['德霖技術學院'],
  崇右影藝科技大學: ['崇右技術學院'],
  台北海洋科技大學: ['台北海洋技術學院'],
  亞東科技大學: ['亞東技術學院'],
  中信金融管理學院: ['台灣首府大學']
};
