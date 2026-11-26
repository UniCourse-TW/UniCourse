import { compact, loadHtml, requirementFromText, type Meeting, type Offering } from '@unicourse/crawler-kit';

export const ENTRY_URL = 'https://qrysub.nccu.edu.tw/';
export const API_BASE = 'https://es.nccu.edu.tw/course';
/** The search API silently truncates results at this many rows. */
export const RESULT_CAP = 500;

/** One row of `https://es.nccu.edu.tw/course/<lang>/<query>/` (only the fields we read are typed strictly). */
export interface NccuCourse {
  y: string;
  s: string;
  subNum: string;
  subNam: string;
  subGde?: string;
  subPoint?: string;
  subKind?: string;
  lmtKind?: string;
  subTime?: string;
  subClassroom?: string;
  teaNam?: string;
  langTpe?: string;
  note?: string;
  info?: string;
  core?: string;
  emiType?: string;
  far?: string;
  gdeTpe?: string;
  gdeTpeMsg?: string;
  gdeType?: string;
  pay?: string;
  smtQty?: string;
  tranTpe?: string;
  subOdr?: string;
  teaSchmUrl?: string;
  [key: string]: unknown;
}

export interface UnitL3 { utCodL3: string; utL3Text: string }
export interface UnitL2 { utCodL2: string; utL2Text: string; utL3: UnitL3[] }
export interface UnitL1 { utCodL1: string; utL1Text: string; utL2: UnitL2[] }

/**
 * Filters for one API query. `dp1`..`dp3` are the `utCod*` values from `assets/api/unit.json`;
 * `week` is 1 (Mon) to 7 (Sun), `dsec` a time-of-day bucket (1 morning, 2 noon, 3 afternoon, 4 night);
 * `keyword` is a free-text term.
 */
export interface CourseQuery {
  keyword?: string;
  week?: string;
  dsec?: string;
  dp1?: string;
  dp2?: string;
  dp3?: string;
}

/** `115-1` -> `1151`, the semester token the NCCU API expects. */
export function semesterToken(year: number, semester: number): string {
  return `${year}${semester}`;
}

/** Build the search URL exactly like the qrysub front end (`:key=value ` tokens in its order, trailing slash). */
export function courseQueryUrl(lang: 'zh-TW' | 'en', sem: string, q: CourseQuery = {}): string {
  let query = `:sem=${sem} `;
  if (q.keyword) query += `${q.keyword} `;
  if (q.week) query += `:week=${q.week} `;
  if (q.dsec) query += `:dsec=${q.dsec} `;
  if (q.dp1) query += `:dp1=${q.dp1} `;
  if (q.dp2) query += `:dp2=${q.dp2} `;
  if (q.dp3) query += `:dp3=${q.dp3} `;
  return `${API_BASE}/${lang}/${encodeURIComponent(query)}/`;
}

/** Real unit entries (the `"0"` rows are the "please choose" placeholders). */
export function realUnits<T, K extends keyof T>(list: T[], codeKey: K): T[] {
  return list.filter((unit) => String(unit[codeKey]) !== '0');
}

const DAYS: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7 };
/**
 * NCCU period labels in daily order: A B 1 2 3 4 C D 5 6 7 8 E F G H.
 * `H` is the last evening period (seen as `FGH`, `GH`, `EFGH` in every term since 105-1).
 */
const PERIOD = /^[AB1-8C-H]$/;

/**
 * Parse NCCU `subTime` such as `三D56` or `一CD四78` into meetings.
 * Returns `undefined` when the text is not in that format (e.g. `未定或彈性`), so callers keep only `scheduleText`.
 */
export function parseSubTime(raw: string | undefined): Meeting[] | undefined {
  const text = (raw ?? '').replace(/\s+/g, '');
  if (!text || !/^([一二三四五六日][AB1-8C-H]+)+$/.test(text)) return undefined;
  const meetings: Meeting[] = [];
  for (const match of text.matchAll(/([一二三四五六日])([AB1-8C-H]+)/g)) {
    const periods = [...match[2]].filter((p) => PERIOD.test(p));
    meetings.push({ day: DAYS[match[1]], periods });
  }
  return meetings.length ? meetings : undefined;
}

