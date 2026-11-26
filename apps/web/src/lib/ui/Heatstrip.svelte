<script lang="ts">
  import ChartValues from './ChartValues.svelte';
  import { displayValue, finiteValue } from './format';
  import type { CoverageCell, TableColumn } from './types';

  interface Props {
    cells: readonly CoverageCell[];
    label?: string;
    periodUnit?: string;
    valueUnit?: string;
    fullValue?: number;
    showValues?: boolean;
    showCounts?: boolean;
  }

  let { cells, label = '收錄範圍', periodUnit = '學年', valueUnit = '學期', fullValue = 2, showValues = false, showCounts = false }: Props = $props();
  let rows = $derived(cells.map((cell) => ({ ...cell, value: finiteValue(cell.value) })));
  let covered = $derived(rows.filter(({ value }) => value !== null && value > 0).length);
  let known = $derived(rows.filter(({ value }) => value !== null).length);
  let summary = $derived(rows.length
    ? `${rows[0].period}${rows.length > 1 ? ` 到 ${rows.at(-1)?.period}` : ''} ${periodUnit}，${known ? `${covered} ${periodUnit}有資料` : '各期收錄狀態未公布'}`
    : '沒有可顯示的期間');
  let description = $derived(showCounts && rows.length ? `；${rows.map(cellLabel).join('、')}` : '');
  let columns: TableColumn<CoverageCell>[] = $derived([
    { id: 'period', label: periodUnit, value: (cell) => cell.period },
    { id: 'value', label: `已收錄（${valueUnit}）`, numeric: true, value: (cell) => cell.value }
  ]);

  function cellLabel(cell: CoverageCell) {
    return `${cell.period} ${periodUnit}：${cell.value === null ? '未公布' : `${displayValue(cell.value)} ${valueUnit}`}`;
  }
</script>

<div class="strip" class:counts={showCounts} role="img" aria-label={`${label}：${summary}${description}`}>
  {#each rows as cell (cell.period)}
    <span class="cell" class:full={cell.value !== null && cell.value >= fullValue}
      class:partial={cell.value !== null && cell.value > 0 && cell.value < fullValue}
      class:unknown={cell.value === null} title={cellLabel(cell)} aria-hidden="true">{#if showCounts}{displayValue(cell.value)}{/if}</span>
  {:else}
    <span class="empty" aria-hidden="true">—</span>
  {/each}
</div>
{#if showValues && rows.length}
  <ChartValues {label} {columns} {rows} rowKey={(cell) => cell.period} />
{/if}

<style>
  .strip { display: flex; flex-wrap: wrap; gap: var(--heatstrip-gap, 2px); }
  .cell { inline-size: var(--heatstrip-cell-size, 10px); block-size: var(--heatstrip-cell-size, 10px); border: 1px solid var(--control-line); border-radius: 2px; background: var(--panel); }
  .partial { border-color: var(--brand-ring); background: var(--brand-wash); }
  .full { border-color: var(--brand); background: var(--brand); }
  .unknown { border-style: dashed; background: transparent; }
  .counts .cell { display: grid; place-items: center; font: var(--t-xs) / 1 var(--font-mono); color: var(--ink-2); }
  .counts .partial { color: var(--brand-ink); font-weight: 650; }
  .counts .full { color: var(--on-brand); font-weight: 650; }
  .empty { color: var(--muted); }
</style>
