<script lang="ts">
  import TrendChart from '$lib/ui/TrendChart.svelte';
  import type { TrendPoint } from '$lib/ui/types';

  let { label, points, termHref }: { label: string; points: TrendPoint[]; termHref?: (term: string) => string } = $props();
</script>

<div class="term-chart"><TrendChart {label} {points} unit="班" {termHref} yearTicks /></div>

<style>
  .term-chart :global(figure) { padding: var(--space-2) var(--space-3); }
  .term-chart :global(figcaption) { margin-block-end: var(--space-3); }
  .term-chart :global(.plot svg) { block-size: 6.25rem; }
  .term-chart :global(.gridline) { stroke: color-mix(in srgb, var(--control-line) 55%, var(--line)); }
  .term-chart :global(.axis), .term-chart :global(.terms) { color: var(--ink-2); }
</style>
