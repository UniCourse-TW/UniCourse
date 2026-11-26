import { compact, requirementFromText, type Meeting, type Offering } from '@unicourse/crawler-kit';
import { tidyOffering } from './tidy.ts';

/** Parsers for 臺師大課程查詢系統 (courseap2.itc.ntnu.edu.tw/acadmOpenCourse). */

export const BASE = 'https://courseap2.itc.ntnu.edu.tw/acadmOpenCourse/';

/** One row of `CofopdlCtrl?action=showGrid` (all values are strings). */
export type RawCourse = Record<string, string | undefined> & {
  serial_no: string;
  course_code: string;
  chn_name: string;
};

export interface GridResponse {
  Count: number;
  List: RawCourse[];
}

/** Parse the grid JSON. The server answers with an empty body for rejected queries. */
export function parseGrid(body: string): GridResponse {
  if (!body.trim()) throw new Error('empty grid response (query rejected; session/referer missing or no deptCode?)');
  const json = JSON.parse(body) as GridResponse;
  if (!Array.isArray(json.List)) throw new Error('grid response without List');
  return json;
}

export function verifyGridTerm(rows: readonly RawCourse[], year: number, semester: number): void {
  for (const row of rows) {
    if (row.acadm_year !== String(year) || row.acadm_term !== String(semester)) {
      throw new Error(`NTNU: expected ${year}-${semester}, got ${row.acadm_year}-${row.acadm_term} on ${row.serial_no}`);
    }
  }
}

/**
 * Department list from `CofnameCtrl?action=cof`: a JavaScript array literal with single quotes,
 * e.g. `[['GU','GU  通識'],['EU00','EU00  教育系（學）']]`.
 */
export function parseDepartments(body: string): { code: string; name: string }[] {
  const out: { code: string; name: string }[] = [];
  for (const match of body.matchAll(/\['([^']*)','([^']*)'\]/g)) {
    const code = match[1].trim();
    if (!code) continue;
    out.push({ code, name: match[2].replace(code, '').trim() });
  }
  return out;
}

/**
 * Department code families:
 * - `ZU..` 學分學程 (credit programs) mostly re-list departmental courses, but own a few;
 * - `9...` 校際 (cross-school) list NTU / NTUST courses open to NTNU students.
 */
export function isProgramCode(code: string) {
  return /^ZU/.test(code);
}
export function isCrossSchoolCode(code: string) {
  return /^9/.test(code);
}

const clean = (value: string | undefined) => {
  const text = (value ?? '').replace(/[\s　]+/g, ' ').trim();
  return text === '' ? undefined : text;
};

/** `音樂鑑賞 </br>[ 學分學程：A學程 B學程 ]` → title + program list. */
export function splitName(raw: string | undefined): { name?: string; programs?: string } {
  const [name, rest] = (raw ?? '').split(/<\/?br\s*\/?>/i);
  const programs = /\[\s*(?:學分學程|Program)\s*[:：]\s*([^\]]+?)\s*\]/.exec(rest ?? '')?.[1];
  return { name: clean(name), programs: clean(programs) };
}

const DAYS: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7 };
/** NTNU period labels in order: 0-10 then A-D (evening). */
const PERIODS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'A', 'B', 'C', 'D'];
const CAMPUSES = new Set(['和平', '公館', '林口', '本部']);
const NOT_A_ROOM = /^(請洽系所辦|未定|待定)$/;

function expand(from: string, to: string | undefined): string[] | undefined {
  const a = PERIODS.indexOf(from);
  const b = to === undefined ? a : PERIODS.indexOf(to);
  if (a < 0 || b < 0 || b < a) return undefined;
  return PERIODS.slice(a, b + 1);
}

export interface ParsedTime {
  schedule?: Meeting[];
  campus?: string;
}

/**
 * Parse `time_inf` such as `二 6-7 公館 Ｓ102, 四 3 和平 教201` or `六 2-4 請洽系所辦`.
 * Segments that are not `day periods [room]` (e.g. `◎密集課程`, `◎面授/同步`) are skipped.
 */
export function parseTime(text: string | undefined): ParsedTime {
  const meetings: Meeting[] = [];
  const campuses = new Set<string>();
  for (const segment of (text ?? '').split(/[,，]/)) {
    const match = /^\s*([一二三四五六日])\s+(10|[0-9A-D])(?:\s*-\s*(10|[0-9A-D]))?(?:\s+(.*))?$/.exec(segment.trim());
    if (!match) continue;
    const periods = expand(match[2], match[3]);
    if (!periods) continue;
    let location = clean(match[4]);
    const first = location?.split(' ')[0];
    if (first && CAMPUSES.has(first)) campuses.add(first);
    if (location && NOT_A_ROOM.test(location)) location = undefined;
    meetings.push(compact({ day: DAYS[match[1]], periods, location }));
  }
  return {
    schedule: meetings.length ? meetings : undefined,
    campus: campuses.size === 1 ? [...campuses][0] : undefined
  };
}

