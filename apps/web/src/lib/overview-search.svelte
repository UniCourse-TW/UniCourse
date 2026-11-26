<script lang="ts">
  import { navigating, page } from '$app/state';
  import type { Offering, School } from '@unicourse/api-client';
  import type { PageData } from '../routes/$types';
  import { credits, meeting, requirement } from './format';
  import { departmentHref, instructorHref, overviewSearchHref, popularSearches } from './overview-paths';
  import OverviewSearchForm from './overview-search-form.svelte';
  import Badge from './ui/Badge.svelte';
  import DataTable from './ui/DataTable.svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import ErrorState from './ui/ErrorState.svelte';
  import FilterChip from './ui/FilterChip.svelte';
  import Pagination from './ui/Pagination.svelte';
  import { displayValue } from './ui/format';
  import type { TableColumn } from './ui/types';

  let { schools, terms, search }: { schools: School[]; terms: string[]; search: Extract<PageData['content'], { kind: 'search' }> } = $props();

  let { filters, departments, result, invalid, totalPages } = $derived(search);
  let schoolName = $derived(schools.find((school) => school.slug === filters.school)?.name ?? filters.school);
  let href = $derived(overviewSearchHref(filters));
  let url = $derived(new URL(href, page.url));
  let relaxed = $derived(overviewSearchHref({ ...filters, school: '', department: '', term: 'all' }));
  let allTerms = $derived(overviewSearchHref({ ...filters, term: 'all' }));
  let allSchools = $derived(overviewSearchHref({ ...filters, school: '', department: '' }));
  let allOfferings = $derived(overviewSearchHref({ term: 'all' }));
  let hasFilters = $derived(Boolean(filters.school || filters.department || filters.term !== 'all'));
  let courses = $derived(result?.courses ?? []);
  let hasDemo = $derived(courses.some((course) => course.isDemo));
  let quickSchools = $derived(tally(courses, (course) => course.school).sort((left, right) => right[1] - left[1]));
  let quickTerms = $derived(tally(courses, (course) => course.term).sort((left, right) => right[0].localeCompare(left[0])));
  let inlineDistribution = $derived((quickSchools.length > 1 && quickSchools.length <= 3 && quickTerms.length <= 1)
    || (quickTerms.length > 1 && quickTerms.length <= 3 && quickSchools.length <= 1));
  let pending = $derived(navigating.to?.url.pathname === '/' && navigating.to.url.search !== page.url.search
    && (navigating.to.url.searchParams.has('q') || navigating.to.url.searchParams.has('term')));
  let queryLabel = $derived(Array.from(filters.query).length > 24 ? `${Array.from(filters.query).slice(0, 24).join('')}…` : filters.query);

  const allColumns: TableColumn<Offering>[] = [
    { id: 'course', label: '課程', width: '23%', sortable: true, value: (course) => course.title },
    { id: 'school', label: '學校／開課單位', width: '18%', sortable: true, value: (course) => course.schoolName },
    { id: 'term', label: '學期', width: '5rem', sortable: true, value: (course) => course.term },
    { id: 'instructors', label: '教師', width: '12%' },
    { id: 'credits', label: '學分', numeric: true, width: '4.25rem', sortable: true, value: (course) => course.credits },
    { id: 'requirement', label: '必選修', width: '5rem' },
    { id: 'schedule', label: '上課時間' },
    { id: 'enrollment', label: '修課人數／名額', numeric: true, width: '9rem', sortable: true, value: (course) => course.enrolled }
  ];
  let available = $derived({
    instructors: courses.some((course) => course.instructors.length),
    credits: courses.some((course) => course.credits != null),
    requirement: courses.some((course) => requirement(course)),
    schedule: courses.some((course) => schedule(course)),
    enrollment: courses.some((course) => course.enrolled != null || course.capacity != null)
  });
  let columns = $derived(allColumns.filter(({ id }) => available[id as keyof typeof available] ?? true));

  function courseHref(course: Offering) { return `/courses/${course.id}`; }
  function schedule(course: Offering) { return course.scheduleText || course.schedule?.map(meeting).join('、') || undefined; }
  function tally(offerings: Offering[], group: (course: Offering) => string) {
    const counts = new Map<string, number>();
    for (const offering of offerings) {
      const key = group(offering);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()];
  }
