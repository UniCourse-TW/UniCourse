import { error, fail, redirect } from '@sveltejs/kit';
import { parseTags } from '$lib/community-format';
import { UNAVAILABLE, apiMessage } from '$lib/community-messages';
import { postHref, type ForumFilters } from '$lib/community-paths';
import type { PostType } from '$lib/community-types';
import { catalog } from '$lib/server/catalog';
import { field, requireUser } from '$lib/server/community-forms';
import type { Actions, PageServerLoad } from './$types';

type ListType = Exclude<PostType, 'reply'>;
const listTypes: ListType[] = ['announcement', 'article', 'question'];

function listType(raw: string | null): ListType | '' {
  return listTypes.find((type) => type === raw) ?? '';
}

export const load: PageServerLoad = async ({ fetch, url }) => {
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
  const [posts, schools] = await Promise.all([
    client.GET('/api/posts', {
      params: {
        query: {
          type: filters.type || undefined,
          school: filters.school || undefined,
          courseCode: filters.courseCode || undefined,
          q: filters.q || undefined,
          tag: filters.tag || undefined,
          page: filters.page
        }
      }
    }),
    client.GET('/api/schools')
  ]).catch(() => error(503, UNAVAILABLE));
  if (posts.response.status === 400) error(400, apiMessage(posts.error));
  if (!posts.data || !schools.data) error(503, UNAVAILABLE);
  return { filters, posts: posts.data, schools: schools.data };
};

export const actions: Actions = {
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
