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
  let hasUnknownCapacity = $derived(courses.some((course) => reportedCapacity(course) == null));
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
  let range = $derived(result && result.total ? `顯示 ${displayValue(result.offset + 1)}–${displayValue(result.offset + courses.length)} 班次 · 共 ${displayValue(result.total)} 班次` : '');
  let pending = $derived(navigating.to?.url.pathname === '/' && navigating.to.url.search !== page.url.search
    && (navigating.to.url.searchParams.has('q') || navigating.to.url.searchParams.has('term')));
  let tryCourseCode = $derived(/[a-z\d]/i.test(filters.query));
  let shorterCode = $derived(filters.query.match(/^([a-z]{1,10}\d{2,12}|\d{4,12})[-\s]+[a-z0-9]{1,4}$/i)?.[1]);
  let browseSchools = $derived(search.browseSchools);
  let shortQuery = $derived(!shorterCode && /^\p{Script=Han}{4,}$/u.test(filters.query) ? Array.from(filters.query).slice(0, 2).join('') : '');
  let sortLabel = $derived(filters.sort === 'relevance' && !filters.query ? '學期新到舊' : searchSorts.find(({ value }) => value === filters.sort)?.label);
  let displayMenu = $state<HTMLDetailsElement>();
  let facetMenu = $state<HTMLDetailsElement>();
  const nycuPeriods: Readonly<Record<string, string>> = { y: '06:00–06:50', z: '07:00–07:50', n: '12:20–13:10', a: '18:30–19:20', b: '19:30–20:20', c: '20:30–21:20', d: '21:30–22:20' };

  afterNavigate(() => {
    for (const menu of [displayMenu, facetMenu]) {
      if (!menu?.open) continue;
      const restoreFocus = menu.contains(document.activeElement);
      menu.open = false;
      if (restoreFocus) menu.querySelector('summary')?.focus({ preventScroll: true });
    }
  });

  const allColumns: TableColumn<Offering>[] = [
    { id: 'course', label: '課程', width: '23%' },
    { id: 'school', label: '學校／開課單位', width: '16%' },
    { id: 'term', label: '學期', width: '4.5rem' },
    { id: 'instructors', label: '教師／時間地點' },
    { id: 'credits', label: '學分', numeric: true, width: '4rem' },
    { id: 'requirement', label: '必選修', width: '4.25rem' },
    { id: 'enrollment', label: '修課人數／名額', numeric: true, width: '13.5rem' }
  ];
  let available = $derived({
    instructors: courses.some((course) => course.instructors.length || schedule(course).text !== '時地未公布'),
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
    return { text: text || '時地未公布', raw: course.scheduleText ?? (raw !== text ? raw : undefined) };
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

<header class="search-header" class:empty-heading={isEmpty} id="search-top" tabindex="-1">
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
  {#if isEmpty && filters.query}<p class="dek"><b>關鍵字</b> 「{filters.query}」</p>{/if}
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

{#snippet facets(kind: 'school' | 'term', entries: [string, number][], additional = false)}
  <nav class="quick-filters" aria-label={kind === 'school' ? additional ? '其他學校篩選' : '依學校縮小範圍' : '依學期縮小範圍'}>
    {#each entries as [key, count] (key)}
      <a class="quick-chip" href={overviewSearchHref(kind === 'school' ? { ...filters, school: key, department: '' } : { ...filters, term: key })}>
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
  <span class="meter-key">
    {#if hasEnrollment}<span>條長＝人數（0–{displayValue(enrollmentMax)} 人）</span>{/if}
    {#if hasCapacity}<span><i class="key-tick" aria-hidden="true"></i>刻線＝名額</span>{/if}
    {#if hasOverCapacity}<span><i class="key-over" aria-hidden="true"></i>橘＝超額</span>{/if}
    {#if hasUnknownCapacity}<span><i class="key-unknown" aria-hidden="true"></i>灰＝名額未公布</span>{/if}
  </span>
{/snippet}

{#snippet enrollment(course: Offering, mobile = false)}
  {@const enrolled = course.enrolled}
  {@const capacity = reportedCapacity(course)}
  <span class="enrollment ui-tabular">
    {#if hasEnrollment || hasCapacity}
      <span class="meter" class:unrated={capacity == null} aria-hidden="true">
        {#if enrolled != null}
          <i style:width={`${100 * Math.min(enrolled, capacity ?? enrolled) / enrollmentMax}%`}></i>
          {#if capacity != null && enrolled > capacity}<i class="excess" style:width={`${100 * (enrolled - capacity) / enrollmentMax}%`}></i>{/if}
        {/if}
        {#if capacity != null}<span class="capacity-marker" style:left={`${100 * capacity / enrollmentMax}%`}></span>{/if}
      </span>
    {/if}
    {#if enrolled != null && capacity != null}
      <span class="measure" title={enrolled > capacity ? '修課人數超過校方公布名額；兩欄可能採不同口徑' : undefined}>
        <span class="sr-only">修課人數／名額：</span><span>{displayValue(enrolled)} / {displayValue(capacity)}</span>
      </span>
    {:else if enrolled != null}<span class="measure" title="名額未公布"><span>{displayValue(enrolled)} 人</span>{#if mobile}<small>名額未公布</small>{:else}<span class="sr-only">，名額未公布</span>{/if}</span>
    {:else if capacity != null}<span class="measure">名額 {displayValue(capacity)}<small>人數未公布</small></span>
    {:else}<span class="measure muted">修課人數／名額未公布</span>{/if}
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
        keywordHint={tryCourseCode ? '試試完整課號，例如 CS2001，或輸入較短的課名。' : '可改用較短的課名、完整課號或教師全名。'} />
      {@render activeFilters()}
      {#if shorterCode || shortQuery && !search.suggestions.length || hasFilters}
        <div class="empty-actions">
          {#if shorterCode}<a class="text-action" href={overviewSearchHref({ ...filters, query: shorterCode })}>移除班別，查課號 {shorterCode}</a>
          {:else if shortQuery && !search.suggestions.length}<a class="text-action" href={overviewSearchHref({ ...filters, query: shortQuery })}>試搜「{shortQuery}」</a>{/if}
          {#if filters.term !== 'all'}<a class="text-action" href={allTerms}>查全部學期</a>{/if}
          {#if filters.school && allSchools !== relaxed}<a class="text-action" href={allSchools}>改搜所有學校</a>{/if}
          {#if hasFilters}<a class="text-action" href={relaxed}>{filters.query ? '保留關鍵字，清除篩選' : '清除篩選'}</a>{/if}
        </div>
      {/if}
      <nav class="empty-examples" aria-label="搜尋建議"><strong>{search.suggestions.length ? '相近的關鍵字' : '搜尋範例'}</strong>
        {#each search.suggestions.length ? search.suggestions : searchExamples as query (query)}<a class="button secondary" href={overviewSearchHref(search.suggestions.length ? { ...filters, query } : { query, term: 'all' })}>{search.suggestions.length ? `試搜「${query}」` : query}</a>{/each}
      </nav>
      <nav class="empty-browse" aria-label="依學校瀏覽">
        {#if browseSchools.length}
          <h2>依校瀏覽</h2>
          <p>依收錄學期數推薦前 {browseSchools.length} 所{filters.school ? '其他' : ''}學校。</p>
          <ul>{#each browseSchools as school (school.slug)}<li><a class="quick-chip" href={`/schools/${encodeURIComponent(school.slug)}`}>{school.name} <span class="ui-tabular">{school.termCount} 期</span></a></li>{/each}</ul>
        {/if}
        <a class="text-action" href="/schools">看所有學校 <span aria-hidden="true">→</span></a>
      </nav>
    </div>
  {:else}
    <div class="result-top">
      <div class="result-summary">
        <p class="ui-tabular range">{range}</p>
        <p class="sort-status">排序 · {sortLabel}{#if groupMode !== 'none'}（組內）{/if}</p>
      </div>
      {#if totalPages > 1}
        <div class="top-pagination"><Pagination {url} page={search.page} {totalPages} label="班次分頁（結果前）" /></div>
        <nav class="mobile-jumps" aria-label="搜尋頁內導覽">
          <a href="#search-list" aria-label="跳至班次清單">班次</a>
          <a href="#search-pagination" aria-label="跳至分頁">分頁 ↓</a>
        </nav>
      {/if}
      <details name="result-options" bind:this={displayMenu}><summary>結果顯示</summary>
        <div class="display-options">
          <label class="result-sort">排序 <select form="course-search" name="sort" onchange={(event) => event.currentTarget.form?.requestSubmit()}>
            {#each searchSorts as option (option.value)}<option value={option.value} selected={option.value === filters.sort}>{option.label}</option>{/each}
          </select></label>
          <label class="result-sort">本頁分組 <select form="course-search" name="group" onchange={(event) => event.currentTarget.form?.requestSubmit()}>
            <option value="" selected={groupMode === 'none'}>不分組</option>
            <option value="title" selected={filters.group === 'title'}>依課名分組</option>
            <option value="term" selected={filters.group === 'term'}>依學期分組</option>
          </select></label>
          <noscript><button class="button secondary" form="course-search">套用顯示</button></noscript>
          <p>關聯性優先比對完整課號或課名，再比對開頭、詞句與教師；同分依學期、修課人數排序。</p>
          <a href="/#coverage">資料來源</a>
        </div>
      </details>
    </div>
    {#if quickSchools.length > 1 || quickTerms.length > 1}
      <div class="facet-strip">
        {#if quickSchools.length === 2 && quickTerms.length <= 1}
          <span class="facet-label">本頁學校 · {quickSchools.length} 校</span>
        {/if}
        {#if quickSchools.length > 2 || quickTerms.length > 1}
          <details bind:this={facetMenu}>
            <summary>{quickSchools.length > 1 ? `本頁學校 · ${quickSchools.length} 校` : `本頁學期 · ${quickTerms.length} 期`}</summary>
            <p>數量為本頁班次，點選後篩選全部結果。</p>
            {#if quickSchools.length > 2}{@render facets('school', quickSchools.slice(2), true)}{/if}
            {#if quickTerms.length > 1}{@render facets('term', quickTerms)}{/if}
          </details>
        {/if}
        {#if quickSchools.length > 1}{@render facets('school', quickSchools.slice(0, 2))}{/if}
      </div>
    {/if}
    {#if hasEnrollment || hasCapacity}
      <p class="mobile-meter-key"><strong>修課人數／名額</strong> {@render meterKey()}</p>
    {/if}
    <div class="desktop-results">
      {#key `${href}|${result.offset}`}
      <DataTable caption="開課班次" {columns} {order} rows={groupedCourses} rowKey={(course) => course.id} groupLabel={(row) => groupLabels.get(row.id)}
        minWidth="52rem" maxHeight="none" scrollHint={false}>
        {#snippet header(column, direction)}
          {#if column.id === 'course' || column.id === 'enrollment'}
            {@const sort = column.id === 'course' ? 'title' : 'enrolled'}
            <a class="sort-link" href={overviewSearchHref({ ...filters, sort, group: undefined })}>{column.label} <span aria-hidden="true">{direction === 'descending' ? '↓' : direction === 'ascending' ? '↑' : '↕'}</span></a>
            {#if column.id === 'enrollment'}{@render meterKey()}{/if}
          {:else}{column.label}{#if direction}<span aria-hidden="true"> ↓</span>{/if}{#if column.id === 'instructors'}<small class="header-note">— 表示時地未公布</small>{/if}{/if}
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
            {#if course.instructors.length || !time.raw}{@render teachers(course)}{/if}
            <span class="schedule-preview" title={time.raw ?? time.text}>{time.text === '時地未公布' ? '—' : time.text}</span>
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
        <div class="card-heading">
          <h2><a href={courseHref(course)} aria-label={grouped ? `${course.title} · ${course.schoolName} · ${course.courseCode}` : undefined}>
            {#if grouped}{@render code(course)}{:else}{@render title(course)}{/if}
          </a></h2>
          {@render enrollment(course, true)}
        </div>
        <div class="card-meta">
          <strong>{course.schoolName}</strong>
          <span class="term">{course.term}</span>
          {#if course.credits != null}<span>{credits(course.credits)}</span>{/if}
          {#if requirement(course)}{@render category(course)}{/if}
          {#if !grouped}{@render code(course)}{/if}
          {#if grouped && course.isDemo}<Badge label="示範" tone="demo" />{/if}
        </div>
        <div class="card-notes">
          {#if course.department}<span class="card-unit">{@render unit(course)}</span>{/if}
          {#if course.instructors.length}<span class="teachers">{@render teachers(course)}</span>{/if}
          {#if otherSlots.length}
            <details class="card-schedule">
              <summary><span title={meetingTime.raw}>{firstSlot}</span> <b>另 {otherSlots.length} 個時段</b></summary>
              <ul>{#each otherSlots as line}<li>{line}</li>{/each}</ul>
            </details>
          {:else}
            <p class="schedule-text" title={meetingTime.raw}>{firstSlot}</p>
          {/if}
        </div>
      </article>
    {/snippet}
    {#if totalPages > 1}
      <div class="result-footer" id="search-pagination" tabindex="-1">
        {#key `${href}|${result.offset}`}
          <Pagination {url} page={search.page} {totalPages} label="班次分頁（結果後）" jump compact />
        {/key}
      </div>
    {/if}
    <a class="back-to-top text-action" href="#search-top">回到頂端 ↑</a>
    {#if hasDemo}<p class="demo-note">標示「示範」的班次不是校方實際開課資料。</p>{/if}
  {/if}
</section>

<style>
  .search-header { overflow-wrap: anywhere; }
  .empty-heading { max-width: 47rem; margin-inline: auto; }
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
  .display-options p { margin: 0; }
  .facet-strip { display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--space-2); margin-block-end: var(--space-2); }
  .facet-strip details[open] { flex-basis: 100%; }
  .facet-strip :is(p, summary), .facet-label { color: var(--muted); font-size: var(--t-sm); }
  .facet-strip p { margin: 0; }
  .facet-strip summary { width: fit-content; min-height: var(--target-min); align-content: center; color: var(--brand-ink); cursor: pointer; }
  .quick-filters { display: flex; flex-wrap: wrap; min-width: 0; align-items: center; gap: var(--space-1); margin: 0; font-size: var(--t-sm); }
  .quick-chip { max-width: 100%; padding-inline: var(--space-2); border: 1px solid var(--line); background: var(--panel-raised); color: var(--ink-2); font-size: var(--t-sm); overflow-wrap: anywhere; text-decoration: none; }
  .quick-chip span { min-width: 1.4rem; border-radius: var(--radius-pill); background: var(--panel-raised); text-align: center; }
  .quick-chip:hover { background: var(--brand-wash); color: var(--brand-ink); text-decoration: underline; }
  .results { min-width: 0; margin-block-start: var(--space-2); }
  .result-top { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); align-items: center; margin-block-end: var(--space-1); }
  .result-summary { margin-inline-end: auto; }
  .sort-status { margin: 0; color: var(--ink-2); font-size: var(--t-sm); }
  .sort-link { display: inline-block; padding-block: var(--space-1); }
  .header-note { display: block; color: var(--muted); font-size: var(--t-sm); font-weight: 450; }
  .meter-key { display: flex; flex-wrap: wrap; justify-content: end; gap: 0 var(--space-2); color: var(--muted); font-size: var(--t-sm); font-weight: 450; }
  .meter-key > span { display: inline-flex; align-items: center; gap: 3px; }
  .meter-key i { block-size: 4px; inline-size: .65rem; border-radius: 2px; }
  .meter-key .key-tick { inline-size: 1px; block-size: .65rem; background: var(--ink); }
  .key-unknown { background: var(--muted); }
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
  .meter i { height: 100%; background: var(--brand); }
  .meter i:first-child { border-start-start-radius: inherit; border-end-start-radius: inherit; }
  .meter i:last-of-type { border-start-end-radius: inherit; border-end-end-radius: inherit; }
  .meter.unrated i { background: var(--muted); }
  .meter .excess { background: var(--warn); }
  mark { background: var(--brand-wash); color: var(--brand-ink); border-radius: 2px; }
  .capacity-marker { position: absolute; inset-block: -2px; inline-size: 1px; background: var(--ink); }
  .sr-only { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); }
  .muted { color: var(--muted); }
  .mobile-results, .mobile-meter-key, .mobile-jumps { display: none; }
  .result-footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2) var(--space-4); margin-block-start: var(--space-3); }
  .demo-note { margin: 0; color: var(--muted); font-size: var(--t-base); }
  .demo-note { margin-block-start: var(--space-1); font-size: var(--t-sm); }
  .empty-actions { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); margin-block-start: var(--space-1); }
  .empty-recovery { max-width: 47rem; margin: var(--space-4) auto 0; padding: clamp(.75rem, 3vw, 1.5rem); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); overflow-wrap: anywhere; }
  .empty-recovery p { margin: var(--space-1) 0 var(--space-2); color: var(--ink-2); font-size: var(--t-sm); text-wrap: pretty; }
  .empty-examples { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); margin-block-start: var(--space-4); font-size: var(--t-base); }
  .empty-examples .button { border-radius: var(--radius-pill); }
  .empty-browse { margin-block-start: var(--section-content-gap); padding-block-start: var(--space-3); border-block-start: 1px solid var(--line); }
  .empty-browse h2 { margin: 0; color: var(--ink-2); font-size: var(--t-base); }
  .empty-browse ul { display: flex; flex-wrap: wrap; gap: var(--space-1); list-style: none; padding: 0; margin: 0; }
  .text-action { display: inline-flex; align-items: center; gap: var(--space-1); min-block-size: var(--target-min); }
  .button { display: inline-flex; align-items: center; justify-content: center; min-height: var(--target-min); padding-inline: var(--space-3); border: 1px solid transparent; border-radius: var(--radius-control); text-decoration: none; font: inherit; font-weight: 650; cursor: pointer; }
  .button:hover { text-decoration: underline; }
  .secondary { border-color: var(--control-line); }
  @media (max-width: 56rem) {
    .desktop-results, .top-pagination { display: none; }
    .mobile-jumps { display: inline-flex; align-items: center; gap: var(--space-1); }
    .mobile-jumps a { display: inline-grid; align-items: center; min-block-size: var(--target-min); min-inline-size: var(--target-min); padding-inline: var(--space-1); border: 1px solid var(--line); border-radius: var(--radius-control); text-align: center; text-decoration: none; font-size: var(--t-sm); font-weight: 650; }
    .mobile-jumps a:hover { background: var(--brand-wash); text-decoration: underline; }
    .mobile-meter-key { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); margin: 0 0 var(--space-2); font-size: var(--t-sm); }
    .mobile-meter-key .meter-key { display: contents; }
    .meter-key > span { white-space: nowrap; }
    .facet-label { margin-inline-end: var(--space-1); }
    .mobile-results { display: grid; gap: var(--space-1); }
    .result-footer { justify-content: center; padding: var(--space-1) var(--space-2); border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--panel); }
    .result-footer :global(.compact details form) { position: static; border: 0; padding-inline: 0; }
    article { min-width: 0; padding: 0 var(--space-2) var(--space-1); border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--panel-raised); font-size: var(--t-base); line-height: 1.35; overflow-wrap: anywhere; }
    .card-heading { display: grid; grid-template-columns: minmax(0, 1fr) 7.25rem; column-gap: var(--space-2); align-items: center; }
    .card-heading h2 { min-width: 0; margin: 0; font-size: var(--t-md); line-height: var(--leading-tight); }
    .card-heading a { display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--space-1); min-height: var(--target-min); padding-block: .125rem; }
    .term { flex: none; color: var(--ink-2); }
    .card-meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: .125rem var(--space-2); color: var(--ink-2); font-size: var(--t-sm); }
    .card-unit { min-width: 0; }
    .card-meta strong { color: var(--ink); }
    .card-meta > span:not(.code, :global(.badge)) { padding-inline: .25rem; border-radius: var(--radius-pill); background: var(--chip); }
    .card-notes { display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--space-3); color: var(--muted); font-size: var(--t-sm); }
    .card-notes p { margin: 0; }
    .card-notes a { display: inline-flex; align-items: center; justify-content: center; min-width: var(--target-min); min-height: var(--target-min); }
    .card-unit + .teachers { border-inline-start: 1px solid var(--line); padding-inline-start: var(--space-2); }
    .card-schedule[open] { flex-basis: 100%; }
    .card-schedule summary { min-height: var(--target-min); align-content: center; cursor: pointer; }
    .card-schedule summary b { margin-inline-start: var(--space-1); color: var(--brand-ink); white-space: nowrap; }
    .card-schedule ul { margin-block: 0 var(--space-2); padding-inline-start: var(--space-5); }
    .card-heading .enrollment { grid-template-columns: minmax(0, 1fr); justify-items: end; gap: .125rem; font-size: var(--t-sm); }
    .card-heading .meter { grid-row: 2; width: min(100%, 4.5rem); height: 4px; }
    .card-heading .measure { grid-area: 1 / 1; }
    .card-heading .measure small { display: inline; margin-inline-start: var(--space-1); }
  }
  @media (max-width: 37rem) {
    h1 { font-size: var(--t-2xl); }
    .toolbar { margin-block-start: var(--space-2); }
    .result-top { gap: 0 var(--space-1); }
    .result-summary { flex: 1 0 8rem; }
    .result-top summary { white-space: nowrap; }
    .active-filters { flex-wrap: nowrap; overflow-x: auto; padding: 2px; }
    .active-filters > span:first-child { display: none; }
    .active-filters :is(a, button) { flex: none; white-space: nowrap; }
  }
</style>
