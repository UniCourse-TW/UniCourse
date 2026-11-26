<script lang="ts">
  import { linePath, lineSegments } from './chart-scale';
  import ChartValues from './ChartValues.svelte';
  import { finiteValue } from './format';
  import type { TableColumn } from './types';

  interface Props {
    values: readonly (number | null)[];
    label: string;
    labels?: readonly string[];
    min?: number;
    max?: number;
    decorative?: boolean;
    showValues?: boolean;
  }

  let { values, label, labels, min, max, decorative = false, showValues = false }: Props = $props();

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
  const columns: TableColumn<(typeof rows)[number]>[] = [
    { id: 'label', label: '期別', value: (row) => row.label },
    { id: 'value', label: '數值', numeric: true, value: (row) => row.value }
  ];
</script>

<svg viewBox="0 0 96 32" preserveAspectRatio="none" role={decorative ? undefined : 'img'}
  aria-hidden={decorative || undefined} aria-label={decorative ? undefined : (segments.length ? label : `${label}：沒有可用數值`)}>
  {#each segments as segment}
    {#if segment.length === 1}
      <ellipse cx={segment[0].x} cy={segment[0].y} rx="3" ry="2.67" />
    {:else}
      {@const path = linePath(segment)}
      <path class="area" d={`${path} V32 H${segment[0].x} Z`} />
      <path class="line" d={path} vector-effect="non-scaling-stroke" />
    {/if}
  {/each}
</svg>
{#if showValues && rows.length}
  <ChartValues {label} {columns} {rows} rowKey={(row) => row.index} />
{/if}

<style>
  svg { display: inline-block; inline-size: 64px; block-size: 24px; max-inline-size: 100%; vertical-align: middle; }
  .area { fill: var(--brand); fill-opacity: 0.12; }
  .line { fill: none; stroke: var(--brand); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  ellipse { fill: var(--brand); }
</style>
