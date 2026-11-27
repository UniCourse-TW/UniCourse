<script lang="ts">
  import { page } from '$app/state';
  import type { CourseRanking } from '@unicourse/api-client';
  import { importedAt, isHttpUrl } from '$lib/format';
  import { coveragePeriod, directoryStatus, directoryStatusLabels, kindLabel } from '$lib/institutions';
  import { departmentHref, overviewSearchHref, rankingHref, schoolHref } from '$lib/overview-paths';
  import OverviewRankingTrend, { rankingTrendCaption } from '$lib/overview-ranking-trend.svelte';
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
  let terms = $derived([...new Set([...coverageTerms, ...(data.trends ?? []).map(({ term }) => term)])].sort());
  let trendsByTerm = $derived(new Map(data.trends?.map((row) => [row.term, row])));
  let enrollmentTerms = $derived((data.trends ?? []).filter(({ enrolled }) => enrolled != null));
  let ranked = $derived((data.rankings ?? []).filter((row) => row.enrolledTotal != null));
  let capacities = $derived((data.rankings ?? []).filter((row) => row.enrolledTotal == null && row.capacityTotal != null));
  let hasDemoRankings = $derived(data.rankings?.some(({ isDemo }) => isDemo) ?? false);
  let trendTerms = $derived(terms.slice(-10));
  let trendCaption = $derived(rankingTrendCaption(trendTerms));
  let clearUnits = $derived(changeQuery(new URL('#departments', page.url), (params) => { params.delete('unit'); params.delete('page'); }));
  let maxEnrolled = $derived(Math.max(1, ...ranked.map((row) => row.enrolledTotal ?? 0)));
  let maxTrend = $derived(Math.max(1, ...ranked.flatMap((row) => row.trend.filter(({ term }) => trendTerms.includes(term)).map(({ enrolled }) => enrolled ?? 0))));
  const shortDate = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });

  function shortImportedAt(value: string) {
    const parts = Object.fromEntries(shortDate.formatToParts(new Date(value)).map(({ type, value }) => [type, value]));
    return `${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
  }

  const unitColumns: TableColumn<(typeof units.rows)[number]>[] = [
    { id: 'unit', label: '開課單位', value: (row) => row.name },
    { id: 'offerings', label: '班次', numeric: true, value: (row) => row.offerings, width: '7rem' },
    { id: 'courses', label: '課程', numeric: true, value: (row) => row.courses, width: '4rem' }
  ];
  const rankColumns: TableColumn<CourseRanking>[] = [
    { id: 'course', label: '課程', value: (row) => row.title },
    { id: 'terms', label: '學期', numeric: true, value: (row) => row.terms },
    { id: 'enrolled', label: '累計人次', numeric: true, width: '6rem' },
    { id: 'trend', label: '近期走勢', width: '9.5rem' }
  ];
  const courseHref = (row: CourseRanking) => `/courses/${row.latestActiveOfferingId ?? row.latestOfferingId}`;
</script>

<svelte:head><title>{school.name}｜UniCourse</title></svelte:head>

{#snippet unitFilter()}
  <FilterBar action={`${schoolHref(school.slug)}#departments`} label="搜尋開課單位" clearHref={units.query ? clearUnits : undefined} hidden={data.includeNonAcademic ? { include_non_academic: 'true' } : {}}>
    <label class="browse-field">搜尋系所<input name="unit" type="search" value={units.query} maxlength="100" placeholder="輸入開課單位名稱" /></label>
    <FilterSelect name="unit_sort" label="排序" allLabel={null} value={units.sort} options={[{ value: 'offerings', label: '班次最多' }, { value: 'courses', label: '課程最多' }, { value: 'name', label: '名稱' }]} />
  </FilterBar>
{/snippet}

<div class="browse-page">
  <nav class="browse-crumbs" aria-label="所在位置"><a href="/">首頁</a><span aria-hidden="true">/</span><a href="/schools">學校</a><span aria-hidden="true">/</span><span aria-current="page">{school.name}</span></nav>
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

  <nav class="browse-inline jump-links" aria-label="跳至本頁章節"><a class="browse-button" href="#departments">開課單位 ↓</a><a class="browse-button" href="#term-history">歷年收錄 ↓</a><a class="browse-button" href="#ranking">校內排行 ↓</a></nav>

  <div class="browse-compact-stats"><StatRow label="收錄概況">
    <StatTile label="開課班次" value={institution?.offerings ?? school.offerings} unit="班" />
    <StatTile label="課程" value={institution?.courses ?? school.courses} unit="門" />
    <StatTile label="已收錄學期" value={coverageTerms.length} unit="期" />
    <StatTile label="開課單位" value={units.total} unit="個" />
    <div class="browse-wide-stat"><StatTile label="累計修課" value={enrollmentTerms.length ? enrollmentTerms.reduce((sum, term) => sum + (term.enrolled ?? 0), 0) : null}
      unit="人次" note={enrollmentTerms.length ? '僅計已公布人次' : data.trends === null ? '統計暫未取得' : '未公布人數'} /></div>
  </StatRow></div>

  {#if units.total > 12 || units.query}<div class="phone-unit-filter">{@render unitFilter()}</div>{/if}

  <section class="browse-stack" aria-labelledby="term-history">
    <SectionHeader title="歷年收錄" id="term-history" />
    {#if data.trends === null}
      <ErrorState title="暫時無法取得班次走勢" retryHref={page.url.pathname + page.url.search} />
    {:else if data.trends.length}
      <SchoolsTermHistory label="每學期開課班次" points={terms.map((term) => ({ term, value: trendsByTerm.get(term)?.offerings ?? null }))}
        termHref={(term) => overviewSearchHref({ school: school.slug, term })} phonePreview />
    {:else}
      <EmptyState title="目前沒有班次走勢" description="待有開課班次後，這裡會顯示各學期的變化。" />
    {/if}
    <p class="browse-note">{period ? `收錄期間：${period}` : '尚未匯入'}{hasDemoRankings ? ' · 統計及排行包含示範班次。' : ''}</p>
  </section>

  <div class="browse-columns">
    <section class="browse-stack" aria-labelledby="departments">
      <SectionHeader title="開課單位（{displayValue(units.total)}）" id="departments" description="橫條以全校最多班次的單位為基準。" />
      {#if units.total}
        <div class="desktop-unit-filter">{@render unitFilter()}</div>
      {/if}
      {#if units.rows.length}
        <p class="browse-note">共 {displayValue(units.matched)} 個單位 · 顯示 {displayValue(units.start)}–{displayValue(units.start + units.rows.length - 1)} 個</p>
        <Pagination url={page.url} page={units.page} totalPages={units.totalPages} label="開課單位上方分頁" />
        <DataTable caption="開課單位與班次" columns={unitColumns} rows={units.rows} rowKey={(row) => row.name} rowHref={(row) => departmentHref(school.slug, row.name)} minWidth="100%" maxHeight="none" scrollHint={false}>
          {#snippet cell(row, column)}
            {#if column.id === 'offerings'}<BarCell value={row.offerings} max={units.max} emphasis={!units.query && units.sort === 'offerings' && units.start + units.rows.indexOf(row) <= 3} />{:else}{displayValue(column.value?.(row))}{/if}
          {/snippet}
        </DataTable>
        <Pagination url={page.url} page={units.page} totalPages={units.totalPages} label="開課單位分頁" />
      {:else}
        <EmptyState title={units.query ? '沒有符合條件的開課單位' : '目前沒有開課單位'} description={units.query ? '換個關鍵字試試。' : '待資料匯入後，這裡會顯示各單位。'} />
      {/if}
    </section>

    <section class="browse-stack" aria-labelledby="ranking">
      <SectionHeader title="歷年最多人修的課" id="ranking" description={`跨學期加總已公布的修課人次；目前${data.includeNonAcademic ? '包含' : '排除'}零學分及班會、導師時間等行政活動。`} />
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
          <div class="desktop-rank"><DataTable caption={`校內累計修課人次排行｜${trendCaption}`} columns={rankColumns} rows={ranked} rowKey={(row) => row.courseCode} rowHref={courseHref} stickyColumn="course" minWidth="20rem" maxHeight="none" scrollHint={false}>
            {#snippet cell(row, column)}
              {#if column.id === 'course'}
                <span class="browse-course-cell">
                  <span>{ranked.indexOf(row) + 1}. {row.title}</span><span class="browse-code">{row.courseCode}</span>
                  {#if row.isDemo}<Badge label="示範" tone="demo" />{/if}
                </span>
              {:else if column.id === 'enrolled'}
                <BarCell value={row.enrolledTotal ?? null} max={maxEnrolled} />
              {:else if column.id === 'trend'}
                <OverviewRankingTrend course={row} terms={trendTerms} max={maxTrend} />
              {:else}{displayValue(column.value?.(row))}{/if}
            {/snippet}
          </DataTable></div>
          <div class="mobile-rank">
            <p class="browse-note rank-caption">{trendCaption}</p>
            <ol aria-label="校內累計修課人次排行" role="list">
              {#each ranked as row, index (row.courseCode)}
                <li>
                  <a href={courseHref(row)}>{index + 1}. {row.title}</a>
                  <p class="browse-note"><span class="browse-code">{row.courseCode}</span> · {row.terms} 學期 {#if row.isDemo}<Badge label="示範" tone="demo" />{/if}</p>
                  <div class="rank-measures"><BarCell value={row.enrolledTotal ?? null} max={maxEnrolled} unit="人次" /><OverviewRankingTrend course={row} terms={trendTerms} max={maxTrend} /></div>
                </li>
              {/each}
            </ol>
          </div>
        {:else}
          <EmptyState title="尚無可排名的修課人數" description="未公布的人數不列入排行，也不視為 0。" />
        {/if}
        {#if capacities.length}
          <div class="browse-stack">
            <h3>另有公布名額的課</h3>
            <BarList label="累計名額（不列入人次排行）" unit="名" items={capacities.map((row) => ({ label: row.title, value: row.capacityTotal ?? null, href: courseHref(row) }))} />
          </div>
        {/if}
        <a class="browse-button" href={rankingHref(school.slug, true, data.includeNonAcademic)}>查看校內前 50 門 →</a>
      {/if}
    </section>
  </div>
</div>

<style>
  .browse-columns { --bar-cell-track-size: 2.4rem; }
  .jump-links { gap: var(--space-2); }
  .edition { white-space: nowrap; }
  .rank-toggle { display: inline-flex; gap: var(--space-2); align-items: center; min-block-size: var(--target-min); cursor: pointer; }
  .mobile-rank, .phone-unit-filter { display: none; }
  h3 { margin: 0; font-size: var(--t-md); }
  .browse-button { justify-self: start; }
  @media (max-width: 40rem) {
    .desktop-rank { display: none; }
    .desktop-unit-filter { display: none; }
    .phone-unit-filter { display: block; }
    .phone-unit-filter :global(form) { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; }
    .phone-unit-filter :global(.actions) { display: contents; }
    .phone-unit-filter :global(.actions button) { padding-inline: var(--space-2); }
    .phone-unit-filter :global(.actions a) { grid-column: 1 / -1; justify-self: start; }
    .mobile-rank { display: block; }
    .mobile-rank ol { list-style: none; padding: 0; margin: 0; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
    .mobile-rank li { padding: 0 var(--space-3) var(--space-2); }
    .mobile-rank li + li { border-block-start: 1px solid var(--line); }
    .mobile-rank li a { display: flex; align-items: center; min-block-size: var(--target-min); font-weight: 650; }
    .mobile-rank .browse-code { display: inline; }
    .rank-measures { display: grid; grid-template-columns: minmax(0, 1fr) minmax(9rem, 1fr); align-items: center; gap: var(--space-3); }
    .rank-measures :global(.bar-cell) { width: min(100%, 9rem); --bar-cell-track-size: clamp(1.5rem, 8vw, 2.75rem); white-space: nowrap; font-size: var(--t-sm); }
    p.rank-caption { margin-block-end: var(--space-2); }
  }
</style>
