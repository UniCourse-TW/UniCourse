import { error } from '@sveltejs/kit';
import { UNAVAILABLE } from '$lib/community-messages';
import { catalog } from '$lib/server/catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, params }) => {
  const client = catalog(fetch);
  const [profile, schools] = await Promise.all([
    client.GET('/api/users/{username}', { params: { path: { username: params.username } } }),
    client.GET('/api/schools')
  ]).catch(() => error(503, UNAVAILABLE));
  if (profile.response.status === 404) error(404, '找不到這位使用者。');
  if (!profile.data) error(503, UNAVAILABLE);
  const schoolNames = Object.fromEntries((schools.data ?? []).map((school) => [school.slug, school.name]));
  return { profile: profile.data, schoolNames };
};
