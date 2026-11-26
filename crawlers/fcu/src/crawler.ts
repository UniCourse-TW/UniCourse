import { defineCrawler, type CrawlContext } from '@unicourse/crawler-kit';
import {
  DEGREES,
  SITE,
  buildOfferings,
  descriptionFromDetail,
  outlineUrl,
  syllabusToken,
  unwrapAsmx,
  type CollectedRow,
  type FcuResult,
  type IdName
} from './parse.ts';

const SERVICE = `${SITE}/Service/Search.asmx`;
const SYLLABUS_DETAIL = 'https://ilearntools.fcu.edu.tw/W320104/W320104_syllabus.aspx/GetCourseDetail';

interface InitResponse {
  defaultYearSms?: { year: number; sms: number };
  yearList?: number[];
  languageList?: { id: string; cht: string; en: string }[];
}

async function post<T>(ctx: CrawlContext, method: string, body: unknown): Promise<T> {
  const raw = await ctx.http.json(`${SERVICE}/${method}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json; charset=UTF-8', accept: 'application/json' }
  });
  return unwrapAsmx<T>(raw, method);
}

function checkResult(result: FcuResult, what: string) {
  if (!Array.isArray(result?.items)) throw new Error(`${what}: unexpected response ${JSON.stringify(result).slice(0, 200)}`);
  if (result.message) throw new Error(`${what}: ${result.message}`);
  if (typeof result.total === 'number' && result.total !== result.items.length) {
    throw new Error(`${what}: got ${result.items.length} of ${result.total} rows (paged response not supported)`);
  }
  return result.items;
}

const off = { enabled: false, value: '' };
const languageQuery = (id: string) => ({
  code: off,
  weekPeriod: { enabled: false, week: '*', period: '*' },
  course: off,
  teacher: off,
  useEnglish: { enabled: false },
  useLanguage: { enabled: true, value: id },
  specificSubject: { enabled: false, value: '1' },
  courseDescription: off
});

/** Optional: one redirect chain + one JSON POST per offering to read the syllabus description. */
async function fetchDescriptions(ctx: CrawlContext, year: number, sms: number, ids: string[]) {
  const descriptions = new Map<string, string>();
  let done = 0;
  for (const id of ids) {
    try {
      const response = await ctx.http.fetch(outlineUrl(year, sms, id));
      await response.body?.cancel();
      const token = syllabusToken(response.url);
      if (token) {
        const raw = await ctx.http.json(SYLLABUS_DETAIL, {
          method: 'POST',
          body: JSON.stringify({ access_token: token }),
          headers: { 'content-type': 'application/json; charset=utf-8', accept: 'application/json' }
        });
        const description = descriptionFromDetail(raw);
        if (description) descriptions.set(id, description);
      }
    } catch (error) {
      ctx.log(`syllabus ${id}: ${(error as Error).message}`);
    }
    done += 1;
    if (done % 200 === 0) ctx.log(`syllabus details ${done}/${ids.length}`);
  }
  return descriptions;
}

export const crawler = defineCrawler({
  school: 'fcu',
  source: { name: '逢甲大學課程檢索系統', url: 'https://coursesearch.fcu.edu.tw/' },
  async crawl(ctx) {
    const { year, semester: sms } = ctx;
    if (sms === 3) throw new Error('FCU summer sessions (sms 3/4) are not supported yet');
    const base = { lang: 'cht', year, sms };

    const init = await post<InitResponse>(ctx, 'init', { lang: 'cht' });
    if (init.yearList && !init.yearList.includes(year)) {
      throw new Error(`FCU has no data for academic year ${year} (available: ${init.yearList.join(', ')})`);
    }
    ctx.log(`site default term ${init.defaultYearSms?.year}-${init.defaultYearSms?.sms}`);

    // 1. Walk 學制 -> 學院 (the site refuses queries without a 學院) and collect every row.
    const rows: CollectedRow[] = [];
    const units = new Map<string, string>();
    for (const degree of DEGREES) {
      const colleges = await post<IdName[]>(ctx, 'GetDeptList', { baseOptions: base, degree: degree.id });
      for (const college of colleges ?? []) {
        for (const unit of (await post<IdName[]>(ctx, 'GetUnitList', { baseOptions: base, degree: degree.id, deptId: college.id })) ?? []) {
          if (unit.id && unit.name && !units.has(unit.id)) units.set(unit.id, unit.name.trim());
        }
        const result = await post<FcuResult>(ctx, 'GetType1Result', {
          baseOptions: base,
          typeOptions: { degree: degree.id, deptId: college.id, unitId: '', classId: '' }
        });
        const items = checkResult(result, `${degree.name}/${college.name}`);
        ctx.log(`${degree.name} ${college.id} ${college.name}: ${items.length} rows`);
        for (const item of items) rows.push({ degree, college: { id: college.id, name: college.name.trim() }, item });
      }
    }
    if (!rows.length) throw new Error(`FCU returned no courses for ${ctx.term}; the term is probably not published yet`);

    // 2. Teaching language + English title: one English-language query per 授課語言 (they partition the term).
    const languages = new Map<string, string>();
    const englishTitles = new Map<string, string>();
    for (const language of init.languageList ?? []) {
      const result = await post<FcuResult>(ctx, 'GetType2Result', {
        baseOptions: { ...base, lang: 'en' },
        typeOptions: languageQuery(language.id)
      });
      for (const item of checkResult(result, `language ${language.id}`)) {
        languages.set(item.scr_selcode, language.cht.trim());
        if (item.sub_name) englishTitles.set(item.scr_selcode, item.sub_name);
      }
    }

    // Same order as buildOfferings, so `--limit` smoke runs fetch syllabi for the offerings they keep.
    const ids = [...new Set(rows.map((r) => r.item.scr_selcode))].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
    const idSet = new Set(ids);
    const missing = ids.filter((id) => !languages.has(id));
    const unseen = [...languages.keys()].filter((id) => !idSet.has(id));
    ctx.log(`${rows.length} rows, ${ids.length} offerings; language coverage missing ${missing.length}, extra ${unseen.length}`);

    // 3. Optional syllabus descriptions (~2 requests per offering, off by default).
    let descriptions: Map<string, string> | undefined;
    if (process.env.FCU_FETCH_SYLLABUS === '1') {
      const targets = ctx.limit ? ids.slice(0, ctx.limit) : ids;
      ctx.log(`fetching ${targets.length} syllabus descriptions`);
      descriptions = await fetchDescriptions(ctx, year, sms, targets);
    }

    return buildOfferings({ year, sms, rows, units, languages, englishTitles, descriptions });
  }
});
