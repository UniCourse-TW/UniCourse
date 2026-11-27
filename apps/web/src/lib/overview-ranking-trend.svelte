<script module lang="ts">
  import type { CourseRanking } from '@unicourse/api-client';
  import { partialTermLabel, partialTerms } from './ui/partial-terms';

  export function rankingTrendCaption(terms: string[], rows: CourseRanking[]) {
    if (!terms.length) return '近期未公布修課人數。';
    const hasPartial = rows.some((course) => [...partialTerms(Object.entries(course.sectionsByTerm))].some((term) => terms.includes(term)));
    return `各列縱軸依本課最低、最高人數縮放。缺期斷線，差值與前次公布相比。${hasPartial ? '空心點與＊表示部分班次，該期不計差值。' : ''}`;
  }
</script>

<script lang="ts">
  import { linePath, lineSegments } from './ui/chart-scale';
  import { displayValue } from './ui/format';

  let { course, terms }: { course: CourseRanking; terms: string[] } = $props();
  let byTerm = $derived(new Map(course.trend.map(({ term, enrolled }) => [term, enrolled])));
  let samples = $derived(terms.map((term) => byTerm.get(term) ?? null));
  let values = $derived(samples.filter((value): value is number => value !== null));
  let low = $derived(Math.min(...values));
  let high = $derived(Math.max(...values));
  let partial = $derived(partialTerms(Object.entries(course.sectionsByTerm)));
  let points = $derived(samples.map((value, index) => value === null ? null : ({
    term: terms[index], value,
    x: terms.length < 2 ? 48 : 4 + 88 * index / (terms.length - 1),
    y: low === high ? 16 : 26 - 20 * (value - low) / (high - low)
  })));
  let segments = $derived(lineSegments(points));
  let latest = $derived(points.findLast((point) => point !== null));
  let previous = $derived(points.slice(0, latest ? terms.indexOf(latest.term) : 0).findLast((point) => point !== null));
  let delta = $derived(latest && previous && !partial.has(latest.term) && !partial.has(previous.term) ? latest.value - previous.value : null);
  let breakdown = $derived(terms.map((term, index) => `${term}：${samples[index] === null ? '未公布' : `${displayValue(samples[index])} 人`}${partial.has(term) ? `（${partialTermLabel}）` : ''}`).join('；'));
  let lastPublished = $derived(course.trend.filter(({ enrolled }) => enrolled != null).sort((left, right) => left.term.localeCompare(right.term)).at(-1));
</script>

<span class="trend">
  <svg viewBox="0 0 96 32" preserveAspectRatio="none" role={latest ? 'img' : undefined} aria-hidden={!latest || undefined} aria-label={latest ? breakdown : undefined}>
    {#if latest}
      <title>{breakdown}</title>
      {#each segments as segment}
        {#if segment.length > 1}<path class="series" d={linePath(segment)} vector-effect="non-scaling-stroke" />{/if}
      {/each}
      {#each points as point, index (terms[index])}
        {#if point}<circle class:partial-point={partial.has(point.term)} cx={point.x} cy={point.y} r="2.4" />{/if}
      {/each}
    {:else}
      <line x1="43" x2="53" y1="16" y2="16" class="empty-mark" />
    {/if}
  </svg>
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
  .trend { display: grid; grid-template-columns: var(--ranking-trend-width, 96px) minmax(0, 1fr); align-items: center; gap: .4rem; color: var(--ink); white-space: nowrap; }
  .trend-value { display: grid; align-content: center; min-block-size: 2.125rem; line-height: 1.15; }
  small { color: var(--ink-2); font-size: var(--t-sm); font-weight: 450; }
  abbr { color: var(--warn); text-decoration: none; }
  svg { display: block; width: 100%; height: 32px; }
  .series, .empty-mark { fill: none; stroke: var(--brand); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  .empty-mark { stroke: var(--control-line); }
  circle { fill: var(--brand); }
  .partial-point { fill: var(--panel-raised); stroke: var(--brand); stroke-width: 1.2; }
</style>
