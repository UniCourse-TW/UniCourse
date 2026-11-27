<script lang="ts">
  import { navigating, page } from '$app/state';
  import type { CourseRanking } from '@unicourse/api-client';
  import { importedAt, isHttpUrl, shortImportedAt } from '$lib/format';
  import { coveragePeriod, directoryStatus, directoryStatusLabels, kindLabel } from '$lib/institutions';
  import { departmentHref, overviewSearchHref, rankingHref, schoolHref } from '$lib/overview-paths';
  import SectionLinks from '$lib/schools-section-links.svelte';
  import SchoolsRankingTrend from '$lib/schools-ranking-trend.svelte';
  import SchoolsTermHistory from '$lib/schools-term-history.svelte';
  import Badge from '$lib/ui/Badge.svelte';
  import BarCell from '$lib/ui/BarCell.svelte';
  import BarList from '$lib/ui/BarList.svelte';
  import DataTable from '$lib/ui/DataTable.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import ErrorState from '$lib/ui/ErrorState.svelte';
  import FilterBar from '$lib/ui/FilterBar.svelte';
  import FilterSelect from '$lib/ui/FilterSelect.svelte';
  import Pagination from '$lib/ui/Pagination.svelte';
  import SectionHeader from '$lib/ui/SectionHeader.svelte';
  import StatRow from '$lib/ui/StatRow.svelte';
  import StatTile from '$lib/ui/StatTile.svelte';
  import StatusPill from '$lib/ui/StatusPill.svelte';
  import { changeQuery, displayValue } from '$lib/ui/format';
  import { partialTerms } from '$lib/ui/partial-terms';
  import type { TableColumn } from '$lib/ui/types';
  import '$lib/schools-browse.css';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let school = $derived(data.school);
  let institution = $derived(data.institution);
  let status = $derived(institution ? directoryStatus(institution) : null);
  let units = $derived(data.units);
  let coverageTerms = $derived(institution?.terms ?? school.terms);
  let period = $derived(coveragePeriod(coverageTerms));
  let terms = $derived.by(() => {
    const observed = new Set([...coverageTerms, ...(data.trends ?? []).map(({ term }) => term)]);
    const ordered = [...observed].sort();
    if (!ordered.length) return ordered;
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    for (let year = Number(first.split('-')[0]); year <= Number(last.split('-')[0]); year += 1) {
      for (const semester of [1, 2]) {
        const term = `${String(year).padStart(3, '0')}-${semester}`;
        if (term > first && term < last) observed.add(term);
      }
    }
    return [...observed].sort();
  });
  let trendsByTerm = $derived(new Map(data.trends?.map((row) => [row.term, row])));
  let partial = $derived(partialTerms((data.trends ?? []).map(({ term, offerings }) => [term, offerings])));
  let latestChartTerm = $derived((data.trends ?? []).reduce<string | undefined>(
    (latest, { term }) => !latest || term > latest ? term : latest, undefined
  ));
  let termOptions = $derived([...coverageTerms].sort((left, right) => right.localeCompare(left, 'zh-TW', { numeric: true }))
    .map((term) => ({ value: term, label: `${term} 學期` })));
  const sections = [
    { id: 'term-history', label: '歷年收錄' },
    { id: 'departments', label: '開課單位' },
    { id: 'ranking', label: '校內排行' }
  ];
  type RankedCourse = NonNullable<PageProps['data']['rankings']>[number];
  let enrollmentTerms = $derived((data.trends ?? []).filter(({ enrolled }) => enrolled != null));
  let ranked = $derived(data.rankings ?? []);
  const phonePreview = 5;
  let hasDemoRankings = $derived(data.rankings?.some(({ isDemo }) => isDemo) ?? false);
  let busiest = $derived((data.trends ?? []).reduce<(typeof enrollmentTerms)[number] | undefined>((peak, row) => !peak || row.offerings > peak.offerings ? row : peak, undefined));
  let clearUnits = $derived(changeQuery(new URL('#departments', page.url), (params) => { params.delete('unit'); params.delete('page'); }));
  let maxEnrolled = $derived(Math.max(1, ...ranked.map((row) => row.enrolledTotal ?? 0)));

  const unitColumns: TableColumn<(typeof units.rows)[number]>[] = [
    { id: 'unit', label: '開課單位', value: (row) => row.name },
    { id: 'offerings', label: '班次', numeric: true, value: (row) => row.offerings, width: 'var(--unit-offerings-width, 8rem)' },
    { id: 'courses', label: '課程', numeric: true, value: (row) => row.courses, width: 'var(--unit-count-width, 4rem)' }
  ];
  const rankColumns: TableColumn<RankedCourse>[] = [
    { id: 'rank', label: '#', width: '2rem', align: 'center' },
    { id: 'course', label: '課程', value: (row) => row.title },
    { id: 'latest', label: '最近收錄', width: '4.5rem' },
    { id: 'terms', label: '期數', numeric: true, value: (row) => row.terms, width: '3.5rem' },
    { id: 'offerings', label: '班次', numeric: true, value: (row) => row.offerings, width: '3.5rem' },
    { id: 'enrolled', label: '累計人次', numeric: true, width: '8.5rem' }
  ];
  const courseHref = (row: CourseRanking) => `/courses/${row.latestActiveOfferingId ?? row.latestOfferingId}`;
