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
    groupTerms?: ReadonlyMap<string, readonly (readonly [string, number])[]>;
  }

  let { offerings, mode, caption, ratings, showTerm, groupTerms }: Props = $props();
  const courseHref = (row: Offering) => `/courses/${row.id}`;
  const termColumn: TableColumn<Offering> = { id: 'term', label: '學期', value: (row) => row.term, sortable: true };
  const gradeColumn: TableColumn<Offering> = { id: 'grade', label: '年級', value: (row) => row.grade, align: 'center', width: '3.5rem' };
  const groupKey = (row: Offering) => mode === 'instructor' ? row.courseCode : row.id.toString();
  let groups = $derived.by(() => {
    const grouped = new Map<string, Offering[]>();
    for (const row of offerings) {
      const key = groupKey(row);
      const group = grouped.get(key);
      if (group) group.push(row);
      else grouped.set(key, [row]);
    }
    return [...grouped.values()];
  });
  const previewSize = (group: Offering[]) => group.length > 5 ? 2 : group.length;
  let desktopRows = $derived(groups.flatMap((group) => mode === 'instructor' ? group.slice(0, previewSize(group)) : group));
  let hasMeter = $derived(offerings.some((row) => row.enrolled != null && (reportedCapacity(row) ?? 0) > 0));
  let hasRemaining = $derived(offerings.some((row) => {
    const capacity = reportedCapacity(row);
    return row.enrolled != null && capacity != null && capacity > 0 && row.enrolled >= capacity * .9 && row.enrolled < capacity;
  }));
  let groupStarts = $derived(new Map(groups.map((group) => [group[0].id, group])));
  const category = (row: Offering) => [row.credits == null ? null : `${row.credits} 學分`, requirement({ ...row, requirementText: null }) ?? requirement(row)].filter(Boolean).join(' · ');
  let columns = $derived<TableColumn<Offering>[]>([
    { id: 'course', label: '課程', width: mode === 'department' ? 'min(30%, 19rem)' : '32%', value: (row) => row.title, sortable: true },
    ...(showTerm ? [termColumn] : []),
    mode === 'department' ? { id: 'teachers', label: '授課教師', width: '11rem' } : { id: 'unit', label: '開課單位' },
    ...(mode === 'department' && offerings.some(({ grade }) => grade) ? [gradeColumn] : []),
    { id: 'category', label: '學分／類別', value: category, width: '6.5rem' },
    { id: 'enrollment', label: '人數／名額', sortable: true, sortValue: (row) => row.enrolled, numeric: true, width: '9rem' },
    { id: 'schedule', label: '時間地點' }
  ]);

  function groupLabel(row: Offering) {
    const group = groupStarts.get(row.id);
    if (!group) return undefined;
    const terms = groupTerms?.get(row.courseCode);
    if (!terms || group.length < 2) return undefined;
    const sorted = group.map(({ term }) => term).sort();
    const total = terms.reduce((sum, [, count]) => sum + count, 0);
    const range = sorted[0] !== sorted.at(-1) ? `${sorted[0]} 至 ${sorted.at(-1)}` : sorted[0];
    return `${row.title} · ${row.courseCode} · ${displayValue(group.length)} 班 · ${range}${group.length < total ? `（本頁／共 ${displayValue(total)} 班）` : ''}`;
  }
</script>

