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
    { id: 'course', label: '課程', width: 'var(--teaching-course-width, 9rem)' },
    ...orderedYears.map((period) => ({ id: period, label: period, align: 'center' as const, width: compact ? '5rem' : '3.25rem' }))
  ]);
  let width = $derived(compact ? '0' : `calc(var(--teaching-course-width, 9rem) + ${4.25 * periods.length}rem)`);
  let mobileColumns = $derived(columns.slice(0, 3));
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
    <span class="matrix-course" title={row.label}>{row.label}</span><small class="browse-code">{row.id}</small>
  {:else if point}
    {@const hint = `${column.id} 學年：${totals(point)}`}
    {#snippet value()}
      {#if exact}<span>{totals(point)}</span>{:else}<span class="dot" data-bin={bin(point.enrolled)}></span><span class="ui-tabular count">{displayValue(point.enrolled)}</span>{/if}
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
      <p class="browse-note matrix-range">最近開課的 {Math.min(5, rows.length)} 門 · <span class="desktop-years">{periods[0]}–{periods.at(-1)} 學年</span><span class="phone-years">最近 2 個學年</span></p>
    {/if}
    <div class:desktop-years={!compact}>
      <DataTable caption={compact ? '課程與學年授課紀錄' : '課程與學年點陣'} {columns} rows={rows.slice(0, 5)} rowKey={(row) => row.id} minWidth={width} maxHeight="none" scrollHint={!compact && periods.length > 8}>
        {#snippet cell(row, column)}{@render historyCell(row, column, compact)}{/snippet}
      </DataTable>
    </div>
    {#if !compact}<div class="phone-years">
      <DataTable caption="課程與最近兩學年" columns={mobileColumns} rows={rows.slice(0, 5)} rowKey={(row) => row.id} minWidth="0" maxHeight="none" scrollHint={false}>
        {#snippet cell(row, column)}{@render historyCell(row, column, false)}{/snippet}
      </DataTable>
    </div>{/if}
  </div>
{:else}<EmptyState title="尚無歷年授課紀錄" />{/if}

<details class="history-values">
  <summary>{rows.length ? `查看全部 ${displayValue(rows.length)} 門課的逐年數值` : '查看各學期授課數值'}</summary>
  {#if rows.length && (!compact || rows.length > 5)}
    <div class="desktop-years"><DataTable caption="各課程的學年數值" {columns} {rows} rowKey={(row) => row.id} minWidth={compact ? '0' : `${9 + 6 * periods.length}rem`} maxHeight="none" scrollHint={!compact}>
      {#snippet cell(row, column)}{@render historyCell(row, column, true)}{/snippet}
    </DataTable></div>
    <ul class="phone-years year-lists" aria-label="各課程的學年數值">
      {#each rows as row (row.id)}
        <li><details><summary>{row.label} <small class="browse-code">{row.id}</small></summary>
          <ul>{#each orderedYears as year (year)}
            {@const point = row.points[year]}
            {#if point}<li><span class="ui-tabular">{year} 學年 · {totals(point)}</span>{#if point.href}<a href={point.href}>查看班次 <span aria-hidden="true">↗</span></a>{/if}</li>{/if}
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
  .phone-years { display: none; }
  .matrix-legend { display: flex; flex-wrap: wrap; gap: .25rem .85rem; margin: 0 0 var(--space-2); padding: 0; list-style: none; color: var(--muted); font-size: var(--t-sm); }
  .matrix-range { margin-block-end: var(--space-2); }
  .matrix-legend li, .year-cell { display: flex; align-items: center; gap: .3rem; }
  .year-cell { min-block-size: var(--target-min); min-inline-size: 2rem; justify-content: center; border-radius: var(--radius-control); padding-inline: .15rem; }
  .year-cell[href] { text-decoration: none; background: var(--brand-wash); }
  .year-cell[href]:hover { box-shadow: inset 0 0 0 1px var(--brand); text-decoration: underline; }
  .arrow { font-size: var(--t-xs); }
  .count { font-size: var(--t-sm); }
  .dot { display: inline-block; flex: none; inline-size: 6px; block-size: 6px; border-radius: 50%; background: var(--brand-ink); }
  .dot[data-bin='medium'] { inline-size: 10px; block-size: 10px; }
  .dot[data-bin='large'] { inline-size: 14px; block-size: 14px; }
  .dot[data-bin='unknown'] { inline-size: 8px; block-size: 8px; background: transparent; border: 1px solid var(--brand-ink); }
  .no-record { color: var(--ink-2); }
  .history-values[open] { display: grid; gap: var(--space-2); }
  summary { min-block-size: var(--target-min); cursor: pointer; align-content: center; width: fit-content; color: var(--brand); font-weight: 650; font-size: var(--t-base); }
  @media (max-width: 40rem) {
    .teaching-matrix { --teaching-course-width: 8.5rem; }
    .desktop-years { display: none; }
    .phone-years { display: revert; }
    .matrix-course { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; }
    .year-lists, .year-lists ul { padding: 0; margin: 0; list-style: none; }
    .year-lists > li { border-block-start: 1px solid var(--line); }
    .year-lists small { display: inline; }
    .year-lists ul li { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); font-size: var(--t-sm); }
    .year-lists a { display: inline-flex; align-items: center; min-block-size: var(--target-min); }
  }
</style>
