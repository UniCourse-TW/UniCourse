<script lang="ts">
  import { page } from '$app/state';
  import ErrorPage from '$lib/error-page.svelte';

  type Copy = NonNullable<Parameters<typeof ErrorPage>[1]>;

  const FORUM = { href: '/forum', label: '逛逛論壇' };
  const SCHOOLS = { href: '/schools', label: '看各校收錄狀態' };

  function decodeSegment(segment = '') {
    try {
      return decodeURIComponent(segment);
    } catch {
      return '';
    }
  }

  /** 404 copy per route (states.md §4); the route id is set when a load threw, the path otherwise. */
  function notFoundCopy(routeId: string | null, pathname: string): Partial<Copy> {
    const segments = pathname.split('/').filter(Boolean);
    const route = routeId ?? `/${segments.map((segment, index) => (index === 0 ? segment : '[x]')).join('/')}`;
    if (route.startsWith('/courses/')) {
      const tail = decodeSegment(segments.at(-1));
      const offeringId = /^\d{1,18}$/.test(tail) ? tail : '';
      const courseCode = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9_-]{2,32}$/.test(tail) ? tail : '';
      return {
        title: '找不到這個開課班次',
        description: '這個連結可能已失效。用課名、課號或教師搜尋其他學期的開課。',
        hint: '課號可在舊課表或校方課程頁上找到。',
        context: offeringId ? pathname : undefined,
        // Only course-finding routes here: coverage first, then home (the forum is not a way to a course).
        secondary: SCHOOLS,
        also: [{ href: '/', label: '回首頁' }],
        search: true,
        query: courseCode,
        crossTerm: Boolean(courseCode)
      };
    }
    if (route.includes('/departments/')) {
      return {
        title: '找不到這個開課單位',
        description: '名稱可能已更動，或這個學期沒有開課紀錄。',
        primary: { href: `/schools/${segments[1] ?? ''}`, label: '回學校頁' },
        secondary: SCHOOLS,
        also: [{ href: '/', label: '搜尋課程' }]
      };
    }
    if (route.startsWith('/schools/')) {
      return {
        title: '找不到這所學校',
        description: '這所學校可能還沒有收錄課程資料，或網址有誤。',
        primary: SCHOOLS,
        secondary: { href: '/', label: '回首頁' },
        also: [{ href: '/landscape', label: '看課程網站總覽' }]
      };
    }
    if (route.startsWith('/instructors/')) {
      const name = decodeSegment(segments[2]);
      return {
        title: '找不到這位教師',
        description: '姓名可能寫法不同，或這位教師的課程尚未收錄。',
        primary: { href: name ? `/?q=${encodeURIComponent(name)}&term=all` : '/', label: '以姓名搜尋課程' },
        secondary: { href: '/', label: '回首頁' },
        also: [SCHOOLS]
      };
    }
    if (route.startsWith('/forum')) {
      return {
        title: '找不到這篇文章',
        description: '可能已被刪除，或網址有誤。',
        primary: { href: '/forum', label: '回論壇' },
        secondary: { href: '/', label: '回首頁' }
      };
    }
    if (route.startsWith('/u/')) {
      return {
        title: '找不到這位使用者',
        description: '帳號可能已更名或不存在。',
        primary: FORUM,
        secondary: { href: '/', label: '回首頁' }
      };
    }
    // A last segment that looks like a course code or a name is worth a search.
    const tail = decodeSegment(segments.at(-1));
    return {
      title: '找不到這個頁面',
      description: '網址可能有誤，或這個頁面已被移除。',
      secondary: { href: '/', label: '回首頁' },
      also: [SCHOOLS, FORUM, { href: '/landscape', label: '看課程網站總覽' }],
      search: true,
      query: /^[A-Za-z0-9-]{3,12}$/.test(tail) || /^[\u4e00-\u9fff]{2,12}$/.test(tail) ? tail : ''
    };
  }

  let copy = $derived(page.status === 404 ? notFoundCopy(page.route.id, page.url.pathname) : {});
</script>

<ErrorPage
  status={page.status}
  message={page.error?.message}
  retryHref={`${page.url.pathname}${page.url.search}`}
  {...copy}
/>
