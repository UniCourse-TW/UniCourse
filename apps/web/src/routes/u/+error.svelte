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
        title: '找不到這位使用者',
        description: '帳號可能已更名或不存在。',
        primary: { href: '/forum', label: '逛逛論壇' },
        secondary: { href: '/', label: '回首頁' }
      }
    : { secondary: { href: '/forum', label: '逛逛論壇' } }}
/>
