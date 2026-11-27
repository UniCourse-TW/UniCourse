<script lang="ts">
  import type { CourseRanking } from '@unicourse/api-client';
  import { displayValue } from '$lib/ui/format';
  import { partialTermLabel, partialTerms } from '$lib/ui/partial-terms';

  let { courses }: { courses: CourseRanking[] } = $props();
  let rows = $derived(courses.flatMap((course) => {
    const published = course.trend.filter(({ enrolled }) => enrolled != null).slice(0, 6);
    return published.length ? [{ course, published, partial: partialTerms(Object.entries(course.sectionsByTerm)) }] : [];
  }));
  let hasPartial = $derived(rows.some(({ published, partial }) => published.some(({ term }) => partial.has(term))));
</script>

{#if rows.length}
  <details>
    <summary>查看各課最近公布的人數</summary>
    <p>每門最多列出 6 個學期，依該課的公布期別排列。{#if hasPartial}<span>＊{partialTermLabel}</span>{/if}</p>
    <dl>
      {#each rows as { course, published, partial } (course.courseCode)}
        <dt>{course.title} <small>{course.courseCode}</small></dt>
        <dd>
          <ul>
            {#each published as point (point.term)}
              <li>
                <span class="term">{point.term}</span> <span>{displayValue(point.enrolled)} 人{#if partial.has(point.term)}<span role="img" title={partialTermLabel} aria-label={partialTermLabel}>＊</span>{/if}</span>
              </li>
            {/each}
          </ul>
        </dd>
      {/each}
    </dl>
  </details>
{/if}

<style>
  summary { min-block-size: var(--target-min); align-content: center; cursor: pointer; color: var(--brand-ink); font-size: var(--t-base); font-weight: 650; }
  p, dt small { color: var(--muted); font-size: var(--t-sm); text-wrap: pretty; }
  p span { display: inline-block; margin-inline-start: var(--space-1); }
  dl { margin: var(--space-2) 0; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
  dt { padding: var(--space-2) var(--space-3) 0; font-size: var(--t-base); font-weight: 650; }
  dd { margin: 0; padding: var(--space-1) var(--space-3) var(--space-2); }
  dd + dt { border-block-start: 1px solid var(--line); }
  ul { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr)); gap: var(--space-1) var(--space-2); margin: 0; padding: 0; list-style: none; }
  li { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-1); border-radius: var(--radius-control); background: var(--chip); padding: .2rem .4rem; font-size: var(--t-sm); font-variant-numeric: tabular-nums; }
  .term { color: var(--ink-2); font-family: var(--font-mono); }
</style>
