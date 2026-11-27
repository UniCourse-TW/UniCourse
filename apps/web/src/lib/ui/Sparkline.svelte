<script lang="ts">
  import { linePath, lineSegments } from './chart-scale';
  import ChartValues from './ChartValues.svelte';
  import { displayValue, finiteValue } from './format';
  import { partialTermLabel } from './partial-terms';
  import type { TableColumn } from './types';

  interface Props {
    values: readonly (number | null)[];
    label: string;
    labels?: readonly string[];
    min?: number;
    max?: number;
    decorative?: boolean;
    showValues?: boolean;
    showArea?: boolean;
    showSparse?: boolean;
    partial?: readonly boolean[];
  }

  let { values, label, labels, min, max, decorative = false, showValues = false, showArea = true, showSparse = true, partial = [] }: Props = $props();
  let samples = $derived(values.map(finiteValue));
  let points = $derived.by(() => {
    let low = Infinity;
    let high = -Infinity;
    for (const value of samples) {
      if (value === null) continue;
      low = Math.min(low, value);
      high = Math.max(high, value);
    }
    if (min !== undefined) low = Math.min(min, low);
    if (max !== undefined) high = Math.max(max, high);
    return samples.map((value, index) => value === null ? null : {
      x: samples.length === 1 ? 48 : 3 + 90 * index / (samples.length - 1),
      y: low === high ? 16 : 29 - 26 * (value - low) / (high - low)
    });
  });
  let segments = $derived(lineSegments(points.map((point, index) => partial[index] ? null : point))
    .filter((segment) => segment.length > 1));
  let rows = $derived(samples.map((value, index) => ({ index, label: labels?.[index] ?? index + 1, value })));
  let measured = $derived(rows.filter((row) => row.value !== null));
  let status = $derived(measured.length > 1 ? '無連續數值' : measured.length ? '單期有資料' : '未公布');
  let breakdown = $derived(rows.map((row) => `${row.label}：${displayValue(row.value)}${partial[row.index] ? `（${partialTermLabel}）` : ''}`).join('、'));
  let columns = $derived<TableColumn<(typeof rows)[number]>[]>([
    { id: 'label', label: '期別', value: (row) => row.label },
    { id: 'value', label: '數值', numeric: true, value: (row) => row.value },
    ...(partial.some(Boolean) ? [{ id: 'coverage', label: '收錄備註', value: (row: (typeof rows)[number]) => partial[row.index] ? partialTermLabel : null }] : [])
  ]);
</script>

{#if segments.length}
  <svg viewBox="0 0 96 32" preserveAspectRatio="none" role={decorative ? undefined : 'img'}
    aria-hidden={decorative || undefined} aria-label={decorative ? undefined : label}>
    {#if labels}<title>{breakdown}</title>{/if}
    {#each segments as segment}
      {@const path = linePath(segment)}
      {#if showArea}<path class="area" d={`${path} V32 H${segment[0].x} Z`} />{/if}
      <path class="line" d={path} vector-effect="non-scaling-stroke" />
    {/each}
    {#each points as point, index}
      {#if point && partial[index]}
        <line class="partial-guide" x1={point.x} x2={point.x} y1={point.y} y2="29" vector-effect="non-scaling-stroke" />
        <circle class="partial-mark" cx={point.x} cy={point.y} r="2.5" vector-effect="non-scaling-stroke" />
      {/if}
    {/each}
  </svg>
{:else if showSparse}
  <span class="sparse" role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined}
    aria-label={decorative ? undefined : `${label}：${status}${labels && breakdown ? `，${breakdown}` : ''}`}
    title={labels && breakdown ? breakdown : status}>
    {#if labels && measured.length === 1}<span class="sparse-detail">{measured[0].label} · {displayValue(measured[0].value)}</span>
    {:else}{status}{/if}
  </span>
{/if}
{#if showValues && rows.length}
  <ChartValues {label} {columns} {rows} rowKey={(row) => row.index} />
{/if}

<style>
  svg { display: inline-block; inline-size: var(--sparkline-width, 64px); block-size: var(--sparkline-height, 24px); max-inline-size: 100%; vertical-align: middle; }
  .area { fill: var(--brand); fill-opacity: 0.12; }
  .line { fill: none; stroke: var(--brand); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  .partial-guide { stroke: var(--warn); stroke-width: 1; stroke-dasharray: 2 2; }
  .partial-mark { fill: var(--panel-raised); stroke: var(--warn); stroke-width: 1; }
  .sparse { color: var(--muted); font-size: var(--t-sm); white-space: nowrap; }
  .sparse-detail { font-variant-numeric: tabular-nums; }
</style>
