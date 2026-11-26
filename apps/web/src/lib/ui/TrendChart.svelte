<script lang="ts">
  import { linePath, lineSegments, spreadIndexes, zeroBasedScale } from './chart-scale';
  import ChartValues from './ChartValues.svelte';
  import { displayValue, finiteValue } from './format';
  import type { TableColumn, TrendPoint } from './types';

  interface Props {
    label: string;
    points: readonly TrendPoint[];
    unit?: string;
    kind?: 'column' | 'line';
  }

  let { label, points, unit, kind = 'column' }: Props = $props();
  let rows = $derived(points.map((point) => ({ ...point, value: finiteValue(point.value) })));
  let values = $derived(rows.flatMap(({ value }) => value === null ? [] : [value]));
  let compact = $derived(values.length <= 3);
  let compactRows = $derived(rows.length <= 3 ? rows : rows.filter((point) => point.value !== null));
  let scale = $derived(zeroBasedScale(values));
  const chartWidth = 1000;
  const chartHeight = 200;
  let slot = $derived(chartWidth / Math.max(1, rows.length));
  let bars = $derived(rows.map(({ value }, index) => ({ x: slot * (index + 0.5), y: value === null ? null : ordinate(value) })));
  let segments = $derived(lineSegments(bars.map(({ x, y }) => y === null ? null : { x, y })));
  let desktopTicks = $derived(spreadIndexes(rows.length, 7));
  let phoneTicks = $derived(spreadIndexes(rows.length, 3));
  let hasMissing = $derived(rows.some(({ value }) => value === null));
  let columns: TableColumn<TrendPoint>[] = $derived([
    { id: 'term', label: '學期', value: (point) => point.term },
    { id: 'value', label: unit ? `數值（${unit}）` : '數值', numeric: true, value: (point) => point.value }
  ]);

  function ordinate(value: number) {
    return chartHeight * (scale.max - value) / (scale.max - scale.min);
  }
</script>

<figure>
  <figcaption>{label}</figcaption>
  {#if !values.length}
    <p>{rows.length ? '各期數值均未公布。' : '尚無學期資料。'}</p>
  {:else if compact}
    <dl class="period-values" aria-label={label}>
      {#each compactRows as point (point.term)}
        <div>
          <dt>{point.term}</dt>
          <dd class:missing={point.value === null}>{point.value === null ? '未公布' : displayValue(point.value)}{#if point.value !== null && unit} <small>{unit}</small>{/if}</dd>
        </div>
      {/each}
    </dl>
    {#if compactRows.length < rows.length}<p>其餘 {displayValue(rows.length - values.length)} 期數值未公布。</p>{/if}
  {:else}
    <div role="img" aria-label={`${label}${unit ? `（${unit}）` : ''}，可展開數值表格查看各期數值。`}>
      <div class="plot" aria-hidden="true">
        <div class="axis ui-tabular">
          {#each scale.ticks as tick (tick)}
            <span>{displayValue(tick)}</span>
          {/each}
        </div>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" aria-hidden="true">
          {#each scale.ticks as tick (tick)}
            {@const y = ordinate(tick)}
            <line class="gridline" class:baseline={tick === 0} x1="0" x2={chartWidth} y1={y} y2={y} vector-effect="non-scaling-stroke" />
          {/each}
          {#if kind === 'column'}
            {@const zero = ordinate(0)}
            {#each bars as { x, y }}
              {#if y !== null}
                {#if y === zero}
                  <line class="zero" x1={x - slot * 0.32} x2={x + slot * 0.32} y1={y} y2={y} vector-effect="non-scaling-stroke" />
                {:else}
                  <rect x={x - slot * 0.32} y={Math.min(y, zero)} width={slot * 0.64} height={Math.abs(zero - y)} />
                {/if}
              {/if}
            {/each}
          {:else}
            {#each segments as segment}
              {#if segment.length === 1}
                {@const { x, y } = segment[0]}
                <path class="point" d={`M${x},${y} h0.1`} vector-effect="non-scaling-stroke" />
              {:else}
                <path class="series" d={linePath(segment)} vector-effect="non-scaling-stroke" />
              {/if}
            {/each}
          {/if}
        </svg>
        <div class="terms ui-tabular">
          {#each rows as row, index (row.term)}
            {#if desktopTicks.has(index) || phoneTicks.has(index)}
              <span class:phone={phoneTicks.has(index)} class:desktop={desktopTicks.has(index)}
                style:inset-inline-start={`${100 * (index + 0.5) / rows.length}%`}>{row.term}</span>
            {/if}
          {/each}
        </div>
      </div>
    </div>
    {#if unit || hasMissing}
      <p>{#if unit}單位：{unit}{/if}{#if unit && hasMissing} · {/if}{#if hasMissing}空白表示未公布數值。{/if}</p>
    {/if}
  {/if}
  {#if rows.length && (!values.length || compactRows.length !== rows.length || !compact)}
    <ChartValues {label} {columns} {rows} rowKey={(point) => point.term} />
  {/if}
</figure>

<style>
  figure { margin: 0; padding: var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); color: var(--ink); font: var(--t-base) / var(--leading-body) var(--font-sans); }
  figcaption { margin-block-end: var(--space-4); font-weight: 600; }
  .plot { display: grid; grid-template-columns: max-content minmax(0, 1fr); column-gap: var(--space-2); }
  .axis { display: flex; flex-direction: column; align-items: end; justify-content: space-between; margin-block: calc(-0.5 * var(--t-sm)); }
  .axis, .terms { color: var(--muted); font-size: var(--t-sm); line-height: 1; }
  svg { display: block; inline-size: 100%; block-size: 12rem; overflow: visible; }
  .gridline { stroke: var(--line); }
  .baseline { stroke: var(--control-line); }
  rect { fill: var(--series-1); }
  .series, .point, .zero { fill: none; stroke: var(--series-1); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .point { stroke-width: 5; }
  .terms { grid-column: 2; position: relative; min-block-size: 1.25rem; margin-block-start: var(--space-2); font-family: var(--font-mono); }
  .terms span { position: absolute; translate: -50%; white-space: nowrap; }
  .terms span:not(.desktop) { display: none; }
  p { margin: var(--space-2) 0 0; color: var(--muted); font-size: var(--t-sm); }
  .period-values { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 5.25rem), 1fr)); gap: var(--space-2); max-inline-size: 30rem; margin: 0; }
  .period-values div { min-width: 0; padding: var(--space-2) var(--space-3); border-inline-start: 2px solid var(--line); background: var(--panel); }
  dt, dd { overflow-wrap: anywhere; }
  dt { color: var(--muted); font: var(--t-sm) var(--font-mono); }
  dd { margin: var(--space-1) 0 0; font-size: var(--t-lg); font-weight: 650; font-variant-numeric: tabular-nums; }
  small, .missing { color: var(--muted); font-size: var(--t-sm); font-weight: 450; }

  @media (max-width: 40rem) {
    .terms span:not(.phone) { display: none; }
    .terms span.phone { display: block; }
  }
</style>
