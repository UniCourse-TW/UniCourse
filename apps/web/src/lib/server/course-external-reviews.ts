import { catalog } from '$lib/server/catalog';

/** Indexed posts and outbound links from other sites; like ratings, a failure only hides that section. */
export async function loadCourseExternalReviews(fetch: typeof globalThis.fetch, school: string, courseCode: string) {
  try {
    const result = await catalog(fetch).GET('/api/courses/{school}/{courseCode}/external-reviews', {
      params: { path: { school, courseCode } }
    });
    return result.data;
  } catch {
    return undefined;
  }
}
