import type { CourseHistory, CourseTerm, Offering } from '@unicourse/api-client';

/** A class section linked from the per-term table. */
export interface HistoryOffering {
  id: string;
  label: string;
  active: boolean;
}

/** One academic term of a cross-term course, trimmed for the chart and the per-term table. */
export interface HistoryRow {
  term: string;
  enrolled: number | null;
  capacity: number | null;
  /** At most `maxListed` sections, the page's own offering first. */
  offerings: HistoryOffering[];
  offeringCount: number;
  /** At most `maxListed` names. */
  instructors: string[];
  instructorCount: number;
  /** Every offering of the term was withdrawn by the school. */
  withdrawn: boolean;
  current: boolean;
  /**
   * Far fewer sections than the course usually has (2 of a usual ~38): most likely an import still in
   * progress, so the term's total is not comparable with the others. Set by `markPartialTerms`.
   */
  partial: boolean;
  /** The usual number of sections a term (median over the other terms), for the partial note. */
  usualSections: number | null;
}

/** A chart slot: a term with offerings, or an empty gap between imported terms. */
export interface HistorySlot {
  term: string;
  row: HistoryRow | null;
}

const termPattern = /^(\d{2,3})-(\d)$/;

function parseTerm(term: string) {
  const match = termPattern.exec(term);
  return match ? { year: Number(match[1]), semester: Number(match[2]) } : null;
}

export function compareTerms(a: string, b: string) {
  const left = parseTerm(a);
  const right = parseTerm(b);
  if (left && right) return left.year - right.year || left.semester - right.semester;
  return a.localeCompare(b);
}

/** Sections and names listed per term; popular general courses have hundreds of sections a term. */
export const maxListed = 3;

/** Capacity 0 is how some schools leave 名額 blank, so it is treated as unpublished. */
export function publishedCapacity(value: number | null | undefined) {
  return value != null && value > 0 ? value : null;
}

function sumOrNull(values: (number | null | undefined)[]) {
  const known = values.filter((value): value is number => value != null);
  return known.length ? known.reduce((total, value) => total + value, 0) : null;
}

/**
 * Rows newest first, small enough to serialise into the page (the API returns every section of every
 * term). Per-term sums fall back to the offerings when the API leaves them out.
 */
export function historyRows(history: CourseHistory | null | undefined, current: Offering): HistoryRow[] {
  const terms: CourseTerm[] = history?.terms.length
    ? history.terms
    : [{ term: current.term, enrolled: current.enrolled ?? null, capacity: current.capacity ?? null, offerings: [current] }];
  return [...terms]
    .sort((a, b) => compareTerms(b.term, a.term))
    .map((entry) => {
      const offerings = [...entry.offerings].sort(
        (a, b) => Number(b.id === current.id) - Number(a.id === current.id) || (a.classCode ?? '').localeCompare(b.classCode ?? '')
      );
      const instructors = [...new Set(offerings.flatMap((offering) => offering.instructors))];
      const several = offerings.length > 1;
      // Class codes only tell sections apart when they are unique within the term (FCU reuses 001 per department).
      const codes = offerings.map((offering) => offering.classCode).filter(Boolean);
      const distinctCodes = new Set(codes).size === codes.length;
      return {
        term: entry.term,
        enrolled: entry.enrolled ?? sumOrNull(offerings.map((offering) => offering.enrolled)),
        capacity: publishedCapacity(entry.capacity ?? sumOrNull(offerings.map((offering) => publishedCapacity(offering.capacity)))),
        // Sections are listed by class code only; teacher names already fill the teacher column, so a
        // term without unique codes links its own section (if any) and「全部 N 班」.
        offerings: offerings
          .filter((offering) => !several || (distinctCodes && offering.classCode) || offering.id === current.id)
          .slice(0, maxListed)
          .map((offering) => ({
            id: offering.id,
            label: (distinctCodes ? offering.classCode : undefined) || (several ? '本班' : offering.classCode || '查看'),
            active: offering.active
          })),
        offeringCount: offerings.length,
        instructors: instructors.slice(0, maxListed),
        instructorCount: instructors.length,
        withdrawn: offerings.length > 0 && offerings.every((offering) => !offering.active),
        current: offerings.some((offering) => offering.id === current.id),
        partial: false,
        usualSections: null
      };
    })
    .map((row, _, all) => markPartial(row, all));
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** A term is marked when it has at most this share of the course's usual sections a term. */
export const partialShare = 1 / 3;
/** Courses with fewer usual sections than this are never marked: 1 vs 3 sections is ordinary noise. */
const partialMinUsual = 6;

/**
 * One rule for every course: a term whose total covers far fewer sections than the course usually has
 * (at most a third of the median of the other terms, which must be at least 6) is marked, so its low
 * sum is not read as a drop. Marks 2 of a usual ~38 sections (FCU 111-1) and 2 of a usual ~8 (NTU
 * 108-2) alike; the wording (「只收錄 N 班」) states what was imported without guessing why.
 */
function markPartial(row: HistoryRow, all: HistoryRow[]): HistoryRow {
  const others = all.filter((other) => other !== row && other.offeringCount > 0).map((other) => other.offeringCount);
  if (others.length < 2) return row;
  const usual = median(others);
  if (usual < partialMinUsual || row.offeringCount > usual * partialShare) return row;
  return { ...row, partial: true, usualSections: Math.round(usual) };
}

/** Partial terms grouped by section count and usual count, for one sentence per group (「105-2、106-2 只收錄 2 班」). */
export function partialGroups(rows: readonly HistoryRow[]) {
  const groups = new Map<string, { terms: string[]; count: number; usual: number | null }>();
  for (const row of [...rows].filter((r) => r.partial).sort((a, b) => compareTerms(a.term, b.term))) {
    const key = `${row.offeringCount}/${row.usualSections}`;
    const group = groups.get(key) ?? { terms: [], count: row.offeringCount, usual: row.usualSections };
    group.terms.push(row.term);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/**
 * Chronological slots from the first to the last imported term. Regular semesters (1 and 2) missing in
 * between become empty slots so the x axis keeps its time scale; summer terms only appear when imported.
 */
export function historySlots(rows: readonly HistoryRow[]): HistorySlot[] {
  const byTerm = new Map(rows.map((row) => [row.term, row]));
  const parsed = rows.map((row) => parseTerm(row.term));
  if (parsed.some((term) => term === null)) {
    return [...rows].sort((a, b) => compareTerms(a.term, b.term)).map((row) => ({ term: row.term, row }));
  }
  const years = parsed.map((term) => term!.year);
  const first = Math.min(...years);
  const last = Math.max(...years);
  const slots: HistorySlot[] = [];
  for (let year = first; year <= last; year += 1) {
    const semesters = new Set([1, 2]);
    for (const term of parsed) if (term!.year === year) semesters.add(term!.semester);
    for (const semester of [...semesters].sort((a, b) => a - b)) {
      const term = `${year}-${semester}`;
      slots.push({ term, row: byTerm.get(term) ?? null });
    }
  }
  // Trim the regular semesters padded before the first and after the last imported term.
  while (slots.length && !slots[0].row) slots.shift();
  while (slots.length && !slots.at(-1)!.row) slots.pop();
  return slots;
}

export function fillRatio(enrolled: number | null | undefined, capacity: number | null | undefined) {
  return enrolled != null && capacity != null && capacity > 0 ? enrolled / capacity : null;
}

/** Enrolment at or above 90% of capacity is drawn in the warning colour. */
export const nearlyFull = 0.9;
