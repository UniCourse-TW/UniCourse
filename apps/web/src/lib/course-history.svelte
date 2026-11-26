<script lang="ts">
  import { instructorHref } from '$lib/overview-paths';
  import { zeroBasedScale } from '$lib/ui/chart-scale';
  import { displayValue } from '$lib/ui/format';
  import { historySlots, type HistoryRow } from '$lib/course-history';

  interface Props {
    rows: HistoryRow[];
    /** The offering this page shows; its link becomes「本頁」. */
    currentId: string;
    school: string;
    courseCode: string;
    /** Rows shown before「查看全部」. */
    initialRows?: number;
  }

  let { rows, currentId, school, courseCode, initialRows = 5 }: Props = $props();

  let slots = $derived(historySlots(rows));
  let numbers = $derived(rows.flatMap((row) => [row.enrolled, row.capacity]).filter((value): value is number => value != null));
  let scale = $derived(zeroBasedScale(numbers));
  let published = $derived(rows.filter((row) => row.enrolled != null || row.capacity != null).length);
  // A column chart only earns its place with a few terms of numbers; otherwise the table bars carry it.
  let showChart = $derived(published >= 4);
  let currentTerm = $derived(rows.find((row) => row.current)?.term ?? rows[0]?.term);
  let active = $state<string | undefined>();
  let focus = $derived(rows.find((row) => row.term === (active ?? currentTerm)));
  let hasEnrolled = $derived(rows.some((row) => row.enrolled != null));
  let hasBoth = $derived(rows.some((row) => row.enrolled != null && row.capacity != null));
  let hasCapacityOnly = $derived(rows.some((row) => row.enrolled == null && row.capacity != null));
  let hasUnpublished = $derived(rows.some((row) => row.enrolled == null && row.capacity == null));
  let gaps = $derived(slots.filter((slot) => !slot.row).length);
  let years = $derived(new Set(slots.map((slot) => slot.term.split('-')[0])).size);
  let chartLabel = $derived.by(() => {
    const first = slots[0]?.term;
    const last = slots.at(-1)?.term;
    const peak = rows.reduce<HistoryRow | undefined>((best, row) => (row.enrolled ?? -1) > (best?.enrolled ?? -1) ? row : best, undefined);
    const parts = [`${courseCode} 各學期修課人數長條圖，${first} 至 ${last}，共 ${rows.length} 期有開課`];
    if (peak?.enrolled != null) parts.push(`最多為 ${peak.term} 的 ${displayValue(peak.enrolled)} 人`);
    parts.push('數值見下方各期表格');
    return parts.join('；') + '。';
  });

  function percent(value: number | null) {
    return value == null || !(scale.max > 0) ? 0 : Math.min(100, (value / scale.max) * 100);
  }

  function termSearch(term: string) {
    return `/?${new URLSearchParams({ q: courseCode, school, term })}`;
  }

  /** Consecutive chart slots of one academic year, so each year label is centred under its terms. */
  let yearGroups = $derived.by(() => {
    const groups: { year: string; span: number }[] = [];
    for (const slot of slots) {
      const year = slot.term.split('-')[0];
      const last = groups.at(-1);
      if (last?.year === year) last.span += 1;
      else groups.push({ year, span: 1 });
    }
    return groups;
  });
  let multiSection = $derived(rows.some((row) => row.offeringCount > 1));
</script>

