<script lang="ts">
  import { navigating } from '$app/state';
  import type { CourseRanking, School } from '@unicourse/api-client';
  import type { PageData } from '../routes/$types';
  import { importedAt, shortImportedAt } from './format';
  import { coveragePeriod, coverageYears, hasImportedOfferings, yearCoverage } from './institutions';
  import { overviewSearchHref, searchExamples, rankingHref, schoolHref } from './overview-paths';
  import OverviewRankingTrend, { rankingTrendCaption } from './overview-ranking-trend.svelte';
  import OverviewRankingValues from './overview-ranking-values.svelte';
  import OverviewSearchForm from './overview-search-form.svelte';
  import Badge from './ui/Badge.svelte';
  import BarCell from './ui/BarCell.svelte';
  import DataTable from './ui/DataTable.svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import ErrorState from './ui/ErrorState.svelte';
  import FilterSelect from './ui/FilterSelect.svelte';
  import Heatstrip from './ui/Heatstrip.svelte';
  import SectionHeader from './ui/SectionHeader.svelte';
  import StatRow from './ui/StatRow.svelte';
  import StatTile from './ui/StatTile.svelte';
  import { displayValue } from './ui/format';
  import { partialTermLabel, partialTerms } from './ui/partial-terms';
  import type { TableColumn } from './ui/types';

  let { schools, terms, overview }: { schools: School[]; terms: string[]; overview: Extract<PageData['content'], { kind: 'overview' }> } = $props();

  let trendTerms = $derived.by(() => {
    const slots = terms.filter((term) => /^\d{3,4}-[12]$/.test(term)).map((term) => {
      const [year, semester] = term.split('-').map(Number);
      return year * 2 + semester - 1;
    });
    if (!slots.length) return [];
    const last = Math.max(...slots);
    const first = Math.max(Math.min(...slots), last - 20);
    return Array.from({ length: last - first + 1 }, (_, index) => {
      const slot = first + index;
      return `${Math.floor(slot / 2)}-${slot % 2 + 1}`;
    });
  });
  let trendPeriod = $derived(coveragePeriod(trendTerms));
  type RankedCourse = CourseRanking & { rank: number | null; lastOffered: string | null };
  let columns = $derived<TableColumn<RankedCourse>[]>([
    { id: 'rank', label: '名次', numeric: true, width: '4.5rem' },
    { id: 'course', label: '課程', width: '30%' },
    { id: 'school', label: '學校' },
    { id: 'terms', label: '學期數', numeric: true, width: '5rem' },
    { id: 'enrollment', label: '累計修課人次', numeric: true, width: '13rem' },
    { id: 'trend', label: '修課走勢（人）', headerNote: '少於 6 期用點圖', width: '19rem' }
  ]);

  let rows = $derived.by(() => {
    let rank = 0;
    return (overview.rankings ?? []).map((course) => ({ ...course, rank: course.enrolledTotal != null ? ++rank : null }));
  });
  let maximum = $derived(Math.max(0, ...rows.map((course) => metricValue(course) ?? 0)));
  let trendCaption = $derived(rankingTrendCaption(trendTerms));
  let compactRanking = $derived(overview.diverse && !overview.expanded && rows.length > 5);
  let defaultTerm = $derived(terms[0]);
  let recentPeriod = $derived(coveragePeriod(overview.recentTerms));
  let hasPartialTrend = $derived(rows.some((course) => partialTerms(Object.entries(course.sectionsByTerm)).size > 0));
  let rankedSchools = $derived(new Set(rows.filter((course) => course.rank !== null).map((course) => course.school)).size);
  let leadingSchool = $derived.by(() => {
    const counts = new Map<string, number>();
    for (const course of rows) if (course.rank !== null) counts.set(course.schoolName, (counts.get(course.schoolName) ?? 0) + 1);
    const [first, second] = [...counts.entries()].sort((left, right) => right[1] - left[1]);
    return first && first[1] > (second?.[1] ?? 0) ? first : null;
  });
  let latest = $derived(overview.latest);
  let period = $derived(coveragePeriod(overview.totals?.terms ?? []));
  let hasDemo = $derived(rows.some((course) => course.isDemo));
  let coveredSchools = $derived((overview.institutions ?? []).filter(hasImportedOfferings)
    .sort((left, right) => right.offerings - left.offerings || left.code.localeCompare(right.code)));
  let deepCoverage = $derived(coveredSchools.filter(({ terms }) => terms.length > 3));
  let years = $derived(coverageYears(overview.institutions ?? []));
  let coverageColumns = $derived<TableColumn<(typeof deepCoverage)[number]>[]>([
    { id: 'school', label: '學校', value: (row) => row.name },
    { id: 'years', label: '學年覆蓋' },
    { id: 'offerings', label: '班次', value: (row) => row.offerings, numeric: true, width: 'var(--coverage-count-width, 6.5rem)' }
  ]);
  let rankHref = $derived(rankingHref(overview.rankSchool, !overview.expanded, overview.includeNonAcademic, overview.diverse));
  let rankRetry = $derived(rankingHref(overview.rankSchool, overview.expanded, overview.includeNonAcademic, overview.diverse));
  let scopeHref = $derived(rankingHref('', overview.expanded, overview.includeNonAcademic, !overview.diverse));
  let rankingPending = $derived(navigating.to?.url.pathname === '/' && navigating.to.url.hash === '#ranking');

  function href(course: CourseRanking) { return `/courses/${course.latestOfferingId}`; }
  function metricValue(course: CourseRanking) { return course.enrolledTotal ?? course.capacityTotal ?? null; }
  function applySchool(event: Event) { (event.currentTarget as HTMLFormElement).requestSubmit(); }
  function englishTitle(title: string) {
    if (title !== title.toUpperCase()) return title;
    return title.toLowerCase().replace(/\b[a-z]+\b/g, (word, index) => {
      if (/^[ivx]+$/.test(word)) return word.toUpperCase();
      if (index > 0 && ['a', 'an', 'and', 'as', 'at', 'for', 'in', 'of', 'the', 'to'].includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    });
  }

</script>

<header class="hero">
  <img src="/unicourse.png" width="56" height="56" alt="" />
  <div>
    <p class="eyebrow">UniCourse <span>／</span> 大學課程觀測站</p>
    <h1>跨校查課，看十年修課人數。</h1>
    <p class="dek">比較各校班次、教師與歷年修課人數。</p>
    <p class="metadata">
      {#if latest}<span>更新於 <time datetime={latest} title={importedAt(latest)}>{shortImportedAt(latest)}</time>・臺北時間</span>{:else}<span>更新時間未公布</span>{/if}
      <span aria-hidden="true">·</span><a href="#coverage">資料來源</a>
    </p>
  </div>
</header>

<section class="search-panel" aria-labelledby="find-courses">
  <h2 id="find-courses" class="visually-hidden">搜尋課程</h2>
  <OverviewSearchForm {schools} {terms} compact />
  <div class="search-shortcuts">
    {#if defaultTerm}<p class="metadata">預設查 {defaultTerm}</p>{/if}
    <button class="button text-action" form="course-search" name="all_terms" value="1">查全部學期</button>
    <a class="summary-jump" href="#ranking">看累計修課排行 ↓</a>
  </div>
  <nav class="popular" aria-label="搜尋範例">
    <span>搜尋範例</span>
    {#each searchExamples as query (query)}<a href={overviewSearchHref({ query, term: 'all' })}>{query}</a>{/each}
  </nav>
</section>

<section class="home-section snapshot" aria-labelledby="snapshot-title">
  <div class="snapshot-heading">
    <SectionHeader id="snapshot-title" title="目前收錄" />
    {#if period}<p class="snapshot-period"><span class="ui-tabular">{period}</span> 學期{#if hasDemo} <Badge label="含示範資料" tone="demo" />{/if}</p>{/if}
  </div>
  <StatRow>
    <StatTile label="開課班次" value={overview.totals?.offerings ?? null} note="可搜尋的班次" />
    <StatTile label="跨學期課程" value={overview.totals?.courses ?? null} note="同校同課號合併計算" />
    <StatTile label="已收錄大專校院" value={overview.totals && overview.institutions ? `${displayValue(overview.totals.schools)} / ${displayValue(overview.institutions.length)}` : overview.totals?.schools ?? null}>
      {#snippet detail()}
        {#if overview.institutions}
          <span class="coverage-depth"><span><strong>{displayValue(deepCoverage.length)} 所</strong> 至少 4 期</span><span><strong>{displayValue(coveredSchools.length - deepCoverage.length)} 所</strong> 1–3 期</span></span>
        {/if}
      {/snippet}
    </StatTile>
    <StatTile label="已收錄學期" value={overview.totals?.terms.length ?? null} note={overview.totals?.terms[0] ? `最新學期 ${overview.totals.terms[0]}` : '最新學期未公布'} />
  </StatRow>
  {#if !overview.totals}<p class="metadata">暫時無法取得統計，仍可使用搜尋。</p>{/if}
</section>

{#snippet courseTitle(course: RankedCourse)}
  <a class="course-title" href={href(course)}>{course.title}</a>
  {#if course.titleEn}<small lang="en">{englishTitle(course.titleEn)}</small>{/if}
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
  <SectionHeader id="ranking-title" title="歷史累計修課人數排行" description={overview.diverse && recentPeriod
    ? `優先列出 ${recentPeriod} 有開課的課程，再按歷年累計人次排序。`
    : '依同校同課號跨學期加總的修課人次排序。'}>
    {#snippet actions()}
      <form id="ranking-filters" method="GET" action="/#ranking" class="rank-form" onchange={applySchool}>
        {#if overview.expanded}<input type="hidden" name="rank_limit" value="50" />{/if}
        {#if !overview.rankSchool && !overview.diverse}<input type="hidden" name="rank_view" value="overall" />{/if}
        <FilterSelect name="rank_school" label="排行範圍" allLabel="所有學校" value={overview.rankSchool}
          options={schools.map((school) => ({ value: school.slug, label: school.name }))} />
        <noscript><button class="button secondary">套用</button></noscript>
      </form>
    {/snippet}
  </SectionHeader>
  <div class="ranking-tools">
    {#if !overview.rankSchool}<nav class="ranking-views" aria-label="排行檢視">
      <span>排行檢視</span>
      <a class="button secondary" href={overview.diverse ? rankRetry : scopeHref} aria-current={overview.diverse ? 'true' : undefined}>每校最多 2 門</a>
      <a class="button secondary" href={overview.diverse ? scopeHref : rankRetry} aria-current={!overview.diverse ? 'true' : undefined}>整體排行</a>
    </nav>{/if}
    <details class="ranking-method">
      <summary>ⓘ <span>計算方式</span></summary>
      <p>各校收錄期數與公布程度不同，開設多年或多班的課更容易上榜。{#if leadingSchool && !overview.rankSchool && !overview.diverse}本榜以{leadingSchool[0]}（{displayValue(leadingSchool[1])} 門）最多。{/if}{#if overview.diverse}從累計人次前 100 門中，每校最多取 2 門。本榜有 {displayValue(rows.length)} 門課、{displayValue(rankedSchools)} 校。{/if}各課走勢最多有最近 10 個開課學期的數值。排行目前{overview.includeNonAcademic ? '納入' : '排除'}零學分及行政活動。只公布名額的課另列在有修課人數的課之後。</p>
      <label class="rank-toggle"><input form="ranking-filters" type="checkbox" name="include_non_academic" value="true" checked={overview.includeNonAcademic} onchange={(event) => event.currentTarget.form?.requestSubmit()} />納入零學分及行政活動</label>
      <noscript><button type="submit" form="ranking-filters" class="button secondary">套用計算方式</button></noscript>
    </details>
    <span class="visually-hidden" role="status">{rankingPending ? '更新排行中…' : ''}</span>
  </div>

  {#if overview.rankings === null}
    <ErrorState title="暫時無法取得排行" retryHref={rankRetry} />
  {:else if !rows.length}
    <EmptyState title="還沒有可排行的課程" description="收錄開課資料後，這裡會顯示各課程的累計修課人數。">
      {#snippet action()}<a class="button secondary" href="/schools">看各校收錄狀態</a>{/snippet}
    </EmptyState>
  {:else}
    <p class="metadata rank-chart-key">累計條 0–{displayValue(maximum)} 人次。{trendPeriod ? `${trendPeriod} 走勢。` : ''}{trendCaption}{#if hasPartialTrend} <span class="trend-key"><i aria-hidden="true"></i>空心點或＊＝{partialTermLabel}</span>{/if}</p>
    <div class="desktop-ranking">
      <DataTable caption="累計修課人次與各期走勢" {columns} {rows}
        rowKey={(course) => course.latestOfferingId} rowHeaderColumn="course" minWidth="42rem" maxHeight="none" scrollHint={false}>
        {#snippet cell(course, column)}
          {#if column.id === 'rank'}<span class="rank-number">{displayValue(course.rank)}</span>
          {:else if column.id === 'course'}<div class="rank-title">{@render courseTitle(course)}</div>
          {:else if column.id === 'school'}<span class="school-meta">{course.schoolName} <small>{course.courseCode}</small></span>{#if course.isDemo}<Badge label="示範" tone="demo" />{/if}
          {:else if column.id === 'terms'}{displayValue(course.terms)}
          {:else if column.id === 'enrollment'}{@render metric(course)}
          {:else if column.id === 'trend'}<OverviewRankingTrend {course} terms={trendTerms} lastOffered={course.lastOffered} />{/if}
        {/snippet}
      </DataTable>
    </div>
    <div class="rank-frame">
      {#snippet mobileRows(courses: RankedCourse[], start: number)}
      <ol class="mobile-ranking" start={start} aria-label={start === 1 ? '累計修課人數排行' : '累計修課人數排行（續）'} role="list">
        {#each courses as course (course.latestOfferingId)}
          {@const published = course.trend.filter(({ term, enrolled }) => enrolled != null && trendTerms.includes(term)).length}
          <li>
            <span class="rank-number" aria-label={course.rank === null ? '不列名次' : `第 ${course.rank} 名`}>{displayValue(course.rank)}</span>
            <div class="mobile-course">{@render courseTitle(course)}</div>
            <div class="mobile-total">
              {#if metricValue(course) !== null}
                <strong class="ui-tabular"><small>累計</small> {displayValue(metricValue(course))} <small>{course.enrolledTotal == null ? '名額' : '人次'}</small></strong>
                <span class="mobile-metric" aria-hidden="true">{@render metric(course)}</span>
              {:else}<small class="unpublished">人數與名額未公布</small>{/if}
            </div>
            <span class="rank-meta">{course.schoolName} · <code>{course.courseCode}</code> · {course.terms} 學期{#if published && published < course.terms} · {published} 期有人數{/if} {#if course.isDemo}<Badge label="示範" tone="demo" />{/if}</span>
            <div class="mobile-trend">
              <OverviewRankingTrend {course} terms={trendTerms} lastOffered={course.lastOffered} />
            </div>
          </li>
        {/each}
      </ol>
      {/snippet}
      {@render mobileRows(compactRanking ? rows.slice(0, 5) : rows, 1)}
      {#if compactRanking}
        <details class="more-ranking">
          <summary><span class="show-ranking">展開前 {rows.length} 名</span><span class="hide-ranking">收合至前 5 名</span></summary>
          {@render mobileRows(rows.slice(5), 6)}
        </details>
      {/if}
      <div class="rank-footer">
        <OverviewRankingValues courses={rows} terms={trendTerms} />
        {#if rows.length >= 10 || overview.expanded}
          <a class="button text-action" href={rankHref}>{overview.expanded ? '顯示前 10 筆' : overview.diverse ? '多看各校課程' : '查看前 50 筆'} <span aria-hidden="true">→</span></a>
        {/if}
      </div>
    </div>
    {#if hasDemo}<p class="metadata">「示範」為合成資料，並非校方實際開課紀錄。</p>{/if}
  {/if}
</section>

<section class="home-section" id="coverage" aria-labelledby="coverage-title">
  <SectionHeader id="coverage-title" title="各校收錄摘要" />
  {#if overview.institutions === null}
    <ErrorState title="暫時無法取得收錄狀態" retryHref="/#coverage" />
  {:else if coveredSchools.length}
    <p class="coverage-summary"><strong>{displayValue(deepCoverage.length)} 所</strong>涵蓋 4 個學期以上，<strong>{displayValue(coveredSchools.length - deepCoverage.length)} 所</strong>收錄 1–3 個學期。</p>
    {#if deepCoverage.length}
      <p class="metadata coverage-key">每格一學年。空框為未收錄，斜線一學期，實色兩學期。</p>
      <div class="coverage-schools">
        <DataTable caption="收錄至少 4 學期的學校" columns={coverageColumns} rows={deepCoverage} rowKey={(school) => school.slug} rowHref={(school) => schoolHref(school.slug)} minWidth="0" maxHeight="none" scrollHint={false}>
          {#snippet header(column)}
            {column.label}
            {#if column.id === 'years'}<Heatstrip cells={yearCoverage([], years)} yearTicks="only" />{/if}
          {/snippet}
          {#snippet cell(school, column)}
            {#if column.id === 'years'}<Heatstrip cells={yearCoverage(school.terms, years)} label={school.name} hatchPartial />
            {:else if column.id === 'school'}
              <span class="coverage-name">{school.name}</span>
              {#if school.terms[0] !== overview.totals?.terms[0]}<small class="coverage-recent">截至 {school.terms[0]}</small>{/if}
            {:else}{displayValue(column.value?.(school))}{/if}
          {/snippet}
        </DataTable>
      </div>
    {/if}
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
  .popular { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); align-items: center; margin-block-start: var(--space-2); color: var(--muted); font-size: var(--t-sm); }
  .popular a { display: inline-flex; align-items: center; min-height: var(--target-min); padding-inline: var(--space-3); border-radius: var(--radius-pill); background: var(--panel-raised); border: 1px solid var(--line); color: var(--brand-ink); font-weight: 630; text-decoration: none; }
  .popular a:hover { background: var(--brand-wash); }
  .home-section { display: grid; gap: var(--section-content-gap); margin-block-start: var(--section-gap); }
  .snapshot { margin-block-start: var(--space-5); }
  .snapshot-heading { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-1) var(--space-3); }
  .snapshot-period { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-1); margin: 0; color: var(--muted); font-size: var(--t-sm); }
  .coverage-depth { display: flex; flex-wrap: wrap; column-gap: var(--space-2); }
  .coverage-depth > span { color: var(--ink-2); white-space: nowrap; }
  .coverage-depth strong { color: var(--ink); font-size: var(--t-base); }
  .snapshot :global(.detail) { display: block; margin-inline-start: 0; }
  .rank-form { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); }
  .rank-toggle { display: inline-flex; align-items: center; gap: var(--space-1); min-height: var(--target-min); font-size: var(--t-sm); cursor: pointer; }
  .rank-toggle input { accent-color: var(--brand); }
  .rank-toggle:has(input:focus-visible) { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .ranking-tools { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .ranking-views { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-1); }
  .ranking-views > span { color: var(--muted); font-size: var(--t-sm); }
  .ranking-views [aria-current] { border-color: var(--brand-ring); background: var(--brand-wash); }
  .ranking-method summary { width: fit-content; align-content: center; min-height: var(--target-min); color: var(--brand-ink); cursor: pointer; font-size: var(--t-base); }
  .ranking-method p { max-width: 46rem; margin: 0; color: var(--muted); font-size: var(--t-base); }
  .button { display: inline-flex; justify-content: center; align-items: center; gap: var(--space-1); min-height: var(--target-min); padding-inline: var(--space-2); border: 1px solid transparent; border-radius: var(--radius-control); background: transparent; color: var(--brand-ink); font: 650 var(--t-base) / var(--leading-table) var(--font-sans); text-decoration: none; cursor: pointer; }
  .secondary { border-color: var(--control-line); }
  .button:hover { background: var(--brand-wash); }
  .mobile-ranking, .more-ranking { display: none; }
  .rank-chart-key { display: block; margin: 0; text-wrap: pretty; }
  .trend-key { display: inline-flex; align-items: center; }
  .trend-key i { inline-size: .55rem; block-size: .55rem; margin-inline-end: var(--space-1); border: 1px solid var(--brand); border-radius: 50%; }
  .desktop-ranking { --table-pad-block: 0.3rem; }
  .rank-title { display: grid; min-width: 0; }
  .course-title { overflow-wrap: anywhere; }
  small, .rank-meta { color: var(--muted); font-size: var(--t-sm); font-weight: 450; }
  .rank-title small { overflow-wrap: anywhere; }
  .school-meta small { margin-inline: var(--space-1); font-family: var(--font-mono); }
  .rank-number { color: var(--muted); font-variant-numeric: tabular-nums; }
  .metric { display: flex; align-items: center; justify-content: end; gap: var(--space-2); white-space: nowrap; }
  .metric :global(.bar-cell) { --bar-cell-track-size: clamp(2rem, 7vw, 5.5rem); width: min(100%, 9rem); }
  .capacity-label { color: var(--muted); font-size: var(--t-xs); }
  .metric[data-estimate='true'] :global(.fill) { background: repeating-linear-gradient(125deg, var(--brand) 0 2px, transparent 2px 4px); }
  .unpublished { color: var(--muted); }
  .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .coverage-summary { margin: 0; color: var(--ink-2); text-wrap: pretty; }
  .coverage-key { margin: calc(-1 * var(--space-2)) 0 0; }
  .coverage-schools { --table-pad-block: .25rem; --heatstrip-cell-size: .875rem; --heatstrip-tick-size: 0.75rem; }
  .coverage-schools :global(tbody tr) { position: relative; }
  .coverage-schools :global(tbody th.sticky) { position: static; box-shadow: none; }
  .coverage-schools :global(.row-link::after) { content: ''; position: absolute; inset: 0; }
  .coverage-schools :global(.row-link:focus-visible) { outline: none; }
  .coverage-schools :global(.row-link:focus-visible::after) { inset: calc(var(--focus-offset) * 2); outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .coverage-name { text-wrap: balance; }
  .coverage-recent { display: block; }
  .rank-frame { min-width: 0; }
  .rank-footer { display: grid; align-items: start; grid-template-columns: minmax(0, 1fr) auto; gap: 0 var(--space-1); }
  .rank-footer :global(details) { margin: 0; min-width: 0; }
  .rank-footer :global(details[open]) { grid-column: 1 / -1; }
  .rank-footer > a { grid-column: 2; }
  .summary-jump { display: inline-flex; align-items: center; min-block-size: var(--target-min); justify-self: start; }
  .coverage-all { justify-self: start; }
  .search-shortcuts { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-1) var(--space-3); }
  .search-shortcuts .metadata { margin: 0; }
  .search-shortcuts button { cursor: pointer; }
  @media (max-width: 45rem) {
    .desktop-ranking { display: none; }
    .mobile-course small { display: none; }
    .mobile-ranking { display: grid; margin: 0; padding: 0; list-style: none; }
    .rank-frame { border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
    .rank-footer { border-block-start: 1px solid var(--line); padding: 0 var(--space-2); }
    .mobile-ranking li { position: relative; display: grid; grid-template-columns: 1rem minmax(0, 1fr) auto; column-gap: var(--space-2); align-items: center; padding: 2px var(--space-3); }
    .mobile-ranking li + li { border-top: 1px solid var(--line); }
    .more-ranking { display: block; border-block-start: 1px solid var(--line); }
    .more-ranking summary { width: fit-content; min-height: var(--target-min); padding-inline: var(--space-3); align-content: center; color: var(--brand-ink); font-size: var(--t-base); font-weight: 650; cursor: pointer; }
    .more-ranking[open] .show-ranking, .more-ranking:not([open]) .hide-ranking { display: none; }
    .mobile-ranking .rank-number { justify-self: end; font-size: var(--t-base); }
    .mobile-course { font-size: var(--t-md); font-weight: 650; line-height: var(--leading-tight); }
    .mobile-course { padding-block: var(--space-1); }
    .mobile-course a::after { content: ''; position: absolute; inset: 0; }
    .mobile-course a:focus-visible { outline: none; }
    .mobile-course a:focus-visible::after { inset: calc(var(--focus-offset) * 2); outline: var(--focus-ring); outline-offset: var(--focus-offset); }
    .mobile-ranking li:has(a:is(:hover, :focus-visible)) { background: var(--hover-row); }
    .mobile-total { display: grid; justify-items: end; text-align: end; font-size: var(--t-md); line-height: 1.3; }
    .mobile-total small { font-size: var(--t-sm); }
    .mobile-total strong { white-space: nowrap; }
    .rank-meta { grid-column: 2 / -1; overflow-wrap: anywhere; line-height: 1.35; }
    .rank-meta code { font-family: var(--font-mono); }
    .mobile-trend { grid-column: 2 / -1; font-size: var(--t-base); }
    .mobile-metric { display: block; width: 3.25rem; margin-block-start: .2rem; }
    .mobile-metric :global(.bar-cell > .ui-tabular), .mobile-metric .capacity-label { display: none; }
    .mobile-metric .metric :global(.bar-cell) { --bar-cell-track-size: 100%; width: 100%; }
    .mobile-metric .metric :global(.track) { block-size: 4px; }
    .coverage-schools { --heatstrip-cell-size: 10px; --heatstrip-gap: 1px; --coverage-count-width: 4rem; --heatstrip-empty-line: var(--muted); }
    .coverage-name { font-size: var(--t-sm); }
  }
  @media (max-width: 37rem) {
    .hero { gap: var(--space-2); }
    .hero img { width: 36px; height: 36px; }
    h1 { font-size: var(--t-2xl); text-wrap: initial; }
    .search-panel { padding: var(--space-3); }
    .search-shortcuts { column-gap: var(--space-1); }
    .popular { gap: var(--space-1); }
    .popular a { padding-inline: var(--space-2); }
    .snapshot { gap: var(--space-2); }
    .snapshot :global(.tile) { padding: var(--space-2); }
    .snapshot :global(.tile dd) { margin-block-start: 0; font-size: var(--t-xl); }
  }
</style>
