import { HttpClient, buildSnapshot, currentTerm, writeSnapshot, type Institution } from '@unicourse/crawler-kit';
import { parseArgs } from 'node:util';
import { HTTP_OPTIONS, exportSchoolTerm } from './crawler.ts';
import { SITES, parseRows, sheetRows, type Site } from './parse.ts';
import { FORMER_NAMES, eligibleSchools, sitesFor } from './schools.ts';

// Usage: pnpm --filter @unicourse/crawler-tvc crawl -- --term 115-1[,114-2] [--school nsysu,tku]
//          [--out-dir DIR] [--workers 2] [--limit N] [--report report.json]
const { values } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== '--'),
  options: {
    term: { type: 'string' },
    school: { type: 'string' },
    'out-dir': { type: 'string', default: 'snapshots/tvc' },
    workers: { type: 'string', default: '2' },
    limit: { type: 'string' },
    report: { type: 'string' }
  }
});

const terms = (values.term ?? currentTerm()).split(',').map((term) => term.trim());
for (const term of terms) if (!/^\d{3}-[123]$/.test(term)) throw new Error(`invalid --term ${term}; expected e.g. 115-1`);
const workers = Math.min(2, Math.max(1, Number(values.workers) || 1));
const limit = values.limit ? Number(values.limit) : undefined;
const outDir = values['out-dir']!.replace(/\/$/, '');

const eligible = eligibleSchools();
let schools: Institution[] = eligible;
if (values.school) {
  const wanted = values.school.split(',').map((slug) => slug.trim());
  const unknown = wanted.filter((slug) => !eligible.some((school) => school.slug === slug));
  if (unknown.length) {
    throw new Error(
      `not eligible: ${unknown.join(', ')} (unknown slug, or crawled by its own crawler; see crawlers/status.json)`
    );
  }
  schools = eligible.filter((school) => wanted.includes(school.slug));
}

interface Result {
  school: string;
  name: string;
  term: string;
  site?: Site;
  offerings: number;
  platformCourses: number;
  requests: number;
  bytes: number;
  seconds: number;
  file?: string;
  error?: string;
  note?: string;
}

async function crawlOne(school: Institution, term: string): Promise<Result> {
  const [year, semester] = term.split('-').map(Number);
  const started = Date.now();
  const result: Result = { school: school.slug, name: school.name, term, offerings: 0, platformCourses: 0, requests: 0, bytes: 0, seconds: 0 };
  const log = (message: string) => console.error(`[tvc ${school.slug} ${term}] ${message}`);
  try {
    const names = [school.name, ...(FORMER_NAMES[school.name] ?? [])];
    search: for (const site of sitesFor(school)) {
      for (const name of names) {
        const exported = await exportSchoolTerm({ site, schoolName: name, year, semester, http: new HttpClient(HTTP_OPTIONS) });
        result.requests += exported.requests;
        result.bytes += exported.bytes;
        if (!exported.summary.courses) continue;
        const parsed = parseRows(sheetRows(exported.sheets), { schoolNames: names, year, semester, site });
        result.site = site;
        result.platformCourses = exported.summary.courses;
        const { otherSchool, otherTerm, untitled } = parsed.skipped;
        if (otherSchool || otherTerm || untitled) {
          result.note = `skipped ${otherSchool} other-school (${parsed.otherSchools.join('、')}), ${otherTerm} other-term, ${untitled} untitled rows`;
          log(result.note);
        }
        if (!parsed.offerings.length) continue;
        const offerings = limit ? parsed.offerings.slice(0, limit) : parsed.offerings;
        const snapshot = buildSnapshot({ school: school.slug, term, source: SITES[site], offerings });
        const file = `${outDir}/${school.slug}-${term}${limit ? '.preview' : ''}.json`;
        await writeSnapshot(file, snapshot);
        result.offerings = snapshot.offerings.length;
        result.file = file;
        break search;
      }
    }
    if (!result.file) result.note = result.note ?? 'no courses on either platform';
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }
  result.seconds = Math.round((Date.now() - started) / 100) / 10;
  log(
    `${result.error ? `FAILED ${result.error}` : result.file ? `${result.offerings} offerings via ${result.site}` : result.note}` +
      ` (${result.requests} requests, ${(result.bytes / 1e6).toFixed(1)} MB, ${result.seconds}s)`
  );
  return result;
}

const jobs = terms.flatMap((term) => schools.map((school) => ({ school, term })));
console.error(`[tvc] ${jobs.length} school-terms (${schools.length} schools × ${terms.join(', ')}), ${workers} workers`);
const results: Result[] = [];
const started = Date.now();
let next = 0;
await Promise.all(
  Array.from({ length: workers }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      results.push(await crawlOne(job.school, job.term));
    }
  })
);

const sum = (pick: (result: Result) => number) => results.reduce((total, result) => total + pick(result), 0);
const summary = {
  terms,
  schools: schools.length,
  written: results.filter((result) => result.file).length,
  empty: results.filter((result) => !result.file && !result.error).map((result) => `${result.school} ${result.term}`),
  failed: results.filter((result) => result.error).map((result) => `${result.school} ${result.term}: ${result.error}`),
  offerings: sum((result) => result.offerings),
  requests: sum((result) => result.requests),
  megabytes: Math.round(sum((result) => result.bytes) / 1e5) / 10,
  minutes: Math.round((Date.now() - started) / 6000) / 10
};
console.error(`[tvc] done: ${JSON.stringify(summary)}`);
if (values.report) {
  const { writeFile } = await import('node:fs/promises');
  results.sort((a, b) => (a.term + a.school < b.term + b.school ? -1 : 1));
  await writeFile(values.report, JSON.stringify({ summary, results }, null, 2) + '\n');
}
process.exitCode = summary.failed.length ? 1 : 0;
