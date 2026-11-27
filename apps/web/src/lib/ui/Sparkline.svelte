<script lang="ts">
  import { linePath, lineSegments } from './chart-scale';
  import ChartValues from './ChartValues.svelte';
  import PartialTermLegend from './PartialTermLegend.svelte';
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
    /** Show short series as columns on the same horizontal and vertical scales. */
    sparseBars?: boolean;
    /** Show a dot plot below this sample count or when there is no continuous series. */
    sparseDotsBelow?: number;
    /** Minimum bar height in SVG units for positive measurements. */
    minimumBarHeight?: number;
    /** Omit the legend when the surrounding table already supplies one. */
    showPartialLegend?: boolean;
  }

  let { values, label, labels, min, max, decorative = false, showValues = false, showArea = true, showSparse = true, partial = [], sparseBars = false, sparseDotsBelow, minimumBarHeight = 1, showPartialLegend }: Props = $props();
  let samples = $derived(values.map(finiteValue));
  let includeZero = $derived(sparseBars || sparseDotsBelow !== undefined || partial.some(Boolean));
  let scale = $derived.by(() => {
    let low = includeZero ? 0 : Infinity;
    let high = includeZero ? 0 : -Infinity;
    for (const value of samples) {
      if (value === null) continue;
      low = Math.min(low, value);
      high = Math.max(high, value);
    }
    if (min !== undefined) low = Math.min(min, low);
    if (max !== undefined) high = Math.max(max, high);
    return { low, high };
  });
  let points = $derived(samples.map((value, index) => value === null ? null : {
    x: samples.length === 1 ? 48 : 3 + 90 * index / (samples.length - 1),
    y: ordinate(value)
  }));
  let zero = $derived(ordinate(0));
  let linePoints = $derived(points.map((point, index) => partial[index] ? null : point));
  let segments = $derived(lineSegments(linePoints).filter((segment) => segment.length > 1));
  let rows = $derived(samples.map((value, index) => ({ index, label: labels?.[index] ?? index + 1, value })));
  let measured = $derived(rows.filter((row) => row.value !== null));
  let drawBars = $derived(sparseBars && measured.length >= 2 && (measured.length <= 3 || !segments.length));
  let drawDots = $derived(sparseDotsBelow !== undefined && measured.length > 1 && (measured.length < sparseDotsBelow || !segments.length));
  let hasPartial = $derived(measured.some(({ index }) => partial[index]));
  let status = $derived(measured.length > 1 ? '無連續數值' : measured.length ? '單期有資料' : '未公布');
  let breakdown = $derived(rows.map((row) => `${row.label}：${displayValue(row.value)}${partial[row.index] ? `（${partialTermLabel}）` : ''}`).join('、'));
  let columns = $derived<TableColumn<(typeof rows)[number]>[]>([
    { id: 'label', label: '期別', value: (row) => row.label },
    { id: 'value', label: '數值', numeric: true, value: (row) => row.value },
    ...(partial.some(Boolean) ? [{ id: 'coverage', label: '收錄備註', value: (row: (typeof rows)[number]) => partial[row.index] ? partialTermLabel : null }] : [])
  ]);

  function ordinate(value: number) {
    if (scale.low === scale.high) return includeZero ? 29 : 16;
    return 29 - 26 * (value - scale.low) / (scale.high - scale.low);
  }
</script>

{#if drawDots || drawBars || segments.length || (hasPartial && measured.length > 1)}
  <svg viewBox="0 0 96 32" preserveAspectRatio="none" role={decorative ? undefined : 'img'}
    aria-hidden={decorative || undefined} aria-label={decorative ? undefined : hasPartial ? `${label}：${breakdown}` : label}>
    {#if labels}<title>{breakdown}</title>{/if}
    {#if !drawBars && !drawDots}
      {#each segments as segment}
        {@const path = linePath(segment)}
        {#if showArea}<path class="area" d={`${path} V32 H${segment[0].x} Z`} />{/if}
        <path class="line" d={path} vector-effect="non-scaling-stroke" />
      {/each}
    {/if}
    {#each points as point, index}
      {#if point && (drawDots || (sparseDotsBelow !== undefined && (partial[index] || (!linePoints[index - 1] && !linePoints[index + 1]))))}
        <circle class="dot" class:partial-dot-mark={partial[index]} cx={point.x} cy={point.y} r="2.25" />
      {:else if point && (drawBars || partial[index])}
        {@const width = Math.min(5, 62 / Math.max(1, samples.length - 1))}
        {@const height = Math.max((samples[index] ?? 0) > 0 ? minimumBarHeight : 1, Math.abs(zero - point.y))}
        <rect class="bar" class:partial-mark={partial[index]} x={point.x - width / 2} y={point.y > zero ? zero : zero - height} {width} {height} />
      {/if}
    {/each}
  </svg>
{:else if showSparse}
  <span class="sparse" role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined}
    aria-label={decorative ? undefined : `${label}：${status}${labels && breakdown ? `，${breakdown}` : ''}`}
    title={labels && breakdown ? breakdown : status}>
    {#if labels && measured.length === 1}<span class="sparse-detail">{#if hasPartial}<i class="partial-dot" aria-hidden="true"></i>{/if}{measured[0].label} · {displayValue(measured[0].value)}</span>
    {:else}{status}{/if}
  </span>
{/if}
{#if (showPartialLegend ?? !decorative) && hasPartial && (showSparse || drawBars || segments.length || measured.length > 1)}<PartialTermLegend />{/if}
{#if showValues && rows.length}
  <ChartValues {label} {columns} {rows} rowKey={(row) => row.index} />
{/if}

<style>
  svg { display: inline-block; inline-size: var(--sparkline-width, 64px); block-size: var(--sparkline-height, 24px); max-inline-size: 100%; vertical-align: middle; }
  .area { fill: var(--brand); fill-opacity: 0.12; }
  .line { fill: none; stroke: var(--brand); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  .bar { fill: var(--series-1); }
  .dot { fill: var(--series-1); }
  .partial-dot-mark { fill: var(--panel-raised); stroke: var(--series-1); }
  .partial-mark { fill: var(--partial-fill); }
  .partial-dot { display: inline-block; inline-size: .55em; block-size: .55em; margin-inline-end: var(--space-1); border-radius: 2px; background: var(--partial-fill); }
  .sparse { color: var(--muted); font-size: var(--t-sm); white-space: nowrap; }
  .sparse-detail { font-variant-numeric: tabular-nums; }
</style>