<div class="history" style:--max-rows={initialRows}>
  {#if showChart}
    <figure class="chart">
      <figcaption>
        <span class="readout" aria-hidden="true">
          {#if focus}
            <strong class="ui-mono">{focus.term}</strong>
            <span>修課 <b class="ui-tabular">{displayValue(focus.enrolled)}</b>{#if focus.enrolled != null} 人{/if}</span>
            <span>名額 <b class="ui-tabular">{displayValue(focus.capacity)}</b></span>
            {#if focus.current}<span class="tag">本班所在學期</span>{/if}
          {/if}
        </span>
        <span class="legend" aria-hidden="true">
          {#if hasEnrolled}<span><i class="key fill"></i>修課人數</span>{/if}
          {#if hasBoth}<span><i class="key cap"></i>名額</span>{/if}
          {#if hasCapacityOnly}<span><i class="key dashed"></i>只公布名額</span>{/if}
        </span>
      </figcaption>
      <div class="plot" role="img" aria-label={chartLabel}>
        <div class="y ui-tabular" aria-hidden="true">
          {#each scale.ticks as tick (tick)}<span style:bottom={`${percent(tick)}%`}>{displayValue(tick)}</span>{/each}
        </div>
        <div class="area" aria-hidden="true">
          <div class="bars" style:--slots={slots.length}>
            {#each scale.ticks as tick (tick)}<span class="grid" class:base={tick === 0} style:bottom={`${percent(tick)}%`}></span>{/each}
            {#each slots as slot (slot.term)}
              {@const row = slot.row}
              <div
                role="presentation"
                class="slot"
                class:active={row && row.term === active}
                class:current={row?.current}
                class:withdrawn={row?.withdrawn}
                onpointerenter={() => { if (row) active = row.term; }}
                onpointerleave={() => (active = undefined)}
              >
                {#if row && row.capacity != null}
                  <span class="cap" class:dashed={row.enrolled == null} style:height={`${percent(row.capacity)}%`}></span>
                {/if}
                {#if row && row.enrolled != null}
                  <span class="fill" style:height={`${percent(row.enrolled)}%`}></span>
                {/if}
                {#if row && row.enrolled == null && row.capacity == null}<span class="none">·</span>{/if}
              </div>
            {/each}
          </div>
          <div class="x ui-tabular" style:--slots={slots.length} class:dense={years > 6}>
            {#each yearGroups as group, index (index)}
              <span class="year" class:odd={Number(group.year) % 2 === 1} style:grid-column={`span ${group.span}`}>{group.year}</span>
            {/each}
          </div>
        </div>
      </div>
      <p class="note">x 軸為學年度，每格一個學期（上、下學期依序排列）{#if gaps}；空格是該學期沒有開課紀錄{/if}{#if hasUnpublished}；「·」表示有開課但未公布人數與名額{/if}。多班次的學期為各班加總。</p>
    </figure>
  {/if}

  {#if !showChart && rows.length > 1}
    <p class="note">{published === 0 ? '各學期都沒有公布修課人數與名額，因此只列出開課紀錄。' : `只有 ${published} 個學期公布人數，數值直接列在表格中。`}</p>
  {/if}
  <div class="frame" class:collapsible={rows.length > initialRows}>
    <div class="scroll">
      <table>
        <caption class="sr-only">{courseCode} 各學期開課與修課人數，新到舊</caption>
        <thead>
          <tr>
            <th scope="col">學期</th>
            <th scope="col">授課教師</th>
            <th scope="col" class="num">修課人數／名額{#if multiSection}<span class="unit">（全班次合計）</span>{/if}</th>
            <th scope="col">班次</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row, index (row.term)}
            <tr
              class:extra={index >= initialRows}
              class:active={row.term === active}
              class:current={row.current}
              onpointerenter={() => (active = row.term)}
              onpointerleave={() => (active = undefined)}
              onfocusin={() => (active = row.term)}
              onfocusout={() => (active = undefined)}
            >
              <th scope="row" class="ui-mono">{row.term}</th>
              <td class="names">
                {#each row.instructors as name, i (name)}<span class="name">{#if i > 0}、{/if}<a href={instructorHref(school, name)}>{name}</a></span>{:else}<span class="muted">未公布</span>{/each}{#if row.instructorCount > 1}<span class="muted count" class:narrow-only={row.instructorCount <= row.instructors.length}> 等 {displayValue(row.instructorCount)} 位</span>{/if}
              </td>
              <td class="num">
                <span class="cell-bar">
                  <span class="track" class:blank={row.enrolled == null && row.capacity == null} aria-hidden="true">
                    {#if row.capacity != null}<span class="cap" class:dashed={row.enrolled == null} style:width={`${percent(row.capacity)}%`}></span>{/if}
                    {#if row.enrolled != null}<span class="fill" style:width={`${percent(row.enrolled)}%`}></span>{/if}
                  </span>
                  <span class="ui-tabular value">
                    {#if row.enrolled == null && row.capacity == null}<span class="muted">未公布</span>
                    {:else}{displayValue(row.enrolled)}<span class="muted">&nbsp;/&nbsp;{displayValue(row.capacity)}</span>{/if}
                  </span>
                </span>
              </td>
              <td class="sections" class:multi={row.offeringCount > 1}>
                {#each row.offerings as offering (offering.id)}
                  <span class="section">
                    {#if offering.id === currentId}
                      <span class="here" aria-current="page">本頁</span>
                    {:else}
                      <a href={`/courses/${offering.id}`} aria-label={`${row.term} ${offering.label}${offering.active ? '' : '（已下架）'}`}>{offering.label} →</a>
                    {/if}
                    {#if !offering.active}<span class="withdrawn">已下架</span>{/if}
                  </span>
                {/each}
                {#if row.offeringCount > 1}
                  <a class="more" class:narrow-only={row.offeringCount <= row.offerings.length} href={termSearch(row.term)}>全部 {displayValue(row.offeringCount)} 班</a>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if rows.length > initialRows}
      <details class="toggle">
        <summary><span class="closed">查看全部 {rows.length} 期 ▾</span><span class="opened">收合為最近 {initialRows} 期 ▴</span></summary>
      </details>
    {/if}
  </div>
</div>

<style>
  .history { display: grid; gap: var(--space-3); min-inline-size: 0; }
  .sr-only { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .ui-mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  .muted { color: var(--muted); }

  .chart { margin: 0; padding: var(--space-3) var(--space-4) var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
  figcaption { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-4); align-items: baseline; justify-content: space-between; margin-block-end: var(--space-3); font-size: var(--t-sm); color: var(--muted); }
  .readout { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); align-items: baseline; min-block-size: 1.5rem; color: var(--ink-2); }
  .readout strong { color: var(--ink); font-size: var(--t-base); }
  .readout b { color: var(--ink); font-size: var(--t-base); font-weight: 600; }
  .tag { padding: 0 6px; border-radius: var(--radius-pill); background: var(--brand-wash); color: var(--brand-ink); font-weight: 600; }
  .legend { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); }
  .legend span { display: inline-flex; gap: 0.35rem; align-items: center; }
  .key { display: inline-block; inline-size: 10px; block-size: 10px; border-radius: 2px; }
  .key.fill { background: var(--brand); }
  .key.cap { background: var(--brand-wash); box-shadow: inset 0 0 0 1px var(--control-line); }
  .key.dashed { border: 1px dashed var(--control-line); }

  .plot { display: grid; grid-template-columns: max-content minmax(0, 1fr); column-gap: var(--space-2); }
  .y { position: relative; block-size: 9.5rem; min-inline-size: 1.5rem; color: var(--muted); font-size: var(--t-xs); }
  .y span { position: absolute; inset-inline-end: 0; translate: 0 50%; line-height: 1; }
  .area { min-inline-size: 0; overflow-x: auto; scrollbar-width: thin; }
  .bars { position: relative; display: grid; grid-template-columns: repeat(var(--slots), minmax(0.75rem, 1fr)); align-items: end; block-size: 9.5rem; min-inline-size: calc(var(--slots) * 0.75rem); }
  .grid { position: absolute; inset-inline: 0; block-size: 0; border-block-start: 1px solid var(--line); }
  .grid.base { border-color: var(--control-line); }
  .slot { position: relative; display: flex; justify-content: center; align-items: end; block-size: 100%; }
  .slot > span { position: absolute; inset-block-end: 0; inline-size: min(70%, 2.25rem); border-radius: 2px 2px 0 0; }
  .slot .cap { background: var(--brand-wash); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--control-line) 60%, transparent); }
  .slot .cap.dashed { background: transparent; box-shadow: none; border: 1px dashed var(--control-line); border-block-end: 0; }
  .slot .fill { background: color-mix(in srgb, var(--brand) 72%, var(--panel-raised)); }
  .slot.current .fill { background: var(--brand); }
  .slot.withdrawn .fill { background: color-mix(in srgb, var(--muted) 60%, var(--panel-raised)); }
  .slot.active::after { content: ''; position: absolute; inset-block: 0 -0.375rem; inset-inline: 50%; border-inline-start: 1px dashed var(--control-line); }
  .slot.active .fill { background: var(--brand-ink); }
  .slot .none { inset-block-end: 2px; inline-size: auto; color: var(--muted); font-size: var(--t-sm); line-height: 1; }
  .x { display: grid; grid-template-columns: repeat(var(--slots), minmax(0.75rem, 1fr)); min-inline-size: calc(var(--slots) * 0.75rem); margin-block-start: var(--space-1); color: var(--muted); font-size: var(--t-xs); line-height: 1.2; }
  .x span { white-space: nowrap; overflow: visible; text-align: center; border-inline-start: 1px solid var(--line); }
  .x span:first-child { border-inline-start: 0; }
  .note { margin: var(--space-2) 0 0; color: var(--muted); font-size: var(--t-xs); line-height: 1.5; }

  .frame { position: relative; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); overflow: hidden; }
  .scroll { overflow-x: auto; scrollbar-width: thin; }
  table { inline-size: 100%; border-collapse: collapse; font-size: var(--t-base); line-height: var(--leading-table); }
  th, td { padding: 0.375rem 0.625rem; border-block-end: 1px solid var(--line); text-align: start; vertical-align: middle; }
  thead th { background: var(--table-head); color: var(--muted); font-size: var(--t-sm); font-weight: 600; white-space: nowrap; }
  tbody th { font-weight: 600; white-space: nowrap; }
  tbody tr:last-child > * { border-block-end: 0; }
  tbody tr:hover, tbody tr.active { background: var(--hover-row); }
  tbody tr.current { background: color-mix(in srgb, var(--brand) 7%, var(--panel-raised)); }
  tbody tr.current > th { box-shadow: inset 3px 0 0 var(--brand); }
  .num { text-align: end; }
  .names { min-inline-size: 6rem; overflow-wrap: anywhere; }
  .names .count { white-space: nowrap; }
  thead .unit { font-weight: 500; }
  .cell-bar { display: flex; gap: var(--space-2); align-items: center; justify-content: end; }
  .track { position: relative; flex: 0 0 4.5rem; block-size: 10px; border-radius: var(--radius-pill); background: var(--chip); overflow: hidden; }
  .track > span { position: absolute; inset-block: 0; inset-inline-start: 0; border-radius: inherit; }
  .track .cap { background: color-mix(in srgb, var(--brand) 22%, var(--chip)); }
  .track .fill { background: var(--brand); }
  .track.blank { visibility: hidden; }
  .value { min-inline-size: 5.5rem; white-space: nowrap; }
  .sections { white-space: nowrap; }
  .section { display: inline-flex; gap: var(--space-1); align-items: center; margin-inline-end: var(--space-2); }
  .sections a, .here { display: inline-flex; align-items: center; min-block-size: 2rem; font-weight: 600; }
  .here { color: var(--brand-ink); }
  .withdrawn { padding: 0 6px; border-radius: var(--radius-pill); background: var(--chip); color: var(--ink-2); font-size: var(--t-xs); font-weight: 600; }
  .more { color: var(--muted); font-size: var(--t-sm); }
  .history .narrow-only { display: none; }

  .collapsible:not(:has(details[open])) tr.extra { display: none; }
  .toggle { border-block-start: 1px solid var(--line); }
  .toggle summary { display: flex; align-items: center; justify-content: center; min-block-size: var(--target-min); color: var(--brand-ink); font-size: var(--t-base); font-weight: 600; list-style: none; cursor: pointer; }
  .toggle summary::-webkit-details-marker { display: none; }
  .toggle summary:hover { background: var(--hover-row); }
  .toggle[open] .closed, .toggle:not([open]) .opened { display: none; }

  @media (max-width: 40rem) {
    .chart { padding-inline: var(--space-3); }
    .x.dense span.odd { color: transparent; }
    /* Each term becomes a two-line row (term + numbers, then teachers + sections), so nothing is
       clipped at 390 px and no horizontal scroll is needed. */
    table, tbody { display: block; }
    thead { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    tbody tr { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0 var(--space-3); padding: var(--space-2) var(--space-3); border-block-end: 1px solid var(--line); }
    tbody tr:last-child { border-block-end: 0; }
    tbody tr > * { padding: 0; border: 0; }
    tbody tr.current > th { box-shadow: none; }
    tbody tr.current { box-shadow: inset 3px 0 0 var(--brand); }
    tbody th { grid-row: 1; grid-column: 1; align-self: center; }
    td.num { grid-row: 1; grid-column: 2; align-self: center; }
    .names { grid-row: 2; grid-column: 1 / -1; }
    .sections { grid-row: 3; grid-column: 1 / -1; }
    .names { min-inline-size: 0; color: var(--ink-2); font-size: var(--t-sm); }
    .track { flex: 1 1 auto; max-inline-size: 8rem; }
    .value { min-inline-size: 0; }
    .name + .name { display: none; }
    .sections { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); align-items: center; white-space: normal; }
    .sections.multi .section:not(:has(.here)) { display: none; }
    .history .narrow-only { display: inline-flex; }
    .section { margin-inline-end: 0; }
    .sections a, .here { min-block-size: var(--target-min); }
  }
</style>
