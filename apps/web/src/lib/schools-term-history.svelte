<script lang="ts">
  import TrendChart from '$lib/ui/TrendChart.svelte';
  import type { TrendPoint } from '$lib/ui/types';

  let { label, points, termHref, unit = '班', compact = false }: { label: string; points: TrendPoint[]; termHref?: (term: string) => string; unit?: string; compact?: boolean } = $props();
</script>

<div class="term-chart" class:compact><TrendChart {label} {points} {unit} {termHref} yearTicks linkedBars={Boolean(termHref) && !compact} condensed={compact} /></div>

<style>
  .term-chart :global(figure) { padding: var(--space-2) var(--space-3); }
  .term-chart :global(figcaption) { margin-block-end: var(--space-3); }
  .term-chart :global(.plot svg) { block-size: 6.25rem; }
  .term-chart :global(.gridline) { stroke: color-mix(in srgb, var(--control-line) 55%, var(--line)); }
  .term-chart :global(.axis), .term-chart :global(.terms) { color: var(--ink-2); }
  .compact :global(figcaption) { margin-block-end: var(--space-2); }
  .compact :global(.plot svg) { block-size: 3.75rem; }
  @media (max-width: 45rem) {
    .compact :global(figure) { padding-inline: var(--space-2); }
    .compact :global(.axis), .compact :global(.terms) { font-size: var(--t-xs); }
    .compact :global(.plot) { column-gap: var(--space-1); }
    .compact :global(.period-values) { grid-template-columns: minmax(0, 1fr); }
  }
</style>
