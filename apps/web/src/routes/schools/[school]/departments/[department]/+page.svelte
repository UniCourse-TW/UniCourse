<script lang="ts">
  import { page } from '$app/state';
  import { importedAt, isHttpUrl, shortImportedAt } from '$lib/format';
  import { departmentHref, schoolHref } from '$lib/overview-paths';
  import SchoolsOfferingTable from '$lib/SchoolsOfferingTable.svelte';
  import SchoolsTermHistory from '$lib/schools-term-history.svelte';
  import ChartValues from '$lib/ui/ChartValues.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import ErrorState from '$lib/ui/ErrorState.svelte';
  import FilterSelect from '$lib/ui/FilterSelect.svelte';
  import Pagination from '$lib/ui/Pagination.svelte';
  import SectionHeader from '$lib/ui/SectionHeader.svelte';
  import { changeQuery, displayValue } from '$lib/ui/format';
  import { partialTermLabel, partialTerms } from '$lib/ui/partial-terms';
  import type { TableColumn } from '$lib/ui/types';
  import '$lib/schools-browse.css';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let department = $derived(data.department);
  let base = $derived(departmentHref(department.school, department.department));
  let termLabel = $derived(data.term === 'all' ? '所有學期' : `${data.term} 學期`);
  let schoolSearch = $derived(`/?${new URLSearchParams({ school: department.school, department: department.department, term: data.term })}`);
  let distribution = $derived([
    { label: '必修', count: data.breakdown.required, color: 'var(--series-1)' },
    { label: '選修', count: data.breakdown.elective, color: 'var(--series-2)' },
    { label: '通識', count: data.breakdown.general, color: 'var(--series-3)' },
    { label: '其他', count: data.breakdown.other, color: 'var(--series-4)' },
    { label: '未分類', count: data.breakdown.unknown, color: 'var(--axis)' }
  ].filter(({ count }) => count > 0));
  let termOptions = $derived([...new Set([...data.terms, data.term].filter((term) => term !== 'all'))].sort().reverse());
  let quickTerms = $derived(termOptions.filter((term, index) => index < 6 || term === data.term));
  let olderTerms = $derived(termOptions.filter((term) => !quickTerms.includes(term)));
  let orderOptions = $derived([
    ...(data.query ? [{ value: 'relevance', label: '關鍵字相關度' }] : [{ value: 'relevance', label: '學期最新' }]),
    { value: 'enrolled', label: '修課人數最多' }, { value: 'title', label: '依課名排序' }
  ]);
  let historical = $derived([...(data.trends ?? [])].reverse());
  let partial = $derived(partialTerms(historical.map(({ term, offerings }) => [term, offerings])));
  let historicalColumns = $derived<TableColumn<(typeof historical)[number]>[]>([
    { id: 'term', label: '學期', value: ({ term }) => term },
    { id: 'offerings', label: '開課班次', value: ({ offerings }) => offerings, numeric: true },
    { id: 'enrolled', label: '已公布修課人次', value: ({ enrolled }) => enrolled, numeric: true },
    ...(partial.size ? [{ id: 'partial', label: '收錄備註', value: ({ term }: (typeof historical)[number]) => partial.has(term) ? partialTermLabel : null }] : [])
  ]);
  let courseCount = $derived(data.complete ? data.courses : data.trends?.find(({ term }) => term === data.term)?.courses ?? null);
  let shown = $derived(data.classFilter ? data.offerings.filter(({ requirement }) => requirement === data.classFilter) : data.offerings);
  const classOptions = [{ value: 'required', label: '必修' }, { value: 'elective', label: '選修' }];

  function termHref(term: string, keepQuery = true) {
    return changeQuery(new URL(page.url.pathname + page.url.search, page.url), (params) => {
      params.set('term', term);
      params.delete('page');
      if (!keepQuery) { params.delete('q'); params.delete('class_filter'); }
    }) + '#offerings';
  }

  function classHref(value: string) {
    return changeQuery(new URL('#offerings', page.url), (params) => {
      params.delete('page');
      if (value) params.set('class_filter', value);
      else params.delete('class_filter');
    });
  }

  function pageHref(next: number) {
    return changeQuery(new URL('#offerings', page.url), (params) => {
      if (next === 1) params.delete('page');
      else params.set('page', String(next));
    });
  }
</script>

<svelte:head><title>{department.department} · {department.schoolName}｜UniCourse</title></svelte:head>

