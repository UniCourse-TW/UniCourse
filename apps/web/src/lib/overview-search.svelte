<script lang="ts">
  import { page } from '$app/state';
  import type { Offering, School } from '@unicourse/api-client';
  import type { PageData } from '../routes/$types';
  import { credits, meeting, requirement } from './format';
  import { departmentHref, instructorHref, overviewSearchHref } from './overview-paths';
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
  let hasFilters = $derived(Boolean(filters.school || filters.department || filters.term !== 'all'));
  let quickSchools = $derived(filters.school ? [] : schools.slice(0, 6));
  let quickTerms = $derived(terms.slice(0, 3));
  let courses = $derived(result?.courses ?? []);
  let hasDemo = $derived(courses.some((course) => course.isDemo));

  const columns: TableColumn<Offering>[] = [
    { id: 'course', label: '課程', width: '20%' },
    { id: 'school', label: '學校／開課單位', width: '19%' },
    { id: 'term', label: '學期', width: '5rem' },
    { id: 'instructors', label: '教師', width: '12%' },
    { id: 'credits', label: '學分', numeric: true, width: '3.75rem' },
    { id: 'requirement', label: '必選修', width: '5rem' },
    { id: 'schedule', label: '上課時間' },
    { id: 'enrollment', label: '修課人數／名額', numeric: true, width: '8.25rem' }
  ];

  function courseHref(course: Offering) { return `/courses/${course.id}`; }
  function schedule(course: Offering) { return course.scheduleText || course.schedule?.map(meeting).join('、'); }
</script>

