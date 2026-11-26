import { defineCrawler, type HttpClient, type Offering } from '@unicourse/crawler-kit';
import {
  addArchivedEnrollment, addArchivedRequirements, catalogArchives, enrollmentArchives, normalizeArchiveRows, readArchiveRows,
  requirementArchives, selectTermRows, type CourseArchive
} from './archive.ts';
import { parseDepartments, parseOfferings, sourceUrl } from './parse.ts';
import { tidyOffering } from './tidy.ts';

const downloadUrl = 'https://nthu-courses-proxy.philosophysis.workers.dev/';
const departmentUrl = 'https://curricul.site.nthu.edu.tw/p/406-1208-290466,r7880.php?Lang=zh-tw';

async function fetchSheet(http: HttpClient, archive: CourseArchive, term: string, log: (message: string) => void) {
  const response = await http.fetch(archive.url);
  if (!response.ok) throw new Error(`NTHU: archive for ${term} returned HTTP ${response.status}`);
  const rows = await readArchiveRows(Buffer.from(await response.arrayBuffer()), archive.sheet);
  if (!archive.multiTerm) return rows;
  const { rows: selected, unidentified } = selectTermRows(rows, term);
  if (archive.ignoreEnglishTitle) for (const row of selected) row['英文課名'] = '';
  if (unidentified) log(`skipped ${unidentified} rows without a full 科號 (serial number only)`);
  return selected;
}

async function fetchArchive(http: HttpClient, archive: CourseArchive, term: string, log: (message: string) => void, requirements?: CourseArchive) {
  const rows = await fetchSheet(http, archive, term, log);
  if (requirements) {
    addArchivedRequirements(rows, await fetchSheet(http, requirements, term, log), requirements.url);
  }
  return parseOfferings(normalizeArchiveRows(rows), term, new Map(), archive.url);
}

export const crawler = defineCrawler({
  school: 'nthu',
  source: { name: '國立清華大學課務組 課程開放資料', url: sourceUrl },
  async crawl({ http, term, limit, log }) {
    const archive = catalogArchives[term];
    let offerings: Offering[];
    let requests = 0;
    if (archive) {
      const requirements = requirementArchives[term];
      requests += requirements ? 2 : 1;
      offerings = await fetchArchive(http, archive, term, log, requirements);
    } else {
      const courses = await http.json(downloadUrl);
      let departments = new Map<string, string>();
      try {
        departments = parseDepartments(await http.text(departmentUrl));
      } catch (error) {
        log(`offering department names unavailable: ${error}`);
      }
      requests += 2;
      offerings = parseOfferings(courses, term, departments);
    }
    const enrollment = enrollmentArchives[term];
    if (enrollment) {
      requests += 1;
      addArchivedEnrollment(offerings, await fetchArchive(http, enrollment, term, log), enrollment.url);
    }
    // Archived counts are joined after parsing, so run the cleanup again now that `enrolled` is known.
    offerings = offerings.map(tidyOffering);
    log(`read ${offerings.length} offerings in ${requests} requests before retries`);
    const missingDepartments = new Set(offerings.filter(({ department }) => !department).map(({ departmentCode }) => departmentCode));
    if (missingDepartments.size) log(`unmapped department codes: ${[...missingDepartments].sort().join(', ')}`);
    return limit === undefined ? offerings : offerings.slice(0, limit);
  }
});
