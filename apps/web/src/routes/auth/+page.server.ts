import { fail, redirect } from '@sveltejs/kit';
import { apiMessage } from '$lib/community-messages';
import { safeNext } from '$lib/community-paths';
import { catalog, clearSession } from '$lib/server/catalog';
import { field } from '$lib/server/community-forms';
import type { Actions, PageServerLoad } from './$types';

/** The API refuses a username after 10 failed attempts in a minute; it does not say how long is left. */
const LOCKOUT_SECONDS = 60;
const LOGIN_TIMEOUT_MS = 15_000;

export const load: PageServerLoad = async ({ fetch, locals, url }) => {
  const next = safeNext(url.searchParams.get('next'));
  const mode = url.searchParams.get('mode') === 'register' ? 'register' : 'login';
  // A name handed over from the register tab (the name was taken, so sign in with it instead).
  const handed = url.searchParams.get('username') ?? '';
  const prefill = /^[A-Za-z0-9_]{3,32}$/.test(handed) ? handed : '';
  const signedIn = locals.user ? { username: locals.user.username, displayName: locals.user.displayName } : null;
  // The signed-in card shows what the account has done so far (counts only; the profile has the list).
  const activity = signedIn ? await activityOf(fetch, signedIn.username) : null;
  return { mode, next, prefill, signedIn, activity } as const;
};

async function activityOf(fetch: typeof globalThis.fetch, username: string) {
  const profile = await catalog(fetch)
    .GET('/api/users/{username}', { params: { path: { username } } })
    .catch(() => undefined);
  if (!profile?.data) return null;
  return { ratings: profile.data.ratings.length, posts: profile.data.posts.length };
}

export const actions: Actions = {
  login: async ({ fetch, request }) => {
    const form = await request.formData();
    const username = field(form, 'username').trim();
    const password = field(form, 'password');
    const next = safeNext(field(form, 'next'));
    if (!username || !password) return fail(400, { mode: 'login', username, message: '請輸入帳號與密碼。' });

    const result = await catalog(fetch)
      .POST('/api/auth/login', { body: { username, password }, signal: AbortSignal.timeout(LOGIN_TIMEOUT_MS) })
      .catch(() => undefined);
    if (!result) return fail(503, { mode: 'login', username, message: apiMessage(undefined) });
    if (!result.data) {
      const status = result.response.status;
      // The lockout window starts at the refusal; the page counts down from here.
      const locked = status === 429 ? { lockedAt: Date.now(), retryAfter: LOCKOUT_SECONDS } : {};
      return fail(status, { mode: 'login', username, message: apiMessage(result.error), ...locked });
    }
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
    // 「登出，改用其他帳號」 comes back to the sign-in form; every other sign-out lands on the home page.
    const next = safeNext(field(await event.request.formData().catch(() => new FormData()), 'next'));
    redirect(303, next);
  }
};
