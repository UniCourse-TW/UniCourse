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
  let recentYears = $derived(years.slice(0, 3));
  let previewSize = $derived(Math.min(8, rows.length));
  let phonePreviewSize = $derived(Math.min(previewSize, rows.filter((row) => recentYears.some((year) => row.points[year])).length));
  let sameTitles = $derived(rows.reduce((counts, row) => counts.set(row.label, (counts.get(row.label) ?? 0) + 1), new Map<string, number>()));
  let points = $derived(rows.flatMap((row) => Object.values(row.points)));
  let maxEnrollment = $derived(Math.max(0, ...points.map((point) => point?.enrolled ?? 0)));
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
      <span>{row.label}</span> <small class="browse-code">{row.id}</small>
      {#if (sameTitles.get(row.label) ?? 0) > 1 && row.department}<span class="course-unit">{row.department}</span>{/if}
    </th>
    {#each years as year (year)}
      {@const point = row.points[year]}
      <td>
        {#if point}
          {@const hint = `${row.label}，${year} 學年：${displayValue(point.offerings)} 班 · ${point.enrolled === null ? '人數未公布' : `${displayValue(point.enrolled)} 人`}${point.partial ? ` · ${partialTermLabel}` : ''}`}
          {#snippet value()}
            <span class="measurement ui-tabular" class:unknown={point.enrolled === null}>
              {point.enrolled === null ? '未公布' : displayValue(point.enrolled)}
            </span>
            {#if point.enrolled !== null && maxEnrollment > 0}
              <span class="meter" aria-hidden="true">
                <i class:partial={point.partial} style:inline-size={`${point.enrolled / maxEnrollment * 100}%`}></i>
              </span>
            {:else if point.partial}<i class="partial-key" aria-hidden="true"></i>{/if}
          {/snippet}
          {#if point.href}
            <a class="year-cell" href={point.href}
              title={`${hint}；查看最新班次（${point.destination ?? point.destinationTerm}）`}
              aria-label={`${hint}；查看最新班次（${point.destination ?? point.destinationTerm}）`}>
              {@render value()}
              <span class="target-term">{point.destinationTerm} <span aria-hidden="true">→</span></span>
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
  <div class="matrix" class:compact class:three={years.length === 3} style:--year-count={years.length}>
    <div class="matrix-toolbar" class:overflows class:measured={frameWidth > 0}>
      <ul class="matrix-legend" aria-label="修課人次圖例" role="list">
        {#if maxEnrollment > 0}<li><i class="scale-key" aria-hidden="true"></i> 人次（滿格 {displayValue(maxEnrollment)}）</li>{/if}
        <li><span aria-hidden="true">—</span> 未開課</li>
        {#if points.some((point) => point?.enrolled === null)}<li>未公布＝人數未公布</li>{/if}
        {#if points.some((point) => point?.partial)}<li><i class="partial-key" aria-hidden="true"></i>只收錄部分班次（推估）</li>{/if}
      </ul>
      <div class="matrix-navigation">
        <p class="scroll-hint" id={`${id}-hint`}>左右捲動 · <span aria-live="polite">{firstVisible === lastVisible ? years[firstVisible] : `${years[firstVisible]}–${years[lastVisible]}`} 學年</span></p>
        {#if overflows}
          <div class="matrix-arrows">
            <button type="button" aria-label="查看較新學年" aria-controls={id} disabled={position <= 1} onclick={() => scrollYear(-1)}>←</button>
            <button type="button" aria-label="查看較早學年" aria-controls={id} disabled={position >= tableWidth - frameWidth - 1} onclick={() => scrollYear(1)}>→</button>
          </div>
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
  .matrix-arrows button { min-inline-size: var(--target-min); min-block-size: var(--target-min); padding: 0; border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--brand-ink); font: inherit; font-size: 1rem; cursor: pointer; }
  .matrix-arrows button:disabled { background: var(--panel); color: var(--muted); cursor: default; }
  .matrix-frame { container-type: inline-size; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
  .matrix-scroll { --course-width: clamp(13rem, 34cqi, 28rem); --year-width: 4.5rem; position: relative; overflow-x: auto; border-radius: inherit; scrollbar-width: thin; scroll-padding-inline-start: var(--course-width); }
  .matrix-scroll:focus-visible { outline-offset: -2px; }
  table { width: 100%; min-width: calc(var(--course-width) + var(--year-count) * var(--year-width)); border-collapse: separate; border-spacing: 0; table-layout: fixed; font-size: var(--t-base); }
  .compact .matrix-frame { max-inline-size: 44rem; }
  .compact .matrix-scroll { --course-width: 13rem; }
  .compact table { min-width: 0; }
  th, td { --matrix-line: color-mix(in srgb, var(--control-line) 30%, var(--line)); border-block-end: 1px solid var(--matrix-line); border-inline-end: 1px solid var(--matrix-line); text-align: center; }
  :is(th, td):last-child { border-inline-end: 0; }
  tbody tr:last-child > * { border-block-end: 0; }
  thead th { padding: .45rem; background: var(--table-head); color: var(--ink-2); font-weight: 700; }
  .course { width: var(--course-width); padding: .4rem .65rem; text-align: start; line-height: 1.38; overflow-wrap: anywhere; }
  tbody th { font-weight: 650; }
  .course small { display: inline-block; color: var(--ink-2); font-weight: 600; }
  .course-unit { display: block; color: var(--ink-2); font-size: var(--t-sm); font-weight: 500; }
  td { padding: .13rem; }
  tbody tr:hover, tbody tr:focus-within { background: var(--hover-row); }
  .year-cell { display: grid; place-content: center; justify-items: center; gap: .13rem; min-block-size: var(--target-min); padding: .15rem; border-radius: var(--radius-control); color: var(--brand-ink); text-decoration: none; }
  .year-cell:hover { background: var(--brand-wash); }
  .year-cell:focus-visible { outline-offset: -2px; }
  .target-term { color: var(--ink-2); font: var(--t-sm) / 1.2 var(--font-mono); white-space: nowrap; text-decoration: underline; text-decoration-color: var(--control-line); text-underline-offset: .18em; }
  .measurement { color: var(--ink); font-size: var(--t-md); font-weight: 700; line-height: 1.1; }
  .measurement.unknown { font-size: var(--t-sm); font-weight: 500; }
  .meter, .scale-key, .partial-key { display: block; inline-size: 2.9rem; block-size: .25rem; border-radius: var(--radius-pill); }
  .meter { background: color-mix(in srgb, var(--control-line) 25%, var(--line)); }
  .meter i { display: block; block-size: 100%; border-radius: inherit; }
  .meter i, .scale-key { background: var(--brand); }
  .scale-key, .partial-key { inline-size: 1rem; }
  .meter .partial, .partial-key { background: var(--partial-hatch), var(--brand-wash); }
  .no-record { color: var(--ink-2); }
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
  .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  @media (max-width: 40rem) {
    .desktop-more, .phone-extra { display: none; }
    .phone-more, tbody:has(.more:not(.desktop-more) details[open]) .phone-extra { display: table-row; }
    .matrix-toolbar:not(.measured) .matrix-navigation { display: flex; }
    .compact .matrix-toolbar:not(.measured) .matrix-navigation { display: none; }
    .matrix-navigation { inline-size: 100%; min-block-size: var(--target-min); }
    .matrix-scroll { --course-width: clamp(7.25rem, 36cqi, 10rem); --year-width: calc((100cqi - var(--course-width)) / 3); }
    .compact .matrix-scroll { --course-width: clamp(7.5rem, 45cqi, 11rem); }
    .course { position: sticky; inset-inline-start: 0; z-index: 1; padding-inline: .5rem; box-shadow: var(--sticky-shadow); }
    tbody .course { background: var(--panel-raised); }
    tbody tr:focus-within .course { background: var(--hover-row); }
  }
  @media (min-width: 22.5625rem) and (max-width: 40rem) {
    .three .matrix-toolbar:not(.measured) .matrix-navigation { display: none; }
  }
  @media (max-width: 22.5rem) {
    .matrix-scroll { --year-width: calc((100cqi - var(--course-width)) / 2); }
  }
</style>
