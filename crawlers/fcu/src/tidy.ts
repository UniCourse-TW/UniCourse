import { remapExtra, withExtra, type ExtraRecord, type Offering } from '@unicourse/crawler-kit';

/**
 * `GetUnitList` stores 系所 names in a 13-character column, so long program names come back cut mid-word
 * (`美國加州舊金山州立大學資訊` for the SFSU computer-science 2+2 program). Full names, by source:
 * - 國際科技與管理學院 2+2 programs: FCU 115 學年度國際科技與管理學院雙學士學位學程單獨招生簡章 (program index),
 *   plus the English `GetUnitList` names (`lang: 'en'`) for SJSU engineering and ZLC logistics.
 * - The rest complete the truncated suffix as confirmed by the English unit name (e.g. `CE30` "Professional
 *   Master's Program …" → 碩士在職學位學程, `PC86` "… Graduate Level Certificate Program" → 碩士學分學程).
 * Names not listed here and still exactly 13 characters without a complete ending get `…`, so a cut name is
 * never shown as if it were whole.
 */
export const FULL_UNIT_NAMES: Record<string, string> = {
  澳洲墨爾本皇家理工大學商學: '澳洲墨爾本皇家理工大學商學與創新雙學士學位學程',
  商學大數據分析雙學士學位學: '商學大數據分析雙學士學位學程',
  美國加州聖荷西州立大學電機: '美國加州聖荷西州立大學電機工程雙學士學位學程',
  美國加州聖荷西州立大學工程: '美國加州聖荷西州立大學工程雙學士學位學程',
  美國加州舊金山州立大學資訊: '美國加州舊金山州立大學資訊工程雙學士學位學程',
  澳洲昆士蘭大學商學雙學士學: '澳洲昆士蘭大學商學雙學士學位學程',
  澳洲蒙納許大學資訊工程雙學: '澳洲蒙納許大學資訊工程雙學士學位學程',
  澳洲昆士蘭大學電機工程雙學: '澳洲昆士蘭大學電機工程雙學士學位學程',
  澳洲新南威爾斯大學設計雙學: '澳洲新南威爾斯大學設計雙學士學位學程',
  物流供應鏈管理與創新創業雙: '物流供應鏈管理與創新創業雙碩士學位學程',
  人工智慧技術與應用學士學位: '人工智慧技術與應用學士學位學程',
  人工智慧科技與管理碩士學位: '人工智慧科技與管理碩士學位學程',
  智能製造與工程管理碩士在職: '智能製造與工程管理碩士在職學位學程',
  社會創新暨永續碩士在職學位: '社會創新暨永續碩士在職學位學程',
  資訊電機工程碩士在職學位學: '資訊電機工程碩士在職學位學程',
  建設學院專案管理碩士在職專: '建設學院專案管理碩士在職專班',
  大數據分析與實務應用碩士學: '大數據分析與實務應用碩士學分學程',
  人工智慧自然語言技術學分學: '人工智慧自然語言技術學分學程'
};

const UNIT_NAME_LIMIT = 13;
/** Endings that make a 13-character name plausibly complete (e.g. `合作經濟暨社會事業經營學系`). */
const COMPLETE_ENDING = /(系|所|班|學程|課程|學院|中心|組|室|處)$/;

/** Full 系所 name for a possibly truncated `GetUnitList` name. */
export function fullUnitName(name: string): string {
  const known = FULL_UNIT_NAMES[name];
  if (known) return known;
  if ([...name].length === UNIT_NAME_LIMIT && !COMPLETE_ENDING.test(name)) return `${name}…`;
  return name;
}

/** Extra keys the course page should not show. */
const EXTRA_RULES = {
  // Internal 系所 sequence number (8888 = 共同科目); duplicates `departmentCode`, means nothing to students.
  unt_ls: null
} as const;

/**
 * Offering-level cleanup shared by the parser and `retidy` (old snapshots):
 * - full 系所 names instead of the 13-character truncation;
 * - offerings whose class has no 系所 (`XC07` 通識選修, some 專班) take the offering college (`extra.開課學院`,
 *   e.g. `通識中心`) as `department`;
 * - `unt_ls` is dropped;
 * - `scr_precnt` (開放名額) is the number of seats opened in online selection and excludes students the
 *   department pre-registers (必修 帶入), so `微積分(一)實習` publishes 開放名額 5 with 63 students. It is only
 *   used as `capacity` when it is at least the enrolled count; otherwise it moves to `extra.開放名額`.
 */
export function tidyOffering(offering: Offering): Offering {
  const extra = remapExtra(offering.extra as ExtraRecord | undefined, EXTRA_RULES) ?? {};
  let next: Offering = { ...offering };

  if (next.department) next.department = fullUnitName(next.department);
  else {
    const college = typeof extra['開課學院'] === 'string' ? extra['開課學院'] : undefined;
    if (college && !college.includes('、')) next.department = college;
  }

  if (next.capacity !== undefined && next.enrolled !== undefined && next.enrolled > next.capacity) {
    const { capacity, ...rest } = next;
    extra['開放名額'] = capacity;
    next = rest as Offering;
  }
  return withExtra(next, extra);
}
