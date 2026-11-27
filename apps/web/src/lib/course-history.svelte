<script lang="ts">
  import { onMount } from 'svelte';
  import { instructorHref } from '$lib/overview-paths';
  import { zeroBasedScale } from '$lib/ui/chart-scale';
  import { displayValue } from '$lib/ui/format';
  import { fillRatio, historySlots, nearlyFull, partialGroups, type HistoryRow } from '$lib/course-history';

  interface Props {
    rows: HistoryRow[];
    /** The offering this page shows; its link becomes「本頁」. */
    currentId: string;
    school: string;
    courseCode: string;
    /** Rows shown before「查看全部」. */
    initialRows?: number;
    /** This offering's own numbers, so the readout can say how much of its term's total is this class. */
    own?: { enrolled: number | null; capacity: number | null };
  }

  let { rows, currentId, school, courseCode, initialRows = 5, own }: Props = $props();

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
  let partials = $derived(rows.filter((row) => row.partial));
  let partialNotes = $derived(partialGroups(rows));
  /** Only capacities were published: the chart and the table talk about 名額 alone. */
  let capacityOnly = $derived(!hasEnrolled && hasCapacityOnly);
  /**
   * Table bars share one scale: 100% of capacity sits at a fixed marker and over-capacity terms
   * extend past it (capped at 200%), so 198% does not look like 98% full.
   */
  let ratioMax = $derived(Math.min(2, Math.max(1, ...rows.map((row) => fillRatio(row.enrolled, row.capacity) ?? 0))));
  let gaps = $derived(slots.filter((slot) => !slot.row).length);
  let chartLabel = $derived.by(() => {
    const first = slots[0]?.term;
    const last = slots.at(-1)?.term;
    const peak = rows.reduce<HistoryRow | undefined>((best, row) => (row.enrolled ?? -1) > (best?.enrolled ?? -1) ? row : best, undefined);
    const parts = [`${courseCode} 各學期${capacityOnly ? '名額' : '修課人數'}長條圖，${first} 至 ${last}，共 ${rows.length} 期有開課`];
    if (peak?.enrolled != null) parts.push(`最多為 ${peak.term} 的 ${displayValue(peak.enrolled)} 人`);
    for (const group of partialNotes) parts.push(`${group.terms.join('、')} 只收錄 ${group.count} 班（通常約 ${group.usual} 班），長條偏低不代表${capacityOnly ? '名額' : '人數'}驟減`);
    parts.push('數值見下方各期表格');
    return parts.join('；') + '。';
  });

  function percent(value: number | null) {
    return value == null || !(scale.max > 0) ? 0 : Math.min(100, (value / scale.max) * 100);
  }

  /** Hover text for a chart column: the term's numbers and, for a partial term, how much was collected. */
  function slotTitle(row: HistoryRow | null, term: string) {
    if (!row) return `${term}：沒有開課紀錄`;
    const parts = [`${term}`];
    if (!capacityOnly) parts.push(`修課 ${displayValue(row.enrolled)}`);
    parts.push(`名額 ${displayValue(row.capacity)}`);
    if (row.offeringCount > 1) parts.push(`${displayValue(row.offeringCount)} 班合計`);
    if (row.partial) parts.push(`只收錄 ${displayValue(row.offeringCount)} 班，通常約 ${displayValue(row.usualSections)} 班`);
    return parts.join('・');
  }

  /** Table bars show each term's own fill rate (修課／名額), so the bar always agrees with its label. */
  function fill(row: HistoryRow) {
    return fillRatio(row.enrolled, row.capacity);
  }

  function share(ratio: number) {
    return `${(Math.min(ratio, ratioMax) / ratioMax) * 100}%`;
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
  /** The fill-rate column exists when there is a rate or a tag (partial term, 只公布名額) to show. */
  let flagColumn = $derived(hasBoth || (hasEnrolled && hasCapacityOnly));
  let columns = $derived(flagColumn ? 5 : 4);
  let hasCurrent = $derived(rows.some((row) => row.current));
  let hiddenRows = $derived(rows.slice(initialRows).filter((row) => !row.current).length);
  /** Index of the first folded row: the「⋯ 展開其餘 N 期」 row sits there, at the gap it fills. */
  let firstHidden = $derived(rows.findIndex((row, index) => index >= initialRows && !row.current));
  const uid = $props.id();
  let expanded = $state(false);

  let area: HTMLDivElement | undefined = $state();
  let scrolls = $state(false);
  /** Content hidden past the left / right edge of the scrolling chart, shown as a soft fade there. */
  let clipStart = $state(false);
  let clipEnd = $state(false);
  function edges() {
    if (!area) return;
    clipStart = area.scrollLeft > 2;
    clipEnd = area.scrollLeft + area.clientWidth < area.scrollWidth - 2;
  }
  function moveChart(target: 'current' | 'latest') {
    if (!area) return;
    const current = area.querySelector<HTMLElement>('.slot.current');
    area.scrollLeft = target === 'current' && current
      ? current.offsetLeft - (area.clientWidth - current.offsetWidth) / 2
      : area.scrollWidth;
  }
  onMount(() => {
    if (!area) return;
    const measure = () => {
      const wasScrollable = scrolls;
      scrolls = !!area && area.scrollWidth > area.clientWidth + 1;
      if (scrolls && !wasScrollable) moveChart('current');
      edges();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    return () => observer.disconnect();
  });
</script>

<div class="history">
  {#if showChart}
    <figure class="chart">
      <figcaption>
        <!-- The scope is in the title: a multi-section term is the sum of every collected section, not this class. -->
        <strong class="chart-title">{capacityOnly ? '名額（人數未公布）' : '修課人數與名額'}{#if multiSection}<span class="scope">・同課號各班合計</span>{/if}</strong>
        <span class="readout" aria-hidden="true">
          {#if focus}
            <strong class="ui-mono">{focus.term}</strong>
            {#if !capacityOnly}<span>修課 <b class="ui-tabular">{displayValue(focus.enrolled)}</b>{#if focus.enrolled != null} 人{/if}</span>{/if}
            <span>名額 <b class="ui-tabular">{displayValue(focus.capacity)}</b></span>
            {#if focus.offeringCount > 1}<span>{displayValue(focus.offeringCount)} 班</span>{/if}
            {#if focus.current && own && focus.offeringCount > 1 && (own.enrolled != null || own.capacity != null)}
              <span class="tag">其中本班 {#if capacityOnly || own.enrolled == null}名額 {displayValue(own.capacity)}{:else}{displayValue(own.enrolled)}／{displayValue(own.capacity)}{/if}</span>
            {:else if focus.current}<span class="tag">本班所在學期</span>{/if}
            {#if focus.partial}<span class="tag partial-tag">只收錄 {displayValue(focus.offeringCount)} 班{#if focus.usualSections}，通常約 {displayValue(focus.usualSections)} 班{/if}</span>{/if}
          {/if}
        </span>
        <span class="legend" aria-hidden="true">
          {#if hasEnrolled}<span><i class="key fill"></i>修課人數</span>{/if}
          {#if rows.some((row) => (fill(row) ?? 0) > 1)}<span title="長條超過名額刻線的那一段"><i class="key over-key"></i>超額</span>{/if}
          {#if hasBoth}<span><i class="key cap"></i>名額</span>{/if}
          {#if hasCapacityOnly}<span><i class="key caponly"></i>{capacityOnly ? '名額' : '只公布名額'}</span>{/if}
          {#if partials.length}<span><i class="key partial"></i>只收錄部分班次</span>{/if}
        </span>
      </figcaption>
      {#if scrolls}
        <p class="swipe"><span>↔ 左右滑動看各學期</span><button type="button" onclick={() => { moveChart('latest'); active = rows[0]?.term; }}>最近學期 →</button></p>
      {/if}
      <div class="plot">
        <div class="y ui-tabular" class:band={hasCurrent} aria-hidden="true">
          {#each scale.ticks as tick (tick)}<span style:bottom={`${percent(tick)}%`}>{displayValue(tick)}</span>{/each}
        </div>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (the scroll region needs a keyboard target) -->
        <div class="area" class:band={hasCurrent} class:clip-start={clipStart} class:clip-end={clipEnd} role="region" aria-label={chartLabel} tabindex={scrolls ? 0 : undefined} bind:this={area} onscroll={edges}>
          <div class="bars" style:--slots={slots.length} aria-hidden="true">
            {#each scale.ticks as tick (tick)}<span class="grid" class:base={tick === 0} style:bottom={`${percent(tick)}%`}></span>{/each}
            {#each slots as slot, slotIndex (slot.term)}
              {@const row = slot.row}
              <div
                role="presentation"
                class="slot"
                class:active={row && row.term === active}
                class:current={row?.current}
                class:withdrawn={row?.withdrawn}
                class:partial={row?.partial}
                class:overbooked={row?.enrolled != null && row.capacity != null && row.enrolled > row.capacity}
                title={slotTitle(row, slot.term)}
                onpointerenter={() => { if (row) active = row.term; }}
                onpointerleave={() => (active = undefined)}
              >
                {#if row && row.capacity != null && row.enrolled == null}
                  <span class="cap capacity" style:height={`${percent(row.capacity)}%`}></span>
                {/if}
                {#if row && row.enrolled != null && row.capacity != null && row.enrolled > row.capacity}
                  <!-- Over capacity: the bar is brand up to 名額 and only the part above it is the warning colour. -->
                  <span class="fill" style:height={`${percent(row.capacity)}%`}></span>
                  <span class="over-seg" style:bottom={`${percent(row.capacity)}%`} style:height={`${percent(row.enrolled) - percent(row.capacity)}%`}></span>
                {:else if row && row.enrolled != null}
                  <span class="fill" style:height={`${percent(row.enrolled)}%`}></span>
                {/if}
                {#if row && row.capacity != null && row.enrolled != null}
                  <!-- Capacity is a tick drawn over the bar, so it stays visible when enrolment exceeds it. -->
                  <span class="tick" style:bottom={`${percent(row.capacity)}%`}></span>
                {/if}
                {#if row && row.enrolled == null && row.capacity == null}<span class="none">·</span>{/if}
                {#if row?.partial}
                  <!-- A partial term sits on a faint textured full-height column (one legend entry, no text in it), so
                       its short bar (true height) reads as「few sections collected」, not as a collapse. The section
                       counts are in the hover text, the readout and the note under the chart. -->
                  <span class="ghost"></span>
                {/if}
                {#if row?.current}
                  <!-- 「本班」 sits in a band above the plot, with a dashed leader down to the bar, so even a
                       very short bar keeps its true height and the label never crowds the axis. -->
                  <span class="here-flag" class:end={slotIndex === slots.length - 1} class:start={slotIndex === 0}>本班</span>
                  {#if !row.partial}<span class="leader" style:bottom={`calc(${percent(Math.max(row.enrolled ?? 0, row.capacity ?? 0))}% + 3px)`}></span>{/if}
                {/if}
              </div>
            {/each}
          </div>
          <!-- Semester digits under each slot; the offering's own term is a filled marker, not an outline. -->
          <div class="sem ui-tabular" style:--slots={slots.length} aria-hidden="true">
            {#each slots as slot (slot.term)}
              <span class:current={slot.row?.current} class:gap={!slot.row}>{#if slot.row?.current}<span class="sr-only">本班所在學期 </span>{/if}{slot.term.split('-')[1] ?? ''}</span>
            {/each}
          </div>
          <div class="x ui-tabular" style:--slots={slots.length} aria-hidden="true">
            {#each yearGroups as group (group.year)}
              <span class="year" class:cur={group.year === currentTerm?.split('-')[0]} style:grid-column={`span ${group.span}`}>{group.year}</span>
            {/each}
          </div>
        </div>
      </div>
      <!-- The partial-term warning is the one prominent caption; how to read the axes stays short. -->
      <p class="note">{#each partialNotes as group (group.terms.join())}<span class="partial-note"><i class="key partial" aria-hidden="true"></i>{group.terms.join('、')} 只收錄 {displayValue(group.count)} 班（通常約 {displayValue(group.usual)} 班），偏低不代表{capacityOnly ? '名額' : '人數'}驟減。</span>{/each}1、2 是上、下學期{#if gaps}；空格是沒有開課紀錄{/if}{#if hasUnpublished}；「·」是有開課但未公布人數{/if}。</p>
    </figure>
  {/if}

  {#if !showChart && rows.length > 1}
    <p class="note">{published === 0 ? '各學期都沒有公布修課人數與名額，因此只列出開課紀錄。' : `只有 ${published} 個學期公布人數或名額，數值直接列在表格中。`}</p>
  {/if}
  <div class="frame" class:collapsible={hiddenRows > 0}>
    <!-- The bar key sits on the table itself (phones too), not in a long column header. -->
    <!-- Two short lines: what the rows are, then how to read the fill-rate bars (each term's own rate). -->
    <div class="table-key">
      <p class="key-scope">{multiSection ? '各學期已收錄班次合計，新到舊' : '各學期，新到舊'}{#if capacityOnly}；校方未公布修課人數，只列名額{/if}</p>
      {#if hasBoth && !capacityOnly}
        <p class="key-bars">
          <span><i class="tk fill" aria-hidden="true"></i>滿額率＝該期修課÷名額</span>
          <span><i class="tk tick" aria-hidden="true"></i>刻線＝100%</span>
          <span><i class="tk over" aria-hidden="true"></i>超過刻線＝超額</span>
          {#if ratioMax > 1}<span><i class="tk track-key" aria-hidden="true"></i>整條＝名額的 {Math.round(ratioMax * 100)}%{#if rows.some((row) => (fill(row) ?? 0) > 2)}，更高的截在條尾{/if}</span>{/if}
        </p>
      {/if}
    </div>
    {#if hiddenRows}
      <!-- One checkbox (works without JavaScript) drives two labels: a gap row where the folded terms belong,
           and a collapse row at the end once they are shown. -->
      <input type="checkbox" id={`${uid}-all`} class="expand sr-only" bind:checked={expanded} aria-label={`列出全部 ${rows.length} 期`} />
    {/if}
    <div class="scroll">
      <table>
        <caption class="sr-only">{courseCode} 各學期開課與修課人數，新到舊</caption>
        <thead>
          <tr>
            <th scope="col">學期</th>
            <th scope="col">授課教師</th>
            <th scope="col" class="num">{capacityOnly ? '名額' : '修課／名額'}</th>
            {#if flagColumn}<th scope="col" class="ratio">滿額率</th>{/if}
            <th scope="col">班次</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row, index (row.term)}
            {@const ratio = fill(row)}
            {#if index === firstHidden}
              <tr class="gap-row" aria-hidden="true"><td colspan={columns}><label for={`${uid}-all`}><span class="dots">⋯</span>展開其餘 {hiddenRows} 期<span class="caret">▾</span></label></td></tr>
            {/if}
            <tr
              class:extra={index >= initialRows && !row.current}
              class:active={row.term === active}
              class:current={row.current}
              onpointerenter={() => (active = row.term)}
              onpointerleave={() => (active = undefined)}
              onfocusin={() => (active = row.term)}
              onfocusout={() => (active = undefined)}
            >
              <th scope="row" class="ui-mono">{row.term}{#if row.current}<span class="here" aria-current="page">本頁</span>{/if}</th>
              <td class="names">
                {#each row.instructors as name, i (name)}<span class="name">{#if i > 0}、{/if}<a href={instructorHref(school, name)}>{name}</a></span>{:else}<span class="muted">未公布</span>{/each}{#if row.instructorCount > row.instructors.length}<span class="muted count">，另 {displayValue(row.instructorCount - row.instructors.length)} 位</span>{/if}
              </td>
              <!-- Numbers and the fill rate are separate aligned columns: 修課／名額, then bar, percentage and one tag. -->
              <td class="num ui-tabular value">
                {#if row.enrolled == null && row.capacity == null}<span class="muted">未公布</span>
                {:else if capacityOnly}{displayValue(row.capacity)}
                {:else}{displayValue(row.enrolled)}<span class="muted">&nbsp;/&nbsp;{displayValue(row.capacity)}</span>{/if}
                <!-- Without a fill-rate column (only 名額 published) the partial tag follows the number. -->
                {#if row.partial && !flagColumn}<span class="only partial-badge" title={`其他學期通常約 ${displayValue(row.usualSections)} 班`}>只收錄 {displayValue(row.offeringCount)} 班</span>{/if}
              </td>
              {#if flagColumn}
                <td class="ratio">
                  <span class="cell-bar">
                    {#if ratio != null}
                      <span class="track" class:warn={ratio >= nearlyFull && ratio <= 1} class:scaled={ratioMax > 1} style:--full={share(1)} aria-hidden="true">
                        <span class="fill" style:width={share(Math.min(1, ratio))}></span>
                        {#if ratio > 1}<span class="over-fill" style:inset-inline-start={share(1)} style:width={`calc(${share(ratio)} - ${share(1)})`}></span>{/if}
                      </span>
                      <span class="pct ui-tabular" class:hot={ratio > 1}>{Math.round(ratio * 100)}%</span>
                    {:else if hasBoth}
                      <span class="track blank" aria-hidden="true"></span><span class="pct muted">—</span>
                    {/if}
                    {#if row.partial}<span class="only partial-badge" title={`其他學期通常約 ${displayValue(row.usualSections)} 班`}>只收錄 {displayValue(row.offeringCount)} 班</span>
                    {:else if ratio != null && ratio > 1}<span class="over" title={`修課人數是名額的 ${Math.round(ratio * 100)}%，超收 ${displayValue((row.enrolled ?? 0) - (row.capacity ?? 0))} 人`}>超額</span>
                    {:else if hasEnrolled && row.enrolled == null && row.capacity != null}<span class="only">只公布名額</span>{/if}
                  </span>
                </td>
              {/if}
              <td class="sections">
                <!-- One link per term: its sections are listed on the search page, so rows stay one action wide. -->
                {#if row.offeringCount > 1}
                  <a class="more" href={termSearch(row.term)} aria-label={`看 ${row.term} 的 ${row.offeringCount} 個班次`}>{displayValue(row.offeringCount)} 個班次 →</a>
                {:else if row.offerings[0] && row.offerings[0].id !== currentId}
                  <a class="more" href={`/courses/${row.offerings[0].id}`} aria-label={`看 ${row.term} 的這一班${row.offerings[0].active ? '' : '（已下架）'}`}>看這班 →</a>
                {/if}
                {#if row.withdrawn}<span class="withdrawn">已下架</span>{/if}
              </td>
            </tr>
          {/each}
          {#if hiddenRows}
            <tr class="collapse-row" aria-hidden="true"><td colspan={columns}><label for={`${uid}-all`}>收合為最近 {initialRows} 期{#if hasCurrent && rows.findIndex((row) => row.current) >= initialRows}與本班{/if}<span class="caret">▴</span></label></td></tr>
          {/if}
        </tbody>
      </table>
    </div>

  </div>
</div>

<style>
  .history { display: grid; gap: var(--space-3); min-inline-size: 0; }
  .sr-only { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .ui-mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  .muted { color: var(--muted); }

  .chart { margin: 0; padding: var(--space-3) var(--space-4) var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
  figcaption { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-4); align-items: baseline; justify-content: space-between; margin-block-end: var(--space-3); font-size: 0.8125rem; color: var(--ink-2); }
  .readout { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); align-items: baseline; min-block-size: 1.5rem; color: var(--ink-2); }
  .readout strong { color: var(--ink); font-size: var(--t-base); }
  .readout b { color: var(--ink); font-size: var(--t-base); font-weight: 600; }
  .tag { padding: 0 6px; border-radius: var(--radius-pill); background: var(--brand-wash); color: var(--brand-ink); font-weight: 600; }
  .tag.partial-tag { background: transparent; color: var(--ink); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--brand) 70%, transparent); }
  .legend { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); }
  .legend span { display: inline-flex; gap: 0.35rem; align-items: center; }
  .key { display: inline-block; inline-size: 12px; block-size: 12px; border-radius: 2px; }
  .key.fill { background: var(--brand); }
  .chart-title { flex-basis: 100%; font-size: var(--t-base); color: var(--ink); }
  .key.over-key { background: var(--warn); }
  .key.cap { block-size: 0; inline-size: 20px; border-block-start: 3px solid var(--ink); border-radius: 0; }
  .key.caponly { background: color-mix(in srgb, var(--brand) 62%, var(--panel-raised)); }
  /* The one partial-term mark: a faint diagonal texture in a thin dashed frame, same as the chart column. */
  .key.partial, .slot > .ghost { border: 1px dashed color-mix(in srgb, var(--brand) 55%, var(--line)); background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--brand) 16%, transparent) 0 2px, transparent 2px 6px), color-mix(in srgb, var(--brand) 4%, var(--panel-raised)); }
  .key.partial { inline-size: 12px; block-size: 12px; }
  .chart-title .scope { color: var(--ink-2); font-weight: 500; }

  .plot { display: grid; grid-template-columns: max-content minmax(0, 1fr); column-gap: var(--space-2); }
  .y { position: relative; block-size: 9.5rem; min-inline-size: 1.5rem; color: var(--ink-2); font-size: var(--t-sm); }
  /* A 1.5rem band above the plot holds the 「本班」 label; the y axis moves down with the bars. */
  .y.band { margin-block-start: 1.5rem; }
  .area.band { padding-block-start: 1.5rem; }
  .y span { position: absolute; inset-inline-end: 0; translate: 0 50%; line-height: 1; }
  .area { min-inline-size: 0; overflow-x: auto; scrollbar-width: thin; }
  /* A scrolled chart fades at the edge that hides terms, so a cut-off label reads as「more this way」. */
  .area.clip-start { mask-image: linear-gradient(to right, transparent, #000 1.5rem); }
  .area.clip-end { mask-image: linear-gradient(to left, transparent, #000 1.5rem); }
  .area.clip-start.clip-end { mask-image: linear-gradient(to right, transparent, #000 1.5rem, #000 calc(100% - 1.5rem), transparent); }
  .bars { position: relative; display: grid; grid-template-columns: repeat(var(--slots), minmax(0.75rem, 1fr)); align-items: end; block-size: 9.5rem; min-inline-size: calc(var(--slots) * 0.75rem); }
  .grid { position: absolute; inset-inline: 0; block-size: 0; border-block-start: 1px solid var(--line); }
  .grid.base { border-color: var(--control-line); }
  .slot { position: relative; display: flex; justify-content: center; align-items: end; block-size: 100%; }
  .slot > span { position: absolute; inset-block-end: 0; inline-size: min(70%, 2.25rem); border-radius: 2px 2px 0 0; }
  .slot .cap.capacity { background: color-mix(in srgb, var(--brand) 62%, var(--panel-raised)); }
  .slot .tick { z-index: 1; inline-size: min(90%, 2.75rem); block-size: 0; border-radius: 0; border-block-start: 2px solid var(--ink); box-shadow: 0 0 0 1px var(--panel-raised); translate: 0 1px; }
  .slot.current .cap.capacity { background: color-mix(in srgb, var(--brand) 70%, var(--panel-raised)); }
  /* Terms with far fewer sections than usual: the bar keeps its true height in a lighter tint, on a faint
     textured full-height column (no text inside; the counts are in the hover text, readout and note). */
  .slot.partial .fill, .slot.partial .cap.capacity { min-block-size: 3px; }
  .slot > .ghost { inset-block: 0; z-index: 0; inline-size: min(92%, 2.75rem); border-block-end: 0; border-radius: 3px 3px 0 0; pointer-events: none; }
  .slot.partial > :is(.fill, .cap, .tick, .over-seg) { z-index: 1; }
  .slot > .here-flag { inset-block: -1.5rem auto; z-index: 2; inline-size: max-content; padding: 0 5px; border-radius: 3px; background: var(--brand); color: var(--on-brand); font-size: var(--t-xs); font-weight: 650; line-height: 1.35rem; white-space: nowrap; pointer-events: none; }
  .slot > .here-flag.end { inset-inline-end: 0; }
  .slot > .here-flag.start { inset-inline-start: 0; }
  .slot > .leader { inset-block-start: 0; z-index: 1; inline-size: 0; border-radius: 0; border-inline-start: 1.5px dashed var(--brand); pointer-events: none; }
  .slot .fill { background: color-mix(in srgb, var(--brand) 72%, var(--panel-raised)); }
  .slot.current .fill { background: var(--brand); }
  .slot.withdrawn .fill { background: color-mix(in srgb, var(--muted) 60%, var(--panel-raised)); }
  .slot.active::after { content: ''; position: absolute; inset-block: 0 -0.375rem; inset-inline: 50%; border-inline-start: 1px dashed var(--control-line); }
  .slot.active .fill { background: var(--brand-ink); }
  /* Over capacity: only the part above 名額 is orange, stacked on the brand bar. */
  .slot.overbooked .fill { border-radius: 0; }
  .slot > .over-seg { background: var(--warn); }
  .slot.partial .fill, .slot.partial .cap.capacity { background: color-mix(in srgb, var(--brand) 45%, var(--panel-raised)); }
  .slot.partial > .over-seg { background: color-mix(in srgb, var(--warn) 55%, var(--panel-raised)); }
  .slot.current .tick { border-block-start-width: 3px; }
  .slot .none { inset-block-end: 2px; inline-size: auto; color: var(--muted); font-size: var(--t-sm); line-height: 1; }
  .sem { display: grid; grid-template-columns: repeat(var(--slots), minmax(0.75rem, 1fr)); min-inline-size: calc(var(--slots) * 0.75rem); margin-block-start: 7px; color: var(--ink-2); font-size: var(--t-sm); line-height: 1.4; text-align: center; }
  .sem span { justify-self: center; min-inline-size: 1.1em; border-radius: 3px; }
  .sem .gap { opacity: 0.55; }
  .sem .current { padding-inline: 2px; background: var(--brand); color: var(--on-brand); font-weight: 700; }
  .x { display: grid; grid-template-columns: repeat(var(--slots), minmax(0.75rem, 1fr)); min-inline-size: calc(var(--slots) * 0.75rem); margin-block-start: 2px; color: var(--ink-2); font-size: var(--t-sm); line-height: 1.2; }
  /* Flex centring lets a label wider than its one-term year spill evenly; the last one spills inwards. */
  .x span { display: flex; justify-content: center; white-space: nowrap; overflow: visible; border-inline-start: 1px solid var(--line); }
  .x span:last-child { justify-content: flex-end; }
  .x span:first-child { border-inline-start: 0; }
  .note { margin: var(--space-2) 0 0; color: var(--ink-2); font-size: 0.8125rem; line-height: 1.5; text-wrap: pretty; }
  .swipe { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin: 0 0 var(--space-2); color: var(--ink-2); font-size: var(--t-sm); }
  .swipe button { min-block-size: var(--target-min); padding: 0 var(--space-2); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--brand-ink); font: inherit; font-weight: 600; cursor: pointer; }

  .frame { position: relative; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); overflow: hidden; }
  .table-key { display: grid; gap: 2px; padding: var(--space-2) 0.625rem; border-block-end: 1px solid var(--line); background: var(--table-head); color: var(--ink-2); font-size: 0.8125rem; }
  .table-key p { margin: 0; }
  .key-scope { color: var(--ink); font-weight: 600; }
  .key-bars { display: flex; flex-wrap: wrap; gap: 2px var(--space-4); }
  .key-bars span { display: inline-flex; gap: 0.4em; align-items: center; }
  .tk { display: inline-block; inline-size: 14px; block-size: 8px; border-radius: var(--radius-pill); }
  .tk.fill { background: var(--brand); }
  .tk.tick { inline-size: 2px; block-size: 12px; border-radius: 0; background: var(--ink); }
  .tk.over { background: var(--warn); }
  .tk.track-key { inline-size: 22px; background: var(--chip); box-shadow: inset 0 0 0 1px var(--control-line); }
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
  .names .count { margin-inline-start: 0.15em; color: var(--muted); font-size: 0.8125rem; white-space: nowrap; }
  .cell-bar { display: flex; gap: var(--space-2); align-items: center; }
  td.ratio { inline-size: 1%; white-space: nowrap; }
  .pct { min-inline-size: 2.75rem; color: var(--ink-2); font-size: var(--t-sm); text-align: end; }
  .pct.hot { color: var(--ink); font-weight: 650; }
  .track { position: relative; flex: 0 0 5.5rem; block-size: 10px; border-radius: var(--radius-pill); background: var(--chip); overflow: hidden; }
  .track > span { position: absolute; inset-block: 0; inset-inline-start: 0; border-radius: inherit; }
  .track .fill { background: var(--brand); }
  .track.warn .fill { background: var(--warn); }
  .track .over-fill { background: var(--warn); border-radius: 0 var(--radius-pill) var(--radius-pill) 0; }
  .track.scaled .fill { border-radius: var(--radius-pill) 0 0 var(--radius-pill); }
  /* 100% of capacity: a marker the over-capacity part runs past. */
  .track.scaled::after { content: ''; position: absolute; z-index: 1; inset-block: -2px; inset-inline-start: var(--full); inline-size: 2px; margin-inline-start: -1px; background: var(--ink); }
  .track.scaled { overflow: visible; }
  .over, .only { flex: none; padding: 0 6px; border-radius: var(--radius-pill); font-size: var(--t-xs); font-weight: 650; white-space: nowrap; }
  .over { background: var(--warn-wash); color: var(--ink); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--warn) 45%, transparent); }
  .only { background: var(--chip); color: var(--ink-2); }
  .partial-badge { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--brand) 45%, transparent); }
  .partial-note { display: flex; gap: 0.4em; align-items: baseline; margin-block-end: 2px; color: var(--ink); }
  .partial-note .key { flex: none; translate: 0 1px; }
  .track.blank { visibility: hidden; }
  .value { min-inline-size: 5.5rem; white-space: nowrap; }
  td.value { inline-size: 1%; }
  td.value .partial-badge { margin-inline-start: var(--space-2); }
  td.sections { inline-size: 1%; }
  .sections { white-space: nowrap; }
  .sections a { display: inline-flex; align-items: center; min-block-size: 2rem; font-weight: 600; }
  .here { margin-inline-start: var(--space-2); padding: 0 6px; border-radius: var(--radius-pill); background: var(--brand-wash); color: var(--brand-ink); font-family: var(--font-sans); font-size: var(--t-xs); font-weight: 650; }
  .withdrawn { padding: 0 6px; border-radius: var(--radius-pill); background: var(--chip); color: var(--ink-2); font-size: var(--t-xs); font-weight: 600; }
  .more { color: var(--ink-2); font-size: var(--t-sm); }

  .collapsible:not(:has(.expand:checked)) tr.extra { display: none; }
  .collapsible:has(.expand:checked) .gap-row, .collapsible:not(:has(.expand:checked)) .collapse-row { display: none; }
  :is(.gap-row, .collapse-row) td { padding: 0; }
  :is(.gap-row, .collapse-row) label { display: flex; gap: var(--space-2); align-items: center; justify-content: center; min-block-size: var(--target-min); color: var(--brand-ink); font-size: var(--t-base); font-weight: 600; cursor: pointer; }
  :is(.gap-row, .collapse-row) label:hover { background: var(--hover-row); }
  .gap-row td { background: repeating-linear-gradient(to right, var(--control-line) 0 6px, transparent 6px 12px) top / 100% 1px no-repeat, color-mix(in srgb, var(--brand) 5%, var(--panel-raised)); }
  .gap-row .dots { color: var(--muted); font-size: var(--t-lg); line-height: 1; }
  .collapse-row td { border-block-start: 1px solid var(--line); }
  .collapsible:has(.expand:focus-visible) :is(.gap-row, .collapse-row) label { outline: var(--focus-ring); outline-offset: -3px; }

  @media (max-width: 40rem) {
    .chart { padding-inline: var(--space-3); }
    /* Fixed term columns: a long history scrolls inside the chart instead of squeezing every bar. */
    .bars, .sem, .x { grid-template-columns: repeat(var(--slots), minmax(1.25rem, 1fr)); min-inline-size: calc(var(--slots) * 1.25rem); }
    .table-key { padding-inline: var(--space-3); }
    /* Phones keep 本頁 and「全部 N 班」; single section links live behind「全部 N 班」. */
    /* Each term becomes a two-line row (term + numbers, then teachers + sections), so nothing is
       clipped at 390 px and no horizontal scroll is needed. */
    table, tbody { display: block; }
    thead { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    tbody tr { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0 var(--space-3); padding: var(--space-2) var(--space-3); border-block-end: 1px solid var(--line); }
    tbody tr:last-child { border-block-end: 0; }
    tbody tr:is(.gap-row, .collapse-row) { display: block; padding: 0; }
    .collapsible:has(.expand:checked) .gap-row, .collapsible:not(:has(.expand:checked)) .collapse-row { display: none; }
    tbody tr:is(.gap-row, .collapse-row) td { display: block; }
    tbody tr > * { padding: 0; border: 0; }
    tbody tr.current > th { box-shadow: none; }
    tbody tr.current { box-shadow: inset 3px 0 0 var(--brand); }
    /* Line 1: term, fill rate (bar, % and one tag), numbers; line 2: teachers, then the section link right
       under the numbers, so both right-hand columns line up. */
    tbody tr { grid-template-columns: auto minmax(0, 1fr) auto; }
    tbody th { grid-row: 1; grid-column: 1; align-self: center; }
    td.ratio { grid-row: 1; grid-column: 2; align-self: center; inline-size: auto; min-inline-size: 0; }
    td.value { grid-row: 1; grid-column: 3; align-self: center; inline-size: auto; text-align: end; }
    tr:not(:has(td.ratio)) td.value { grid-column: 2 / -1; }
    .names { grid-row: 2; grid-column: 1 / 3; align-self: center; }
    .sections { grid-row: 2; grid-column: 3; justify-content: end; }
    .ratio .cell-bar { gap: var(--space-1); }
    .ratio .track { flex: 1 1 3rem; min-inline-size: 2rem; }
    .pct { min-inline-size: 0; }
    .names { min-inline-size: 0; color: var(--ink-2); font-size: var(--t-sm); }
    .track { max-inline-size: 6rem; }
    .value { min-inline-size: 0; }
    .sections { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); align-items: center; white-space: normal; }
    .sections .more { margin-inline-start: auto; padding-inline: var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-control); min-block-size: 2.25rem; display: inline-flex; align-items: center; }
    .sections a { min-block-size: var(--target-min); }
  }
</style>
