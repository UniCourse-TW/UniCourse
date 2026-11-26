import { error } from '@sveltejs/kit';
import { catalog } from '$lib/server/catalog';
import type { PageServerLoad } from './$types';

const UNAVAILABLE = '暫時無法載入學校資料，請稍後再試。';

export const load: PageServerLoad = async ({ fetch, params }) => {
  const result = await catalog(fetch)
    .GET('/api/schools/{school}', { params: { path: { school: params.school } } })
    .catch(() => error(503, UNAVAILABLE));

  if (result.response.status === 404) error(404, '找不到這所學校。');
  if (!result.data) error(503, UNAVAILABLE);
  return { school: result.data };
};
