<script lang="ts">
  import type { TermTrend } from '@unicourse/api-client';
  import DataTable from '$lib/ui/DataTable.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import { displayValue } from '$lib/ui/format';
  import { partialTermLabel, partialTerms } from '$lib/ui/partial-terms';
  import type { MatrixPoint, MatrixRow, TableColumn } from '$lib/ui/types';

  let { periods, rows, trends }: { periods: string[]; rows: MatrixRow[]; trends: TermTrend[] | null } = $props();
  let orderedYears = $derived([...periods].reverse());
  let preview = $derived(rows.slice(0, 8));
  let previewYears = $derived(orderedYears);
  let repeatedTitles = $derived(new Set(rows.filter((row) => rows.some((other) => other.id !== row.id && other.label === row.label)).map(({ label }) => label)));
  let compact = $derived(previewYears.length <= 2);
  let columns = $derived(yearColumns(previewYears, compact));
  let fullColumns = $derived(yearColumns(orderedYears, true));
  let width = $derived(compact ? '0' : `calc(var(--teaching-course-width, 15rem) + ${previewYears.length} * var(--teaching-year-width, 4.25rem))`);
  let hasPartial = $derived(preview.some((row) => Object.values(row.points).some((point) => point?.partial)));
  let hasUnpublished = $derived(preview.some((row) => Object.values(row.points).some((point) => point?.enrolled === null)));
  const bins = [{ index: 0, label: '0–24' }, { index: 1, label: '25–49' }, { index: 2, label: '50–74' }, { index: 3, label: '75–99' }, { index: 4, label: '100+' }];
  let partial = $derived(partialTerms((trends ?? []).map(({ term, offerings }) => [term, offerings])));
  let trendColumns = $derived<TableColumn<TermTrend>[]>([
    { id: 'term', label: '學期', value: (row) => row.term },
    { id: 'offerings', label: '班次', value: (row) => row.offerings, numeric: true },
    { id: 'enrolled', label: '已公布人次', value: (row) => row.enrolled, numeric: true },
    ...(partial.size ? [{ id: 'coverage', label: '收錄備註', value: (row: TermTrend) => partial.has(row.term) ? partialTermLabel : null }] : [])
  ]);

  function totals(point: MatrixPoint) {
    return `${displayValue(point.offerings)} 班 · ${point.enrolled === null ? '人數未公布' : `${displayValue(point.enrolled)} 人`}`;
  }

  function bin(enrolled: number | null) {
    return enrolled === null ? 'unknown' : Math.min(4, Math.floor(enrolled / 25));
  }

  function yearColumns(years: string[], exact: boolean): TableColumn<MatrixRow>[] {
    return [{ id: 'course', label: '課程', width: 'var(--teaching-course-width, 15rem)' },
      ...years.map((year) => ({ id: year, label: year, align: 'center' as const, width: exact ? undefined : 'var(--teaching-year-width, 4.25rem)' }))];
  }
</script>