</script>

{#snippet rankItem(row: RankedCourse, index: number)}
  <li>
    <span class="rank-index" aria-label={`第 ${index + 1} 名`}>{index + 1}</span>
    <a href={courseHref(row)}>{row.title}</a>
    <div class="rank-measures">
      <p class="browse-note"><span class:recent={row.recent}>最近 {row.lastOffered ?? '—'}</span> · {displayValue(row.terms)} 期 · {displayValue(row.offerings)} 班 {#if row.isDemo}<Badge label="示範" tone="demo" />{/if}</p>
      <div class="rank-total"><BarCell value={row.enrolledTotal ?? null} max={maxEnrolled} unit="人次" /></div>
    </div>
  </li>
{/snippet}

<svelte:head><title>{school.name}｜UniCourse</title></svelte:head>

{#snippet unitFilter()}
  <FilterBar action={`${schoolHref(school.slug)}#departments`} label={`搜尋${school.name}的開課單位`} clearHref={units.query ? clearUnits : undefined} hidden={data.includeNonAcademic ? { include_non_academic: 'true' } : {}}>
    <label class="browse-field">搜尋開課單位{#key units.query}<input name="unit" type="search" defaultValue={units.query} maxlength="100" placeholder="例如 資訊、通識、教務" />{/key}</label>
    <FilterSelect name="unit_sort" label="排序" allLabel={null} value={units.sort} options={[{ value: 'offerings', label: '班次最多' }, { value: 'courses', label: '課程最多' }, { value: 'name', label: '名稱' }]} />
  </FilterBar>
{/snippet}

<div class="browse-page school-page" id="school-top">
  <nav class="browse-crumbs" aria-label="所在位置"><a href="/">查課</a><span aria-hidden="true">/</span><a href="/schools">學校</a><span aria-hidden="true">/</span><span aria-current="page">{school.name}</span></nav>
  <header class="browse-head">
    <div class="browse-stack">
      <h1>{school.name}</h1>
      <p class="browse-dek">
        {#if school.nameEn}<span lang="en">{school.nameEn}</span>{/if}
        {#if institution?.city}<span>{institution.city} · {kindLabel(institution)}</span>{:else if institution}<span>{kindLabel(institution)}</span>{/if}
        {#if status}<StatusPill status={status === 'pending_import' ? 'planned' : status} label={directoryStatusLabels[status]} />{/if}
        {#if institution?.latestImportedAt}<span class="edition">匯入 <time datetime={institution.latestImportedAt} title={`${importedAt(institution.latestImportedAt)}（臺北時間）`}>{shortImportedAt(institution.latestImportedAt)}</time>（臺北時間）</span>{/if}
      </p>
      {#if institution?.note && institution.note !== '每日更新'}<p class="browse-note">{institution.note}</p>{/if}
    </div>
    <div class="school-actions">
      <form class="term-lookup" action="/" method="GET" aria-label="查本校課程">
        <input type="hidden" name="school" value={school.slug} />
        <FilterSelect name="term" label="查課學期" allLabel={null} value="all" options={[{ value: 'all', label: '所有收錄學期' }, ...termOptions]} />
        <button class="browse-button browse-primary">查本校課程</button>
        {#if institution?.website && isHttpUrl(institution.website)}<a class="browse-button" href={institution.website} rel="external">官網 ↗</a>{/if}
      </form>
    </div>
  </header>

  <SectionLinks {sections} />

  <div class="browse-compact-stats"><StatRow label="收錄概況">
    <StatTile label="開課班次" value={institution?.offerings ?? school.offerings} unit="班" />
    <StatTile label="課程" value={institution?.courses ?? school.courses} unit="門" />
    <StatTile label="已收錄學期" value={coverageTerms.length} unit="期" />
    <StatTile label="開課單位" value={units.total} unit="個" />
    <div class="browse-wide-stat"><StatTile label="累計修課" value={enrollmentTerms.length ? enrollmentTerms.reduce((sum, term) => sum + (term.enrolled ?? 0), 0) : null}
      unit="人次" note={enrollmentTerms.length ? `${coveragePeriod(enrollmentTerms.map(({ term }) => term))} · 僅計已公布` : data.trends === null ? '統計暫未取得' : '未公布人數'} /></div>
  </StatRow></div>

  <section class="browse-stack" aria-labelledby="term-history">
    <SectionHeader title="歷年收錄" id="term-history" />
    {#if data.trends === null}
      <ErrorState title="暫時無法取得班次走勢" retryHref={page.url.pathname + page.url.search} />
    {:else if data.trends.length}
      {@const current = latestChartTerm ? trendsByTerm.get(latestChartTerm) : undefined}
      {@const previous = current ? trendsByTerm.get(terms[terms.indexOf(current.term) - 1]) : undefined}
      <SchoolsTermHistory label={`每學期開課班次${period ? ` · ${period}` : ''}`} points={terms.map((term) => ({ term, value: trendsByTerm.get(term)?.offerings ?? null, partial: partial.has(term) }))}
        termHref={(term) => overviewSearchHref({ school: school.slug, term })} kind={partial.size ? 'column' : 'line'} yearsOnly zeroBaseline highlight={latestChartTerm} peak={busiest?.term} conciseSchoolPlot>
        {#snippet header()}
          <div class="chart-header">
            <div>
              {#if current}
                <p class="browse-note">最新收錄 <a class="latest-term" href={overviewSearchHref({ school: school.slug, term: current.term })}>{current.term} 學期 · {displayValue(current.offerings)} 班{partial.has(current.term) ? '（部分班次）' : ''}</a>{#if previous && !partial.has(current.term) && !partial.has(previous.term)}<span> · 較上期 {current.offerings === previous.offerings ? '持平' : `${current.offerings > previous.offerings ? '+' : '−'}${displayValue(Math.abs(current.offerings - previous.offerings))} 班`}</span>{/if}</p>
              {/if}
              {#if busiest && busiest.term !== current?.term}<p class="browse-note">高點 <strong>{busiest.term} 學期 · {displayValue(busiest.offerings)} 班</strong></p>{/if}
            </div>
          </div>
        {/snippet}
      </SchoolsTermHistory>
    {:else}
      <EmptyState title="目前沒有班次走勢" description="待有開課班次後，這裡會顯示各學期的變化。" />
    {/if}
    {#if hasDemoRankings}<p class="browse-note">統計及排行包含示範班次。</p>{/if}
  </section>
  <div class="school-details">
    <section class="browse-stack unit-section" aria-labelledby="departments">
      <SectionHeader title="開課單位（{displayValue(units.total)}）" id="departments" description={`歷年合計，課程依課號去重。${units.max ? `班次條滿格為 ${displayValue(units.max)} 班。` : ""}`} />
      {#if units.total}<div class="unit-filter">{@render unitFilter()}</div>{/if}
      {#if units.rows.length}
        <div class="term-tools"><p class="browse-note">共 {displayValue(units.matched)} 個單位 · 顯示 {displayValue(units.start)}–{displayValue(units.start + units.rows.length - 1)} 個</p>
          <Pagination url={new URL('#departments', page.url)} page={units.page} totalPages={units.totalPages} label="開課單位上方分頁" />
        </div>
        <DataTable caption="開課單位歷年班次與課程" columns={unitColumns} rows={units.rows} rowKey={(row) => row.name} rowHref={(row) => departmentHref(school.slug, row.name)} minWidth="100%" maxHeight="none" scrollHint={false}>
          {#snippet cell(row, column)}
            {#if column.id === 'offerings'}<div class="unit-total"><BarCell value={row.offerings} max={units.max} /></div>
            {:else}{displayValue(column.value?.(row))}{/if}
          {/snippet}
        </DataTable>
        <Pagination url={new URL('#departments', page.url)} page={units.page} totalPages={units.totalPages} label="開課單位分頁" />
      {:else}
        <EmptyState title={units.query ? '沒有符合條件的開課單位' : '目前沒有開課單位'} description={units.query ? '換個關鍵字試試。' : '待資料匯入後，這裡會顯示各單位。'} />
      {/if}
    </section>

    <section class="browse-stack" aria-labelledby="ranking">
      <SectionHeader title="歷年累計修課人次排行" id="ranking" description={`${period ?? '歷年'}公布人次加總。${data.recentTerms.length ? '近四學期有收錄者優先，再依累計人次排序。' : '依累計人次排序。'}${ranked.length ? `滿格為 ${displayValue(maxEnrolled)} 人次。` : ''}`} />
      <form method="GET" action={`${schoolHref(school.slug)}#ranking`}>
        {#if units.query}<input type="hidden" name="unit" value={units.query} />{/if}
        {#if units.sort !== 'offerings'}<input type="hidden" name="unit_sort" value={units.sort} />{/if}
        {#if units.page > 1}<input type="hidden" name="page" value={units.page} />{/if}
        <label class="rank-toggle"><input type="checkbox" name="include_non_academic" value="true" checked={data.includeNonAcademic} onchange={(event) => event.currentTarget.form?.requestSubmit()} /> 納入零學分及行政活動</label>
        {#if navigating.to?.url.hash === '#ranking'}<span class="browse-note" role="status">更新排行中…</span>{/if}
        <noscript><button class="browse-button">套用</button></noscript>
      </form>
      {#if data.rankings === null}
        <ErrorState title="暫時無法取得校內排行" retryHref={page.url.pathname + page.url.search} />
      {:else}
        {#if ranked.length}
          <div class="desktop-rank"><DataTable caption="校內累計修課人次排行" columns={rankColumns} rows={ranked} rowKey={(row) => row.courseCode} rowHref={courseHref} rowHeaderColumn="course" minWidth="20rem" maxHeight="none" scrollHint={false}>
            {#snippet cell(row, column)}
              {#if column.id === 'rank'}
                <span class="rank-index">{ranked.indexOf(row) + 1}</span>
              {:else if column.id === 'course'}
                <span class="browse-course-cell">
                  <span>{row.title}</span><span class="browse-code">{row.courseCode}</span>
                  {#if row.isDemo}<Badge label="示範" tone="demo" />{/if}
                </span>
              {:else if column.id === 'latest'}
                <span class="browse-code" class:older={data.recentTerms.length > 0 && !row.recent}>{row.lastOffered ?? '—'}</span>
              {:else if column.id === 'enrolled'}
                <BarCell value={row.enrolledTotal ?? null} max={maxEnrolled} />
              {:else}{displayValue(column.value?.(row))}{/if}
            {/snippet}
          </DataTable></div>
          <div class="mobile-rank">
            <ol aria-label="校內累計修課人次排行" role="list">
              {#each ranked.slice(0, phonePreview) as row, index (row.courseCode)}{@render rankItem(row, index)}{/each}
            </ol>
            {#if ranked.length > phonePreview}
              <details class="capacity-details">
                <summary>再顯示 {ranked.length - phonePreview} 門</summary>
                <ol start={phonePreview + 1} role="list">
                  {#each ranked.slice(phonePreview) as row, index (row.courseCode)}{@render rankItem(row, index + phonePreview)}{/each}
                </ol>
              </details>
            {/if}
          </div>
        {:else}
          <EmptyState title="尚無可排名的修課人數" description="未公布的人數不列入排行，也不視為 0。" />
        {/if}
        {#if data.capacities.length}
          <details class="browse-stack capacity-details">
            <summary>另有 {data.capacities.length} 門公布名額的課</summary>
            <BarList label="累計名額（不列入人次排行）" unit="名" items={data.capacities.map((row) => ({ label: row.title, value: row.capacityTotal ?? null, href: courseHref(row) }))} />
          </details>
        {/if}
        <div class="browse-inline ranking-footer">
          <a class="browse-button" href={rankingHref(school.slug, true, data.includeNonAcademic)}>查看校內歷年累計前 50 門 →</a>
          <SchoolsRankingTrend courses={ranked} />
        </div>
      {/if}
    </section>
  </div>
  <a class="back-to-top" href="#school-top">回到頂端 ↑</a>
</div>

<style>
  .school-page h1 { font-size: var(--t-2xl); font-weight: 650; }
  .school-page { gap: var(--space-3); --section-jump-top: calc(3.75rem + 1px); }
  .school-page .browse-crumbs + .browse-head { margin-block-start: calc(-1 * var(--space-2)); }
  .unit-section { --bar-cell-track-size: 8rem; }
  .school-page :global(#term-history) { margin-block-start: var(--space-5); }
  .school-page :global(:is(#term-history, #departments, #ranking)), #school-top { scroll-margin-block-start: calc(var(--target-min) + var(--space-2) - 0.75rem); }
  .school-page .browse-note { text-wrap: pretty; }
  .browse-field input::placeholder { color: var(--muted); opacity: 1; }
  .unit-total :global(.bar-cell) { display: grid; grid-template-columns: minmax(0, 1fr) 6ch; }
  .term-tools, .chart-header, .term-lookup { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
  .term-lookup { align-items: end; }
  .term-lookup button { cursor: pointer; font-family: inherit; }
  .school-page { --t-sm: .8125rem; --t-xs: .8125rem; }
  .browse-crumbs a, .back-to-top { min-inline-size: var(--target-min); justify-content: center; }
  .unit-section :global(tbody tr), .mobile-rank li { position: relative; }
  .unit-section :global(.row-link::after), .mobile-rank li a::after {
    content: ''; position: absolute; inset: 0;
  }
  .unit-section :global(tr:focus-within), .mobile-rank li:focus-within { background: var(--hover-row); }
  .rank-measures .recent, .desktop-rank .browse-code:not(.older) { color: var(--ink); font-weight: 650; }
  .unit-section :global(td), .unit-section :global(th) { padding-inline: var(--unit-table-gutter, .625rem); }
  .term-tools { justify-content: space-between; }
  .chart-header { margin-block-end: var(--space-2); }
  .school-page .browse-compact-stats :global(.tile > p) { font-size: .8125rem; }
  .back-to-top { justify-self: start; align-content: center; min-block-size: var(--target-min); font-size: var(--t-base); }
  .edition { white-space: nowrap; }
  .rank-toggle { display: inline-flex; padding-inline: var(--space-2); border: 1px solid var(--control-line); border-radius: var(--radius-control); gap: var(--space-2); align-items: center; min-block-size: var(--target-min); cursor: pointer; }
  .rank-toggle input { inline-size: 1rem; block-size: 1rem; margin: 0; accent-color: var(--brand); }
  .rank-toggle:has(input:focus-visible) { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .rank-index { display: grid; place-items: center; font: var(--t-sm) var(--font-mono); color: var(--muted); }
  .desktop-rank :global(:is(td, th):first-child) { padding-inline: 0; }
  .desktop-rank :global(.browse-course-cell) { display: block; line-height: 1.35; padding-block: .2rem; }
  .desktop-rank .browse-course-cell .browse-code { display: inline-block; margin-inline-start: .35em; font-size: var(--t-xs); }
  .ranking-footer { align-items: start; gap: var(--space-1) var(--space-3); }
  .mobile-rank { display: none; }
  .desktop-rank { --bar-cell-track-size: clamp(2rem, 4vw, 4rem); }
  .desktop-rank :global(.bar-cell) { display: grid; justify-content: end; grid-template-columns: minmax(0, var(--bar-cell-track-size)) minmax(7ch, max-content); }
  .school-details :global(.fill) { min-inline-size: 3px; }
  .school-details { display: grid; gap: var(--space-4); align-items: start; }
  .capacity-details summary { width: fit-content; min-height: var(--target-min); align-content: center; color: var(--brand-ink); cursor: pointer; }
  @media (min-width: 67rem) {
    .school-details { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
    .school-details :global(caption) {
      position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%);
    }
    .desktop-rank :global(table) { table-layout: fixed; }
    .desktop-rank :global(td), .desktop-rank :global(tbody th) { padding-block: .2rem; }
  }
  @media (min-width: 67rem) and (pointer: fine) {
    .school-details :global(.row-link) { min-block-size: 2rem; }
  }
  .browse-button { justify-self: start; }
  @media (max-width: 40rem) {
    .desktop-rank { display: none; }
    .school-details > section:last-child { gap: var(--space-2); }
    .unit-section :global(.row-link) { min-inline-size: var(--target-min); }
    .term-lookup { column-gap: var(--space-1); }
    .term-lookup .browse-button { padding-inline: var(--space-2); }
    .unit-section { --unit-offerings-width: 6.75rem; --unit-count-width: 2.75rem; --unit-table-gutter: .35rem; }
    .unit-section :global(thead th) { white-space: normal; }
    .unit-total :global(.bar-cell) { gap: var(--space-1); grid-template-columns: minmax(0, 1fr) 5ch; }
    .unit-filter :global(form) { display: grid; grid-template-columns: minmax(0, 1fr) auto; }
    .unit-filter .browse-field { grid-column: 1 / -1; }
    .unit-filter :global(.actions) { display: contents; }
    .unit-filter :global(.actions button) { padding-inline: var(--space-2); }
    .unit-filter :global(.actions a) { grid-column: 1 / -1; justify-self: start; }
    .mobile-rank { display: block; }
    .mobile-rank ol { list-style: none; padding: 0; margin: 0; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
    .mobile-rank li { display: grid; grid-template-columns: 1.75rem minmax(0, 1fr); align-items: center; column-gap: var(--space-2); padding: 0 var(--space-2) var(--space-1); }
    .mobile-rank .rank-index { grid-row: 1; min-block-size: 1.75rem; border-radius: var(--radius-control); background: var(--chip); }
    .mobile-rank li + li { border-block-start: 1px solid var(--line); }
    .mobile-rank li a { display: flex; align-items: center; min-block-size: var(--target-min); font-weight: 650; }
    .rank-measures { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(0, 1fr) minmax(5.5rem, max-content); align-items: center; gap: var(--space-1) var(--space-3); }
    .rank-measures p { font-size: var(--t-sm); }
    .rank-total { inline-size: 8rem; }
    .rank-total :global(.bar-cell) { display: grid; grid-template-columns: minmax(0, 1fr) max-content; font-size: var(--t-sm); }
    .rank-total :global(.track) { block-size: 5px; }
  }
  @media (max-width: 39rem) { .school-page { --section-jump-top: calc(2 * var(--target-min) + var(--space-1) + 1px); } }
</style>
