import { catalogClient } from '@unicourse/api-client';
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

/** The API's session cookie. The browser only ever talks to the web app, which relays it. */
export const SESSION_COOKIE = 'uc_session';

function apiOrigin() {
  return new URL(env.API_ORIGIN ?? 'http://127.0.0.1:3001').origin;
}

export function catalog(fetch: typeof globalThis.fetch) {
  return catalogClient(apiOrigin(), fetch);
}

type CookieOptions = Parameters<Cookies['set']>[2];

/**
 * Copies an API `Set-Cookie` for the session onto the web response with the same attributes
 * (HttpOnly, SameSite, Path, Max-Age, Secure). Other cookies and `Domain` are ignored: the
 * browser only sees the web origin.
 */
function relaySetCookie(cookies: Cookies, header: string) {
  const [pair, ...attributes] = header.split(';');
  const separator = pair.indexOf('=');
  if (separator < 0) return;
  const name = pair.slice(0, separator).trim();
  const value = pair.slice(separator + 1).trim();
  if (name !== SESSION_COOKIE) return;

  const options: CookieOptions = { path: '/', httpOnly: false, secure: false };
  for (const attribute of attributes) {
    const [rawKey, ...rest] = attribute.split('=');
    const key = rawKey.trim().toLowerCase();
    const attributeValue = rest.join('=').trim();
    if (key === 'httponly') options.httpOnly = true;
    else if (key === 'secure') options.secure = true;
    else if (key === 'path') options.path = attributeValue || '/';
    else if (key === 'max-age') options.maxAge = Number(attributeValue);
    else if (key === 'expires') options.expires = new Date(attributeValue);
    else if (key === 'samesite') {
      const sameSite = attributeValue.toLowerCase();
      if (sameSite === 'lax' || sameSite === 'strict' || sameSite === 'none') options.sameSite = sameSite;
    }
  }
  // The token is base64url, so it needs no encoding.
  cookies.set(name, value, { ...options, encode: (raw: string) => raw });
}

/**
 * `handleFetch` for server-side calls to the API: sends the visitor's session cookie (and only
 * that cookie) and relays session `Set-Cookie` headers from login, register and logout back to
 * the browser. Other requests pass through untouched.
 */
export async function relayApiFetch(
  event: Pick<RequestEvent, 'cookies'>,
  request: Request,
  fetch: typeof globalThis.fetch
) {
  if (new URL(request.url).origin !== apiOrigin()) return fetch(request);

  // SvelteKit builds a fresh, mutable Request for every server-side fetch.
  const session = event.cookies.get(SESSION_COOKIE);
  if (session) request.headers.set('cookie', `${SESSION_COOKIE}=${session}`);
  else request.headers.delete('cookie');
  const response = await fetch(request);

  for (const header of response.headers.getSetCookie()) relaySetCookie(event.cookies, header);
  return response;
}

/** Forgets a session the API no longer accepts (or that could not be ended there). */
export function clearSession(event: Pick<RequestEvent, 'cookies' | 'url'>) {
  event.cookies.delete(SESSION_COOKIE, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: event.url.protocol === 'https:'
  });
}
