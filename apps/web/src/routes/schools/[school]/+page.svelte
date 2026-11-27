<script lang="ts">
  import { page } from '$app/state';
  import type { CourseRanking } from '@unicourse/api-client';
  import { importedAt, isHttpUrl, shortImportedAt } from '$lib/format';
  import { coveragePeriod, directoryStatus, directoryStatusLabels, kindLabel } from '$lib/institutions';
  import { departmentHref, overviewSearchHref, rankingHref, schoolHref } from '$lib/overview-paths';
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
  let searchHref = $derived(`/?${new URLSearchParams({ school: school.slug, term: 'all' })}`);
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
  let chartTerm = $derived(terms.at(-1));
  let termOptions = $derived((data.trends ?? []).slice().sort((left, right) => right.term.localeCompare(left.term)).map(({ term }) => ({ value: term, label: term })));
  let enrollmentTerms = $derived((data.trends ?? []).filter(({ enrolled }) => enrolled != null));
  let ranked = $derived((data.rankings ?? []).filter((row) => row.enrolledTotal != null));
  let capacities = $derived((data.rankings ?? []).filter((row) => row.enrolledTotal == null && row.capacityTotal != null));
  let hasDemoRankings = $derived(data.rankings?.some(({ isDemo }) => isDemo) ?? false);
  let busiest = $derived((data.trends ?? []).reduce<(typeof enrollmentTerms)[number] | undefined>((peak, row) => !peak || row.offerings > peak.offerings ? row : peak, undefined));
  let clearUnits = $derived(changeQuery(new URL('#departments', page.url), (params) => { params.delete('unit'); params.delete('page'); }));
  let maxEnrolled = $derived(Math.max(1, ...ranked.map((row) => row.enrolledTotal ?? 0)));
  const percent = new Intl.NumberFormat('zh-TW', { style: 'percent', maximumFractionDigits: 1 });

  const unitColumns: TableColumn<(typeof units.rows)[number]>[] = [
    { id: 'unit', label: '開課單位', value: (row) => row.name },
    { id: 'offerings', label: '班次', headerNote: '相對最大值', numeric: true, value: (row) => row.offerings, width: 'var(--unit-offerings-width, 8rem)' },
    { id: 'share', label: '全校占比', numeric: true, width: 'var(--unit-share-width, 5rem)' },
    { id: 'courses', label: '課程', numeric: true, value: (row) => row.courses, width: 'var(--unit-count-width, 4rem)' }
  ];
  const rankColumns: TableColumn<CourseRanking>[] = [
    { id: 'course', label: '課程', value: (row) => row.title, width: '38%' },
    { id: 'terms', label: '開課期數', numeric: true, value: (row) => row.terms, width: '5rem' },
    { id: 'offerings', label: '班次', numeric: true, value: (row) => row.offerings, width: '3.5rem' },
    { id: 'enrolled', label: '累計人次', numeric: true }
  ];
  const courseHref = (row: CourseRanking) => `/courses/${row.latestActiveOfferingId ?? row.latestOfferingId}`;
</script>

<svelte:head><title>{school.name}｜UniCourse</title></svelte:head>

