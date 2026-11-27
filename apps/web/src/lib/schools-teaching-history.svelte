<script lang="ts">
  import type { TermTrend } from '@unicourse/api-client';
  import DataTable from '$lib/ui/DataTable.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import { displayValue } from '$lib/ui/format';
  import { partialTermLabel, partialTerms } from '$lib/ui/partial-terms';
  import type { MatrixRow, TableColumn } from '$lib/ui/types';

  type TeachingRow = MatrixRow & { department: string | null };

  let { periods, rows, trends, yearOfferingsHref }: {
    periods: string[];
    rows: TeachingRow[];
    trends: TermTrend[] | null;
    yearOfferingsHref: (course: string, year: string) => string;
  } = $props();
  const id = $props.id();
  let years = $derived([...periods].reverse());
  let previewSize = $derived(Math.min(8, rows.length));
  let phonePreviewSize = $derived(Math.min(4, rows.length));
  let sameTitles = $derived(rows.reduce((counts, row) => counts.set(row.label, (counts.get(row.label) ?? 0) + 1), new Map<string, number>()));
  let points = $derived(rows.flatMap((row) => Object.values(row.points)));
  let maxEnrollment = $derived(Math.max(0, ...points.map((point) => point?.enrolled ?? 0)));
  let showBars = $derived(maxEnrollment > 0 && points.filter((point) => point?.enrolled != null).length >= 6);
  let cellWidth = $derived(Math.max(0, ...points.map((point) => point
    ? displayValue(point.enrolled).length + displayValue(point.offerings).length
    : 0)));
  let latest = $derived(trends?.[0]);
  let partial = $derived(partialTerms((trends ?? []).map(({ term, offerings }) => [term, offerings])));
  let trendColumns = $derived<TableColumn<TermTrend>[]>([
    { id: 'term', label: '學期', value: (row) => row.term },
    { id: 'offerings', label: '班次', value: (row) => row.offerings, numeric: true },
    { id: 'enrolled', label: '已公布人次', value: (row) => row.enrolled, numeric: true },
    ...(partial.size ? [{ id: 'coverage', label: '收錄備註', value: (row: TermTrend) => partial.has(row.term) ? partialTermLabel : null }] : [])
  ]);
  let frameWidth = $state(0);
  let tableWidth = $state(0);
  let position = $state(0);
  let overflow = $derived(tableWidth > frameWidth + 1);
  let hasNewer = $derived(position > 1);
  let hasOlder = $derived(position < tableWidth - frameWidth - 1);
  let caption = $derived(years.length <= 2 ? '課程與學年授課紀錄' : '課程與學年修課人次');
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
          {@const hint = `${row.label}，${year} 學年：${displayValue(point.offerings)} 班 · ${point.enrolled === null ? '人數未公布' : `${displayValue(point.enrolled)} 人次`}${point.partial ? ` · ${partialTermLabel}` : ''}`}
          {@const direct = point.offerings === 1 && point.href}
          {@const action = direct ? `查看最新班次（${point.destination ?? point.destinationTerm}）` : '查看該學年班次'}
          <a class="year-offerings ui-tabular" href={direct || yearOfferingsHref(row.id, year)} title={action} aria-label={`${hint}；${action}`}>
            <span class="measurement">{point.enrolled === null ? '未公布' : displayValue(point.enrolled)}</span><span aria-hidden="true">・</span><span class="class-count">{displayValue(point.offerings)} 班</span>
            {#if showBars && point.enrolled != null && point.enrolled > 0}
              <span class="meter" aria-hidden="true"><i class:partial={point.partial} style:inline-size={`${point.enrolled / maxEnrollment * 100}%`}></i></span>
            {:else if point.partial}<i class="partial-key" aria-hidden="true"></i>{/if}
          </a>
        {:else}
          <span class="no-record"><span aria-hidden="true">—</span><span class="visually-hidden">未開課</span></span>
        {/if}
      </td>
    {/each}
  </tr>
{/snippet}

{#if rows.length && years.length}
  <div class="matrix" class:compact={years.length <= 2} style:--year-count={years.length} style:--cell-digits={cellWidth}>
    <div class="matrix-toolbar">
      <ul class="matrix-legend" id={`${id}-legend`} aria-label="授課矩陣圖例" role="list">
        <li>每格：已公布人次・班次</li>
        {#if showBars}<li>滿格 {displayValue(maxEnrollment)} 人次</li>{/if}
        <li>— 未開課</li>
        {#if points.some((point) => point?.partial)}<li><i class="partial-key" aria-hidden="true"></i>只收錄部分班次（推估）</li>{/if}
      </ul>
      <p class="scroll-hint" class:overflow id={`${id}-hint`}>橫向捲動查看較早學年</p>
      {#if phonePreviewSize < rows.length}
        <div class="matrix-disclosure" class:phone-only={previewSize === rows.length}>
          <span class="preview-count">
            <span class="desktop-count">{displayValue(previewSize)}</span><span class="phone-count">{displayValue(phonePreviewSize)}</span>／{displayValue(rows.length)} 門課
          </span>
          <details>
            <summary aria-controls={id}>
              <span class="disclosure-closed">顯示全部（{displayValue(rows.length)} 門課）</span>
              <span class="disclosure-open">收合課程</span>
            </summary>
          </details>
        </div>
      {/if}
    </div>
    <div class="matrix-frame" class:has-newer={hasNewer} class:has-older={hasOlder}>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (The region supports native keyboard scrolling.) -->
      <div class="matrix-scroll" role="region" aria-label="歷年授課矩陣" aria-describedby={`${id}-legend${overflow ? ` ${id}-hint` : ''}`} tabindex="0" {id}
        bind:clientWidth={frameWidth} onscroll={(event) => position = event.currentTarget.scrollLeft}>
        <table bind:clientWidth={tableWidth}>
          <caption class="visually-hidden">{caption}</caption>
          <thead><tr><th scope="col" class="course">課程</th>{#each years as year (year)}<th scope="col" class="ui-tabular">{year}<span class="visually-hidden"> 學年</span></th>{/each}</tr></thead>
          <tbody>
            {#each rows as row, index (row.id)}
              {@render matrixRow(row, index >= previewSize, index >= phonePreviewSize)}
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
{:else}<EmptyState title="尚無歷年授課紀錄" />{/if}

{#if latest && trends?.length}
  <details class="history-values">
    <summary><span>查看各學期授課總數</span><span class="latest-term ui-tabular">最新 {latest.term}：{displayValue(latest.offerings)} 班</span></summary>
    <DataTable caption="各學期授課數值（所有開課班次）" columns={trendColumns} rows={trends} rowKey={(row) => row.term} minWidth="0" maxHeight="none" scrollHint={false} />
  </details>
{/if}

<style>
  .matrix { min-inline-size: 0; }
  .matrix-toolbar, .matrix-legend, .matrix-legend li, .matrix-disclosure { display: flex; align-items: center; gap: 0 .65rem; }
  .matrix-toolbar { flex-wrap: wrap; margin-block-end: var(--space-1); }
  .matrix-toolbar > .scroll-hint { margin: 0; }
  .matrix-legend { flex-wrap: wrap; margin: 0; padding: 0; list-style: none; }
  .matrix-legend li { gap: .28rem; }
  .matrix-legend, .scroll-hint, .preview-count, .latest-term { color: var(--ink-2); font-size: var(--t-sm); }
  .scroll-hint { display: none; }
  .scroll-hint.overflow { display: block; }
  .matrix-disclosure { margin-inline-start: auto; }
  .matrix-frame {
    --course-width: clamp(13rem, 29cqi, 24rem);
    --year-width: max(6rem, calc(var(--cell-digits) * 1ch + 2.75rem));
    container-type: inline-size;
    position: relative;
    border: 1px solid var(--line);
    border-radius: var(--radius-panel);
    background: var(--panel-raised);
  }
  .matrix-frame.has-older::after, .matrix-frame.has-newer::before { content: ''; position: absolute; inset-block: 1px; inline-size: .85rem; pointer-events: none; z-index: 3; }
  .matrix-frame.has-older::after { inset-inline-end: 0; background: linear-gradient(to left, var(--panel-raised), transparent); border-radius: inherit; }
  .matrix-frame.has-newer::before { inset-inline-start: var(--course-width); background: linear-gradient(to right, var(--panel-raised), transparent); }
  .matrix-scroll { position: relative; overflow-x: auto; border-radius: inherit; scrollbar-width: thin; scroll-padding-inline: var(--course-width) var(--space-3); }
  .matrix-scroll:focus-visible { outline-offset: 2px; }
  table { width: 100%; min-width: calc(var(--course-width) + var(--year-count) * var(--year-width)); border-collapse: separate; border-spacing: 0; table-layout: fixed; font-size: var(--t-base); }
  .compact .matrix-frame { max-inline-size: 44rem; }
  th, td { border-block-end: 1px solid var(--line); border-inline-end: 1px solid var(--line); text-align: center; }
  td.empty { border-inline-end-color: transparent; }
  :is(th, td):last-child { border-inline-end: 0; }
  tbody tr:last-child > * { border-block-end: 0; }
  thead th { padding: .3rem var(--space-2); background: var(--table-head); color: var(--ink-2); font-weight: 700; }
  .course { position: sticky; inset-inline-start: 0; z-index: 2; width: var(--course-width); padding: .32rem .65rem; text-align: start; line-height: 1.38; overflow-wrap: anywhere; }
  .has-newer .course, .has-older .course { box-shadow: var(--sticky-shadow); }
  tbody .course { background: var(--panel-raised); font-weight: 650; }
  tbody tr:focus-within .course { background: var(--hover-row); }
  .course small { display: inline-block; color: var(--ink-2); font-weight: 600; }
  .course-title { margin-inline-end: var(--space-1); text-wrap: pretty; }
  .course-unit { display: block; color: var(--ink-2); font-size: var(--t-sm); font-weight: 500; }
  td { position: relative; padding: 0; }
  tbody tr:hover, tbody tr:focus-within { background: var(--hover-row); }
  .year-offerings { position: relative; display: flex; justify-content: center; align-items: center; min-block-size: var(--target-min); padding: .25rem var(--space-1) .45rem; font-size: var(--t-sm); white-space: nowrap; text-decoration: none; }
  .measurement { color: var(--ink); font-size: var(--t-base); font-weight: 750; }
  .class-count { color: var(--brand-ink); text-decoration: underline; text-underline-offset: .2em; }
  .year-offerings:is(:hover, :focus-visible) { background: var(--brand-wash); }
  .year-offerings:focus-visible { outline-offset: -3px; z-index: 1; }
  .meter, .partial-key { display: block; block-size: 4px; border-radius: var(--radius-pill); }
  .meter { position: absolute; inset-inline: var(--space-2); inset-block-end: var(--space-1); background: var(--line); }
  .meter i { display: block; block-size: 100%; min-inline-size: 3px; border-radius: inherit; background: var(--brand); }
  .partial-key { inline-size: 1rem; }
  .year-offerings > .partial-key { position: absolute; inset-block-end: var(--space-1); }
  .meter .partial, .partial-key { background: var(--partial-fill); }
  .no-record { color: var(--muted); }
  .extra, .phone-only, .phone-count, .disclosure-open,
  details[open] .disclosure-closed, .matrix-disclosure:has(details[open]) .preview-count { display: none; }
  details[open] .disclosure-open { display: inline; }
  .matrix:has(.matrix-disclosure details[open]) .extra { display: table-row; }
  summary { min-block-size: var(--target-min); cursor: pointer; align-content: center; width: fit-content; color: var(--brand-ink); font-weight: 650; font-size: var(--t-base); }
  .history-values summary span + span { margin-inline-start: var(--space-2); font-weight: 500; white-space: nowrap; }
  .history-values[open] { display: grid; gap: var(--space-2); }
  .history-values :global(.scroll:focus-visible) { outline-offset: var(--focus-offset); }
  .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  @media (max-width: 40rem) {
    .desktop-count, .phone-extra { display: none; }
    .phone-count { display: inline; }
    .matrix-frame { --course-width: clamp(7rem, 44cqi, 12rem); }
    .course { padding-inline: .5rem; }
    .course-title { display: block; margin: 0; }
    .matrix:has(.matrix-disclosure details[open]) .phone-extra { display: table-row; }
    .matrix-disclosure { display: flex; margin-inline-start: 0; }
      .matrix:not(.compact) .scroll-hint { display: block; }
  }
</style>
