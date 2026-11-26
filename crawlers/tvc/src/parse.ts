import { compact, requirementFromText, type Offering, type Requirement } from '@unicourse/crawler-kit';

/** The two national course platforms; both run the same ASP.NET WebForms application. */
export const SITES = {
  web_nu: { name: '大學校院課程資源網', url: 'https://course-tvc.yuntech.edu.tw/web_nu/search_course.aspx' },
  web_nt: { name: '技職校院課程資源網', url: 'https://course-tvc.yuntech.edu.tw/web_nt/search_course.aspx' }
} as const;
export type Site = keyof typeof SITES;

const decodeAttribute = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&');

/** Hidden `<input>` fields of the WebForms page (`__VIEWSTATE`, `__EVENTVALIDATION`, CSRF token, ...). */
export function hiddenFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const match of html.matchAll(/<input\b[^>]*\btype="hidden"[^>]*>/gi)) {
    const tag = match[0];
    const name = /\bname="([^"]*)"/.exec(tag)?.[1];
    if (!name) continue;
    fields[decodeAttribute(name)] = decodeAttribute(/\bvalue="([^"]*)"/.exec(tag)?.[1] ?? '');
  }
  return fields;
}

export interface QuerySummary {
  /** 課程數 in the 總計 row; 0 when the query found nothing. */
  courses: number;
  departments: number;
  schools: number;
}

/** Totals row of the result list: 總計 | | 總修課人數 | 課程數 | 系所數 | 校數. */
export function querySummary(html: string): QuerySummary {
  const cells = [...html.matchAll(/<td class="list-total">([^<]*)<\/td>/g)].map((match) => match[1].trim());
  const number = (value: string | undefined) => Number((value ?? '0').replace(/,/g, '')) || 0;
  if (cells[0] !== '總計') return { courses: 0, departments: 0, schools: 0 };
  return { courses: number(cells[3]), departments: number(cells[4]), schools: number(cells[5]) };
}

/** Text of the export progress label, e.g. `進度：處理完畢`; undefined when no export is running. */
export function exportState(html: string): string | undefined {
  const match = /_ExportExcel1_Handle_State">([\s\S]*?)<\/span>/.exec(html);
  return match ? match[1].replace(/<[^>]+>/g, '').trim() : undefined;
}

/**
 * Comparable school name: the platform writes some private schools with their foundation, before
 * or after `財團法人` (`淡江大學學校財團法人淡江大學`, `學校財團法人中華浸信會基督教台灣浸會神學院`), and
 * mixes 台/臺.
 */
export function normalizeSchoolName(name: string): string {
  return name
    .replace(/\s+/g, '')
    .replace(/^.*財團法人/, '')
    .replaceAll('台', '臺');
}

/** Whether a platform 校名 is the school with this MOE (or former) name. */
export function sameSchool(platformName: string, name: string): boolean {
  const platform = normalizeSchoolName(platformName);
  const wanted = normalizeSchoolName(name);
  // A foundation name may sit between 財團法人 and the school name; the school name then ends it.
  return platform === wanted || (platformName.includes('財團法人') && platform.endsWith(wanted));
}

export type Row = Record<string, string>;

/** The data sheet (header row starts with 系統序號) as objects keyed by header. */
export function sheetRows(sheets: string[][][]): Row[] {
  const sheet = sheets.find((rows) => rows[0]?.[0]?.trim() === '系統序號');
  if (!sheet) throw new Error('export has no sheet with a 系統序號 header');
  const header = sheet[0].map((name) => name.trim());
  return sheet.slice(1).map((cells) => {
    const row: Row = {};
    header.forEach((name, index) => {
      if (name) row[name] = (cells[index] ?? '').trim();
    });
    return row;
  });
}

const TERM_NAMES: Record<string, number> = { 上學期: 1, 下學期: 2, 暑期: 3 };

/** Instructor placeholders the platform uses instead of a name. */
const NO_INSTRUCTOR = /^(無|0|-+|—+|未定|待定|待聘|另訂|TBA|TBD|none)$/i;
/** Syllabus placeholders, not descriptions. */
const NO_DESCRIPTION = /^(依規定免登|詳參課程連結|詳見課程連結|無|略|同上|\d{1,3}|[-—.。]+)$/;

/** Platform columns copied to `extra` (header without the `_` markers the export adds). */
const EXTRA_COLUMNS = [
  '學院名稱',
  '系所英文名稱',
  '科系英文名稱',
  '學程',
  '部別_',
  '學制_',
  '學制學程_',
  '部校訂_',
  '半全年_',
  '科目類別_',
  '教學型態_',
  '全英語教學_',
  '跨校選修_',
  '系科屬性_',
  '遠距教學提供字幕_'
];
const COUNT_COLUMNS = ['男學生修課人數', '女學生修課人數', '其他學生修課人數'];

