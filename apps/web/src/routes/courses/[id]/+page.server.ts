import { error, fail } from '@sveltejs/kit';
import { UNAVAILABLE, apiMessage } from '$lib/community-messages';
import { catalog } from '$lib/server/catalog';
import { field, requireUser } from '$lib/server/community-forms';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

async function loadCourse(fetch: typeof globalThis.fetch, id: string) {
  const result = await catalog(fetch)
    .GET('/api/courses/{id}', { params: { path: { id } } })
    .catch(() => error(503, '暫時無法查詢課程，請稍後再試。'));
  if (result.response.status === 404) error(404, '找不到這門課。');
  if (!result.data) error(503, '暫時無法查詢課程，請稍後再試。');
  return result.data;
}

/** Ratings belong to the cross-term course; a failure here must not take the offering page down. */
async function loadRatings(fetch: typeof globalThis.fetch, school: string, courseCode: string, signedIn: boolean) {
  const client = catalog(fetch);
  const path = { params: { path: { school, courseCode } } };
  try {
    const [stats, list, mine] = await Promise.all([
      client.GET('/api/courses/{school}/{courseCode}/ratings/stats', path),
      client.GET('/api/courses/{school}/{courseCode}/ratings', path),
      // 404 here means "not rated yet" (the course itself exists, `stats` would 404 otherwise).
      signedIn ? client.GET('/api/courses/{school}/{courseCode}/ratings/me', path) : undefined
    ]);
    if (!stats.data || !list.data) return undefined;
    return { stats: stats.data, list: list.data, mine: mine?.data ?? null };
  } catch {
    return undefined;
  }
}

export const load: PageServerLoad = async ({ fetch, params, locals }) => {
  const course = await loadCourse(fetch, params.id);
  const ratings = await loadRatings(fetch, course.school, course.courseCode, locals.user != null);
  return { course, ratings };
};

async function courseKey(event: RequestEvent) {
  requireUser(event, `${event.url.pathname}#ratings`);
  const course = await loadCourse(event.fetch, event.params.id);
  return { params: { path: { school: course.school, courseCode: course.courseCode } } };
}

export const actions: Actions = {
  rate: async (event) => {
    const path = await courseKey(event);
    const form = await event.request.formData();
    const score = Number(field(form, 'score'));
    const review = field(form, 'review');
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return fail(400, { action: 'rate', review, message: '請選擇 1 到 5 分。' });
    }
    const result = await catalog(event.fetch)
      .PUT('/api/courses/{school}/{courseCode}/ratings/me', { ...path, body: { score, review: review.trim() || null } })
      .catch(() => undefined);
    if (!result) return fail(503, { action: 'rate', review, message: UNAVAILABLE });
    if (!result.data) return fail(result.response.status, { action: 'rate', review, message: apiMessage(result.error) });
    return { action: 'rate', saved: true };
  },

  unrate: async (event) => {
    const path = await courseKey(event);
    const result = await catalog(event.fetch)
      .DELETE('/api/courses/{school}/{courseCode}/ratings/me', path)
      .catch(() => undefined);
    if (!result) return fail(503, { action: 'unrate', message: UNAVAILABLE });
    if (!result.response.ok) return fail(result.response.status, { action: 'unrate', message: apiMessage(result.error) });
    return { action: 'unrate', removed: true };
  }
};
