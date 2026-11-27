<script module lang="ts">
  import type { CourseRanking } from '@unicourse/api-client';
  import { displayValue } from './ui/format';
  import { partialTermLabel, partialTerms } from './ui/partial-terms';

  export function rankingTrendCaption(terms: string[], rows: CourseRanking[], max?: number) {
    if (!terms.length) return '近期未公布修課人數。';
    const scale = max === undefined ? '縱軸從 0 起，上限依各課人數調整' : `各列共用 0–${displayValue(max)} 人`;
    const hasPartial = rows.some((course) => [...partialTerms(Object.entries(course.sectionsByTerm))]
      .some((term) => terms.includes(term)));
    return `${scale}。缺期斷線，差值比較前次公布。${hasPartial ? `空心點與＊表示${partialTermLabel}，不連線、不計差值。` : ''}`;
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
  let recent = $derived((recentTerms ?? terms).flatMap((term) => {
    const value = byTerm.get(term);
    return value == null ? [] : [{ term, value }];
  }));
  let latest = $derived(recent.at(-1));
  let previous = $derived(recent.at(-2));
  let delta = $derived(latest && previous && !partial.has(latest.term) && !partial.has(previous.term) ? latest.value - previous.value : null);
  let breakdown = $derived(terms.map((term, index) => `${term}：${samples[index] === null ? '無數值' : `${displayValue(samples[index])} 人`}${partial.has(term) ? `（${partialTermLabel}）` : ''}`).join('；'));
  let lastPublished = $derived(course.trend.filter(({ enrolled }) => enrolled != null).sort((left, right) => left.term.localeCompare(right.term)).at(-1));
</script>

<span class="trend" role={lastPublished ? 'img' : undefined} aria-label={lastPublished ? `${latest ? '' : '近期未公布；'}${breakdown}` : undefined}>
  <span class="chart">
    <Sparkline values={samples} labels={terms} label="修課人數" min={0} {max} partial={terms.map((term) => partial.has(term))} decorative showArea={false} showSparse={false} />
  </span>
  <span class="trend-value ui-tabular">
    {#if latest}
      <strong>{displayValue(latest.value)} <small>人</small></strong>
      <small title={delta !== null && previous ? `與前次公布 ${previous.term} 相比` : undefined}>{latest.term}{#if partial.has(latest.term)} <abbr title={partialTermLabel}>＊</abbr>{/if}{#if delta !== null}{' · '}{delta >= 0 ? '+' : ''}{displayValue(delta)}{/if}</small>
    {:else}
      <small title={lastPublished ? `最後公布 ${lastPublished.term} · ${displayValue(lastPublished.enrolled)} 人` : undefined}>近期未公布</small>
    {/if}
  </span>
</span>

<style>
  .trend { display: grid; grid-template-columns: var(--ranking-trend-width, 96px) minmax(0, 1fr); align-items: center; gap: .3rem; color: var(--ink); white-space: nowrap; }
  .chart { --sparkline-width: 100%; --sparkline-height: var(--ranking-trend-height, 28px); }
  .trend-value { display: grid; justify-items: end; align-content: center; min-block-size: 1.75rem; line-height: 1.25; }
  small { color: var(--ink-2); font-size: var(--t-sm); font-weight: 450; }
  abbr { color: var(--warn); text-decoration: none; }
</style>
