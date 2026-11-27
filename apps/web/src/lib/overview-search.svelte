<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { navigating, page } from '$app/state';
  import type { Offering, School } from '@unicourse/api-client';
  import type { PageData } from '../routes/$types';
  import { credits, requirement } from './format';
  import { departmentHref, instructorHref, overviewSearchHref, searchExamples, searchSorts } from './overview-paths';
  import OverviewSearchForm from './overview-search-form.svelte';
  import { scheduleLines } from './schedule';
  import { reportedCapacity } from './schools-offerings';
  import Badge from './ui/Badge.svelte';
  import DataTable from './ui/DataTable.svelte';
  import ErrorState from './ui/ErrorState.svelte';
  import FilterChip from './ui/FilterChip.svelte';
  import FilterSelect from './ui/FilterSelect.svelte';
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
  let hasFilters = $derived(Boolean(filters.school || filters.department || filters.term !== 'all'));
  let courses = $derived(result?.courses ?? []);
  let enrollmentMax = $derived(Math.max(1, ...courses.flatMap((course) =>
    [course.enrolled ?? 0, reportedCapacity(course) ?? 0])));
  let hasEnrollment = $derived(courses.some((course) => course.enrolled != null));
  let hasCapacity = $derived(courses.some((course) => reportedCapacity(course) != null));
  let hasOverCapacity = $derived(courses.some((course) => {
    const capacity = reportedCapacity(course);
    return course.enrolled != null && capacity != null && course.enrolled > capacity;
  }));
  let hasUnknownCapacity = $derived(courses.some((course) => course.enrolled != null && reportedCapacity(course) == null));
  let hasNoMeasures = $derived(courses.some((course) => course.enrolled == null && reportedCapacity(course) == null));
  let groupMode = $derived(filters.group ?? 'none');
  let groups = $derived.by(() => {
    const grouped = new Map<string, Offering[]>();
    for (const course of courses) {
      const key = groupMode === 'title' ? course.title : groupMode === 'term' ? course.term : course.id;
      let bucket = grouped.get(key);
      if (!bucket) grouped.set(key, bucket = []);
      bucket.push(course);
    }
    const entries = [...grouped];
    return groupMode === 'term' ? entries.sort(([left], [right]) => right.localeCompare(left, 'zh-TW', { numeric: true })) : entries;
  });
  let groupedCourses = $derived(groups.flatMap(([, rows]) => rows));
  let groupLabels = $derived(new Map<string, string>(groups.flatMap(([key, rows]): [string, string][] => {
    if (groupMode === 'term') return [[rows[0].id, `${key} 學期 · 本頁 ${rows.length} 班`]];
    if (groupMode === 'title' && rows.length > 1) return [[rows[0].id, `${key} · 本頁小計：${new Set(rows.map(({ school }) => school)).size} 校、${rows.length} 班`]];
    return [];
  })));
  let hasDemo = $derived(courses.some((course) => course.isDemo));
  let quickSchools = $derived(tally(courses, (course) => course.school).sort((left, right) => right[1] - left[1]));
  let quickTerms = $derived(tally(courses, (course) => course.term).sort((left, right) => right[0].localeCompare(left[0])));

  let isEmpty = $derived(result?.total === 0);
  let range = $derived(result && result.total ? `顯示 ${displayValue(result.offset + 1)}–${displayValue(result.offset + courses.length)} 班次` : '');
  let pending = $derived(navigating.to?.url.pathname === '/' && navigating.to.url.search !== page.url.search
    && (navigating.to.url.searchParams.has('q') || navigating.to.url.searchParams.has('term')));
  let tryCourseCode = $derived(/[a-z\d]/i.test(filters.query));
  let shorterCode = $derived(filters.query.match(/^([a-z]{1,10}\d{2,12}|\d{4,12})[-\s]+[a-z0-9]{1,4}$/i)?.[1]);
  let shortQuery = $derived(!shorterCode
    ? filters.query.match(/^([a-z\d]{2,})[-\s][\p{L}\d][\p{L}\d\s-]*$/iu)?.[1]
      ?? (/^\p{Script=Han}{4,}$/u.test(filters.query) ? Array.from(filters.query).slice(0, 2).join('') : '')
    : '');
  let browseSchools = $derived(search.browseSchools);
  let sortOptions = $derived(searchSorts.map(({ value, label }) => ({
    value, label: value === 'relevance' ? filters.query ? '關聯性' : '學期新到舊' : label
  })));
  let displayMenu = $state<HTMLDetailsElement>();
  let jumpNav = $state<HTMLElement>();
  let pagination = $state<HTMLElement>();
  let atPagination = $state(false);
  let hasSchedule = $derived(courses.some((course) => schedule(course).text));
  const nycuPeriods: Readonly<Record<string, string>> = { y: '06:00–06:50', z: '07:00–07:50', n: '12:20–13:10', a: '18:30–19:20', b: '19:30–20:20', c: '20:30–21:20', d: '21:30–22:20' };

  afterNavigate(() => {
    if (displayMenu?.open) {
      const restoreFocus = displayMenu.contains(document.activeElement);
      displayMenu.open = false;
      if (restoreFocus) displayMenu.querySelector('summary')?.focus({ preventScroll: true });
    }
    updateJump();
  });

  function updateJump() {
    if (!jumpNav || !pagination) return;
    const footer = pagination.getBoundingClientRect();
    const navBottom = jumpNav.getBoundingClientRect().bottom;
    const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    atPagination = footer.top <= navBottom + 24 || (atEnd && footer.top < window.innerHeight);
  }

  const allColumns: TableColumn<Offering>[] = [
    { id: 'course', label: '課程', width: '26%' },
    { id: 'school', label: '學校／開課單位', width: '18%' },
    { id: 'term', label: '學期', width: '4.5rem' },
    { id: 'instructors', label: '教師／時間地點' },
    { id: 'credits', label: '學分', numeric: true, width: '4rem' },
    { id: 'requirement', label: '必選修', width: '4.25rem' },
    { id: 'enrollment', label: '修課人數／名額', numeric: true, width: '13.5rem' }
  ];
  let available = $derived({
    instructors: hasSchedule || courses.some((course) => course.instructors.length),
    credits: courses.some((course) => course.credits != null),
    requirement: courses.some((course) => requirement(course)),
    enrollment: courses.some((course) => course.enrolled != null || reportedCapacity(course) != null)
  });
  let columns = $derived(allColumns.filter(({ id }) => available[id as keyof typeof available] ?? true));
  let order = $derived(groupMode !== 'none' ? undefined : filters.sort === 'enrolled' ? { column: 'enrollment', direction: 'descending' as const }
    : filters.sort === 'title' ? { column: 'course', direction: 'ascending' as const }
    : !filters.query ? { column: 'term', direction: 'descending' as const } : undefined);

  function courseHref(course: Offering) { return `/courses/${course.id}`; }
  function schedule(course: Offering) {
    const raw = scheduleLines(course).join('；');
    const text = raw.replace(/第 ([\da-z、]+) 節/gi, (slot, codes: string) => {
      const tokens = codes.toLowerCase().split('、');
      const periods = tokens.filter((code) => /^\d+$/.test(code));
      if (periods.length === tokens.length) return slot;
      const named = tokens.filter((code) => !/^\d+$/.test(code));
      const readable = course.school === 'nycu' ? named.flatMap((code) => nycuPeriods[code] ? [nycuPeriods[code]] : []) : [];
      return [...(periods.length ? [`第 ${periods.join('、')} 節`] : []), ...readable, ...(readable.length < named.length ? ['節次未辨識'] : [])].join('、');
    });
    return { text, raw: course.scheduleText ?? (raw !== text ? raw : undefined) };
  }
  function keywordMatch(text: string) {
    const query = filters.query;
    const start = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
    return start < 0 ? null : [text.slice(0, start), text.slice(start, start + query.length), text.slice(start + query.length)] as const;
  }
  function tally(offerings: Offering[], group: (course: Offering) => string) {
    const counts = new Map<string, number>();
    for (const offering of offerings) {
      const key = group(offering);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()];
  }
