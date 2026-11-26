import { error } from '@sveltejs/kit';
import { catalog } from '$lib/server/catalog';
import type { PageServerLoad } from './$types';

const UNAVAILABLE = '暫時無法載入教師資料，請稍後再試。';

export const load: PageServerLoad = async ({ fetch, params }) => {
  const result = await catalog(fetch)
    .GET('/api/instructors/{school}/{name}', { params: { path: { school: params.school, name: params.name } } })
    .catch(() => error(503, UNAVAILABLE));

  if (result.response.status === 404) error(404, '找不到這位教師。');
  if (!result.data) error(503, UNAVAILABLE);
  return { instructor: result.data };
};
