<script lang="ts">
  import ChartValues from './ChartValues.svelte';
  import DataTable from './DataTable.svelte';
  import EmptyState from './EmptyState.svelte';
  import { displayValue } from './format';
  import type { MatrixPoint, MatrixRow, TableColumn } from './types';

  interface Props {
    label: string;
    periods: readonly string[];
    rows: readonly MatrixRow[];
    periodLabel?: string;
    thresholds?: readonly [number, number];
    initialRows?: number;
  }

  let { label, periods, rows, periodLabel = '學期', thresholds = [50, 100], initialRows = 8 }: Props = $props();
  const courseId = 'course';
  let records = $derived(rows.flatMap((row) => periods.flatMap((period) => row.points[period] ?? [])));
  let compact = $derived(periods.length <= 3 || records.every((point) => point.enrolled === null));
  let columns: TableColumn<MatrixRow>[] = $derived([
    { id: courseId, label: '課程', value: (row) => row.label },
    ...periods.map((period) => ({
      id: period,
      label: period,
      align: 'center' as const,
      value: (row: MatrixRow) => row.points[period] ? totals(row.points[period]) : null
    }))
  ]);
  let minWidth = $derived(compact && periods.length <= 3 ? '100%' : `${9.5 + periods.length * 3.75}rem`);

  function totals(point: MatrixPoint) {
    return `${displayValue(point.offerings)} 班，${point.enrolled === null ? '人數未公布' : `${displayValue(point.enrolled)} 人`}`;
  }

  function bin(enrolled: number | null) {
    if (enrolled === null) return 'unknown';
    if (enrolled < thresholds[0]) return 'small';
    if (enrolled < thresholds[1]) return 'medium';
    return 'large';
  }
</script>

{#snippet matrixCell(row: MatrixRow, column: TableColumn<MatrixRow>)}
  {#if column.id === courseId}
    {row.label}
  {:else}
    {@const point = row.points[column.id]}
    {#if point}
      {@const hint = `${column.id} ${periodLabel}：${totals(point)}`}
      {#if compact}
        {#if point.href}<a class="marker value" href={point.href} aria-label={`${row.label}，${hint}`}>{totals(point)}</a>
        {:else}<span class="value">{totals(point)}</span>{/if}
      {:else if point.href}
        <a class="marker" href={point.href} aria-label={`${row.label}，${hint}`} title={hint}>
          <span class="dot" data-size={bin(point.enrolled)} aria-hidden="true"></span>
        </a>
      {:else}
        <span class="marker" role="img" aria-label={hint} title={hint}>
          <span class="dot" data-size={bin(point.enrolled)} aria-hidden="true"></span>
        </span>
      {/if}
    {:else}
      {#if compact}<span class="missing-value" title="無開課紀錄">—<span class="missing"> 無開課紀錄</span></span>
      {:else}<span class="missing">無開課紀錄</span>{/if}
    {/if}
  {/if}
{/snippet}

{#if records.length}
  <div class="matrix">
    {#if !compact}
      <ul class="legend" role="list" aria-label="修課人數圖例">
        <li><span class="dot" data-size="small" aria-hidden="true"></span>少於 {displayValue(thresholds[0])} 人</li>
        <li><span class="dot" data-size="medium" aria-hidden="true"></span>{displayValue(thresholds[0])} 至未滿 {displayValue(thresholds[1])} 人</li>
        <li><span class="dot" data-size="large" aria-hidden="true"></span>{displayValue(thresholds[1])} 人以上</li>
        <li><span class="dot" data-size="unknown" aria-hidden="true"></span>人數未公布</li>
      </ul>
    {/if}
    <DataTable caption={label} {columns} rows={rows.slice(0, initialRows)} rowKey={(row) => row.id} {minWidth} cell={matrixCell} />
    {#if rows.length > initialRows}
      <details>
        <summary>查看其他 {displayValue(rows.length - initialRows)} 門課程</summary>
        <DataTable caption={`${label}：其他課程`} {columns} rows={rows.slice(initialRows)} rowKey={(row) => row.id} {minWidth} cell={matrixCell} />
      </details>
    {/if}
    {#if !compact}<ChartValues {label} {columns} {rows} rowKey={(row) => row.id} />{/if}
  </div>
{:else}
  <EmptyState title="沒有開課紀錄" />
{/if}

<style>
  .matrix { min-inline-size: 0; --table-pad-block: 0.21875rem; }
  .legend { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); padding: 0; margin: 0 0 var(--space-2); list-style: none; color: var(--muted); font: var(--t-sm) / var(--leading-body) var(--font-sans); }
  .legend li { display: flex; align-items: center; gap: var(--space-1); }
  .marker { display: grid; place-items: center; }
  a.marker {
    min-inline-size: var(--target-min);
    min-block-size: var(--target-min);
    margin-block: calc(-1 * var(--table-pad-block));
    border-radius: var(--radius-control);
    touch-action: manipulation;
  }
  a.marker:hover { background: var(--brand-wash); }
  .value { font-size: var(--t-sm); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
  .missing-value { color: var(--muted); }
  .dot { display: inline-block; inline-size: 6px; block-size: 6px; border-radius: 50%; background: var(--seq-2); }
  [data-size='medium'] { inline-size: 10px; block-size: 10px; background: var(--seq-3); }
  [data-size='large'] { inline-size: 14px; block-size: 14px; background: var(--seq-4); }
  [data-size='unknown'] { inline-size: 8px; block-size: 8px; border: 1px solid var(--control-line); background: transparent; }
  .missing { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  summary {
    inline-size: fit-content;
    min-block-size: var(--target-min);
    min-inline-size: var(--target-min);
    padding: 0 var(--space-2);
    align-content: center;
    border-radius: var(--radius-control);
    color: var(--brand-ink);
    font: 600 var(--t-sm) / var(--leading-body) var(--font-sans);
    cursor: pointer;
    touch-action: manipulation;
  }
  summary:hover { text-decoration: underline; }
  :is(summary, a.marker):focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
</style>
