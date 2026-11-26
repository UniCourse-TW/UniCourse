import { oneLineText, withExtra, type ExtraRecord, type Offering } from '@unicourse/crawler-kit';

/** 開課人數 9999 is the catalog's "no limit" value (操行 and similar administrative courses). */
export const UNLIMITED = 9999;

/**
 * Offering-level cleanup shared by the parser and `retidy` (old snapshots):
 * - `選課系所` is published as `B02&nbsp;&nbsp;&nbsp;循環經濟研究學院(研究所)` and some titles carry doubled spaces;
 *   both become single-spaced one-line text;
 * - capacity 9999 means unlimited, so it is not a capacity, and `enrolled` (開課人數 − 可加選餘額) derived from it
 *   is not an enrolment count either (操行 5069 would read 9999 students).
 */
export function tidyOffering(offering: Offering): Offering {
  const next: Offering = { ...offering, title: oneLineText(offering.title) || offering.title };
  if (next.capacity !== undefined && next.capacity >= UNLIMITED) {
    delete next.capacity;
    delete next.enrolled;
  }
  const extra = offering.extra ? ({ ...offering.extra } as ExtraRecord) : undefined;
  if (extra && typeof extra['選課系所'] === 'string') extra['選課系所'] = oneLineText(extra['選課系所']);
  return extra ? withExtra(next, extra) : next;
}
