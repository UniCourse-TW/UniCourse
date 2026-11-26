import { compact, requirementFromText, type Meeting, type Offering } from '@unicourse/crawler-kit';
import { tidyOffering } from './tidy.ts';

/**
 * Parsers for 臺大課程網 (nol.ntu.edu.tw/nol/coursesearch). The result table is regular,
 * server-rendered HTML, so a small tag-level parser is enough (and keeps the package free of
 * extra dependencies).
 */

export const NOL_BASE = 'https://nol.ntu.edu.tw/nol/coursesearch/';

const ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (whole, name: string) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}

/** Strip tags, decode entities and collapse whitespace. `<br>` becomes a space. */
export function htmlText(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ''))
    .replace(/[\s　]+/g, ' ')
    .trim();
}

/** Like htmlText but keeps line breaks from `<br>` / `</p>` (for long descriptions). */
export function htmlBlockText(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>|<\/p>/gi, '\n').replace(/<[^>]*>/g, ''))
    .split('\n')
    .map((line) => line.replace(/[ \t 　]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

/** One data row of search_result.php, cell texts already cleaned. */
export interface NtuRow {
  serial?: string;
  /** 授課對象 */
  audience?: string;
  /** 課號 */
  courseNo?: string;
  /** 班次 */
  classCode?: string;
  title?: string;
  /** Relative print_table.php link (absent for cancelled rows). */
  detailHref?: string;
  /** dpt_code taken from the detail link. */
  dptCode?: string;
  /** 領域專長 */
  field?: string;
  credits?: string;
  /** 課程識別碼 */
  identifier?: string;
  /** 全/半年 */
  duration?: string;
  /** 必/選修 */
  requirementText?: string;
  instructors: string[];
  /** 加選方式 */
  selectMethod?: string;
  /** 時間教室 */
  timeText?: string;
  /** 總人數 */
  capacity?: string;
  /** 選課限制條件 */
  restriction?: string;
  /** 備註 */
  notes?: string;
  /** 課程網頁 (e.g. NTU COOL) */
  courseWeb?: string;
  /** Row carries the 停開 (cancelled) icon. */
  cancelled: boolean;
  /** Row carries the 異動 (changed) icon. */
  changed: boolean;
}

const opt = (value: string) => (value === '' ? undefined : value);

/** Total number of rows reported by the page (共查詢到 N 筆), or undefined. */
export function parseTotal(html: string): number | undefined {
  const match = /共查詢到(?:<[^>]*>|\s)*(\d+)/.exec(html);
  return match ? Number(match[1]) : undefined;
}

export function parseResultRows(html: string): NtuRow[] {
  const rows: NtuRow[] = [];
  // Data rows are `<tr align="center">`, highlighted ones `<tr bgcolor=yellow align="center">`;
  // the header row is `<tr bgcolor="#DDEDFF" align="center">`.
  const parts = html.split(/<tr\b(?![^>]*#DDEDFF)[^>]*\balign="center"[^>]*>/i).slice(1);
  for (const part of parts) {
    const body = part.split(/<\/tr>/i)[0];
    const cells = body.split(/<td\b[^>]*>/i).slice(1).map((cell) => cell.replace(/<\/td>\s*$/i, ''));
    if (cells.length < 16) continue;
    const text = cells.map(htmlText);
    const titleCell = cells[4];
    const href = /href="(print_table\.php\?[^"]+)"/i.exec(titleCell)?.[1];
    const dptCode = href ? /[?&]dpt_code=([^&"]*)/.exec(decodeEntities(href))?.[1]?.trim() : undefined;
    const instructors = [...cells[10].matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => htmlText(m[1])).filter(Boolean);
    if (!instructors.length && text[10]) instructors.push(...splitInstructors(text[10]));
    const web = /href="(https?:[^"]+)"/i.exec(cells[16] ?? '')?.[1];
    rows.push({
      serial: opt(text[0]),
      audience: opt(text[1]),
      courseNo: opt(text[2]),
      classCode: opt(text[3]),
      title: opt(text[4]),
      detailHref: href ? decodeEntities(href) : undefined,
      dptCode: dptCode || undefined,
      field: opt(text[5]),
      credits: opt(text[6]),
      identifier: opt(text[7]),
      duration: opt(text[8]),
      requirementText: opt(text[9]),
      instructors,
      selectMethod: opt(text[11]),
      timeText: opt(text[12]),
      capacity: opt(text[13]),
      restriction: opt(text[14]),
      notes: opt(text[15]),
      courseWeb: web,
      cancelled: /images\/cancel(?:led)?\.(?:gif|jpg)/i.test(body),
      changed: /images\/chg\.gif/i.test(body)
    });
  }
  return rows;
}

export function verifyResultTerm(rows: readonly NtuRow[], term: string): void {
  const terms = new Set(rows.flatMap(({ detailHref }) => {
    if (!detailHref) return [];
    const semester = new URL(detailHref, NOL_BASE).searchParams.get('semester');
    return semester ? [semester] : [];
  }));
  if (terms.size !== 1 || !terms.has(term)) {
    throw new Error(`NTU: expected result term ${term}; found ${[...terms].join(', ') || 'no term'}`);
  }
}

function splitInstructors(text: string): string[] {
  return text
    .split(/[、,，;；/]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

/** Department code → name from the 開課學院 / 開課系所 selects of search_for_02_dpt.php. */
export function parseDepartments(html: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const match of html.matchAll(/<option value="([0-9A-Z]{4})"[^>]*>([^<]*)/g)) {
    const name = htmlText(match[2]).replace(new RegExp(`^${match[1]}\\s*`), '').trim();
    if (name && !map.has(match[1])) map.set(match[1], name);
  }
  return map;
}

const DAYS: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7 };
/** Placeholder rooms that are not real locations. */
const NOT_A_ROOM = /^(請洽系所辦|未定|待定)$/;

/**
 * Parse 時間教室 such as `一3,4(中央籃球場) 五10,A(新102)`. Each segment is a weekday,
 * a comma list of period labels (0-10, A-D) and an optional parenthesised room, which may
 * itself contain parentheses. Returns undefined when nothing parseable is found.
 */
export function parseSchedule(text: string | undefined): Meeting[] | undefined {
  if (!text) return undefined;
  const meetings: Meeting[] = [];
  const re = /([一二三四五六日])\s*((?:10|[0-9A-D])(?:\s*,\s*(?:10|[0-9A-D]))*)(?![0-9A-Za-z])/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const periods = match[2].split(',').map((p) => p.trim()).filter(Boolean);
    let location: string | undefined;
    let index = re.lastIndex;
    while (text[index] === ' ') index += 1;
    if (text[index] === '(' || text[index] === '（') {
      let depth = 0;
      let end = index;
      for (; end < text.length; end += 1) {
        const ch = text[end];
        if (ch === '(' || ch === '（') depth += 1;
        else if (ch === ')' || ch === '）') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      location = text.slice(index + 1, end).trim();
      re.lastIndex = end + 1;
    }
    meetings.push(
      compact({ day: DAYS[match[1]], periods, location: location && !NOT_A_ROOM.test(location) ? location : undefined })
    );
  }
  return meetings.length ? meetings : undefined;
}

/** Teaching language when the 備註 states it explicitly. */
export function languageFromNotes(notes: string | undefined): string | undefined {
  if (!notes) return undefined;
  if (/本課程以英語授課/.test(notes)) return '英語';
  if (/本課程以日語授課/.test(notes)) return '日語';
  return undefined;
}

export interface MergedRow extends NtuRow {
  /** All 授課對象 the same 流水號 is listed under, in page order. */
  audiences: string[];
  dptCodes: string[];
}

/**
 * Keep real offerings only: rows with a 流水號 that are not cancelled. The same 流水號 is
 * listed once per 授課對象 (target department); those rows are merged.
 */
export function mergeRows(rows: NtuRow[]): { merged: MergedRow[]; placeholders: number; cancelled: number } {
  const bySerial = new Map<string, MergedRow>();
  let placeholders = 0;
  let cancelled = 0;
  const cancelledSerials = new Set<string>();
  for (const row of rows) {
    if (!row.serial) {
      placeholders += 1;
      continue;
    }
    if (row.cancelled) {
      if (!cancelledSerials.has(row.serial)) cancelled += 1;
      cancelledSerials.add(row.serial);
      continue;
    }
    const existing = bySerial.get(row.serial);
    if (existing) {
      if (row.audience && !existing.audiences.includes(row.audience)) existing.audiences.push(row.audience);
      if (row.dptCode && !existing.dptCodes.includes(row.dptCode)) existing.dptCodes.push(row.dptCode);
      // 必/選修 is per 授課對象; keep the first one but fill it when the first row has none.
      existing.requirementText ??= row.requirementText;
      continue;
    }
    bySerial.set(row.serial, {
      ...row,
      audiences: row.audience ? [row.audience] : [],
      dptCodes: row.dptCode ? [row.dptCode] : []
    });
  }
  return { merged: [...bySerial.values()], placeholders, cancelled };
}

export function detailUrl(row: NtuRow, term: string): string {
  if (row.detailHref) return new URL(row.detailHref.replace(/ /g, '%20'), NOL_BASE).toString();
  const query = new URLSearchParams({ current_sem: term, cstype: '4', csname: row.serial ?? '' });
  return `${NOL_BASE}search_result.php?${query}`;
}

export function toOffering(
  row: MergedRow,
  term: string,
  departments: Map<string, string>,
  english?: { titleEn?: string },
  detail?: DetailInfo
): Offering {
  const credits = row.credits !== undefined ? Number(row.credits) : undefined;
  // 總人數 is usually a plain number, sometimes `100(含開放臺大系統人數:10)`.
  const capacityMatch = /^(\d+)/.exec(row.capacity ?? '');
  const capacity = capacityMatch ? Number(capacityMatch[1]) : undefined;
  const departmentCode = row.dptCodes[0];
  const url = detailUrl(row, term);
  const extra = compact({
    課程識別碼: row.identifier,
    '全/半年': row.duration,
    加選方式: row.selectMethod,
    領域專長: row.field,
    選課限制條件: row.restriction,
    授課對象: row.audiences.length ? row.audiences.join('、') : undefined,
    授課對象代碼: row.dptCodes.length > 1 ? row.dptCodes.join(',') : undefined,
    總人數: row.capacity && !/^\d+$/.test(row.capacity) ? row.capacity : undefined,
    課程網頁: row.courseWeb,
    異動: row.changed ? true : undefined
  }) as Record<string, string | boolean>;
  return tidyOffering(compact({
    sourceId: row.serial!,
    courseCode: row.courseNo ?? row.identifier!,
    classCode: row.classCode,
    title: row.title!,
    titleEn: english?.titleEn ?? detail?.titleEn,
    instructors: row.instructors,
    department: (departmentCode && departments.get(departmentCode)) || row.audiences[0],
    departmentCode,
    credits: credits !== undefined && Number.isFinite(credits) ? credits : undefined,
    requirement: requirementFromText(row.requirementText),
    requirementText: row.requirementText,
    schedule: parseSchedule(row.timeText),
    scheduleText: row.timeText,
    capacity,
    language: languageFromNotes(row.notes),
    description: detail?.description,
    syllabusUrl: row.detailHref ? url : undefined,
    sourceUrl: url,
    notes: row.notes,
    extra: Object.keys(extra).length ? extra : undefined
  }) as Offering);
}

export interface DetailInfo {
  titleEn?: string;
  description?: string;
}

/** Fields from print_table.php that the list lacks: English title and 課程概述. */
export function parseDetail(html: string): DetailInfo {
  const cell = (label: string) => {
    const re = new RegExp(`<DIV[^>]*>\\s*${label}\\s*</DIV>\\s*</TD>\\s*<TD[^>]*>([\\s\\S]*?)</TD>`, 'i');
    return re.exec(html)?.[1];
  };
  const name = cell('課程名稱');
  const titleEn = name?.split(/<br\s*\/?>/i)[1];
  const description = cell('課程概述');
  return compact({
    titleEn: titleEn ? htmlText(titleEn) : undefined,
    description: description ? htmlBlockText(description) : undefined
  });
}
