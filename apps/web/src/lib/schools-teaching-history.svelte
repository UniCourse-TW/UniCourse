<script lang="ts">
  import type { TermTrend } from '@unicourse/api-client';
  import DataTable from '$lib/ui/DataTable.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import { displayValue } from '$lib/ui/format';
  import { partialTermLabel, partialTerms } from '$lib/ui/partial-terms';
  import type { MatrixRow, TableColumn } from '$lib/ui/types';

  type TeachingRow = MatrixRow & { department: string | null };

  let { periods, rows, trends }: { periods: string[]; rows: TeachingRow[]; trends: TermTrend[] | null } = $props();
  const id = $props.id();
  let years = $derived([...periods].reverse());
  let compact = $derived(years.length <= 2);
  let previewSize = $derived(Math.min(8, rows.length));
  let phonePreviewSize = $derived(Math.min(4, rows.filter((row) => years.slice(0, 4).some((year) => row.points[year])).length));
  let sameTitles = $derived(rows.reduce((counts, row) => counts.set(row.label, (counts.get(row.label) ?? 0) + 1), new Map<string, number>()));
  let points = $derived(rows.flatMap((row) => Object.values(row.points)));
  let maxEnrollment = $derived(Math.max(0, ...points.map((point) => point?.enrolled ?? 0)));
  let showBars = $derived(maxEnrollment > 0 && points.filter((point) => point?.enrolled != null).length >= 6);
  let partial = $derived(partialTerms((trends ?? []).map(({ term, offerings }) => [term, offerings])));
  let trendColumns = $derived<TableColumn<TermTrend>[]>([
    { id: 'term', label: '學期', value: (row) => row.term },
    { id: 'offerings', label: '班次', value: (row) => row.offerings, numeric: true },
    { id: 'enrolled', label: '已公布人次', value: (row) => row.enrolled, numeric: true },
    ...(partial.size ? [{ id: 'coverage', label: '收錄備註', value: (row: TermTrend) => partial.has(row.term) ? partialTermLabel : null }] : [])
  ]);
  let scroll = $state<HTMLDivElement>();
  let frameWidth = $state(0);
  let tableWidth = $state(0);
  let courseWidth = $state(0);
  let position = $state(0);
  let yearWidth = $derived((tableWidth - courseWidth) / Math.max(1, years.length));
  let overflows = $derived(tableWidth > frameWidth + 1);
  let firstVisible = $derived(yearWidth > 0 ? Math.min(years.length - 1, Math.ceil((position - 2) / yearWidth)) : 0);
  let lastVisible = $derived(yearWidth > 0
    ? Math.max(firstVisible, Math.min(years.length - 1, Math.floor((position + frameWidth - courseWidth + 2) / yearWidth) - 1))
    : Math.min(2, years.length - 1));
  let caption = $derived(compact ? '課程與學年授課紀錄' : '課程與學年修課人次');

  function scrollYear(direction: number) {
    const target = Math.round(position / yearWidth) + direction;
    if (yearWidth > 0) scroll?.scrollTo({ left: target * yearWidth });
  }
</script>

