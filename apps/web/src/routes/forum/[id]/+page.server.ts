import { error, fail, redirect } from '@sveltejs/kit';
import { UNAVAILABLE, apiMessage } from '$lib/community-messages';
import { catalog } from '$lib/server/catalog';
import { field, requireUser } from '$lib/server/community-forms';
import type { Actions, PageServerLoad } from './$types';

const NOT_FOUND = '找不到這篇文章，可能已被刪除。';

export const load: PageServerLoad = async ({ fetch, params }) => {
  if (!/^\d{1,18}$/.test(params.id)) error(404, NOT_FOUND);
  const client = catalog(fetch);
  const [post, schools] = await Promise.all([
    client.GET('/api/posts/{id}', { params: { path: { id: Number(params.id) } } }),
    client.GET('/api/schools')
  ]).catch(() => error(503, UNAVAILABLE));
  // Soft-deleted threads are a 404 from the API as well.
  if (post.response.status === 404) error(404, NOT_FOUND);
  if (!post.data) error(503, UNAVAILABLE);
  const schoolNames = Object.fromEntries((schools.data ?? []).map((school) => [school.slug, school.name]));
  return { post: post.data, schoolNames, course: await courseContext(client, post.data) };
};

/**
 * The 這門課 card: the newest offering of the thread's course, its rating summary and other
 * threads about it. `null` when the thread names no course; `offering: null` when the code is
 * not in the catalog (the page then shows the code as text only). Failures degrade quietly.
 */
async function courseContext(client: ReturnType<typeof catalog>, post: { id: number; school?: string | null; courseCode?: string | null }) {
  const { school, courseCode } = post;
  if (!school || !courseCode) return null;
  const [offerings, stats, threads] = await Promise.all([
    client.GET('/api/courses', { params: { query: { school, q: courseCode } } }).then((r) => r.data).catch(() => undefined),
    client
      .GET('/api/courses/{school}/{courseCode}/ratings/stats', { params: { path: { school, courseCode } } })
      .then((r) => r.data)
      .catch(() => undefined),
    client.GET('/api/posts', { params: { query: { school, courseCode } } }).then((r) => r.data).catch(() => undefined)
  ]);
  const matches = (offerings ?? [])
    .filter((offering) => offering.courseCode.toLowerCase() === courseCode.toLowerCase())
    .sort((a, b) => b.term.localeCompare(a.term, 'en', { numeric: true }));
  const others = (threads?.posts ?? []).filter((other) => other.id !== post.id);
  return {
    offering: matches[0] ?? null,
    terms: new Set(matches.map((offering) => offering.term)).size,
    rating: stats ?? null,
    others: others.slice(0, 4).map(({ id, title, type, replyCount }) => ({ id, title, type, replyCount })),
    otherCount: threads ? Math.max(0, threads.total - 1) : others.length
  };
}

/** The post or reply a form acts on (`target`), defaulting to the thread itself. */
function target(form: FormData, threadId: string) {
  const raw = field(form, 'target') || threadId;
  return /^\d{1,18}$/.test(raw) ? Number(raw) : undefined;
}

export const actions: Actions = {
  vote: async (event) => {
    requireUser(event);
    const form = await event.request.formData();
    const id = target(form, event.params.id);
    const value = Number(field(form, 'value'));
    if (id === undefined || ![-1, 0, 1].includes(value)) return fail(400, { action: 'vote', target: id, message: '投票內容有誤。' });
    const result = await catalog(event.fetch)
      .PUT('/api/posts/{id}/vote', { params: { path: { id } }, body: { value } })
      .catch(() => undefined);
    if (!result) return fail(503, { action: 'vote', target: id, message: UNAVAILABLE });
    if (!result.data) return fail(result.response.status, { action: 'vote', target: id, message: apiMessage(result.error) });
    return { action: 'vote', target: id };
  },

  reply: async (event) => {
    requireUser(event);
    const form = await event.request.formData();
    const content = field(form, 'content');
    const result = await catalog(event.fetch)
      .POST('/api/posts/{id}/replies', { params: { path: { id: Number(event.params.id) } }, body: { content } })
      .catch(() => undefined);
    if (!result) return fail(503, { action: 'reply', content, message: UNAVAILABLE });
    if (!result.data) return fail(result.response.status, { action: 'reply', content, message: apiMessage(result.error) });
    return { action: 'reply', replied: result.data.id };
  },

  edit: async (event) => {
    requireUser(event);
    const form = await event.request.formData();
    const id = target(form, event.params.id);
    const content = field(form, 'content');
    const title = form.has('title') ? field(form, 'title') : undefined;
    if (id === undefined) return fail(400, { action: 'edit', target: id, content, title, message: NOT_FOUND });
    const result = await catalog(event.fetch)
      .PATCH('/api/posts/{id}', { params: { path: { id } }, body: { content, title } })
      .catch(() => undefined);
    if (!result) return fail(503, { action: 'edit', target: id, content, title, message: UNAVAILABLE });
    if (!result.response.ok) {
      return fail(result.response.status, { action: 'edit', target: id, content, title, message: apiMessage(result.error) });
    }
    return { action: 'edit', target: id, saved: true };
  },

  delete: async (event) => {
    requireUser(event);
    const form = await event.request.formData();
    const id = target(form, event.params.id);
    if (id === undefined) return fail(400, { action: 'delete', target: id, message: NOT_FOUND });
    const result = await catalog(event.fetch)
      .DELETE('/api/posts/{id}', { params: { path: { id } } })
      .catch(() => undefined);
    if (!result) return fail(503, { action: 'delete', target: id, message: UNAVAILABLE });
    if (!result.response.ok) return fail(result.response.status, { action: 'delete', target: id, message: apiMessage(result.error) });
    // Deleting the thread hides it (and its replies); deleting a reply keeps the thread.
    if (String(id) === event.params.id) redirect(303, '/forum');
    return { action: 'delete', target: id };
  }
};
