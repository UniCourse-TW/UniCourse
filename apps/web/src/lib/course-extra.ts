import type { Offering } from '@unicourse/api-client';

type ExtraValue = NonNullable<Offering['extra']>[string];

/** One school field shown on the course page, already labelled in zh-TW. */
export interface ExtraField {
  key: string;
  label: string;
  value: string;
}

/**
 * Labels for the few school fields that arrive with ASCII names. Every other ASCII-only key is an
 * internal field name of a school system (`unt_ls`, `subOdr`, `dep_limit` …) and is never shown.
 */
const asciiLabels: Record<string, string> = {
  info: '異動說明',
  gdeType: '開課學制',
  emiType: '英語授課',
  core: '核心課程',
  smtQty: '學期數',
  brief: '通識向度',
  costype: '課程類別'
};

/** Fields that are internal codes or duplicate the page header, even though their names are Chinese. */
const hiddenKeys = new Set([
  '科目代碼',
  '班級代碼',
  '課程識別碼',
  '選課號碼',
  '授課對象代碼',
  '學期別',
  // Remaining seats at crawl time; stale the moment it is imported.
  '可加選餘額'
]);

/** Seat counts where the school writes 0 for "not set"; a 0 there is not shown (missing is never 0). */
const seatKey = /名額|上限|人數|餘額/;

const hasCjk = /[㐀-鿿]/;

function plain(value: ExtraValue): string | undefined {
  if (value === null) return undefined;
  if (typeof value === 'boolean') return value ? '是' : '否';
  const text = String(value).trim();
  return text === '' ? undefined : text;
}

/**
 * NYCU sends some fields as JSON strings (`{"A505,…":{"brief":"校基本素養(106),…"}}`). Pull the
 * human-readable names out of them; anything else that looks like JSON is not shown.
 */
function fromJson(key: string, text: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object') return undefined;
    const names = Object.values(parsed as Record<string, unknown>).flatMap((entry) => {
      if (entry === null || typeof entry !== 'object') return [];
      const record = entry as Record<string, unknown>;
      const raw = key === 'brief' ? record.brief : record.course_category_cname;
      if (typeof raw !== 'string') return [];
      // `博雅選修通識_博雅選修通識` repeats the name around an underscore; `校基本素養(106),…` lists several.
      return raw.split(/,/).map((part) => part.split('_')[0].trim());
    });
    const unique = [...new Set(names.filter(Boolean))];
    return unique.length ? unique.join('、') : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The school's extra fields that a reader can understand: Chinese-named fields plus the labelled ASCII
 * ones, without internal codes, empty values or raw JSON.
 */
export function labelledExtra(extra: Offering['extra'] | null | undefined): ExtraField[] {
  const fields: ExtraField[] = [];
  for (const [key, raw] of Object.entries(extra ?? {})) {
    if (hiddenKeys.has(key)) continue;
    const label = hasCjk.test(key) ? key : asciiLabels[key];
    if (!label) continue;
    let value = plain(raw);
    if (value && /^[[{]/.test(value)) value = fromJson(key, value);
    if (!value || (seatKey.test(key) && /^0+$/.test(value))) continue;
    fields.push({ key, label, value });
  }
  return fields;
}