</script>

<header class="search-header">
  <p class="eyebrow">課程觀測站 <span>／</span> 跨校查課</p>
  <h1>{queryLabel ? `搜尋「${queryLabel}」` : '搜尋課程'}</h1>
  <p class="dek">
    <span role="status">
      {#if pending}<strong>正在搜尋班次…</strong><span aria-hidden="true"> · </span>
      {:else if result?.total}<strong class="ui-tabular">共 {displayValue(result.total)} 班次</strong><span aria-hidden="true"> · </span>{/if}
    </span>
    {schoolName || '所有學校'}<span aria-hidden="true"> · </span>{filters.term === 'all' ? '全部學期' : `${filters.term} 學期`}
    {#if filters.department}<span aria-hidden="true"> · </span>{filters.department}{/if}
    <span aria-hidden="true"> · </span><a href="/#coverage">資料來源</a>
  </p>
</header>

<section class="toolbar" aria-label="搜尋與篩選">
  <OverviewSearchForm {schools} {terms} {filters} {departments} />
  {#if hasFilters}
    <div class="active-filters" role="group" aria-label="已套用的篩選">
      <span>已套用</span>
      {#if filters.school}<a class="active-chip" href={allSchools} aria-label={`移除篩選：${schoolName}`}>{schoolName} <span aria-hidden="true">×</span></a>{/if}
      {#if filters.term !== 'all'}<a class="active-chip" href={allTerms} aria-label={`移除篩選：${filters.term} 學期`}>{filters.term} 學期 <span aria-hidden="true">×</span></a>{/if}
      {#if filters.department}<FilterChip {url} name="department" label={filters.department} />{/if}
      <a class="clear" href={relaxed}>清除篩選</a>
    </div>
  {/if}
</section>

{#snippet facets()}
    {#if quickSchools.length > 1}
      <nav class="quick-filters" aria-label="依學校縮小範圍">
        <strong>本頁學校</strong>
        {#each quickSchools as [school, count] (school)}
          <a class="quick-chip" href={overviewSearchHref({ ...filters, school })}>{schools.find((item) => item.slug === school)?.name ?? school} <span class="ui-tabular">{displayValue(count)}</span></a>
        {/each}
      </nav>
    {/if}
    {#if quickTerms.length > 1}
      <nav class="quick-filters" aria-label="依學期縮小範圍">
        <strong>本頁學期</strong>
        {#each quickTerms as [term, count] (term)}
          <a class="quick-chip" href={overviewSearchHref({ ...filters, term })}>{term} <span class="ui-tabular">{displayValue(count)}</span></a>
        {/each}
      </nav>
    {/if}
{/snippet}

{#snippet title(course: Offering)}
  <span class="course-title" title={course.title}>{course.title}</span>
  {#if course.isDemo}<Badge label="示範" tone="demo" />{/if}
{/snippet}

{#snippet code(course: Offering)}
  <span class="code">{course.courseCode}{#if course.classCode} <span>· 班次 {course.classCode}</span>{/if}</span>
{/snippet}

{#snippet unit(course: Offering)}
  {#if course.department}<a href={departmentHref(course.school, course.department)}>{course.department}</a>{/if}
{/snippet}

{#snippet teachers(course: Offering)}
  {#each course.instructors as name, index}
    {#if index > 0}、{/if}<a href={instructorHref(course.school, name)}>{name}</a>
  {:else}—{/each}
{/snippet}

{#snippet enrollment(course: Offering, mobile: boolean)}
  {@const enrolled = course.enrolled}
  {@const capacity = course.capacity}
  <span class="enrollment ui-tabular">
    {#if enrolled != null && capacity != null}
      {#if mobile}<span class="muted">修課／名額</span>{/if}
      {#if capacity > 0}<span class="meter" class:over={enrolled > capacity} aria-hidden="true"><i style:width={`${Math.min(100, Math.max(0, enrolled / capacity * 100))}%`}></i></span>{/if}
      <span title={enrolled > capacity ? '修課人數已超過公布名額' : undefined}>{displayValue(enrolled)} / {displayValue(capacity)}</span>
    {:else if enrolled != null}<span>{#if mobile}修課人數 {/if}{displayValue(enrolled)} 人</span>
    {:else if capacity != null}<span class="muted">名額 {displayValue(capacity)}</span>
    {:else}<span class="muted">{mobile ? '修課人數／名額未公布' : '—'}</span>{/if}
  </span>
{/snippet}

{#snippet returnHome()}<a class="button secondary" href="/#course-search">回首頁搜尋</a>{/snippet}

<section class="results" aria-label="搜尋結果" aria-busy={pending}>
  {#if !result}
    <ErrorState title={invalid ? '無法使用這個搜尋條件' : '暫時無法取得搜尋結果'}
      description={invalid ? '關鍵字最多 100 字，不可包含換行；也可清除條件後再查一次。' : '目前無法連線到課程資料庫，搜尋條件已保留。'}
      retryHref={invalid ? undefined : overviewSearchHref({ ...filters, page: search.page })} action={invalid ? returnHome : undefined} />
  {:else if !result.total}
    <EmptyState title="找不到符合條件的課程"
      description={hasFilters ? '保留關鍵字、放寬篩選，或試試課號、較短的課名或教師全名。' : '試試課號、較短的課名或教師全名，也可以從下方主題開始查課。'}>
      {#snippet action()}
        <div class="empty-actions">
          {#if filters.term !== 'all'}<a class="button primary" href={allTerms}>查全部學期</a>{/if}
          {#if filters.school}<a class="button" class:primary={filters.term === 'all'} class:secondary={filters.term !== 'all'} href={allSchools}>改搜所有學校</a>
          {:else if filters.department}<a class="button" class:primary={filters.term === 'all'} class:secondary={filters.term !== 'all'} href={overviewSearchHref({ ...filters, department: '' })}>改搜所有開課單位</a>{/if}
          <a class="button" class:primary={!hasFilters} class:secondary={hasFilters} href={allOfferings}>瀏覽全部班次</a>
        </div>
      {/snippet}
    </EmptyState>
    <div class="recovery">
      <h2>換個主題試試</h2>
      <nav aria-label="熱門搜尋">
        {#each popularSearches.slice(0, 3) as query (query)}
          <a class="quick-chip" href={overviewSearchHref({ query, term: 'all' })}>{query}</a>
        {/each}
        <a class="button secondary" href="/schools">從學校瀏覽 <span aria-hidden="true">→</span></a>
      </nav>
    </div>
  {:else}
    {#if totalPages > 1 || quickTerms.length > 1 || quickSchools.length > 1}
      <div class="result-top">
        {#if quickTerms.length > 1 || quickSchools.length > 1}
          {#if inlineDistribution}<div class="inline-distribution">{@render facets()}</div>{/if}
          <details class="distribution" class:display-inline={inlineDistribution}>
            <summary>本頁班次分布</summary>
            <p>數字只計入本頁班次；點選學校或學期可縮小搜尋範圍。</p>
            {@render facets()}
          </details>
        {/if}
        <Pagination {url} page={search.page} {totalPages} label="班次分頁（結果前）" />
      </div>
    {/if}
    <div class="desktop-results">
      {#key `${href}|${result.offset}`}
      <DataTable caption="開課班次｜點選課名查看詳情；表頭可排序本頁，— 表示未公布" {columns} rows={courses} rowKey={(course) => course.id} rowHref={courseHref}
        clientSort minWidth="52rem" maxHeight="none" scrollHint={false}>
        {#snippet cell(course, column)}
          {#if column.id === 'course'}
            <span class="title-line">{@render title(course)}</span>
            {@render code(course)}
          {:else if column.id === 'school'}
            <span class="school-name">{course.schoolName}</span>
            <span class="unit">{@render unit(course)}</span>
          {:else if column.id === 'term'}<span class="code">{course.term}</span>
          {:else if column.id === 'instructors'}{@render teachers(course)}
          {:else if column.id === 'credits'}{displayValue(course.credits)}
          {:else if column.id === 'requirement'}{requirement(course) ?? '—'}
          {:else if column.id === 'schedule'}{schedule(course) ?? '—'}
          {:else if column.id === 'enrollment'}{@render enrollment(course, false)}{/if}
        {/snippet}
      </DataTable>
      {/key}
    </div>
    <div class="mobile-results">
      {#each courses as course (course.id)}
        {@const meetingTime = schedule(course)}
        <article>
          <div class="card-heading">
            <h2><a href={courseHref(course)}>{@render title(course)}</a></h2>
          </div>
          <div class="school-line"><strong>{course.schoolName}</strong>{#if course.department}<span aria-hidden="true"> · </span>{@render unit(course)}{/if}</div>
          <div class="card-line">
            {#if course.instructors.length}<span>{@render teachers(course)}</span>{/if}
            {#if course.credits != null}<span>{credits(course.credits)}</span>{/if}
            {#if requirement(course)}<span>{requirement(course)}</span>{/if}
          </div>
          <div class="card-line card-schedule">
            {#if meetingTime}<span>{meetingTime}</span>{#if !course.instructors.length}<span class="muted">教師未公布</span>{/if}
            {:else}<span class="muted">{course.instructors.length ? '時間未公布' : '教師、時間未公布'}</span>{/if}
          </div>
          <div class="card-bottom">
            <div class="card-code"><span class="term">{course.term}</span>{@render code(course)}</div>
            {@render enrollment(course, true)}
          </div>
        </article>
      {/each}
    </div>
    <div class="result-footer">
      <p class="ui-tabular">顯示 {displayValue(result.offset + 1)}–{displayValue(result.offset + courses.length)} 筆 · 共 {displayValue(result.total)} 筆</p>
      <Pagination {url} page={search.page} {totalPages} label="班次分頁（結果後）" />
    </div>
    {#if hasDemo}<p class="demo-note">標示「示範」的班次不是校方實際開課資料。</p>{/if}
  {/if}
</section>

<style>
  .search-header { overflow-wrap: anywhere; }
  .eyebrow { margin: 0 0 var(--space-1); color: var(--muted); font-size: var(--t-sm); font-weight: 650; }
  .eyebrow span { color: var(--brand-ink); }
  h1 { margin: 0; font-size: var(--t-3xl); line-height: var(--leading-tight); letter-spacing: var(--tracking-heading); overflow-wrap: anywhere; text-wrap: balance; }
  .dek { margin: var(--space-1) 0 0; color: var(--muted); font-size: var(--t-base); }
  .dek strong { color: var(--ink); }
  .toolbar { margin-block-start: var(--space-4); padding: var(--space-3) var(--space-3) var(--space-1); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .active-filters { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); margin-block-start: var(--space-2); color: var(--muted); font-size: var(--t-sm); }
  .active-chip, .clear, .quick-chip { display: inline-flex; align-items: center; gap: var(--space-2); min-height: var(--target-min); padding-inline: var(--space-3); border-radius: var(--radius-pill); font-weight: 600; }
  .active-chip { background: var(--brand-wash); color: var(--brand-ink); text-decoration: none; }
  .clear:hover, .active-chip:hover { text-decoration: underline; }
  .distribution summary { width: fit-content; min-height: var(--target-min); padding-inline: var(--space-2); align-content: center; cursor: pointer; color: var(--brand-ink); font-size: var(--t-base); font-weight: 650; }
  .distribution p { margin: 0 var(--space-2) var(--space-2); color: var(--muted); font-size: var(--t-sm); }
  .quick-filters { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-1) var(--space-2); margin-block-start: var(--space-1); padding-inline: var(--space-2); font-size: var(--t-sm); }
  .quick-chip { max-width: 100%; background: var(--chip); color: var(--ink-2); font-size: var(--t-sm); overflow-wrap: anywhere; text-decoration: none; }
  .quick-chip span { min-width: 1.4rem; border-radius: var(--radius-pill); background: var(--panel-raised); text-align: center; }
  .quick-chip:hover { background: var(--brand-wash); color: var(--brand-ink); text-decoration: underline; }
  .results { min-width: 0; margin-block-start: var(--space-3); }
  .result-top { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: start; margin-block-end: var(--space-2); }
  .result-top :global(nav[aria-label='班次分頁（結果前）']) { margin-inline-start: auto; }
  .distribution[open] { flex-basis: 100%; }
  .inline-distribution .quick-filters { margin: 0; padding: 0; }
  .distribution.display-inline { display: none; }
  .desktop-results { --table-pad-block: 0.35rem; }
  .desktop-results :global(table) { table-layout: fixed; overflow-wrap: anywhere; font-size: 0.875rem; }
  .desktop-results :global(.scroll) { overflow: visible; }
  .desktop-results :global(thead th) { inset-block-start: 3.75rem; }
  .desktop-results :global(.row-link) { display: flex; justify-content: center; flex-direction: column; align-items: start; gap: 0; }
  .title-line { display: flex; flex-wrap: wrap; gap: 0 var(--space-1); align-items: center; min-width: 0; max-width: 100%; }
  .title-line .course-title { min-width: 0; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; }
  .code, .term { font-family: var(--font-mono); color: var(--muted); font-weight: 450; font-size: var(--t-sm); }
  .code span { font-family: var(--font-sans); }
  .school-name, .unit { display: block; }
  .unit { color: var(--muted); font-size: var(--t-sm); }
  .enrollment { display: inline-flex; align-items: center; justify-content: end; gap: var(--space-2); white-space: nowrap; }
  .meter { display: inline-flex; width: 2.25rem; height: 6px; border-radius: var(--radius-pill); background: var(--line); }
  .meter i { height: 100%; border-radius: inherit; background: var(--brand); }
  .meter.over i { background: var(--warn); }
  .muted { color: var(--muted); }
  .mobile-results { display: none; }
  .result-footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2) var(--space-4); margin-block-start: var(--space-3); }
  .result-footer p, .demo-note { margin: 0; color: var(--muted); font-size: var(--t-base); }
  .demo-note { margin-block-start: var(--space-1); font-size: var(--t-sm); }
  .empty-actions { display: flex; justify-content: center; flex-wrap: wrap; gap: var(--space-2); }
  .recovery { margin-block-start: var(--space-4); padding: var(--space-3) var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
  .recovery h2 { margin: 0 0 var(--space-2); font-size: var(--t-md); }
  .recovery nav { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .button { display: inline-flex; align-items: center; justify-content: center; min-height: var(--target-min); padding-inline: var(--space-3); border: 1px solid transparent; border-radius: var(--radius-control); text-decoration: none; font-weight: 650; }
  .button:hover { text-decoration: underline; }
  .primary { background: var(--brand); color: var(--on-brand); }
  .secondary { border-color: var(--control-line); }
  @media (max-width: 56rem) {
    .inline-distribution { display: none; }
    .distribution.display-inline { display: block; }
    .desktop-results { display: none; }
    .mobile-results { display: grid; gap: var(--space-2); }
    article { min-width: 0; padding: 0 var(--space-3) var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--panel-raised); font-size: var(--t-base); overflow-wrap: anywhere; }
    .card-heading { display: flex; justify-content: space-between; gap: var(--space-2); align-items: center; }
    .card-heading h2 { min-width: 0; margin: 0; font-size: var(--t-md); line-height: var(--leading-tight); }
    .card-heading a { display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--space-1); min-height: var(--target-min); }
    .term { flex: none; padding: 0 var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-control); background: var(--panel); }
    .card-line { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 var(--space-2); color: var(--ink-2); }
    .card-line > span + span::before { content: '·'; color: var(--muted); margin-inline-end: var(--space-2); }
    .school-line strong { color: var(--ink); }
    .card-bottom { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-1) var(--space-2); margin-block-start: var(--space-2); padding-block-start: var(--space-1); border-block-start: 1px solid var(--line); }
    .card-code { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-1); }
    .enrollment { font-size: var(--t-sm); }
  }
  @media (max-width: 37rem) {
    h1 { font-size: var(--t-2xl); }
  }
</style>
