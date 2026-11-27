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
    oldestFirst?: boolean;
    order?: { column: string; direction: 'ascending' | 'descending' };
    groupTerms?: ReadonlyMap<string, readonly (readonly [string, number])[]>;
  }

  let { offerings, mode, caption, ratings, showTerm, oldestFirst = false, order, groupTerms }: Props = $props();
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
  const listId = $props.id();
  let initialCount = $derived(groups.reduce((sum, group) => sum + previewSize(group), 0));
  let mobileCount = $derived(groups.length);

  let mostlyUnpublishedCapacity = $derived(
    offerings.length >= 4 && offerings.filter((row) => reportedCapacity(row) === null).length > offerings.length * .75
  );
  let hasRemaining = $derived(offerings.some((row) => {
    const capacity = reportedCapacity(row);
    return row.enrolled != null && capacity != null && capacity > 0 && row.enrolled >= capacity * .9 && row.enrolled < capacity;
  }));
  let hasExcess = $derived(offerings.some((row) => {
    const capacity = reportedCapacity(row);
    return row.enrolled != null && capacity != null && row.enrolled > capacity;
  }));
  const category = (row: Offering) => [row.credits == null ? null : `${row.credits} 學分${row.credits === 0 ? '（校方）' : ''}`, requirement({ ...row, requirementText: null }) ?? requirement(row)].filter(Boolean).join(' · ');
  let columns = $derived<TableColumn<Offering>[]>([
    { id: 'course', label: '課程', width: mode === 'department' ? 'min(30%, 18rem)' : '27%', value: (row) => row.title, sortable: true },
    ...(showTerm ? [termColumn] : []),
    mode === 'department' ? { id: 'teachers', label: '授課教師', width: '12rem' } : { id: 'unit', label: '開課單位' },
    ...(mode === 'department' && offerings.some(({ grade }) => grade) ? [gradeColumn] : []),
    { id: 'category', label: '學分／類別', value: category, width: '8.75rem' },
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
    const departments = [...new Set(group.map(({ department }) => department).filter(Boolean))];
    const unit = departments.length > 1 ? `${departments[0]}等 ${displayValue(departments.length)} 個單位` : departments[0];
    return {
      title: row.title,
      code: row.courseCode,
      unit,
      count: group.length < total ? `本頁 ${displayValue(group.length)}／共 ${displayValue(total)} 班` : `${displayValue(group.length)} 班`,
      range
    };
  }
</script>

{#snippet classIds(row: Offering)}
  {#if row.classCode}<span>{row.classCode} 班</span>{/if}
  {#if row.sourceId && row.sourceId !== row.courseCode && row.sourceId !== row.classCode}
    <span>選課 <span class="ui-tabular">{row.sourceId}</span></span>
  {/if}
{/snippet}

{#snippet teachers(row: Offering)}
  {#each row.instructors.slice(0, 2) as name, index (index)}{#if index > 0}、{/if}<a href={instructorHref(row.school, name)}>{name}</a>{:else}<span class="publication-note" title="校方未列教師">校方未列教師</span>{/each}
  {#if row.instructors.length > 2}<details class="teachers"><summary>另 {row.instructors.length - 2} 位</summary>{#each row.instructors.slice(2) as name, index (index)}{#if index > 0}、{/if}<a href={instructorHref(row.school, name)}>{name}</a>{/each}</details>{/if}
{/snippet}

{#snippet unit(row: Offering)}
  {#if row.department}<a href={departmentHref(row.school, row.department)}>{row.department}</a>{:else}—{/if}
{/snippet}

{#snippet enrollment(row: Offering, phone = false)}
  {@const capacity = reportedCapacity(row)}
  <span class="enrollment">
    {#if row.enrolled != null && capacity != null}
      {#if phone && mode === 'department' && capacity > 0 && row.enrolled >= capacity * .9}
        <small class="import-label">匯入時</small>
      {/if}
      <span class="enrollment-value"><span class="ui-tabular">{displayValue(row.enrolled)} / {displayValue(capacity)}</span>
        {#if capacity > 0 && row.enrolled >= capacity * .9}
          <small class="capacity-note" title={row.enrolled >= capacity ? '匯入時已達校方公布名額' : `匯入時餘 ${displayValue(capacity - row.enrolled)} 名`}>
            {row.enrolled > capacity ? '超額' : row.enrolled === capacity ? '額滿' : `餘 ${displayValue(capacity - row.enrolled)}`}
          </small>
        {/if}
      </span>
    {:else if row.enrolled != null}
      <span class="ui-tabular">{displayValue(row.enrolled)} 人</span>{#if !mostlyUnpublishedCapacity}<small class="publication-note">名額未公布</small>{/if}
    {:else if capacity != null}
      <span class="ui-tabular">名額 {displayValue(capacity)}</span><small class="publication-note">人數未公布</small>
    {:else}
      <span class="publication-note">人數、名額未公布</span>
    {/if}
    {#if row.enrolled != null && capacity != null && capacity > 0}
      {@const total = Math.max(row.enrolled, capacity)}
      <span class="meter-line">
        <span class="track" aria-hidden="true">
          <span class="fill" class:positive={row.enrolled > 0} style:inline-size={`${100 * Math.min(row.enrolled, capacity) / total}%`}></span>
          {#if row.enrolled > capacity}<span class="excess"></span>{/if}
        </span>
      </span>
      {#if !phone}{@render officialSource(row)}{/if}
    {/if}
  </span>
{/snippet}

{#snippet officialSource(row: Offering)}
  {@const capacity = reportedCapacity(row)}
  {#if mode === 'department' && capacity != null && capacity > 0 && row.enrolled != null && row.enrolled >= capacity * .9 && isHttpUrl(row.sourceUrl)}
    <a class="official-source" href={row.sourceUrl} rel="external" aria-label={`查校方名額：${row.title} ${row.classCode ?? row.courseCode}（外部網站）`}>查校方 ↗</a>
  {/if}
{/snippet}

{#snippet rating(row: Offering)}
  {@const stats = ratings.get(row.courseCode)}
  {#if stats?.average != null}<a class="rating-sample ui-tabular" href={`${courseHref(row)}#ratings`} aria-label={`${row.title}的課程評價：${stats.average.toFixed(1)} 分，${displayValue(stats.count)} 則`}>★ {stats.average.toFixed(1)} · {displayValue(stats.count)} 則</a>{/if}
{/snippet}

{#snippet schedule(row: Offering)}
  {#each scheduleLines(row) as line, index (index)}<span class="slot">{line}</span>{:else}<span class="publication-note">時地未公布</span>{/each}
{/snippet}

{#if mostlyUnpublishedCapacity}<p class="browse-note">本頁多數班次的名額未公布。</p>{/if}
{#if mode === 'department'}
  {#if hasExcess}<p class="browse-note">橘色段為超出名額的人數。</p>{/if}
  <div class="table-view department-table">
    <DataTable {caption} rows={offerings} {columns} rowKey={(row) => row.id} {order} minWidth="47rem" maxHeight="none" scrollHint={false}>
      {#snippet cell(row, column)}{@render cellContent(row, column)}{/snippet}
    </DataTable>
  </div>
{:else}
  <div class="offering-legend">
    {#if offerings.length > 1}<p class="browse-note">依各課程{oldestFirst ? '最早' : '最新'}班次的學期排序，組內同序。</p>{/if}
    {#if hasRemaining || hasExcess}<p class="browse-note">{hasRemaining ? '「餘」為匯入時餘額。' : ''}{hasExcess ? '橘色段為超出名額的人數。' : ''}</p>{/if}
    {#if mobileCount < offerings.length}
      <details class="all-offerings" class:phone-only={initialCount === offerings.length}>
        <summary aria-controls={`${listId}-table ${listId}-cards`}><span class="closed-label">顯示本頁全部 {displayValue(offerings.length)} 班</span><span class="open-label">收合班次</span></summary>
      </details>
    {/if}
  </div>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (The region supports native keyboard scrolling.) -->
  <div class="table-view grouped-table" id={`${listId}-table`} role="region" aria-label="授課班次表格" tabindex="0">
    <table>
      <caption>{caption}</caption>
      <thead><tr>{#each columns as column (column.id)}<th scope="col" class:numeric={column.numeric} style:width={column.width}>{column.label}</th>{/each}</tr></thead>
      {#each groups as group (group[0].id)}
        {@const heading = groupLabel(group)}
        {@const count = previewSize(group)}
        <tbody>
          {#if heading}<tr class="group-heading"><th scope="rowgroup" colspan={columns.length}>{@render groupHeading(heading)}</th></tr>{/if}
          {#each group.slice(0, count) as row (row.id)}{@render tableRow(row)}{/each}
          {#if count < group.length}
            <tr class="expand"><td colspan={columns.length}><details><summary>顯示其餘 {displayValue(group.length - count)} 班 <span class="offer-code">· {group[0].courseCode}</span><span class="visually-hidden">（{group[0].title}）</span></summary></details></td></tr>
            {#each group.slice(count) as row (row.id)}{@render tableRow(row, true)}{/each}
          {/if}
        </tbody>
      {/each}
    </table>
  </div>
{/if}

{#snippet groupHeading(heading: NonNullable<ReturnType<typeof groupLabel>>)}
  <span class="group-meta">
    <strong>{heading.title} <span class="offer-code">{heading.code}</span></strong>
    {#if heading.unit}<span>{heading.unit}</span>{/if}
    <span>{heading.count} · <span class="ui-tabular">{heading.range}</span></span>
  </span>
{/snippet}

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
      <a class="course-link" href={courseHref(row)}><strong>{row.title}</strong></a>
      <span class="offering-ids"><span class="offer-code">{row.courseCode}</span>{@render classIds(row)}</span>
      {#if row.isDemo}<Badge label="示範" tone="demo" />{/if}
    </span>
  {:else if column.id === 'teachers'}{@render teachers(row)}
  {:else if column.id === 'unit'}{@render unit(row)}
  {:else if column.id === 'enrollment'}{@render enrollment(row)}{@render rating(row)}
  {:else if column.id === 'schedule'}{@render schedule(row)}
  {:else if column.id === 'category'}<span title={row.credits === 0 ? '校方列為 0 學分' : requirement(row)}>{displayValue(category(row) || null)}</span>
  {:else}{displayValue(column.value?.(row))}{/if}
{/snippet}

<ul class="card-view" class:department={mode === 'department'} aria-label={caption} role="list" id={`${listId}-cards`}>
  {#if mode === 'department'}
    {#each offerings as row (row.id)}<li>{@render card(row)}</li>{/each}
  {:else}
    {#each groups as group (group[0].id)}
      {@const first = group[0]}
      {#if group.length === 1}
        <li>{@render card(first)}</li>
      {:else}
        <li class="course-group">
          <div class="static-group-title">{@render groupTitle(first)}</div>
          <details class="more-offerings">
            <summary aria-controls={`${listId}-${first.id}-classes`}>
              {@render groupTitle(first)}
              <span class="group-action"><span class="closed-label">另 {displayValue(group.length - 1)} 班</span><span class="open-label">收合</span><span class="group-arrow" aria-hidden="true">⌄</span></span>
            </summary>
          </details>
          {@render card(first, true)}
          <ul class="extra-cards" id={`${listId}-${first.id}-classes`} aria-label={`${first.title}其餘班次`}>
            {#each group.slice(1) as row (row.id)}<li>{@render card(row, true)}</li>{/each}
          </ul>
        </li>
      {/if}
    {/each}
  {/if}
</ul>

{#snippet groupTitle(row: Offering)}
  <span class="group-title">{row.title} <span class="offer-code">{row.courseCode}</span></span>
{/snippet}

{#snippet card(row: Offering, grouped = false)}
  <div class="card-body">
    <div class="card-title" class:with-term={showTerm && !grouped}>
      {#if showTerm && !grouped}<span class="card-semester offer-code">{row.term}</span>{/if}
      <a class="card-course" href={courseHref(row)}>{grouped ? `${row.term} 班次 →` : row.title}</a>
      {@render enrollment(row, true)}
    </div>
    <div class="card-details">
      <div class="card-meta">
        <span class="card-ids">{#if !grouped}<span class="offer-code">{row.courseCode}</span>{/if}{@render classIds(row)}</span>
        {#if category(row) || (mode === 'department' && row.grade) || row.isDemo}
          <span class="card-category">
            {#if category(row)}<span title={row.credits === 0 ? '校方列為 0 學分' : requirement(row)}>{category(row)}</span>{/if}
            {#if mode === 'department' && row.grade}<span>{row.grade} 年級</span>{/if}
            {#if row.isDemo}<Badge label="示範" tone="demo" />{/if}
          </span>
        {/if}
      </div>
      <div class="secondary-meta">
        <div class="people">{#if mode === 'department'}{@render teachers(row)}{:else}{@render unit(row)}{/if}</div>
        <div class="meeting">{@render schedule(row)}</div>
        {@render rating(row)}
      </div>
      {@render officialSource(row)}
    </div>
  </div>
{/snippet}

<style>
  .table-view { --table-pad-block: .25rem; }
  .table-view :global(caption), .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .table-view .browse-course-cell { gap: .08rem; padding-block: .15rem; }
  .course-link { display: grid; justify-items: start; color: var(--brand-ink); text-decoration: none; }
  .course-link:hover strong, .course-link:focus-visible strong { text-decoration: underline; text-underline-offset: .2em; }
  .offer-code { font: 600 var(--t-sm) / var(--leading-table) var(--font-mono); overflow-wrap: anywhere; }
  .offering-ids { display: inline-flex; flex-wrap: wrap; gap: 0 var(--space-2); color: var(--ink-2); font-size: var(--t-sm); font-weight: 450; }
  .department-table .browse-course-cell { max-inline-size: 18em; }
  .department-table :global(.scroll:focus-visible) { outline-offset: var(--focus-offset); }
  .offering-ids:empty, .offering-legend:empty { display: none; }
  .offering-legend { display: flex; align-items: center; flex-wrap: wrap; gap: 0 var(--space-3); }
  .rating-sample { display: inline-flex; align-items: center; font-size: var(--t-sm); font-weight: 650; }
  .teachers, .more-offerings { color: var(--ink-2); }
  .teachers { font-size: var(--t-sm); }
  details > summary { width: fit-content; min-height: var(--target-min); align-content: center; cursor: pointer; color: var(--brand-ink); }
  .table-view .teachers > summary { min-height: 1.5rem; }
  .table-view .course-link strong { font-weight: 650; }
  .card-view, .all-offerings .open-label, .more-offerings .open-label, .phone-only { display: none; }
  .group-meta { display: flex; flex-wrap: wrap; gap: .12rem .65rem; align-items: baseline; }
  .group-meta strong { color: var(--ink); }
  .enrollment { display: grid; min-inline-size: 3rem; gap: .15rem; }
  .enrollment-value { display: flex; align-items: center; justify-content: end; gap: var(--space-1); font-weight: 700; white-space: nowrap; }
  .meter-line { display: flex; align-items: center; justify-content: end; gap: var(--space-1); min-block-size: .6rem; }
  .track { display: flex; overflow: hidden; inline-size: min(100%, 7.5rem); min-inline-size: 1.5rem; block-size: .375rem; background: var(--line); border-radius: var(--radius-pill); }
  .fill { display: block; block-size: 100%; background: var(--brand); }
  .fill.positive, .excess { min-inline-size: 3px; }
  .excess { flex: 1; background: var(--warn); }
  .capacity-note { padding-inline: var(--space-1); border-radius: var(--radius-control); background: var(--warn-wash); color: var(--warn); font-size: var(--t-sm); font-weight: 650; white-space: nowrap; }
  .official-source { justify-self: end; font-size: var(--t-sm); line-height: 1.35; }
  .publication-note { color: var(--ink-2); font-size: var(--t-sm); }
  .slot { display: block; overflow-wrap: anywhere; }
  .grouped-table { position: relative; overflow-x: auto; scrollbar-width: thin; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }

  table { inline-size: 100%; min-inline-size: 47rem; border-collapse: separate; border-spacing: 0; font-size: var(--t-base); line-height: var(--leading-table); }
  th, td { padding: .35rem .65rem; border-block-end: 1px solid var(--line); text-align: start; }
  th { font-weight: 650; }
  thead th, .group-heading th { background: var(--table-head); color: var(--ink-2); font-size: var(--t-sm); }
  .group-heading th { border-block-start: 1px solid var(--control-line); background: var(--panel); font-size: var(--t-sm); }
  .group-heading .group-meta { padding-block: .12rem; }
  tbody tr:hover, tbody tr:focus-within { background: var(--hover-row); }
  .numeric { text-align: end; font-variant-numeric: tabular-nums; }
  .expand td { padding-block: 0; }
  .extra { display: none; }
  tbody:has(.expand details[open]) .extra, .offering-legend:has(.all-offerings[open]) ~ .grouped-table .extra { display: table-row; }
  details[open] > summary .closed-label { display: none; }
  details[open] > summary .open-label { display: inline; }
  .offering-legend:has(.all-offerings[open]) ~ .grouped-table .expand { display: none; }
  tbody:last-child:not(:has(.expand details:not([open]))) tr:last-child > *, tbody:last-child .expand:has(details:not([open])) td { border-block-end: 0; }
  @media (max-width: 40rem) {
    .table-view { display: none; }
    .phone-only { display: block; }
    .card-view { display: grid; list-style: none; margin: 0; padding: 0; border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--panel-raised); }
    .card-view li { position: relative; min-inline-size: 0; padding: .25rem var(--space-3); overflow-wrap: anywhere; }
    .card-view li + li { border-block-start: 1px solid var(--line); }
    .card-title { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; column-gap: var(--space-2); }
    .card-course { display: flex; align-items: center; min-block-size: var(--target-min); min-inline-size: var(--target-min); font-size: var(--t-md); font-weight: 650; line-height: var(--leading-tight); }
    .card-body { position: relative; }
    .card-course::after { content: ''; position: absolute; inset: 0; }
    .card-body:has(.card-course:focus-visible) { outline: var(--focus-ring); outline-offset: var(--focus-offset); z-index: 1; }
    .card-view li:has(> .card-body .card-course:hover) > .card-body { background: var(--hover-row); }
    .card-title.with-term { grid-template-columns: auto minmax(0, 1fr) auto; }
    .card-semester { padding: .15rem .3rem; border-radius: var(--radius-control); background: var(--chip); color: var(--ink-2); }
    .card-meta, .secondary-meta { font-size: var(--t-sm); line-height: 1.38; }
    .card-details { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: var(--space-2); }
    .card-meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: .12rem .6rem; color: var(--ink-2); }
    .card-ids, .card-category { display: inline-flex; flex-wrap: wrap; align-items: baseline; gap: 0 var(--space-1); }
    .card-ids:empty { display: none; }
    .card-ids:not(:empty) + .card-category::before { content: '·'; color: var(--muted); }
    .card-ids { font-variant-numeric: tabular-nums; }
    .card-meta .offer-code { color: var(--ink); }
    .secondary-meta { display: flex; grid-column: 1; flex-wrap: wrap; align-items: center; gap: 0 var(--space-2); color: var(--ink-2); }
    .card-view :is(.people a, .people summary, .official-source, .rating-sample) { position: relative; display: inline-flex; align-items: center; min-block-size: var(--target-min); min-inline-size: var(--target-min); }
    .card-view .people summary { display: list-item; }
    .track { inline-size: min(100%, 5.5rem); }
    .department .track { inline-size: 6.5rem; }
    .enrollment { max-width: 8rem; text-align: end; font-size: var(--t-sm); line-height: 1.3; }
    .import-label { color: var(--ink-2); font: inherit; }
    .official-source { justify-self: end; grid-column: 2; grid-row: 1 / 3; align-self: end; }
    .card-view .course-group { padding-block-start: 0; }
    .more-offerings, .static-group-title { margin: 0 calc(-1 * var(--space-3)); background: var(--panel); }
    .static-group-title { display: none; align-items: center; min-block-size: var(--target-min); padding: var(--space-1) var(--space-3); border-block-end: 1px solid var(--line); }
    .offering-legend:has(.all-offerings[open]) ~ .card-view .static-group-title { display: flex; }
    .offering-legend:has(.all-offerings[open]) ~ .card-view .more-offerings { display: none; }
    .more-offerings > summary { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); width: 100%; padding: var(--space-1) var(--space-3); border-block-end: 1px solid var(--line); list-style: none; }
    .more-offerings > summary::-webkit-details-marker { display: none; }
    .more-offerings > summary:hover { background: var(--brand-wash); }
    .group-title { color: var(--ink); font-weight: 650; text-wrap: pretty; }
    .group-title .offer-code { color: var(--ink-2); }
    .group-action { flex: none; font-size: var(--t-sm); font-weight: 650; }
    .group-arrow { display: inline-block; margin-inline-start: var(--space-1); }
    .more-offerings[open] .group-arrow { transform: rotate(180deg); }
    .extra-cards { display: none; margin: 0; padding: 0; list-style: none; }
    .extra-cards > li { padding-inline: 0; border-block-start: 1px solid var(--line); }
    .more-offerings[open] ~ .extra-cards, .offering-legend:has(.all-offerings[open]) ~ .card-view .extra-cards { display: block; }

    .department .card-category { gap: 0 var(--space-2); }
    .department .meeting { flex: 1 0 min(100%, 9rem); }
  }
</style>
