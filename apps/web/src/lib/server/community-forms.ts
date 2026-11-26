import { redirect, type RequestEvent } from '@sveltejs/kit';
import { loginHref } from '$lib/community-paths';

/** A text field from a submitted form ('' when missing or a file). */
export function field(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

/** The signed-in user, or a redirect to the sign-in page that returns to `next`. */
export function requireUser(event: Pick<RequestEvent, 'locals' | 'url'>, next = event.url.pathname + event.url.search) {
  if (!event.locals.user) redirect(303, loginHref(next));
  return event.locals.user;
}
