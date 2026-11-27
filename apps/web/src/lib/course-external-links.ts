import type { OutboundLink } from '@unicourse/api-client';

/** An outbound search link with the words it searches for, so a generic title like 公民參與 shows its school. */
export interface SearchLink {
  source: string;
  label: string;
  url: string;
  /** The search words, e.g.「逢甲 公民參與 劉皓仁」; undefined when the URL cannot be read. */
  query: string | undefined;
}

/**
 * The API builds the links from the course's latest offering; an older offering's page searches for its
 * own teacher instead (Dcard query and NTU Rating instructor), so the label and the search agree with the
 * page. Other sources keep their URL and only gain a readable query.
 */
export function searchLinks(links: readonly OutboundLink[], title: string | undefined, instructors: readonly string[]): SearchLink[] {
  const teacher = instructors[0];
  return links.map((link) => {
    try {
      const url = new URL(link.url);
      if (link.source === 'dcard') {
        const query = url.searchParams.get('query') ?? '';
        const school = query.split(' ')[0];
        if (title && teacher && query.startsWith(`${school} ${title}`) && !query.endsWith(` ${teacher}`)) {
          url.searchParams.set('query', `${school} ${title} ${teacher}`);
        }
        return { ...link, url: url.toString().replace(/\+/gu, '%20'), query: url.searchParams.get('query') ?? undefined };
      }
      if (link.source === 'ntu-rating') {
        if (teacher && url.searchParams.has('instructor')) url.searchParams.set('instructor', teacher);
        const words = [url.searchParams.get('courseName'), url.searchParams.get('instructor')].filter(Boolean);
        return { ...link, url: url.toString().replace(/\+/gu, '%20'), query: words.length ? words.join(' ') : undefined };
      }
      if (link.source === 'opt') {
        const token = url.pathname.split('/').at(-1) ?? '';
        const json = decodeURIComponent(atob(token.replace(/-/gu, '+').replace(/_/gu, '/')));
        const keyword = (JSON.parse(json) as { keyword?: unknown }).keyword;
        return { ...link, query: typeof keyword === 'string' ? keyword : undefined };
      }
    } catch {
      // Keep the API's link as it is.
    }
    return { ...link, query: undefined };
  });
}
