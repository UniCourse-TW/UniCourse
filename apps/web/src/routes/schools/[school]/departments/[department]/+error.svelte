<script lang="ts">
  import { page } from '$app/state';
  import { schoolHref } from '$lib/overview-paths';
  import ErrorState from '$lib/ui/ErrorState.svelte';
  import '$lib/schools-browse.css';
</script>

<svelte:head><title>開課單位未能顯示｜UniCourse</title></svelte:head>

<div class="browse-page">
  <h1>{page.status === 404 ? '找不到開課單位' : '暫時無法顯示開課單位'}</h1>
  <ErrorState title={page.error?.message}>
    {#snippet action()}
      <div class="browse-actions">
        {#if page.status !== 404}<a class="browse-button browse-primary" href={page.url.pathname + page.url.search} data-sveltekit-reload>再試一次</a>{/if}
        <a class="browse-button" href={page.params.school ? schoolHref(page.params.school) : '/schools'}>回學校總覽</a>
      </div>
    {/snippet}
  </ErrorState>
</div>
