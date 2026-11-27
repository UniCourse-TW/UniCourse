<script lang="ts">
  import { displayValue } from '$lib/ui/format';
  import TrendChart from '$lib/ui/TrendChart.svelte';
  import type { TrendPoint } from '$lib/ui/types';

  let { label, points, termHref, phonePreview = false }: { label: string; points: TrendPoint[]; termHref?: (term: string) => string; phonePreview?: boolean } = $props();
  let measured = $derived(points.filter(({ value }) => value !== null));
  let max = $derived(Math.max(1, ...measured.map(({ value }) => value ?? 0)));
</script>

{#snippet list(rows: TrendPoint[], listLabel: string)}
  <ul class="term-values" aria-label={listLabel} role="list">
    {#each rows as { term, value } (term)}
      <li>
        {#if termHref}<a class="ui-tabular" href={termHref(term)}>{term}</a>{:else}<span class="ui-tabular">{term}</span>{/if}
        <span class="track" aria-hidden="true"><span style:inline-size={`${100 * (value ?? 0) / max}%`}></span></span>
        <strong class="ui-tabular">{displayValue(value)} 班</strong>
      </li>
    {/each}
  </ul>
{/snippet}

{#if measured.length > 0 && measured.length <= 3}
  {@render list(measured, label)}
{:else}
  {#if phonePreview && measured.length}
    <div class="phone-preview"><p>最近三期開課班次</p>{@render list(measured.slice(-3).reverse(), '最近三期開課班次')}</div>
  {/if}
  <div class="term-chart" class:compact-phone={phonePreview}><TrendChart {label} {points} unit="班" {termHref} /></div>
{/if}

<style>
  .term-values { display: grid; gap: .5rem; inline-size: min(100%, 28rem); margin: 0; padding: .65rem .85rem; list-style: none; background: var(--panel-raised); border: 1px solid var(--line); border-radius: var(--radius-card); }
  li { display: grid; grid-template-columns: 4.5rem minmax(1rem, 1fr) minmax(3.5rem, auto); align-items: center; gap: var(--space-2); font-size: var(--t-base); }
  li a { min-block-size: var(--target-min); align-content: center; }
  strong { text-align: end; }
  .track { block-size: .45rem; background: var(--line); border-radius: var(--radius-pill); overflow: hidden; }
  .track > span { display: block; block-size: 100%; background: var(--brand); }
  .term-chart :global(.plot svg) { block-size: 9rem; }
  .term-chart :global(.gridline) { stroke: color-mix(in srgb, var(--control-line) 55%, var(--line)); }
  .term-chart :global(.axis), .term-chart :global(.terms) { color: var(--ink-2); }
  .phone-preview { display: none; }
  .phone-preview p { margin-block-end: var(--space-1); color: var(--muted); font-size: var(--t-sm); }
  @media (max-width: 40rem) {
    .term-chart :global(.plot svg) { block-size: 7rem; }
    .phone-preview { display: block; }
    .compact-phone :global([role='img']) { display: none; }
    .compact-phone :global(figcaption) { display: none; }
    .compact-phone :global(figure) { padding-block: 0; }
  }
</style>
