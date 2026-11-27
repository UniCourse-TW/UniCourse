<script lang="ts">
  import type { TermTrend } from '@unicourse/api-client';
  import ChartValues from '$lib/ui/ChartValues.svelte';
  import { zeroBasedScale } from '$lib/ui/chart-scale';
  import { displayValue } from '$lib/ui/format';
  import { partialTermLabel, partialTerms } from '$lib/ui/partial-terms';
  import type { TableColumn } from '$lib/ui/types';

  let { rows, term, termHref }: {
    rows: TermTrend[];
    term: string;
    termHref: (term: string) => string;
  } = $props();

  const measures = [
    { key: 'offerings', label: '開課班次', unit: '班' },
    { key: 'enrolled', label: '已公布修課人次', unit: '人次' }
  ] as const;
  let partial = $derived(partialTerms(rows.map(({ term, offerings }) => [term, offerings])));
  let missing = $derived(rows.some(({ enrolled }) => enrolled === null));
  let selected = $derived(rows.find((row) => row.term === term));
  let yearGroups = $derived.by(() => {
    const groups = new Map<string, Map<string, TermTrend>>();
    for (const row of rows) {
      const [year, semester] = row.term.split('-');
      const group = groups.get(year);
      if (group) group.set(semester, row);
      else groups.set(year, new Map([[semester, row]]));
    }
    return Array.from(groups);
  });
  let semesters = $derived([...new Set(['1', '2', ...rows.map(({ term }) => term.split('-')[1])])].sort());
  let charts = $derived(measures.map((measure) => {
    const values = rows.flatMap((row) => row[measure.key] ?? []);
    return { ...measure, scale: zeroBasedScale(values), plot: values.length >= 6 };
  }));
  let showCharts = $derived(charts.some(({ plot }) => plot));
  let columns = $derived<TableColumn<TermTrend>[]>([
    { id: 'term', label: '學期', value: (row) => row.term },
    ...measures.map(({ key, label }) => ({ id: key, label, value: (row: TermTrend) => row[key], numeric: true })),
    ...(partial.size ? [{ id: 'coverage', label: '收錄備註', value: (row: TermTrend) => partial.has(row.term) ? partialTermLabel : null }] : [])
  ]);
</script>

