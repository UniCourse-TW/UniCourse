import type { PostType } from '$lib/community-types';

/** `raw` when it is a same-origin path (`/x`, not `//host` or `/\host`), else `fallback`. */
export function safeNext(raw: string | null | undefined, fallback = '/') {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  try {
    const base = 'http://unicourse.invalid';
    const url = new URL(raw, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/** The sign-in page, returning to `next` afterwards. */
export function loginHref(next: string, mode: 'login' | 'register' = 'login') {
  const params = new URLSearchParams();
  if (mode === 'register') params.set('mode', 'register');
  const target = safeNext(next, '');
  if (target && !target.startsWith('/auth')) params.set('next', target);
  const query = params.toString();
  return query ? `/auth?${query}` : '/auth';
}

export function profileHref(username: string) {
  return `/u/${encodeURIComponent(username)}`;
}

/** Profiles carry no offering ID, so a course links to an all-terms search for its code. */
export function courseSearchHref(school: string, courseCode: string) {
  return `/?${new URLSearchParams({ q: courseCode, school, term: 'all' })}`;
}

export function instructorHref(school: string, name: string) {
  return `/instructors/${encodeURIComponent(school)}/${encodeURIComponent(name)}`;
}

export function departmentHref(school: string, department: string) {
  return `/schools/${encodeURIComponent(school)}/departments/${encodeURIComponent(department)}`;
}

export interface ForumFilters {
  type?: Exclude<PostType, 'reply'> | '';
  school?: string;
  courseCode?: string;
  q?: string;
  tag?: string;
  page?: number;
}

export function forumHref(filters: ForumFilters = {}) {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.school) params.set('school', filters.school);
  if (filters.school && filters.courseCode) params.set('courseCode', filters.courseCode);
  if (filters.q) params.set('q', filters.q);
  if (filters.tag) params.set('tag', filters.tag);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  const query = params.toString();
  return query ? `/forum?${query}` : '/forum';
}

export function postHref(id: number) {
  return `/forum/${id}`;
}