</script>

<svelte:window onscroll={updateJump} onresize={updateJump} />

<header class="search-header" id="search-top" tabindex="-1">
  <h1>{isEmpty ? '找不到符合條件的課程'
    : filters.query ? `搜尋「${filters.query}」` : '搜尋課程'}</h1>
  <p class="dek">
    <span role="status">
      {#if pending}<strong>正在搜尋班次…</strong><span aria-hidden="true"> · </span>
      {:else if result}<strong class="ui-tabular">{result.total > 0 ? '共 ' : ''}{displayValue(result.total)} 班次</strong><span aria-hidden="true"> · </span>{/if}
    </span>
    {schoolName || '所有學校'}<span aria-hidden="true"> · </span>{filters.term === 'all' ? '全部學期' : `${filters.term} 學期`}
    {#if filters.department}<span aria-hidden="true"> · </span>{filters.department}{/if}
  </p>
  {#if isEmpty && filters.query}<p class="empty-context">「{filters.query}」查無結果，{hasFilters ? '可放寬條件。' : '可試下方建議。'}</p>{/if}
</header>

{#if !isEmpty}
<section class="toolbar" aria-label="搜尋與篩選">
  <OverviewSearchForm {schools} {terms} {filters} {departments} externalSort={Boolean(result)} />
  {@render activeFilters()}
</section>
{/if}

{#snippet activeFilters()}
  {#if hasFilters}
    <div class="active-filters" role="group" aria-label="已套用的篩選">
      <span>已套用</span>
      {#if filters.school}<a class="active-chip" href={allSchools} aria-label={`移除篩選：${schoolName}`}>{schoolName} <span aria-hidden="true">×</span></a>{/if}
      {#if filters.term !== 'all'}<a class="active-chip" href={allTerms} aria-label={`移除篩選：${filters.term} 學期`}>{filters.term} 學期 <span aria-hidden="true">×</span></a>{/if}
      {#if filters.department}<FilterChip {url} name="department" label={filters.department} />{/if}
      {#if !isEmpty}<a class="clear" href={relaxed}>清除篩選</a>{/if}
    </div>
  {/if}
{/snippet}

{#snippet facets(kind: 'school' | 'term', entries: [string, number][])}
  <nav class="quick-filters" aria-label={kind === 'school' ? '依學校縮小範圍' : '依學期縮小範圍'}>
    {#each entries as [key, count] (key)}
      <a class="quick-chip" aria-current={kind === 'term' && filters.term === key ? 'true' : undefined}
        href={overviewSearchHref(kind === 'school' ? { ...filters, school: key, department: '' } : { ...filters, term: key })}>
        {kind === 'school' ? schools.find(({ slug }) => slug === key)?.name ?? key : key} <span class="ui-tabular">{displayValue(count)} 班</span>
      </a>
    {/each}
  </nav>
{/snippet}

{#snippet markMatch(text: string)}
  {@const match = keywordMatch(text)}{#if match}{match[0]}<mark>{match[1]}</mark>{match[2]}{:else}{text}{/if}
{/snippet}

{#snippet title(course: Offering)}
  <span class="course-title" title={course.title}>{@render markMatch(course.title)}</span>
  {#if course.isDemo}<Badge label="示範" tone="demo" />{/if}
{/snippet}

{#snippet code(course: Offering)}
  <span class="code" title={course.courseCode.endsWith('*') ? '星號為校方公布課號的一部分' : undefined}>{@render markMatch(course.courseCode)}{#if course.classCode} <span>· 班次 {course.classCode}</span>{:else if course.sourceId && course.sourceId !== course.courseCode}<span> · 選課代碼 {course.sourceId}</span>{/if}</span>
{/snippet}

{#snippet unit(course: Offering)}
  {#if course.department}<a href={departmentHref(course.school, course.department)}>{course.department}</a>{/if}
{/snippet}

{#snippet teachers(course: Offering)}
  {#each course.instructors.slice(0, course.instructors.length > 3 ? 1 : 3) as name, index}
    {#if index > 0}、{/if}<a href={instructorHref(course.school, name)}>{@render markMatch(name)}</a>
  {:else}教師未列{/each}
  {#if course.instructors.length > 3}<span title={course.instructors.join('、')}> 等 {course.instructors.length} 位</span>{/if}
{/snippet}

{#snippet category(course: Offering)}
  {@const full = requirement(course)}
  {@const singular = requirement({ requirement: course.requirement, requirementText: null })}
  <span title={full ?? '必選修未公布'}>{singular && full && Array.from(full).length > 8 ? singular : full ?? '—'}</span>
{/snippet}

{#snippet meterKey()}
  <p class="meter-key">
    {#if hasEnrollment}<span>本頁尺度：0–{displayValue(enrollmentMax)} 人</span>{/if}
    {#if hasCapacity}<span><i class="key-tick" aria-hidden="true"></i>刻線＝名額</span>{/if}
    {#if hasOverCapacity}<span><i class="key-over" aria-hidden="true"></i>橘＝超額</span>{/if}
    {#if hasUnknownCapacity}<span>無刻線＝未公布名額</span>{/if}
    {#if hasNoMeasures}<span>—＝修課人數／名額未公布</span>{/if}
  </p>
{/snippet}

{#snippet enrollment(course: Offering, mobile = false)}
  {@const enrolled = course.enrolled}
  {@const capacity = reportedCapacity(course)}
  <span class="enrollment ui-tabular">
    {#if hasEnrollment || hasCapacity}
      <span class="meter" aria-hidden="true">
        {#if enrolled != null}
          <span class="meter-fill" class:positive={enrolled > 0} style:width={`${100 * enrolled / enrollmentMax}%`}>
            {#if capacity != null && enrolled > capacity}
              <i class="excess" style:width={`${100 * (enrolled - capacity) / enrolled}%`}></i>
            {/if}
          </span>
        {/if}
        {#if capacity != null}<span class="capacity-marker" style:left={`${100 * capacity / enrollmentMax}%`}></span>{/if}
      </span>
    {/if}
    {#if mobile && (enrolled != null || capacity != null)}
      <span class="measure">
        {#if enrolled != null}<span><small>修課</small> {displayValue(enrolled)}</span>{:else}<span class="sr-only">修課人數未公布</span>{/if}
        {#if capacity != null}<span><small>名額</small> {displayValue(capacity)}</span>{:else}<span class="sr-only">名額未公布</span>{/if}
      </span>
    {:else if enrolled != null && capacity != null}
      <span class="measure" title={enrolled > capacity ? '修課人數超過校方公布名額；兩欄可能採不同口徑' : undefined}>
        <span class="sr-only">修課人數／名額：</span><span>{displayValue(enrolled)} / {displayValue(capacity)}</span>
      </span>
    {:else if enrolled != null}<span class="measure" title="名額未公布">{displayValue(enrolled)} 人<span class="sr-only">，名額未公布</span></span>
    {:else if capacity != null}<span class="measure">名額 {displayValue(capacity)}<small>人數未公布</small></span>
    {:else}<span class="measure muted" title="修課人數／名額未公布"><span aria-hidden="true">—</span><span class="sr-only">修課人數／名額未公布</span></span>{/if}
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
      <OverviewSearchForm {schools} {terms} {filters} {departments} empty
        keywordHint={tryCourseCode ? '試試完整課號（如 CS2001）、較短的課名或教師姓名。' : '可改用較短的課名、完整課號或教師姓名。'} />
      {#if hasFilters}
        <div class="empty-actions">
          {#if filters.term !== 'all'}<a class="text-action" href={allTerms}>查全部學期</a>{/if}
          {#if filters.school && allSchools !== relaxed}<a class="text-action" href={allSchools}>改搜所有學校</a>{/if}
          <a class="text-action" href={relaxed}>{filters.query ? '保留關鍵字，清除篩選' : '清除篩選'}</a>
        </div>
      {/if}
      <nav class="empty-examples" aria-label="搜尋建議">
        {#if search.suggestions.length}
          <strong>相近的關鍵字</strong>
          {#each search.suggestions as query (query)}<a class="button secondary" href={overviewSearchHref({ ...filters, query })}>試搜「{query}」</a>{/each}
        {:else}
          <strong>試試</strong>
          {#if shorterCode || shortQuery}
            <a class="button secondary" href={overviewSearchHref({ ...filters, query: shorterCode || shortQuery })}>{shorterCode ? `查課號 ${shorterCode}` : `試搜「${shortQuery}」`}</a>
          {/if}
          {#each shorterCode || shortQuery ? searchExamples.slice(0, 2) : searchExamples as query (query)}<a class="button secondary" href={overviewSearchHref({ query, term: 'all' })}>{query}</a>{/each}
        {/if}
      </nav>
      <nav class="empty-browse" aria-label="依學校瀏覽">
        {#if browseSchools.length}
          <h2>依校瀏覽：{filters.school ? '其他學校中' : ''}收錄學期最多的 {browseSchools.length} 校</h2>
          <p>前往學校頁，清除目前的搜尋條件。</p>
          <ul>{#each browseSchools as school (school.slug)}<li><a class="quick-chip" href={`/schools/${encodeURIComponent(school.slug)}`}><span class="browse-name">{school.name}</span><span class="ui-tabular">收錄 {school.termCount} 期</span><span aria-hidden="true">→</span></a></li>{/each}</ul>
        {/if}
        <a class="text-action" href="/schools">看所有學校 <span aria-hidden="true">→</span></a>
      </nav>
    </div>
  {:else}
    <div class="result-top">
      <div class="result-summary">
        <p class="ui-tabular range">{range}</p>
        {#if filters.sort === 'relevance' && filters.query}
          <p class="sort-note">關聯性依課號、課名優先；同分先看新學期，再看修課人數。</p>
        {/if}
      </div>
      {#if totalPages > 1}
        <div class="top-pagination"><Pagination {url} page={search.page} {totalPages} label="班次分頁（結果前）" /></div>
      {/if}
      <FilterSelect name="sort" form="course-search" label={groupMode === 'none' ? '排序' : '組內排序'} options={sortOptions} allLabel={null} value={filters.sort}
        onchange={(event) => event.currentTarget.form?.requestSubmit()} />
      <details bind:this={displayMenu}><summary>本頁分組</summary>
        <div class="display-options">
          <label class="result-sort">分組方式 <select form="course-search" name="group" onchange={(event) => event.currentTarget.form?.requestSubmit()}>
            <option value="" selected={groupMode === 'none'}>不分組</option>
            <option value="title" selected={filters.group === 'title'}>依課名分組</option>
            <option value="term" selected={filters.group === 'term'}>依學期分組</option>
          </select></label>
          <noscript><button class="button secondary" form="course-search">套用分組</button></noscript>
        </div>
      </details>
    </div>
    <div class="result-guide">
      {#if quickSchools.length > 1 || quickTerms.length > 1}
        <div class="facets">
          <p>{quickSchools.length > 1 ? `本頁學校 · ${quickSchools.length} 校` : `本頁學期 · ${quickTerms.length} 期`}<span> · 點選後篩選全部結果</span></p>
          {#if quickSchools.length > 1}{@render facets('school', quickSchools)}
          {:else}{@render facets('term', quickTerms)}{/if}
        </div>
      {/if}
      {@render meterKey()}
    </div>
    {#if totalPages > 1}
      <nav class="mobile-jumps" aria-label="搜尋頁內導覽" bind:this={jumpNav}>
        <a href="#search-list" aria-current={!atPagination ? 'location' : undefined}>班次</a>
        <a href="#search-pagination" aria-current={atPagination ? 'location' : undefined}>跳到分頁 ↓</a>
      </nav>
    {/if}
    <div class="desktop-results">
      {#key `${href}|${result.offset}`}
      <DataTable caption="開課班次" {columns} {order} rows={groupedCourses} rowKey={(course) => course.id} groupLabel={(row) => groupLabels.get(row.id)}
        minWidth="52rem" maxHeight="none" scrollHint={false}>
        {#snippet header(column, direction)}
          {#if column.id === 'course' || column.id === 'enrollment'}
            {@const sort = column.id === 'course' ? 'title' : 'enrolled'}
            <a class="sort-link" href={overviewSearchHref({ ...filters, sort, group: undefined })}>{column.label} <span aria-hidden="true">{direction === 'descending' ? '↓' : direction === 'ascending' ? '↑' : '↕'}</span></a>
            {#if column.id === 'enrollment'}<small class="header-note">本頁尺度</small>{/if}
          {:else if column.id === 'instructors'}
            {hasSchedule ? column.label : '教師'}
          {:else}{column.label}{#if direction}<span aria-hidden="true"> ↓</span>{/if}{/if}
        {/snippet}
        {#snippet cell(course, column)}
          {#if column.id === 'course'}
            <a class="title-line" href={courseHref(course)}>{@render title(course)}</a>
            <span class="code-line">{@render code(course)}</span>
          {:else if column.id === 'school'}
            <span class="school-name">{course.schoolName}</span>
            <span class="unit">{@render unit(course)}</span>
          {:else if column.id === 'term'}<span class="code">{course.term}</span>
          {:else if column.id === 'instructors'}
            {@const time = schedule(course)}
            {#if course.instructors.length || !time.text}{@render teachers(course)}{/if}
            {#if time.text}<span class="schedule-preview" title={time.raw ?? time.text}>{time.text}</span>{/if}
          {:else if column.id === 'credits'}{displayValue(course.credits)}
          {:else if column.id === 'requirement'}{@render category(course)}
          {:else if column.id === 'enrollment'}{@render enrollment(course)}{/if}
        {/snippet}
      </DataTable>
      {/key}
    </div>
    <div class="mobile-results" id="search-list" tabindex="-1">
      {#key `${href}|${result.offset}`}
      {#each groups as [key, rows] (key)}
        {#if groupMode === 'title' && rows.length > 1}
          <section class="course-group" aria-label={key}>
            <h2>{key} <span class="group-count">本頁 {new Set(rows.map(({ school }) => school)).size} 校、{rows.length} 班</span></h2>
            {#each rows as course (course.id)}{@render card(course, true)}{/each}
          </section>
        {:else}
          {#if groupMode === 'term'}<p class="term-group">{groupLabels.get(rows[0].id)}</p>{/if}
          {#each rows as course (course.id)}{@render card(course)}{/each}
        {/if}
      {/each}
      {/key}
    </div>
    {#snippet card(course: Offering, grouped = false)}
      {@const meetingTime = schedule(course)}
      {@const [firstSlot, ...otherSlots] = meetingTime.text.split('；')}
      <article>
        <h2 class="card-heading"><a href={courseHref(course)} aria-label={grouped ? `${course.title} · ${course.schoolName} · ${course.courseCode}` : undefined}>
            {#if grouped}{@render code(course)}{:else}{@render title(course)}{/if}
          </a>{#if !grouped} <span class="card-code">{@render code(course)}</span>{/if}</h2>
        <div class="card-facts">
          <div class="card-meta">
            <strong>{course.schoolName}</strong>
            <span class="term">{course.term}</span>
            {#if course.credits != null}<span>{credits(course.credits)}</span>{/if}
            {#if requirement(course)}{@render category(course)}{/if}
            {#if grouped && course.isDemo}<Badge label="示範" tone="demo" />{/if}
          </div>
          {@render enrollment(course, true)}
        </div>
        <div class="card-notes">
          {#if course.department}<span class="card-unit">{@render unit(course)}</span>{/if}
          {#if course.instructors.length}<span class="teachers">{@render teachers(course)}</span>{/if}
          {#if firstSlot}<p class="schedule-text" title={meetingTime.raw}>{firstSlot}</p>{/if}
          {#if otherSlots.length}
            <details class="card-schedule">
              <summary>另 {otherSlots.length} 個時段</summary>
              <ul>{#each otherSlots as line}<li>{line}</li>{/each}</ul>
            </details>
          {/if}
        </div>
      </article>
    {/snippet}
    <div class="result-footer" class:paged={totalPages > 1} id="search-pagination" tabindex="-1" bind:this={pagination}>
      {#if totalPages > 1}
        {#key `${href}|${result.offset}`}
          <Pagination {url} page={search.page} {totalPages} label="班次分頁（結果後）" jump compact showPageWords />
        {/key}
      {/if}
      <a class="back-to-top text-action" href="#search-top">回到頂端 ↑</a>
    </div>
    {#if hasDemo}<p class="demo-note">標示「示範」的班次不是校方實際開課資料。</p>{/if}
  {/if}
</section>

<style>
  .search-header { overflow-wrap: anywhere; }
  .empty-context { margin: var(--space-1) 0 0; color: var(--ink-2); font-size: var(--t-base); text-wrap: pretty; }
  h1 { margin: 0; font-size: var(--t-3xl); line-height: var(--leading-tight); letter-spacing: var(--tracking-heading); overflow-wrap: anywhere; text-wrap: balance; }
  .dek { margin: var(--space-1) 0 0; color: var(--muted); font-size: var(--t-base); }
  .dek strong { color: var(--ink); }
  .toolbar { margin-block-start: var(--space-2); padding: var(--space-2) var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .active-filters { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); margin-block-start: var(--space-2); color: var(--muted); font-size: var(--t-sm); }
  .active-chip, .clear, .quick-chip { display: inline-flex; align-items: center; gap: var(--space-2); min-height: var(--target-min); padding-inline: var(--space-3); border-radius: var(--radius-pill); font-weight: 600; }
  .active-chip { background: var(--brand-wash); color: var(--brand-ink); text-decoration: none; }
  .clear:hover, .active-chip:hover { text-decoration: underline; }
  .result-top { position: relative; }
  .result-top summary { min-height: var(--target-min); padding-inline: var(--space-1); align-content: center; cursor: pointer; color: var(--brand-ink); font-size: var(--t-sm); font-weight: 650; }
  .result-top details[open] summary { color: var(--ink); }
  .display-options { display: grid; gap: var(--space-2); position: absolute; inset: 100% 0 auto auto; z-index: 3; width: min(24rem, 100%); max-block-size: min(26rem, 45vh); overflow: auto; padding: var(--space-3); border: 1px solid var(--control-line); border-radius: var(--radius-card); background: var(--panel-raised); color: var(--ink-2); font-size: var(--t-sm); }
  .facets { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; column-gap: var(--space-3); min-width: 0; margin-block: var(--space-1); }
  .facets p, .sort-note { margin: 0; color: var(--muted); font-size: var(--t-sm); text-wrap: pretty; }
  .facets p { color: var(--ink-2); font-weight: 650; }
  .facets p span { color: var(--muted); font-weight: 450; }
  .facets .quick-filters { flex-wrap: nowrap; overflow-x: auto; padding: var(--space-1); margin-inline: calc(-1 * var(--space-1)); scrollbar-width: thin; }
  .facets .quick-chip { flex: none; white-space: nowrap; }
  .quick-chip[aria-current] { background: var(--brand-wash); color: var(--brand-ink); }
  .quick-filters { display: flex; flex-wrap: wrap; min-width: 0; align-items: center; gap: var(--space-1); margin: 0; font-size: var(--t-sm); }
  .quick-chip { max-width: 100%; padding-inline: var(--space-2); border: 1px solid var(--line); background: var(--panel-raised); color: var(--ink-2); font-size: var(--t-sm); overflow-wrap: anywhere; text-decoration: none; }
  .quick-chip span { min-width: 1.4rem; border-radius: var(--radius-pill); background: var(--panel-raised); text-align: center; }
  .quick-chip:hover { background: var(--brand-wash); color: var(--brand-ink); text-decoration: underline; }
  .results { min-width: 0; margin-block-start: var(--space-2); }
  .result-top { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); align-items: center; margin-block-end: var(--space-1); }
  .result-summary { margin-inline-end: auto; }
  .sort-link { display: inline-block; padding-block: var(--space-1); }
  .header-note { display: block; color: var(--muted); font-size: var(--t-sm); font-weight: 450; }
  .meter-key { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); margin: 0; color: var(--muted); font-size: var(--t-sm); font-weight: 450; }
  .meter-key > span { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
  .meter-key i { block-size: 4px; inline-size: .65rem; border-radius: 2px; }
  .meter-key .key-tick { inline-size: 1px; block-size: .65rem; background: var(--ink); }
  .key-over { background: var(--warn); }
  .course-group h2 { margin: var(--space-2) 0; font-size: var(--t-base); }
  .course-group { padding-block-end: var(--space-2); }
  .course-group summary { min-height: var(--target-min); align-content: center; color: var(--brand-ink); cursor: pointer; font-size: var(--t-base); font-weight: 650; }
  .group-count { display: inline-block; padding-inline: var(--space-2); border-radius: var(--radius-pill); background: var(--panel); color: var(--ink-2); font-size: var(--t-sm); }
  .course-group, .term-group { padding: 0 var(--space-3); margin: 0; border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--table-head); }
  .course-group article + article { margin-block-start: var(--space-1); }
  .term-group { padding-block: var(--space-2); color: var(--ink-2); font-weight: 650; }
  .range { margin: 0; color: var(--muted); font-size: var(--t-sm); }
  .result-sort { display: inline-flex; align-items: center; gap: var(--space-1); color: var(--muted); font-size: var(--t-sm); }
  .result-sort select { min-block-size: var(--target-min); min-inline-size: 0; max-inline-size: 8.25rem; padding-inline: var(--space-1); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--ink); font: inherit; }
  .desktop-results { --table-group-bg: var(--brand-wash); --table-group-font-size: .8125rem; --table-pad-block: 0.2rem; }
  .desktop-results :global(table) { table-layout: fixed; overflow-wrap: anywhere; font-size: 0.875rem; }
  .desktop-results :global(td a:not(:hover, :focus-visible)) { text-decoration: none; }
  .title-line { display: inline-flex; flex-wrap: wrap; gap: 0 var(--space-1); align-items: center; min-width: 0; max-width: 100%; }
  .title-line .course-title { min-width: 0; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; }
  .code, .term { font-family: var(--font-mono); color: var(--muted); font-weight: 450; font-size: var(--t-sm); }
  .code span { font-family: var(--font-sans); }
  .school-name, .unit { display: block; }
  .unit { color: var(--muted); font-size: var(--t-sm); }
  .code-line, .schedule-preview { display: block; color: var(--muted); font-size: var(--t-sm); font-weight: 450; }
  .enrollment { display: grid; grid-template-columns: minmax(1.75rem, 1fr) 7.25rem; align-items: center; gap: var(--space-2); }
  .measure { text-align: end; grid-column: 2; line-height: 1.25; }
  .measure.muted { font-size: var(--t-sm); }
  .measure small { display: block; color: var(--ink-2); font-size: var(--t-sm); line-height: 1.25; }
  .meter { position: relative; display: inline-flex; height: 6px; border-radius: var(--radius-pill); background: var(--line); }
  .meter-fill { display: flex; justify-content: end; height: 100%; border-radius: inherit; background: var(--brand); overflow: hidden; }
  .meter-fill.positive { min-inline-size: min(3px, 100%); }
  .meter .excess { height: 100%; background: var(--warn); }
  mark { background: var(--brand-wash); color: var(--brand-ink); border-radius: 2px; }
  .capacity-marker { position: absolute; inset-block: -2px; inline-size: 1px; background: var(--ink); }
  .sr-only { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); }
  .muted { color: var(--muted); }
  .mobile-results, .mobile-jumps { display: none; }
  .result-footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-1) var(--space-4); margin-block-start: var(--space-2); }
  .demo-note { margin: 0; color: var(--muted); font-size: var(--t-base); }
  .demo-note { margin-block-start: var(--space-1); font-size: var(--t-sm); }
  .empty-actions { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); margin-block-start: var(--space-1); }
  .empty-recovery { max-width: 47rem; margin: var(--space-3) 0 0; padding: clamp(.75rem, 3vw, 1.5rem); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); overflow-wrap: anywhere; }
  .empty-examples { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); margin-block-start: var(--space-4); font-size: var(--t-base); }
  .empty-examples .button { border-radius: var(--radius-pill); }
  .empty-browse { margin-block-start: var(--section-content-gap); padding-block-start: var(--space-3); border-block-start: 1px solid var(--line); }
  .empty-browse h2 { margin: 0; color: var(--ink); font-size: var(--t-base); }
  .empty-browse p { margin: 0 0 var(--space-2); color: var(--muted); font-size: var(--t-sm); text-wrap: pretty; }
  .empty-browse .quick-chip { gap: var(--space-1); border-color: var(--control-line); color: var(--brand-ink); }
  .empty-browse .quick-chip .ui-tabular { color: var(--muted); font-weight: 450; }
  .empty-browse .quick-chip span { background: transparent; min-width: 0; }
  .browse-name { font-size: var(--t-base); }

  .empty-browse ul { display: flex; flex-wrap: wrap; gap: var(--space-1); list-style: none; padding: 0; margin: 0; }
  .text-action { display: inline-flex; align-items: center; gap: var(--space-1); min-block-size: var(--target-min); }
  .button { display: inline-flex; align-items: center; justify-content: center; min-height: var(--target-min); padding-inline: var(--space-3); border: 1px solid transparent; border-radius: var(--radius-control); text-decoration: none; font: inherit; font-weight: 650; cursor: pointer; }
  .button:hover { text-decoration: underline; }
  .secondary { border-color: var(--control-line); }
  @media (min-width: 56.01rem) {
    .result-guide { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--space-3); }
    .facets { margin-block: 0; }
    .result-guide .meter-key:not(:only-child) { max-width: 21rem; }
    .desktop-results { --table-pad-block: .125rem; }
    .header-note { display: inline; margin-inline-start: var(--space-1); }
  }
  @media (max-width: 56rem) {
    .desktop-results, .top-pagination { display: none; }
    .facets { display: block; }
    .mobile-jumps { position: sticky; top: var(--shell-height); z-index: 4; display: flex; gap: var(--space-1); padding: var(--space-1); margin-inline: calc(-1 * var(--space-1)); overflow-x: auto; background: var(--bg); }
    .mobile-jumps a { flex: none; white-space: nowrap; }
    .mobile-jumps a[aria-current] { border-color: var(--brand-ring); background: var(--brand-wash); }
    .mobile-jumps ~ :is(.mobile-results, .result-footer) { scroll-margin-block-start: var(--target-min); }

    .mobile-jumps a { display: inline-grid; align-items: center; min-block-size: var(--target-min); min-inline-size: var(--target-min); padding-inline: var(--space-1); border: 1px solid var(--line); border-radius: var(--radius-control); text-align: center; text-decoration: none; font-size: var(--t-sm); font-weight: 650; }
    .mobile-jumps a:hover { background: var(--brand-wash); text-decoration: underline; }
    .mobile-results { display: grid; gap: var(--space-1); }
    .result-footer.paged { justify-content: center; padding: var(--space-1) var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--panel); }
    .result-footer.paged .back-to-top { justify-content: center; flex-basis: 100%; }
    .result-footer :global(.compact details form) { position: static; border: 0; padding-inline: 0; }
    article { position: relative; min-width: 0; padding: 0 var(--space-2) var(--space-1); border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--panel-raised); font-size: var(--t-base); line-height: 1.35; overflow-wrap: anywhere; }
    article h2.card-heading { margin: 0; padding-block-start: var(--space-1); font-size: var(--t-md); line-height: var(--leading-tight); }
    .card-facts { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: var(--space-2); align-items: center; }
    .card-heading a { display: inline; }
    .card-heading a::after { content: ''; position: absolute; inset: 0; border-radius: var(--radius-card); }
    .card-heading a:focus-visible { outline: none; }
    .card-heading a:focus-visible::after { inset: calc(var(--focus-offset) * 2); outline: var(--focus-ring); outline-offset: var(--focus-offset); }
    article:has(.card-heading a:is(:hover, :focus-visible)) { border-color: var(--brand-ring); }
    .card-meta .term { font-weight: 650; }

    .term { flex: none; color: var(--ink-2); }
    .card-meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: .125rem var(--space-2); color: var(--ink-2); font-size: var(--t-sm); }
    .card-unit { min-width: 0; }
    .card-meta strong { color: var(--ink); }
    .card-meta > span:not(.code, :global(.badge)) { padding-inline: .25rem; border-radius: var(--radius-pill); background: var(--chip); }
    .card-notes { display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--space-3); color: var(--muted); font-size: var(--t-sm); }
    .card-notes p { margin: 0; }
    .card-notes a, .card-schedule summary { position: relative; }
    .card-notes a { display: inline-flex; align-items: center; justify-content: center; min-width: var(--target-min); min-height: var(--target-min); }
    .card-unit + .teachers { border-inline-start: 1px solid var(--line); padding-inline-start: var(--space-2); }
    .card-schedule { flex-basis: 100%; }
    .card-schedule summary { width: fit-content; min-height: var(--target-min); align-content: center; color: var(--brand-ink); font-weight: 650; cursor: pointer; }
    .card-schedule ul { margin-block: 0 var(--space-2); padding-inline-start: var(--space-5); }
    .card-facts .enrollment { grid-template-columns: minmax(0, 1fr); justify-items: end; gap: .125rem; font-size: var(--t-sm); }
    .card-facts .meter { grid-row: 2; width: min(100%, 4.5rem); height: 4px; }
    .card-facts .measure { grid-area: 1 / 1; display: flex; gap: var(--space-1); white-space: nowrap; }
    .card-facts .measure small { display: inline; color: var(--muted); }
    .result-summary { flex-basis: 100%; }
    .result-top > :global(.field) { max-inline-size: min(13.5rem, 67%); }

  }
  @media (max-width: 37rem) {
    h1 { font-size: var(--t-2xl); }
    .toolbar { margin-block-start: var(--space-2); }
    .result-top { gap: 0 var(--space-1); }
    .result-top summary { padding-inline: 0; }
    .active-filters { flex-wrap: nowrap; overflow-x: auto; padding: 2px; }
    .active-filters > span:first-child { display: none; }
    .active-filters :is(a, button) { flex: none; white-space: nowrap; }
    .empty-browse ul { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .empty-browse .quick-chip { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-content: center; width: 100%; gap: 0 var(--space-1); border-radius: var(--radius-control); line-height: var(--leading-tight); }
    .empty-browse .quick-chip :is(.browse-name, .ui-tabular) { grid-column: 1; text-align: start; }
    .empty-browse .quick-chip span:last-child { grid-area: 1 / 2 / 3; align-self: center; }
    .empty-examples, .empty-browse { margin-block-start: var(--space-2); }
  }
</style>
