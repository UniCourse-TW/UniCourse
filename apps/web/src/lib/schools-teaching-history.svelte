<script lang="ts">
  import type { TermTrend } from '@unicourse/api-client';
  import DataTable from '$lib/ui/DataTable.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import { displayValue } from '$lib/ui/format';
  import type { MatrixPoint, MatrixRow, TableColumn } from '$lib/ui/types';

  let { periods, rows, trends }: { periods: string[]; rows: MatrixRow[]; trends: TermTrend[] | null } = $props();
  let orderedYears = $derived([...periods].reverse());
  let compact = $derived(periods.length <= 2);
  let columns = $derived<TableColumn<MatrixRow>[]>([
    { id: 'course', label: '課程', width: '9rem' },
    ...orderedYears.map((period) => ({ id: period, label: period, align: 'center' as const, width: compact ? '5rem' : '3.25rem' }))
  ]);
  let width = $derived(compact ? '0' : `${9 + 3.25 * periods.length}rem`);
  const trendColumns: TableColumn<TermTrend>[] = [
    { id: 'term', label: '學期', value: (row) => row.term },
    { id: 'offerings', label: '班次', value: (row) => row.offerings, numeric: true },
    { id: 'enrolled', label: '已公布人次', value: (row) => row.enrolled, numeric: true }
  ];

  function totals(point: MatrixPoint) {
    return `${displayValue(point.offerings)} 班 · ${point.enrolled === null ? '人數未公布' : `${displayValue(point.enrolled)} 人`}`;
  }

  function bin(enrolled: number | null) {
    return enrolled === null ? 'unknown' : enrolled < 50 ? 'small' : enrolled < 100 ? 'medium' : 'large';
  }
</script>

{#snippet historyCell(row: MatrixRow, column: TableColumn<MatrixRow>, exact: boolean)}
  {@const point = row.points[column.id]}
  {#if column.id === 'course'}
    {row.label}
  {:else if point}
    {@const hint = `${column.id} 學年：${totals(point)}`}
    {#snippet value()}
      {#if exact}<span>{totals(point)}</span>{:else}<span class="dot" data-bin={bin(point.enrolled)}></span>{/if}
      {#if point.href}<span class="arrow" aria-hidden="true">↗</span>{/if}
    {/snippet}
    {#if point.href}
      <a href={point.href} class="year-cell" aria-label={`${row.label}，${hint}，查看最新班次`} title={hint}>{@render value()}</a>
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
        <li><span class="dot" data-bin="unknown" aria-hidden="true"></span>未公布</li>
        <li><span aria-hidden="true">—</span>未開課</li>
      </ul>
      <p class="browse-note matrix-range">最近開課的 {Math.min(5, rows.length)} 門 · {periods[0]}–{periods.at(-1)} 學年（新到舊） · 左右滑動看早期學年</p>
    {/if}
    <DataTable caption={compact ? '課程與學年授課紀錄' : '課程與學年點陣'} {columns} rows={rows.slice(0, 5)} rowKey={(row) => row.id} minWidth={width} maxHeight="none" scrollHint={!compact}>
      {#snippet cell(row, column)}{@render historyCell(row, column, compact)}{/snippet}
    </DataTable>
  </div>
{:else}<EmptyState title="尚無歷年授課紀錄" />{/if}

<details class="history-values">
  <summary>查看授課數值{rows.length > 5 ? `（本表 ${displayValue(rows.length)} 門課）` : ''}</summary>
  {#if rows.length && (!compact || rows.length > 5)}
    <DataTable caption="各課程的學年數值" {columns} {rows} rowKey={(row) => row.id} minWidth={compact ? '0' : `${9 + 6 * periods.length}rem`} maxHeight="none" scrollHint={!compact}>
      {#snippet cell(row, column)}{@render historyCell(row, column, true)}{/snippet}
    </DataTable>
  {/if}
  {#if trends?.length}
    <DataTable caption="各學期授課數值（所有開課班次）" columns={trendColumns} rows={trends} rowKey={(row) => row.term} minWidth="0" maxHeight="none" scrollHint={false} />
  {:else}<p class="browse-note">{trends === null ? '目前無法取得各學期的完整數值。' : '尚無各學期統計。'}</p>{/if}
</details>

<style>
  .teaching-matrix { max-inline-size: 62rem; }
  .teaching-matrix.compact { max-inline-size: 34rem; }
  .teaching-matrix :global(.sticky) { max-inline-size: 9rem; overflow-wrap: anywhere; }
  .matrix-legend { display: flex; flex-wrap: wrap; gap: .25rem .85rem; margin: 0 0 var(--space-2); padding: 0; list-style: none; color: var(--muted); font-size: var(--t-sm); }
  .matrix-range { margin-block-end: var(--space-2); }
  .matrix-legend li, .year-cell { display: flex; align-items: center; gap: .3rem; }
  .year-cell { min-block-size: var(--target-min); min-inline-size: 2rem; justify-content: center; border-radius: var(--radius-control); padding-inline: .15rem; }
  .year-cell[href] { text-decoration: none; background: var(--brand-wash); }
  .year-cell[href]:hover { box-shadow: inset 0 0 0 1px var(--brand); text-decoration: underline; }
  .arrow { font-size: var(--t-xs); }
  .dot { display: inline-block; flex: none; inline-size: 6px; block-size: 6px; border-radius: 50%; background: var(--brand-ink); }
  .dot[data-bin='medium'] { inline-size: 10px; block-size: 10px; }
  .dot[data-bin='large'] { inline-size: 14px; block-size: 14px; }
  .dot[data-bin='unknown'] { inline-size: 8px; block-size: 8px; background: transparent; border: 1px solid var(--brand-ink); }
  .no-record { color: var(--muted); }
  .history-values[open] { display: grid; gap: var(--space-2); }
  summary { min-block-size: var(--target-min); cursor: pointer; align-content: center; width: fit-content; color: var(--brand); font-weight: 650; font-size: var(--t-base); }
</style>
