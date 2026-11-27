<script lang="ts">
  import type { CourseRanking } from '@unicourse/api-client';
  import { displayValue } from '$lib/ui/format';
  import { partialTermLabel, partialTerms } from '$lib/ui/partial-terms';

  let { course, terms }: { course: CourseRanking; terms: string[] } = $props();
  let enrollment = $derived(new Map(course.trend.map(({ term, enrolled }) => [term, enrolled])));
  let partial = $derived(partialTerms(Object.entries(course.sectionsByTerm)));
  let samples = $derived(terms.map((term) => ({ term, value: enrollment.get(term) ?? null, partial: partial.has(term) })));
  let measured = $derived(samples.filter(({ value }) => value !== null));
  let latest = $derived(measured.at(-1));
  let maximum = $derived(Math.max(1, ...measured.map(({ value }) => value ?? 0)));
  let description = $derived(samples.map(({ term, value, partial }) =>
    `${term}：${value === null ? '未公布' : `${displayValue(value)} 人${partial ? `（${partialTermLabel}）` : ''}`}`
  ).join('；'));
</script>

<span class="trend ui-tabular">
  {#if measured.length > 1}
    <span class="plot" role="img" aria-label={description} title={description}>
      {#each samples as { term, value, partial } (term)}
        <span class="slot" aria-hidden="true">
          {#if value !== null}<span class="bar" class:partial class:zero={value === 0} style:block-size={`${value / maximum * 100}%`}></span>{/if}
        </span>
      {/each}
    </span>
  {/if}
  <span class="reading">
    {#if latest}
      <strong>{displayValue(latest.value)} 人</strong>
      <small>{latest.term}{#if latest.partial} <abbr title={partialTermLabel}>＊</abbr>{/if}</small>
    {:else}
      <span class="unknown" aria-label="近期修課人數未公布">—</span>
    {/if}
  </span>
</span>

<style>
  .trend { display: grid; grid-template-columns: minmax(0, 1fr) max-content; gap: .35rem; align-items: center; }
  .plot { display: flex; gap: 2px; min-inline-size: 0; block-size: 1.5rem; border-block-end: 1px solid var(--control-line); }
  .slot { flex: 1; display: flex; align-items: end; min-inline-size: 0; }
  .bar { inline-size: 100%; background: var(--brand); border-radius: 2px 2px 0 0; }
  .bar.partial { border: 1px dashed var(--brand); background: transparent; }
  .bar.zero { border-block-start: 1px solid var(--brand); }
  .reading { grid-column: 2; display: grid; justify-items: end; white-space: nowrap; line-height: 1.25; }
  small, .unknown { color: var(--muted); }
  abbr { color: var(--warn); text-decoration: none; }
</style>
