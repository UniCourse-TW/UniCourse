<script module lang="ts">
  import type { CourseRanking } from '@unicourse/api-client';
  import { coveragePeriod } from './institutions';
  import { partialTermLabel, partialTerms } from './ui/partial-terms';

  export function rankingTrendCaption(terms: string[], rows: CourseRanking[]) {
    const hasPartial = rows.some((course) => [...partialTerms(Object.entries(course.sectionsByTerm))].some((term) => terms.includes(term)));
    return terms.length ? `共同尺度：${coveragePeriod(terms)}，自 0 人起。留白＝未公布，淡線跨缺期。${hasPartial ? `斜紋＝${partialTermLabel}。` : ''}` : '近期未公布修課人數。';
  }
</script>

<script lang="ts">
  import { displayValue } from './ui/format';

  let { course, terms, max }: { course: CourseRanking; terms: string[]; max: number } = $props();
  let byTerm = $derived(new Map(course.trend.map(({ term, enrolled }) => [term, enrolled])));
  let measured = $derived(terms.flatMap((term, index) => {
    const value = byTerm.get(term);
    return value == null ? [] : [{ term, value, index, x: 4 + 72 * index / Math.max(1, terms.length - 1), y: 20 - 16 * value / Math.max(1, max) }];
  }));
  let latest = $derived(measured.at(-1));
  let partial = $derived(partialTerms(Object.entries(course.sectionsByTerm)));
  const hatchId = $props.id();
  let breakdown = $derived(measured.map(({ term, value }) => `${term}：${displayValue(value)} 人${partial.has(term) ? `（${partialTermLabel}）` : ''}`).join('；'));
</script>

<span class="trend">
  <svg viewBox="0 0 80 23" role="img" aria-label={breakdown || '此期間未公布修課人數'}>
    <title>{breakdown || '此期間未公布修課人數'}</title>
    <defs><pattern id={hatchId} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0V4" class="hatch" /></pattern></defs>
    <path class="baseline" d="M4 20H76" />
    {#each measured as point, index (point.term)}
      {@const previous = measured[index - 1]}
      {#if partial.has(point.term)}<rect x={point.x - 3} y="1" width="6" height="19" fill={`url(#${hatchId})`} />{/if}
      {#if previous}<path class="series" class:gap={point.index - previous.index > 1} d={`M${previous.x} ${previous.y}L${point.x} ${point.y}`} />
      {:else if measured.length === 1}<path class="series" d={`M${point.x} 20V${point.y}`} />{/if}
      <circle cx={point.x} cy={point.y} r="1.9" />
    {/each}
  </svg>
  <span class="latest ui-tabular">
    {#if latest}
      <span>{latest.term} · {displayValue(latest.value)} 人</span>
      {#if partial.has(latest.term)}<span class="partial-mark" role="img" aria-label={partialTermLabel} title={partialTermLabel}></span>{/if}
    {:else}<span>— 未公布</span>{/if}
  </span>
</span>

<style>
  .trend { display: flex; align-items: center; gap: var(--space-2); font-size: var(--t-sm); color: var(--ink-2); }
  .latest { display: flex; align-items: center; gap: var(--space-1); white-space: nowrap; }
  svg { display: block; inline-size: 4.5rem; flex: none; }
  path { fill: none; }
  .baseline { stroke: var(--control-line); stroke-width: .75; }
  .series { stroke: var(--brand); stroke-width: 1.5; }
  .gap { stroke: var(--control-line); stroke-width: 1; }
  .hatch { stroke: var(--brand); stroke-width: 1.5; opacity: .55; }
  circle { fill: var(--brand); }
  .partial-mark { flex: none; inline-size: .65rem; block-size: .65rem; border: 1px solid var(--brand-ring); border-radius: 2px; background: var(--partial-hatch); }
  @media (max-width: 45rem) { .trend { gap: var(--space-1); font-size: var(--t-xs); } svg { inline-size: 3.25rem; } }
</style>
