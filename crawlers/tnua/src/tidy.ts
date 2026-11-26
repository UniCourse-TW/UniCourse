import { decodeEntities, withExtra, type ExtraRecord, type Offering } from '@unicourse/crawler-kit';

/** `領域` is a comma list with HTML entities and a trailing comma: `理論&amp;基礎課程,創作組-理論課程,`. */
export function fieldList(value: string): string {
  return [...new Set(decodeEntities(value).split(/[,，]/).map((part) => part.trim()).filter(Boolean))].join('、');
}

/**
 * Offering-level cleanup shared by the parser and `retidy` (old snapshots): readable `領域`, and `選課上限` 0 with
 * students (室內樂, 主修－管絃樂演奏, 獨立研究: assigned by the department rather than selected online) is not a
 * capacity. A 0 limit without students stays, since nobody could select the course.
 */
export function tidyOffering(offering: Offering): Offering {
  const next: Offering = { ...offering };
  if (next.capacity === 0 && next.enrolled) delete next.capacity;
  if (!offering.extra) return next;
  const extra = { ...offering.extra } as ExtraRecord;
  if (typeof extra['領域'] === 'string') {
    const field = fieldList(extra['領域']);
    if (field) extra['領域'] = field;
    else delete extra['領域'];
  }
  return withExtra(next, extra);
}
