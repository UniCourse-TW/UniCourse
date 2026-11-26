import { remapExtra, withExtra, withoutPlaceholderInstructors, type ExtraRecord, type ExtraValue, type Offering } from '@unicourse/crawler-kit';

/**
 * 加選方式 legend printed under the NOL result table (search_for_02_dpt.php, checked 2026-11-27):
 * 「開學後之加選方式:1-不限人數，直接上網加選 2-向教師取得授權碼後加選 3-有人數限制，第一週採上網登記後分發，
 * 第二週起，學生依教師發給之授權碼加選。」
 */
export const SELECT_METHODS: Record<string, string> = {
  '1': '不限人數，直接上網加選',
  '2': '向教師取得授權碼後加選',
  '3': '有人數限制，第一週上網登記後分發，第二週起依授權碼加選'
};

const EXTRA_RULES = {
  加選方式: (value: ExtraValue): [string, ExtraValue] => ['加選方式', SELECT_METHODS[String(value).trim()] ?? value],
  // Department codes behind 授課對象 (`1010,10A0,0000`); 授課對象 already lists the names.
  授課對象代碼: null
};

/**
 * Offering-level cleanup shared by the parser and `retidy` (old snapshots): 加選方式 text instead of 1/2/3, and
 * `未定` is not an instructor.
 */
export function tidyOffering(offering: Offering): Offering {
  const next = withoutPlaceholderInstructors(offering);
  return next.extra ? withExtra(next, remapExtra(next.extra as ExtraRecord, EXTRA_RULES)) : next;
}
