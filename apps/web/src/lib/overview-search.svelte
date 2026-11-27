<script lang="ts">
  import { navigating, page } from '$app/state';
  import type { Offering, School } from '@unicourse/api-client';
  import type { PageData } from '../routes/$types';
  import { credits, requirement } from './format';
  import { departmentHref, instructorHref, overviewSearchHref, searchSorts } from './overview-paths';
  import OverviewSearchForm from './overview-search-form.svelte';
  import { scheduleLines } from './schedule';
  import { reportedCapacity } from './schools-offerings';
  import Badge from './ui/Badge.svelte';
  import DataTable from './ui/DataTable.svelte';
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
  let sortLabel = $derived(searchSorts.find(({ value }) => value === filters.sort)?.label);
  let hasFilters = $derived(Boolean(filters.school || filters.department || filters.term !== 'all'));
  let courses = $derived(result?.courses ?? []);
  let enrollmentMax = $derived(Math.max(1, ...courses.flatMap((course) =>
    course.enrolled == null ? [] : [course.enrolled, reportedCapacity(course) ?? 0])));
  let hasEnrollment = $derived(courses.some((course) => course.enrolled != null));
  let hasReportedCapacity = $derived(courses.some((course) => course.enrolled != null && reportedCapacity(course) != null));
  let hasDemo = $derived(courses.some((course) => course.isDemo));
  let quickSchools = $derived(tally(courses, (course) => course.school).sort((left, right) => right[1] - left[1]));
  let quickTerms = $derived(tally(courses, (course) => course.term).sort((left, right) => right[0].localeCompare(left[0])));
  let quickFacet: 'school' | 'term' | null = $derived(quickSchools.length > 1 ? 'school' : quickTerms.length > 1 ? 'term' : null);
  let isEmpty = $derived(result?.total === 0);
  let range = $derived(result && result.total ? `顯示 ${displayValue(result.offset + 1)}–${displayValue(result.offset + courses.length)} 筆 · 共 ${displayValue(result.total)} 筆` : '');
  let pending = $derived(navigating.to?.url.pathname === '/' && navigating.to.url.search !== page.url.search
    && (navigating.to.url.searchParams.has('q') || navigating.to.url.searchParams.has('term')));
  let queryLabel = $derived(Array.from(filters.query).length > 24 ? `${Array.from(filters.query).slice(0, 24).join('')}…` : filters.query);

  const allColumns: TableColumn<Offering>[] = [
    { id: 'course', label: '課程', width: '23%', sortable: true, value: (course) => course.title },
    { id: 'school', label: '學校／開課單位', width: '18%', sortable: true, value: (course) => course.schoolName },
    { id: 'term', label: '學期', width: '5rem', sortable: true, value: (course) => course.term },
    { id: 'instructors', label: '教師' },
    { id: 'credits', label: '學分', numeric: true, width: '4.25rem', sortable: true, value: (course) => course.credits },
    { id: 'requirement', label: '必選修', width: '6rem' },
    { id: 'enrollment', label: '修課人數／名額', numeric: true, width: '10rem', sortable: true, value: (course) => course.enrolled }
  ];
  let available = $derived({
    instructors: courses.some((course) => course.instructors.length),
    credits: courses.some((course) => course.credits != null),
    requirement: courses.some((course) => requirement(course)),
    enrollment: courses.some((course) => course.enrolled != null || reportedCapacity(course) != null)
  });
  let columns = $derived(allColumns.filter(({ id }) => available[id as keyof typeof available] ?? true));

  function courseHref(course: Offering) { return `/courses/${course.id}`; }
  function schedule(course: Offering) { return scheduleLines(course).join('；') || undefined; }
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
  <p class="eyebrow">UniCourse <span>／</span> 大學課程觀測站</p>
  <h1>{queryLabel ? `搜尋「${queryLabel}」` : '搜尋課程'}</h1>
  <p class="dek">
    <span role="status">
      {#if pending}<strong>正在搜尋班次…</strong><span aria-hidden="true"> · </span>
      {:else if result}<strong class="ui-tabular">{result.total > 0 ? '共 ' : ''}{displayValue(result.total)} 班次</strong><span aria-hidden="true"> · </span>{/if}
    </span>
    {schoolName || '所有學校'}<span aria-hidden="true"> · </span>{filters.term === 'all' ? '全部學期' : `${filters.term} 學期`}
    {#if filters.department}<span aria-hidden="true"> · </span>{filters.department}{/if}
  </p>
</header>

{#if !isEmpty}
<section class="toolbar" aria-label="搜尋與篩選">
  <OverviewSearchForm {schools} {terms} {filters} {departments} externalSort={Boolean(result)} />
  {#if hasFilters && !isEmpty}
    <div class="active-filters" role="group" aria-label="已套用的篩選">
      <span>已套用</span>
      {#if filters.school}<a class="active-chip" href={allSchools} aria-label={`移除篩選：${schoolName}`}>{schoolName} <span aria-hidden="true">×</span></a>{/if}
      {#if filters.term !== 'all'}<a class="active-chip" href={allTerms} aria-label={`移除篩選：${filters.term} 學期`}>{filters.term} 學期 <span aria-hidden="true">×</span></a>{/if}
      {#if filters.department}<FilterChip {url} name="department" label={filters.department} />{/if}
      <a class="clear" href={relaxed}>清除篩選</a>
    </div>
  {/if}
</section>
{/if}

{#snippet facets(kind: 'school' | 'term')}
    {#if kind === 'school' && quickSchools.length > 1}
      <nav class="quick-filters" aria-label="依學校縮小範圍">
        <strong>{quickSchools.length > 3 ? '本頁班次最多的 3 校' : '本頁學校'}</strong>
        {#each quickSchools.slice(0, 3) as [school, count] (school)}
          <a class="quick-chip" href={overviewSearchHref({ ...filters, school })}>{schools.find((item) => item.slug === school)?.name ?? school} <span class="ui-tabular">{displayValue(count)}</span></a>
        {/each}
      </nav>
    {/if}
    {#if kind === 'term' && quickTerms.length > 1}
      <nav class="quick-filters" aria-label="依學期縮小範圍">
        <strong>{quickTerms.length > 3 ? '本頁最近的 3 學期' : '本頁學期'}</strong>
        {#each quickTerms.slice(0, 3) as [term, count] (term)}
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
  {#each course.instructors.slice(0, course.instructors.length > 3 ? 1 : 3) as name, index}
    {#if index > 0}、{/if}<a href={instructorHref(course.school, name)}>{name}</a>
  {:else}—{/each}
  {#if course.instructors.length > 3}<span title={course.instructors.join('、')}> 等 {course.instructors.length} 位</span>{/if}
{/snippet}

{#snippet category(course: Offering)}
  {@const full = requirement(course)}
  {@const singular = requirement({ requirement: course.requirement, requirementText: null })}
  <span title={full ?? '必選修未公布'}>{singular && full && Array.from(full).length > 8 ? singular : full ?? '—'}</span>
{/snippet}

{#snippet enrollment(course: Offering, mobile: boolean)}
  {@const enrolled = course.enrolled}
  {@const capacity = reportedCapacity(course)}
  <span class="enrollment ui-tabular">
    {#if hasEnrollment}
      <span class="meter" class:missing={enrolled == null} class:over={enrolled != null && capacity != null && enrolled > capacity} aria-hidden="true">
        {#if enrolled != null}<i style:width={`${100 * enrolled / enrollmentMax}%`}></i>{/if}
        {#if enrolled != null && capacity != null}<span class="capacity-marker" style:left={`${100 * capacity / enrollmentMax}%`}></span>{/if}
      </span>
    {/if}
    {#if enrolled != null && capacity != null}
      <span class="measure" title={enrolled > capacity ? '修課人數超過校方公布名額；兩欄可能採不同口徑' : undefined}>
        <span class="sr-only">修課人數／名額：</span><span>{displayValue(enrolled)} / {displayValue(capacity)}</span>
      </span>
    {:else if enrolled != null}<span class="measure" title="名額未公布">{displayValue(enrolled)} 人</span>
    {:else if capacity != null}<span class="measure muted">名額 {displayValue(capacity)}</span>
    {:else}<span class="measure muted" title="修課人數／名額未公布">{mobile ? '修課人數／名額未公布' : '—'}</span>{/if}
  </span>
{/snippet}

{#snippet returnHome()}<a class="button secondary" href="/#course-search">回首頁搜尋</a>{/snippet}

<section class="results" aria-label="搜尋結果" aria-busy={pending}>
  {#if !result}
    <ErrorState title={invalid ? '無法使用這個搜尋條件' : '暫時無法取得搜尋結果'}
      description={invalid ? '關鍵字最多 100 字，不可包含換行；也可清除條件後再查一次。' : '目前無法連線到課程資料庫，搜尋條件已保留。'}
      retryHref={invalid ? undefined : overviewSearchHref({ ...filters, page: search.page })} action={invalid ? returnHome : undefined} />
  {:else if !result.total}
    <div class="empty-recovery">
      <h2>{filters.query ? `找不到「${filters.query}」的課程` : '找不到符合條件的課程'}</h2>
      <p>{hasFilters ? '可放寬學校、學期或開課單位的限制。' : '試試課號、較短的課名或教師全名。'}</p>
      <form method="GET" action="/" class="retry-search" aria-label="更改關鍵字">
        {#if filters.school}<input type="hidden" name="school" value={filters.school} />{/if}
        {#if filters.department}<input type="hidden" name="department" value={filters.department} />{/if}
        <input type="hidden" name="term" value={filters.term} />
        <input type="hidden" name="sort" value={filters.sort} />
        <label for="retry-keyword">關鍵字</label>
        <input id="retry-keyword" type="search" name="q" value={filters.query} maxlength="100" placeholder="課名、教師或課號" />
        <button class="button primary">重新搜尋</button>
      </form>
      <div class="empty-actions">
        {#if hasFilters}<a class="button secondary" href={relaxed}>{filters.query ? '保留關鍵字，清除篩選' : '清除篩選'}</a>{/if}
        {#if search.suggestion}<a class="button secondary" href={overviewSearchHref({ ...filters, query: search.suggestion })}>試搜「{search.suggestion}」</a>{/if}
        <a class="text-action" href="/schools">從學校瀏覽 <span aria-hidden="true">→</span></a>
      </div>
      <details class="edit-search"><summary id="edit-course-search">修改關鍵字與篩選</summary>
        <div class="empty-actions">
          {#if filters.term !== 'all' && allTerms !== relaxed}<a class="text-action" href={allTerms}>查全部學期</a>{/if}
          {#if filters.school && allSchools !== relaxed}<a class="text-action" href={allSchools}>改搜所有學校</a>{/if}
        </div>
        <OverviewSearchForm {schools} {terms} {filters} {departments} />
      </details>
    </div>
  {:else}
    {#if quickFacet}
      {@render facets(quickFacet)}
    {/if}
    <div class="result-top">
      <p class="ui-tabular range">{range}</p>
      <label class="result-sort">排序 <select form="course-search" name="sort" onchange={(event) => event.currentTarget.form?.requestSubmit()}>
        {#each searchSorts as option (option.value)}<option value={option.value} selected={option.value === filters.sort}>{option.label}</option>{/each}
      </select></label>
      <noscript><button class="button secondary" form="course-search">套用排序</button></noscript>
      <details class="distribution"><summary>ⓘ 排序與口徑</summary>
        <p>全體班次：{sortLabel}。桌機表頭只排序本頁。{hasEnrollment ? '人數條以本頁同一尺度呈現' : '本頁未公布修課人數'}{hasReportedCapacity ? '；刻線為校方公布名額，橘色表示人數超過名額' : ''}。<a href="/#coverage">資料來源</a></p>
      </details>
      <Pagination {url} page={search.page} {totalPages} label="班次分頁（結果前）" />
    </div>
    {#if hasEnrollment}
      <p class="meter-legend"><span>條長＝本頁同尺度的修課人數</span>{#if hasReportedCapacity}<span><i class="key-normal"></i>紫＝名額內／未公布名額</span><span><i class="key-over"></i>橘＝超額</span><span><i class="key-mark"></i>刻線＝校方公布名額</span>{/if}</p>
    {/if}
    <div class="desktop-results">
      {#key `${href}|${result.offset}`}
      <DataTable caption="開課班次｜— 表示未公布" {columns} rows={courses} rowKey={(course) => course.id}
        clientSort minWidth="52rem" maxHeight="none" scrollHint={false}>
        {#snippet cell(course, column)}
          {#if column.id === 'course'}
            {@const time = schedule(course)}
            <a class="title-line" href={courseHref(course)}>{@render title(course)}</a>
            <span class="code-line">{@render code(course)}</span>
            {#if time}<span class="schedule-preview" title={time}>{time}</span>{/if}
          {:else if column.id === 'school'}
            <span class="school-name">{course.schoolName}</span>
            <span class="unit">{@render unit(course)}</span>
          {:else if column.id === 'term'}<span class="code">{course.term}</span>
          {:else if column.id === 'instructors'}{@render teachers(course)}
          {:else if column.id === 'credits'}{displayValue(course.credits)}
          {:else if column.id === 'requirement'}{@render category(course)}
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
          <div class="card-line school-line">
            <strong>{course.schoolName}</strong>
            {#if course.department}<span class="card-unit" title={course.department}>{@render unit(course)}</span>{/if}
          </div>
          {#if course.instructors.length || meetingTime}<p class="schedule-text">{#if course.instructors.length}{@render teachers(course)}{/if}{#if course.instructors.length && meetingTime}<span aria-hidden="true"> · </span>{/if}{meetingTime ?? ''}</p>{/if}
          <div class="card-bottom">
            <div class="card-code"><span class="term">{course.term}</span>{@render code(course)}{#if course.credits != null}<span>{credits(course.credits)}</span>{/if}{#if requirement(course)}<span class="card-requirement">{@render category(course)}</span>{/if}</div>
            {@render enrollment(course, true)}
          </div>
        </article>
      {/each}
    </div>
    <div class="result-footer">
      {#if totalPages > 1}<p class="ui-tabular">{range}</p>{/if}
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
  .toolbar { margin-block-start: var(--space-2); padding: var(--space-2) var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .edit-search[open] { padding-block-end: var(--space-2); }
  .active-filters { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); margin-block-start: var(--space-2); color: var(--muted); font-size: var(--t-sm); }
  .active-chip, .clear, .quick-chip { display: inline-flex; align-items: center; gap: var(--space-2); min-height: var(--target-min); padding-inline: var(--space-3); border-radius: var(--radius-pill); font-weight: 600; }
  .active-chip { background: var(--brand-wash); color: var(--brand-ink); text-decoration: none; }
  .clear:hover, .active-chip:hover { text-decoration: underline; }
  .distribution, .result-top { position: relative; }
  .distribution summary, .edit-search summary { width: fit-content; min-height: var(--target-min); align-content: center; cursor: pointer; color: var(--brand-ink); font-size: var(--t-sm); font-weight: 650; }
  .distribution p { position: absolute; inset: 100% auto auto 0; z-index: 2; width: min(20rem, 80vw); margin: 0; padding: var(--space-3); border: 1px solid var(--control-line); border-radius: var(--radius-card); background: var(--panel-raised); color: var(--muted); font-size: var(--t-sm); }
  .quick-filters { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-2); margin: 0; padding: 2px; font-size: var(--t-sm); }
  .quick-filters .quick-chip { flex: none; border: 1px solid var(--line); }
  .quick-chip { max-width: 100%; background: var(--panel-raised); color: var(--ink-2); font-size: var(--t-sm); overflow-wrap: anywhere; text-decoration: none; }
  .quick-chip span { min-width: 1.4rem; border-radius: var(--radius-pill); background: var(--panel-raised); text-align: center; }
  .quick-chip:hover { background: var(--brand-wash); color: var(--brand-ink); text-decoration: underline; }
  .results { min-width: 0; margin-block-start: var(--space-2); }
  .result-top { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); align-items: center; margin-block-end: var(--space-1); }
  .result-top :global(nav[aria-label='班次分頁（結果前）']) { margin-inline-start: auto; }
  .range { margin: 0; color: var(--muted); font-size: var(--t-sm); }
  .result-sort { display: inline-flex; align-items: center; gap: var(--space-1); color: var(--muted); font-size: var(--t-sm); }
  .result-sort select, .retry-search input { min-block-size: var(--target-min); min-inline-size: 0; padding-inline: var(--space-2); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--ink); font: inherit; }
  .meter-legend { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); margin: 0 0 var(--space-2); color: var(--muted); font-size: var(--t-sm); }
  .meter-legend span { display: inline-flex; gap: var(--space-1); align-items: center; }
  .meter-legend i { display: inline-block; inline-size: .9em; block-size: .4em; border-radius: var(--radius-pill); background: var(--brand); }
  .meter-legend .key-over { background: var(--warn); }
  .meter-legend .key-mark { inline-size: 1px; block-size: 1em; border-radius: 0; background: var(--ink); }
  .desktop-results { --table-pad-block: 0.35rem; }
  .desktop-results :global(table) { table-layout: fixed; overflow-wrap: anywhere; font-size: 0.875rem; }
  .desktop-results :global(td a:not(:hover, :focus-visible)) { text-decoration: none; }
  .title-line { display: inline-flex; flex-wrap: wrap; gap: 0 var(--space-1); align-items: center; min-width: 0; max-width: 100%; }
  .title-line .course-title { min-width: 0; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; }
  .code, .term { font-family: var(--font-mono); color: var(--muted); font-weight: 450; font-size: var(--t-sm); }
  .code span { font-family: var(--font-sans); }
  .school-name, .unit { display: block; }
  .unit { color: var(--muted); font-size: var(--t-sm); }
  .code-line, .schedule-preview { display: block; color: var(--muted); font-size: var(--t-sm); font-weight: 450; }
  .schedule-preview { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; line-clamp: 1; overflow: hidden; }
  .enrollment { display: inline-flex; align-items: center; justify-content: end; gap: var(--space-2); white-space: nowrap; }
  .measure { min-width: 8ch; text-align: end; }
  .meter { position: relative; flex: 0 0 2.75rem; display: inline-flex; height: 6px; border-radius: var(--radius-pill); background: var(--line); }
  .meter.missing { visibility: hidden; }
  .meter i { height: 100%; border-radius: inherit; background: var(--brand); }
  .meter.over i { background: var(--warn); }
  .capacity-marker { position: absolute; inset-block: -2px; inline-size: 1px; background: var(--ink); }
  .sr-only { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); }
  .muted { color: var(--muted); }
  .mobile-results { display: none; }
  .result-footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2) var(--space-4); margin-block-start: var(--space-3); }
  .result-footer p, .demo-note { margin: 0; color: var(--muted); font-size: var(--t-base); }
  .demo-note { margin-block-start: var(--space-1); font-size: var(--t-sm); }
  .empty-actions { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-3); margin-block-start: var(--space-2); }
  .empty-recovery { max-inline-size: 35rem; margin-inline: auto; padding: var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); overflow-wrap: anywhere; }
  .empty-recovery :is(h2, p) { margin: 0 0 var(--space-2); }
  .empty-recovery h2 { font-size: var(--t-xl); }
  .empty-recovery p { color: var(--muted); font-size: var(--t-base); }
  .retry-search { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--space-1) var(--space-2); }
  .retry-search label { grid-column: 1 / -1; font-size: var(--t-sm); font-weight: 650; }
  .retry-search input { font-size: 1rem; }
  .text-action { display: inline-flex; align-items: center; gap: var(--space-1); min-block-size: var(--target-min); }
  .button { display: inline-flex; align-items: center; justify-content: center; min-height: var(--target-min); padding-inline: var(--space-3); border: 1px solid transparent; border-radius: var(--radius-control); text-decoration: none; font: inherit; font-weight: 650; cursor: pointer; }
  .button:hover { text-decoration: underline; }
  .primary { background: var(--brand); color: var(--on-brand); }
  .secondary { border-color: var(--control-line); }
  @media (max-width: 56rem) {
    .desktop-results { display: none; }
    .mobile-results { display: grid; gap: var(--space-2); }
    article { min-width: 0; padding: 0 var(--space-3) var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--panel-raised); font-size: var(--t-base); overflow-wrap: anywhere; }
    .card-heading { display: flex; justify-content: space-between; gap: var(--space-2); align-items: center; }
    .card-heading h2 { min-width: 0; margin: 0; font-size: var(--t-md); line-height: var(--leading-tight); }
    .card-heading a { display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--space-1); min-height: var(--target-min); }
    .term { flex: none; padding: 0 var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-control); background: var(--panel); }
    .card-line { display: flex; align-items: baseline; gap: var(--space-2); color: var(--ink-2); }
    .card-unit { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .school-line strong { color: var(--ink); }
    .card-requirement, .schedule-text { color: var(--ink-2); font-size: var(--t-sm); }
    .schedule-text { margin: var(--space-1) 0 0; }
    .card-bottom { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-1) var(--space-2); margin-block-start: var(--space-1); padding-block-start: var(--space-1); border-block-start: 1px solid var(--line); }
    .card-code { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-1); font-size: var(--t-sm); }
    .enrollment { margin-inline-start: auto; font-size: var(--t-sm); }
  }
  @media (max-width: 37rem) {
    h1 { font-size: var(--t-2xl); }
    .eyebrow { display: none; }
    .toolbar { margin-block-start: var(--space-2); }
    .distribution p { inset-inline: auto 0; }
    .result-top :global(nav[aria-label='班次分頁（結果前）']) { margin-inline-start: 0; }
  }
</style>
