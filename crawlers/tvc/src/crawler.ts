import { HttpClient, encodeForm, type HttpOptions } from '@unicourse/crawler-kit';
import { SITES, exportState, hiddenFields, querySummary, type QuerySummary, type Site } from './parse.ts';
import { readXlsx } from './xlsx.ts';

const BAR = 'ctl00$QueryPH$SearchBar_Course1$';
const LIST = 'ctl00$RightFramePH$CourseList1$';
const EXPORT = `${LIST}ExportExcel1$`;

/** Gentle defaults for a government site: one request at a time per school, 1 s apart. */
export const HTTP_OPTIONS: HttpOptions = { concurrency: 1, delayMs: 1000, timeoutMs: 180_000, retries: 3 };
/** Seconds between export progress polls (the page's own timer polls every second). */
const POLL_MS = 3000;
/** Give up on an export after this many polls (~6 minutes). */
const MAX_POLLS = 120;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ExportResult {
  summary: QuerySummary;
  /** Worksheets of the XLSX export; empty when the query found nothing. */
  sheets: string[][][];
  requests: number;
  bytes: number;
}

/**
 * One WebForms session: open the course search, query one school name for one term, then run the
 * page's own 匯出 (XLSX) job and download the file. About 10 requests per school.
 */
export async function exportSchoolTerm(options: {
  site: Site;
  schoolName: string;
  year: number;
  semester: number;
  http?: HttpClient;
  log?: (message: string) => void;
}): Promise<ExportResult> {
  // A fresh client per session keeps the ASP.NET session cookie separate.
  const http = options.http ?? new HttpClient(HTTP_OPTIONS);
  const url = SITES[options.site].url;
  let requests = 0;
  let bytes = 0;
  const page = async (fields?: Record<string, string>): Promise<string> => {
    requests += 1;
    const response = await http.fetch(url, {
      method: fields ? 'POST' : 'GET',
      body: fields ? encodeForm(fields, 'big5') : undefined,
      headers: fields ? { 'content-type': 'application/x-www-form-urlencoded', referer: url } : undefined
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    bytes += buffer.length;
    if (!response.ok || /FileNotFound|error/i.test(new URL(response.url).pathname)) {
      throw new Error(`${options.site} ${options.schoolName}: HTTP ${response.status} ${response.url}`);
    }
    return new TextDecoder('big5').decode(buffer);
  };

  const form: Record<string, string> = {
    [`${BAR}YearDDL`]: String(options.year),
    [`${BAR}TermDDL`]: String(options.semester),
    [`${BAR}EduSysDDL`]: '',
    [`${BAR}AreaDDL`]: '',
    [`${BAR}SBI5$TB`]: options.schoolName,
    [`${LIST}fineTypeDrop`]: 'xlsx'
  };
  if (options.site === 'web_nt') form[`${BAR}DivisionsDDL`] = '';

  let html = await page();
  html = await page({ ...hiddenFields(html), ...form, __EVENTTARGET: `${BAR}SubmitQueryBtn`, __EVENTARGUMENT: '' });
  const summary = querySummary(html);
  if (!summary.courses) return { summary, sheets: [], requests, bytes };

  html = await page({
    ...hiddenFields(html),
    ...form,
    __EVENTTARGET: '',
    __EVENTARGUMENT: '',
    [`${LIST}ExportBtn.x`]: '10',
    [`${LIST}ExportBtn.y`]: '10'
  });
  for (let poll = 0; !exportState(html)?.includes('處理完畢'); poll += 1) {
    if (exportState(html) === undefined) throw new Error(`${options.schoolName}: export did not start`);
    if (poll >= MAX_POLLS) throw new Error(`${options.schoolName}: export still "${exportState(html)}"`);
    await sleep(POLL_MS);
    html = await page({
      ...hiddenFields(html),
      [`${LIST}fineTypeDrop`]: 'xlsx',
      __EVENTTARGET: `${EXPORT}Progress_Timer`,
      __EVENTARGUMENT: ''
    });
  }

  requests += 1;
  const response = await http.fetch(url, {
    method: 'POST',
    body: encodeForm(
      { ...hiddenFields(html), [`${LIST}fineTypeDrop`]: 'xlsx', __EVENTTARGET: `${EXPORT}DownFileBtn`, __EVENTARGUMENT: '' },
      'big5'
    ),
    headers: { 'content-type': 'application/x-www-form-urlencoded', referer: url }
  });
  const file = Buffer.from(await response.arrayBuffer());
  bytes += file.length;
  const type = response.headers.get('content-type') ?? '';
  if (!response.ok || !/spreadsheetml|octet-stream/.test(type)) {
    throw new Error(`${options.schoolName}: download returned HTTP ${response.status} ${type}`);
  }
  return { summary, sheets: readXlsx(file), requests, bytes };
}
