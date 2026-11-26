import { decodeEntities, oneLineText, remapExtra, stripControl, withExtra, withoutPlaceholderInstructors, type ExtraRecord, type ExtraValue, type Offering } from '@unicourse/crawler-kit';

function parseJson(value: ExtraValue): Record<string, Record<string, unknown>> | undefined {
  if (typeof value !== 'string' || !value.startsWith('{')) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, Record<string, unknown>>) : undefined;
  } catch {
    return undefined;
  }
}

const joined = (values: unknown[]) =>
  [...new Set(values.filter((v): v is string => typeof v === 'string' && v.trim() !== '').map((v) => decodeEntities(v).trim()))].join('、');

/** `{"大學導師_大學導師": {"course_category_cname": "大學導師_大學導師", …}}` -> `大學導師`. */
export function courseCategories(value: ExtraValue): string | undefined {
  const items = parseJson(value);
  if (!items) return typeof value === 'string' && value.trim() ? joined(value.split('、')) : undefined;
  // `cname` is `<category>_<subcategory>`, almost always the same text twice (`程式相關_程式相關`) or the
  // subcategory cut short (`通識校基本素養_通識校基本`); the first part is the label the timetable shows.
  return joined(Object.values(items).map((item) => String(item?.course_category_cname ?? '').split('_')[0])) || undefined;
}

/** `{"Z106": {"brief_code": "Z106", "brief": "領域課程-個人、社會與文化(110)"}}` -> the `brief` texts. */
export function briefs(value: ExtraValue): string | undefined {
  const items = parseJson(value);
  if (!items) return typeof value === 'string' && value.trim() ? joined(value.split('、')) : undefined;
  return joined(Object.values(items).flatMap((item) => String(item?.brief ?? '').split(','))) || undefined;
}

/**
 * Remaining timetable columns are internal codes (`depType: "U"`, `degree: "3"`, `dep_primary`, `dep_limit: "*"`),
 * an English copy of the requirement (`cos_type_e`), the syllabus kind the crawler already used, or JSON blobs.
 * Keep the readable ones under the timetable's labels and drop the rest; unknown ASCII-named columns are dropped
 * too so a new API column never shows up as a raw field name on the course page.
 */
const EXTRA_RULES = {
  cos_hours: (value: ExtraValue): [string, ExtraValue] | undefined => {
    const hours = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    return Number.isFinite(hours) && hours > 0 ? ['上課時數', hours] : undefined;
  },
  dep_ename: (value: ExtraValue): [string, ExtraValue] | undefined =>
    typeof value === 'string' && value.trim() ? ['開課單位英文名稱', value.trim()] : undefined,
  costype: (value: ExtraValue): [string, ExtraValue] | undefined => {
    const label = courseCategories(value);
    return label ? ['課程類別', label] : undefined;
  },
  brief: (value: ExtraValue): [string, ExtraValue] | undefined => {
    const label = briefs(value);
    return label ? ['通識向度', label] : undefined;
  },
  URL: '課程網頁',
  dep_limit: null,
  degree: null,
  dep_primary: null,
  cos_type_e: null,
  crsoutline_type: null,
  depType: null
};

const clean = (value: string | undefined) => (value === undefined ? undefined : oneLineText(stripControl(decodeEntities(value))) || undefined);

/**
 * Offering-level cleanup shared by the crawler and `retidy` (old snapshots): readable `extra`, decoded HTML entities
 * and stray DEL bytes in titles (`Mentor&#39;s Hours`, `Experimental Brain Science\x7f`), and `num_limit` 0 with
 * registered students (a course without an online-selection limit, not a 0-seat course) is not a capacity.
 */
export function tidyOffering(offering: Offering): Offering {
  const next: Offering = { ...withoutPlaceholderInstructors(offering), title: clean(offering.title) ?? offering.title };
  const titleEn = clean(next.titleEn);
  if (titleEn === undefined) delete next.titleEn;
  else next.titleEn = titleEn;
  if (next.capacity === 0 && next.enrolled) delete next.capacity;
  const extra = remapExtra(offering.extra as ExtraRecord | undefined, EXTRA_RULES);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (/^[A-Za-z0-9_]+$/.test(key) || value === null) delete extra[key];
      else if (typeof value === 'string') extra[key] = decodeEntities(value);
    }
  }
  return withExtra(next, extra);
}
