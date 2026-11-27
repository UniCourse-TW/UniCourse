import { catalog } from '$lib/server/catalog';
import { courseKey } from '$lib/community-format';

/** Distinct courses looked up per page; a forum page lists at most 20 posts. */
const MAX_COURSES = 20;

/**
 * Course titles for the posts' linked courses, keyed `school/courseCode`, so post rows can name the
 * course once (「公民參與 GBCP101」) and drop the same name from the start of the title. A course whose
 * lookup fails is left out; its row falls back to the code alone.
 */
export async function courseTitles(
  fetch: typeof globalThis.fetch,
  posts: readonly { school?: string | null; courseCode?: string | null }[]
): Promise<Record<string, string>> {
  const wanted = new Map<string, { school: string; courseCode: string }>();
  for (const post of posts) {
    if (post.school && post.courseCode) wanted.set(courseKey(post.school, post.courseCode), { school: post.school, courseCode: post.courseCode });
  }
  const client = catalog(fetch);
  const found = await Promise.all(
    [...wanted].slice(0, MAX_COURSES).map(async ([key, { school, courseCode }]) => {
      try {
        const result = await client.GET('/api/courses', { params: { query: { school, q: courseCode } } });
        const match = result.data?.find((offering) => offering.courseCode.toLowerCase() === courseCode.toLowerCase());
        return match ? ([key, match.title] as const) : undefined;
      } catch {
        return undefined;
      }
    })
  );
  return Object.fromEntries(found.filter((entry) => entry !== undefined));
}
