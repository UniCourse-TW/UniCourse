import { error, fail, redirect } from '@sveltejs/kit';
import { parseTags } from '$lib/community-format';
import { UNAVAILABLE, apiMessage } from '$lib/community-messages';
import { postHref, type ForumFilters } from '$lib/community-paths';
import type { PostType } from '$lib/community-types';
import { catalog } from '$lib/server/catalog';
import { courseTitles } from '$lib/server/community-course-titles';
import { field, requireUser } from '$lib/server/community-forms';
import type { Actions, PageServerLoad } from './$types';

type ListType = Exclude<PostType, 'reply'>;
const listTypes: ListType[] = ['announcement', 'article', 'question'];

function listType(raw: string | null): ListType | '' {
  return listTypes.find((type) => type === raw) ?? '';
}

export const load: PageServerLoad = async ({ fetch, url, locals }) => {
  const page = Number(url.searchParams.get('page') ?? '1');
  const filters = {
    type: listType(url.searchParams.get('type')),
    school: url.searchParams.get('school')?.trim() ?? '',
    courseCode: url.searchParams.get('courseCode')?.trim() ?? '',
    q: url.searchParams.get('q')?.trim() ?? '',
    tag: url.searchParams.get('tag')?.trim() ?? '',
    page: Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1
  } satisfies ForumFilters;
  if (!filters.school) filters.courseCode = '';

  const client = catalog(fetch);
  const query = {
    school: filters.school || undefined,
    courseCode: filters.courseCode || undefined,
    q: filters.q || undefined,
    tag: filters.tag || undefined
  };
  // Per-type totals for the category chips: the same filters without the type. The API has no
  // facet endpoint, so these are first-page requests whose `total` is all we read.
  const totals = () =>
    Promise.all(
      (['', ...listTypes] as const).map((type) =>
        client
          .GET('/api/posts', { params: { query: { ...query, type: type || undefined } } })
          .then((result) => result.data)
          .catch(() => undefined)
      )
    );
  const [posts, schools, counts] = await Promise.all([
    client.GET('/api/posts', { params: { query: { ...query, type: filters.type || undefined, page: filters.page } } }),
    client.GET('/api/schools'),
    totals()
  ]).catch(() => error(503, UNAVAILABLE));
  if (posts.response.status === 400) error(400, apiMessage(posts.error));
  if (!posts.data || !schools.data) error(503, UNAVAILABLE);
  const [all, ...byType] = counts;
  // A young forum suggests a few well-attended courses to write about: the signed-in reader's own
  // school first (someone at 臺大 has no use for 逢甲's general course), otherwise one per school so
  // the list is not three sections of the same general course.
  const young = (all?.total ?? 0) <= 5 && !filters.type && !query.school && !query.q && !query.tag;
  const rank = (school?: string) =>
    client
      .GET('/api/rankings/courses', { params: { query: { limit: school ? 3 : 30, academic: true, school } } })
      .then((result) => result.data ?? [])
      .catch(() => []);
  const ownSchool = young ? (locals.user?.school ?? undefined) : undefined;
  const mine = ownSchool ? await rank(ownSchool) : [];
  const ranked = !young ? [] : mine.length ? mine : await rank();
  const titles = await courseTitles(fetch, posts.data.posts);
  const seen = new Set<string>();
  const suggestions = (mine.length ? ranked : ranked.filter((entry) => !seen.has(entry.school) && seen.add(entry.school)))
    .slice(0, 3)
    .map((entry) => ({
      school: entry.school,
      schoolName: entry.schoolName,
      courseCode: entry.courseCode,
      title: entry.title,
      offeringId: entry.latestActiveOfferingId ?? entry.latestOfferingId ?? null,
      enrolledTotal: entry.enrolledTotal ?? null,
      terms: entry.terms
    }));
  return {
    courseTitles: titles,
    suggestions,
    /** The suggestions come from the reader's own school (named in the heading). */
    suggestionsSchool: mine.length ? (mine[0].schoolName ?? null) : null,
    filters,
    compose: url.searchParams.get('compose') === '1',
    posts: posts.data,
    schools: schools.data,
    // `null` when a count request failed: the chip then shows no number rather than 0.
    counts: {
      all: all?.total ?? null,
      ...Object.fromEntries(listTypes.map((type, index) => [type, byType[index]?.total ?? null]))
    } as Record<'all' | ListType, number | null>,
    latest: all?.posts[0]?.createdAt ?? null
  };
};

export const actions: Actions = {
  /** Looks a course code up for the compose form ("→ 資料結構 ✓"); called with `fetch` from the page. */
  checkCourse: async ({ fetch, request }) => {
    const form = await request.formData();
    const school = field(form, 'school').trim();
    const courseCode = field(form, 'courseCode').trim();
    if (!school || !courseCode || courseCode.length > 100) return { found: null };
    const result = await catalog(fetch)
      .GET('/api/courses', { params: { query: { school, q: courseCode } } })
      .catch(() => undefined);
    if (!result?.data) return { found: null, unavailable: true };
    const match = result.data.find((offering) => offering.courseCode.toLowerCase() === courseCode.toLowerCase());
    return { found: match ? { title: match.title, courseCode: match.courseCode, term: match.term } : false };
  },

  create: async (event) => {
    const user = requireUser(event);
    const form = await event.request.formData();
    const values = {
      type: field(form, 'type'),
      title: field(form, 'title'),
      content: field(form, 'content'),
      school: field(form, 'school').trim(),
      courseCode: field(form, 'courseCode').trim(),
      tags: field(form, 'tags')
    };
    const type = listType(values.type);
    if (!type || (type === 'announcement' && !user.isAdmin)) {
      return fail(400, { ...values, message: '請選擇文章類型。' });
    }
    const tags = parseTags(values.tags);
    if (tags.length > 5) return fail(400, { ...values, message: '最多 5 個標籤。' });

    const result = await catalog(event.fetch)
      .POST('/api/posts', {
        body: {
          type,
          title: values.title,
          content: values.content,
          school: values.school || null,
          courseCode: values.courseCode || null,
          tags
        }
      })
      .catch(() => undefined);
    if (!result) return fail(503, { ...values, message: UNAVAILABLE });
    if (!result.data) return fail(result.response.status, { ...values, message: apiMessage(result.error) });
    redirect(303, postHref(result.data.id));
  }
};