function splitInstructors(raw: string | undefined): string[] {
  const names = (raw ?? '')
    .split(/[,，、;；/／\n]+/)
    .map((name) => name.trim())
    .filter((name) => name && !NO_INSTRUCTOR.test(name));
  return [...new Set(names)];
}

function integer(raw: string | undefined): number | undefined {
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const value = Number(raw);
  return value <= 2_147_483_647 ? value : undefined;
}

function credits(raw: string | undefined): number | undefined {
  if (!raw || !/^\d+(\.\d+)?$/.test(raw)) return undefined;
  const value = Number(raw);
  return value <= 999.99 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6 ? value : undefined;
}

function httpUrl(raw: string | undefined): string | undefined {
  if (!raw || !/^https?:\/\//i.test(raw)) return undefined;
  try {
    const url = new URL(raw);
    return url.username || url.password ? undefined : raw;
  } catch {
    return undefined;
  }
}

function requirement(row: Row): Requirement | undefined {
  if (/通識/.test(row['科目類別_'] ?? '')) return 'general';
  return requirementFromText(row['必選修_']);
}

export interface ParseResult {
  offerings: Offering[];
  /** Rows dropped because they belong to another school, another term or lack a title. */
  skipped: { otherSchool: number; otherTerm: number; untitled: number };
  /** Distinct 校名 values seen for other schools (a hint for renamed schools). */
  otherSchools: string[];
}

/**
 * Map exported rows of one school and term to offerings.
 *
 * `sourceId` is the school's own 課號 (the platform's 系統序號 changes with every upload); when a
 * code repeats (sections), the rows are ordered by department, grade, instructors, title and
 * 系統序號 and numbered `<code>#1`, `<code>#2`, ...
 */
export function parseRows(
  rows: Row[],
  options: { schoolNames: string[]; year: number; semester: number; site: Site }
): ParseResult {

  const skipped = { otherSchool: 0, otherTerm: 0, untitled: 0 };
  const otherSchools = new Set<string>();
  const kept: { row: Row; offering: Omit<Offering, 'sourceId'> }[] = [];
  for (const row of rows) {
    if (!options.schoolNames.some((name) => sameSchool(row['校名'] ?? '', name))) {
      skipped.otherSchool += 1;
      otherSchools.add(row['校名'] ?? '');
      continue;
    }
    if (Number(row['開課年度']) !== options.year || TERM_NAMES[row['開課學期名稱'] ?? ''] !== options.semester) {
      skipped.otherTerm += 1;
      continue;
    }
    const title = row['課程名稱'];
    if (!title) {
      skipped.untitled += 1;
      continue;
    }
    const department = row['系所名稱'] || row['科系'] || undefined;
    const courseCode = row['課號'] || `${department ?? ''}/${title}`;
    const link = row['課程連結'];
    const syllabusUrl = httpUrl(link);
    const description = row['課程大綱'];
    const extra: Record<string, string | number> = {};
    for (const column of EXTRA_COLUMNS) {
      const value = row[column];
      if (value) extra[column.replace(/^_|_$/g, '')] = value;
    }
    for (const column of COUNT_COLUMNS) {
      const value = integer(row[column]);
      if (value !== undefined) extra[column] = value;
    }
    if (link && !syllabusUrl) extra['課程連結'] = link;
    if (row['系統序號']) extra['系統序號'] = row['系統序號'];
    const grade = row['年級'];
    kept.push({
      row,
      offering: compact({
        courseCode,
        title,
        instructors: splitInstructors(row['開課老師']),
        department,
        credits: credits(row['學分數']),
        requirement: requirement(row),
        requirementText: row['必選修_'],
        enrolled: integer(row['總修課人數']),
        language: row['_授課語言'],
        grade: grade && grade !== '0' ? grade : undefined,
        description: description && !NO_DESCRIPTION.test(description) ? description : undefined,
        syllabusUrl,
        sourceUrl: SITES[options.site].url,
        notes: row['備註'],
        extra: Object.keys(extra).length ? extra : undefined
      }) as Omit<Offering, 'sourceId'>
    });
  }

  const byCode = new Map<string, typeof kept>();
  for (const item of kept) {
    const group = byCode.get(item.offering.courseCode) ?? [];
    group.push(item);
    byCode.set(item.offering.courseCode, group);
  }
  const key = (item: (typeof kept)[number]) =>
    [
      item.offering.department ?? '',
      item.offering.grade ?? '',
      item.offering.instructors.join('、'),
      item.offering.title,
      (item.row['系統序號'] ?? '').padStart(12, '0')
    ].join('\u0001');
  const offerings: Offering[] = [];
  for (const [code, group] of byCode) {
    if (group.length === 1) {
      offerings.push({ sourceId: code, ...group[0].offering });
      continue;
    }
    group
      .sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0))
      .forEach((item, index) => offerings.push({ sourceId: `${code}#${index + 1}`, ...item.offering }));
  }
  return { offerings, skipped, otherSchools: [...otherSchools].filter(Boolean).sort() };
}
