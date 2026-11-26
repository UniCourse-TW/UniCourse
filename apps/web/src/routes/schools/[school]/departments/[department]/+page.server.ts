import { error } from '@sveltejs/kit';
import { catalog } from '$lib/server/catalog';
import type { PageServerLoad } from './$types';

const UNAVAILABLE = '暫時無法載入開課單位，請稍後再試。';

export const load: PageServerLoad = async ({ fetch, params }) => {
  const result = await catalog(fetch)
    .GET('/api/schools/{school}/departments/{department}', {
      params: { path: { school: params.school, department: params.department } }
    })
    .catch(() => error(503, UNAVAILABLE));

  if (result.response.status === 404) error(404, '找不到這個開課單位。');
  if (!result.data) error(503, UNAVAILABLE);
  return { department: result.data };
};