/** `黃柏鈞` / `莊弘鈺、鄭菀瓊` -> array of names. */
export function splitInstructors(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(/[、,，;；]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

/** Strip the `＠備註:` / `＠異動資訊:` style prefixes and drop placeholder values. */
export function cleanLabelled(raw: string | undefined): string | undefined {
  const value = (raw ?? '').replace(/^＠[^:：]*[:：]/, '').trim();
  if (!value || value === '無' || value === 'N/A') return undefined;
  return value;
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Map one zh-TW API row (plus the English title from the `en` API, when known) to an offering. */
export function toOffering(row: NccuCourse, titleEn?: string): Offering {
  const subTime = nonEmpty(row.subTime);
  const classroom = nonEmpty(row.subClassroom);
  const schedule = parseSubTime(subTime);
  // `subClassroom` is one string for all meetings (sometimes several rooms run together),
  // so only attach it as a location when there is exactly one meeting.
  if (schedule?.length === 1 && classroom) schedule[0].location = classroom;
  const lmtKind = nonEmpty(row.lmtKind);
  const subKind = nonEmpty(row.subKind);
  // `lmtKind` is only filled for 通識 courses (人文通識, 跨領域(人文、社會), ...), so any value means general education.
  const credits = row.subPoint ? Number(row.subPoint) : NaN;
  // Offerings without a syllabus point at a shared placeholder page (`.../emptyforqry.htm`).
  const syllabus = /emptyforqry/.test(row.teaSchmUrl ?? '') ? undefined : nonEmpty(row.teaSchmUrl);
  const extra = compact({
    lmtKind,
    info: cleanLabelled(row.info),
    core: nonEmpty(row.core),
    emiType: nonEmpty(row.emiType),
    far: nonEmpty(row.far) === '無資料' ? undefined : nonEmpty(row.far),
    gdeType: nonEmpty(row.gdeType),
    gdeTpe: nonEmpty(row.gdeTpe),
    gdeTpeMsg: nonEmpty(row.gdeTpeMsg),
    pay: nonEmpty(row.pay),
    smtQty: nonEmpty(row.smtQty),
    tranTpe: nonEmpty(row.tranTpe),
    subOdr: nonEmpty(row.subOdr)
  } as Record<string, string | undefined>);
  const en = nonEmpty(titleEn);
  return compact({
    sourceId: row.subNum.trim(),
    courseCode: row.subNum.trim(),
    title: row.subNam.trim(),
    titleEn: en && en !== row.subNam.trim() ? en : undefined,
    instructors: splitInstructors(row.teaNam),
    department: nonEmpty(row.subGde),
    credits: Number.isFinite(credits) ? credits : undefined,
    requirement: lmtKind ? 'general' : requirementFromText(subKind),
    requirementText: subKind ?? lmtKind,
    schedule,
    scheduleText: subTime ? (classroom ? `${subTime} ${classroom}` : subTime) : classroom,
    language: nonEmpty(row.langTpe),
    syllabusUrl: syllabus,
    sourceUrl: syllabus ?? ENTRY_URL,
    notes: cleanLabelled(row.note),
    extra: Object.keys(extra).length ? extra : undefined
  }) as Offering;
}

export interface SyllabusDetail {
  description?: string;
  capacity?: number;
}

/** Parse the public syllabus page (`teaSchmUrl`) for the course description and 預收人數. */
export function parseSyllabus(html: string): SyllabusDetail {
  const $ = loadHtml(html);
  let capacity: number | undefined;
  $('h4').each((_, el) => {
    if ($(el).text().trim() !== '預收人數') return;
    const value = Number($(el).parent().find('i.sylview-icontext').first().text().trim());
    if (Number.isInteger(value) && value >= 0) capacity = value;
  });
  let description: string | undefined;
  $('h2').each((_, el) => {
    if (description !== undefined || !$(el).text().includes('課程簡介')) return;
    // The description is the teacher-authored HTML after the heading, up to the template's next
    // `div.row` (核心能力分析圖) or heading.
    const parts: string[] = [];
    for (let node = $(el).next(); node.length && !node.is('div.row, h2, h3'); node = node.next()) {
      const text = node.text().replace(/\s+/g, ' ').trim();
      if (text) parts.push(text);
    }
    if (parts.length) description = parts.join('\n');
  });
  return compact({ description, capacity });
}
