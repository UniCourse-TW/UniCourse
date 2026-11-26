<script lang="ts">
  import ChartValues from './ChartValues.svelte';
  import { displayValue } from './format';
  import type { CoverageCell, TableColumn } from './types';

  interface Props {
    cells: readonly CoverageCell[];
    label?: string;
    periodUnit?: string;
    valueUnit?: string;
    fullValue?: number;
    showValues?: boolean;
  }

  let { cells, label = '收錄範圍', periodUnit = '學年', valueUnit = '學期', fullValue = 2, showValues = false }: Props = $props();
  let covered = $derived(cells.filter(({ value }) => value !== null && value > 0).length);
  let summary = $derived(cells.length ? `${cells[0].period} 到 ${cells[cells.length - 1].period} ${periodUnit}，${covered} ${periodUnit}有資料` : '沒有可顯示的期間');
  let columns: TableColumn<CoverageCell>[] = $derived([
    { id: 'period', label: periodUnit, value: (cell) => cell.period },
    { id: 'value', label: `已收錄（${valueUnit}）`, numeric: true, value: (cell) => cell.value }
  ]);
</script>

<div class="strip" role="img" aria-label={`${label}：${summary}`}>
  {#each cells as cell (cell.period)}
    <span class="cell" class:full={cell.value !== null && cell.value >= fullValue}
      class:partial={cell.value !== null && cell.value > 0 && cell.value < fullValue}
      class:unknown={cell.value === null}
      title={`${cell.period} ${periodUnit}：${cell.value === null ? '未公布' : `${displayValue(cell.value)} ${valueUnit}`}`}
      aria-hidden="true"></span>
  {:else}
    <span class="empty" aria-hidden="true">—</span>
  {/each}
</div>
{#if showValues && cells.length}
  <ChartValues {label} {columns} rows={cells} rowKey={(cell) => cell.period} />
{/if}

<style>
  .strip { display: flex; flex-wrap: wrap; gap: 2px; }
  .cell { inline-size: 10px; block-size: 10px; border: 1px solid transparent; border-radius: 2px; background: var(--seq-0); }
  .partial { background: var(--seq-2); }
  .full { background: var(--seq-4); }
  .unknown { border-color: var(--control-line); border-style: dashed; background: transparent; }
  .empty { color: var(--muted); }
</style>
