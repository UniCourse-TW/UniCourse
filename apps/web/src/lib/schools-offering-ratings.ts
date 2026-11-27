import type { Offering, RatingStats } from '@unicourse/api-client';
import type { catalog } from './server/catalog';

export async function browseRatings(client: ReturnType<typeof catalog>, school: string, offerings: Offering[]) {
  const codes = [...new Set(offerings.map(({ courseCode }) => courseCode))];
  const ratings = new Map<string, RatingStats | null>(codes.map((code) => [code, null]));
  const batches: string[][] = [];
  for (let start = 0; start < codes.length; start += 200) batches.push(codes.slice(start, start + 200));
  await Promise.all(batches.map(async (batch) => {
    const courses = batch.map((code) => `${school}:${code.replace(/[\\,]/g, '\\$&')}`).join(',');
    const result = await client.GET('/api/ratings/stats', { params: { query: { courses } } }).catch(() => null);
    for (const row of result?.data ?? []) ratings.set(row.courseCode, row.stats);
  }));
  return ratings;
}
