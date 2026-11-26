import { defineCrawler, type Offering } from '@unicourse/crawler-kit';
import { archiveUrl, creditUrl, parseArchiveStages, parseCreditPage, parseDetail, parseStages } from './parse.ts';

export const crawler = defineCrawler({
  school: 'ntua',
  source: { name: '臺藝大推廣教育中心學分課程（僅推廣學分班，非全校課表）', url: creditUrl },
  async crawl(ctx) {
    let requests = 0;
    async function get(url: string) {
      requests += 1;
      return ctx.http.text(url);
    }

    const current = parseStages(await get(creditUrl));
    const archive = parseArchiveStages(await get(archiveUrl));
    const stages = [...new Map([...archive, ...current].map((stage) => [stage.id, stage])).values()]
      .sort((left, right) => Number(Boolean(left.archived)) - Number(Boolean(right.archived)));
    const matching = stages.filter(({ term }) => term === ctx.term);
    if (!matching.length) {
      throw new Error(`NTUA: no public extension credit stages for ${ctx.term}; available: ${[...new Set(stages.map(({ term }) => term))].join(', ')}`);
    }

    const offerings = new Map<string, Offering>();
    stagesLoop: for (const stage of matching) {
      const visited = new Set<number>();
      const pending = new Set([1]);
      const stageOfferings = new Set<string>();
      while (pending.size) {
        const page = Math.min(...pending);
        pending.delete(page);
        visited.add(page);
        const url = new URL(creditUrl);
        if (stage.archived) url.pathname = '/PastCourse';
        url.searchParams.set('stageId', stage.id);
        if (page > 1) url.searchParams.set('page', String(page));
        const result = parseCreditPage(await get(url.href), stage);
        for (const next of result.pages) if (!visited.has(next)) pending.add(next);
        for (const offering of result.offerings) {
          if (stageOfferings.has(offering.sourceId)) throw new Error(`NTUA: repeated course ${offering.sourceId} in stage ${stage.id}`);
          stageOfferings.add(offering.sourceId);
          const existing = offerings.get(offering.sourceId);
          if (existing) {
            existing.extra = { ...existing.extra, 期別: `${existing.extra?.期別}；${stage.name}` };
          } else {
            offerings.set(offering.sourceId, offering);
          }
          if (ctx.limit && offerings.size >= ctx.limit) break stagesLoop;
        }
      }
    }

    const result: Offering[] = [];
    for (const offering of offerings.values()) {
      result.push(process.env.UNICOURSE_NTUA_LIST_ONLY === '1' || offerings.size > 250
        ? offering : parseDetail(await get(offering.sourceUrl), offering));
    }
    ctx.log(`${requests} logical HTTP requests (excluding retries); extension credit subset only`);
    return result;
  }
});