{#snippet matrixRow(row: TeachingRow, extra: boolean, phoneExtra: boolean)}
  <tr class:extra class:phone-extra={phoneExtra}>
    <th scope="row" class="course">
      <span class="course-title">{row.label}</span>
      <small class="browse-code">{row.id}</small>
      {#if (sameTitles.get(row.label) ?? 0) > 1 && row.department}<span class="course-unit">{row.department}</span>{/if}
    </th>
    {#each years as year (year)}
      {@const point = row.points[year]}
      <td class:empty={!point}>
        {#if point}
          {@const hint = `${row.label}，${year} 學年：${displayValue(point.offerings)} 班 · ${point.enrolled === null ? '人數未公布' : `${displayValue(point.enrolled)} 人`}${point.partial ? ` · ${partialTermLabel}` : ''}`}
          {#snippet value()}
            <span class="measurement ui-tabular" class:unknown={point.enrolled === null}>
              {point.enrolled === null ? '未公布' : displayValue(point.enrolled)}
            </span>
            {#if point.enrolled !== null && showBars}
              <span class="meter" aria-hidden="true">
                <i class:partial={point.partial} class:positive={point.enrolled > 0} style:inline-size={`${point.enrolled / maxEnrollment * 100}%`}></i>
              </span>
            {:else if point.partial}<i class="partial-key" aria-hidden="true"></i>{/if}
          {/snippet}
          {#if point.href}
            <a class="year-cell" href={point.href}
              title={`${hint}；查看最新班次（${point.destination ?? point.destinationTerm}）`}
              aria-label={`${hint}；查看最新班次（${point.destination ?? point.destinationTerm}）`}>
              {@render value()}
            </a>
          {:else}<span class="year-cell">{@render value()}</span>{/if}
        {:else}
          <span class="no-record"><span aria-hidden="true">—</span><span class="visually-hidden">未開課</span></span>
        {/if}
      </td>
    {/each}
  </tr>
{/snippet}

{#snippet moreRows(phoneOnly: boolean, desktopOnly = false)}
  <tr class="more" class:phone-more={phoneOnly} class:desktop-more={desktopOnly}>
    <td colspan={years.length + 1}>
      <details>
        <summary><span class="disclosure-closed">顯示全部（{displayValue(rows.length)} 門課）</span><span class="disclosure-open">收合課程</span></summary>
      </details>
    </td>
  </tr>
{/snippet}

{#if rows.length && years.length}
  <div class="matrix" class:compact class:three={years.length === 3} class:four={years.length === 4} style:--year-count={years.length}>
    <div class="matrix-toolbar" class:overflows class:measured={frameWidth > 0}>
      <ul class="matrix-legend" aria-label="修課人次圖例" role="list">
        <li>各班已公布人次加總{#if showBars}・滿格 {displayValue(maxEnrollment)} 人次{/if}</li>
        <li><span aria-hidden="true">—</span> 未開課</li>
        <li>點數值看最新班次 <span aria-hidden="true">→</span></li>
        {#if points.some((point) => point?.partial)}<li><i class="partial-key" aria-hidden="true"></i>只收錄部分班次（推估）</li>{/if}
      </ul>
      <div class="matrix-navigation">
        {#if overflows}
          <p class="scroll-hint" id={`${id}-hint`}><strong aria-live="polite">{firstVisible === lastVisible ? years[firstVisible] : `${years[firstVisible]}–${years[lastVisible]}`} 學年</strong><span>／共 {years.length} 學年</span></p>
          <div class="matrix-arrows">
            <button type="button" aria-label="查看較新學年" aria-controls={id} disabled={position <= 1} onclick={() => scrollYear(-1)}>←</button>
            <button type="button" aria-label="查看較早學年" aria-controls={id} disabled={position >= tableWidth - frameWidth - 1} onclick={() => scrollYear(1)}>→</button>
          </div>
        {:else}
          <p class="scroll-hint">左右捲動查看各學年</p>
        {/if}
      </div>
    </div>
    <div class="matrix-frame">
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (The region supports native keyboard scrolling.) -->
      <div class="matrix-scroll" role="region" aria-label="歷年授課矩陣" aria-describedby={overflows ? `${id}-hint` : undefined} tabindex="0" {id}
        bind:this={scroll} bind:clientWidth={frameWidth} onscroll={(event) => position = event.currentTarget.scrollLeft}>
        <table bind:clientWidth={tableWidth}>
          <caption class="visually-hidden">{caption}</caption>
          <thead><tr><th scope="col" class="course" bind:clientWidth={courseWidth}>課程</th>{#each years as year (year)}<th scope="col" class="ui-tabular">{year}<span class="visually-hidden"> 學年</span></th>{/each}</tr></thead>
          <tbody>
            {#each rows as row, index (row.id)}
              {#if index === phonePreviewSize && phonePreviewSize < previewSize}{@render moreRows(true)}{/if}
              {#if index === previewSize}{@render moreRows(false, phonePreviewSize < previewSize)}{/if}
              {@render matrixRow(row, index >= previewSize, index >= phonePreviewSize)}
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
{:else}<EmptyState title="尚無歷年授課紀錄" />{/if}

{#if trends?.length}
  <details class="history-values">
    <summary>查看各學期授課總數</summary>
    <DataTable caption="各學期授課數值（所有開課班次）" columns={trendColumns} rows={trends} rowKey={(row) => row.term} minWidth="0" maxHeight="none" scrollHint={false} />
  </details>
{/if}

<style>
  .matrix { min-inline-size: 0; }
  .matrix-toolbar, .matrix-navigation, .matrix-legend, .matrix-legend li { display: flex; align-items: center; gap: .4rem .8rem; }
  .matrix-toolbar { justify-content: space-between; flex-wrap: wrap; margin-block-end: var(--space-1); }
  .matrix-legend { flex-wrap: wrap; margin: 0; padding: 0; list-style: none; color: var(--ink-2); font-size: var(--t-sm); }
  .matrix-legend li { gap: .28rem; }
  .matrix-navigation { justify-content: space-between; color: var(--ink-2); font-size: var(--t-sm); }
  .matrix-toolbar:not(.overflows) .matrix-navigation { display: none; }
  .matrix-arrows { display: flex; gap: var(--space-1); }
  .matrix-arrows button { min-inline-size: var(--target-min); min-block-size: var(--target-min); padding: 0; border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--brand-wash); color: var(--brand-ink); font: 700 1.1rem var(--font-sans); cursor: pointer; }
  .matrix-arrows button:disabled { background: var(--panel); color: var(--ink-2); cursor: default; }
  .scroll-hint { margin: 0; }
  .scroll-hint strong { color: var(--ink); font-variant-numeric: tabular-nums; }
  .matrix-frame { container-type: inline-size; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
  .matrix-scroll { --course-width: clamp(13rem, 34cqi, 28rem); --year-width: 4.5rem; position: relative; overflow-x: auto; border-radius: inherit; scrollbar-width: thin; scroll-padding-inline-start: var(--course-width); }
  .matrix-scroll:focus-visible { outline-offset: 2px; }
  table { width: 100%; min-width: calc(var(--course-width) + var(--year-count) * var(--year-width)); border-collapse: separate; border-spacing: 0; table-layout: fixed; font-size: var(--t-base); }
  .compact .matrix-frame { max-inline-size: 44rem; }
  .compact .matrix-scroll { --course-width: 13rem; }
  .compact table { min-width: 0; }
  th, td { border-block-end: 1px solid var(--line); border-inline-end: 1px solid var(--line); text-align: center; }
  td.empty { border-inline-end-color: transparent; }
  td:has(.year-cell:focus-visible) { z-index: 2; }
  :is(th, td):last-child { border-inline-end: 0; }
  tbody tr:last-child > * { border-block-end: 0; }
  thead th { padding: .45rem; background: var(--table-head); color: var(--ink-2); font-weight: 700; }
  .course { width: var(--course-width); padding: .4rem .65rem; text-align: start; line-height: 1.38; overflow-wrap: anywhere; }
  tbody th { font-weight: 650; }
  .course small { display: inline-block; color: var(--ink-2); font-weight: 600; }
  .course-title { margin-inline-end: var(--space-1); text-wrap: pretty; }
  .course-unit { display: block; color: var(--ink-2); font-size: var(--t-sm); font-weight: 500; }
  td { position: relative; padding: 0; }
  tbody tr:hover, tbody tr:focus-within { background: var(--hover-row); }
  .year-cell { display: grid; align-content: center; justify-items: center; gap: .25rem; min-block-size: var(--target-min); padding: var(--space-1); color: var(--brand-ink); text-decoration: none; }
  a.year-cell::before { content: ''; position: absolute; inset: 0; }
  a.year-cell:is(:hover, :focus-visible) { background: var(--brand-wash); }
  a.year-cell:focus-visible::before { outline: var(--focus-ring); outline-offset: -2px; }
  .measurement { color: inherit; font-size: var(--t-md); font-weight: 750; line-height: 1.1; }
  a .measurement { text-decoration: underline; text-underline-offset: .17em; }
  .measurement.unknown { font-size: var(--t-sm); font-weight: 600; }
  .meter, .partial-key { display: block; inline-size: min(100%, 4.25rem); block-size: 6px; border-radius: var(--radius-pill); }
  .meter { background: var(--line); }
  .meter i { display: block; block-size: 100%; border-radius: inherit; }
  .meter .positive { min-inline-size: 3px; }
  .meter i { background: var(--brand); }
  .partial-key { inline-size: 1rem; }
  .meter .partial, .partial-key { background: var(--partial-fill); }
  .no-record { color: var(--muted); }
  .more td { text-align: start; padding: 0 .65rem; }
  .more summary { position: sticky; inset-inline-start: .65rem; }
  .extra, .phone-more, .disclosure-open, details[open] .disclosure-closed { display: none; }
  details[open] .disclosure-open { display: inline; }
  @media (min-width: 40.0625rem) {
    tbody:has(.more:not(.phone-more) details[open]) .extra { display: table-row; }
  }
  .more:has(details:not([open])) td { border-block-end: 0; }
  summary { min-block-size: var(--target-min); cursor: pointer; align-content: center; width: fit-content; color: var(--brand-ink); font-weight: 650; font-size: var(--t-base); }
  .history-values[open] { display: grid; gap: var(--space-2); }
  .history-values :global(.scroll:focus-visible) { outline-offset: var(--focus-offset); }
  .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  @media (max-width: 40rem) {
    .desktop-more, .phone-extra { display: none; }
    .phone-more, tbody:has(.more:not(.desktop-more) details[open]) .phone-extra { display: table-row; }
    .matrix-toolbar:not(.measured) .matrix-navigation { display: flex; }
    .compact .matrix-toolbar:not(.measured) .matrix-navigation { display: none; }
    .matrix-navigation { inline-size: 100%; min-block-size: var(--target-min); }
    .matrix-scroll { --course-width: clamp(7rem, 35cqi, 11rem); --year-width: calc((100cqi - var(--course-width)) / 4); }
    .compact .matrix-scroll { --course-width: clamp(7.5rem, 45cqi, 11rem); }
    .course { position: sticky; inset-inline-start: 0; z-index: 1; padding-inline: .5rem; box-shadow: var(--sticky-shadow); }
    tbody .course { background: var(--panel-raised); }
    .course-title { display: block; margin: 0; }
    tbody tr:focus-within .course { background: var(--hover-row); }
  }
  @media (min-width: 23.5rem) and (max-width: 40rem) {
    :is(.three, .four) .matrix-toolbar:not(.measured) .matrix-navigation { display: none; }
  }
  @media (max-width: 23.499rem) {
    .three .matrix-toolbar:not(.measured) .matrix-navigation { display: none; }
    .matrix-scroll { --year-width: calc((100cqi - var(--course-width)) / 3); }
  }
  @media (max-width: 20rem) {
    .three .matrix-toolbar:not(.measured) .matrix-navigation { display: flex; }
    .matrix-scroll { --year-width: calc((100cqi - var(--course-width)) / 2); }
  }
</style>
