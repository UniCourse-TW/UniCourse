<script lang="ts">
  import { page } from '$app/state';
  import ErrorPage from '$lib/error-page.svelte';
</script>

<ErrorPage
  status={page.status}
  message={page.error?.message}
  retryHref={`${page.url.pathname}${page.url.search}`}
  {...page.status === 404
    ? {
        title: '找不到這篇文章',
        description: '可能已被刪除，或網址有誤。',
        primary: { href: '/forum', label: '回論壇' },
        secondary: { href: '/', label: '回首頁' }
      }
    : { secondary: { href: '/forum', label: '回論壇' } }}
/>
