import { compact, requirementFromText, type Meeting, type Offering } from '@unicourse/crawler-kit';

export const SITE = 'https://coursesearch02.fcu.edu.tw';

/** One row of `Search.asmx/GetType1Result` / `GetType2Result` (`items[]`). */
export interface FcuItem {
  scr_selcode: string;
  sub_id3?: string | null;
  sub_name?: string | null;
  scr_credit?: number | null;
  scj_scr_mso?: string | null;
  scr_examid?: string | null;
  scr_examfn?: string | null;
  scr_exambf?: string | null;
  cls_name?: string | null;
  scr_period?: string | null;
  scr_precnt?: number | null;
  scr_acptcnt?: number | null;
  scr_remarks?: string | null;
  unt_ls?: number | string | null;
  cls_id?: string | null;
  sub_id?: string | null;
  scr_dup?: string | null;
  scr_ldl?: string | null;
  scr_english?: string | null;
  scr_teacher?: string | null;
  scr_date?: string | null;
}

export interface FcuResult {
  message?: string | null;
  total?: number;
  items?: FcuItem[];
}

export interface IdName {
  id: string;
  name: string;
}

/** Degree options of the 開課單位 search tab (`Views/mainContent.html`, DEGREE_OPT1..4). */
export const DEGREES: IdName[] = [
  { id: '1', name: '大學部' },
  { id: '3', name: '碩士班' },
  { id: '4', name: '博士班' },
  { id: '5', name: '進修學士班' }
];

/** ASMX JSON services answer either the bare object or `{ d: ... }`; errors come back as `{ Message }`. */
export function unwrapAsmx<T>(raw: unknown, what: string): T {
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    if ('d' in record) return record.d as T;
    if (typeof record.Message === 'string' && !('items' in record)) {
      throw new Error(`${what}: server error "${record.Message}"`);
    }
  }
  return raw as T;
}

/** Strip control characters (the data contains stray DEL bytes), normalise newlines, trim. */
export function cleanText(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value)
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || undefined;
}

const oneLine = (value: string | null | undefined) => cleanText(value)?.replace(/\s+/g, ' ');

const DAYS: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7 };
const SLOT = /\((一|二|三|四|五|六|日)\)(\d{2})(?:-(\d{2}))?/g;
/** Room placeholders meaning "not assigned yet". */
const NO_ROOM = new Set(['待排', '未排教室']);

export interface ParsedPeriod {
  /** Time/room part of `scr_period`, whitespace collapsed as the browser renders it. */
  scheduleText?: string;
  schedule: Meeting[];
  instructors: string[];
}

/**
 * Parse FCU's combined `上課時間/上課教室/授課教師` text, e.g.
 * `(二)06-07 語205 (五)09     資電404 劉維正`.
 *
 * Each slot is `(day)PP[-PP]` followed by an optional room; the instructor list (comma separated, names may
 * contain spaces) is appended at the end. `scr_teacher` is a possibly truncated copy of that list, so we use
 * it only to find where the list starts. Slots starting at period `00` are "time not scheduled" placeholders.
 */
export function parsePeriod(period: string | null | undefined, teacher: string | null | undefined): ParsedPeriod {
  const text = cleanText(period) ?? '';
  const slots = [...text.matchAll(SLOT)];
  const hint = cleanText(teacher)?.replace(/[,\s]+$/, '');
  if (!slots.length) {
    return { scheduleText: oneLine(text), schedule: [], instructors: splitInstructors(hint) };
  }
  const last = slots[slots.length - 1];
  const lastEnd = last.index! + last[0].length;
  let body = text;
  let instructors: string[] = [];
  if (hint) {
    const at = text.indexOf(hint, lastEnd);
    if (at >= 0) {
      body = text.slice(0, at);
      instructors = splitInstructors(text.slice(at));
    } else {
      instructors = splitInstructors(hint);
    }
  }
  const schedule: Meeting[] = [];
  slots.forEach((slot, index) => {
    const start = slot.index! + slot[0].length;
    const end = index + 1 < slots.length ? slots[index + 1].index! : body.length;
    const room = body.slice(start, Math.max(start, end)).trim().replace(/\s+/g, ' ');
    const from = Number(slot[2]);
    const to = slot[3] ? Number(slot[3]) : from;
    if (from === 0 || to < from) return;
    const periods = Array.from({ length: to - from + 1 }, (_, i) => String(from + i));
    const meeting: Meeting = { day: DAYS[slot[1]], periods };
    if (room && !NO_ROOM.has(room)) meeting.location = room;
    schedule.push(meeting);
  });
  return { scheduleText: oneLine(body), schedule, instructors };
}

export function splitInstructors(value: string | undefined): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  for (const part of value.split(/[,，、]/)) {
    const name = part.replace(/\s+/g, ' ').trim();
    if (name) seen.add(name);
  }
  return [...seen];
}

/** Public syllabus redirector used by the site's own result table (`getCourseOutlineUrl`). */
export function outlineUrl(year: number, sms: number, selcode: string) {
  return `${SITE}/CourseOutline.aspx?lang=cht&courseid=${year}${sms}${encodeURIComponent(selcode)}`;
}

export interface CollectedRow {
  degree: IdName;
  college: IdName;
  item: FcuItem;
}

