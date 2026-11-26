import { defineCrawler, type CrawlContext, type Offering } from '@unicourse/crawler-kit';
import { ENTRY_URL, isCaptchaPage, parseEntryPage, parseResultRows, toOfferings } from './parse.ts';

/**
 * 全部課程 flow of the public NCKU course system: GET the entry page (session cookie + `crypt`
 * token), then per department POST `m=result_init` (returns a one-off result id) and GET
 * `m=result&i=<id>`. Two requests per department, ~220 departments.
 *
 * The site answers "請輸入驗證碼繼續！" (CAPTCHA) after about five department result pages per IP in
 * a short window. The crawler never solves or sidesteps it (no new sessions, User-Agents or IPs).
 * By default it aborts at the first CAPTCHA page, so no partial snapshot is ever written (a partial
 * snapshot would deactivate every missing offering on import). NCKU_MAX_WAITS > 0 makes it instead
 * pause NCKU_COOLDOWN_MS and retry, up to that many pauses in total; only enable that with NCKU's
 * permission, since a full term then takes many hours.
 */
const COOLDOWN_MS = Number(process.env.NCKU_COOLDOWN_MS ?? 10 * 60_000);
const MAX_WAITS = Number(process.env.NCKU_MAX_WAITS ?? 0);
/** Pause between departments, on top of the kit's per-request spacing. */
const DEPT_GAP_MS = Number(process.env.NCKU_DEPT_GAP_MS ?? 5_000);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let requests = 0;

async function fetchDepartment(ctx: CrawlContext, dept: string, crypt: string): Promise<string> {
  requests += 2;
  const init = await ctx.http.json<{ err?: string; id?: string }>(`${ENTRY_URL}&m=result_init`, {
    method: 'POST',
    body: new URLSearchParams({ dept_no: dept, crypt }),
    headers: {
      referer: ENTRY_URL,
      'x-requested-with': 'XMLHttpRequest',
      accept: 'application/json, text/javascript, */*; q=0.01'
    }
  });
  if (init.err || !init.id) throw new Error(`result_init ${dept}: ${init.err || 'no id'}`);
  return ctx.http.text(`${ENTRY_URL}&m=result&i=${encodeURIComponent(init.id)}`, { headers: { referer: ENTRY_URL } });
}

async function entryPage(ctx: CrawlContext) {
  requests += 1;
  return parseEntryPage(await ctx.http.text(ENTRY_URL));
}

export const crawler = defineCrawler({
  school: 'ncku',
  source: { name: '國立成功大學課程資訊及選課系統', url: ENTRY_URL },
  async crawl(ctx) {
    const started = Date.now();
    let entry = await entryPage(ctx);
    ctx.log(`${entry.departments.length} departments`);
    const wantYear = String(ctx.year).padStart(4, '0');
    const offerings = new Map<string, Offering>();
    let rows = 0;
    let waits = 0;

    // Departments are fetched one after another in a single session.
    for (const [index, dept] of entry.departments.entries()) {
      let html = '';
      for (let refreshed = false; ; ) {
        html = await fetchDepartment(ctx, dept.code, entry.crypt);
        if (/class=["']tr-title["']/.test(html)) break;
        if (isCaptchaPage(html)) {
          if (waits >= MAX_WAITS) {
            throw new Error(
              `NCKU asked for a CAPTCHA at department ${dept.code} (${index}/${entry.departments.length}, ` +
                `${requests} requests, ${waits} pauses); stopping without writing a partial snapshot`
            );
          }
          waits += 1;
          ctx.log(`CAPTCHA at ${dept.code} (${index}/${entry.departments.length}); pausing ${COOLDOWN_MS / 1000}s`);
          await sleep(COOLDOWN_MS);
          continue;
        }
        // Bounced back to the entry page (expired id/token): reload the token once.
        if (refreshed) throw new Error(`department ${dept.code}: no result table`);
        refreshed = true;
        entry = { ...entry, crypt: (await entryPage(ctx)).crypt };
      }
      const parsed = parseResultRows(html);
      const term = parsed.find((row) => row.year && row.semester);
      if (term && (term.year !== wantYear || term.semester !== String(ctx.semester))) {
        throw new Error(
          `NCKU currently publishes ${Number(term.year)}-${term.semester}, not ${ctx.term}; the public list only shows the current term`
        );
      }
      rows += parsed.length;
      for (const offering of toOfferings(parsed)) {
        if (!offerings.has(offering.sourceId)) offerings.set(offering.sourceId, offering);
      }
      if ((index + 1) % 10 === 0) {
        ctx.log(`${index + 1}/${entry.departments.length} departments, ${offerings.size} offerings, ${requests} requests, ${waits} pauses`);
      }
      if (ctx.limit && offerings.size >= ctx.limit) break;
      await sleep(DEPT_GAP_MS);
    }
    ctx.log(
      `${offerings.size} offerings from ${rows} table rows; ${requests} requests, ${waits} CAPTCHA pauses, ${((Date.now() - started) / 60_000).toFixed(1)} min`
    );
    return [...offerings.values()];
  }
});
