<script module lang="ts">
  import type { CourseRanking } from '@unicourse/api-client';
  import { partialTermLabel, partialTerms } from './ui/partial-terms';

  export function rankingTrendCaption(terms: string[], rows: CourseRanking[]) {
    const hasPartial = rows.some((course) => [...partialTerms(Object.entries(course.sectionsByTerm))].some((term) => terms.includes(term)));
    return terms.length ? `圖表共用時間軸與人數尺度（自 0 起）；缺期斷線。少於 4 期，列出數值。${hasPartial ? '部分班次以空心點或文字標示。' : ''}` : '近期未公布修課人數。';
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
  let published = $derived(course.trend.filter(({ enrolled }) => enrolled != null).sort((left, right) => left.term.localeCompare(right.term)));
  let latest = $derived(published.at(-1));
  let previous = $derived(published.at(-2));
  let delta = $derived(latest?.enrolled != null && previous?.enrolled != null ? latest.enrolled - previous.enrolled : null);
  let outsideWindow = $derived(latest && !terms.includes(latest.term));
  let partial = $derived(partialTerms(Object.entries(course.sectionsByTerm)));
  let breakdown = $derived(measured.map(({ term, value }) => `${term}：${displayValue(value)} 人${partial.has(term) ? `（${partialTermLabel}）` : ''}`).join('；'));
</script>

<span class="trend">
  {#if measured.length >= 4}<svg viewBox="0 0 96 32" role="img" aria-label={breakdown}>
    <title>{breakdown}</title>
    {#each measured as point, index (point.term)}
      {@const previous = measured[index - 1]}
      {#if previous && point.index - previous.index === 1}<path class="series" d={`M${previous.x} ${previous.y}L${point.x} ${point.y}`} vector-effect="non-scaling-stroke" />{/if}
    {/each}
    {#each measured as point (point.term)}<circle class:partial-point={partial.has(point.term)} cx={point.x} cy={point.y} r="2" />{/each}
  </svg>{/if}
  {#if measured.length > 0 && measured.length < 4}
    <span class="history ui-tabular" title={breakdown}>
      {#each measured as { term, value }, index (term)}{#if index > 0}<span aria-hidden="true">{' → '}</span>{/if}<span class="observation">{term} {displayValue(value)}{#if partial.has(term)}<abbr title={partialTermLabel}>＊</abbr>{/if}</span>{/each}
    </span>
  {/if}
  <span class="latest ui-tabular" class:sparse={measured.length > 0 && measured.length < 4}>
    {#if latest && latest.enrolled != null}
      <span>最後公布 {latest.term}{#if measured.length === 0 || measured.length >= 4} · {displayValue(latest.enrolled)} 人{/if}</span>
      {#if outsideWindow}<span>（近期未公布）</span>{/if}
      {#if measured.length >= 4 && delta !== null && previous && !partial.has(latest.term) && !partial.has(previous.term)}<span title={`與前次公布 ${previous.term} 相比`}>較前次 {delta > 0 ? '+' : ''}{displayValue(delta)} 人</span>{/if}
      {#if partial.has(latest.term)}<span class="partial-mark" title={partialTermLabel}>部分班次</span>{/if}
    {:else}<span>近期未公布</span>{/if}
  </span>
</span>

<style>
  .trend { display: grid; grid-template-columns: minmax(0, 1fr); justify-items: start; gap: .1rem; font-size: var(--t-sm); color: var(--ink-2); }
  .latest { display: flex; flex-wrap: wrap; gap: 0 var(--space-1); color: var(--muted); }
  .latest:empty { display: none; }
  .history { overflow-wrap: normal; }
  .observation { display: inline-block; white-space: nowrap; }
  abbr { text-decoration: none; color: var(--warn); }
  svg { display: block; inline-size: 96px; block-size: 32px; max-inline-size: 100%; }
  path { fill: none; }
  .series { stroke: var(--brand); stroke-width: 1.5; }
  circle { fill: var(--brand); }
  .partial-point { fill: var(--panel-raised); stroke: var(--brand); stroke-width: 1.2; }
  .partial-mark { color: var(--warn); white-space: nowrap; }
  .sparse { font-size: var(--t-sm); }
</style>
