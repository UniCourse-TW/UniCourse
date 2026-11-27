<script module lang="ts">
  import type { CourseRanking } from '@unicourse/api-client';
  import { coveragePeriod } from './institutions';
  import { partialTermLabel, partialTerms } from './ui/partial-terms';

  export function rankingTrendCaption(terms: string[], rows: CourseRanking[]) {
    const hasPartial = rows.some((course) => [...partialTerms(Object.entries(course.sectionsByTerm))].some((term) => terms.includes(term)));
    return terms.length ? `共同尺度：${coveragePeriod(terms)}，自 0 人起。淡線跨缺期。${hasPartial ? '空心點＝可能僅收錄部分班次。' : ''}` : '近期未公布修課人數。';
  }
</script>

<script lang="ts">
  import { displayValue } from './ui/format';

  let { course, terms, max }: { course: CourseRanking; terms: string[]; max: number } = $props();
  let byTerm = $derived(new Map(course.trend.map(({ term, enrolled }) => [term, enrolled])));
  let measured = $derived(terms.flatMap((term, index) => {
    const value = byTerm.get(term);
    return value == null ? [] : [{ term, value, index, x: 4 + 88 * index / Math.max(1, terms.length - 1), y: 28 - 24 * value / Math.max(1, max) }];
  }));
  let latest = $derived(measured.at(-1));
  let partial = $derived(partialTerms(Object.entries(course.sectionsByTerm)));
  let breakdown = $derived(measured.map(({ term, value }) => `${term}：${displayValue(value)} 人${partial.has(term) ? `（${partialTermLabel}）` : ''}`).join('；'));
</script>

<span class="trend">
  {#if measured.length > 1}<svg viewBox="0 0 96 32" role="img" aria-label={breakdown}>
    <title>{breakdown}</title>
    {#each measured as point, index (point.term)}
      {@const previous = measured[index - 1]}
      {#if previous}<path class="series" class:gap={point.index - previous.index > 1} d={`M${previous.x} ${previous.y}L${point.x} ${point.y}`} vector-effect="non-scaling-stroke" />{/if}
    {/each}
    {#each measured as point (point.term)}<circle class:partial-point={partial.has(point.term)} cx={point.x} cy={point.y} r="2" />{/each}
  </svg>{:else}<span class="trend-state">{latest ? '僅一期' : '近期未公布'}</span>{/if}
  <span class="latest ui-tabular">
    {#if latest}
      <span>{latest.term} · {displayValue(latest.value)} 人</span>
      {#if partial.has(latest.term)}<span class="partial-mark" title={partialTermLabel}>部分班次</span>{/if}
    {/if}
  </span>
</span>

<style>
  .trend { display: grid; grid-template-columns: minmax(0, 1fr); justify-items: start; gap: .1rem; font-size: var(--t-sm); color: var(--ink-2); }
  .latest { display: flex; flex-wrap: wrap; gap: 0 var(--space-1); color: var(--muted); }
  .latest:empty { display: none; }
  svg { display: block; inline-size: 96px; block-size: 32px; max-inline-size: 100%; }
  path { fill: none; }
  .series { stroke: var(--brand); stroke-width: 1.5; }
  .gap { stroke: var(--control-line); stroke-width: 1; }
  circle { fill: var(--brand); }
  .partial-point { fill: var(--panel-raised); stroke: var(--brand); stroke-width: 1.2; }
  .partial-mark { color: var(--warn); white-space: nowrap; }
  .trend-state { color: var(--ink-2); }
</style>
