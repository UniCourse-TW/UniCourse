import { defineCrawler, type CrawlContext, type Offering } from '@unicourse/crawler-kit';
import {
  ENTRY_URL,
  RESULT_CAP,
  courseQueryUrl,
  parseSyllabus,
  realUnits,
  semesterToken,
  toOffering,
  type CourseQuery,
  type NccuCourse,
  type UnitL1
} from './parse.ts';

const UNIT_URL = 'https://qrysub.nccu.edu.tw/assets/api/unit.json';
const HEADERS = { referer: ENTRY_URL, accept: 'application/json, text/plain, */*' };

/** Set NCCU_SYLLABUS=1 to also fetch every syllabus page (one request per offering, ~2900) for description/capacity. */
const FETCH_SYLLABUS = process.env.NCCU_SYLLABUS === '1';

interface Leaf {
  query: CourseQuery;
  rows: NccuCourse[];
}

let requests = 0;

async function search(ctx: CrawlContext, lang: 'zh-TW' | 'en', sem: string, query: CourseQuery): Promise<NccuCourse[]> {
  requests += 1;
  const rows = await ctx.http.json<NccuCourse[]>(courseQueryUrl(lang, sem, query), { headers: HEADERS });
  if (!Array.isArray(rows)) throw new Error(`unexpected response for ${JSON.stringify(query)}`);
  return rows;
}

/**
 * Run `query`; when it hits the API's 500-row cap, run each narrower query from `split` instead
 * (recursively). Leaves that are still capped are logged, never silently truncated.
 */
async function walk(
  ctx: CrawlContext,
  sem: string,
  query: CourseQuery,
  split: (query: CourseQuery) => CourseQuery[],
  leaves: Leaf[]
) {
  const rows = await search(ctx, 'zh-TW', sem, query);
  const children = rows.length >= RESULT_CAP ? split(query) : [];
  if (!children.length) {
    if (rows.length >= RESULT_CAP) ctx.log(`WARNING: ${JSON.stringify(query)} returns ${rows.length} rows (capped)`);
    leaves.push({ query, rows });
    return;
  }
  for (const child of children) await walk(ctx, sem, child, split, leaves);
}

async function collect(ctx: CrawlContext, sem: string, units: UnitL1[]): Promise<Leaf[]> {
  const leaves: Leaf[] = [];
  // 1. Unit tree (college -> degree level -> department), descending only when a level is capped.
  const splitUnit = (q: CourseQuery): CourseQuery[] => {
    const l1 = units.find((u) => u.utCodL1 === q.dp1);
    if (!l1) return [];
    if (!q.dp2) return realUnits(l1.utL2, 'utCodL2').map((l2) => ({ dp1: q.dp1, dp2: l2.utCodL2 }));
    const l2 = l1.utL2.find((u) => u.utCodL2 === q.dp2);
    if (!l2 || q.dp3) return [];
    return realUnits(l2.utL3, 'utCodL3').map((l3) => ({ ...q, dp3: l3.utCodL3 }));
  };
  for (const l1 of realUnits(units, 'utCodL1')) await walk(ctx, sem, { dp1: l1.utCodL1 }, splitUnit, leaves);
  // 2. Some offerings (e.g. 070xxx centre/program courses) belong to no unit in unit.json.
  //    Sweep by weekday (split by time of day when capped) and the "flexible time" keyword to catch them.
  const splitTime = (q: CourseQuery): CourseQuery[] => (q.dsec ? [] : ['1', '2', '3', '4'].map((dsec) => ({ ...q, dsec })));
  for (const week of ['1', '2', '3', '4', '5', '6', '7']) await walk(ctx, sem, { week }, splitTime, leaves);
  await walk(ctx, sem, { keyword: '未定或彈性' }, () => [], leaves);
  return leaves;
}

export const crawler = defineCrawler({
  school: 'nccu',
  source: { name: '國立政治大學全校課程查詢系統', url: ENTRY_URL },
  async crawl(ctx) {
    const sem = semesterToken(ctx.year, ctx.semester);
    const units = await ctx.http.json<UnitL1[]>(UNIT_URL, { headers: HEADERS });
    const leaves = await collect(ctx, sem, units);

    const rows = new Map<string, NccuCourse>();
    for (const leaf of leaves) {
      for (const row of leaf.rows) {
        if (row.y !== String(ctx.year) || row.s !== String(ctx.semester) || !row.subNum) continue;
        if (!rows.has(row.subNum)) rows.set(row.subNum, row);
      }
    }
    ctx.log(`${rows.size} unique offerings from ${leaves.length} queries`);
    if (rows.size === 0) throw new Error(`no offerings for ${sem}; is the term published?`);

    // English titles: replay the same leaf queries against the English index, joined by subNum.
    const titleEn = new Map<string, string>();
    for (const leaf of leaves) {
      if (leaf.rows.every((row) => titleEn.has(row.subNum))) continue;
      for (const row of await search(ctx, 'en', sem, leaf.query)) {
        if (row.subNam && !titleEn.has(row.subNum)) titleEn.set(row.subNum, row.subNam.trim());
      }
    }

    ctx.log(`${requests + 1} list requests (unit.json + ${requests} API queries)`);

    let offerings: Offering[] = [...rows.values()].map((row) => toOffering(row, titleEn.get(row.subNum)));
    if (ctx.limit) offerings = offerings.slice(0, ctx.limit);

    if (FETCH_SYLLABUS) {
      let done = 0;
      offerings = await Promise.all(
        offerings.map(async (offering) => {
          if (!offering.syllabusUrl) return offering;
          try {
            const detail = parseSyllabus(await ctx.http.text(offering.syllabusUrl, { headers: { referer: ENTRY_URL } }));
            return { ...offering, ...detail };
          } catch (error) {
            ctx.log(`syllabus ${offering.sourceId}: ${(error as Error).message}`);
            return offering;
          } finally {
            done += 1;
            if (done % 200 === 0) ctx.log(`syllabus ${done}/${offerings.length}`);
          }
        })
      );
    }
    return offerings;
  }
});
