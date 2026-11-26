import { defineCrawler, type Offering } from '@unicourse/crawler-kit';
import { parseDepartment, parseDepartments, parseSyllabus, sourceUrl } from './parse.ts';

export const crawler = defineCrawler({
  school: 'ccu',
  source: { name: '中正大學 eCourse2・系所課程大綱', url: sourceUrl },
  async crawl({ year, semester, http, limit, log }) {
    const includeDetails = process.env.CCU_FETCH_SYLLABI === '1';
    if (includeDetails && (!limit || limit > 20)) {
      throw new Error('CCU_FETCH_SYLLABI=1 requires --limit of at most 20');
    }
    const departments = parseDepartments(await http.text(sourceUrl));
    log(`found ${departments.length} departments`);
    const offerings = new Map<string, Offering>();
    let requests = 1;
    for (const url of departments) {
      url.searchParams.set('yearterm', `${year}_${semester}`);
      requests++;
      for (const offering of parseDepartment(await http.text(url.href), url, year, semester)) {
        if (offerings.has(offering.sourceId)) throw new Error(`Duplicate CCU class ${offering.sourceId}`);
        offerings.set(offering.sourceId, offering);
      }
      if (limit && offerings.size >= limit) break;
    }
    const selected = [...offerings.values()].slice(0, limit);
    for (const offering of selected) {
      if (!includeDetails) break;
      if (!offering.syllabusUrl) continue;
      requests++;
      Object.assign(offering, parseSyllabus(await http.text(offering.syllabusUrl)));
    }
    log(`${requests} listing/detail requests (excluding retries)`);
    return selected;
  }
});
