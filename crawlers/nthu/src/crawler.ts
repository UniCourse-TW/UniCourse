import { defineCrawler, type HttpClient, type Offering } from '@unicourse/crawler-kit';
import { addArchivedEnrollment, catalogArchives, enrollmentArchives, readArchiveRows, type CourseArchive } from './archive.ts';
import { parseDepartments, parseOfferings, sourceUrl } from './parse.ts';

const downloadUrl = 'https://nthu-courses-proxy.philosophysis.workers.dev/';
const departmentUrl = 'https://curricul.site.nthu.edu.tw/p/406-1208-290466,r7880.php?Lang=zh-tw';

async function fetchArchive(http: HttpClient, archive: CourseArchive, term: string) {
  const response = await http.fetch(archive.url);
  if (!response.ok) throw new Error(`NTHU: archive for ${term} returned HTTP ${response.status}`);
  const rows = await readArchiveRows(Buffer.from(await response.arrayBuffer()), archive.sheet);
  return parseOfferings(rows, term, new Map(), archive.url);
}

export const crawler = defineCrawler({
  school: 'nthu',
  source: { name: '國立清華大學課務組 課程開放資料', url: sourceUrl },
  async crawl({ http, term, limit, log }) {
    const archive = catalogArchives[term];
    let offerings: Offering[];
    let requests = 0;
    if (archive) {
      requests += 1;
      offerings = await fetchArchive(http, archive, term);
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
      addArchivedEnrollment(offerings, await fetchArchive(http, enrollment, term), enrollment.url);
    }
    log(`read ${offerings.length} offerings in ${requests} requests before retries`);
    const missingDepartments = new Set(offerings.filter(({ department }) => !department).map(({ departmentCode }) => departmentCode));
    if (missingDepartments.size) log(`unmapped department codes: ${[...missingDepartments].sort().join(', ')}`);
    return limit === undefined ? offerings : offerings.slice(0, limit);
  }
});
