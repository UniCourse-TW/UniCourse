<script lang="ts">
  import type { Offering, RatingStats } from '@unicourse/api-client';
  import { requirement } from '$lib/format';
  import { departmentHref, instructorHref } from '$lib/overview-paths';
  import { scheduleLines } from '$lib/schedule';
  import Badge from '$lib/ui/Badge.svelte';
  import DataTable from '$lib/ui/DataTable.svelte';
  import { displayValue } from '$lib/ui/format';
  import type { TableColumn } from '$lib/ui/types';

  interface Props {
    offerings: Offering[];
    mode: 'department' | 'instructor';
    caption: string;
    ratings: ReadonlyMap<string, RatingStats | null>;
    showTerm: boolean;
  }

  let { offerings, mode, caption, ratings, showTerm }: Props = $props();
  const courseHref = (row: Offering) => `/courses/${row.id}`;
  const termColumn: TableColumn<Offering> = { id: 'term', label: '學期', value: (row) => row.term, sortable: true };
  const gradeColumn: TableColumn<Offering> = { id: 'grade', label: '年級', value: (row) => row.grade, align: 'center' };
  let columns = $derived<TableColumn<Offering>[]>([
    { id: 'course', label: '課程', value: (row) => row.title, sortable: true, width: '11rem' },
    ...(showTerm ? [termColumn] : []),
    mode === 'department' ? { id: 'teachers', label: '授課教師' } : { id: 'unit', label: '開課單位' },
    ...(mode === 'department' ? [gradeColumn] : []),
    { id: 'credits', label: '學分', value: (row) => row.credits, numeric: true },
    { id: 'requirement', label: '必選修', value: requirement },
    { id: 'enrollment', label: '人數／名額', sortable: true, sortValue: (row) => row.enrolled, numeric: true, width: '6.5rem' },
    { id: 'schedule', label: '時間地點', width: '12rem' },
    { id: 'rating', label: '課程評價', align: 'center' }
  ]);
</script>

{#snippet code(row: Offering)}
  <span class="browse-code">{row.courseCode}{row.classCode ? ` · ${row.classCode} 班` : ''}</span>
{/snippet}

{#snippet teachers(row: Offering)}
  {#each row.instructors as name, index (index)}{#if index > 0}、{/if}<a href={instructorHref(row.school, name)}>{name}</a>{:else}—{/each}
{/snippet}

{#snippet unit(row: Offering)}
  {#if row.department}<a href={departmentHref(row.school, row.department)}>{row.department}</a>{:else}—{/if}
{/snippet}

{#snippet enrollment(row: Offering)}
  <span class="enrollment">
    <span class="ui-tabular">{displayValue(row.enrolled)}{#if row.capacity != null} / {displayValue(row.capacity)}{/if}</span>
    {#if row.enrolled != null && row.capacity != null && row.capacity > 0}
      <span class="track" aria-hidden="true"><span class="fill" class:exceeded={row.enrolled > row.capacity} style:inline-size={`${Math.min(100, 100 * row.enrolled / row.capacity)}%`}></span></span>
    {/if}
  </span>
{/snippet}

{#snippet rating(row: Offering)}
  {@const stats = ratings.get(row.courseCode)}
  {#if stats?.average != null}
    <span class="ui-tabular" aria-label={`${stats.average.toFixed(1)} 分，共 ${stats.count} 則評價`}>{stats.average.toFixed(1)} <small>（{displayValue(stats.count)}）</small></span>
  {:else}
    <span aria-label={stats ? '尚無評價' : '未取得評價'}>—</span>
  {/if}
{/snippet}

{#snippet schedule(row: Offering)}
  {#each scheduleLines(row) as line, index (index)}<span class="slot">{line}</span>{:else}—{/each}
{/snippet}

<div class="table-view">
  <DataTable {caption} rows={offerings} {columns} rowKey={(row) => row.id} rowHref={courseHref} clientSort minWidth="47rem">
    {#snippet cell(row, column)}
      {#if column.id === 'course'}
        <span class="browse-course-cell">
          <span>{row.title}</span>{@render code(row)}
          {#if row.isDemo}<Badge label="示範" tone="demo" />{/if}
        </span>
      {:else if column.id === 'teachers'}{@render teachers(row)}
      {:else if column.id === 'unit'}{@render unit(row)}
      {:else if column.id === 'enrollment'}{@render enrollment(row)}
      {:else if column.id === 'rating'}{@render rating(row)}
      {:else if column.id === 'schedule'}{@render schedule(row)}
      {:else}{displayValue(column.value?.(row))}{/if}
    {/snippet}
  </DataTable>
</div>

<ul class="card-view" aria-label={caption} role="list">
  {#each offerings as row (row.id)}
    <li>
      <div class="card-title">
        <a href={courseHref(row)}>{row.title}</a>
        {#if row.isDemo}<Badge label="示範" tone="demo" />{/if}
      </div>
      {@render code(row)}
      <dl>
        {#if showTerm}<div><dt>學期</dt><dd>{row.term}</dd></div>{/if}
        {#if mode === 'department'}
          <div><dt>教師</dt><dd>{@render teachers(row)}</dd></div>
          {#if row.grade}<div><dt>年級</dt><dd>{row.grade}</dd></div>{/if}
        {:else}<div><dt>單位</dt><dd>{@render unit(row)}</dd></div>{/if}
        <div><dt>類別</dt><dd>{[requirement(row), row.credits != null && `${row.credits} 學分`].filter(Boolean).join(' · ') || '—'}</dd></div>
        <div><dt>時間</dt><dd>{@render schedule(row)}</dd></div>
        <div><dt>人數</dt><dd>{@render enrollment(row)}</dd></div>
        <div><dt>評價</dt><dd>{@render rating(row)}</dd></div>
      </dl>
    </li>
  {/each}
</ul>

<style>
  .card-view { display: none; }
  .enrollment { display: grid; min-inline-size: 3rem; gap: .25rem; }
  .track { inline-size: 100%; max-inline-size: 5rem; block-size: .375rem; margin-inline-start: auto; background: var(--line); border-radius: var(--radius-pill); }
  .fill { display: block; block-size: 100%; background: var(--brand); border-radius: inherit; }
  .fill.exceeded { background: var(--warn); }
  small { color: var(--muted); }
  .slot { display: block; overflow-wrap: anywhere; }
  @media (max-width: 40rem) {
    .table-view { display: none; }
    .card-view { display: grid; gap: var(--space-2); list-style: none; margin: 0; padding: 0; }
    .card-view li { min-inline-size: 0; padding: .65rem .8rem; border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--panel-raised); overflow-wrap: anywhere; }
    .card-title { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
    .card-title a { display: flex; align-items: center; min-block-size: var(--target-min); font-size: var(--t-lg); font-weight: 650; }
    dl { display: grid; gap: .3rem .65rem; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); margin: .55rem 0 0; font-size: var(--t-base); }
    dl > div { display: grid; grid-template-columns: 2em minmax(0, 1fr); gap: .4rem; }
    dl > div:has(.slot) { grid-column: 1 / -1; }
    dt { color: var(--muted); }
    dd { margin: 0; }
    .track { margin-inline-start: 0; }
  }
</style>
