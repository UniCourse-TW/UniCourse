<script lang="ts">
  import { page } from '$app/state';
  import { importedAt, isHttpUrl, shortImportedAt } from '$lib/format';
  import { departmentHref, schoolHref } from '$lib/overview-paths';
  import SchoolsOfferingTable from '$lib/schools-offering-table.svelte';
  import ChartValues from '$lib/ui/ChartValues.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import ErrorState from '$lib/ui/ErrorState.svelte';
  import FilterSelect from '$lib/ui/FilterSelect.svelte';
  import Pagination from '$lib/ui/Pagination.svelte';
  import SectionHeader from '$lib/ui/SectionHeader.svelte';
  import TrendChart from '$lib/ui/TrendChart.svelte';
  import { changeQuery, displayValue } from '$lib/ui/format';
  import { partialTermLabel, partialTerms } from '$lib/ui/partial-terms';
  import type { TableColumn } from '$lib/ui/types';
  import '$lib/schools-browse.css';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let department = $derived(data.department);
  let base = $derived(departmentHref(department.school, department.department));
  let termLabel = $derived(data.term === 'all' ? '所有學期' : `${data.term} 學期`);
  let distribution = $derived([
    { label: '必修', count: data.breakdown.required, color: 'var(--seq-4)' },
    { label: '選修', count: data.breakdown.elective, color: 'var(--seq-2)' },
    { label: '通識', count: data.breakdown.general, color: 'var(--series-3)' },
    { label: '其他', count: data.breakdown.other, color: 'var(--series-4)' },
    { label: '未分類', count: data.breakdown.unknown, color: 'var(--axis)' }
  ].filter(({ count }) => count > 0));
  let termOptions = $derived([...new Set([...data.terms, data.term].filter((term) => term !== 'all'))].sort().reverse());
  let recentTerms = $derived(
    data.term !== 'all' && termOptions.indexOf(data.term) > 1 ? [termOptions[0], data.term] : termOptions.slice(0, 2)
  );
  let olderTerms = $derived(termOptions.filter((term) => !recentTerms.includes(term)));
  let selectedTrend = $derived(data.trends?.find(({ term }) => term === data.term));
  let hasSearch = $derived(Boolean(data.query || page.url.searchParams.has('sort')));
  let orderOptions = $derived([
    ...(data.query ? [{ value: 'relevance', label: '關鍵字相關度' }] : [{ value: 'relevance', label: '學期最新' }]),
    { value: 'enrolled', label: '修課人數最多' }, { value: 'title', label: '依課名排序' }
  ]);
  let historical = $derived([...(data.trends ?? [])].reverse());
  let partial = $derived(partialTerms(historical.map(({ term, offerings }) => [term, offerings])));
  let missingEnrollment = $derived(historical.some(({ enrolled }) => enrolled === null));
  let historicalColumns = $derived<TableColumn<(typeof historical)[number]>[]>([
    { id: 'term', label: '學期', value: ({ term }) => term },
    { id: 'offerings', label: '開課班次', value: ({ offerings }) => offerings, numeric: true },
    { id: 'enrolled', label: '已公布修課人次', value: ({ enrolled }) => enrolled, numeric: true },
    ...(partial.size ? [{ id: 'partial', label: '收錄備註', value: ({ term }: (typeof historical)[number]) => partial.has(term) ? partialTermLabel : null }] : [])
  ]);
  let courseCount = $derived(data.complete ? data.courses : data.trends?.find(({ term }) => term === data.term)?.courses ?? null);
  const classOptions = [{ value: 'required', label: '必修' }, { value: 'elective', label: '選修' }];

  function termHref(term: string) {
    return changeQuery(new URL(page.url.pathname + page.url.search, page.url), (params) => {
      params.set('term', term);
      params.delete('page');
    }) + '#offerings';
  }

  function classHref(value: string) {
    return changeQuery(new URL('#offerings', page.url), (params) => {
      params.delete('page');
      if (value) params.set('class_filter', value);
      else params.delete('class_filter');
    });
  }

</script>

<svelte:head><title>{department.department} · {department.schoolName}｜UniCourse</title></svelte:head>

