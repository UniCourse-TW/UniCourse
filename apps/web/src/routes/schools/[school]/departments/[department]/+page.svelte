<script lang="ts">
  import { page } from '$app/state';
  import { importedAt, isHttpUrl } from '$lib/format';
  import { departmentHref, schoolHref } from '$lib/overview-paths';
  import SchoolsOfferingTable from '$lib/SchoolsOfferingTable.svelte';
  import SchoolsTermHistory from '$lib/schools-term-history.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import ErrorState from '$lib/ui/ErrorState.svelte';
  import FilterBar from '$lib/ui/FilterBar.svelte';
  import FilterSelect from '$lib/ui/FilterSelect.svelte';
  import Pagination from '$lib/ui/Pagination.svelte';
  import SectionHeader from '$lib/ui/SectionHeader.svelte';
  import Sparkline from '$lib/ui/Sparkline.svelte';
  import { changeQuery, displayValue } from '$lib/ui/format';
  import { partialTermLabel, partialTerms } from '$lib/ui/partial-terms';
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
  ]);
  let termOptions = $derived([...new Set([...data.terms, data.term].filter((term) => term !== 'all'))]
    .sort().reverse().map((value) => ({ value, label: value })));
  const orderOptions = [{ value: 'relevance', label: '預設順序' }, { value: 'enrolled', label: '修課人數高到低' }, { value: 'title', label: '依課名排序' }];
  let historical = $derived([...(data.trends ?? [])].reverse());
  let latest = $derived(historical.at(-1));
  let partial = $derived(partialTerms(historical.map(({ term, offerings }) => [term, offerings])));
  let courseCount = $derived(data.complete ? data.courses : data.trends?.find(({ term }) => term === data.term)?.courses ?? null);

  function termHref(term: string, keepQuery = true) {
    return changeQuery(new URL(page.url.pathname + page.url.search, page.url), (params) => {
      params.set('term', term);
      params.delete('page');
      if (!keepQuery) params.delete('q');
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
      <p class="browse-dek">{department.schoolName}課程資料 · 本系 {displayValue(data.terms.length)} 學期有開課{#if data.updatedAt} · 匯入於 <time datetime={data.updatedAt}>{importedAt(data.updatedAt)}</time>（臺北時間）{/if}</p>
    </div>
    <div class="browse-actions">
      <a class="browse-button browse-primary" href={schoolSearch}>搜尋本系課程</a>
      {#if data.website && isHttpUrl(data.website)}<a class="browse-button" href={data.website} rel="external">校方官網 ↗</a>{/if}
    </div>
  </header>

  <section class="browse-stack timetable" aria-labelledby="offerings">
    <SectionHeader title={`${termLabel}課表`} id="offerings" />
    <div class="department-summary">
      <p class="browse-note"><strong>{displayValue(data.total)} 班</strong> · {displayValue(courseCount)} 門課 · {displayValue(data.complete ? data.teachers : null)} 位授課教師</p>
      <details class="history">
        <summary>歷年開課變化 {#if historical.length >= 3 && latest}<span class="ui-tabular">{historical[0].term}–{latest.term}</span><Sparkline label={`各學期班次，從舊到新${partial.size ? `，斜紋表示${partialTermLabel}` : ''}`} values={historical.map(({ offerings }) => offerings)} labels={historical.map(({ term }) => term)} min={0} showArea={false} partial={historical.map(({ term }) => partial.has(term))} />{/if}</summary>
        {#if data.trends === null}
          <ErrorState title="暫時無法取得歷年開課統計" retryHref={page.url.pathname + page.url.search} />
        {:else}
          <SchoolsTermHistory label="各學期班次" points={historical.map(({ term, offerings }) => ({ term, value: offerings, partial: partial.has(term) }))} termHref={termHref} />
        {/if}
      </details>
    </div>
    <nav class="term-links" aria-label="切換課表學期">
      {#each termOptions.slice(0, 2) as option (option.value)}<a href={`${termHref(option.value)}#offerings`} aria-current={data.term === option.value ? 'true' : undefined}>{option.label}</a>{/each}
      <a href={`${termHref('all')}#offerings`} aria-current={data.term === 'all' ? 'true' : undefined}>所有學期</a>
    </nav>
    <div class="timetable-controls">
    <details class="timetable-filter" open={Boolean(data.query)}>
      <summary>其他學期／篩選課程</summary>
      <FilterBar action={`${base}#offerings`} label="課表篩選" hidden={data.sort === 'relevance' ? {} : { sort: data.sort }} clearHref={data.query ? termHref(data.term, false) : undefined}>
      <FilterSelect name="term" label="選擇學期" allLabel={null} value={data.term} options={[{ value: 'all', label: '所有學期' }, ...termOptions]} />
      <label class="browse-field">搜尋教師或課程{#key data.query}<input type="search" name="q" defaultValue={data.query} maxlength="100" placeholder="教師、課名或課號" />{/key}</label>
    </FilterBar></details>
    {#if data.sampleSize}
      <div class="distribution">
        <p class="browse-note"><strong>必選修分布</strong></p>
        {#if distribution.filter(({ count }) => count > 0).length > 1}
          <div class="segments" aria-hidden="true">
            {#each distribution.filter(({ count }) => count) as { label, count, color } (label)}
              <span style:flex-grow={count} style:background={color}></span>
            {/each}
          </div>
        {/if}
        <ul aria-label="必選修分布" role="list">
          {#each distribution.filter(({ count }) => count > 0) as { label, count, color } (label)}
            <li><span style:background={color} aria-hidden="true"></span>{label} <strong class="ui-tabular">{displayValue(count)}</strong></li>
          {/each}
        </ul>
        {#if !data.complete}<p class="browse-note">分布僅計入最新 {displayValue(data.sampleSize)} 班次。</p>{/if}
      </div>
    {/if}
    </div>
    {#if data.resultsError}
      <ErrorState title="暫時無法載入課表" retryHref={page.url.pathname + page.url.search} />
    {:else if data.offerings.length}
      <div class="timetable-meta">
        <p class="browse-note">{displayValue(data.matches)} 班次 · 顯示 {displayValue(data.firstRow)}–{displayValue(data.firstRow + data.offerings.length - 1)} 班</p>
        <form class="department-sort" action={`${base}#offerings`} method="GET" onchange={(event) => event.currentTarget.requestSubmit()}>
          <input type="hidden" name="term" value={data.term} />
          {#if data.query}<input type="hidden" name="q" value={data.query} />{/if}
          <FilterSelect name="sort" label="排序" allLabel={null} value={data.sort} options={orderOptions} />
          <noscript><button class="browse-button">套用排序</button></noscript>
        </form>
        <Pagination url={page.url} page={data.page} totalPages={data.totalPages} label="課表上方分頁" />
      </div>
      <SchoolsOfferingTable offerings={data.offerings} ratings={data.ratings} mode="department" caption={`${termLabel}開課班次`} showTerm={data.term === 'all'} />
      <Pagination url={page.url} page={data.page} totalPages={data.totalPages} label="課表分頁" />
    {:else}
      <EmptyState title={data.query ? '沒有符合條件的班次' : `${termLabel}沒有開課紀錄`} description={data.query ? '試試其他教師名、課名或課號。' : '可切換上方學期，查看這個開課單位的課表。'}>
        {#snippet action()}<a href={termHref(data.query ? data.term : 'all', false)}>{data.query ? '清除篩選' : '查看所有學期'}</a>{/snippet}
      </EmptyState>
    {/if}
  </section>
</div>

<style>
  .department-page, .department-page .browse-stack { gap: var(--space-2); }
  .department-page .browse-crumbs + .browse-head { margin-block-start: calc(-1 * var(--space-2)); }
  .department-page .browse-dek { display: block; }
  .timetable { margin-block-start: var(--space-4); }
  .term-links { display: flex; gap: var(--space-2); }
  .term-links a { display: inline-flex; align-items: center; min-block-size: var(--target-min); padding-inline: var(--space-2); border-radius: var(--radius-control); }
  .term-links a[aria-current] { background: var(--brand-wash); color: var(--brand-ink); font-weight: 650; }
  .timetable-filter summary { min-block-size: var(--target-min); align-content: center; cursor: pointer; color: var(--brand-ink); }
  .department-sort { display: flex; gap: var(--space-2); }
  .department-summary { display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 0 var(--space-3); }
  .department-summary p { align-self: center; }
  .timetable-meta { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2); }
  .timetable-controls { display: grid; grid-template-columns: minmax(0, 2fr) minmax(12rem, 1fr); gap: var(--space-2); align-items: start; }
  .history[open] { flex-basis: 100%; }
  .history summary { min-block-size: var(--target-min); align-content: center; cursor: pointer; width: fit-content; color: var(--brand-ink); font-size: var(--t-base); font-weight: 650; }
  .history summary span { color: var(--muted); font-size: var(--t-sm); }
  .history summary :global(svg) { margin-inline-start: var(--space-1); }
  .distribution { display: grid; gap: .3rem; padding: var(--space-2) var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--panel-raised); }
  .segments { display: flex; gap: 2px; height: .5rem; overflow: hidden; border-radius: var(--radius-pill); }
  .segments > span { flex-basis: 0; }
  .distribution ul { display: flex; flex-wrap: wrap; list-style: none; gap: .25rem .65rem; padding: 0; margin: 0; font-size: var(--t-sm); }
  .distribution li { display: flex; align-items: baseline; gap: .35rem; white-space: nowrap; }
  .distribution li span { display: inline-block; width: .55rem; height: .55rem; border-radius: 50%; }
  @media (max-width: 45rem) {
    .timetable { margin-block-start: var(--space-3); }
    .timetable-meta :global(nav[aria-label='課表上方分頁']) { display: none; }
    .timetable-controls { grid-template-columns: minmax(0, 1fr); }
    .distribution { grid-template-columns: auto 1fr; padding: var(--space-1) var(--space-2); align-items: center; }
    .distribution .segments { grid-area: 2 / 1 / auto / -1; }
    .distribution ul { grid-column: 2; grid-row: 1; }
    .timetable-filter :global(form) { display: grid; grid-template-columns: minmax(0, 1fr) auto; }
    .timetable-filter .browse-field { grid-column: 1 / -1; grid-row: 1; }
    .timetable-filter :global(.actions button) { padding-inline: var(--space-2); }
    .timetable-filter :global(.actions) { display: contents; }
    .timetable-filter :global(.actions a) { grid-column: 1 / -1; justify-self: start; }
  }
</style>
