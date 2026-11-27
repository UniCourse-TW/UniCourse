<script module lang="ts">
  import type { CourseRanking } from '@unicourse/api-client';
  import { displayValue } from './ui/format';
  import { partialTermLabel, partialTerms } from './ui/partial-terms';

  export function rankingTrendCaption(terms: string[]) {
    if (!terms.length) return '近期未公布修課人數。';
    return '各課獨立刻度，缺期斷線，少於 6 期用點圖。';
  }
</script>

<script lang="ts">
  import Sparkline from './ui/Sparkline.svelte';

  let { course, terms, lastOffered }: {
    course: CourseRanking; terms: string[]; lastOffered: string | null;
  } = $props();
  let byTerm = $derived(new Map(course.trend.map(({ term, enrolled }) => [term, enrolled])));
  let samples = $derived(terms.map((term) => byTerm.get(term) ?? null));
  let partial = $derived(partialTerms(Object.entries(course.sectionsByTerm)));
  let published = $derived(course.trend.flatMap(({ term, enrolled }) => enrolled == null ? [] : [{ term, value: enrolled }])
    .sort((left, right) => left.term.localeCompare(right.term, 'zh-TW', { numeric: true })));
  let latest = $derived(published.at(-1));
  let previous = $derived(published.at(-2));
  let sampleCount = $derived(samples.filter((value) => value !== null).length);
  let hasChart = $derived(sampleCount >= 2);
  let scaleMax = $derived(Math.max(0, ...samples.map((value) => value ?? 0)));
  let delta = $derived(latest && previous && !partial.has(latest.term) && !partial.has(previous.term) ? latest.value - previous.value : null);
  let breakdown = $derived(terms.map((term, index) => `${term}：${samples[index] === null ? '無數值' : `${displayValue(samples[index])} 人`}${partial.has(term) ? `（${partialTermLabel}）` : ''}`).join('；'));
</script>

<span class="trend">
  <span class="chart">
    {#if hasChart}
      <span role="img" aria-label={breakdown}><Sparkline values={samples} labels={terms} label="修課人數" min={0} max={scaleMax} partial={terms.map((term) => partial.has(term))} decorative showArea={false} showSparse={false} sparseDotsBelow={6} /></span>
      <small class="scale ui-tabular">0–{displayValue(scaleMax)} 人</small>
    {:else if sampleCount === 1}<small>單期有數值</small>{/if}
  </span>
  <span class="trend-value ui-tabular">
    {#if latest}
      <span class="figures">
        <strong>{displayValue(latest.value)} <small>人</small></strong>
        {#if delta !== null}<small class:up={delta > 0} class:down={delta < 0}>{delta > 0 ? '+' : ''}{displayValue(delta)}</small>{/if}
      </span>
      <small class="trend-period">
        {lastOffered === latest.term ? '最近開課' : '最近公布'} {latest.term}{#if delta !== null && previous}{' · '}<span>較 {previous.term}</span>{/if}
        {#if partial.has(latest.term)} <abbr title={partialTermLabel} aria-label={partialTermLabel}>＊</abbr>{/if}
      </small>
      {#if lastOffered && lastOffered !== latest.term}<small>最近開課 {lastOffered}</small>{/if}
    {:else}
      <small>各期人數未公布</small>
      {#if lastOffered}<small>最近開課 {lastOffered}</small>{/if}
    {/if}
  </span>
</span>

<style>
  .trend { display: grid; grid-template-columns: minmax(0, 96px) minmax(0, 1fr); align-items: center; gap: var(--space-2); color: var(--ink); }
  .chart { display: grid; align-items: center; --sparkline-width: 100%; --sparkline-height: 32px; }
  .scale { font-size: var(--t-sm); line-height: 1; }
  .trend-value { display: grid; justify-items: end; text-align: end; line-height: 1.25; }
  .figures { display: flex; flex-wrap: wrap; justify-content: end; align-items: baseline; gap: 0 var(--space-1); }
  .figures strong { white-space: nowrap; }
  .trend-period > span { white-space: nowrap; }
  small { color: var(--ink-2); font-size: var(--t-sm); font-weight: 450; }
  .up { color: var(--up); }
  .down { color: var(--down); }
  abbr { color: var(--muted); text-decoration: none; }
</style>
