<script lang="ts">
  import type { TermTrend } from '@unicourse/api-client';
  import DataTable from '$lib/ui/DataTable.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import { displayValue } from '$lib/ui/format';
  import { partialTermLabel, partialTerms } from '$lib/ui/partial-terms';
  import type { MatrixPoint, MatrixRow, TableColumn } from '$lib/ui/types';

  let { periods, rows, trends }: { periods: string[]; rows: MatrixRow[]; trends: TermTrend[] | null } = $props();
  let orderedYears = $derived([...periods].reverse());
  let preview = $derived(rows.slice(0, 5));
  let previewYears = $derived(orderedYears.filter((year) => preview.some((row) => row.points[year])));
  let compact = $derived(previewYears.length <= 2);
  let columns = $derived(yearColumns(previewYears, compact));
  let fullColumns = $derived(yearColumns(orderedYears, true));
  let width = $derived(compact ? '0' : `calc(var(--teaching-course-width, 9rem) + ${previewYears.length} * var(--teaching-year-width, 3.75rem))`);
  let hasPartial = $derived(preview.some((row) => Object.values(row.points).some((point) => point?.partial)));
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
    return enrolled === null ? 'unknown' : enrolled < 50 ? 'small' : enrolled < 100 ? 'medium' : 'large';
  }

  function yearColumns(years: string[], exact: boolean): TableColumn<MatrixRow>[] {
    return [{ id: 'course', label: '課程', width: 'var(--teaching-course-width, 9rem)' },
      ...years.map((year) => ({ id: year, label: year, align: 'center' as const, width: exact ? '5rem' : '3.25rem' }))];
  }
</script>