{#snippet unitFilter()}
  <FilterBar action={`${schoolHref(school.slug)}#departments`} label="搜尋開課單位" clearHref={units.query ? clearUnits : undefined} hidden={data.includeNonAcademic ? { include_non_academic: 'true' } : {}}>
    <label class="browse-field">搜尋開課單位{#key units.query}<input name="unit" type="search" defaultValue={units.query} maxlength="100" placeholder="輸入開課單位名稱" />{/key}</label>
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
    <div class="browse-actions">
      <a class="browse-button browse-primary" href={searchHref}>搜尋這所學校的課程</a>
      {#if institution?.website && isHttpUrl(institution.website)}<a class="browse-button" href={institution.website} rel="external">官網 ↗</a>{/if}
    </div>
  </header>

  <nav class="browse-inline jump-links" aria-label="跳至本頁章節"><a href="#term-history">歷年收錄</a><a href="#departments">開課單位</a><a href="#ranking">校內排行</a></nav>

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
      {@const latest = terms.at(-1)}
      {@const current = latest ? trendsByTerm.get(latest) : undefined}
      {@const previous = terms.length > 1 ? trendsByTerm.get(terms[terms.length - 2]) : undefined}
      {#key current?.term}
      <SchoolsTermHistory label={`每學期開課班次${period ? ` · ${period}` : ''}`} points={terms.map((term) => ({ term, value: trendsByTerm.get(term)?.offerings ?? null, partial: partial.has(term) }))}
        termHref={(term) => overviewSearchHref({ school: school.slug, term })} kind={partial.size ? 'column' : 'line'} yearsOnly zeroBaseline highlight={chartTerm}>
        {#snippet header()}
          <div class="chart-header">
            <div>
              {#if current}
                <p class="browse-note">最新一期 <a class="latest-term" href={overviewSearchHref({ school: school.slug, term: current.term })}>{current.term} 學期 · {displayValue(current.offerings)} 班{partial.has(current.term) ? '（部分班次）' : ''}</a>{#if previous && !partial.has(current.term) && !partial.has(previous.term)}<span> · 較上期 {current.offerings === previous.offerings ? '持平' : `${current.offerings > previous.offerings ? '+' : '−'}${displayValue(Math.abs(current.offerings - previous.offerings))} 班`}</span>{/if}</p>
              {/if}
              {#if busiest}<p class="browse-note">最多班次 <strong>{busiest.term} · {displayValue(busiest.offerings)} 班</strong></p>{/if}
            </div>
          </div>
        {/snippet}
      </SchoolsTermHistory>
      {/key}
      {#if termOptions.length}
        <form class="term-lookup" action="/" method="GET" aria-label="依學期查本校課程" onchange={(event) => {
          const term = new FormData(event.currentTarget).get('term');
          if (typeof term === 'string') chartTerm = term;
        }}>
          <input type="hidden" name="school" value={school.slug} />
          <FilterSelect name="term" label="查課學期" allLabel={null} value={chartTerm} options={termOptions} />
          <button class="browse-button">查本校該期課程</button>
        </form>
      {/if}
    {:else}
      <EmptyState title="目前沒有班次走勢" description="待有開課班次後，這裡會顯示各學期的變化。" />
    {/if}
    {#if hasDemoRankings}<p class="browse-note">統計及排行包含示範班次。</p>{/if}
  </section>
  <div class="school-details">
    <section class="browse-stack unit-section" aria-labelledby="departments">
      <SectionHeader title="開課單位（{displayValue(units.total)}）" id="departments" description="歷年合計，課程依課號去重。" />
      {#if units.total}<div class="unit-filter">{@render unitFilter()}</div>{/if}
      {#if units.rows.length}
        <div class="term-tools"><p class="browse-note">共 {displayValue(units.matched)} 個單位 · 顯示 {displayValue(units.start)}–{displayValue(units.start + units.rows.length - 1)} 個</p>
          <Pagination url={new URL('#departments', page.url)} page={units.page} totalPages={units.totalPages} label="開課單位上方分頁" />
        </div>
        <DataTable caption="開課單位歷年班次與課程" columns={unitColumns} rows={units.rows} rowKey={(row) => row.name} rowHref={(row) => departmentHref(school.slug, row.name)} minWidth="100%" maxHeight="none" scrollHint={false}>
          {#snippet cell(row, column)}
            {#if column.id === 'offerings'}<div class="unit-total"><BarCell value={row.offerings} max={units.max} /></div>
            {:else if column.id === 'share'}{percent.format(row.offerings / Math.max(1, school.offerings))}
            {:else}{displayValue(column.value?.(row))}{/if}
          {/snippet}
        </DataTable>
        <Pagination url={new URL('#departments', page.url)} page={units.page} totalPages={units.totalPages} label="開課單位分頁" />
      {:else}
        <EmptyState title={units.query ? '沒有符合條件的開課單位' : '目前沒有開課單位'} description={units.query ? '換個關鍵字試試。' : '待資料匯入後，這裡會顯示各單位。'} />
      {/if}
    </section>

    <section class="browse-stack" aria-labelledby="ranking">
      <SectionHeader title="歷年累計修課人次排行" id="ranking" description={`跨學期加總已公布的修課人次（不去重）；${data.includeNonAcademic ? '含' : '不含'}零學分及行政活動。`} />
      <form method="GET" action={`${schoolHref(school.slug)}#ranking`}>
        {#if units.query}<input type="hidden" name="unit" value={units.query} />{/if}
        {#if units.sort !== 'offerings'}<input type="hidden" name="unit_sort" value={units.sort} />{/if}
        {#if units.page > 1}<input type="hidden" name="page" value={units.page} />{/if}
        <label class="rank-toggle"><input type="checkbox" name="include_non_academic" value="true" checked={data.includeNonAcademic} onchange={(event) => event.currentTarget.form?.requestSubmit()} /> 納入零學分及行政活動</label>
        <noscript><button class="browse-button">套用</button></noscript>
      </form>
      {#if data.rankings === null}
        <ErrorState title="暫時無法取得校內排行" retryHref={page.url.pathname + page.url.search} />
      {:else}
        {#if ranked.length}
          <div class="desktop-rank"><DataTable caption="校內累計修課人次排行" columns={rankColumns} rows={ranked} rowKey={(row) => row.courseCode} rowHref={courseHref} stickyColumn="course" minWidth="20rem" maxHeight="none" scrollHint={false}>
            {#snippet cell(row, column)}
              {#if column.id === 'course'}
                <span class="browse-course-cell">
                  <span>{ranked.indexOf(row) + 1}. {row.title}</span><span class="browse-code">{row.courseCode}</span>
                  {#if row.isDemo}<Badge label="示範" tone="demo" />{/if}
                </span>
              {:else if column.id === 'enrolled'}
                <BarCell value={row.enrolledTotal ?? null} max={maxEnrolled} />
              {:else}{displayValue(column.value?.(row))}{/if}
            {/snippet}
          </DataTable></div>
          <div class="mobile-rank">
            <ol aria-label="校內累計修課人次排行" role="list">
              {#each ranked as row, index (row.courseCode)}
                <li>
                  <a href={courseHref(row)}>{index + 1}. {row.title}</a>
                  <div class="rank-measures">
                    <p class="browse-note">{displayValue(row.terms)} 期 · {displayValue(row.offerings)} 班 {#if row.isDemo}<Badge label="示範" tone="demo" />{/if}</p>
                    <div class="rank-total"><BarCell value={row.enrolledTotal ?? null} max={maxEnrolled} unit="人次" /></div>
                  </div>
                </li>
              {/each}
            </ol>
          </div>
          <SchoolsRankingTrend courses={ranked} />
        {:else}
          <EmptyState title="尚無可排名的修課人數" description="未公布的人數不列入排行，也不視為 0。" />
        {/if}
        {#if capacities.length}
          <details class="browse-stack capacity-details">
            <summary>另有 {capacities.length} 門公布名額的課</summary>
            <BarList label="累計名額（不列入人次排行）" unit="名" items={capacities.map((row) => ({ label: row.title, value: row.capacityTotal ?? null, href: courseHref(row) }))} />
          </details>
        {/if}
        <a class="browse-button" href={rankingHref(school.slug, true, data.includeNonAcademic)}>查看校內前 50 門 →</a>
      {/if}
    </section>
  </div>
  <a class="back-to-top" href="#school-top">回到頂端 ↑</a>
</div>

<style>
  .school-page h1 { font-size: var(--t-2xl); font-weight: 650; }
  .school-page { gap: var(--space-3); }
  .school-page .browse-crumbs + .browse-head { margin-block-start: calc(-1 * var(--space-2)); }
  .unit-section { --bar-cell-track-size: 8rem; }
  .school-page :global(#term-history) { margin-block-start: var(--space-5); }
  .school-page :global(:is(#term-history, #departments, #ranking)), #school-top { scroll-margin-block-start: 6.25rem; }
  .school-page .browse-note { text-wrap: pretty; }
  .browse-field input::placeholder { color: var(--muted); opacity: 1; }
  .unit-total :global(.bar-cell) { display: grid; grid-template-columns: minmax(0, 1fr) 6ch; }
  .term-tools, .chart-header, .term-lookup { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
  .term-lookup { align-items: end; }
  .unit-section :global(td), .unit-section :global(th) { padding-inline: var(--unit-table-gutter, .625rem); }
  .term-tools { justify-content: space-between; }
  .chart-header { margin-block-end: var(--space-2); }
  .school-page .browse-compact-stats :global(.tile > p) { font-size: .8125rem; }
  .jump-links { gap: var(--space-2); }
  .jump-links a { min-block-size: var(--target-min); align-content: center; padding-inline: var(--space-3); border-radius: var(--radius-pill); background: var(--chip); text-decoration: none; font-size: var(--t-base); font-weight: 650; }
  .back-to-top { justify-self: start; align-content: center; min-block-size: var(--target-min); font-size: var(--t-base); }
  .jump-links a:hover { text-decoration: underline; }
  .edition { white-space: nowrap; }
  .rank-toggle { display: inline-flex; gap: var(--space-2); align-items: center; min-block-size: var(--target-min); cursor: pointer; }
  .mobile-rank { display: none; }
  .desktop-rank { --bar-cell-track-size: clamp(2rem, 4vw, 4rem); }
  .desktop-rank :global(.bar-cell) { display: grid; justify-content: end; grid-template-columns: minmax(0, var(--bar-cell-track-size)) minmax(7ch, max-content); }
  .school-details { display: grid; gap: var(--space-4); align-items: start; }
  .capacity-details summary { width: fit-content; min-height: var(--target-min); align-content: center; color: var(--brand-ink); cursor: pointer; }
  @media (min-width: 67rem) {
    .school-details { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
    .desktop-rank :global(table) { table-layout: fixed; }
  }
  @media (min-width: 67rem) and (pointer: fine) {
    .unit-section :global(.row-link) { min-block-size: 2rem; }
  }
  .browse-button { justify-self: start; }
  @media (max-width: 40rem) {
    .desktop-rank { display: none; }
    .unit-section { --unit-offerings-width: 6.75rem; --unit-share-width: 3.75rem; --unit-count-width: 2.75rem; --unit-table-gutter: .35rem; }
    .unit-section :global(thead th) { white-space: normal; }
    .unit-total :global(.bar-cell) { gap: var(--space-1); grid-template-columns: minmax(0, 1fr) 5ch; }
    .unit-filter :global(form) { display: grid; grid-template-columns: minmax(0, 1fr) auto; }
    .unit-filter .browse-field { grid-column: 1 / -1; }
    .unit-filter :global(.actions) { display: contents; }
    .unit-filter :global(.actions button) { padding-inline: var(--space-2); }
    .unit-filter :global(.actions a) { grid-column: 1 / -1; justify-self: start; }
    .mobile-rank { display: block; }
    .mobile-rank ol { list-style: none; padding: 0; margin: 0; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
    .mobile-rank li { padding: 0 var(--space-3) var(--space-2); }
    .mobile-rank li + li { border-block-start: 1px solid var(--line); }
    .mobile-rank li a { display: flex; align-items: center; min-block-size: var(--target-min); font-weight: 650; }
    .rank-measures { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.75fr); align-items: center; gap: var(--space-1) var(--space-3); }
    .rank-total :global(.bar-cell) { display: grid; grid-template-columns: minmax(0, 1fr) max-content; font-size: var(--t-sm); }
    .rank-total :global(.track) { block-size: 5px; }
  }
</style>
