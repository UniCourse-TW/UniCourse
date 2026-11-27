<script lang="ts">
  import { linePath, lineSegments, spreadIndexes, zeroBasedScale } from './chart-scale';
  import type { Snippet } from 'svelte';
  import ChartValues from './ChartValues.svelte';
  import PartialTermLegend from './PartialTermLegend.svelte';
  import { displayValue, finiteValue } from './format';
  import { partialTermLabel } from './partial-terms';
  import type { TableColumn, TrendPoint } from './types';

  interface Props {
    label: string;
    points: readonly TrendPoint[];
    unit?: string;
    kind?: 'column' | 'line';
    termHref?: (term: string) => string;
    yearTicks?: boolean;
    termPairs?: boolean;
    linkedBars?: boolean;
    condensed?: boolean;
    /** Set false when the caller supplies a shared partial-term legend. */
    showPartialLegend?: boolean;
    highlight?: string;
    yearsOnly?: boolean;
    /** @deprecated All trend charts now include zero. */
    localScale?: boolean;
    header?: Snippet;
  }

  let { label, points, unit, kind = 'column', termHref, yearTicks = false, termPairs = false, linkedBars = false, condensed = false, showPartialLegend = true, highlight, yearsOnly = false, header }: Props = $props();
  let rows = $derived(points.map((point) => ({ ...point, value: finiteValue(point.value) })));
  let values = $derived(rows.flatMap(({ value }) => value === null ? [] : [value]));
  let compact = $derived(values.length <= 3);
  let compactRows = $derived(rows.length <= 3 ? rows : rows.filter((point) => point.value !== null));
  let scale = $derived(zeroBasedScale(values, linkedBars ? 5 : 4));
  const chartWidth = 1000;
  const chartHeight = 200;
  let slot = $derived(chartWidth / Math.max(1, rows.length));
  let bars = $derived(rows.map(({ value }, index) => ({ x: slot * (index + 0.5), y: value === null ? null : ordinate(value) })));
  let segments = $derived(lineSegments(bars.map(({ x, y }, index) => y === null || rows[index].partial ? null : { x, y })));
  let desktopTicks = $derived(yearTicks ? yearlyTicks(rows, condensed ? 7 : 12, 1) : spreadIndexes(rows.length, 7));
  let phoneTicks = $derived(yearTicks ? yearlyTicks(rows, condensed ? 2 : 5, 3) : spreadIndexes(rows.length, 3));
  let hasMissing = $derived(rows.some(({ value }) => value === null));
  let hasPartial = $derived(rows.some((point) => point.partial && point.value !== null));
  let yearBoundaries = $derived(rows.flatMap(({ term }, index) => index > 0 && term.split('-')[0] !== rows[index - 1].term.split('-')[0] ? [index] : []));
  let columns: TableColumn<TrendPoint>[] = $derived([
    { id: 'term', label: '學期', value: (point) => point.term },
    { id: 'value', label: unit ? `數值（${unit}）` : '數值', numeric: true, value: (point) => point.value },
    ...(hasPartial ? [{ id: 'coverage', label: '收錄備註', value: (point: TrendPoint) => point.partial ? partialTermLabel : null }] : [])
  ]);

  function yearlyTicks(rows: TrendPoint[], limit: number, endGap: number) {
    const years = new Map<number, number>();
    for (const [index, row] of rows.entries()) {
      const year = Number(row.term.split('-')[0]);
      if (!years.has(year)) years.set(year, index);
    }
    const first = years.keys().next().value ?? 0;
    const interval = Math.max(1, Math.ceil(((Array.from(years.keys()).at(-1) ?? first) - first + 1) / limit));
    const last = rows.length - 1;
    return new Set([...Array.from(years).filter(([year, index]) => (year - first) % interval === 0 && last - index > endGap).map(([, index]) => index), last]);
  }

  function ordinate(value: number) {
    return chartHeight * (scale.max - value) / (scale.max - scale.min);
  }
</script>