<div class="browse-page department-page">
  <nav class="browse-crumbs" aria-label="所在位置">
    <a href="/">查課</a><span aria-hidden="true">/</span><a href="/schools">學校</a><span aria-hidden="true">/</span><a href={schoolHref(department.school)}>{department.schoolName}</a>
  </nav>
  <header class="browse-head" id="department-top" tabindex="-1">
    <div class="browse-stack">
      <h1>{department.department}</h1>
      <p class="browse-dek"><span>{department.schoolName}課程資料 · {displayValue(data.terms.length)} 學期</span>{#if data.updatedAt}<span>匯入 <time datetime={data.updatedAt} title={importedAt(data.updatedAt)}>{shortImportedAt(data.updatedAt)}</time>・臺北時間</span>{/if}</p>
    </div>
    <nav class="term-links section-links" aria-label="本頁段落">
      <a href="#offerings">課表 ↓</a>
      <a href="#department-history">歷年開課變化 ↓</a>
    </nav>
  </header>

  <section class="browse-stack timetable" id="offerings" aria-labelledby="timetable-title">
    <nav class="term-links semester-links" aria-label="切換學期">
      <span class="control-label" aria-hidden="true">學期</span>
      <div class="all-terms"><a href={termHref('all')} aria-current={data.term === 'all' ? 'true' : undefined}>所有學期</a></div>
      {#each recentTerms as term (term)}
        <a href={termHref(term)} aria-current={term === data.term ? 'true' : undefined}>{term}</a>
      {/each}
      {#if olderTerms.length}
        {#key data.term}
          <details>
            <summary>其他學期</summary>
            <ul class="term-options" aria-label="其他學期" role="list">
              {#each olderTerms as term (term)}<li><a href={termHref(term)}>{term}</a></li>{/each}
            </ul>
          </details>
        {/key}
      {/if}
    </nav>
    <div>
      <SectionHeader title={`${termLabel}課表`} id="timetable-title" />
      <p class="browse-note"><strong>{displayValue(data.total)} 班</strong>{#if courseCount !== null} · {displayValue(courseCount)} 門課{/if}{#if data.complete} · {displayValue(data.teachers)} 位授課教師{/if}</p>
    </div>
    <div class="timetable-toolbar">
      <nav class="term-links class-links" aria-label={data.classInPage ? '本頁班次類別' : '班次類別'}>
        <span class="control-label" aria-hidden="true">類別</span>
        {#each [{ value: '', label: '不限類別' }, ...classOptions] as option (option.value)}
          <a href={classHref(option.value)} aria-current={option.value === data.classFilter ? 'true' : undefined}>{option.label}</a>
        {/each}
      </nav>
      {#if distribution.length}
        <div class="distribution">
          <ul aria-label="必選修分布（班次）" role="list">
            {#each distribution as { label, count, color } (label)}
              <li><span style:background={color} aria-hidden="true"></span>{label} <strong class="ui-tabular">{displayValue(count)}</strong></li>
            {/each}
          </ul>
          {#if distribution.length > 1}
            <div class="segments" aria-hidden="true">
              {#each distribution as { label, count, color } (label)}<span style:flex-grow={count} style:background={color}></span>{/each}
            </div>
          {/if}
          {#if !data.complete}<p class="browse-note">統計樣本：{displayValue(data.sampleSize)} 班。</p>{/if}
        </div>
      {/if}
      {#key data.query + ':' + (page.url.searchParams.get('sort') ?? '')}
        <details class="search-options" open={hasSearch}>
          <summary>找課名或教師{#if data.query}<span class="query-tag">{data.query}</span>{/if}</summary>
          <form class="timetable-controls" action={`${base}#offerings`} method="GET" aria-label="課表篩選">
            <input type="hidden" name="term" value={data.term} />
            {#if data.classFilter}<input type="hidden" name="class_filter" value={data.classFilter} />{/if}
            <label class="timetable-search">
              <span>課名、教師或課號</span>
              <span class="input-wrap">
                <i class="search-icon" aria-hidden="true"></i>
                <input type="search" name="q" defaultValue={data.query} maxlength="100" placeholder="輸入課名、教師或課號" aria-label="搜尋教師或課程" />
              </span>
            </label>
            <div class="timetable-options">
              <FilterSelect name="sort" label="排序" allLabel={null} value={data.sort} options={orderOptions} />
              <button class="browse-button">套用</button>
              {#if hasSearch || data.classFilter}<a href={`${base}?term=${encodeURIComponent(data.term)}#offerings`}>清除</a>{/if}
            </div>
          </form>
        </details>
      {/key}
    </div>
    {#if data.classInPage}
      <p class="browse-note">類別僅篩選本頁{#if data.term === 'all'}，可選擇單一學期縮小範圍{/if}。</p>
    {/if}
    {#if data.resultsError}
      <ErrorState title="暫時無法載入課表" retryHref={page.url.pathname + page.url.search + '#offerings'} />
    {:else if data.offerings.length}
      <div class="results-summary">
        {#if data.query || data.totalPages > 1 || data.classFilter}
          <p class="browse-note results-count">
            {#if data.totalPages > 1 && !data.classInPage}{displayValue(data.firstRow)}–{displayValue(data.firstRow + data.offerings.length - 1)}／{/if}{displayValue(data.classInPage ? data.offerings.length : data.matches)} 班{#if data.classInPage}符合本頁類別{/if}
          </p>
        {/if}
        {#if data.totalPages > 1}
          <div class="phone-pagination"><Pagination url={new URL('#offerings', page.url)} page={data.page} totalPages={data.totalPages} label="課表上方分頁" /></div>
        {/if}
        <p class="browse-note import-note">人數與名額為匯入時紀錄，即時名額請查校方。</p>
      </div>
      <SchoolsOfferingTable offerings={data.offerings} ratings={data.ratings} mode="department" caption={`${termLabel}開課班次`} showTerm={data.term === 'all'} />
    {:else}
      <EmptyState title={data.classInPage ? '本頁沒有此類別的班次' : data.query || data.classFilter ? '沒有符合條件的班次' : `${termLabel}沒有開課紀錄`} description={data.classInPage ? '可切換類別或查看其他頁。' : data.query ? '試試其他教師名、課名或課號。' : data.classFilter ? '可切換類別或學期。' : '可切換上方學期，查看這個開課單位的課表。'}>
        {#snippet action()}<a href={data.query || data.classFilter ? `${base}?term=${encodeURIComponent(data.term)}#offerings` : termHref('all')}>{data.query || data.classFilter ? '清除篩選' : '查看所有學期'}</a>{/snippet}
      </EmptyState>
    {/if}
    {#if !data.resultsError && data.totalPages > 1}
      <div class="table-footer">
        <Pagination url={new URL('#offerings', page.url)} page={data.page} totalPages={data.totalPages} label="課表分頁" />
        <a class="back-link" href="#offerings">↑ 回到課表篩選</a>
      </div>
    {/if}
  </section>

  <section class="browse-stack history" aria-labelledby="department-history">
    <SectionHeader title="歷年開課變化" id="department-history">
      {#snippet actions()}
        {#if data.website && isHttpUrl(data.website)}<a class="browse-button" href={data.website} rel="external">校方官網 ↗</a>{/if}
      {/snippet}
    </SectionHeader>
    {#if data.trends === null}
      <ErrorState title="暫時無法取得歷年開課統計" retryHref={page.url.pathname + page.url.search} />
    {:else}
      {#if historical.length > 3 || partial.size || missingEnrollment}
        <div class="history-legend">
          {#if historical.length > 3}<p class="browse-note"><span class="desktop-legend">學年以細線分隔，1、2 為上、下學期。</span><span class="phone-legend">細線分隔學年，同年各學期由左至右排列。</span></p>{/if}
          {#if partial.size}<p class="browse-note partial-legend"><span aria-hidden="true"></span>只收錄部分班次（推估）</p>{/if}
          {#if missingEnrollment}<p class="browse-note">修課人次空白：校方未公布</p>{/if}
        </div>
      {/if}
      <div class="history-charts">
        <TrendChart label="開課班次" unit="班" condensed termPairs yearTicks yearsOnly showPartialLegend={false} highlight={data.term} points={historical.map(({ term, offerings }) => ({ term, value: offerings, partial: partial.has(term) }))} termHref={termHref}>
          {#snippet header()}{#if selectedTrend && historical.length > 3}<p class="selected-value"><span aria-label={`所選學期 ${data.term}`}>{data.term}</span><strong>{displayValue(selectedTrend.offerings)} 班</strong></p>{/if}{/snippet}
        </TrendChart>
        <TrendChart label="已公布修課人次" unit="人次" condensed termPairs yearTicks yearsOnly showPartialLegend={false} highlight={data.term} points={historical.map(({ term, enrolled }) => ({ term, value: enrolled, partial: partial.has(term) }))} termHref={termHref}>
          {#snippet header()}{#if selectedTrend && historical.length > 3}<p class="selected-value"><span aria-label={`所選學期 ${data.term}`}>{data.term}</span><strong>{selectedTrend.enrolled == null ? '未公布' : `${displayValue(selectedTrend.enrolled)} 人次`}</strong></p>{/if}{/snippet}
        </TrendChart>
      </div>
      {#if historical.length > 3}
        <ChartValues label="歷年開課變化" summary="查看各學期數值與課表" columns={historicalColumns} rows={historical} rowKey={({ term }) => term} rowHref={({ term }) => termHref(term)} />
      {/if}
    {/if}
  </section>

  <a class="back-link" href="#department-top">↑ 回到頂端</a>
</div>

<style>
  .department-page, .department-page .browse-stack { gap: var(--space-2); }
  .department-page { margin-block-start: calc(-1 * var(--space-3)); }
  .department-page .browse-crumbs + .browse-head { margin-block-start: calc(-1 * var(--space-2)); }
  .department-page .browse-note { text-wrap: pretty; }
  .department-page .browse-head h1 { font-size: clamp(1.5rem, 4vw, 2rem); }
  .department-page :global(:is(#department-top, #offerings, #department-history)) { scroll-margin-block-start: 6.5rem; }
  .department-page .browse-head { gap: var(--space-2); }
  .history { margin-block-start: var(--space-4); padding-block-start: var(--space-4); border-block-start: 1px solid var(--line); }
  .timetable { margin-block-start: var(--space-1); }
  .history-charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-2); }
  .history-charts :global(figure) { padding: var(--space-2) var(--space-3); }
  .history-charts :global(figcaption) { margin-block-end: var(--space-2); }
  .history-charts :global(.plot svg) { block-size: 8rem; }
  .history-charts :global(.highlight) { fill: color-mix(in srgb, var(--brand) 18%, var(--brand-wash)); }
  .history-charts :global(.gridline) { stroke: color-mix(in srgb, var(--control-line) 55%, var(--line)); }
  .history-charts :global(.axis), .history-charts :global(.terms) { color: var(--ink-2); }
  .history-charts :global(.partial-bar) { fill: color-mix(in srgb, var(--series-1) 45%, var(--panel-raised)); stroke: none; }
  .history-charts :global(.partial-zero) { stroke: color-mix(in srgb, var(--series-1) 45%, var(--panel-raised)); }
  .history-charts :global(.period-values .partial) { border-inline-start-style: solid; border-inline-start-color: color-mix(in srgb, var(--series-1) 45%, var(--panel-raised)); }
  .history-charts :global(.period-values .partial > small) { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); }
  .history-charts :global(.chart-legend) { display: none; }
  .history-legend { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-3); }
  .phone-legend { display: none; }
  .partial-legend { display: flex; align-items: center; gap: var(--space-2); }
  .partial-legend span { inline-size: .9rem; block-size: .55rem; background: color-mix(in srgb, var(--series-1) 45%, var(--panel-raised)); border-radius: 2px; }
  .selected-value { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin-block-end: var(--space-3) !important; color: var(--brand-ink); font-variant-numeric: tabular-nums; }
  .selected-value span { padding: .1rem .35rem; border-radius: var(--radius-control); background: var(--brand-wash); font: 650 var(--t-sm) / 1.5 var(--font-mono); }
  .selected-value strong { font-size: var(--t-lg); }
  .results-summary { display: flex; align-items: baseline; flex-wrap: wrap; gap: var(--space-2); }
  .import-note:not(:first-child) { padding-inline-start: var(--space-2); border-inline-start: 1px solid var(--line); }
  .results-count { color: var(--ink-2); }
  .phone-pagination { display: none; }
  .table-footer, .timetable-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-1) var(--space-2); }
  .back-link { display: inline-grid; align-items: center; justify-self: start; min-block-size: var(--target-min); font-size: var(--t-base); }
  .search-options { min-inline-size: 0; }
  .search-options[open] { flex: 1 0 100%; }
  .search-options summary { width: fit-content; min-height: var(--target-min); align-content: center; padding-inline: var(--space-2); cursor: pointer; color: var(--brand-ink); font-size: var(--t-base); font-weight: 650; }
  .query-tag { margin-inline-start: .4rem; padding-inline: .35rem; border-radius: var(--radius-control); background: var(--brand-wash); overflow-wrap: anywhere; }
  .search-options[open] .query-tag { display: none; }
  .timetable-controls { display: flex; flex-wrap: wrap; align-items: end; gap: var(--space-2); padding: var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .timetable-options { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
  .timetable-options a { display: inline-flex; align-items: center; min-height: var(--target-min); }
  .term-links { display: flex; align-items: center; gap: .25rem; }
  .term-links a, .semester-links summary { flex: none; min-height: var(--target-min); align-content: center; border-radius: var(--radius-control); padding: 0 .625rem; background: var(--chip); color: var(--ink-2); font-size: var(--t-sm); text-decoration: none; }
  .term-links a[aria-current] { background: var(--brand-wash); color: var(--brand-ink); font-weight: 750; box-shadow: inset 0 -2px var(--brand); }
  .section-links a { min-inline-size: var(--target-min); color: var(--brand-ink); font-weight: 650; }
  .control-label { flex: none; margin-inline-end: var(--space-1); color: var(--ink-2); font-size: var(--t-sm); font-weight: 650; }
  .term-links a { display: inline-grid; align-items: center; font-variant-numeric: tabular-nums; }
  .term-links a:hover, .semester-links summary:hover { background: var(--brand-wash); }
  .semester-links { flex-wrap: wrap; }
  .all-terms { margin-inline-end: var(--space-1); padding-inline-end: var(--space-2); border-inline-end: 1px solid var(--line); }
  .semester-links details[open] { display: contents; }
  .semester-links summary { width: fit-content; color: var(--brand-ink); font-weight: 650; cursor: pointer; }
  .term-options { flex: 0 0 100%; display: flex; flex-wrap: wrap; gap: var(--space-1); margin: 0; padding: var(--space-2); list-style: none; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
  .timetable-search { display: grid; flex: 1 1 12rem; gap: .25rem; font-size: var(--t-sm); color: var(--ink-2); }
  .input-wrap { position: relative; }
  .search-icon { position: absolute; inset: 50% auto auto .8rem; translate: 0 -60%; inline-size: .7rem; block-size: .7rem; border: 1.5px solid var(--muted); border-radius: 50%; pointer-events: none; }
  .search-icon::after { position: absolute; content: ''; inset: 90% auto auto 82%; border-block-start: 1.5px solid var(--muted); inline-size: .36rem; rotate: 45deg; transform-origin: left; }
  .timetable-controls input[type='search'] { inline-size: 100%; min-inline-size: 0; min-height: var(--target-min); padding-inline: 2rem .5rem; border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--ink); font: inherit; font-size: 1rem; }
  input::placeholder { color: var(--muted); opacity: 1; }
  .distribution { display: grid; flex: 1 1 13rem; gap: .3rem; max-inline-size: 18rem; margin-inline-end: auto; margin-inline-start: var(--space-2); }
  .segments { display: flex; gap: 2px; height: .375rem; overflow: hidden; border-radius: var(--radius-pill); }
  .segments > span { flex-basis: 0; }
  .distribution ul { display: flex; flex-wrap: wrap; list-style: none; gap: .25rem .65rem; padding: 0; margin: 0; font-size: var(--t-sm); }
  .distribution li { display: flex; align-items: baseline; gap: .35rem; white-space: nowrap; }
  .distribution li span { display: inline-block; width: .55rem; height: .55rem; border-radius: 50%; }
  @media (max-width: 45rem) {
    .distribution { order: -1; flex-basis: 100%; max-inline-size: 100%; margin-inline: 0; }
    .history-charts { grid-template-columns: minmax(0, 1fr); }
    .phone-pagination { display: block; }
    .results-summary { align-items: center; justify-content: space-between; gap: var(--space-1) var(--space-2); }
    .results-summary .import-note { flex-basis: 100%; padding-inline-start: 0; border-inline-start: 0; }
    .history-charts :global(.plot) { column-gap: var(--space-1); }
    .history-charts :global(.semester-ticks) { display: none; }
    .desktop-legend { display: none; }
    .phone-legend { display: inline; }
    .term-links a, .semester-links summary { padding-inline: .5rem; }
    .class-links a { padding-inline: .45rem; }
    .search-options summary { padding-inline: .3rem; }
  }
</style>
