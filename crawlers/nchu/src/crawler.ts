import { defineCrawler, type Offering } from '@unicourse/crawler-kit';
import { parseDescription, parseList, parseSyllabusOffering, sourceUrl } from './parse.ts';

const digits = '0123456789';
const fallbackCourse = new URL('Syllabus_main?v_strm=1141&v_class_nbr=3746', sourceUrl);

export const crawler = defineCrawler({
  school: 'nchu',
  source: { name: '中興大學課程查詢・綜合查詢', url: sourceUrl },
  async crawl({ term, http, limit, log }) {
    const includeDescription = process.env.NCHU_FETCH_SYLLABI === '1';
    if (includeDescription && (!limit || limit > 20)) {
      throw new Error('NCHU_FETCH_SYLLABI=1 requires --limit of at most 20');
    }
    const yearTerm = term.replace('-', '');
    const offerings = new Map<string, Offering>();
    let requests = 0;

    async function queryList(emi: string, suffix = ''): Promise<Offering[]> {
      const query = new URL(sourceUrl);
      query.searchParams.set('p_year', yearTerm);
      query.searchParams.set('v_emi', emi);
      if (suffix) query.searchParams.set('v_crseno', suffix);
      requests++;
      const response = await http.fetch(query.href);
      if (response.ok) {
        const rows = parseList(await response.text(), yearTerm);
        if (suffix && rows.some((row) => !String(row.extra?.選課號碼).endsWith(suffix))) {
          throw new Error(`NCHU did not apply the selection-number suffix ${suffix}`);
        }
        return rows;
      }
      await response.body?.cancel();
      if (response.status === 404 && yearTerm === '1141' && emi === 'N') {
        if (suffix === '4302') {
          requests++;
          log('selection number 4302 unavailable in the catalog; reading the public syllabus');
          return [parseSyllabusOffering(await http.text(fallbackCourse.href), fallbackCourse, suffix)];
        }
        if (suffix.length < 4) {
          log(`catalog returned HTTP 404; partitioning selection number suffix ${suffix || '(all)'}`);
          const rows: Offering[] = [];
          for (const digit of digits) rows.push(...await queryList(emi, `${digit}${suffix}`));
          return rows;
        }
      }
      throw new Error(`GET ${query.href} -> HTTP ${response.status}`);
    }

    for (const emi of ['N', 'Y']) {
      const partition = await queryList(emi);
      log(`EMI=${emi}: ${partition.length} classes`);
      for (const offering of partition) {
        if (offerings.has(offering.sourceId)) throw new Error(`Duplicate NCHU class ${offering.sourceId} across queries`);
        offerings.set(offering.sourceId, offering);
      }
      if (limit && offerings.size >= limit) break;
    }
    const selected = [...offerings.values()].slice(0, limit);
    for (const offering of selected) {
      if (!includeDescription) break;
      requests++;
      const description = parseDescription(await http.text(offering.sourceUrl));
      if (description) offering.description = description;
    }
    log(`${requests} listing/detail requests (excluding retries)`);
    return selected;
  }
});