/**
 * The grid separates instructors with spaces, which also occur inside romanised names
 * (`汪明輝 Richard Howitt`). Consecutive Latin-script tokens are joined back into one name.
 */
export function splitInstructors(raw: string | undefined): string[] {
  const names: string[] = [];
  let latin = false;
  for (const token of (raw ?? '').split(/[\s\u3000,，、]+/).filter(Boolean)) {
    const isLatin = /^[A-Za-z\u00C0-\u024F.'’-]+$/.test(token);
    if (isLatin && latin) names[names.length - 1] += ` ${token}`;
    else names.push(token);
    latin = isLatin;
  }
  return names;
}

export function syllabusUrl(raw: RawCourse): string {
  const params = new URLSearchParams({
    year: raw.acadm_year ?? '',
    term: raw.acadm_term ?? '',
    courseCode: raw.course_code.trim(),
    courseGroup: (raw.course_group ?? '').trim(),
    deptCode: (raw.dept_code ?? '').trim(),
    formS: (raw.form_s ?? '').trim(),
    classes1: (raw.classes ?? '').trim(),
    deptGroup: (raw.dept_group ?? '').trim()
  });
  return `${BASE}SyllabusCtrl?${params}`;
}

/** 停開 (cancelled) rows are shown with a red marker when status is `V`. */
export function isCancelled(raw: RawCourse) {
  return raw.status === 'V';
}

export function toOffering(raw: RawCourse, detail?: { description?: string }): Offering {
  const { name, programs } = splitName(raw.chn_name);
  const { name: nameEn } = splitName(raw.eng_name);
  const option = clean(raw.option_code);
  const credits = raw.credit !== undefined && raw.credit.trim() !== '' ? Number(raw.credit) : undefined;
  const capacity = /^\d+$/.test((raw.limit_count_h ?? '').trim()) ? Number(raw.limit_count_h) : undefined;
  const selected = raw.counter_exceptAuth?.trim();
  const enrolled = selected && /^\d+$/.test(selected) && Number(selected) <= 2_147_483_647 ? Number(selected) : undefined;
  const { schedule, campus } = parseTime(raw.time_inf);
  const url = syllabusUrl(raw);
  const extra = compact({
    限修: clean(raw.restrict),
    學分學程: programs,
    '全/半年': clean(raw.course_kind),
    班別: clean(raw.class_name),
    系組: clean(raw.dept_group_name),
    '正課/實驗親授': clean(raw.selfTeachName),
    授權碼名額: /^\d+$/.test((raw.authorize_p ?? '').trim()) ? Number(raw.authorize_p) : undefined,
    密集課程: raw.intensive === 'Y' ? true : undefined
  }) as Record<string, string | number | boolean>;
  return tidyOffering(compact({
    sourceId: raw.serial_no.trim(),
    courseCode: raw.course_code.trim(),
    classCode: clean(raw.course_group),
    title: name ?? raw.course_code.trim(),
    titleEn: nameEn,
    instructors: splitInstructors(raw.teacher),
    department: clean(raw.dept_chiabbr),
    departmentCode: clean(raw.dept_code),
    credits: credits !== undefined && Number.isFinite(credits) ? credits : undefined,
    // The grid abbreviates 必修/選修/通識 to 必/選/通.
    requirement: requirementFromText(option === '通' ? '通識' : option),
    requirementText: option,
    schedule,
    scheduleText: clean(raw.time_inf),
    capacity,
    enrolled,
    language: raw.eng_teach === '是' ? '英語' : undefined,
    campus,
    grade: clean(raw.form_s),
    description: detail?.description,
    syllabusUrl: url,
    sourceUrl: url,
    notes: clean(raw.comment),
    extra: Object.keys(extra).length ? extra : undefined
  }) as Offering);
}

/** 課程簡介 from SyllabusCtrl: the page embeds `var cof_outline = {...,"brief":"..."};`. */
export function parseSyllabusBrief(html: string): string | undefined {
  const match = /var cof_outline\s*=\s*(\{.*\});\s*$/m.exec(html);
  if (!match) return undefined;
  try {
    const brief = (JSON.parse(match[1]) as { brief?: string | null }).brief;
    const text = (brief ?? '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .split(/\r?\n/)
      .map((line) => line.replace(/[ \t　]+/g, ' ').trim())
      .filter(Boolean)
      .join('\n');
    return text || undefined;
  } catch {
    return undefined;
  }
}
