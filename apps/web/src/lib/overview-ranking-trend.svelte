<script lang="ts">
  import type { CourseRanking } from '@unicourse/api-client';
  import Sparkline from './ui/Sparkline.svelte';
  import { displayValue } from './ui/format';

  let { course, terms, max }: { course: CourseRanking; terms: string[]; max: number } = $props();
  let byTerm = $derived(new Map(course.trend.map(({ term, enrolled }) => [term, enrolled])));
  let values = $derived(terms.map((term) => byTerm.get(term) ?? null));
  let measured = $derived(terms.flatMap((term, index) => values[index] === null ? [] : [{ term, value: values[index] }]));
  let hasLine = $derived(measured.length >= 3 && values.some((value, index) => index > 0 && value !== null && values[index - 1] !== null));
  let label = $derived(`各期修課人數：${measured.map(({ term, value }) => `${term} ${displayValue(value)} 人`).join('、')}`);
</script>

<span class="trend">
  {#if hasLine}
    <Sparkline {values} labels={terms} {label} min={0} {max} showArea={false} />
  {/if}
  {#each measured.slice(hasLine ? -1 : -2) as { term, value } (term)}
    <span class="ui-tabular">{term} · {displayValue(value)} 人</span>
  {:else}
    <span title="這段期間沒有公布修課人數">近期未公布</span>
  {/each}
</span>

<style>
  .trend { display: grid; justify-items: start; font-size: var(--t-sm); color: var(--muted); white-space: nowrap; }
</style>