{#snippet historyCell(row: MatrixRow, column: TableColumn<MatrixRow>, exact: boolean)}
  {@const point = row.points[column.id]}
  {#if column.id === 'course'}
    <span class="matrix-course" title={row.label}>{row.label}</span><small class="browse-code">{row.id}</small>
  {:else if point}
    {@const hint = `${column.id} 學年：${totals(point)}${point.partial ? ` · ${partialTermLabel}` : ''}`}
    {#snippet value()}
      {#if exact}<span>{totals(point)}</span>{:else}<span class="ui-tabular count">{point.enrolled === null ? '未公布' : displayValue(point.enrolled)}</span>{/if}
    {/snippet}
    {#if point.href}
      <a href={point.href} class="year-cell" class:partial={point.partial} data-bin={!exact ? bin(point.enrolled) : undefined} aria-label={`${row.label}，${hint}，查看最新班次`} title={hint}>{@render value()}</a>
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
        <li><span class="dot" data-bin="small" aria-hidden="true"></span>未滿 50 人</li>
        <li><span class="dot" data-bin="medium" aria-hidden="true"></span>50–99 人</li>
        <li><span class="dot" data-bin="large" aria-hidden="true"></span>100 人以上</li>
        <li><span aria-hidden="true">—</span>未開課</li>
        {#if hasPartial}<li><span class="dot partial" aria-hidden="true"></span>{partialTermLabel}</li>{/if}
      </ul>
      <p class="browse-note matrix-range">最近開課的 {preview.length} 門 · 僅列有開課的學年{#if previewYears.length > 3}<span class="matrix-scroll"> · 向右滑看更早學年 →</span>{/if}</p>
    {/if}
    <div class="matrix-frame" class:overflow={previewYears.length > 3}>
      <DataTable caption={compact ? '課程與學年授課紀錄' : '課程與學年修課人次'} {columns} rows={preview} rowKey={(row) => row.id} minWidth={width} maxHeight="none" scrollHint={false}>
        {#snippet cell(row, column)}{@render historyCell(row, column, compact)}{/snippet}
      </DataTable>
    </div>
  </div>
{:else}<EmptyState title="尚無歷年授課紀錄" />{/if}

<details class="history-values">
  <summary>{rows.length ? `查看全部 ${displayValue(rows.length)} 門課的逐年數值` : '查看各學期授課數值'}</summary>
  {#if rows.length && (!compact || rows.length > 5 || orderedYears.length !== previewYears.length)}
    <div class="desktop-years"><DataTable caption="各課程的學年數值" columns={fullColumns} {rows} rowKey={(row) => row.id} minWidth={orderedYears.length <= 2 ? '0' : `${9 + 6 * periods.length}rem`} maxHeight="none" scrollHint={orderedYears.length > 2}>
      {#snippet cell(row, column)}{@render historyCell(row, column, true)}{/snippet}
    </DataTable></div>
    <ul class="phone-years year-lists" aria-label="各課程的學年數值">
      {#each rows as row (row.id)}
        <li><details><summary>{row.label} <small class="browse-code">{row.id}</small></summary>
          <ul>{#each orderedYears as year (year)}
            {@const point = row.points[year]}
            {#if point}<li><span class="ui-tabular">{year} 學年 · {totals(point)}{#if point.partial} · {partialTermLabel}{/if}</span>{#if point.href}<a href={point.href}>查看班次 <span aria-hidden="true">→</span></a>{/if}</li>{/if}
          {/each}</ul>
        </details></li>
      {/each}
    </ul>
  {/if}
  {#if trends?.length}
    <DataTable caption="各學期授課數值（所有開課班次）" columns={trendColumns} rows={trends} rowKey={(row) => row.term} minWidth="0" maxHeight="none" scrollHint={false} />
  {:else}<p class="browse-note">{trends === null ? '目前無法取得各學期的完整數值。' : '尚無各學期統計。'}</p>{/if}
</details>

<style>
  .teaching-matrix.compact { max-inline-size: 34rem; }
  .matrix-course { display: block; overflow-wrap: anywhere; }
  .phone-years, .matrix-scroll { display: none; }
  .matrix-legend { display: flex; flex-wrap: wrap; gap: .25rem .85rem; margin: 0 0 var(--space-2); padding: 0; list-style: none; color: var(--muted); font-size: var(--t-sm); }
  .matrix-range { margin-block-end: var(--space-2); }
  .matrix-legend li, .year-cell { display: flex; align-items: center; gap: .3rem; }
  .year-cell { position: relative; min-block-size: var(--target-min); min-inline-size: 2rem; justify-content: center; border-radius: var(--radius-control); padding-inline: .15rem; color: var(--ink); }
  .year-cell[href] { text-underline-offset: .17em; }
  .year-cell[href]:hover { box-shadow: inset 0 0 0 1px var(--brand); text-decoration: underline; }
  .count { font-size: var(--t-sm); }
  .dot { display: inline-block; flex: none; inline-size: .85rem; block-size: .65rem; border-radius: 2px; }
  [data-bin='small'] { background-color: var(--seq-1); box-shadow: inset 0 0 0 1px var(--brand-ring); }
  [data-bin='medium'] { background-color: var(--seq-2); }
  [data-bin='large'] { background-color: color-mix(in srgb, var(--seq-3) 60%, var(--seq-2)); }
  .year-cell[data-bin='unknown'] { color: var(--muted); border: 1px dashed var(--control-line); }
  .dot.partial, .year-cell.partial::after { background-image: var(--partial-hatch); }
  .year-cell.partial::after { content: ''; position: absolute; inset: 2px 2px auto auto; inline-size: 7px; block-size: 7px; border: 1px solid var(--brand-ring); }
  .no-record { color: var(--ink-2); }
  .history-values[open] { display: grid; gap: var(--space-2); }
  summary { min-block-size: var(--target-min); cursor: pointer; align-content: center; width: fit-content; color: var(--brand); font-weight: 650; font-size: var(--t-base); }
  @media (max-width: 40rem) {
    .teaching-matrix { --teaching-course-width: 7.5rem; --teaching-year-width: 3.4rem; }
    .desktop-years { display: none; }
    .phone-years, .matrix-scroll { display: revert; }
    .matrix-frame.overflow { position: relative; }
    .matrix-frame.overflow::after { content: ''; pointer-events: none; position: absolute; inset: 1px 1px 1px auto; inline-size: .75rem; background: linear-gradient(to right, transparent, var(--panel-raised)); border-radius: 0 var(--radius-card) var(--radius-card) 0; }
    .matrix-frame :global(td), .matrix-frame :global(th:not(:first-child)) { padding-inline: .35rem; }
    .matrix-course { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; }
    .year-lists, .year-lists ul { padding: 0; margin: 0; list-style: none; }
    .year-lists > li { border-block-start: 1px solid var(--line); }
    .year-lists small { display: inline; }
    .year-lists ul li { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); font-size: var(--t-sm); }
    .year-lists a { display: inline-flex; align-items: center; min-block-size: var(--target-min); }
  }
</style>
