import { defineCrawler, type CrawlContext, type Offering } from '@unicourse/crawler-kit';
import {
  BASE,
  isCancelled,
  isCrossSchoolCode,
  isProgramCode,
  parseDepartments,
  parseGrid,
  parseSyllabusBrief,
  syllabusUrl,
  toOffering,
  verifyGridTerm,
  type RawCourse
} from './parse.ts';

const ENTRY = `${BASE}CofopdlCtrl?language=chinese`;
// The JSON endpoints answer "非法執行 Wrong Access" / an empty body unless the request carries
// the session cookie from the query page and that page as Referer, like the site's own ExtJS app.
const XHR = { referer: ENTRY, 'x-requested-with': 'XMLHttpRequest', accept: 'application/json, */*' };

function gridUrl(ctx: CrawlContext, deptCode: string) {
  const params = new URLSearchParams({
    acadmYear: String(ctx.year),
    acadmTerm: String(ctx.semester),
    chn: '',
    engTeach: 'N',
    clang: 'N',
    moocs: 'N',
    remoteCourse: 'N',
    digital: 'N',
    adsl: 'N',
    deptCode,
    zuDept: '',
    classCode: '',
    kind: '',
    generalCore: '',
    teacher: '',
    serial_number: '',
    course_code: '',
    language: 'chinese',
    action: 'showGrid',
    weekSection: '',
    start: '0',
    limit: '99999',
    page: '1'
  });
  return `${BASE}CofopdlCtrl?${params}`;
}

async function openSession(ctx: CrawlContext) {
  await ctx.http.text(ENTRY);
}

async function fetchDept(ctx: CrawlContext, code: string): Promise<RawCourse[]> {
  for (let attempt = 1; ; attempt += 1) {
    const body = await ctx.http.text(gridUrl(ctx, code), { headers: XHR });
    try {
      return parseGrid(body).List;
    } catch (error) {
      if (attempt >= 2) throw new Error(`dept ${code}: ${(error as Error).message}`);
      await openSession(ctx); // session may have expired
    }
  }
}

export const crawler = defineCrawler({
  school: 'ntnu',
  source: { name: '臺師大課程查詢系統 開課和課程大綱查詢', url: `${BASE}index.jsp` },
  // Some department lists are large (hundreds of KB) and slow to build server-side.
  http: { timeoutMs: 120_000 },
  async crawl(ctx) {
    await openSession(ctx);
    const deptBody = await ctx.http.text(
      `${BASE}CofnameCtrl?action=cof&type=chn&year=${ctx.year}&term=${ctx.semester}`,
      { headers: XHR }
    );
    const all = parseDepartments(deptBody);
    if (!all.length) throw new Error(`no departments for ${ctx.term}; term not published yet?`);
    // 學分學程 codes mostly repeat departmental rows but own a few dozen offerings of their own.
    const includePrograms = process.env.NTNU_SKIP_PROGRAMS !== '1';
    const includeCrossSchool = process.env.NTNU_INCLUDE_CROSS_SCHOOL === '1';
    const depts = all.filter(
      (d) => (includePrograms || !isProgramCode(d.code)) && (includeCrossSchool || !isCrossSchoolCode(d.code))
    );
    // Programs last, so that their rows only fill gaps.
    depts.sort((a, b) => Number(isProgramCode(a.code)) - Number(isProgramCode(b.code)));
    ctx.log(`${all.length} department codes, querying ${depts.length}`);

    const bySerial = new Map<string, RawCourse>();
    let cancelled = 0;
    let fromPrograms = 0;
    let done = 0;
    const queue = [...depts];
    const worker = async () => {
      for (let dept = queue.shift(); dept; dept = queue.shift()) {
        if (ctx.limit && bySerial.size >= ctx.limit) return;
        const rows = await fetchDept(ctx, dept.code);
        verifyGridTerm(rows, ctx.year, ctx.semester);
        for (const row of rows) {
          const serial = row.serial_no?.trim();
          if (!serial || bySerial.has(serial)) continue;
          // Program listings also contain cross-school rows; their own dept_code tells.
          if (!includeCrossSchool && isCrossSchoolCode(row.dept_code ?? '')) continue;
          if (isCancelled(row)) {
            cancelled += 1;
            continue;
          }
          if (isProgramCode(dept.code)) fromPrograms += 1;
          bySerial.set(serial, row);
        }
        done += 1;
        if (done % 50 === 0) ctx.log(`${done}/${depts.length} departments, ${bySerial.size} offerings`);
      }
    };
    await Promise.all([worker(), worker()]);
    ctx.log(`${bySerial.size} offerings (${cancelled} cancelled 停開 skipped${includePrograms ? `, ${fromPrograms} only listed under 學分學程 codes` : ''})`);

    const rows = [...bySerial.values()].sort((a, b) => a.serial_no.localeCompare(b.serial_no));
    const selected = ctx.limit ? rows.slice(0, ctx.limit) : rows;

    // SyllabusCtrl adds 課程簡介 but costs one request per offering (~4k), so it is opt-in.
    const briefs = new Map<string, string>();
    if (process.env.NTNU_FETCH_DETAILS === '1') {
      await Promise.all(
        selected.map(async (row) => {
          try {
            const brief = parseSyllabusBrief(await ctx.http.text(syllabusUrl(row)));
            if (brief) briefs.set(row.serial_no, brief);
          } catch (error) {
            ctx.log(`syllabus ${row.serial_no} failed: ${(error as Error).message}`);
          }
        })
      );
      ctx.log(`${briefs.size} syllabus descriptions`);
    }

    const offerings: Offering[] = selected.map((row) => toOffering(row, { description: briefs.get(row.serial_no) }));
    return offerings;
  }
});
