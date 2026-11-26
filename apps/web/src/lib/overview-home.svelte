<script lang="ts">
  import { navigating } from '$app/state';
  import type { CourseRanking, School } from '@unicourse/api-client';
  import type { PageData } from '../routes/$types';
  import { importedAt } from './format';
  import { hasSchoolPage } from './institutions';
  import { overviewSearchHref, schoolHref } from './overview-paths';
  import OverviewSearchForm from './overview-search-form.svelte';
  import Badge from './ui/Badge.svelte';
  import BarCell from './ui/BarCell.svelte';
  import DataTable from './ui/DataTable.svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import ErrorState from './ui/ErrorState.svelte';
  import FilterSelect from './ui/FilterSelect.svelte';
  import Heatstrip from './ui/Heatstrip.svelte';
  import SectionHeader from './ui/SectionHeader.svelte';
  import Sparkline from './ui/Sparkline.svelte';
  import StatRow from './ui/StatRow.svelte';
  import StatTile from './ui/StatTile.svelte';
  import { displayValue } from './ui/format';
  import type { TableColumn } from './ui/types';

  let { schools, terms, overview }: { schools: School[]; terms: string[]; overview: Extract<PageData['content'], { kind: 'overview' }> } = $props();

  const popular = ['資料結構', '微積分', '普通心理學', '日文'];
  type RankedCourse = CourseRanking & { rank: number | null };
  const columns: TableColumn<RankedCourse>[] = [
    { id: 'rank', label: '名次', numeric: true, width: '4.5rem' },
    { id: 'course', label: '課程', width: '30%' },
    { id: 'school', label: '學校' },
    { id: 'terms', label: '學期數', numeric: true, width: '5rem' },
    { id: 'enrollment', label: '累計修課人數', numeric: true, width: '13rem' },
    { id: 'trend', label: '逐學期走勢', width: '7rem', align: 'center' }
  ];

  let rows = $derived.by(() => {
    let rank = 0;
    return (overview.rankings ?? []).map((course) => ({ ...course, rank: metricValue(course) !== null ? ++rank : null }));
  });
  let maximum = $derived(Math.max(0, ...rows.map((course) => metricValue(course) ?? 0)));
  let trendMax = $derived(Math.max(0, ...rows.flatMap((course) => course.trend.map((point) => point.enrolled ?? 0))));
  let latest = $derived(overview.schoolStats.map((school) => school.latestImportedAt).flatMap((date) => date ? [date] : []).sort().at(-1));
  let coveredSchools = $derived((overview.institutions ?? []).filter(hasSchoolPage)
    .sort((left, right) => right.terms.length - left.terms.length || right.offerings - left.offerings));
  let years = $derived.by(() => {
    const imported = terms.map((term) => Number(term.split('-')[0])).filter(Number.isSafeInteger);
    if (!imported.length) return [];
    const latestYear = Math.max(...imported);
    const firstYear = Math.max(Math.min(...imported), latestYear - 9);
    return Array.from({ length: latestYear - firstYear + 1 }, (_, index) => firstYear + index);
  });
  let rankHref = $derived(`/?${new URLSearchParams({
    ...(overview.rankSchool ? { rank_school: overview.rankSchool } : {}), rank_limit: overview.expanded ? '10' : '50'
  })}#ranking`);
  let rankRetry = $derived(`/${overview.rankSchool ? `?${new URLSearchParams({ rank_school: overview.rankSchool, ...(overview.expanded ? { rank_limit: '50' } : {}) })}` : overview.expanded ? '?rank_limit=50' : ''}#ranking`);
  let rankingPending = $derived(navigating.to?.url.searchParams.has('rank_school') ?? false);

  function href(course: CourseRanking) { return `/courses/${course.latestOfferingId}`; }
  function metricValue(course: CourseRanking) { return course.enrolledTotal ?? course.capacityTotal ?? null; }
  function applySchool(event: Event) { (event.currentTarget as HTMLFormElement).requestSubmit(); }

  function trendPoints(course: CourseRanking) {
    const values = new Map(course.trend.map((point) => [point.term, point.enrolled]));
    const newest = terms.findIndex((term) => term === course.trend[0]?.term);
    const oldest = terms.findIndex((term) => term === course.trend.at(-1)?.term);
    return newest >= 0 && oldest >= newest
      ? terms.slice(newest, oldest + 1).reverse().map((term) => ({ term, enrolled: values.get(term) ?? null }))
      : [...course.trend].reverse();
  }
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
    {#each popular as query (query)}<a href={overviewSearchHref({ query, term: 'all' })}><span>{query}</span></a>{/each}
  </div>
</section>

<section class="home-section snapshot" aria-labelledby="snapshot-title">
  <SectionHeader id="snapshot-title" title="目前收錄" />
  <StatRow>
    <StatTile label="開課班次" value={overview.totals?.offerings ?? null} note="可搜尋的班次" />
    <StatTile label="跨學期課程" value={overview.totals?.courses ?? null} note="同校同課號合併計算" />
    <StatTile label="大專校院" value={overview.totals && overview.institutions ? `${displayValue(overview.totals.schools)} / ${displayValue(overview.institutions.length)}` : overview.totals?.schools ?? null} note="有匯入資料的學校" />
    <StatTile label="已收錄學期" value={overview.totals?.terms ?? null} note={terms[0] ? `最新學期 ${terms[0]}` : '最新學期未公布'} />
  </StatRow>
  {#if !overview.totals}<p class="metadata">暫時無法取得統計，仍可使用搜尋。</p>{/if}
</section>

{#snippet courseTitle(course: RankedCourse)}
  <span class="course-title">{course.title}</span>
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

{#snippet trend(course: RankedCourse)}
  {#if course.trend.some((point) => point.enrolled !== null)}
    {@const points = trendPoints(course)}
    <Sparkline values={points.map((point) => point.enrolled)} min={0} max={trendMax}
      label={`各學期修課人數：${points.map((point) => `${point.term}：${point.enrolled == null ? '無資料' : displayValue(point.enrolled)}`).join('、')}`} />
  {:else}<span class="unpublished" aria-label="沒有公布各學期修課人數">—</span>{/if}
{/snippet}

<section class="home-section" id="ranking" aria-labelledby="ranking-title">
  <SectionHeader id="ranking-title" title="歷史累計修課人數排行" description="同校同課號跨學期加總；未公布修課人數時，另以累計名額列在已公布人數的課程之後。兩者皆未公布不列名次。">
    {#snippet actions()}
      <form method="GET" action="/#ranking" class="rank-form" onchange={applySchool}>
        {#if overview.expanded}<input type="hidden" name="rank_limit" value="50" />{/if}
        <FilterSelect name="rank_school" label="排行範圍" allLabel="所有學校" value={overview.rankSchool}
          options={schools.map((school) => ({ value: school.slug, label: school.name }))} />
        <button class="button secondary" aria-busy={rankingPending}>{rankingPending ? '套用中…' : '套用'}</button>
      </form>
      {#if rows.length >= 10 || overview.expanded}
        <a class="button text-action expand-ranking" href={rankHref}>{overview.expanded ? '顯示前 10 筆' : '查看前 50 筆'} <span aria-hidden="true">→</span></a>
      {/if}
    {/snippet}
  </SectionHeader>

  {#if overview.rankings === null}
    <ErrorState title="暫時無法取得排行" retryHref={rankRetry} />
  {:else if !rows.length}
    <EmptyState title="還沒有可排行的課程" description="收錄開課資料後，這裡會顯示各課程的累計修課人數。">
      {#snippet action()}<a class="button secondary" href="/schools">看各校收錄狀態</a>{/snippet}
    </EmptyState>
  {:else}
    <div class="desktop-ranking">
      <DataTable caption="同一尺度比較人數與名額；走勢由左至右為舊到新。" {columns} {rows}
        rowKey={(course) => course.latestOfferingId} rowHeaderColumn="course" rowHref={href} minWidth="42rem" maxHeight="none" scrollHint={false}>
        {#snippet cell(course, column)}
          {#if column.id === 'rank'}<span class="rank-number">{displayValue(course.rank)}</span>
          {:else if column.id === 'course'}{@render courseTitle(course)}
          {:else if column.id === 'school'}<span class="school-meta">{course.schoolName} <small>{course.courseCode}</small></span>{#if course.isDemo}<Badge label="示範" tone="demo" />{/if}
          {:else if column.id === 'terms'}{displayValue(course.terms)}
          {:else if column.id === 'enrollment'}{@render metric(course)}
          {:else if column.id === 'trend'}{@render trend(course)}{/if}
        {/snippet}
      </DataTable>
    </div>
    <ol class="mobile-ranking" aria-label="累計修課人數排行" role="list">
      {#each rows as course (course.latestOfferingId)}
        <li>
          <span class="rank-number" aria-label={course.rank === null ? '不列名次' : `第 ${course.rank} 名`}>{displayValue(course.rank)}</span>
          <div class="rank-detail">
            <a class="mobile-course" href={href(course)}>{@render courseTitle(course)}</a>
            <span class="rank-meta">{course.schoolName} · {course.courseCode} · {course.terms} 學期 {#if course.isDemo}<Badge label="示範" tone="demo" />{/if}</span>
            <div class="rank-metric">
              {#if metricValue(course) === null}<span class="unpublished">人數與名額未公布</span>
              {:else}{@render metric(course)}{@render trend(course)}{/if}
            </div>
          </div>
        </li>
      {/each}
    </ol>
    {#if rows.length >= 10 || overview.expanded}
      <a class="button text-action expand-mobile" href={rankHref}>{overview.expanded ? '顯示前 10 筆' : '查看前 50 筆'} <span aria-hidden="true">→</span></a>
    {/if}
    {#if rows.some((course) => course.isDemo)}<p class="metadata">「示範」不是校方實際開課資料。</p>{/if}
  {/if}
</section>

<section class="home-section" id="coverage" aria-labelledby="coverage-title">
  <SectionHeader id="coverage-title" title="各校收錄狀態" description="課程資料來自各校公開課程網站；以匯入的學期計算，每格代表一個學年。">
    {#snippet actions()}<a class="button text-action" href="/schools">{overview.institutions ? `全部 ${displayValue(overview.institutions.length)} 所` : '查看各校收錄狀態'} <span aria-hidden="true">→</span></a>{/snippet}
  </SectionHeader>
  {#if overview.institutions === null}
    <ErrorState title="暫時無法取得收錄狀態" retryHref="/#coverage" />
  {:else if coveredSchools.length}
    <div class="coverage-panel">
      <p class="coverage-key">
        {#if years.length}<span>{years[0]}{#if years.length > 1}–{years.at(-1)}{/if} 學年</span>{/if}
        <span><i></i> 尚未收錄</span><span><i class="partial"></i> 1 學期</span><span><i class="full"></i> 2 學期</span>
      </p>
      <ul role="list">
        {#each coveredSchools.slice(0, 4) as school (school.slug)}
          <li>
            <a href={schoolHref(school.slug)}>{school.name}</a>
            <Heatstrip label={`${school.name}收錄範圍`} cells={years.map((year) => ({ period: String(year), value: school.terms.filter((term) => term.startsWith(`${year}-`)).length }))} />
            <span class="ui-tabular">{displayValue(school.terms.length)} 學期</span>
          </li>
        {/each}
      </ul>
    </div>
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
  .popular a { display: inline-flex; align-items: center; min-height: var(--target-min); border-radius: var(--radius-control); color: var(--brand-ink); font-weight: 630; text-decoration: none; }
  .popular a span { padding: 2px var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-pill); background: var(--panel-raised); }
  .popular a:hover span { background: var(--brand-wash); }
  .home-section { display: grid; gap: var(--space-3); margin-block-start: clamp(1.5rem, 4vw, 2.5rem); }
  .snapshot { margin-block-start: var(--space-5); }
  .rank-form { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); }
  .button { display: inline-flex; justify-content: center; align-items: center; gap: var(--space-1); min-height: var(--target-min); padding-inline: var(--space-2); border: 1px solid transparent; border-radius: var(--radius-control); background: transparent; color: var(--brand-ink); font: 650 var(--t-base) / var(--leading-table) var(--font-sans); text-decoration: none; cursor: pointer; }
  .secondary { border-color: var(--control-line); }
  .button:hover { background: var(--brand-wash); }
  .mobile-ranking, .expand-mobile { display: none; }
  .desktop-ranking { --table-pad-block: 0.3rem; }
  .desktop-ranking :global(.row-link) { align-items: flex-start; justify-content: center; flex-direction: column; gap: 0; }
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
  .coverage-panel { background: var(--panel-raised); border: 1px solid var(--line); border-radius: var(--radius-panel); }
  .coverage-key { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-3); margin: 0; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--line); background: var(--table-head); color: var(--muted); font-size: var(--t-sm); }
  .coverage-key i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; background: var(--seq-0); }
  .coverage-key i.partial { background: var(--seq-2); }
  .coverage-key i.full { background: var(--seq-4); }
  .coverage-panel ul { list-style: none; margin: 0; padding: 0; }
  .coverage-panel li { display: grid; grid-template-columns: minmax(0, 1fr) minmax(1rem, 7.5rem) 4rem; gap: var(--space-2); align-items: center; padding: 0 var(--space-3); font-size: var(--t-base); }
  .coverage-panel li + li { border-top: 1px solid var(--line); }
  .coverage-panel li a { display: flex; align-items: center; min-height: var(--target-min); }
  .coverage-panel li > span { justify-self: end; color: var(--muted); }
  @media (max-width: 45rem) {
    .desktop-ranking, .expand-ranking { display: none; }
    .expand-mobile { display: inline-flex; justify-self: start; }
    .mobile-ranking { display: grid; margin: 0; padding: 0; list-style: none; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
    .mobile-ranking li { display: grid; grid-template-columns: 1.5rem minmax(0, 1fr); gap: var(--space-2); align-items: start; padding: var(--space-1) var(--space-3) var(--space-2); }
    .mobile-ranking li + li { border-top: 1px solid var(--line); }
    .mobile-ranking .rank-number { margin-top: var(--space-3); font-size: var(--t-base); }
    .mobile-course { display: flex; flex-direction: column; justify-content: center; min-height: var(--target-min); width: fit-content; max-width: 100%; font-size: var(--t-md); font-weight: 650; line-height: var(--leading-tight); }
    .rank-meta { overflow-wrap: anywhere; }
    .rank-metric { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); font-size: var(--t-base); }
    .rank-metric .unpublished { font-size: var(--t-sm); }
    .rank-metric .metric :global(.bar-cell) { --bar-cell-track-size: 3.5rem; width: auto; }
  }
  @media (max-width: 37rem) {
    .hero { gap: var(--space-2); }
    .hero img { width: 36px; height: 36px; }
    h1 { font-size: var(--t-2xl); text-wrap: initial; }
    .search-panel { padding: var(--space-3); }
    .popular { gap: 0 var(--space-1); }
  }
</style>