{#snippet historyCell(row: MatrixRow, column: TableColumn<MatrixRow>, exact: boolean)}
  {@const point = row.points[column.id]}
  {#if column.id === 'course'}
    <span class="matrix-course">{row.label}</span>{#if exact || repeatedTitles.has(row.label)}<small class="browse-code">{row.id}</small>{/if}
  {:else if point}
    {@const hint = `${column.id} 學年：${totals(point)}${point.partial ? ` · ${partialTermLabel}` : ''}${point.href ? `；查看最新班次${point.destination ? `（${point.destination}）` : ''}` : ''}`}
    {#snippet value()}
      {#if exact}<span>{totals(point)}</span>{:else}<span class="dot" data-bin={bin(point.enrolled)} aria-hidden="true"></span><span class="ui-tabular count">{point.enrolled === null ? '未公布' : displayValue(point.enrolled)}</span>{/if}
    {/snippet}
    {#if point.href}
      <a href={point.href} class="year-cell" class:partial={point.partial} aria-label={`${row.label}，${hint}`} title={hint}>{@render value()}</a>
    {:else}
      <span class="year-cell" aria-label={hint}>{@render value()}</span>
    {/if}
  {:else}
    <span class="no-record" aria-label="無開課紀錄">—</span>
  {/if}
{/snippet}

{#if rows.length && periods.length}
  <div class="teaching-matrix" class:compact>
    {#if !compact}
      <ul class="matrix-legend" aria-label="修課人數圖例" role="list">
        {#each bins as { index, label } (index)}<li><span class="dot" data-bin={index} aria-hidden="true"></span>{label} 人</li>{/each}
        <li><span aria-hidden="true">—</span>未開課</li>
          {#if hasUnpublished}<li><span class="dot" data-bin="unknown" aria-hidden="true"></span>有開課、人數未公布</li>{/if}
        {#if hasPartial}<li><span class="dot partial" aria-hidden="true"></span>{partialTermLabel}</li>{/if}
      </ul>
      {#if rows.length > preview.length}<p class="browse-note matrix-range">先列最近開課的 {preview.length} 門</p>{/if}
    {/if}
    <div class="matrix-frame" class:overflow={previewYears.length > 4}>
      <DataTable caption={compact ? '課程與學年授課紀錄' : '課程與學年修課人次'} {columns} rows={preview} rowKey={(row) => row.id} minWidth={width} maxHeight="none" scrollHint={false}>
        {#snippet cell(row, column)}{@render historyCell(row, column, compact)}{/snippet}
      </DataTable>
    </div>
    {#if previewYears.length > 4}<p class="matrix-scroll browse-note">向右滑看更早學年 →</p>{/if}
  </div>
{:else}<EmptyState title="尚無歷年授課紀錄" />{/if}

{#if rows.length > preview.length}
{@const remaining = rows.slice(preview.length)}
<details class="history-values">
  <summary>顯示其餘 {displayValue(rows.length - preview.length)} 門課的學年數值</summary>
    <div class="desktop-years"><DataTable caption="其餘課程的學年數值" columns={fullColumns} rows={remaining} rowKey={(row) => row.id} minWidth={orderedYears.length <= 2 ? '0' : `${9 + 6 * periods.length}rem`} maxHeight="none" scrollHint={orderedYears.length > 2}>
      {#snippet cell(row, column)}{@render historyCell(row, column, true)}{/snippet}
    </DataTable></div>
    <ul class="phone-years year-lists" aria-label="各課程的學年數值">
      {#each remaining as row (row.id)}
        <li><details><summary>{row.label} <small class="browse-code">{row.id}</small></summary>
          <ul>{#each orderedYears as year (year)}
            {@const point = row.points[year]}
            {#if point}<li><span class="ui-tabular">{year} 學年 · {totals(point)}{#if point.partial} · {partialTermLabel}{/if}</span>{#if point.href}<a href={point.href}>查看班次 <span aria-hidden="true">→</span></a>{/if}</li>{/if}
          {/each}</ul>
        </details></li>
      {/each}
    </ul>
</details>
{/if}
{#if trends?.length}
  <details class="history-values">
    <summary>查看各學期授課總數</summary>
    <DataTable caption="各學期授課數值（所有開課班次）" columns={trendColumns} rows={trends} rowKey={(row) => row.term} minWidth="0" maxHeight="none" scrollHint={false} />
  </details>
{/if}

<style>
  .matrix-course { display: block; overflow-wrap: anywhere; }
  .teaching-matrix:not(.compact) .matrix-frame { --table-pad-block: 0; }
  .teaching-matrix:not(.compact) .matrix-frame :global(td) { padding-inline: .125rem; }
  .teaching-matrix:not(.compact) .matrix-frame :global(caption) { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); }
  .teaching-matrix:not(.compact) .matrix-frame :global(thead th) { padding-block: .35rem; }
  .teaching-matrix:not(.compact) .matrix-frame :global(tbody th) { padding-block: .18rem; }
  .phone-years, .matrix-scroll { display: none; }
  .matrix-legend { display: flex; flex-wrap: wrap; gap: .25rem .85rem; margin: 0 0 var(--space-2); padding: 0; list-style: none; color: var(--muted); font-size: var(--t-sm); }
  .matrix-range { margin-block-end: var(--space-2); }
  .matrix-legend li, .year-cell { display: flex; align-items: center; gap: .3rem; }
  .year-cell { position: relative; min-block-size: var(--target-min); min-inline-size: 2rem; justify-content: center; border-radius: var(--radius-control); padding-inline: .15rem; color: var(--ink); }
  .teaching-matrix:not(.compact) .year-cell { gap: .4rem; }
  .teaching-matrix:not(.compact) small.browse-code { font-size: var(--t-xs); }
  .year-cell[href] { color: var(--brand-ink); text-decoration: underline; text-decoration-color: var(--control-line); text-underline-offset: .17em; }
  .year-cell[href]:hover { box-shadow: inset 0 0 0 1px var(--brand); text-decoration: underline; }
  .count { font-size: var(--t-sm); }
  .dot { display: inline-block; flex: none; inline-size: var(--dot-size, .65rem); block-size: var(--dot-size, .65rem); border-radius: 50%; }
  [data-bin='0'] { --dot-size: .4rem; background: var(--brand); opacity: .7; }
  [data-bin='1'] { --dot-size: .5rem; background: var(--brand); opacity: .85; }
  [data-bin='2'] { --dot-size: .6rem; background: var(--seq-2); }
  [data-bin='3'] { --dot-size: .6rem; background: var(--seq-3); }
  [data-bin='4'] { --dot-size: .8rem; background: var(--seq-4); }
  [data-bin='unknown'], .dot.partial { --dot-size: .5rem; border: 1px dashed var(--control-line); }
  .year-cell.partial { outline: 1px dashed var(--control-line); outline-offset: -2px; }
  .year-cell.partial:focus-visible { outline: var(--focus-ring); }
  .no-record { color: var(--ink-2); }
  .history-values[open] { display: grid; gap: var(--space-2); }
  summary { min-block-size: var(--target-min); cursor: pointer; align-content: center; width: fit-content; color: var(--brand); font-weight: 650; font-size: var(--t-base); }
  @media (max-width: 40rem) {
    .teaching-matrix { --teaching-course-width: min(8.5rem, 34vw); --teaching-year-width: 3.2rem; }
    .teaching-matrix:not(.compact) .matrix-frame :global(table) { table-layout: fixed; }
    .teaching-matrix:not(.compact) .year-cell { flex-direction: column; gap: .12rem; line-height: 1.1; }
    .year-cell:has([data-bin='unknown']) { flex-direction: column; gap: 0; line-height: 1.2; }
    .desktop-years { display: none; }
    .phone-years, .matrix-scroll { display: revert; }
    .matrix-frame.overflow { position: relative; }
    .matrix-frame.overflow::after { content: ''; pointer-events: none; position: absolute; inset: 1px 1px 1px auto; inline-size: .75rem; background: linear-gradient(to right, transparent, var(--panel-raised)); border-radius: 0 var(--radius-card) var(--radius-card) 0; }
    .matrix-frame :global(td), .matrix-frame :global(th:not(:first-child)) { padding-inline: .35rem; }
    .matrix-scroll { text-align: end; }
    .matrix-frame :global(.sticky) { box-shadow: 5px 0 6px -5px var(--control-line); }
    .year-lists, .year-lists ul { padding: 0; margin: 0; list-style: none; }
    .year-lists > li { border-block-start: 1px solid var(--line); }
    .year-lists small { display: inline; }
    .year-lists ul li { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); font-size: var(--t-sm); }
    .year-lists a { display: inline-flex; align-items: center; min-block-size: var(--target-min); }
  }
</style>
