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
    minSegmentLength?: number;
    bridgeGaps?: boolean;
    partial?: readonly boolean[];
  }

  let { values, label, labels, min, max, decorative = false, showValues = false, showArea = true, minSegmentLength = 2, bridgeGaps = false, partial = [] }: Props = $props();
  const id = $props.id();
  const hatchId = `${id}-partial`;
  let partialSlots = $derived(partial.flatMap((marked, index) => marked ? [index] : []));

  let samples = $derived(values.map(finiteValue));
  let segments = $derived.by(() => {
    let low = Infinity;
    let high = -Infinity;
    for (const value of samples) {
      if (value === null) continue;
      low = Math.min(low, value);
      high = Math.max(high, value);
    }
    if (min !== undefined) low = Math.min(min, low);
    if (max !== undefined) high = Math.max(max, high);
    return lineSegments(samples.map((value, index) => value === null ? null : {
      x: samples.length === 1 ? 48 : 3 + 90 * index / (samples.length - 1),
      y: low === high ? 16 : 29 - 26 * (value - low) / (high - low)
    }));
  });
  let rows = $derived(samples.map((value, index) => ({ index, label: labels?.[index] ?? index + 1, value })));
  let measured = $derived(rows.filter((row) => row.value !== null));
  let status = $derived(measured.length ? '單期有資料' : '未公布');
  let breakdown = $derived(rows.map((row) => `${row.label}：${displayValue(row.value)}${partial[row.index] ? `（${partialTermLabel}）` : ''}`).join('、'));
  const columns: TableColumn<(typeof rows)[number]>[] = [
    { id: 'label', label: '期別', value: (row) => row.label },
    { id: 'value', label: '數值', numeric: true, value: (row) => row.value }
  ];
</script>

{#if measured.length > 1}
  <svg viewBox="0 0 96 32" preserveAspectRatio="none" role={decorative ? undefined : 'img'}
    aria-hidden={decorative || undefined} aria-label={decorative ? undefined : label}>
    {#if labels}<title>{breakdown}</title>{/if}
    {#if partialSlots.length}
      <defs><pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path class="hatch" d="M0 0V6" /></pattern></defs>
      {#each partialSlots as index (index)}
        {@const spacing = 90 / (samples.length - 1)}
        {@const x = 3 + index * spacing}
        <rect x={Math.max(0, x - spacing * .45)} y="0" width={Math.min(96, x + spacing * .45) - Math.max(0, x - spacing * .45)} height="32" fill={`url(#${hatchId})`} />
      {/each}
    {/if}
    {#each segments as segment, index}
      {#if bridgeGaps && index > 0}
        <path class="line gap" d={linePath([segments[index - 1].at(-1)!, segment[0]])} vector-effect="non-scaling-stroke" />
      {/if}
      {#if segment.length < minSegmentLength && !bridgeGaps}
        {#each segment as point (point.x)}<ellipse cx={point.x} cy={point.y} rx="3" ry="2.67" />{/each}
      {:else if segment.length > 1}
        {@const path = linePath(segment)}
        {#if showArea}<path class="area" d={`${path} V32 H${segment[0].x} Z`} />{/if}
        <path class="line" d={path} vector-effect="non-scaling-stroke" />
      {/if}
    {/each}
  </svg>
{:else}
  <span class="sparse" role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined}
    aria-label={decorative ? undefined : `${label}：${status}${labels && breakdown ? `，${breakdown}` : ''}`}
    title={labels && breakdown ? breakdown : status}>
    {#if labels && measured.length}<span class="sparse-detail">{measured[0].label} · {displayValue(measured[0].value)}</span>
    {:else}{status}{/if}
  </span>
{/if}
{#if showValues && rows.length}
  <ChartValues {label} {columns} {rows} rowKey={(row) => row.index} />
{/if}

<style>
  svg { display: inline-block; inline-size: 64px; block-size: 24px; max-inline-size: 100%; vertical-align: middle; }
  .area { fill: var(--brand); fill-opacity: 0.12; }
  .line { fill: none; stroke: var(--brand); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  .gap { stroke-dasharray: 4 2; stroke-linecap: butt; }
  .hatch { stroke: var(--brand); stroke-width: 2; stroke-opacity: .5; }
  ellipse { fill: var(--brand); }
  .sparse { color: var(--muted); font-size: var(--t-sm); white-space: nowrap; }
  .sparse-detail { font-variant-numeric: tabular-nums; }
</style>
