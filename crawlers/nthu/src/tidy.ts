import { decodeEntities, htmlToText, withExtra, withoutPlaceholderInstructors, type ExtraRecord, type Offering } from '@unicourse/crawler-kit';

const HTML = /<\s*\/?\s*(br|div|p|span|b|font)\b[^>]*>/i;

/** `擋修說明` is published as an HTML fragment and `第一二專長對應` separates programs with tabs; show plain text. */
export function tidyExtraValue(value: string): string {
  if (HTML.test(value)) return htmlToText(value);
  return decodeEntities(value)
    .split('\t')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('、');
}

/**
 * Offering-level cleanup shared by the parser and `retidy` (old snapshots): plain-text `extra` values, and `人限` 0
 * with registered students (e.g. 室內樂, 專題研究: students are added by the department, not through online
 * selection) is not a capacity.
 */
export function tidyOffering(offering: Offering): Offering {
  const next: Offering = { ...withoutPlaceholderInstructors(offering) };
  if (next.capacity === 0 && next.enrolled) delete next.capacity;
  if (!offering.extra) return next;
  const extra: ExtraRecord = {};
  for (const [key, value] of Object.entries(offering.extra)) {
    const cleaned = typeof value === 'string' ? tidyExtraValue(value) : value;
    if (cleaned !== '') extra[key] = cleaned;
  }
  return withExtra(next, extra);
}
