import { fail, redirect } from '@sveltejs/kit';
import { apiMessage } from '$lib/community-messages';
import { safeNext } from '$lib/community-paths';
import { catalog, clearSession } from '$lib/server/catalog';
import { field } from '$lib/server/community-forms';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
  const next = safeNext(url.searchParams.get('next'));
  const mode = url.searchParams.get('mode') === 'register' ? 'register' : 'login';
  // Signed in and sent here by an action (`next` given): straight on. Signed in and here by
  // hand: say who is signed in and offer the ways on, instead of a silent bounce to the home page.
  if (locals.user && url.searchParams.has('next')) redirect(303, next);
  const signedIn = locals.user ? { username: locals.user.username, displayName: locals.user.displayName } : null;
  return { mode, next, signedIn } as const;
};

export const actions: Actions = {
  login: async ({ fetch, request }) => {
    const form = await request.formData();
    const username = field(form, 'username').trim();
    const password = field(form, 'password');
    const next = safeNext(field(form, 'next'));
    if (!username || !password) return fail(400, { mode: 'login', username, message: '請輸入帳號與密碼。' });

    const result = await catalog(fetch)
      .POST('/api/auth/login', { body: { username, password } })
      .catch(() => undefined);
    if (!result) return fail(503, { mode: 'login', username, message: apiMessage(undefined) });
    if (!result.data) return fail(result.response.status, { mode: 'login', username, message: apiMessage(result.error) });
    // `relayApiFetch` has already copied the session cookie onto this response.
    redirect(303, next);
  },

  register: async ({ fetch, request }) => {
    const form = await request.formData();
    const username = field(form, 'username').trim();
    const password = field(form, 'password');
    const displayName = field(form, 'displayName').trim();
    const next = safeNext(field(form, 'next'));
    const values = { mode: 'register', username, displayName };

    const result = await catalog(fetch)
      .POST('/api/auth/register', { body: { username, password, displayName: displayName || null } })
      .catch(() => undefined);
    if (!result) return fail(503, { ...values, message: apiMessage(undefined) });
    if (!result.data) return fail(result.response.status, { ...values, message: apiMessage(result.error) });
    redirect(303, next);
  },

  logout: async (event) => {
    // The API clears the cookie with its own Set-Cookie; clear it here too in case it is down.
    await catalog(event.fetch).POST('/api/auth/logout').catch(() => undefined);
    clearSession(event);
    redirect(303, '/');
  }
};
