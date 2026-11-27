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
  const category = (row: Offering) => [row.credits == null ? null : `${row.credits} 學分`, requirement({ ...row, requirementText: null }) ?? requirement(row)].filter(Boolean).join(' · ');
  let columns = $derived<TableColumn<Offering>[]>([
    { id: 'course', label: '課程', value: (row) => row.title, sortable: true, width: '14rem' },
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
  <span class="browse-code offer-code" title={mode === 'instructor' && row.school === 'fcu' && row.sourceId ? `選課代碼 ${row.sourceId}` : undefined}>{row.courseCode}{row.classCode ? ` · ${row.classCode} 班` : ''}</span>
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
  <a class="rating-note" href={`${courseHref(row)}#ratings`}>看課程評價</a>
  {#if stats?.average != null}<small class="rating-sample ui-tabular">{stats.average.toFixed(1)} 分 · {displayValue(stats.count)} 則</small>
  {:else if stats}<small class="rating-sample">尚無評價</small>{/if}
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
      {:else if column.id === 'category'}<span class="category" title={requirement(row)}>{displayValue(category(row) || null)}</span>
      {:else}{displayValue(column.value?.(row))}{/if}
    {/snippet}
  </DataTable>
</div>

<ul class="card-view" aria-label={caption} role="list">
  {#each offerings as row (row.id)}
    {@const time = scheduleLines(row)}
    <li>
      <div class="card-title">
        <div class="card-course">
          <a href={courseHref(row)}>{row.title}</a>
          <div class="card-meta">
            {#if showTerm}<span class="browse-code">{row.term}</span>{/if}{@render code(row)}
            {#if row.isDemo}<Badge label="示範" tone="demo" />{/if}
          </div>
        </div>
        {@render enrollment(row)}
      </div>
      <div class="card-meta secondary-meta">
        {#if mode === 'department'}<span class="people">{@render teachers(row)}</span>
        {:else}<span class="people">{@render unit(row)}</span>{/if}
        {#if category(row)}<span class="category" title={requirement(row)}>{category(row)}</span>{/if}
        {#if mode === 'department' && row.grade}<span>{row.grade} 年級</span>{/if}
      </div>
      {#if time.length === 1}<p class="meeting">{time[0]}</p>
      {:else if time.length > 1}<details class="meeting"><summary>{time[0]}、另 {time.length - 1} 個時段</summary>{#each time.slice(1) as slot, index (index)}<p>{slot}</p>{/each}</details>{/if}
      <div class="card-rating">{@render rating(row)}</div>
    </li>
  {/each}
</ul>

<style>
  .rating-note, .rating-sample { display: block; font-size: var(--t-sm); }
  .offer-code { white-space: nowrap; }
  .category { display: block; min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
    .card-view { display: grid; list-style: none; margin: 0; padding: 0; border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--panel-raised); }
    .card-view li { min-inline-size: 0; padding: 0 var(--space-3) var(--space-1); overflow-wrap: anywhere; }
    .card-view li + li { border-block-start: 1px solid var(--line); }
    .card-title { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--space-2); }
    .card-course a { display: flex; align-items: center; width: fit-content; min-block-size: var(--target-min); font-size: var(--t-md); font-weight: 650; line-height: var(--leading-tight); }
    .card-meta, .card-rating { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0 var(--space-2); color: var(--muted); font-size: var(--t-sm); }
    .secondary-meta { margin-block-start: var(--space-1); }
    .secondary-meta .category { max-inline-size: 9rem; }
    .people { color: var(--ink-2); }
    .enrollment { text-align: end; font-size: var(--t-sm); }
    .meeting { margin: var(--space-1) 0 0; color: var(--muted); font-size: var(--t-sm); }
    .meeting summary { cursor: pointer; min-block-size: var(--target-min); align-content: center; }
    .meeting p { margin: 0; }
    .card-rating a { min-block-size: var(--target-min); align-content: center; }
  }
</style>
