<script lang="ts">
  import OverviewHome from '$lib/overview-home.svelte';
  import OverviewSearch from '$lib/overview-search.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>{data.content.kind === 'search' ? '課程搜尋｜UniCourse' : 'UniCourse｜跨校查課，看十年修課人數'}</title>
  <meta name="description" content="用課名、教師或課號跨校查課，比較開課班次與歷年修課人數。" />
</svelte:head>

{#if data.content.kind === 'overview'}
  <OverviewHome schools={data.schools} terms={data.terms} overview={data.content} />
{:else}
  <OverviewSearch schools={data.schools} terms={data.terms} search={data.content} />
{/if}
