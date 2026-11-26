import { defineCrawler, type CrawlContext, type Offering } from '@unicourse/crawler-kit';
import {
  NOL_BASE,
  detailUrl,
  mergeRows,
  parseDepartments,
  parseDetail,
  parseResultRows,
  parseTotal,
  toOffering,
  verifyResultTerm,
  type DetailInfo,
  type NtuRow
} from './parse.ts';

/** search_result.php caps page_cnt at 150 rows per page. */
const PAGE_SIZE = 150;

function searchUrl(term: string, startrec: number, lang: 'CH' | 'EN') {
  // Same parameters the site's own 快速查詢 form sends, with an empty keyword (= every course).
  const params = new URLSearchParams({
    alltime: 'yes',
    allproced: 'yes',
    cstype: '1',
    csname: '',
    current_sem: term,
    op: 'stu',
    allsel: 'yes',
    page_cnt: String(PAGE_SIZE),
    startrec: String(startrec)
  });
  if (lang === 'EN') params.set('lang', 'EN');
  return `${NOL_BASE}search_result.php?${params}`;
}

/** Fetch every result page. `pages` is known for EN (whose page shows no 共查詢到 count). */
async function fetchAllRows(
  ctx: CrawlContext,
  lang: 'CH' | 'EN',
  options: { maxPages?: number; pages?: number } = {}
): Promise<{ rows: NtuRow[]; pages: number }> {
  const first = await ctx.http.text(searchUrl(ctx.term, 0, lang));
  let pages = options.pages;
  const total = parseTotal(first);
  if (pages === undefined) {
    if (total === undefined) throw new Error(`no result count on ${lang} page; did the page layout change?`);
    pages = Math.ceil(total / PAGE_SIZE);
    if (options.maxPages !== undefined) pages = Math.min(pages, options.maxPages);
    ctx.log(`${lang}: ${total} rows in ${pages} page(s)`);
  }
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) => ctx.http.text(searchUrl(ctx.term, (i + 1) * PAGE_SIZE, lang)))
  );
  const perPage = [first, ...rest].map(parseResultRows);
  perPage.forEach((pageRows, index) => {
    const expected = total === undefined ? PAGE_SIZE : Math.min(PAGE_SIZE, total - index * PAGE_SIZE);
    if (pageRows.length < expected && index < pages - 1) {
      ctx.log(`warning: ${lang} page startrec=${index * PAGE_SIZE} parsed ${pageRows.length} rows`);
    }
  });
  const rows = perPage.flat();
  verifyResultTerm(rows, ctx.term);
  if (options.maxPages === undefined && total !== undefined && rows.length !== total) {
    ctx.log(`warning: ${lang} pages returned ${rows.length} rows, page header said ${total}`);
  }
  return { rows, pages };
}

export const crawler = defineCrawler({
  school: 'ntu',
  source: { name: '臺大課程網 課程查詢', url: `${NOL_BASE}index.php` },
  async crawl(ctx) {
    const departments = parseDepartments(await ctx.http.text(`${NOL_BASE}search_for_02_dpt.php?current_sem=${ctx.term}`));
    ctx.log(`${departments.size} department codes`);

    // Smoke runs: real offerings are a minority of the first pages (common-course placeholder
    // rows come first), so fetch a few pages instead of all ~110.
    const maxPages = ctx.limit ? Math.max(2, Math.ceil(ctx.limit / 15)) : undefined;
    const { rows: chRows, pages } = await fetchAllRows(ctx, 'CH', { maxPages });
    const { merged, placeholders, cancelled } = mergeRows(chRows);
    ctx.log(`${merged.length} offerings (${placeholders} rows without 流水號 skipped, ${cancelled} cancelled 停開 skipped)`);

    const titlesEn = new Map<string, string>();
    for (const row of (await fetchAllRows(ctx, 'EN', { pages })).rows) {
      if (row.serial && row.title && !titlesEn.has(row.serial)) titlesEn.set(row.serial, row.title);
    }

    const selected = ctx.limit ? merged.slice(0, ctx.limit) : merged;
    const details = new Map<string, DetailInfo>();
    // print_table.php adds 課程概述 (description) but costs one request per offering (~12k for a
    // full term), so it is opt-in.
    if (process.env.NTU_FETCH_DETAILS === '1') {
      let done = 0;
      await Promise.all(
        selected
          .filter((row) => row.detailHref)
          .map(async (row) => {
            try {
              details.set(row.serial!, parseDetail(await ctx.http.text(detailUrl(row, ctx.term))));
            } catch (error) {
              ctx.log(`detail ${row.serial} failed: ${(error as Error).message}`);
            }
            done += 1;
            if (done % 500 === 0) ctx.log(`details: ${done}/${selected.length}`);
          })
      );
    }

    const offerings: Offering[] = selected.map((row) =>
      toOffering(row, ctx.term, departments, { titleEn: titlesEn.get(row.serial!) }, details.get(row.serial!))
    );
    return offerings;
  }
});