<header class="search-header">
  <p class="eyebrow">課程觀測站 <span>／</span> 跨校查課</p>
  <h1>{filters.query ? `搜尋「${filters.query}」` : '搜尋課程'}</h1>
  <p class="dek">
    {#if result}<strong class="ui-tabular" aria-live="polite">共 {displayValue(result.total)} 班次</strong><span aria-hidden="true"> · </span>{/if}
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
      {#if filters.school}<FilterChip {url} name="school" label={schoolName} />{/if}
      {#if filters.term !== 'all'}<a class="active-chip" href={allTerms} aria-label={`移除篩選：${filters.term} 學期`}>{filters.term} 學期 <span aria-hidden="true">×</span></a>{/if}
      {#if filters.department}<FilterChip {url} name="department" label={filters.department} />{/if}
      <a class="clear" href={relaxed}>清除篩選</a>
    </div>
  {/if}
</section>

{#if result && result.total > 0}
  <nav class="quick-filters" aria-label="快速篩選">
    <a class="quick-chip" href={allTerms} aria-current={filters.term === 'all' ? 'true' : undefined}>全部學期</a>
    {#each quickTerms as term (term)}
      <a class="quick-chip" href={overviewSearchHref({ ...filters, term })} aria-current={filters.term === term ? 'true' : undefined}>{term}</a>
    {/each}
    {#each quickSchools as school (school.slug)}
      <a class="quick-chip" href={overviewSearchHref({ ...filters, school: school.slug, department: '' })}>{school.name}</a>
    {/each}
  </nav>
{/if}

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

{#snippet enrollment(course: Offering)}
  {@const enrolled = course.enrolled}
  {@const capacity = course.capacity}
  <span class="enrollment ui-tabular">
    {#if enrolled != null && capacity != null}
      {#if capacity > 0}<span class="meter" aria-hidden="true"><i style:width={`${Math.min(100, Math.max(0, enrolled / capacity * 100))}%`}></i></span>{/if}
      <span aria-label={`修課人數 ${enrolled}、名額 ${capacity}`}>{displayValue(enrolled)} / {displayValue(capacity)}</span>
    {:else if enrolled != null}<span>{displayValue(enrolled)} 人</span>
    {:else if capacity != null}<span class="muted">名額 {displayValue(capacity)}</span>
    {:else}<span class="muted">—</span>{/if}
  </span>
{/snippet}

{#snippet returnHome()}<a class="button secondary" href="/#course-search">回首頁搜尋</a>{/snippet}

<section class="results" aria-label="搜尋結果">
  {#if !result}
    <ErrorState title={invalid ? '無法使用這個搜尋條件' : '暫時無法取得搜尋結果'}
      description={invalid ? '關鍵字最多 100 字，不可包含換行；也可清除條件後再查一次。' : '目前無法連線到課程資料庫，搜尋條件已保留。'}
      retryHref={invalid ? undefined : overviewSearchHref({ ...filters, page: search.page })} action={invalid ? returnHome : undefined} />
  {:else if !result.total}
    <EmptyState title={filters.query ? `找不到「${filters.query}」的課程` : '沒有符合這些篩選條件的課程'}
      description={hasFilters ? '可先放寬篩選，或改用課號、較短的課名或教師全名搜尋。' : '試試課號、較短的課名或教師全名。也可以清除關鍵字，瀏覽全部班次。'}>
      {#snippet action()}
        <div class="empty-actions">
          {#if filters.term !== 'all'}<a class="button primary" href={allTerms}>查全部學期</a>{/if}
          {#if filters.school || filters.department}<a class="button" class:primary={filters.term === 'all'} class:secondary={filters.term !== 'all'} href={relaxed}>清除篩選</a>{/if}
          {#if filters.query && !hasFilters}<a class="button primary" href={overviewSearchHref({ ...filters, query: '' })}>清除關鍵字</a>{/if}
          {@render returnHome()}
        </div>
      {/snippet}
    </EmptyState>
  {:else}
    <div class="desktop-results">
      <DataTable caption="開課班次｜點選課名查看詳情；— 表示未公布" {columns} rows={courses} rowKey={(course) => course.id} rowHref={courseHref}
        minWidth="52rem" maxHeight="none" scrollHint={false}>
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
          {:else if column.id === 'enrollment'}{@render enrollment(course)}{/if}
        {/snippet}
      </DataTable>
    </div>
    <div class="mobile-results">
      {#each courses as course (course.id)}
        <article>
          <div class="card-heading">
            <h2><a href={courseHref(course)}>{@render title(course)}</a></h2>
            <span class="term">{course.term}</span>
          </div>
          <div class="school-line"><strong>{course.schoolName}</strong>{#if course.department}<span aria-hidden="true"> · </span>{@render unit(course)}{/if}</div>
          <div class="card-line">
            <span>{#if course.instructors.length}{@render teachers(course)}{:else}教師未公布{/if}</span>
            {#if course.credits != null}<span>{credits(course.credits)}</span>{/if}
            {#if requirement(course)}<span>{requirement(course)}</span>{/if}
          </div>
          <div class="card-line card-schedule"><span>{schedule(course) ?? '上課時間未公布'}</span>{@render enrollment(course)}</div>
          <div class="card-code">{@render code(course)}</div>
        </article>
      {/each}
    </div>
    <div class="result-footer">
      <p class="ui-tabular">顯示 {displayValue(result.offset + 1)}–{displayValue(result.offset + courses.length)} 筆 · 共 {displayValue(result.total)} 筆</p>
      <Pagination {url} page={search.page} {totalPages} />
    </div>
    {#if hasDemo}<p class="demo-note">標示「示範」的班次不是校方實際開課資料。</p>{/if}
  {/if}
</section>

<style>
  .search-header { overflow-wrap: anywhere; }
  .eyebrow { margin: 0 0 var(--space-1); color: var(--muted); font-size: var(--t-sm); font-weight: 650; }
  .eyebrow span { color: var(--brand-ink); }
  h1 { margin: 0; font-size: var(--t-3xl); line-height: var(--leading-tight); letter-spacing: var(--tracking-heading); }
  .dek { margin: var(--space-1) 0 0; color: var(--muted); font-size: var(--t-base); }
  .dek strong { color: var(--ink); }
  .toolbar { margin-block-start: var(--space-4); padding: var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .active-filters { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); margin-block-start: var(--space-2); color: var(--muted); font-size: var(--t-sm); }
  .active-chip, .clear, .quick-chip { display: inline-flex; align-items: center; gap: var(--space-2); min-height: var(--target-min); padding-inline: var(--space-3); border-radius: var(--radius-pill); font-weight: 600; }
  .active-chip { background: var(--brand-wash); color: var(--brand-ink); text-decoration: none; }
  .clear:hover, .active-chip:hover { text-decoration: underline; }
  .quick-filters { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-block-start: var(--space-3); }
  .quick-chip { flex: none; background: var(--chip); color: var(--ink-2); font-size: var(--t-sm); text-decoration: none; }
  .quick-chip[aria-current], .quick-chip:hover { background: var(--brand-wash); color: var(--brand-ink); text-decoration: underline; }
  .results { min-width: 0; margin-block-start: var(--space-3); }
  .desktop-results { --table-pad-block: 0.35rem; }
  .desktop-results :global(table) { table-layout: fixed; overflow-wrap: anywhere; }
  .desktop-results :global(.row-link) { display: flex; justify-content: center; flex-direction: column; align-items: start; gap: 0; }
  .title-line { display: flex; flex-wrap: wrap; gap: 0 var(--space-1); align-items: center; min-width: 0; max-width: 100%; }
  .title-line .course-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .code, .term { font-family: var(--font-mono); color: var(--muted); font-weight: 450; font-size: var(--t-sm); }
  .code span { font-family: var(--font-sans); }
  .school-name, .unit { display: block; }
  .unit { color: var(--muted); font-size: var(--t-sm); }
  .enrollment { display: inline-flex; align-items: center; justify-content: end; gap: var(--space-2); white-space: nowrap; }
  .meter { display: inline-flex; width: 2.25rem; height: 6px; border-radius: var(--radius-pill); background: var(--line); }
  .meter i { height: 100%; border-radius: inherit; background: var(--brand); }
  .muted { color: var(--muted); }
  .mobile-results { display: none; }
  .result-footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2) var(--space-4); margin-block-start: var(--space-3); }
  .result-footer p, .demo-note { margin: 0; color: var(--muted); font-size: var(--t-base); }
  .demo-note { margin-block-start: var(--space-1); font-size: var(--t-sm); }
  .empty-actions { display: flex; justify-content: center; flex-wrap: wrap; gap: var(--space-2); }
  .button { display: inline-flex; align-items: center; justify-content: center; min-height: var(--target-min); padding-inline: var(--space-3); border: 1px solid transparent; border-radius: var(--radius-control); text-decoration: none; font-weight: 650; }
  .button:hover { text-decoration: underline; }
  .primary { background: var(--brand); color: var(--on-brand); }
  .secondary { border-color: var(--control-line); }
  @media (max-width: 56rem) {
    .desktop-results { display: none; }
    .mobile-results { display: grid; gap: var(--space-2); }
    article { min-width: 0; padding: 0 var(--space-3) var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--panel-raised); font-size: var(--t-base); overflow-wrap: anywhere; }
    .card-heading { display: flex; justify-content: space-between; gap: var(--space-2); align-items: center; }
    .card-heading h2 { margin: 0; font-size: var(--t-md); line-height: var(--leading-tight); }
    .card-heading a { display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--space-1); min-height: var(--target-min); }
    .term { flex: none; padding: 0 var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-control); background: var(--panel); }
    .card-line { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 var(--space-2); color: var(--ink-2); }
    .card-line:not(.card-schedule) span + span::before { content: '·'; color: var(--muted); margin-inline-end: var(--space-2); }
    .card-schedule { justify-content: space-between; }
    .school-line strong { color: var(--ink); }
    .card-code { margin-block-start: var(--space-1); }
  }
  @media (max-width: 37rem) {
    .quick-filters { flex-wrap: nowrap; max-width: 100%; overflow-x: auto; padding: 3px var(--space-5) 3px 3px; scrollbar-width: thin; mask-image: linear-gradient(to right, black calc(100% - 1rem), transparent); }
    .quick-filters:focus-within { padding-inline-start: 3px; }
  }
</style>
