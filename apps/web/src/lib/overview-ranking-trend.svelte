<script module lang="ts">
  import type { CourseRanking } from '@unicourse/api-client';
  import { coveragePeriod } from './institutions';
  import { partialTermLabel, partialTerms } from './ui/partial-terms';

  export function rankingTrendCaption(terms: string[], rows: CourseRanking[]) {
    const hasPartial = rows.some((course) => [...partialTerms(Object.entries(course.sectionsByTerm))].some((term) => terms.includes(term)));
    return terms.length ? `近期：${coveragePeriod(terms)}；至少 3 期公布才繪圖，各列依有資料的期間作圖，虛線跨過缺值。${hasPartial ? `斜紋＝${partialTermLabel}。` : ''}` : '近期未公布修課人數。';
  }
</script>

<script lang="ts">
  import Sparkline from './ui/Sparkline.svelte';
  import { displayValue } from './ui/format';

  let { course, terms, max }: { course: CourseRanking; terms: string[]; max: number } = $props();
  let byTerm = $derived(new Map(course.trend.map(({ term, enrolled }) => [term, enrolled])));
  let values = $derived(terms.map((term) => byTerm.get(term) ?? null));
  let measured = $derived(terms.flatMap((term, index) => values[index] === null ? [] : [{ term, value: values[index], index }]));
  let latest = $derived(measured.at(-1));
  let hasChart = $derived(measured.length >= 3);
  let firstIndex = $derived(measured[0]?.index ?? 0);
  let endIndex = $derived((latest?.index ?? -1) + 1);
  let plotTerms = $derived(terms.slice(firstIndex, endIndex));
  let partial = $derived(partialTerms(Object.entries(course.sectionsByTerm)));
</script>

<span class="trend">
  {#if latest}
    <span class="latest ui-tabular" class:partial={partial.has(latest.term)} title={partial.has(latest.term) ? partialTermLabel : '最近公布的學期與修課人數'}>{latest.term} · {displayValue(latest.value)} 人</span>
    {#if hasChart}<Sparkline values={values.slice(firstIndex, endIndex)} labels={plotTerms} label={`${course.title}近期修課人數走勢，${plotTerms[0]} 至 ${plotTerms.at(-1)}`} min={0} {max} showArea={false} bridgeGaps partial={plotTerms.map((term) => partial.has(term))} />
    {:else}<small>僅 {measured.length} 期</small>{/if}
  {:else}
    <span class="latest" title="這段期間沒有公布修課人數">—</span><small>未公布</small>
  {/if}
</span>

<style>
  .trend { display: grid; grid-template-columns: max-content minmax(2.4rem, 1fr); align-items: center; column-gap: var(--space-2); font-size: var(--t-sm); color: var(--muted); }
  .latest { white-space: nowrap; }
  .latest.partial { background: var(--partial-hatch); }
  small { white-space: nowrap; font-size: var(--t-xs); }
  .trend :global(svg) { inline-size: 100%; max-inline-size: 4rem; block-size: 1.125rem; }
</style>
