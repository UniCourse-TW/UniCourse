import type { Handle, HandleFetch } from '@sveltejs/kit';
import { SESSION_COOKIE, catalog, clearSession, relayApiFetch } from '$lib/server/catalog';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = null;
  if (event.cookies.get(SESSION_COOKIE)) {
    try {
      const me = await catalog(event.fetch).GET('/api/auth/me');
      if (me.data) event.locals.user = me.data;
      else if (me.response.status === 401) clearSession(event);
    } catch {
      // API unreachable: render signed out; catalog pages report the outage themselves.
    }
  }
  return resolve(event);
};

export const handleFetch: HandleFetch = ({ event, request, fetch }) => relayApiFetch(event, request, fetch);
