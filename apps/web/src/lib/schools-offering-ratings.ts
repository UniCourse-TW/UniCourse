import type { Offering } from '@unicourse/api-client';
import type { catalog } from './server/catalog';

export async function browseRatings(client: ReturnType<typeof catalog>, school: string, offerings: Offering[]) {
  const codes = [...new Set(offerings.map(({ courseCode }) => courseCode))].slice(0, 10);
  return new Map(await Promise.all(codes.map(async (courseCode) => {
    const result = await client.GET('/api/courses/{school}/{courseCode}/ratings/stats', { params: { path: { school, courseCode } } }).catch(() => null);
    return [courseCode, result?.data ?? null] as const;
  })));
}