{#if !rows.length}
  <p class="browse-note">尚無歷年開課紀錄。</p>
{:else}
  {#if showCharts || partial.size || missing}
    <ul class="legend" aria-label="歷年開課圖例" role="list">
      {#if showCharts}
        <li><i class="semester-key" aria-hidden="true"></i>上學期（左）</li>
        <li><i class="semester-key second-semester" aria-hidden="true"></i>下學期{semesters.includes('3') ? '（中）' : '（右）'}</li>
        {#if semesters.includes('3')}<li><i class="semester-key summer-semester" aria-hidden="true"></i>暑期（右）</li>{/if}
      {/if}
      {#if partial.size}<li><i aria-hidden="true"></i>{partialTermLabel}（推估）</li>{/if}
      {#if missing}<li>修課人次空白：校方未公布</li>{/if}
    </ul>
  {/if}
  <div class="charts">
    {#each charts as { key, label, unit, scale, plot } (key)}
      <figure>
        <figcaption><strong>{label}</strong> <span>（{unit}）</span>
          {#if selected && plot}
            <span class="selection"><span>{selected.term}</span> <strong>{selected[key] === null ? '未公布' : `${displayValue(selected[key])} ${unit}`}</strong></span>
          {/if}
        </figcaption>
        {#if plot}
          <div class="plot" role="img" aria-label={`${label}，滿刻度 ${displayValue(scale.max)} ${unit}。各學期數值見下方表格。`}>
            <div class="axis ui-tabular" aria-hidden="true">
              {#each scale.ticks as tick (tick)}<span>{displayValue(tick)}</span>{/each}
            </div>
            <div class="plot-area" aria-hidden="true">
              <div class="gridlines">{#each scale.ticks as tick (tick)}<i style:inset-block-end={`${tick / scale.max * 100}%`}></i>{/each}</div>
              <div class="groups columns">
                {#each yearGroups as [year, group] (year)}
                  <div class="year">
                    {#each semesters as semester (semester)}
                      {@const row = group.get(semester)}
                      {@const value = row?.[key]}
                      <div class="column" class:second-semester={semester === '2'} class:summer-semester={semester === '3'} class:selected={row?.term === term} title={row && `${row.term} 學期 · ${value === null ? '未公布' : `${displayValue(value)} ${unit}`}${partial.has(row.term) ? ` · ${partialTermLabel}` : ''}`}>
                        {#if row && value != null}
                          <i class:partial={partial.has(row.term)} class:zero={value === 0} style:block-size={`${value / scale.max * 100}%`}></i>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {/each}
              </div>
            </div>
            <div class="groups year-ticks ui-tabular" class:dense={yearGroups.length > 11} aria-hidden="true">
              {#each yearGroups as [year] (year)}
                <span>{year}</span>
              {/each}
            </div>
          </div>
        {:else}
          {@const visible = rows.length < 6 ? rows : rows.filter((row) => row[key] !== null)}
          {#if visible.length}
            <dl class="values">
              {#each visible as row (row.term)}
                <div class:selected={row.term === term}>
                  <dt><a href={termHref(row.term)}>{row.term}</a></dt>
                  <dd class="ui-tabular">{#if partial.has(row.term)}<i aria-hidden="true"></i>{/if}{row[key] === null ? '未公布' : displayValue(row[key])}</dd>
                </div>
              {/each}
            </dl>
          {:else}<p class="browse-note">各期數值均未公布。</p>{/if}
        {/if}
      </figure>
    {/each}
  </div>
  {#if showCharts}
    <div class="chart-values">
      <ChartValues label="歷年開課變化" summary="查看各學期數值與課表" {columns} {rows} rowKey={({ term }) => term} rowHref={({ term }) => termHref(term)} />
    </div>
  {/if}
{/if}

<style>
  .legend { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); margin: 0; padding: 0; list-style: none; color: var(--ink-2); font-size: var(--t-sm); }
  .legend li { display: flex; align-items: center; gap: var(--space-1); }
  .legend i, dd i { display: inline-block; flex: none; inline-size: .75rem; block-size: .4rem; border-radius: var(--radius-pill); background: var(--partial-fill); }
  .legend .semester-key, .column { --semester-color: var(--series-1); }
  .legend .second-semester, .column.second-semester { --semester-color: var(--series-2); }
  .legend .summer-semester, .column.summer-semester { --semester-color: var(--series-3); }
  .legend .semester-key { background: var(--semester-color); }
  .charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-2); }
  figure { display: grid; align-content: start; gap: var(--space-2); margin: 0; padding: var(--space-2) var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
  figcaption { display: flex; align-items: baseline; gap: var(--space-1); color: var(--ink); font-size: var(--t-base); }
  figcaption > span { color: var(--ink-2); font-size: var(--t-sm); }
  figcaption .selection { margin-inline-start: auto; padding-inline: var(--space-2); border-radius: var(--radius-control); background: var(--brand-wash); color: var(--brand-ink); white-space: nowrap; }
  .plot { display: grid; grid-template-columns: 5ch minmax(0, 1fr); column-gap: var(--space-2); font-size: var(--t-sm); }
  .axis { display: flex; flex-direction: column; align-items: end; justify-content: space-between; margin-block: -.5em; color: var(--ink-2); line-height: 1; }
  .plot-area { position: relative; min-inline-size: 0; block-size: 7.5rem; }
  .gridlines, .columns { position: absolute; inset: 0; }
  .gridlines i { position: absolute; inset-inline: 0; border-block-start: 1px solid var(--line); }
  .groups { display: flex; }
  .groups > * { flex: 1 1 0; min-inline-size: 0; }
  .year { display: flex; gap: 1px; border-inline-end: 1px solid var(--line); }
  .year:first-child { border-inline-start: 1px solid var(--line); }
  .column { display: flex; flex: 1 1 0; flex-direction: column; justify-content: end; align-items: center; min-inline-size: 0; }
  .column.selected { background: var(--brand-wash); box-shadow: inset 0 0 0 1px var(--line); }
  .column i { inline-size: 82%; min-block-size: 3px; border-radius: 2px 2px 0 0; background: var(--semester-color); }
  .column i.partial { background: color-mix(in srgb, var(--semester-color) 58%, var(--panel-raised)); }
  .column i.zero { min-block-size: 1px; }
  .year-ticks { grid-column: 2; margin-block-start: var(--space-1); color: var(--ink-2); text-align: center; font-size: max(12px, .75rem); }
  .year-ticks.dense > :nth-child(even) { visibility: hidden; }
  .values { display: grid; gap: var(--space-1); margin: 0; }
  .values > div { position: relative; display: flex; align-items: center; justify-content: space-between; padding-inline: var(--space-2); border-block-end: 1px solid var(--line); }
  .values a { display: inline-flex; align-items: center; min-block-size: var(--target-min); min-inline-size: var(--target-min); font-weight: 650; }
  .values dd { display: flex; align-items: center; gap: var(--space-1); margin: 0; }
  .values .selected { background: var(--brand-wash); }
  .values a::before { content: ''; position: absolute; inset: 0; }
  .values > div:has(a:is(:hover, :focus-visible)) { background: var(--hover-row); }
  .chart-values :global(tbody tr) { position: relative; }
  .chart-values :global(tbody th.sticky) { position: static; box-shadow: none; }
  .chart-values :global(.row-link)::before { content: ''; position: absolute; inset: 0; }
  .chart-values :global(:is(.scroll, .row-link):focus-visible) { outline-offset: var(--focus-offset); }
  .chart-values :global(.row-link:focus-visible)::before { outline: var(--focus-ring); outline-offset: -2px; }
  @media (max-width: 40rem) {
    .charts { grid-template-columns: minmax(0, 1fr); gap: 0; }
    figure + figure { border-block-start: 0; }
    figure:has(+ figure) { border-end-start-radius: 0; border-end-end-radius: 0; }
    figure + figure { border-start-start-radius: 0; border-start-end-radius: 0; }
    figure:has(+ figure .plot) .year-ticks { display: none; }
    .plot-area { block-size: 5.5rem; }
  }
  @media (max-width: 22rem) { .year-ticks > :nth-child(even) { visibility: hidden; } }
</style>