<div class="browse-page department-page">
  <nav class="browse-crumbs" aria-label="所在位置">
    <a href="/">查課</a><span aria-hidden="true">/</span><a href="/schools">學校</a><span aria-hidden="true">/</span><a href={schoolHref(department.school)}>{department.schoolName}</a>
  </nav>
  <header class="browse-head">
    <div class="browse-stack">
      <h1>{department.department}</h1>
      <p class="browse-dek">{department.schoolName}課程資料 · {displayValue(data.terms.length)} 學期{#if data.updatedAt} · 匯入 <time datetime={data.updatedAt} title={importedAt(data.updatedAt)}>{shortImportedAt(data.updatedAt)}</time>・臺北時間{/if}</p>
    </div>
    <div class="browse-actions">
      <a class="browse-button browse-primary" href={schoolSearch}>搜尋本系課程</a>
      <a class="history-jump" href="#department-history">歷年開課變化 ↓</a>
      {#if data.website && isHttpUrl(data.website)}<a class="browse-button" href={data.website} rel="external">校方官網 ↗</a>{/if}
    </div>
  </header>

  <section class="browse-stack timetable" aria-labelledby="offerings">
    <nav class="term-links" aria-label="切換學期">
      {#each quickTerms as term (term)}
        <a href={termHref(term)} aria-current={term === data.term ? 'true' : undefined}>{term}</a>
      {/each}
      <a href={termHref('all')} aria-current={data.term === 'all' ? 'true' : undefined}>所有學期</a>
      {#if olderTerms.length}
        <details>
          <summary>更早學期</summary>
          <div class="term-links">
            {#each olderTerms as term (term)}<a href={termHref(term)}>{term}</a>{/each}
          </div>
        </details>
      {/if}
    </nav>
    <div class="department-summary">
      <div>
        <SectionHeader title={`${termLabel}課表`} id="offerings" />
        <p class="browse-note"><strong>{displayValue(data.total)} 班</strong> · {displayValue(courseCount)} 門課{#if data.complete} · {displayValue(data.teachers)} 位授課教師{/if}</p>
      </div>
      {#if distribution.length}
        <div class="distribution">
          <ul aria-label="必選修分布（班次）" role="list">
            {#each distribution as { label, count, color } (label)}
              <li><span style:background={color} aria-hidden="true"></span>{label} <strong class="ui-tabular">{displayValue(count)}</strong></li>
            {/each}
          </ul>
          <div class="segments" aria-hidden="true">
            {#each distribution as { label, count, color } (label)}<span style:flex-grow={count} style:background={color}></span>{/each}
          </div>
          {#if !data.complete}<p class="browse-note">統計樣本：{displayValue(data.sampleSize)} 班。</p>{/if}
        </div>
      {/if}
    </div>
      <nav class="term-links class-links" aria-label={data.matches > 50 ? '本頁班次類別' : '班次類別'}>
        {#if data.matches > 50}<span class="browse-note">本頁類別</span>{/if}
        {#each [{ value: '', label: '不限類別' }, ...classOptions] as option (option.value)}
          <a href={classHref(option.value)} aria-current={option.value === data.classFilter ? 'true' : undefined}>{option.label}</a>
        {/each}
      </nav>
      <form class="timetable-controls" action={`${base}#offerings`} method="GET" aria-label="課表篩選">
        <input type="hidden" name="term" value={data.term} />
        {#if data.classFilter}<input type="hidden" name="class_filter" value={data.classFilter} />{/if}
        <label class="timetable-search">
          <span>教師、課名或課號</span>
          {#key data.query}<input type="search" name="q" defaultValue={data.query} maxlength="100" aria-label="搜尋教師或課程" />{/key}
        </label>
        <div class="timetable-options">
          <FilterSelect name="sort" label="排序" allLabel={null} value={data.sort} options={orderOptions} />
          <button class="browse-button">套用</button>
          {#if data.query || data.classFilter}<a href={termHref(data.term, false)}>清除</a>{/if}
        </div>
      </form>
    {#if data.resultsError}
      <ErrorState title="暫時無法載入課表" retryHref={page.url.pathname + page.url.search} />
    {:else if data.offerings.length}
      {#if data.query || data.totalPages > 1 || data.classFilter}
        <div class="timetable-meta">
          <p class="browse-note">{displayValue(data.matches)} 班次{#if data.totalPages > 1} · {displayValue(data.firstRow)}–{displayValue(data.firstRow + data.offerings.length - 1)} 班{/if}{#if data.classFilter} · {data.matches > 50 ? '本頁' : '其中'}{classOptions.find(({ value }) => value === data.classFilter)?.label} {displayValue(shown.length)} 班{/if}</p>
          {#if data.totalPages > 1}<nav aria-label="課表上方分頁">{#if data.page > 1}<a rel="prev" href={pageHref(data.page - 1)}>上一頁</a>{/if}{#if data.page < data.totalPages}<a rel="next" href={pageHref(data.page + 1)}>下一頁 →</a>{/if}</nav>{/if}
        </div>
      {/if}
      {#if shown.length}<SchoolsOfferingTable offerings={shown} ratings={data.ratings} mode="department" caption={`${termLabel}開課班次`} showTerm={data.term === 'all'} />
      {:else}<EmptyState title="本頁沒有此類別的班次" description="可切換類別或查看其他頁。" />{/if}
      <Pagination url={new URL('#offerings', page.url)} page={data.page} totalPages={data.totalPages} label="課表分頁" />
    {:else}
      <EmptyState title={data.query ? '沒有符合條件的班次' : `${termLabel}沒有開課紀錄`} description={data.query ? '試試其他教師名、課名或課號。' : '可切換上方學期，查看這個開課單位的課表。'}>
        {#snippet action()}<a href={termHref(data.query ? data.term : 'all', false)}>{data.query ? '清除篩選' : '查看所有學期'}</a>{/snippet}
      </EmptyState>
    {/if}
  </section>

  <section class="browse-stack history" aria-labelledby="department-history">
    <SectionHeader title="歷年開課變化" id="department-history" />
    {#if data.trends === null}
      <ErrorState title="暫時無法取得歷年開課統計" retryHref={page.url.pathname + page.url.search} />
    {:else}
      <div class="history-charts">
        <SchoolsTermHistory label="開課班次" compact yearsOnly highlight={data.term} points={historical.map(({ term, offerings }) => ({ term, value: offerings, partial: partial.has(term) }))} termHref={termHref} />
        <SchoolsTermHistory label="已公布修課人次" unit="人次" compact yearsOnly highlight={data.term} points={historical.map(({ term, enrolled }) => ({ term, value: enrolled, partial: partial.has(term) }))} termHref={termHref} />
      </div>
      {#if historical.length > 3}<ChartValues label="歷年開課變化" columns={historicalColumns} rows={historical} rowKey={({ term }) => term} rowHref={({ term }) => termHref(term)} />{/if}
    {/if}
  </section>

  <a class="back-to-timetable" href="#offerings">↑ 回到課表與篩選</a>
</div>

<style>
  .department-page, .department-page .browse-stack { gap: var(--space-2); }
  .department-page { margin-block-start: calc(-1 * var(--space-3)); }
  .department-page .browse-crumbs + .browse-head { margin-block-start: calc(-1 * var(--space-2)); }
  .department-page .browse-dek { display: block; }
  .department-page .browse-head h1 { font-size: clamp(1.5rem, 4vw, 2rem); }
  .history, .timetable { margin-block-start: var(--space-2); }
  .history-charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; gap: var(--space-2); }
  .history-charts :global(figure) { height: 100%; }
  .history-charts :global(.plot svg) { block-size: 9rem; }
  .department-summary { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 20rem); gap: var(--space-2); align-items: end; }
  .timetable-meta, .timetable-meta nav { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2); }
  .history-jump { min-height: var(--target-min); align-content: center; font-size: var(--t-base); }
  .timetable-meta nav a { display: inline-flex; align-items: center; min-height: var(--target-min); }
  .timetable-controls { display: flex; flex-wrap: wrap; align-items: end; gap: var(--space-2); }
  .timetable-options { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
  .term-links { display: flex; align-items: center; flex-wrap: wrap; gap: .25rem; }
  .term-links a, .term-links summary { min-height: var(--target-min); align-content: center; border-radius: var(--radius-pill); padding: 0 .625rem; background: var(--chip); color: var(--ink-2); font-size: var(--t-sm); }
  .term-links a { text-decoration: none; }
  .term-links a[aria-current] { background: var(--brand-wash); color: var(--brand-ink); font-weight: 750; }
  .term-links summary { cursor: pointer; width: fit-content; }
  .term-links details[open] { flex-basis: 100%; }
  .term-links details .term-links { margin-block-start: .25rem; }
  .class-links { margin-block-end: -.25rem; }
  .back-to-timetable { width: fit-content; min-height: var(--target-min); align-content: center; }
  .timetable-search { display: grid; flex: 1 1 12rem; gap: .25rem; font-size: var(--t-sm); color: var(--ink-2); }
  .timetable-controls input[type='search'] { min-width: 0; min-height: var(--target-min); padding-inline: var(--space-2); border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--ink); font: inherit; }
  .distribution { display: grid; gap: .3rem; }
  .segments { display: flex; gap: 2px; height: .5rem; overflow: hidden; border-radius: var(--radius-pill); }
  .segments > span { flex-basis: 0; }
  .distribution ul { display: flex; flex-wrap: wrap; list-style: none; gap: .25rem .65rem; padding: 0; margin: 0; font-size: var(--t-sm); }
  .distribution li { display: flex; align-items: baseline; gap: .35rem; white-space: nowrap; }
  .distribution li span { display: inline-block; width: .55rem; height: .55rem; border-radius: 50%; }
  @media (max-width: 45rem) {
    .department-summary { grid-template-columns: minmax(0, 1fr); }
    .history-charts { grid-template-columns: minmax(0, 1fr); }
    .timetable-options { display: grid; grid-template-columns: 1fr 1fr; inline-size: 100%; gap: var(--space-1); }
    .timetable-search { flex-basis: 100%; }
    .timetable-controls :global(.field) { min-inline-size: 0; }
    .timetable-controls :global(select) { text-overflow: ellipsis; }
    .timetable-controls .browse-button { padding-inline: var(--space-2); }
  }
</style>
