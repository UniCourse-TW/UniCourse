<script lang="ts">
  import type { Offering, RatingStats } from '@unicourse/api-client';
  import { isHttpUrl, requirement } from '$lib/format';
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
    groupTerms?: ReadonlyMap<string, readonly (readonly [string, number])[]>;
  }

  let { offerings, mode, caption, ratings, showTerm, groupTerms }: Props = $props();
  const courseHref = (row: Offering) => `/courses/${row.id}`;
  const termColumn: TableColumn<Offering> = { id: 'term', label: '學期', value: (row) => row.term, sortable: true };
  const gradeColumn: TableColumn<Offering> = { id: 'grade', label: '年級', value: (row) => row.grade, align: 'center', width: '3.5rem' };
  let groups = $derived.by(() => {
    const grouped = new Map<string, Offering[]>();
    for (const row of offerings) {
      const key = row.courseCode;
      const group = grouped.get(key);
      if (group) group.push(row);
      else grouped.set(key, [row]);
    }
    return [...grouped.values()];
  });
  const previewSize = (group: Offering[]) => group.length > 5 ? 2 : group.length;
  let initialCount = $derived(groups.reduce((sum, group) => sum + previewSize(group), 0));
  let mobileGroups = $derived(mode === 'instructor' ? groups : offerings.map((row) => [row]));
  let hasRemaining = $derived(offerings.some((row) => {
    const capacity = reportedCapacity(row);
    return row.enrolled != null && capacity != null && capacity > 0 && row.enrolled >= capacity * .9 && row.enrolled < capacity;
  }));
  const category = (row: Offering) => [row.credits == null ? null : `${row.credits} 學分`, requirement({ ...row, requirementText: null }) ?? requirement(row)].filter(Boolean).join(' · ');
  let columns = $derived<TableColumn<Offering>[]>([
    { id: 'course', label: '課程', width: mode === 'department' ? '27%' : '32%', value: (row) => row.title, sortable: true },
    ...(showTerm ? [termColumn] : []),
    mode === 'department' ? { id: 'teachers', label: '授課教師', width: '9rem' } : { id: 'unit', label: '開課單位' },
    ...(mode === 'department' && offerings.some(({ grade }) => grade) ? [gradeColumn] : []),
    { id: 'category', label: '學分／類別', value: category, width: '8rem' },
    { id: 'enrollment', label: mode === 'department' ? '匯入時人數／名額' : '人數／名額', sortable: true, sortValue: (row) => row.enrolled, numeric: true, width: '9rem' },
    { id: 'schedule', label: '時間地點' }
  ]);

  function groupLabel(group: Offering[]) {
    const row = group[0];
    const terms = groupTerms?.get(row.courseCode);
    if (!terms || group.length < 2) return undefined;
    const sorted = group.map(({ term }) => term).sort();
    const total = terms.reduce((sum, [, count]) => sum + count, 0);
    const range = sorted[0] !== sorted.at(-1) ? `${sorted[0]} 至 ${sorted.at(-1)}` : sorted[0];
    return `${row.title} · ${row.courseCode} · ${displayValue(group.length)} 班 · ${range}${group.length < total ? `（本頁／共 ${displayValue(total)} 班）` : ''}`;
  }
</script>

