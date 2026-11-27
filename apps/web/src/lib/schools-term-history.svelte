<script lang="ts">
  import type { Snippet } from 'svelte';
  import { zeroBasedScale } from '$lib/ui/chart-scale';
  import { displayValue } from '$lib/ui/format';
  import { partialTermLabel } from '$lib/ui/partial-terms';
  import TrendChart from '$lib/ui/TrendChart.svelte';
  import type { TrendPoint } from '$lib/ui/types';

  let { label, points, termHref, unit = '班', compact = false, termPairs = false, highlight, header, kind = 'column', yearsOnly = false, zeroBaseline = false, peak, conciseSchoolPlot = false }: { label: string; points: TrendPoint[]; termHref?: (term: string) => string; unit?: string; compact?: boolean; termPairs?: boolean; highlight?: string; header?: Snippet; kind?: 'column' | 'line'; yearsOnly?: boolean; zeroBaseline?: boolean; peak?: string; conciseSchoolPlot?: boolean } = $props();
  let measured = $derived(points.filter(({ value }) => value !== null));
  let annotations = $derived.by(() => {
    if (!conciseSchoolPlot || measured.length < 6 || kind !== 'line') return [];
    const { max } = zeroBasedScale(measured.map(({ value }) => value ?? 0));
    return points.flatMap(({ term, value }, index) => {
      if (value === null || (term !== peak && term !== highlight)) return [];
      return [{
        term,
        isPeak: term === peak,
        label: term === highlight ? (term === peak ? '最新・高點' : '最新') : '高點',
        x: (index + 0.5) / points.length,
        y: 1 - value / max
      }];
    });
  });
</script>

<div class="term-chart" class:compact class:conciseSchoolPlot>
  {#if conciseSchoolPlot && measured.length >= 4 && measured.length < 6}
    <figure class="sparse">
      <figcaption>{label}</figcaption>
      <dl>
        {#each measured as point (point.term)}
          <div>
            <dt>{#if termHref}<a href={termHref(point.term)}>{point.term}</a>{:else}{point.term}{/if}</dt>
            <dd>{displayValue(point.value)} {unit}{#if point.partial} · {partialTermLabel}{/if}</dd>
          </div>
        {/each}
      </dl>
      {#if measured.length < points.length}<p>其餘 {points.length - measured.length} 期無資料。</p>{/if}
    </figure>
  {:else}
    {#snippet chartHeader()}
      {@render header?.()}
      {#if annotations.length}
        <div class="plot-labels" aria-hidden="true">
          {#each annotations as mark (mark.term)}
            <span class="plot-mark" class:leading={mark.x < 0.5} class:at-top={mark.y < 0.14} class:peak-mark={mark.isPeak}
              style:--mark-x={`${mark.x * 100}%`} style:--mark-y={`${mark.y * 100}%`}><span>{mark.label}</span></span>
          {/each}
        </div>
      {/if}
    {/snippet}
    <TrendChart {label} {points} {unit} {termHref} termPairs={termPairs && !yearsOnly} {yearsOnly} {highlight} header={chartHeader} {kind} localScale={kind === 'line' && !zeroBaseline} yearTicks linkedBars={Boolean(termHref) && !compact && !conciseSchoolPlot} condensed={compact} />
  {/if}
</div>

<style>
  .term-chart :global(figure) { padding: var(--space-2) var(--space-3); }
  .conciseSchoolPlot :global(.selection) { display: none; }
  .plot-labels { display: none; }
  @media (min-width: 60rem) {
    .conciseSchoolPlot { --school-plot-height: 11.5rem; }
    .conciseSchoolPlot :global(figure) {
      display: grid;
      grid-template-columns: max-content minmax(0, 1fr);
      column-gap: var(--space-2);
    }
    .conciseSchoolPlot :global(figure > *) { grid-column: 1 / -1; }
    .conciseSchoolPlot :global(figure > figcaption) {
      grid-column: 1; align-self: start; margin-block-end: var(--space-1);
    }
    .conciseSchoolPlot :global(figure > .chart-header) { grid-column: 2; justify-content: end; }
    .conciseSchoolPlot :global(figure > .plot-labels),
    .conciseSchoolPlot :global(figure > [role="img"]) { grid-row: 2; }
    .conciseSchoolPlot :global(.plot) { grid-template-columns: 4.5ch minmax(0, 1fr); }
    .plot-labels {
      display: block;
      z-index: 1;
      position: relative;
      block-size: var(--school-plot-height);
      margin-inline-start: calc(4.5ch + var(--space-2));
      pointer-events: none;
    }
    .plot-mark {
      position: absolute;
      inset-block-start: var(--mark-y);
      inset-inline-start: var(--mark-x);
    }
    .peak-mark::before {
      content: ''; position: absolute; inset: 0 auto auto 0; translate: -50% -50%;
      inline-size: 7px; block-size: 7px; border-radius: 50%; background: var(--brand-ink);
      box-shadow: 0 0 0 2px var(--panel-raised);
    }
    .plot-mark span {
      display: block;
      translate: calc(-100% - 5px) calc(-100% - 4px);
      padding-inline: var(--space-1);
      border-radius: var(--radius-control);
      background: var(--panel-raised);
      color: var(--brand-ink);
      font-size: var(--t-sm);
      font-weight: 650;
      white-space: nowrap;
    }
    .plot-mark.leading span { translate: 5px calc(-100% - 4px); }
    .plot-mark.at-top span { translate: calc(-100% - 5px) 4px; }
    .plot-mark.at-top.leading span { translate: 5px 4px; }
  }
  .conciseSchoolPlot :global(.period-values a), .sparse a {
    display: inline-grid; align-items: center; min-inline-size: var(--target-min); min-block-size: var(--target-min);
  }
  .sparse { margin: 0; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
  .sparse figcaption { font-weight: 650; }
  .sparse dl { margin: 0; max-inline-size: 24rem; }
  .sparse dl > div { display: flex; justify-content: space-between; align-items: center; border-block-start: 1px solid var(--line); }
  .sparse dd { margin: 0; font-variant-numeric: tabular-nums; }
  .term-chart :global(figcaption) { margin-block-end: var(--space-3); }
  .term-chart :global(.plot svg) { block-size: var(--school-plot-height, 9rem); }
  .term-chart :global(.gridline) { stroke: color-mix(in srgb, var(--control-line) 55%, var(--line)); }
  .term-chart :global(.axis), .term-chart :global(.terms) { color: var(--ink-2); }
  .compact :global(figcaption) { margin-block-end: var(--space-2); }
  @media (max-width: 45rem) {
    .compact :global(figure) { padding-inline: var(--space-2); }
    .compact :global(.plot) { column-gap: var(--space-1); }
    .compact :global(.period-values) { grid-template-columns: minmax(0, 1fr); }
  }
</style>
