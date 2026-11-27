<script lang="ts">
  import { navigating } from '$app/state';
  import type { CourseRanking, School } from '@unicourse/api-client';
  import type { PageData } from '../routes/$types';
  import { importedAt } from './format';
  import { coveragePeriod, hasSchoolPage } from './institutions';
  import { overviewSearchHref, popularSearches, rankingHref, schoolHref } from './overview-paths';
  import OverviewRankingTrend from './overview-ranking-trend.svelte';
  import OverviewSearchForm from './overview-search-form.svelte';
  import Badge from './ui/Badge.svelte';
  import BarCell from './ui/BarCell.svelte';
  import DataTable from './ui/DataTable.svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import ErrorState from './ui/ErrorState.svelte';
  import FilterSelect from './ui/FilterSelect.svelte';
  import SectionHeader from './ui/SectionHeader.svelte';
  import StatRow from './ui/StatRow.svelte';
  import StatTile from './ui/StatTile.svelte';
  import { displayValue } from './ui/format';
  import type { TableColumn } from './ui/types';

  let { schools, terms, overview }: { schools: School[]; terms: string[]; overview: Extract<PageData['content'], { kind: 'overview' }> } = $props();

  type RankedCourse = CourseRanking & { rank: number | null };
  const columns: TableColumn<RankedCourse>[] = [
    { id: 'rank', label: '名次', numeric: true, width: '4.5rem' },
    { id: 'course', label: '課程', width: '30%' },
    { id: 'school', label: '學校' },
    { id: 'terms', label: '學期數', numeric: true, width: '5rem' },
    { id: 'enrollment', label: '累計修課人數', numeric: true, width: '13rem' },
    { id: 'trend', label: '近期走勢', width: '8rem' }
  ];

  let rows = $derived.by(() => {
    let rank = 0;
    return (overview.rankings ?? []).map((course) => ({ ...course, rank: metricValue(course) !== null ? ++rank : null }));
  });
  let maximum = $derived(Math.max(0, ...rows.map((course) => metricValue(course) ?? 0)));
  let trendTerms = $derived(terms.slice(0, 10).reverse());
  let trendMax = $derived(Math.max(0, ...rows.flatMap((course) => course.trend.filter(({ term }) => trendTerms.includes(term)).map(({ enrolled }) => enrolled ?? 0))));
  let latest = $derived(overview.latest);
  let period = $derived(coveragePeriod(overview.totals?.terms ?? []));
  let hasDemo = $derived(rows.some((course) => course.isDemo));
  let coveredSchools = $derived((overview.institutions ?? []).filter(hasSchoolPage)
    .sort((left, right) => right.offerings - left.offerings || left.code.localeCompare(right.code)));
  let coverageMax = $derived(coveredSchools[0]?.offerings ?? 0);
  let rankHref = $derived(rankingHref(overview.rankSchool, !overview.expanded, overview.includeNonAcademic));
  let rankRetry = $derived(rankingHref(overview.rankSchool, overview.expanded, overview.includeNonAcademic));
  let rankingPending = $derived(navigating.to?.url.pathname === '/' && navigating.to.url.hash === '#ranking');

  function href(course: CourseRanking) { return `/courses/${course.latestOfferingId}`; }
  function metricValue(course: CourseRanking) { return course.enrolledTotal ?? course.capacityTotal ?? null; }
  function applySchool(event: Event) { (event.currentTarget as HTMLFormElement).requestSubmit(); }

</script>

