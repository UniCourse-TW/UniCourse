<script lang="ts">
  import { page } from '$app/state';
  import { importedAt, isHttpUrl, shortImportedAt } from '$lib/format';
  import { departmentHref, schoolHref } from '$lib/overview-paths';
  import SchoolsOfferingTable from '$lib/schools-offering-table.svelte';
  import SchoolsDepartmentHistory from '$lib/schools-department-history.svelte';
  import SchoolsSectionLinks from '$lib/schools-section-links.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import ErrorState from '$lib/ui/ErrorState.svelte';
  import FilterSelect from '$lib/ui/FilterSelect.svelte';
  import Pagination from '$lib/ui/Pagination.svelte';
  import SectionHeader from '$lib/ui/SectionHeader.svelte';
  import { changeQuery, displayValue } from '$lib/ui/format';
  import '$lib/schools-browse.css';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let department = $derived(data.department);
  let base = $derived(departmentHref(department.school, department.department));
  let termLabel = $derived(data.term === 'all' ? '所有學期' : `${data.term} 學期`);
  let distribution = $derived([
    { label: '必修', count: data.breakdown.required, color: 'var(--seq-4)' },
    { label: '選修', count: data.breakdown.elective, color: 'var(--seq-2)' },
    { label: '通識', count: data.breakdown.general, color: 'var(--series-3)' },
    { label: '其他', count: data.breakdown.other, color: 'var(--series-4)' },
    { label: '未分類', count: data.breakdown.unknown, color: 'var(--axis)' }
  ].filter(({ count }) => count > 0));
  let termOptions = $derived([...new Set([...data.terms, data.term].filter((term) => term !== 'all'))].sort().reverse());
  let termsByYear = $derived.by(() => {
    const years = new Map<string, string[]>();
    for (const term of termOptions) {
      const year = term.split('-')[0];
      const terms = years.get(year);
      if (terms) terms.push(term);
      else years.set(year, [term]);
    }
    return [...years];
  });
  let hasSearch = $derived(Boolean(data.query || page.url.searchParams.has('sort')));
  let orderOptions = $derived([
    ...(data.query ? [{ value: 'relevance', label: '關鍵字相關度' }] : [{ value: 'relevance', label: '學期最新' }]),
    { value: 'enrolled', label: '修課人數最多' }, { value: 'title', label: '依課名排序' }
  ]);
  const classOptions = [{ value: 'required', label: '必修' }, { value: 'elective', label: '選修' }];
  let classLabel = $derived(classOptions.find(({ value }) => value === data.classFilter)?.label ?? '不限類別');
  let hasFilters = $derived(hasSearch || Boolean(data.classFilter));
  let clearHref = $derived(`${base}?term=${encodeURIComponent(data.term)}#offerings`);
  let tableOrder = $derived(
    data.sort === 'title' ? { column: 'course', direction: 'ascending' } as const :
    data.sort === 'enrolled' ? { column: 'enrollment', direction: 'descending' } as const : undefined
  );
  let historical = $derived([...(data.trends ?? [])].reverse());
  let courseCount = $derived(data.complete ? data.courses : data.trends?.find(({ term }) => term === data.term)?.courses ?? null);

  function termHref(term: string) {
    return changeQuery(new URL(page.url.pathname + page.url.search, page.url), (params) => {
      params.set('term', term);
      params.delete('page');
    }) + '#offerings';
  }

  function classHref(value: string) {
    return changeQuery(new URL('#offerings', page.url), (params) => {
      params.delete('page');
      if (value) params.set('class_filter', value);
      else params.delete('class_filter');
    });
  }

</script>

<svelte:head><title>{department.department} · {department.schoolName}｜UniCourse</title></svelte:head>

