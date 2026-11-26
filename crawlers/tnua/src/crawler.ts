import { defineCrawler, type Offering } from '@unicourse/crawler-kit';
import { advancedUrl, parseFilters, parseIntroduction, parseSearch, toOffering } from './parse.ts';

export const crawler = defineCrawler({
  school: 'tnua',
  source: { name: '北藝大課程查詢（含課程大綱）', url: advancedUrl },
  async crawl(ctx) {
    let requests = 1;
    const { terms, departments } = parseFilters(await ctx.http.text(advancedUrl));
    const sourceTerm = terms.get(ctx.term);
    if (!sourceTerm) throw new Error(`TNUA: ${ctx.term} not published; available: ${[...terms.keys()].join(', ')}`);
    const year = sourceTerm.slice(0, 3);
    const semester = sourceTerm.slice(3);

    async function post(method: string, data: Record<string, string>) {
      requests += 1;
      return ctx.http.json(`${advancedUrl}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify(data)
      });
    }

    async function search(department: string, english: boolean) {
      return parseSearch(await post('SearchClass', {
        Year: year, Term: semester, Week: '0', Sessions: '0', Sessione: '0',
        Colnum: department, Teacher: '', Classname: '', Courseid: '', Englishclass: english ? '1' : '0'
      }));
    }

    const offerings = new Map<string, Offering>();
    for (const department of departments) {
      const rows = await search(department.code, false);
      for (const row of rows) {
        const offering = toOffering(row, sourceTerm, department);
        if (offerings.has(offering.sourceId)) throw new Error(`TNUA: duplicate offering ${offering.sourceId}`);
        offerings.set(offering.sourceId, offering);
      }
      if (ctx.limit && offerings.size >= ctx.limit) break;
    }

    for (const row of await search('', true)) {
      const sourceId = row.CourseID.trim();
      const offering = offerings.get(sourceId);
      if (offering) offering.language = '全英語授課';
      else if (!ctx.limit) throw new Error(`TNUA: offering ${sourceId} is absent from department results`);
    }

    const result = [...offerings.values()].slice(0, ctx.limit);
    if (process.env.UNICOURSE_TNUA_DETAILS === '1') {
      for (const offering of result) {
        const description = parseIntroduction(await post('PageGetIntroduction', { sClassID: offering.sourceId }));
        if (description) offering.description = description;
      }
    }
    ctx.log(`${requests} logical HTTP requests (excluding retries)`);
    return result;
  }
});
