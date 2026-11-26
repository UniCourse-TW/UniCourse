import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { HttpClient } from './http.js';
import { Offering, Snapshot } from './schema.js';
import { SCHOOLS, type SchoolSlug } from './schools.js';

export interface CrawlContext {
  /** Term as YYY-N, e.g. 115-1. */
  term: string;
  year: number;
  semester: number;
  http: HttpClient;
  /** When set (smoke runs), stop after this many offerings. */
  limit?: number;
  log: (message: string) => void;
}

export interface CrawlerDefinition {
  school: SchoolSlug;
  /** Human name and entry URL of the official system; recorded in `snapshot.source`. */
  source: { name: string; url: string };
  /** Return the complete list of offerings for the term. */
  crawl: (ctx: CrawlContext) => Promise<Offering[]>;
  http?: ConstructorParameters<typeof HttpClient>[0];
}

export function defineCrawler(definition: CrawlerDefinition) {
  return definition;
}

export function currentTerm(now = new Date()): string {
  // Taiwanese academic year = Gregorian year - 1911; term 1 runs Aug–Jan, term 2 Feb–Jul.
  const taipei = new Date(now.getTime() + 8 * 3600 * 1000);
  const month = taipei.getUTCMonth() + 1;
  const year = taipei.getUTCFullYear() - 1911 - (month < 8 ? 1 : 0);
  return `${year}-${month >= 8 || month === 1 ? 1 : 2}`;
}

export async function runCrawler(definition: CrawlerDefinition, argv = process.argv.slice(2)) {
  // `pnpm --filter x crawl -- --term ...` forwards the literal `--`; drop it so parseArgs sees the options.
  const { values } = parseArgs({
    args: argv.filter((arg) => arg !== '--'),
    options: {
      term: { type: 'string' },
      out: { type: 'string' },
      limit: { type: 'string' },
      demo: { type: 'boolean', default: false }
    }
  });
  const term = values.term ?? currentTerm();
  if (!/^\d{3}-[123]$/.test(term)) throw new Error(`invalid --term ${term}; expected e.g. 115-1`);
  const [year, semester] = term.split('-').map(Number);
  const limit = values.limit ? Number(values.limit) : undefined;
  // A limited run is a partial list; importing it would deactivate every other offering of the term,
  // so it never lands on the default snapshot path.
  const out =
    values.out ?? `snapshots/${definition.school}-${term}${limit ? '.preview' : ''}.json`;
  if (limit && !values.out) console.error(`[${definition.school}] --limit set: writing preview to ${out}; do not import it`);
  const log = (message: string) => console.error(`[${definition.school} ${term}] ${message}`);

  const started = Date.now();
  const offerings = await definition.crawl({
    term,
    year,
    semester,
    http: new HttpClient(definition.http),
    limit,
    log
  });
  const school = SCHOOLS[definition.school];
  const snapshot = Snapshot.parse({
    school: definition.school,
    schoolName: school.name,
    schoolNameEn: school.nameEn,
    term,
    isDemo: values.demo,
    source: { ...definition.source, fetchedAt: new Date().toISOString() },
    offerings: limit ? offerings.slice(0, limit) : offerings
  });
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(snapshot, null, 2) + '\n');
  log(`wrote ${snapshot.offerings.length} offerings to ${out} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}