<div class="browse-page department-page">
  <nav class="browse-crumbs" aria-label="所在位置">
    <a href="/">查課</a><span aria-hidden="true">/</span><a href="/schools">學校</a><span aria-hidden="true">/</span><a href={schoolHref(department.school)}>{department.schoolName}</a>
  </nav>
  <header class="browse-head" id="department-top" tabindex="-1">
    <div class="browse-stack department-heading">
      <h1>{department.department}</h1>
      <p class="browse-dek"><span>{department.schoolName}課程資料 · {displayValue(data.terms.length)} 學期</span>{#if data.updatedAt}<span>匯入 <time datetime={data.updatedAt} title={importedAt(data.updatedAt)}>{shortImportedAt(data.updatedAt)}</time>・臺北時間</span>{/if}</p>
      {#if data.website && isHttpUrl(data.website)}
        <a class="browse-button department-website" href={data.website} rel="external">校方官網 ↗</a>
      {/if}
    </div>
  </header>
  <SchoolsSectionLinks sections={[{ id: 'offerings', label: '課表' }, { id: 'department-history', label: '歷年開課變化' }]} />

  <section class="browse-stack timetable" id="offerings" aria-labelledby="timetable-title">
    <nav class="semester-picker" aria-label="切換學期">
      <div class="term-links semester-links">
        <span class="control-label" aria-hidden="true">學期</span>
        {#each ['all', ...termOptions.slice(0, 6)] as term, index (term)}
          <a href={termHref(term)} class:wide-term={index > 2} aria-current={term === data.term ? 'true' : undefined}>{term === 'all' ? '所有學期' : term}</a>
        {/each}
      </div>
      {#if termOptions.length > 2}
        {#key data.term}
          <details class:wide-picker={termOptions.length <= 6}>
            <summary>按學年 <span aria-hidden="true">⌄</span></summary>
            <ul class="semester-years" aria-label="依學年切換學期" role="list">
              {#each termsByYear as [year, terms] (year)}
                <li>
                  <strong>{year} 學年</strong>
                  <div class="term-links">
                    {#each [...terms].reverse() as term (term)}
                      <a href={termHref(term)} aria-label={`${term} 學期`} aria-current={term === data.term ? 'true' : undefined}>{term}</a>
                    {/each}
                  </div>
                </li>
              {/each}
            </ul>
          </details>
        {/key}
      {/if}
    </nav>
    <div>
      <SectionHeader title={`${termLabel}課表`} id="timetable-title" />
      <p class="browse-note"><strong>{displayValue(data.total)} 班</strong>{#if courseCount !== null} · {displayValue(courseCount)} 門課{/if}{#if data.complete} · {displayValue(data.teachers)} 位授課教師{/if}</p>
    </div>
    <div class="timetable-toolbar">
      <nav class="term-links class-links" aria-label={data.classInPage ? '本頁班次類別' : '班次類別'}>
        <span class="control-label" aria-hidden="true">類別</span>
        {#each [{ value: '', label: '不限類別' }, ...classOptions] as option (option.value)}
          <a href={classHref(option.value)} aria-current={option.value === data.classFilter ? 'true' : undefined}>{option.label}</a>
        {/each}
      </nav>
      {#if distribution.length}
        <div class="distribution">
          <ul aria-label="必選修分布（班次）" role="list">
            {#each distribution as { label, count, color } (label)}
              <li><span style:background={color} aria-hidden="true"></span>{label} <strong class="ui-tabular">{displayValue(count)}</strong></li>
            {/each}
          </ul>
          {#if distribution.length > 1}
            <div class="segments" aria-hidden="true">
              {#each distribution as { label, count, color } (label)}<span style:flex-grow={count} style:background={color}></span>{/each}
            </div>
          {/if}
          {#if !data.complete}<p class="browse-note">統計樣本：{displayValue(data.sampleSize)} 班。</p>{/if}
        </div>
      {/if}
      {#key data.query + ':' + (page.url.searchParams.get('sort') ?? '')}
        <form class="timetable-controls" action={`${base}#offerings`} method="GET" aria-label="課表篩選">
          <input type="hidden" name="term" value={data.term} />
          {#if data.classFilter}<input type="hidden" name="class_filter" value={data.classFilter} />{/if}
          <label class="timetable-search">
            <span>搜尋</span>
            <input type="search" name="q" defaultValue={data.query} maxlength="100" placeholder="課名、教師或課號" aria-label="搜尋教師或課程" />
          </label>
          <div class="timetable-options">
            <FilterSelect name="sort" label="排序" allLabel={null} value={data.sort} options={orderOptions} />
            <button class="browse-button">套用</button>
          </div>
        </form>
      {/key}
    </div>
    {#if hasFilters}
      <div class="filter-summary">
        <p class="browse-note">{termLabel}・{classLabel}{#if data.query}・「{data.query}」{/if}{#if page.url.searchParams.has('sort')}・{orderOptions.find(({ value }) => value === data.sort)?.label}{/if}</p>
        <a href={clearHref}>清除篩選</a>
      </div>
    {/if}
    {#if data.classInPage}
      <p class="browse-note">類別僅篩選本頁{#if data.term === 'all'}，可選擇單一學期縮小範圍{/if}。</p>
    {/if}
    {#if data.resultsError}
      <ErrorState title="暫時無法載入課表" retryHref={page.url.pathname + page.url.search + '#offerings'} />
    {:else if data.offerings.length}
      <div class="results-summary">
        {#if data.query || data.totalPages > 1 || data.classFilter}
          <p class="browse-note results-count">
            {#if data.totalPages > 1 && !data.classInPage}{displayValue(data.firstRow)}–{displayValue(data.firstRow + data.offerings.length - 1)}／{/if}{displayValue(data.classInPage ? data.offerings.length : data.matches)} 班{#if data.classInPage}符合本頁類別{/if}
          </p>
        {/if}
        {#if data.totalPages > 1}
          <div class="top-pagination"><Pagination url={new URL('#offerings', page.url)} page={data.page} totalPages={data.totalPages} label="課表上方分頁" /></div>
        {/if}
        <p class="browse-note import-note">匯入時：修課人數／校方名額（人）。{#if data.offerings.some(({ credits }) => credits === 0)} <span>0 學分依校方資料。</span>{/if}</p>
      </div>
      <SchoolsOfferingTable offerings={data.offerings} ratings={data.ratings} mode="department" caption={`${termLabel}開課班次`} showTerm={data.term === 'all'} order={tableOrder} />
    {:else}
      {#snippet showAllTerms()}<a href={termHref('all')}>查看所有學期</a>{/snippet}
      <EmptyState title={data.classInPage ? '本頁沒有此類別的班次' : data.query || data.classFilter ? '沒有符合條件的班次' : `${termLabel}沒有開課紀錄`} description={data.classInPage ? '可切換類別或查看其他頁。' : data.query ? '試試其他教師名、課名或課號。' : data.classFilter ? '可切換類別或學期。' : '可切換上方學期，查看這個開課單位的課表。'} action={data.query || data.classFilter ? undefined : showAllTerms} />
    {/if}
    {#if !data.resultsError && data.totalPages > 1}
      <div class="table-footer">
        <Pagination url={new URL('#offerings', page.url)} page={data.page} totalPages={data.totalPages} label="課表分頁" />
        <a class="back-link" href="#offerings">↑ 回到課表篩選</a>
      </div>
    {/if}
  </section>

  <section class="browse-stack history" aria-labelledby="department-history">
    <SectionHeader title="歷年開課變化" id="department-history" />
    {#if data.trends === null}
      <ErrorState title="暫時無法取得歷年開課統計" retryHref={page.url.pathname + page.url.search} />
    {:else}
      <SchoolsDepartmentHistory rows={historical} term={data.term} {termHref} />
    {/if}
  </section>

  <a class="back-link" href="#department-top">↑ 回到頂端</a>
</div>

<style>
  .department-page { --t-sm: max(13px, .75rem); --t-xs: max(13px, .6875rem); }
  .department-page, .department-page .browse-stack { gap: var(--space-2); }
  .department-page { margin-block-start: calc(-1 * var(--space-3)); }
  .department-page .browse-crumbs + .browse-head { margin-block-start: calc(-1 * var(--space-2)); }
  .browse-note { text-wrap: pretty; }
  .department-page :global(.state .action a) { display: inline-flex; align-items: center; min-block-size: var(--target-min); min-inline-size: var(--target-min); }
  .department-heading { grid-template-columns: minmax(0, 1fr) auto; align-items: center; }
  .department-heading .browse-dek { grid-column: 1 / -1; }
  .department-website { grid-column: 2; grid-row: 1; white-space: nowrap; }
  .browse-head h1 { font-size: clamp(1.5rem, 4vw, 2rem); }
  .department-page :global(:is(#department-top, #offerings, #department-history)) { scroll-margin-block-start: 4.5rem; }
  .history { margin-block-start: var(--space-4); padding-block-start: var(--space-4); border-block-start: 1px solid var(--line); }
  .results-summary { display: flex; align-items: baseline; flex-wrap: wrap; gap: var(--space-2); }
  .import-note:not(:first-child) { padding-inline-start: var(--space-2); border-inline-start: 1px solid var(--line); }
  .import-note span { white-space: nowrap; }
  .results-count { color: var(--ink-2); }
  .filter-summary { display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--space-2); }
  .filter-summary a { display: inline-grid; align-items: center; min-block-size: var(--target-min); white-space: nowrap; }
  .table-footer, .timetable-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-1) var(--space-2); }
  .back-link { display: inline-grid; align-items: center; justify-self: start; min-block-size: var(--target-min); font-size: var(--t-base); }
  .timetable-toolbar { justify-content: start; }
  .timetable-controls { flex: 1 1 100%; display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-2); }
  .timetable-options { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
  .timetable-options button { display: inline-grid; align-items: center; min-block-size: var(--target-min); min-inline-size: var(--target-min); text-align: center; }
  .term-links { display: flex; align-items: center; gap: .25rem; }
  .term-links a { flex: none; display: inline-grid; place-items: center; min-height: var(--target-min); min-width: var(--target-min); border-radius: var(--radius-control); padding: 0 .625rem; background: var(--chip); color: var(--ink-2); font-size: var(--t-sm); text-decoration: none; font-variant-numeric: tabular-nums; }
  .term-links a[aria-current] { background: var(--brand-wash); color: var(--brand-ink); font-weight: 750; box-shadow: inset 0 -2px var(--brand); }
  .control-label { flex: none; margin-inline-end: var(--space-1); color: var(--ink-2); font-size: var(--t-sm); font-weight: 650; }
  .term-links a:hover { background: var(--brand-wash); }
  .semester-picker { display: flex; align-items: center; flex-wrap: wrap; gap: .25rem; min-inline-size: 0; }
  .semester-picker details { position: relative; }
  .semester-picker summary { display: flex; align-items: center; gap: .35rem; min-block-size: var(--target-min); padding-inline: .55rem; border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--brand-ink); font-size: var(--t-sm); font-weight: 650; cursor: pointer; white-space: nowrap; }
  .semester-picker summary::-webkit-details-marker { display: none; }
  .semester-picker details[open] summary { background: var(--brand-wash); }
  .semester-picker details[open] summary > span:last-child { transform: rotate(180deg); }
  .semester-years { position: absolute; z-index: 4; inset-inline-end: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); inline-size: 15rem; gap: var(--space-2) var(--space-3); max-block-size: min(50vh, 22rem); overflow-y: auto; margin: var(--space-1) 0 0; padding: var(--space-2); list-style: none; background: var(--panel-raised); border: 1px solid var(--control-line); border-radius: var(--radius-panel); box-shadow: var(--shadow-sm); font-size: var(--t-sm); }
  .semester-years li { display: grid; gap: .25rem; align-content: start; }
  .semester-years .term-links { flex-wrap: wrap; }
  .timetable-search { display: flex; align-items: center; flex: 1 1 13rem; gap: var(--space-2); min-inline-size: 0; padding-inline-start: var(--space-2); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); font-size: var(--t-sm); font-weight: 650; color: var(--ink-2); }
  .timetable-search > span { white-space: nowrap; }
  .timetable-controls input[type='search'] { flex: 1; min-inline-size: 0; min-height: var(--target-min); padding-inline: var(--space-1) var(--space-2); border: 0; border-radius: var(--radius-control); background: transparent; color: var(--ink); font: inherit; font-size: 1rem; font-weight: 400; }
  .timetable-search:has(input:focus-visible) { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  input:focus-visible { outline: none; }
  input::placeholder { color: var(--muted); opacity: 1; }
  .distribution { display: grid; flex: 0 1 13rem; gap: .3rem; }
  .segments { display: flex; gap: 2px; height: 6px; overflow: hidden; border-radius: var(--radius-pill); }
  .segments > span { min-inline-size: 3px; flex-basis: 0; }
  .distribution ul { display: flex; flex-wrap: wrap; list-style: none; gap: .25rem .65rem; padding: 0; margin: 0; font-size: var(--t-sm); }
  .distribution li { display: flex; align-items: baseline; gap: .35rem; white-space: nowrap; }
  .distribution li span { inline-size: .55rem; block-size: .55rem; border-radius: 50%; }
  @media (min-width: 40.0625rem) {
    .department-page { grid-template-areas: 'crumbs crumbs' 'heading links' 'timetable timetable' 'history history' 'top top'; grid-template-columns: minmax(0, 1fr) auto; }
    .browse-crumbs { grid-area: crumbs; }
    .browse-head { grid-area: heading; }
    .timetable { grid-area: timetable; }
    .history { grid-area: history; }
    .department-page > .back-link { grid-area: top; }
    .semester-picker .wide-picker { display: none; }
    .semester-years { inset-inline: 0 auto; }
  }
  @media (min-width: 64rem) {
    .timetable-controls { flex: 1 1 32rem; }
  }
  @media (max-width: 40rem) {
    .browse-crumbs a { min-inline-size: var(--target-min); justify-content: center; }
    .department-heading h1 { grid-column: 1 / -1; }
    .department-heading:has(.department-website) .browse-dek { grid-column: 1; }
    .department-website { grid-row: 2; padding-inline: var(--space-2); }
    .distribution { order: -1; flex-basis: 100%; }
    .results-summary { align-items: center; justify-content: space-between; gap: var(--space-1) var(--space-2); }
    .results-summary .import-note { flex-basis: 100%; padding-inline-start: 0; border-inline-start: 0; }
    .term-links a { padding-inline: .5rem; }
    .semester-links .wide-term { display: none; }
  }
  @media (max-width: 22rem) {
    .semester-links .control-label { display: none; }
  }
  @media (max-width: 39rem) {
    .department-page :global(:is(#department-top, #offerings, #department-history)) { scroll-margin-block-start: 3rem; }
  }
  @media (39rem < width <= 40rem) {
    .department-page :global(:is(#department-top, #offerings, #department-history)) { scroll-margin-block-start: 7.5rem; }
  }
</style>
