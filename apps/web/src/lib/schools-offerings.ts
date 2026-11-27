import type { Offering, RatingStats, TermTrend } from '@unicourse/api-client';
import type { MatrixPoint, MatrixRow } from './ui/types';

export function reportedCapacity({ enrolled, capacity }: Pick<Offering, 'enrolled' | 'capacity'>) {
  return capacity === 0 && enrolled != null && enrolled > 0 ? null : capacity ?? null;
}

export function offeringEdition(offerings: Offering[]) {
  return offerings.reduce<string | null>((latest, row) => !latest || row.importedAt > latest ? row.importedAt : latest, null);
}

export function publishedEnrollment(trends: TermTrend[] | null) {
  const known = trends?.flatMap(({ enrolled }) => enrolled == null ? [] : [enrolled]);
  return known?.length ? known.reduce((total, count) => total + count, 0) : null;
}

export function buildTeachingMatrix(offerings: Offering[]) {
  const courses = new Map<string, { row: MatrixRow; points: Record<string, MatrixPoint>; total: number; latestYear: number }>();
  const years = new Set<number>();

  for (const course of offerings) {
    const term = course.term.match(/^(\d+)-/);
    if (!term) continue;
    const year = Number(term[1]);
    years.add(year);
    let entry = courses.get(course.courseCode);
    if (!entry) {
      const points: Record<string, MatrixPoint> = {};
      entry = { row: { id: course.courseCode, label: course.title, points }, points, total: 0, latestYear: year };
      courses.set(course.courseCode, entry);
    }
    const point = entry.points[year] ?? { offerings: 0, enrolled: null, href: `/courses/${course.id}` };
    point.offerings += 1;
    if (course.enrolled != null) point.enrolled = (point.enrolled ?? 0) + course.enrolled;
    entry.points[year] = point;
    entry.total += 1;
    entry.latestYear = Math.max(entry.latestYear, year);
  }

  const orderedYears = [...years].sort((left, right) => left - right);
  const first = orderedYears[0];
  const last = orderedYears.at(-1);
  const periods = last != null ? Array.from({ length: last - first + 1 }, (_, index) => String(first + index)) : [];
  const rows = [...courses.values()]
    .sort((left, right) => right.latestYear - left.latestYear || right.total - left.total || left.row.id.localeCompare(right.row.id))
    .map(({ row }) => row);
  return { rows, periods };
}

export function meanRating(stats: ReadonlyMap<string, RatingStats | null>) {
  let count = 0;
  let total = 0;
  for (const rating of stats.values()) {
    if (rating?.average == null) continue;
    count += rating.count;
    total += rating.average * rating.count;
  }
  return { count, mean: count ? (total / count).toFixed(1) : null };
}
