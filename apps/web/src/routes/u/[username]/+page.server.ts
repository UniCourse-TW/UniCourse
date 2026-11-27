import { error } from '@sveltejs/kit';
import { UNAVAILABLE } from '$lib/community-messages';
import { catalog } from '$lib/server/catalog';
import { courseTitles } from '$lib/server/community-course-titles';
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
  // Rated courses already carry their titles; only posts on other courses need a lookup.
  const known = Object.fromEntries(profile.data.ratings.filter((rating) => rating.title).map((rating) => [`${rating.school}/${rating.courseCode}`, rating.title as string]));
  const missing = profile.data.posts.filter((post) => post.school && post.courseCode && !known[`${post.school}/${post.courseCode}`]);
  return { profile: profile.data, schoolNames, courseTitles: { ...known, ...(await courseTitles(fetch, missing)) } };
};
