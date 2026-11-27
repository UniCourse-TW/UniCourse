<script module lang="ts">
  import { coveragePeriod } from './institutions';

  export function rankingTrendCaption(terms: string[]) {
    return terms.length ? `近期：${coveragePeriod(terms)}；列最近公布人數，有 3 期才繪圖，連續 3 期才連線。` : '近期未公布修課人數。';
  }
</script>

<script lang="ts">
  import type { CourseRanking } from '@unicourse/api-client';
  import Sparkline from './ui/Sparkline.svelte';
  import { displayValue } from './ui/format';

  let { course, terms, max }: { course: CourseRanking; terms: string[]; max: number } = $props();
  let byTerm = $derived(new Map(course.trend.map(({ term, enrolled }) => [term, enrolled])));
  let values = $derived(terms.map((term) => byTerm.get(term) ?? null));
  let measured = $derived(terms.flatMap((term, index) => values[index] === null ? [] : [{ term, value: values[index] }]));
  let latest = $derived(measured.at(-1));
  let hasChart = $derived(measured.length >= 3);
</script>

<span class="trend">
  {#if latest}
    <span class="latest ui-tabular" title="最近公布的學期與修課人數">{latest.term} · {displayValue(latest.value)} 人</span>
    {#if hasChart}<Sparkline {values} labels={terms} label={`${course.title}近期修課人數走勢`} min={0} {max} showArea={false} minSegmentLength={3} />{/if}
  {:else}
    <span class="latest" title="這段期間沒有公布修課人數">— <span>未公布</span></span>
  {/if}
</span>

<style>
  .trend { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; column-gap: var(--space-2); font-size: var(--t-sm); color: var(--muted); }
  .latest { white-space: nowrap; }
  .trend :global(svg) { flex: 0 0 2.5rem; block-size: 1.125rem; }
</style>
