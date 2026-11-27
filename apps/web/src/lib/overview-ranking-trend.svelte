<script lang="ts">
  import type { CourseRanking } from '@unicourse/api-client';
  import { displayValue } from './ui/format';
  import { partialTermLabel, partialTerms } from './ui/partial-terms';
  import Sparkline from './ui/Sparkline.svelte';

  let { course, terms, lastOffered }: {
    course: CourseRanking; terms: string[]; lastOffered: string | null;
  } = $props();
  let byTerm = $derived(new Map(course.trend.map(({ term, enrolled }) => [term, enrolled])));
  let samples = $derived(terms.map((term) => byTerm.get(term) ?? null));
  let partial = $derived(partialTerms(Object.entries(course.sectionsByTerm)));
  let partialSlots = $derived(terms.map((term) => partial.has(term)));
  let published = $derived(course.trend.flatMap(({ term, enrolled }) => enrolled == null ? [] : [{ term, value: enrolled }])
    .sort((left, right) => left.term.localeCompare(right.term, 'zh-TW', { numeric: true })));
  let latest = $derived(published.at(-1));
  let previous = $derived(published.at(-2));
  let sampleCount = $derived(samples.filter((value) => value !== null).length);
  let hasChart = $derived(sampleCount >= 6 && samples.some((value, index) => index > 0
    && value !== null && !partialSlots[index] && samples[index - 1] !== null && !partialSlots[index - 1]));
  let scaleMax = $derived(Math.max(0, ...samples.map((value) => value ?? 0)));
  let scale = $derived(`0–${displayValue(scaleMax)} 人`);
  let delta = $derived(latest && previous && !partial.has(latest.term) && !partial.has(previous.term) ? latest.value - previous.value : null);
  let breakdown = $derived(terms.map((term, index) => `${term}：${samples[index] === null ? '無數值' : `${displayValue(samples[index])} 人`}${partialSlots[index] ? `（${partialTermLabel}）` : ''}`).join('；'));
</script>

{#snippet partialMark(term: string)}
  {#if partial.has(term)}<abbr title={partialTermLabel} aria-label={partialTermLabel}>＊</abbr>{/if}
{/snippet}

<span class="trend ui-tabular">
  {#if hasChart}
    <span class="chart" role="img" aria-label={`刻度 ${scale}。${breakdown}`} title={`刻度 ${scale}`}>
      <span class="plot"><Sparkline values={samples} labels={terms} label="修課人數" min={0} max={scaleMax} partial={partialSlots} decorative showArea={false} showSparse={false} sparseDotsBelow={6} /></span>
      <small class="scale" aria-hidden="true">{scale}</small>
    </span>
  {:else if previous}
    <small class="earlier"><span>{published.length} 期有數值</span><span>{previous.term} <strong>{displayValue(previous.value)} 人</strong>{@render partialMark(previous.term)}</span></small>
  {/if}
  <span class="trend-value">
    {#if latest}
      <span class="figures">
        <strong>{displayValue(latest.value)} <small>人</small></strong>
        {#if delta !== null}<small class:up={delta > 0} class:down={delta < 0}>{delta > 0 ? '+' : ''}{displayValue(delta)}</small>{/if}
      </span>
      <small class="trend-period">
        <span>{lastOffered === latest.term ? '最近開課' : '最近公布'} {latest.term}{@render partialMark(latest.term)}</span>
        {#if delta !== null && previous}<span>較 {previous.term}</span>{/if}
      </small>
      {#if lastOffered && lastOffered !== latest.term}<small>最近開課 {lastOffered}</small>{/if}
    {:else}
      <small>各期人數未公布</small>
      {#if lastOffered}<small>最近開課 {lastOffered}</small>{/if}
    {/if}
  </span>
</span>

<style>
  .trend { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--space-2); min-height: 2.35rem; color: var(--ink); }
  .chart { display: grid; justify-items: end; align-content: center; gap: 2px; width: min(100%, 7rem); --sparkline-width: 100%; --sparkline-height: 19px; }
  .plot { inline-size: 100%; line-height: 0; border-block-end: 1px solid var(--line); }
  .scale { white-space: nowrap; }
  .earlier { display: grid; line-height: 1.25; }
  .earlier strong { color: var(--ink); font-weight: 600; white-space: nowrap; }
  .trend-value { grid-column: 2; display: grid; justify-items: end; text-align: end; line-height: 1.25; }
  .figures, .trend-period { display: flex; flex-wrap: wrap; justify-content: end; align-items: baseline; gap: 0 var(--space-2); }
  .figures strong, .trend-period > span { white-space: nowrap; }
  small { color: var(--ink-2); font-size: var(--t-sm); font-weight: 450; }
  .up { color: var(--up); }
  .down { color: var(--down); }
  abbr { color: var(--muted); text-decoration: none; }
</style>