{#snippet classIds(row: Offering)}
  {#if row.classCode}<span>{row.classCode} 班</span>{/if}
  {#if row.sourceId && row.sourceId !== row.courseCode && row.sourceId !== row.classCode}
    <span>選課 <span class="ui-tabular">{row.sourceId}</span></span>
  {/if}
{/snippet}

{#snippet teachers(row: Offering)}
  {#each row.instructors.slice(0, 2) as name, index (index)}{#if index > 0}、{/if}<a href={instructorHref(row.school, name)}>{name}</a>{:else}<span class="publication-note" title="校方未列教師">教師未列</span>{/each}
  {#if row.instructors.length > 2}<details class="teachers"><summary>另 {row.instructors.length - 2} 位</summary>{#each row.instructors.slice(2) as name, index (index)}{#if index > 0}、{/if}<a href={instructorHref(row.school, name)}>{name}</a>{/each}</details>{/if}
{/snippet}

{#snippet unit(row: Offering)}
  {#if row.department}<a href={departmentHref(row.school, row.department)}>{row.department}</a>{:else}—{/if}
{/snippet}

{#snippet enrollment(row: Offering)}
  {@const capacity = reportedCapacity(row)}
  <span class="enrollment">
    {#if row.enrolled != null && capacity != null}
      <span class="enrollment-value"><span class="ui-tabular">{displayValue(row.enrolled)} / {displayValue(capacity)}</span>
        {#if capacity > 0 && row.enrolled >= capacity * .9}
          <small class="capacity-note" title={row.enrolled >= capacity ? '已達校方公布名額' : `匯入時餘 ${displayValue(capacity - row.enrolled)} 名`}>
            {row.enrolled > capacity ? '超額' : row.enrolled === capacity ? '額滿' : `餘 ${displayValue(capacity - row.enrolled)}`}
          </small>
        {/if}
      </span>
      {#if mode === 'department' && capacity > 0 && row.enrolled >= capacity * .9 && isHttpUrl(row.sourceUrl)}
        <a class="official-source" href={row.sourceUrl} rel="external" aria-label={`查校方：${row.title} ${row.classCode ?? row.courseCode}（外部網站）`}>查校方 ↗</a>
      {/if}
    {:else if row.enrolled != null}
      <span class="ui-tabular">{displayValue(row.enrolled)} 人</span><small class="publication-note">名額未公布</small>
    {:else if capacity != null}
      <span class="ui-tabular">名額 {displayValue(capacity)}</span><small class="publication-note">人數未公布</small>
    {:else}
      <span class="publication-note">人數、名額未公布</span>
    {/if}
    {#if row.enrolled != null && capacity != null && capacity > 0}
      <span class="meter-line">
        <span class="track" aria-hidden="true"><span class="fill" class:exceeded={row.enrolled > capacity} style:inline-size={`${Math.min(100, 100 * row.enrolled / capacity)}%`}></span></span>
      </span>
    {/if}
  </span>
{/snippet}

{#snippet rating(row: Offering)}
  {@const stats = ratings.get(row.courseCode)}
  {#if stats?.average != null}<a class="rating-sample ui-tabular" href={`${courseHref(row)}#ratings`} aria-label={`${row.title}的課程評價：${stats.average.toFixed(1)} 分，${displayValue(stats.count)} 則`}>★ {stats.average.toFixed(1)} · {displayValue(stats.count)} 則</a>{/if}
{/snippet}

{#snippet schedule(row: Offering)}
  {#each scheduleLines(row) as line, index (index)}<span class="slot">{line}</span>{:else}<span class="publication-note">時地未公布</span>{/each}
{/snippet}

{#if mode === 'department'}
  <div class="table-view">
    <DataTable {caption} rows={offerings} {columns} rowKey={(row) => row.id} minWidth="47rem" maxHeight="none" scrollHint={false}>
      {#snippet cell(row, column)}{@render cellContent(row, column)}{/snippet}
    </DataTable>
  </div>
{:else}
  <div class="offering-legend">
    {#if initialCount < offerings.length}<p class="browse-note">先列 {displayValue(initialCount)}／{displayValue(offerings.length)} 班，其餘可在各課程內展開。</p>{/if}
    {#if hasRemaining}<p class="browse-note">「餘」為匯入時剩餘名額。</p>{/if}
  </div>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (The region supports native keyboard scrolling.) -->
  <div class="table-view grouped-table" role="region" aria-label="授課班次表格" tabindex="0">
    <table>
      <caption>{caption}</caption>
      <thead><tr>{#each columns as column (column.id)}<th scope="col" class:numeric={column.numeric} style:width={column.width}>{column.label}</th>{/each}</tr></thead>
      {#each groups as group (group[0].id)}
        {@const heading = groupLabel(group)}
        {@const count = previewSize(group)}
        <tbody>
          {#if heading}<tr class="group-heading"><th scope="rowgroup" colspan={columns.length}>{heading}</th></tr>{/if}
          {#each group.slice(0, count) as row (row.id)}{@render tableRow(row)}{/each}
          {#if count < group.length}
            <tr class="expand"><td colspan={columns.length}><details><summary>顯示其餘 {displayValue(group.length - count)} 班<span class="visually-hidden">（{group[0].title}）</span></summary></details></td></tr>
            {#each group.slice(count) as row (row.id)}{@render tableRow(row, true)}{/each}
          {/if}
        </tbody>
      {/each}
    </table>
  </div>
{/if}

{#snippet tableRow(row: Offering, extra = false)}
  <tr class:extra>
    {#each columns as column (column.id)}
      {#if column.id === 'course'}<th scope="row">{@render cellContent(row, column)}</th>
      {:else}<td class:numeric={column.numeric}>{@render cellContent(row, column)}</td>{/if}
    {/each}
  </tr>
{/snippet}

{#snippet cellContent(row: Offering, column: TableColumn<Offering>)}
  {#if column.id === 'course'}
    <span class="browse-course-cell">
      <a class="course-link" href={courseHref(row)}><strong>{row.title}</strong><span class="offer-code">{row.courseCode}</span></a>
      <span class="offering-ids">{@render classIds(row)}</span>
      {#if row.isDemo}<Badge label="示範" tone="demo" />{/if}
    </span>
  {:else if column.id === 'teachers'}{@render teachers(row)}
  {:else if column.id === 'unit'}{@render unit(row)}
  {:else if column.id === 'enrollment'}{@render enrollment(row)}{@render rating(row)}
  {:else if column.id === 'schedule'}{@render schedule(row)}
  {:else if column.id === 'category'}<span title={row.credits === 0 ? '校方列為 0 學分' : requirement(row)}>{displayValue(category(row) || null)}</span>
  {:else}{displayValue(column.value?.(row))}{/if}
{/snippet}

<ul class="card-view" class:department={mode === 'department'} aria-label={caption} role="list">
  {#each mobileGroups as group (group[0].id)}
    {@const heading = groupLabel(group)}
    {#each group.slice(0, previewSize(group)) as row, index (row.id)}{@render card(row, index === 0 ? heading : undefined)}{/each}
    {#if previewSize(group) < group.length}
      <li class="extra-group"><details class="more-offerings">
        <summary>顯示其餘 {displayValue(group.length - previewSize(group))} 班 · {group[0].title}</summary>
        <ul aria-label={`${group[0].title}其餘班次`}>{#each group.slice(previewSize(group)) as row (row.id)}{@render card(row)}{/each}</ul>
      </details></li>
    {/if}
  {/each}
</ul>

{#snippet card(row: Offering, heading?: string)}
  <li>
    {#if heading}<p class="card-term ui-tabular">{heading}</p>{/if}
    <div class="card-title">
      <a class="card-course" href={courseHref(row)}>{row.title}</a>
      {@render enrollment(row)}
    </div>
    <div class="card-meta">
      {#if showTerm}<span class="offer-code">{row.term}</span>{/if}
      <span class="offer-code">{row.courseCode}</span>
      {@render classIds(row)}
      {#if category(row)}<span title={row.credits === 0 ? '校方列為 0 學分' : requirement(row)}>{category(row)}</span>{/if}
      {#if mode === 'department' && row.grade}<span>{row.grade} 年級</span>{/if}
      {#if row.isDemo}<Badge label="示範" tone="demo" />{/if}
    </div>
    <div class="secondary-meta">
      <div class="people">{#if mode === 'department'}{@render teachers(row)}{:else}{@render unit(row)}{/if}</div>
      <div class="meeting">{@render schedule(row)}</div>
      {@render rating(row)}
    </div>
  </li>
{/snippet}

<style>
  .table-view { --table-pad-block: .25rem; }
  .table-view :global(caption), .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .table-view .browse-course-cell { gap: .08rem; padding-block: .15rem; }
  .course-link { display: grid; justify-items: start; color: var(--brand-ink); text-decoration: none; }
  .course-link:hover strong, .course-link .offer-code { text-decoration: underline; text-underline-offset: .2em; }
  .offer-code { font: 600 var(--t-sm) / var(--leading-table) var(--font-mono); overflow-wrap: anywhere; }
  .offering-ids { display: inline-flex; flex-wrap: wrap; gap: 0 var(--space-2); color: var(--muted); font-size: var(--t-sm); font-weight: 450; }
  .offering-ids:empty, .offering-legend:empty { display: none; }
  .rating-sample { display: inline-flex; align-items: center; font-size: var(--t-sm); font-weight: 650; }
  .teachers, .more-offerings { color: var(--ink-2); }
  .teachers { font-size: var(--t-sm); }
  details > summary { width: fit-content; min-height: var(--target-min); align-content: center; cursor: pointer; color: var(--brand-ink); }
  .table-view .teachers > summary { min-height: 1.5rem; }
  .table-view .course-link strong { font-weight: 650; }
  .card-view { display: none; }
  .enrollment { display: grid; min-inline-size: 3rem; gap: .15rem; }
  .enrollment-value { display: flex; align-items: center; justify-content: end; gap: var(--space-1); font-weight: 700; white-space: nowrap; }
  .meter-line { display: flex; align-items: center; justify-content: end; gap: var(--space-1); min-block-size: .6rem; }
  .track { inline-size: min(100%, 7.5rem); min-inline-size: 1.5rem; block-size: .375rem; background: var(--line); border-radius: var(--radius-pill); }
  .fill { display: block; block-size: 100%; background: var(--brand); border-radius: inherit; }
  .fill.exceeded { background: var(--warn); }
  .capacity-note { padding-inline: var(--space-1); border-radius: var(--radius-control); background: var(--warn-wash); color: var(--warn); font-size: var(--t-sm); font-weight: 650; white-space: nowrap; }
  .official-source { justify-self: end; font-size: var(--t-sm); line-height: 1.35; }
  .publication-note { color: var(--ink-2); font-size: var(--t-sm); }
  .slot { display: block; overflow-wrap: anywhere; }
  .grouped-table { position: relative; overflow-x: auto; scrollbar-width: thin; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
  .grouped-table:focus-visible { outline-offset: -2px; }
  table { inline-size: 100%; min-inline-size: 47rem; border-collapse: separate; border-spacing: 0; font-size: var(--t-base); line-height: var(--leading-table); }
  th, td { padding: .35rem .65rem; border-block-end: 1px solid var(--line); text-align: start; }
  th { font-weight: 650; }
  thead th, .group-heading th { background: var(--table-head); color: var(--ink-2); font-size: var(--t-sm); }
  .group-heading th { background: var(--panel); font-size: .8125rem; }
  tbody tr:hover, tbody tr:focus-within { background: var(--hover-row); }
  .numeric { text-align: end; font-variant-numeric: tabular-nums; }
  .expand td { padding-block: 0; }
  .extra { display: none; }
  tbody:has(.expand details[open]) .extra { display: table-row; }
  tbody:last-child:not(:has(.expand details:not([open]))) tr:last-child > *, tbody:last-child .expand:has(details:not([open])) td { border-block-end: 0; }
  @media (max-width: 40rem) {
    .table-view { display: none; }
    .card-view { display: grid; list-style: none; margin: 0; padding: 0; border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--panel-raised); }
    .card-view li { min-inline-size: 0; padding: 0 var(--space-3) var(--space-2); overflow-wrap: anywhere; }
    .card-view li + li { border-block-start: 1px solid var(--line); }
    .card-title { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; column-gap: var(--space-2); }
    .card-course { display: flex; align-items: center; min-block-size: var(--target-min); font-size: var(--t-md); font-weight: 650; line-height: var(--leading-tight); }
    .card-view .card-term { margin-inline: calc(-1 * var(--space-3)); padding: var(--space-1) var(--space-3); background: var(--table-head); color: var(--ink-2); font-size: var(--t-sm); font-weight: 650; }
    .card-meta, .secondary-meta { font-size: var(--t-sm); line-height: 1.38; }
    .card-meta { display: flex; align-items: baseline; flex-wrap: wrap; gap: .05rem var(--space-2); color: var(--ink-2); }
    .card-meta .offer-code { color: var(--ink); }
    .secondary-meta { display: grid; gap: .125rem; margin-block-start: .15rem; color: var(--ink-2); }
    .track { inline-size: min(100%, 5.5rem); }
    .enrollment { max-width: 8rem; text-align: end; font-size: var(--t-sm); line-height: 1.3; }
    .official-source { display: inline-flex; align-items: center; min-height: var(--target-min); margin-block: -.65rem; padding-inline: .2rem; }
    .rating-sample { min-block-size: var(--target-min); width: fit-content; }
    .extra-group ul { list-style: none; padding: 0; }
    .extra-group ul li { padding-inline: 0; }
    .department li { padding-inline: var(--space-2); }
    .department .card-meta { font-size: var(--t-sm); }
    .department .secondary-meta { grid-template-columns: minmax(0, 1fr) auto; }
    .department .people { grid-column: 1; }
    .department .meeting { grid-column: 1 / -1; }
    .department .rating-sample { grid-column: 2; grid-row: 1; min-block-size: var(--target-min); }
  }
</style>