export interface BuildInput {
  year: number;
  sms: number;
  /** Chinese rows from the 開課單位 traversal; the same 選課代碼 repeats once per 開課班級. */
  rows: CollectedRow[];
  /** 系所 id -> name from `GetUnitList`. */
  units: Map<string, string>;
  /** 選課代碼 -> teaching language (Chinese label), from the per-language `GetType2Result` queries. */
  languages: Map<string, string>;
  /** 選課代碼 -> English course title, from the `lang: en` queries. */
  englishTitles: Map<string, string>;
  /** 選課代碼 -> description from the optional syllabus fetch. */
  descriptions?: Map<string, string>;
}

const yesNo = (value: string | null | undefined) =>
  value === '是' || value === 'Y' ? true : value === '否' || value === 'N' ? false : undefined;

const unique = <T>(values: (T | undefined)[]) => [...new Set(values.filter((v): v is T => v !== undefined))];

/** Group rows by 選課代碼 and map them to snapshot offerings. */
export function buildOfferings(input: BuildInput): Offering[] {
  const groups = new Map<string, CollectedRow[]>();
  for (const row of input.rows) {
    const id = cleanText(row.item.scr_selcode);
    if (!id) continue;
    const list = groups.get(id);
    if (list) list.push(row);
    else groups.set(id, [row]);
  }
  const offerings: Offering[] = [];
  for (const [sourceId, rows] of groups) {
    const item = rows[0].item;
    const title = oneLine(item.sub_name);
    const courseCode = cleanText(item.sub_id3) ?? cleanText(item.sub_id);
    if (!title || !courseCode) continue;
    const parsed = parsePeriod(item.scr_period, item.scr_teacher);
    const classIds = unique(rows.map((r) => cleanText(r.item.cls_id)));
    const unitIds = unique(classIds.map((id) => id.slice(0, 4))).filter((id) => input.units.has(id));
    const unitId = unitIds[0];
    const requirementText = cleanText(item.scj_scr_mso);
    const titleEn = oneLine(input.englishTitles.get(sourceId));
    const url = outlineUrl(input.year, input.sms, sourceId);
    const extra = compact({
      科目代碼: cleanText(item.sub_id),
      開課班級: unique(rows.map((r) => oneLine(r.item.cls_name))).join('、'),
      班級代碼: classIds.join(','),
      學制: unique(rows.map((r) => r.degree.name)).join('、'),
      開課學院: unique(rows.map((r) => r.college.name)).join('、'),
      期中考: yesNo(item.scr_examid),
      期末考: yesNo(item.scr_examfn),
      提前考: yesNo(item.scr_exambf),
      上課方式: oneLine(item.scr_ldl),
      開課期程: oneLine(item.scr_date),
      'EMI課程': yesNo(item.scr_english),
      unt_ls: unique(rows.map((r) => (r.item.unt_ls === null || r.item.unt_ls === undefined ? undefined : String(r.item.unt_ls)))).join(',')
    }) as Record<string, string | number | boolean>;
    offerings.push(
      compact({
        sourceId,
        courseCode,
        classCode: cleanText(item.scr_dup),
        title,
        titleEn: titleEn && titleEn !== title ? titleEn : undefined,
        instructors: parsed.instructors,
        department: unitId ? input.units.get(unitId) : undefined,
        departmentCode: unitId,
        credits: typeof item.scr_credit === 'number' && Number.isFinite(item.scr_credit) ? item.scr_credit : undefined,
        requirement: requirementFromText(requirementText),
        requirementText,
        schedule: parsed.schedule,
        scheduleText: parsed.scheduleText,
        capacity:
          typeof item.scr_precnt === 'number' && Number.isInteger(item.scr_precnt) && item.scr_precnt >= 0
            ? item.scr_precnt
            : undefined,
        enrolled:
          typeof item.scr_acptcnt === 'number' && Number.isInteger(item.scr_acptcnt) && item.scr_acptcnt >= 0 && item.scr_acptcnt <= 2_147_483_647
            ? item.scr_acptcnt
            : undefined,
        language: input.languages.get(sourceId),
        description: input.descriptions?.get(sourceId),
        syllabusUrl: url,
        sourceUrl: url,
        notes: cleanText(item.scr_remarks),
        extra: Object.keys(extra).length ? extra : undefined
      }) as Offering
    );
  }
  return offerings.sort((a, b) => Number(a.sourceId) - Number(b.sourceId) || a.sourceId.localeCompare(b.sourceId));
}

/** `W320104_syllabus.aspx/GetCourseDetail` response: pick the Chinese (fallback English) course description. */
export function descriptionFromDetail(raw: unknown): string | undefined {
  const detail = unwrapAsmx<{ success?: boolean; description?: { describe_ch?: string | null; describe_eh?: string | null } | null }>(
    raw,
    'GetCourseDetail'
  );
  if (!detail || detail.success === false) return undefined;
  return cleanText(detail.description?.describe_ch) ?? cleanText(detail.description?.describe_eh);
}

/** Extract the JWT `token` query parameter from the final syllabus URL after redirects. */
export function syllabusToken(finalUrl: string): string | undefined {
  try {
    return new URL(finalUrl).searchParams.get('token') ?? undefined;
  } catch {
    return undefined;
  }
}