<figure>
  <figcaption>{label}</figcaption>
  {#if header}{@render header()}{/if}
  {#if !values.length}
    <p>{rows.length ? '各期數值均未公布。' : '尚無學期資料。'}</p>
  {:else if compact}
    <dl class="period-values" aria-label={label}>
      {#each compactRows as point (point.term)}
        <div class:selected={point.term === highlight}>
          <dt>{#if termHref && point.value !== null}<a href={termHref(point.term)}>{point.term}</a>{:else}{point.term}{/if}</dt>
          <dd class:missing={point.value === null} title={point.partial ? partialTermLabel : undefined}>
            {#if point.partial && point.value !== null}<i class="partial-dot" aria-hidden="true"></i><span class="visually-hidden">{partialTermLabel}：</span>{/if}
            {point.value === null ? '未公布' : displayValue(point.value)}{#if point.value !== null && unit} <small>{unit}</small>{/if}
          </dd>
        </div>
      {/each}
    </dl>
    {#if hasPartial && showPartialLegend}<p><PartialTermLegend /></p>{/if}
    {#if compactRows.length < rows.length}<p>其餘 {displayValue(rows.length - values.length)} 期數值未公布。</p>{/if}
  {:else}
    <div role={linkedBars ? 'group' : 'img'} aria-label={`${label}${unit ? `（${unit}）` : ''}，可展開數值表格查看各期數值。`}>
      <div class="plot">
        <div class="axis ui-tabular" aria-hidden="true">
          {#each scale.ticks as tick (tick)}
            <span>{displayValue(tick)}</span>
          {/each}
        </div>
        <div class="plot-area">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" aria-hidden="true">
          {#each scale.ticks as tick (tick)}
            {@const y = ordinate(tick)}
            <line class="gridline" class:baseline={tick === 0} x1="0" x2={chartWidth} y1={y} y2={y} vector-effect="non-scaling-stroke" />
          {/each}
          {#each rows as row, index (row.term)}
            {#if row.term === highlight}<rect class="highlight" x={index * slot} y="0" width={slot} height={chartHeight} />{/if}
          {/each}
          {#if termPairs || yearsOnly}{#each yearBoundaries as index (index)}<line class="year-divider" x1={slot * index} x2={slot * index} y1="0" y2={chartHeight} vector-effect="non-scaling-stroke" />{/each}{/if}
          {#if kind === 'column'}
            {@const zero = ordinate(0)}
            {#each bars as { x, y }, index}
              {#if y !== null}
                {#if y === zero}
                  <line class="zero" class:partial-zero={rows[index].partial} x1={x - slot * 0.32} x2={x + slot * 0.32} y1={y} y2={y} vector-effect="non-scaling-stroke">
                    {#if rows[index].partial}<title>{rows[index].term} · {partialTermLabel}</title>{/if}
                  </line>
                {:else}
                  <rect class:partial-bar={rows[index].partial} x={x - slot * 0.32} y={Math.min(y, zero)} width={slot * 0.64} height={Math.abs(zero - y)}>
                    {#if rows[index].partial}<title>{rows[index].term} · {displayValue(rows[index].value)} {unit ?? ''} · {partialTermLabel}</title>{/if}
                  </rect>
                {/if}
              {/if}
            {/each}
          {:else}
            {#each bars as { x, y }, index}
              {#if y !== null && rows[index].partial}
                <line class="partial-point" x1={x} x2={x} y1={y} y2={y} vector-effect="non-scaling-stroke">
                  <title>{rows[index].term} · {displayValue(rows[index].value)} {unit ?? ''} · {partialTermLabel}</title>
                </line>
              {/if}
            {/each}
            {#each segments as segment}
              {#if segment.length === 1}
                {@const { x, y } = segment[0]}
                <path class="point" d={`M${x},${y} h0.1`} vector-effect="non-scaling-stroke" />
              {:else}
                <path class="series" d={linePath(segment)} vector-effect="non-scaling-stroke" />
              {/if}
            {/each}
            {#each bars as { x, y }, index}
              {#if y !== null && !rows[index].partial && rows[index].term === highlight}<line class="current-point" x1={x} x2={x} y1={y} y2={y} vector-effect="non-scaling-stroke" />{/if}
            {/each}
          {/if}
        </svg>
        {#if linkedBars && termHref}
          <div class="bar-links" style:grid-template-columns={`repeat(${rows.length}, minmax(0, 1fr))`}>
            {#each rows as point (point.term)}
              {#if point.value !== null}
                {@const hint = `${point.term} 學期 · ${displayValue(point.value)} ${unit ?? ''}${point.partial ? `（${partialTermLabel}）` : ''}`}
                <a href={termHref(point.term)} aria-label={hint}><span aria-hidden="true">{hint}</span></a>
              {:else}<span></span>{/if}
            {/each}
          </div>
        {/if}
        </div>
        {#if termPairs}<div class="semester-ticks ui-tabular" style:grid-template-columns={`repeat(${rows.length}, minmax(0, 1fr))`} aria-hidden="true">
          {#each rows as { term }, index (term)}<span class:year-start={yearBoundaries.includes(index)}>{term.split('-')[1]}</span>{/each}
        </div>{/if}
        <div class="terms ui-tabular" aria-hidden="true">
          {#each rows as row, index (row.term)}
            {#if desktopTicks.has(index) || phoneTicks.has(index)}
              <span class:phone={phoneTicks.has(index)} class:desktop={desktopTicks.has(index)} class:end={yearTicks && index === rows.length - 1}
                style:inset-inline-start={yearTicks && index === rows.length - 1 ? undefined : `${100 * (index + 0.5) / rows.length}%`}>{yearTicks && (yearsOnly || index !== rows.length - 1) ? row.term.split('-')[0] : row.term}</span>
            {/if}
          {/each}
        </div>
      </div>
    </div>
    {#if (!condensed && (unit || yearTicks)) || hasMissing || (hasPartial && showPartialLegend) || (highlight && rows.some(({ term }) => term === highlight))}
      <p class="chart-legend">
        {#if unit && !condensed}<span>單位：{unit}</span>{/if}
        {#if yearTicks && !condensed}<span>{termPairs ? '直線分隔學年；1 為上學期，2 為下學期。' : kind === 'column' ? '橫軸為學年，每柱一學期。' : '橫軸為學年，每個數值對應一學期。'}</span>{/if}
        {#if highlight && rows.some(({ term }) => term === highlight)}<span class="selection">所選學期 {highlight}</span>{/if}
        {#if hasMissing}<span>空白表示沒有資料。</span>{/if}
        {#if hasPartial && showPartialLegend}<PartialTermLegend />{/if}
      </p>
    {/if}
  {/if}
  {#if !condensed && rows.length && (!values.length || compactRows.length !== rows.length || !compact)}
    <ChartValues {label} {columns} {rows} rowKey={(point) => point.term} rowHref={termHref ? (point) => point.value !== null ? termHref?.(point.term) : undefined : undefined} />
  {/if}
</figure>

<style>
  figure { margin: 0; padding: var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); color: var(--ink); font: var(--t-base) / var(--leading-body) var(--font-sans); }
  figcaption { margin-block-end: var(--space-4); font-weight: 600; }
  .plot { display: grid; grid-template-columns: max-content minmax(0, 1fr); column-gap: var(--space-2); }
  .plot-area { position: relative; min-inline-size: 0; }
  .bar-links { position: absolute; inset: 0; display: grid; }
  .bar-links a { display: block; min-inline-size: 0; }
  .bar-links a:is(:hover, :focus-visible) { box-shadow: inset 0 0 0 1px var(--control-line); background: color-mix(in srgb, var(--brand-wash) 30%, transparent); }
  .bar-links a span { display: none; position: absolute; inset: .15rem auto auto 50%; translate: -50%; width: max-content; max-inline-size: 100%; padding: .15rem .4rem; border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--ink); font-size: var(--t-sm); pointer-events: none; }
  .bar-links a:is(:hover, :focus-visible) span { display: block; }
  .axis { display: flex; flex-direction: column; align-items: end; justify-content: space-between; margin-block: calc(-0.5 * var(--t-sm)); }
  .axis, .terms { color: var(--muted); font-size: var(--t-sm); line-height: 1; }
  .semester-ticks { grid-column: 2; display: grid; color: var(--ink-2); font: var(--t-xs) / 1.35 var(--font-mono); text-align: center; }
  .year-start { border-inline-start: 1px solid var(--control-line); }
  .year-divider { stroke: var(--control-line); stroke-dasharray: 2 3; }
  svg { display: block; inline-size: 100%; block-size: 12rem; overflow: visible; }
  .gridline { stroke: var(--line); }
  .baseline { stroke: var(--control-line); }
  rect { fill: var(--series-1); }
  .highlight { fill: var(--brand-wash); }
  .current-point { stroke: var(--brand); stroke-width: 7; stroke-linecap: round; }
  .selection { color: var(--brand-ink); }
  .period-values .selected { background: var(--brand-wash); border-color: var(--brand); }
  .partial-bar, .partial-dot { fill: var(--partial-fill); background: var(--partial-fill); }
  .partial-point, .zero.partial-zero { stroke: var(--partial-fill); stroke-linecap: round; }
  .partial-point { stroke-width: 6; }
  .chart-legend { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); }
  .series, .point, .zero { fill: none; stroke: var(--series-1); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .point { stroke-width: 5; }
  .terms { grid-column: 2; position: relative; min-block-size: 1.25rem; margin-block-start: var(--space-2); font-family: var(--font-mono); }
  .terms span { position: absolute; translate: -50%; white-space: nowrap; }
  .terms span.end { inset-inline-end: 0; translate: none; }
  .terms span:not(.desktop) { display: none; }
  p { margin: var(--space-2) 0 0; color: var(--muted); font-size: var(--t-sm); }
  .period-values { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 5.25rem), 1fr)); gap: var(--space-2); max-inline-size: 30rem; margin: 0; }
  .period-values div { min-width: 0; padding: var(--space-2) var(--space-3); border-inline-start: 2px solid var(--line); background: var(--panel); }
  .partial-dot { display: inline-block; inline-size: .55em; block-size: .55em; margin-inline-end: var(--space-1); border-radius: 2px; }
  .visually-hidden { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); }
  dt, dd { overflow-wrap: anywhere; }
  dt { color: var(--muted); font: var(--t-sm) var(--font-mono); }
  dd { margin: var(--space-1) 0 0; font-size: var(--t-lg); font-weight: 650; font-variant-numeric: tabular-nums; }
  small, .missing { color: var(--muted); font-size: var(--t-sm); font-weight: 450; }

  @media (max-width: 40rem) {
    .terms span:not(.phone) { display: none; }
    .terms span.phone { display: block; }
  }
</style>