{#snippet code(row: Offering)}
  <span class="browse-code offer-code" title={row.school === 'fcu' && row.sourceId ? `選課代碼 ${row.sourceId}` : undefined}>{row.courseCode}{row.classCode ? ` · ${row.classCode} 班` : ''}{mode === 'department' && row.sourceId && row.sourceId !== row.courseCode && row.sourceId !== row.classCode ? ` · 選課 ${row.sourceId}` : ''}</span>
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

{#if hasMeter}<p class="browse-note offering-legend">條長為滿額比例。{#if hasRemaining}「餘」為匯入時剩餘名額。{/if}</p>{/if}
<div class="table-view" class:instructor={mode === 'instructor'}>
  {@render desktopTable(desktopRows, caption, true)}
  {#if mode === 'instructor'}{#each groups.filter((group) => previewSize(group) < group.length) as group (group[0].id)}
    <details class="more-offerings"><summary>{group[0].title} · 顯示其餘 {group.length - previewSize(group)} 班</summary>
      {@render desktopTable(group.slice(previewSize(group)), `${group[0].title}其餘班次`, false)}
    </details>
  {/each}{/if}
</div>

{#snippet desktopTable(rows: Offering[], title: string, headings: boolean)}
  <DataTable caption={title} {rows} {columns} rowKey={(row) => row.id} rowHref={courseHref} groupLabel={headings ? groupLabel : undefined} minWidth="47rem" maxHeight="none" scrollHint={false}>
    {#snippet cell(row, column)}
      {#if column.id === 'course'}
        <span class="browse-course-cell">
          <span>{row.title}</span>{@render code(row)}
          {#if row.isDemo}<Badge label="示範" tone="demo" />{/if}
        </span>
      {:else if column.id === 'teachers'}{@render teachers(row)}
      {:else if column.id === 'unit'}{@render unit(row)}
      {:else if column.id === 'enrollment'}{@render enrollment(row)}{@render rating(row)}
      {:else if column.id === 'schedule'}{@render schedule(row)}
      {:else if column.id === 'category'}<span class="category" title={row.credits === 0 ? '校方列為 0 學分' : requirement(row)}>{displayValue(category(row) || null)}</span>
      {:else}{displayValue(column.value?.(row))}{/if}
    {/snippet}
  </DataTable>
{/snippet}

<ul class="card-view" class:department={mode === 'department'} aria-label={caption} role="list">
  {#each groups as group (group[0].id)}
    {#each group.slice(0, previewSize(group)) as row (row.id)}{@render card(row, true)}{/each}
    {#if previewSize(group) < group.length}<li class="extra-group"><details class="more-offerings"><summary>{group[0].title} · 顯示其餘 {group.length - previewSize(group)} 班</summary>
      <ul aria-label={`${group[0].title}其餘班次`}>{#each group.slice(previewSize(group)) as row (row.id)}{@render card(row, false)}{/each}</ul>
    </details></li>{/if}
  {/each}
</ul>

{#snippet card(row: Offering, heading: boolean)}
    {@const time = scheduleLines(row)}
    <li>
      {#if heading && groupLabel(row)}<p class="card-term ui-tabular">{groupLabel(row)}</p>{/if}
      <div class="card-title">
        <a class="card-course" href={courseHref(row)}>{row.title}</a>
        <div class="card-meta">
          {#if showTerm}<span class="browse-code">{row.term}</span>{/if}{@render code(row)}
          {#if category(row)}<span title={row.credits === 0 ? '校方列為 0 學分' : requirement(row)}>{category(row)}</span>{/if}
          {#if mode === 'department' && row.grade}<span>{row.grade} 年級</span>{/if}
          {#if row.isDemo}<Badge label="示範" tone="demo" />{/if}
        </div>
        {@render enrollment(row)}
      </div>
      <div class="card-meta secondary-meta">
        {#if mode === 'department'}<div class="people">{@render teachers(row)}</div>
        {:else}<div class="people">{@render unit(row)}</div>{/if}
        {#if time.length}<span class="meeting">{time.join('；')}</span>{:else if mode === 'instructor'}<span>時地未公布</span>{/if}
        {@render rating(row)}
      </div>
    </li>
{/snippet}

<style>
  .table-view.instructor { --table-group-bg: var(--panel); --table-group-font-size: .8125rem; }
  .table-view { --table-pad-block: .25rem; }
  .table-view :global(caption) { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); }
  .table-view .browse-course-cell { padding-block: .15rem; }
  .table-view .offer-code { line-height: var(--leading-table); }
  .rating-sample { display: inline-flex; align-items: center; font-size: var(--t-sm); font-weight: 650; }
  .teachers, .more-offerings { color: var(--ink-2); }
  .teachers { font-size: var(--t-sm); }
  :is(.teachers, .more-offerings) > summary { width: fit-content; min-height: var(--target-min); align-content: center; cursor: pointer; color: var(--brand-ink); }
  .table-view .teachers > summary { min-height: 1.5rem; }
  .offering-legend { margin-block-end: var(--space-1); }
  .offer-code { overflow-wrap: anywhere; }
  .category { display: block; min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .card-view { display: none; }
  .enrollment { display: grid; min-inline-size: 3rem; gap: .25rem; }
  .enrollment-value { display: flex; align-items: center; justify-content: end; gap: var(--space-1); }
  .meter-line { display: flex; align-items: center; justify-content: end; gap: var(--space-1); min-block-size: 1rem; }
  .track { inline-size: min(100%, 7.5rem); min-inline-size: 1.5rem; block-size: .375rem; background: var(--line); border-radius: var(--radius-pill); }
  .fill { display: block; block-size: 100%; background: var(--brand); border-radius: inherit; }
  .fill.exceeded { background: var(--warn); }
  small { color: var(--muted); }
  .capacity-note { padding-inline: var(--space-1); border-radius: var(--radius-control); background: var(--warn-wash); color: var(--warn); font-size: var(--t-sm); font-weight: 700; white-space: nowrap; }
  .publication-note { color: var(--ink-2); font-size: var(--t-sm); }
  .slot { display: block; overflow-wrap: anywhere; }
  @media (max-width: 40rem) {
    .table-view { display: none; }
    .card-view { display: grid; list-style: none; margin: 0; padding: 0; border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--panel-raised); }
    .card-view li { min-inline-size: 0; padding: 0 var(--space-3) var(--space-2); overflow-wrap: anywhere; }
    .department li { padding-inline: var(--space-2); }
    .department .secondary-meta { margin-block-start: .125rem; }
    .card-view li + li { border-block-start: 1px solid var(--line); }
    .card-title { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; column-gap: var(--space-2); }
    .card-course { grid-column: 1; display: flex; align-items: center; min-block-size: var(--target-min); font-size: var(--t-md); font-weight: 650; line-height: var(--leading-tight); }
    .card-view .card-term { margin-inline: calc(-1 * var(--space-3)); padding: var(--space-1) var(--space-3); background: var(--table-head); color: var(--ink-2); font-size: var(--t-sm); font-weight: 650; }
    .card-meta { grid-row: 2; grid-column: 1 / -1; display: flex; align-items: baseline; flex-wrap: wrap; gap: 0 var(--space-2); color: var(--muted); font-size: var(--t-sm); }
    .secondary-meta { margin-block-start: var(--space-1); color: var(--ink-2); }
    .track { inline-size: min(100%, 5.5rem); }
    .people { color: var(--ink-2); }
    .enrollment { grid-row: 1; grid-column: 2; max-width: 7.5rem; text-align: end; font-size: var(--t-sm); gap: 0; }
    .enrollment .meter-line { min-block-size: .6rem; }
    .rating-sample { min-block-size: var(--target-min); }
    .extra-group ul { list-style: none; padding: 0; }
  }
</style>
