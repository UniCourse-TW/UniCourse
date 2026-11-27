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
  import StatRow from '$lib/ui/StatRow.svelte';
  import StatTile from '$lib/ui/StatTile.svelte';
  import { changeQuery, displayValue } from '$lib/ui/format';
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
  let historical = $derived([...(data.trends ?? [])].reverse());

  function termHref(term: string, keepQuery = true) {
    return changeQuery(page.url, (params) => {
      params.set('term', term);
      params.delete('page');
      if (!keepQuery) params.delete('q');
    });
  }
</script>

<svelte:head><title>{department.department} · {department.schoolName}｜UniCourse</title></svelte:head>

<div class="browse-page">
  <nav class="browse-crumbs" aria-label="所在位置">
    <a href="/">首頁</a><span aria-hidden="true">/</span><a href="/schools">學校</a><span aria-hidden="true">/</span><a href={schoolHref(department.school)}>{department.schoolName}</a>
  </nav>
  <header class="browse-head">
    <div class="browse-stack">
      <h1>{department.department}</h1>
      <p class="browse-dek"><span>{department.schoolName}課程資料</span><span>已收錄 {displayValue(data.terms.length)} 學期</span>
        {#if data.updatedAt}<span>列表更新於 <time datetime={data.updatedAt}>{importedAt(data.updatedAt)}</time>（臺北時間）</span>{/if}</p>
    </div>
    <div class="browse-actions">
      <a class="browse-button browse-primary" href="#offerings">看本期課表 ↓</a>
      <a class="browse-button" href={schoolSearch}>進階查課</a>
      {#if data.website && isHttpUrl(data.website)}<a class="browse-button" href={data.website} rel="external">校方官網 ↗</a>{/if}
    </div>
  </header>

  <section class="browse-stack" aria-labelledby="offerings">
    <SectionHeader title={`${termLabel}課表`} id="offerings" />
    <nav class="term-pills" aria-label="切換學期">
      {#each termOptions.slice(0, 3) as option (option.value)}
        <a class="browse-button" href={termHref(option.value)} aria-current={data.term === option.value ? 'page' : undefined}>{option.label}</a>
      {/each}
      <a class="browse-button" href={termHref('all')} aria-current={data.term === 'all' ? 'page' : undefined}>所有學期</a>
    </nav>
    <div class="browse-compact-stats department-stats"><StatRow label={`${termLabel}開課概況`}>
      <StatTile label="班次" value={data.total} unit="班" />
      <StatTile label="課程" value={data.complete ? data.courses : data.trends?.find(({ term }) => term === data.term)?.courses ?? null} unit="門" />
      <StatTile label="授課教師" value={data.complete ? data.teachers : null} unit="位" note={data.complete ? undefined : '班次未完整納入'} />
    </StatRow></div>
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
    <div class="browse-stack timetable-tools">
      {#if historical.length}<p class="browse-note">近期班次：{historical.slice(-2).map(({ term, offerings }) => `${term}：${displayValue(offerings)} 班`).join(' → ')}</p>{/if}
      <details class="browse-stack">
        <summary><span class="history-summary">歷年開課變化
          {#if historical.length > 2}<Sparkline label="歷年各學期開課班次" values={historical.map(({ offerings }) => offerings)} labels={historical.map(({ term }) => term)} min={0} showArea={false} />{/if}
        </span></summary>
        {#if data.trends === null}
          <ErrorState title="暫時無法取得歷年開課統計" retryHref={page.url.pathname + page.url.search} />
        {:else}
          <SchoolsTermHistory label="各學期班次" points={historical.map(({ term, offerings }) => ({ term, value: offerings }))} termHref={termHref} />
        {/if}
      </details>
      <div class="browse-stack timetable-filter">
        <p class="browse-note"><strong>課表篩選</strong></p>
        <FilterBar action={`${base}#offerings`} label="課表篩選" clearHref={data.query ? termHref(data.term, false) : undefined}
          hidden={termOptions.length > 3 ? {} : { term: data.term }}>
          {#if termOptions.length > 3}<FilterSelect name="term" label="選擇學期" allLabel={null} value={data.term} options={[{ value: 'all', label: '所有學期' }, ...termOptions]} />{/if}
          <label class="browse-field">搜尋教師或課程<input type="search" name="q" value={data.query} maxlength="100" placeholder="輸入教師、課名或課號" /></label>
        </FilterBar>
      </div>
    </div>
    {#if data.resultsError}
      <ErrorState title="暫時無法載入課表" retryHref={page.url.pathname + page.url.search} />
    {:else if data.offerings.length}
      <p class="browse-note">{data.query ? '符合條件 ' : `${termLabel}共 `}{displayValue(data.matches)} 班次 · 顯示 {displayValue(data.firstRow)}–{displayValue(data.firstRow + data.offerings.length - 1)} 班</p>
      <p class="browse-note">人數與名額採校方匯入資料；— 表示未公布。每頁最多查看 10 門課的評價筆數。</p>
      <Pagination url={page.url} page={data.page} totalPages={data.totalPages} label="課表上方分頁" />
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
  .term-pills { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .term-pills .browse-button { font-variant-numeric: tabular-nums; border-radius: var(--radius-pill); }
  .term-pills .browse-button[aria-current] { background: var(--brand); color: var(--on-brand); border-color: var(--brand); }
  .department-stats { max-inline-size: 48rem; }
  .timetable-filter { min-inline-size: 0; }
  .timetable-filter :global(input[type='search']) { min-inline-size: 0; }
  .timetable-tools summary { min-block-size: var(--target-min); align-content: center; cursor: pointer; width: fit-content; color: var(--brand); font-size: var(--t-base); font-weight: 650; }
  .history-summary { display: inline-flex; align-items: center; gap: var(--space-2); }
  .distribution { display: grid; gap: .4rem; max-inline-size: 48rem; padding: var(--space-2) var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--panel-raised); }
  .segments { display: flex; gap: 2px; height: .5rem; overflow: hidden; border-radius: var(--radius-pill); }
  .segments > span { flex-basis: 0; }
  .distribution ul { display: flex; flex-wrap: wrap; list-style: none; gap: .45rem .85rem; padding: 0; margin: 0; font-size: var(--t-base); }
  .distribution li { display: flex; align-items: baseline; gap: .35rem; white-space: nowrap; }
  .distribution li span { display: inline-block; width: .55rem; height: .55rem; border-radius: 50%; }
  @media (max-width: 40rem) {
    .timetable-filter :global(form) { display: grid; grid-template-columns: minmax(0, 1fr) auto; }
    .timetable-filter :global(form > .field) { grid-column: 1 / -1; }
    .timetable-filter :global(.actions) { display: contents; }
    .timetable-filter :global(.actions a) { grid-column: 1 / -1; justify-self: start; }
  }
</style>
