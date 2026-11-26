import { error, fail } from '@sveltejs/kit';
import { UNAVAILABLE, apiMessage } from '$lib/community-messages';
import { catalog } from '$lib/server/catalog';
import { field, requireUser } from '$lib/server/community-forms';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  const schools = await catalog(event.fetch).GET('/api/schools').catch(() => error(503, UNAVAILABLE));
  if (!schools.data) error(503, UNAVAILABLE);
  return { profile: user, schools: schools.data };
};

export const actions: Actions = {
  default: async (event) => {
    requireUser(event);
    const form = await event.request.formData();
    const values = {
      displayName: field(form, 'displayName').trim(),
      bio: field(form, 'bio').trim(),
      school: field(form, 'school')
    };
    // Empty strings clear a field (the API treats '' like null).
    const result = await catalog(event.fetch)
      .PATCH('/api/auth/me', { body: values })
      .catch(() => undefined);
    if (!result) return fail(503, { ...values, message: UNAVAILABLE });
    if (!result.data) return fail(result.response.status, { ...values, message: apiMessage(result.error) });
    return { saved: true };
  }
};
