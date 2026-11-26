<script lang="ts">
  import { page } from '$app/state';
  import ErrorState from '$lib/ui/ErrorState.svelte';
  import '$lib/schools-browse.css';

  const searchHref = $derived(`/?${new URLSearchParams({ school: page.params.school ?? '', term: 'all', q: page.params.name ?? '' })}`);
</script>

<svelte:head><title>教師資料未能顯示｜UniCourse</title></svelte:head>

<div class="browse-page">
  <h1>{page.status === 404 ? '找不到教師' : '暫時無法顯示教師資料'}</h1>
  <ErrorState title={page.error?.message}>
    {#snippet action()}
      <div class="browse-actions">
        {#if page.status !== 404}<a class="browse-button browse-primary" href={page.url.pathname + page.url.search} data-sveltekit-reload>再試一次</a>{/if}
        <a class="browse-button" href={searchHref}>用教師名搜尋課程</a>
      </div>
    {/snippet}
  </ErrorState>
</div>
