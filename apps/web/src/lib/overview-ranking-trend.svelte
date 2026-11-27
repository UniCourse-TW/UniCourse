<script module lang="ts">
  import type { CourseRanking } from '@unicourse/api-client';
  import { displayValue } from './ui/format';
  import { partialTermLabel, partialTerms } from './ui/partial-terms';

  export function rankingTrendCaption(terms: string[], max?: number) {
    if (!terms.length) return '近期未公布修課人數。';
    const scale = max === undefined ? '縱軸從 0 起，上限依各課人數調整' : `各列共用 0–${displayValue(max)} 人`;
    return `${scale}。缺期斷線，零星數值以柱顯示。差值與前次公布比較。`;
  }
</script>

<script lang="ts">
  import Sparkline from './ui/Sparkline.svelte';

  let { course, terms, recentTerms, max }: {
    course: CourseRanking; terms: string[]; recentTerms?: string[]; max?: number;
  } = $props();
  let byTerm = $derived(new Map(course.trend.map(({ term, enrolled }) => [term, enrolled])));
  let samples = $derived(terms.map((term) => byTerm.get(term) ?? null));
  let partial = $derived(partialTerms(Object.entries(course.sectionsByTerm)));
  let published = $derived(course.trend.flatMap(({ term, enrolled }) => enrolled == null ? [] : [{ term, value: enrolled }])
    .sort((left, right) => left.term.localeCompare(right.term, 'zh-TW', { numeric: true })));
  let latest = $derived(published.at(-1));
  let previous = $derived(published.at(-2));
  let older = $derived(latest && recentTerms && !recentTerms.includes(latest.term));
  let sampleCount = $derived(samples.filter((value) => value !== null).length);
  let delta = $derived(latest && previous && !partial.has(latest.term) && !partial.has(previous.term) ? latest.value - previous.value : null);
  let breakdown = $derived(terms.map((term, index) => `${term}：${samples[index] === null ? '無數值' : `${displayValue(samples[index])} 人`}${partial.has(term) ? `（${partialTermLabel}）` : ''}`).join('；'));
</script>

<span class="trend">
  <span class="chart" role={sampleCount ? 'img' : undefined} aria-label={sampleCount ? breakdown : undefined}>
    <Sparkline values={samples} labels={terms} label="修課人數" min={0} {max} partial={terms.map((term) => partial.has(term))} decorative showArea={false} showSparse={false} sparseBars />
    {#if sampleCount}<small aria-hidden="true">{sampleCount} 期有資料</small>{/if}
  </span>
  <span class="trend-value ui-tabular">
    {#if latest}
      <strong class:older>{displayValue(latest.value)} <small>人</small></strong>
      <small>{older ? '最後公布' : '最近公布'} {latest.term}{#if partial.has(latest.term)} <abbr title={partialTermLabel} aria-label={partialTermLabel}>＊</abbr>{/if}</small>
      {#if delta !== null && previous}<small class:up={delta > 0} class:down={delta < 0}>較 {previous.term} {delta > 0 ? '+' : ''}{displayValue(delta)}</small>{/if}
    {:else}
      <small>各期人數未公布</small>
    {/if}
  </span>
</span>

<style>
  .trend { display: grid; grid-template-columns: minmax(0, 1fr) minmax(6.5rem, max-content); align-items: center; gap: var(--space-2); color: var(--ink); }
  .chart { display: grid; justify-items: end; --sparkline-width: 100%; --sparkline-height: var(--ranking-trend-height, 28px); }
  .trend-value { display: grid; justify-items: end; align-content: center; text-align: end; min-block-size: 1.75rem; line-height: 1.25; }
  small { color: var(--ink-2); font-size: var(--t-sm); font-weight: 450; }
  .older { color: var(--ink-2); }
  .up { color: var(--up); }
  .down { color: var(--down); }
  abbr { color: var(--muted); text-decoration: none; }
</style>
