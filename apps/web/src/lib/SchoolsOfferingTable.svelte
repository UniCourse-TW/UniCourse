<script lang="ts">
  import type { Offering, RatingStats } from '@unicourse/api-client';
  import { requirement } from '$lib/format';
  import { departmentHref, instructorHref } from '$lib/overview-paths';
  import { scheduleLines } from '$lib/schedule';
  import { reportedCapacity } from '$lib/schools-offerings';
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
  const gradeColumn: TableColumn<Offering> = { id: 'grade', label: '年級', value: (row) => row.grade, align: 'center', width: '3.5rem' };
  const category = (row: Offering) => [row.credits == null ? null : `${row.credits} 學分`, requirement(row)].filter(Boolean).join(' · ');
  let columns = $derived<TableColumn<Offering>[]>([
    { id: 'course', label: '課程', value: (row) => row.title, sortable: true, width: '11rem' },
    ...(showTerm ? [termColumn] : []),
    mode === 'department' ? { id: 'teachers', label: '授課教師' } : { id: 'unit', label: '開課單位' },
    ...(mode === 'department' && offerings.some(({ grade }) => grade) ? [gradeColumn] : []),
    { id: 'category', label: '學分／類別', value: category, width: '7rem' },
    { id: 'enrollment', label: '人數／名額', sortable: true, sortValue: (row) => row.enrolled, numeric: true, width: '6.5rem' },
    { id: 'schedule', label: '時間地點', width: '15rem' },
    { id: 'rating', label: '課程評價', align: 'center' }
  ]);
</script>

{#snippet code(row: Offering)}
  <span class="browse-code">{row.courseCode}{row.classCode ? ` · ${row.classCode} 班` : ''}{#if mode === 'instructor' && row.school === 'fcu' && row.sourceId} · 選課代碼 {row.sourceId}{/if}</span>
{/snippet}

{#snippet teachers(row: Offering)}
  {#each row.instructors as name, index (index)}{#if index > 0}、{/if}<a href={instructorHref(row.school, name)}>{name}</a>{:else}—{/each}
{/snippet}

{#snippet unit(row: Offering)}
  {#if row.department}<a href={departmentHref(row.school, row.department)}>{row.department}</a>{:else}—{/if}
{/snippet}

{#snippet enrollment(row: Offering)}
  {@const capacity = reportedCapacity(row)}
  <span class="enrollment">
    {#if row.enrolled != null && capacity != null}
      <span class="ui-tabular">{displayValue(row.enrolled)} / {displayValue(capacity)}</span>
    {:else if row.enrolled != null}
      <span class="ui-tabular">{displayValue(row.enrolled)} 人</span><small class="publication-note">名額未公布</small>
    {:else if capacity != null}
      <span class="ui-tabular">名額 {displayValue(capacity)}</span><small class="publication-note">人數未公布</small>
    {:else}
      <span title="人數與名額未公布">—</span>
    {/if}
    {#if row.enrolled != null && capacity != null && capacity > 0}
      <span class="track" aria-hidden="true"><span class="fill" class:exceeded={row.enrolled > capacity} style:inline-size={`${Math.min(100, 100 * row.enrolled / capacity)}%`}></span></span>
      {#if row.enrolled >= capacity * .9}
        <small class="capacity-note" title={`資料更新於 ${new Date(row.importedAt).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })}`}>
          {row.enrolled > capacity ? '已超過公布名額' : row.enrolled === capacity ? '人數達名額' : `匯入時餘 ${displayValue(capacity - row.enrolled)} 名`}
        </small>
      {/if}
    {/if}
  </span>
{/snippet}

{#snippet rating(row: Offering)}
  {@const stats = ratings.get(row.courseCode)}
  {#if stats?.average != null}
    <span class="ui-tabular">{stats.average.toFixed(1)} 分 · {displayValue(stats.count)} 則</span>
    {#if stats.count === 1}<small class="rating-note"><a href={`${courseHref(row)}#ratings`}>新增你的評價</a></small>{/if}
  {:else if stats}
    <small class="rating-note">尚無評價 · <a href={`${courseHref(row)}#ratings`}>留下首則</a></small>
  {:else}
    <a class="rating-note" href={`${courseHref(row)}#ratings`}>查看課程評價</a>
  {/if}
{/snippet}

{#snippet schedule(row: Offering)}
  {#each scheduleLines(row) as line, index (index)}<span class="slot">{line}</span>{:else}—{/each}
{/snippet}

<div class="table-view">
  <DataTable {caption} rows={offerings} {columns} rowKey={(row) => row.id} rowHref={courseHref} clientSort minWidth="47rem" maxHeight="none">
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
        <div><dt>類別</dt><dd>{category(row) || '—'}</dd></div>
        <div><dt>時間</dt><dd>{@render schedule(row)}</dd></div>
        <div><dt>人數</dt><dd>{@render enrollment(row)}</dd></div>
        <div><dt>評價</dt><dd>{@render rating(row)}</dd></div>
      </dl>
    </li>
  {/each}
</ul>

<style>
  .rating-note { display: block; color: var(--muted); font-size: var(--t-sm); }
  .card-view { display: none; }
  .enrollment { display: grid; min-inline-size: 3rem; gap: .25rem; }
  .track { inline-size: 100%; max-inline-size: 5rem; block-size: .375rem; margin-inline-start: auto; background: var(--line); border-radius: var(--radius-pill); }
  .fill { display: block; block-size: 100%; background: var(--brand); border-radius: inherit; }
  .fill.exceeded { background: var(--warn); }
  small { color: var(--muted); }
  .capacity-note { color: var(--warn); font-size: var(--t-sm); }
  .publication-note { color: var(--muted); font-size: var(--t-sm); }
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
