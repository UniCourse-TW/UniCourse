<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { zeroBasedScale } from '$lib/ui/chart-scale';
  import { displayValue } from '$lib/ui/format';
  import { partialTermLabel } from '$lib/ui/partial-terms';
  import TrendChart from '$lib/ui/TrendChart.svelte';
  import type { TrendPoint } from '$lib/ui/types';

  let { label, points, termHref, unit = '班', compact = false, termPairs = false, highlight, header, kind = 'column', yearsOnly = false, zeroBaseline = false, peak, conciseSchoolPlot = false }: { label: string; points: TrendPoint[]; termHref?: (term: string) => string; unit?: string; compact?: boolean; termPairs?: boolean; highlight?: string; header?: Snippet; kind?: 'column' | 'line'; yearsOnly?: boolean; zeroBaseline?: boolean; peak?: string; conciseSchoolPlot?: boolean } = $props();
  let measured = $derived(points.filter(({ value }) => value !== null));
  let ready = $state(false);
  let inspected = $state<number>();
  let latestIndex = $derived(Math.max(0, points.findIndex(({ term }) => term === highlight)));
  let max = $derived(zeroBasedScale(measured.map(({ value }) => value ?? 0)).max);
  let canInspect = $derived(conciseSchoolPlot && measured.length >= 6);
  let annotations = $derived(canInspect ? points.flatMap((point, index) => {
    if (point.value === null || (point.term !== peak && point.term !== highlight)) return [];
    const latest = point.term === highlight;
    const highest = point.term === peak;
    return [{
      index,
      term: point.term,
      latest,
      highest,
      label: latest ? (highest ? '最新・高點' : '最新') : '高點',
      number: `${displayValue(point.value)} ${unit}`
    }];
  }) : []);
  let inspectedPoint = $derived(inspected === undefined ? undefined : points[inspected]);
  onMount(() => { ready = true; });

  function pointLabel(point: TrendPoint) {
    if (point.value === null) return `${point.term} 學期，無資料`;
    return `${point.term} 學期，${displayValue(point.value)} ${unit}${point.partial ? `（${partialTermLabel}）` : ''}`;
  }
</script>

{#snippet annotation(index: number, latest: boolean, dot: boolean, desktopLabel: string, mobileLabel: string, selected = false)}
  {@const x = (index + 0.5) / points.length}
  {@const y = 1 - (points[index].value ?? 0) / max}
  <span class="plot-mark" class:leading={x < 0.5} class:at-top={y < 0.14} class:peak-mark={dot} class:latest-mark={latest} class:selected
    aria-hidden="true" style:--mark-x={`${x * 100}%`} style:--mark-y={`${y * 100}%`}>
    <span>{#if desktopLabel === mobileLabel}{desktopLabel}{:else}<span class="mark-label">{desktopLabel}</span><span class="mark-number">{mobileLabel}</span>{/if}</span>
  </span>
{/snippet}

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
      {#if canInspect}
        <div class="plot-labels">
          {#if inspectedPoint && inspected !== undefined}
            {@render annotation(inspected, true, true, pointLabel(inspectedPoint), pointLabel(inspectedPoint), true)}
          {:else}
            {#each annotations as mark (mark.term)}
              {@render annotation(mark.index, mark.latest, mark.highest && kind === 'line', mark.label, mark.number)}
            {/each}
          {/if}
          {#if ready}
            <input class="plot-period" type="range" min="0" max={points.length - 1} value={inspected ?? latestIndex}
              style:--period-inset={`${50 / points.length}%`}
              aria-label="檢視各學期班次" aria-valuetext={pointLabel(inspectedPoint ?? points[latestIndex])}
              title="點選圖面查看學期與班次" oninput={(event) => (inspected = Number(event.currentTarget.value))}
              onfocus={() => (inspected ??= latestIndex)} onblur={() => (inspected = undefined)} />
          {/if}
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
  .conciseSchoolPlot { --school-plot-height: 9rem; --plot-axis-gap: var(--space-2); }
  .conciseSchoolPlot :global(figure:has(> .plot-labels)) { display: grid; grid-template-columns: minmax(0, 1fr); }
  .conciseSchoolPlot :global(figure > *) { grid-column: 1 / -1; }
  .conciseSchoolPlot :global(figure > .plot-labels),
  .conciseSchoolPlot :global(figure > [role="img"]) { grid-row: 3; }
  .conciseSchoolPlot :global(.plot) { grid-template-columns: 4.5ch minmax(0, 1fr); }
  .plot-labels {
    display: block;
    z-index: 1;
    position: relative;
    block-size: var(--school-plot-height);
    margin-inline-start: calc(4.5ch + var(--plot-axis-gap));
    pointer-events: none;
  }
  .plot-period {
    position: absolute; inset: 0; inline-size: 100%; block-size: 100%;
    padding-inline: var(--period-inset); margin: 0; border: 0; border-radius: 0;
    appearance: none; background: transparent; pointer-events: auto; cursor: crosshair; touch-action: pan-y;
  }
  .plot-period::-webkit-slider-thumb { appearance: none; inline-size: 1px; block-size: 1px; background: transparent; }
  .plot-period::-moz-range-thumb { inline-size: 1px; block-size: 1px; border: 0; background: transparent; }
  .plot-mark {
    position: absolute;
    inline-size: 0;
    inset-block-start: var(--mark-y);
    inset-inline-start: var(--mark-x);
  }
  .peak-mark::before {
    content: ''; position: absolute; inset: 0 auto auto 0; translate: -50% -50%;
    inline-size: 7px; block-size: 7px; border-radius: 50%; background: var(--brand-ink);
    box-shadow: 0 0 0 2px var(--panel-raised);
  }
  .plot-mark > span {
    display: block;
    inline-size: max-content;
    translate: calc(-100% - 5px) calc(-100% - 4px);
    padding-inline: var(--space-1);
    border-radius: var(--radius-control);
    background: var(--panel-raised);
    color: var(--brand-ink);
    font-size: var(--t-sm);
    font-weight: 650;
    white-space: nowrap;
  }
  .plot-mark.leading > span { translate: 5px calc(-100% - 4px); }
  .plot-mark.at-top > span { translate: calc(-100% - 5px) 4px; }
  .plot-mark.at-top.leading > span { translate: 5px 4px; }
  .mark-number, .plot-mark:not(.latest-mark) { display: none; }
  @media (max-width: 59.999rem) {
    .mark-number { display: inline; }
    .mark-label { display: none; }
    .plot-mark.selected > span { max-inline-size: 38vw; white-space: normal; text-wrap: pretty; }
  }
  @media (min-width: 60rem) {
    .conciseSchoolPlot { --school-plot-height: 11.5rem; }
    .conciseSchoolPlot :global(figure) {
      display: grid;
      grid-template-columns: max-content minmax(0, 1fr);
      column-gap: var(--space-2);
    }
    .conciseSchoolPlot :global(figure > figcaption) {
      grid-column: 1; align-self: start; margin-block-end: var(--space-1);
    }
    .conciseSchoolPlot :global(figure > .chart-header) { grid-column: 2; justify-content: end; }
    .conciseSchoolPlot :global(figure:has(> .plot-labels)) { grid-template-columns: max-content minmax(0, 1fr); }
    .conciseSchoolPlot :global(figure > .plot-labels),
    .conciseSchoolPlot :global(figure > [role="img"]) { grid-row: 2; }
    .plot-mark:not(.latest-mark) { display: block; }
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
