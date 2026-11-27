<script module lang="ts">
  import type { CourseRanking } from '@unicourse/api-client';
  import { displayValue } from './ui/format';
  import { partialTermLabel, partialTerms } from './ui/partial-terms';

  export function rankingTrendCaption(terms: string[]) {
    if (!terms.length) return '近期未公布修課人數。';
    return '走勢從 0 起，各課依人數調整上限。缺期斷線，零星數值以柱顯示。';
  }
</script>

<script lang="ts">
  import Sparkline from './ui/Sparkline.svelte';

  let { course, terms, recentTerms, lastOffered }: {
    course: CourseRanking; terms: string[]; recentTerms: string[]; lastOffered?: string | null;
  } = $props();
  let byTerm = $derived(new Map(course.trend.map(({ term, enrolled }) => [term, enrolled])));
  let samples = $derived(terms.map((term) => byTerm.get(term) ?? null));
  let partial = $derived(partialTerms(Object.entries(course.sectionsByTerm)));
  let published = $derived(course.trend.flatMap(({ term, enrolled }) => enrolled == null ? [] : [{ term, value: enrolled }])
    .sort((left, right) => left.term.localeCompare(right.term, 'zh-TW', { numeric: true })));
  let latest = $derived(published.at(-1));
  let previous = $derived(published.at(-2));
  let older = $derived(latest && recentTerms.length > 0 && !recentTerms.includes(latest.term));
  let hasChart = $derived(samples.filter((value) => value !== null).length > 1);
  let delta = $derived(latest && previous && !partial.has(latest.term) && !partial.has(previous.term) ? latest.value - previous.value : null);
  let breakdown = $derived(terms.map((term, index) => `${term}：${samples[index] === null ? '無數值' : `${displayValue(samples[index])} 人`}${partial.has(term) ? `（${partialTermLabel}）` : ''}`).join('；'));
</script>

<span class="trend">
  <span class="chart" role={hasChart ? 'img' : undefined} aria-label={hasChart ? breakdown : undefined}>
    {#if hasChart}<Sparkline values={samples} labels={terms} label="修課人數" min={0} partial={terms.map((term) => partial.has(term))} decorative showArea={false} showSparse={false} sparseBars minimumBarHeight={3} />{/if}
  </span>
  <span class="trend-value ui-tabular">
    {#if latest}
      <span class="figures">
        {#if lastOffered}<small>最近公布</small>{/if}
        <strong>{displayValue(latest.value)} <small>人</small></strong>
        {#if delta !== null && previous}<small class:up={delta > 0} class:down={delta < 0}>較 {previous.term} {delta > 0 ? '+' : ''}{displayValue(delta)}</small>{/if}
      </span>
      <small>
        {#if lastOffered}最近開課 {lastOffered}{/if}
        {#if lastOffered !== latest.term}{lastOffered ? ' · 公布' : older ? '最後公布' : '最近公布'} {latest.term}{/if}
        {#if partial.has(latest.term)} <abbr title={partialTermLabel} aria-label={partialTermLabel}>＊</abbr>{/if}
      </small>
    {:else}
      <small>各期人數未公布</small>
      {#if lastOffered}<small>最近開課 {lastOffered}</small>{/if}
    {/if}
  </span>
</span>

<style>
  .trend { display: grid; grid-template-columns: minmax(0, 96px) minmax(0, 1fr); align-items: center; gap: var(--space-2); color: var(--ink); }
  .chart { display: grid; --sparkline-width: 100%; --sparkline-height: 32px; }
  .trend-value { display: grid; justify-items: end; text-align: end; line-height: 1.25; }
  .figures { display: flex; flex-wrap: wrap; justify-content: end; align-items: baseline; gap: 0 var(--space-2); overflow-wrap: anywhere; }
  small { color: var(--ink-2); font-size: var(--t-sm); font-weight: 450; }
  .up { color: var(--up); }
  .down { color: var(--down); }
  abbr { color: var(--muted); text-decoration: none; }
</style>