<header class="hero">
  <img src="/unicourse.png" width="56" height="56" alt="" />
  <div>
    <p class="eyebrow">UniCourse <span>／</span> 大學課程觀測站</p>
    <h1>跨校查課，看十年修課人數。</h1>
    <p class="dek">跨校比對開課班次、授課教師與歷年修課人數；從課名、教師或課號開始查。</p>
    <p class="metadata">
      {#if latest}<span>更新於 <time datetime={latest}>{importedAt(latest)}</time>（臺北時間）</span>{:else}<span>更新時間未公布</span>{/if}
      <span aria-hidden="true">·</span><a href="#coverage">資料來源</a>
    </p>
  </div>
</header>

<section class="search-panel" aria-labelledby="find-courses">
  <h2 id="find-courses">搜尋課程</h2>
  <OverviewSearchForm {schools} {terms} />
  <div class="popular" aria-label="熱門搜尋">
    <span>熱門搜尋</span>
    {#each popularSearches as query (query)}<a href={overviewSearchHref({ query, term: 'all' })}>{query}</a>{/each}
  </div>
</section>

<section class="home-section snapshot" aria-labelledby="snapshot-title">
  <div class="snapshot-heading">
    <SectionHeader id="snapshot-title" title="目前收錄" />
    {#if period}<p class="snapshot-period"><span class="ui-tabular">{period}</span> 學期{#if hasDemo} <Badge label="含示範資料" tone="demo" />{/if}</p>{/if}
  </div>
  <StatRow>
    <StatTile label="開課班次" value={overview.totals?.offerings ?? null} note="可搜尋的班次" />
    <StatTile label="跨學期課程" value={overview.totals?.courses ?? null} note="同校同課號合併計算" />
    <StatTile label="大專校院" value={overview.totals && overview.institutions ? `${displayValue(overview.totals.schools)} / ${displayValue(overview.institutions.length)}` : overview.totals?.schools ?? null} note="有匯入資料的學校" />
    <StatTile label="已收錄學期" value={overview.totals?.terms.length ?? null} note={overview.totals?.terms[0] ? `最新學期 ${overview.totals.terms[0]}` : '最新學期未公布'} />
  </StatRow>
  {#if !overview.totals}<p class="metadata">暫時無法取得統計，仍可使用搜尋。</p>{/if}
</section>

{#snippet courseTitle(course: RankedCourse)}
  <a class="course-title" href={href(course)}>{course.title}</a>
  {#if course.titleEn}<small lang="en" title={course.titleEn}>{course.titleEn}</small>{/if}
{/snippet}

{#snippet metric(course: RankedCourse)}
  {@const value = metricValue(course)}
  {#if value !== null}
    <span class="metric" data-estimate={course.enrolledTotal == null}>
      {#if course.enrolledTotal == null}<span class="capacity-label">名額</span>{/if}
      <BarCell {value} max={maximum} emphasis={course.enrolledTotal != null} />
    </span>
  {:else}
    <span class="unpublished"><span aria-hidden="true">—</span><span class="visually-hidden">人數與名額未公布</span></span>
  {/if}
{/snippet}

<section class="home-section" id="ranking" aria-labelledby="ranking-title" aria-busy={rankingPending}>
  <SectionHeader id="ranking-title" title="歷史累計修課人數排行" description="同校同課號，跨學期加總已公布的修課人次。開設多年、多班且有公布人數的課（如逢甲通識）容易排在前面，不代表單期熱度。">
    {#snippet actions()}
      <form method="GET" action="/#ranking" class="rank-form" onchange={applySchool}>
        {#if overview.expanded}<input type="hidden" name="rank_limit" value="50" />{/if}
        <FilterSelect name="rank_school" label="排行範圍" allLabel="所有學校" value={overview.rankSchool}
          options={schools.map((school) => ({ value: school.slug, label: school.name }))} />
        <label class="rank-toggle"><input type="checkbox" name="include_non_academic" value="true" checked={overview.includeNonAcademic} />納入零學分及行政活動</label>
        <noscript><button class="button secondary">套用</button></noscript>
      </form>
    {/snippet}
  </SectionHeader>
  <p class="metadata">目前{overview.includeNonAcademic ? '納入' : '排除'}零學分及班會、導師時間等行政活動；學分未公布不視為零。</p>
  <div class="ranking-tools">
    <details class="ranking-method">
      <summary>計算方式</summary>
      <p>依榜上所示班次的課名與學分判定是否列入。未公布修課人數的課以累計名額排列在後，並以斜紋標示；兩者皆未公布不列名次。</p>
    </details>
    {#if rows.length >= 10 || overview.expanded}
      <a class="button text-action expand-ranking" href={rankHref}>{overview.expanded ? '顯示前 10 筆' : '查看前 50 筆'} <span aria-hidden="true">→</span></a>
    {/if}
    <span class="visually-hidden" role="status">{rankingPending ? '更新排行中…' : ''}</span>
  </div>

  {#if overview.rankings === null}
    <ErrorState title="暫時無法取得排行" retryHref={rankRetry} />
  {:else if !rows.length}
    <EmptyState title="還沒有可排行的課程" description="收錄開課資料後，這裡會顯示各課程的累計修課人數。">
      {#snippet action()}<a class="button secondary" href="/schools">看各校收錄狀態</a>{/snippet}
    </EmptyState>
  {:else}
    {#if trendTerms.length}<p class="metadata">近期走勢：<span class="ui-tabular">{trendTerms[0]}{trendTerms.length > 1 ? ` 至 ${trendTerms.at(-1)}` : ''}</span>，缺期不連線；紀錄較少時列最近有數值的學期。</p>{/if}
    <div class="desktop-ranking">
      <DataTable caption="同一尺度比較人數與名額；走勢由左至右為舊到新。" {columns} {rows}
        rowKey={(course) => course.latestOfferingId} rowHeaderColumn="course" minWidth="42rem" maxHeight="none" scrollHint={false}>
        {#snippet cell(course, column)}
          {#if column.id === 'rank'}<span class="rank-number">{displayValue(course.rank)}</span>
          {:else if column.id === 'course'}<div class="rank-title">{@render courseTitle(course)}</div>
          {:else if column.id === 'school'}<span class="school-meta">{course.schoolName} <small>{course.courseCode}</small></span>{#if course.isDemo}<Badge label="示範" tone="demo" />{/if}
          {:else if column.id === 'terms'}{displayValue(course.terms)}
          {:else if column.id === 'enrollment'}{@render metric(course)}
          {:else if column.id === 'trend'}<OverviewRankingTrend {course} terms={trendTerms} max={trendMax} />{/if}
        {/snippet}
      </DataTable>
    </div>
    <div class="mobile-rank-key" aria-hidden="true"><span>累計修課人數</span><span>近期人數／走勢</span></div>
    <ol class="mobile-ranking" aria-label="累計修課人數排行" role="list">
      {#each rows as course (course.latestOfferingId)}
        <li>
          <span class="rank-number" aria-label={course.rank === null ? '不列名次' : `第 ${course.rank} 名`}>{displayValue(course.rank)}</span>
          <div class="rank-detail">
            <div class="mobile-course">{@render courseTitle(course)}</div>
            <span class="rank-meta">{course.schoolName} · {course.courseCode} · {course.terms} 學期 {#if course.isDemo}<Badge label="示範" tone="demo" />{/if}</span>
            <div class="rank-metric">
              {#if metricValue(course) === null}<span class="unpublished">人數與名額未公布</span>
              {:else}
                {@render metric(course)}
                <OverviewRankingTrend {course} terms={trendTerms} max={trendMax} />
              {/if}
            </div>
          </div>
        </li>
      {/each}
    </ol>
    {#if rows.length >= 10 || overview.expanded}
      <a class="button text-action expand-mobile" href={rankHref}>{overview.expanded ? '顯示前 10 筆' : '查看前 50 筆'} <span aria-hidden="true">→</span></a>
    {/if}
    {#if hasDemo}<p class="metadata">「示範」為合成資料，並非校方實際開課紀錄。</p>{/if}
  {/if}
</section>

<section class="home-section" id="coverage" aria-labelledby="coverage-title">
  <SectionHeader id="coverage-title" title="各校收錄狀態" description="預覽累計班次最多的學校（最多 10 所）。橫條比較班次量，不代表學年覆蓋率。">
    {#snippet actions()}<a class="button text-action" href="/schools">{overview.institutions ? `全部 ${displayValue(overview.institutions.length)} 所` : '查看各校收錄狀態'} <span aria-hidden="true">→</span></a>{/snippet}
  </SectionHeader>
  {#if overview.institutions === null}
    <ErrorState title="暫時無法取得收錄狀態" retryHref="/#coverage" />
  {:else if coveredSchools.length}
    <div class="coverage-panel">
      <table>
        <caption class="visually-hidden">各校收錄學期與累計班次</caption>
        <thead><tr>
          <th scope="col">學校</th>
          <th scope="col">收錄期間</th>
          <th scope="col" class="coverage-count" aria-sort="descending">累計班次 <span aria-hidden="true">↓</span></th>
        </tr></thead>
        <tbody>
          {#each coveredSchools.slice(0, 10) as school (school.slug)}
            <tr>
              <th scope="row"><a href={schoolHref(school.slug)}>{school.name}</a></th>
              <td class="ui-tabular coverage-period">
                <span>{displayValue(school.terms.length)} 個學期</span>
                <small>{#each (coveragePeriod(school.terms) ?? '').split(' 至 ') as term, index (term)}{#if index}{' 至 '}{/if}<span>{term}</span>{/each}</small>
              </td>
              <td class="coverage-count"><BarCell value={school.offerings} max={coverageMax} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <a class="button secondary coverage-all" href="/schools">查看全部 {displayValue(overview.institutions.length)} 所學校 →</a>
  {:else}
    <EmptyState title="尚未收錄學校課程" />
  {/if}
</section>

<style>
  .hero { display: flex; align-items: flex-start; gap: var(--space-4); }
  .hero img { flex: none; border-radius: var(--radius-panel); }
  .eyebrow { margin: 0 0 var(--space-1); color: var(--muted); font-size: var(--t-sm); font-weight: 650; }
  .eyebrow span { color: var(--brand-ink); }
  h1 { margin: 0; font-size: var(--t-hero); line-height: var(--leading-tight); letter-spacing: var(--tracking-heading); text-wrap: balance; }
  .dek { margin: var(--space-2) 0 0; color: var(--ink-2); }
  .metadata { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); margin: var(--space-1) 0 0; color: var(--muted); font-size: var(--t-sm); }
  .search-panel { margin-block-start: var(--space-5); padding: var(--space-4); background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-panel); }
  .search-panel h2 { margin: 0 0 var(--space-2); font-size: var(--t-lg); line-height: var(--leading-tight); }
  .popular { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); align-items: center; margin-block-start: var(--space-2); color: var(--muted); font-size: var(--t-sm); }
  .popular a { display: inline-flex; align-items: center; min-height: var(--target-min); padding-inline: var(--space-3); border-radius: var(--radius-control); background: var(--panel-raised); border: 1px solid var(--line); color: var(--brand-ink); font-weight: 630; text-decoration: none; }
  .popular a:hover { background: var(--brand-wash); }
  .home-section { display: grid; gap: var(--space-3); margin-block-start: clamp(1.5rem, 4vw, 2.5rem); }
  .snapshot { margin-block-start: var(--space-5); }
  .snapshot-heading { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-1) var(--space-3); }
  .snapshot-period { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-1); margin: 0; color: var(--muted); font-size: var(--t-sm); }
  .rank-form { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); }
  .rank-toggle { display: inline-flex; align-items: center; gap: var(--space-1); min-height: var(--target-min); font-size: var(--t-sm); cursor: pointer; }
  .rank-toggle input { accent-color: var(--brand); }
  #ranking[aria-busy='true'] .rank-form { opacity: 0.7; }
  .ranking-tools { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-2); }
  .ranking-method summary { width: fit-content; align-content: center; min-height: var(--target-min); color: var(--brand-ink); cursor: pointer; font-size: var(--t-base); }
  .ranking-method p { max-width: 46rem; margin: 0; color: var(--muted); font-size: var(--t-base); }
  .button { display: inline-flex; justify-content: center; align-items: center; gap: var(--space-1); min-height: var(--target-min); padding-inline: var(--space-2); border: 1px solid transparent; border-radius: var(--radius-control); background: transparent; color: var(--brand-ink); font: 650 var(--t-base) / var(--leading-table) var(--font-sans); text-decoration: none; cursor: pointer; }
  .secondary { border-color: var(--control-line); }
  .button:hover { background: var(--brand-wash); }
  .mobile-ranking, .mobile-rank-key, .expand-mobile { display: none; }
  .desktop-ranking { --table-pad-block: 0.3rem; }
  .rank-title { display: grid; min-width: 0; }
  .course-title { overflow-wrap: anywhere; }
  small, .rank-meta { color: var(--muted); font-size: var(--t-sm); font-weight: 450; }
  small { max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .school-meta small { margin-inline: var(--space-1); font-family: var(--font-mono); }
  .rank-number { color: var(--muted); font-variant-numeric: tabular-nums; }
  .metric { display: flex; align-items: center; justify-content: end; gap: var(--space-2); white-space: nowrap; }
  .metric :global(.bar-cell) { --bar-cell-track-size: clamp(2rem, 7vw, 5.5rem); width: min(100%, 9rem); }
  .capacity-label { color: var(--muted); font-size: var(--t-xs); }
  .metric[data-estimate='true'] :global(.fill) { background: repeating-linear-gradient(125deg, var(--brand) 0 2px, transparent 2px 4px); }
  .unpublished { color: var(--muted); }
  .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .coverage-panel { --bar-cell-track-size: clamp(2rem, 10vw, 8rem); background: var(--panel-raised); border: 1px solid var(--line); border-radius: var(--radius-panel); }
  .coverage-panel table { width: 100%; border-spacing: 0; font-size: var(--t-base); }
  .coverage-panel th, .coverage-panel td { padding-inline: var(--space-3); text-align: start; overflow-wrap: anywhere; }
  .coverage-panel thead th { padding-block: var(--space-2); background: var(--table-head); color: var(--muted); font-size: var(--t-sm); }
  .coverage-panel thead th:first-child { border-start-start-radius: var(--radius-panel); }
  .coverage-panel thead th:last-child { border-start-end-radius: var(--radius-panel); }
  .coverage-panel tbody :is(th, td) { border-top: 1px solid var(--line); }
  .coverage-panel tbody th { font-weight: 550; }
  .coverage-panel a { display: flex; align-items: center; min-height: var(--target-min); }
  .coverage-period small { display: block; overflow: visible; white-space: normal; }
  .coverage-period small span { white-space: nowrap; }
  .coverage-all { justify-self: start; }
  .coverage-panel .coverage-count { text-align: end; white-space: nowrap; }
  @media (max-width: 45rem) {
    .desktop-ranking, .expand-ranking { display: none; }
    .expand-mobile { display: inline-flex; justify-self: start; }
    .mobile-ranking { display: grid; margin: 0; padding: 0; list-style: none; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
    .mobile-ranking li { display: grid; grid-template-columns: 1.5rem minmax(0, 1fr); gap: var(--space-2); align-items: start; padding: var(--space-1) var(--space-3) var(--space-2); }
    .mobile-ranking li + li { border-top: 1px solid var(--line); }
    .mobile-ranking .rank-number { margin-top: var(--space-3); font-size: var(--t-base); }
    .mobile-course { display: flex; flex-direction: column; justify-content: center; min-height: var(--target-min); width: fit-content; max-width: 100%; font-size: var(--t-md); font-weight: 650; line-height: var(--leading-tight); }
    .rank-meta { overflow-wrap: anywhere; }
    .rank-metric, .mobile-rank-key { display: grid; grid-template-columns: minmax(0, 1fr) minmax(6.75rem, .75fr); gap: var(--space-2); align-items: center; }
    .mobile-rank-key { padding-inline: calc(var(--space-3) + 1.5rem + var(--space-2)) var(--space-3); font-size: var(--t-sm); color: var(--muted); }
    .rank-metric .metric { justify-content: start; }
    .rank-metric .unpublished { font-size: var(--t-sm); }
    .rank-metric .metric :global(.bar-cell) { --bar-cell-track-size: 3.5rem; width: auto; }
  }
  @media (max-width: 37rem) {
    .hero { gap: var(--space-2); }
    .hero img { width: 36px; height: 36px; }
    h1 { font-size: var(--t-2xl); text-wrap: initial; }
    .search-panel { padding: var(--space-3); }
    .popular { gap: var(--space-1); }
    .popular a { padding-inline: var(--space-2); }
    .coverage-panel th, .coverage-panel td { padding-inline: var(--space-1); }
    .coverage-panel th:first-child { padding-inline-start: var(--space-2); }
    .coverage-panel td:last-child { padding-inline-end: var(--space-2); }
    .coverage-panel .coverage-count { font-size: var(--t-xs); }
  }
</style>
