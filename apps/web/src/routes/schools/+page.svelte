<script lang="ts">
  import { page } from '$app/state';
  import type { Institution } from '@unicourse/api-client';
  import { importedAt, isHttpUrl, shortImportedAt } from '$lib/format';
  import { ISSUES_URL, coveragePeriod, directoryStatus, directoryStatusLabels, hasImportedOfferings, hasSchoolPage, ownerships, ownershipLabels, statuses, systemLabels, yearCoverage, type DirectoryStatus, type SchoolSort } from '$lib/institutions';
  import { schoolHref } from '$lib/overview-paths';
  import { changeQuery, displayValue } from '$lib/ui/format';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import FilterSelect from '$lib/ui/FilterSelect.svelte';
  import Heatstrip from '$lib/ui/Heatstrip.svelte';
  import Pagination from '$lib/ui/Pagination.svelte';
  import StatTile from '$lib/ui/StatTile.svelte';
  import StatusPill from '$lib/ui/StatusPill.svelte';
  import '$lib/schools-browse.css';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let filters = $derived(data.filters);
  let filtered = $derived(Object.values(filters).some(Boolean));
  const sortLabels: Record<SchoolSort, string> = { status: '收錄狀態', name: '校名', terms: '學期數', offerings: '班次', updated: '更新日期' };
  let period = $derived(coveragePeriod(data.coverage.terms));
  let yearsLabel = $derived(data.years.length > 1 ? `${data.years[0]}–${data.years.at(-1)}` : data.years[0]);
  let sampleStatuses = $derived(new Set(data.rows.map(directoryStatus)));
  let uniformStatus = $derived(sampleStatuses.size === 1 ? directoryStatus(data.rows[0]) : null);
  const legend = [{ label: '未收錄', value: 0 }, { label: '1 學期', value: 1 }, { label: '2 學期', value: 2 }];
  const directorySortOptions = [
    { value: 'status:asc', label: '依收錄狀態' }, { value: 'name:asc', label: '依校名' },
    { value: 'terms:desc', label: '學期數最多' }, { value: 'offerings:desc', label: '班次最多' },
    { value: 'updated:desc', label: '最近更新' }
  ];
  let directoryOrder = $derived(`${data.sort}:${data.direction}`);
  let sortOptions = $derived(directorySortOptions.some(({ value }) => value === directoryOrder) ? directorySortOptions
    : [...directorySortOptions, { value: directoryOrder, label: `${sortLabels[data.sort]}（${data.direction === 'asc' ? '升冪' : '降冪'}）` }]);
  const resourceNetwork = /^資料來源：(大學校院|技職校院)課程資源網（每週更新）(?:；\s*)?/;
  const ownershipOptions = ownerships.map((value) => ({ value, label: ownershipLabels[value] }));
  const statusOptions = statuses.map((value) => ({ value, label: directoryStatusLabels[value] }));
  let depth = $derived([
    { id: 'longer', label: '收錄 4 期以上', count: data.breadth.longer, color: 'var(--seq-4)' },
    { id: 'recent', label: '收錄 1–3 期', count: data.breadth.recent, color: 'var(--seq-2)' },
    { id: 'empty', label: '尚無班次', count: data.total - data.coverage.schools, color: 'var(--control-line)' }
  ]);
  let depthFilter = $derived(depth.find(({ id }) => id === filters.depth));
  let csv = $derived('data:text/csv;charset=utf-8,' + encodeURIComponent('\ufeff' + [
    ['學校', '代碼', '收錄狀態', '學期', '已匯入班次', '更新時間（臺北時間）', '資料來源'],
    ...data.rows.map((school) => [school.name, school.code, directoryStatusLabels[directoryStatus(school)],
      hasImportedOfferings(school) ? school.terms.length : '', hasImportedOfferings(school) ? school.offerings : '',
      school.latestImportedAt ? importedAt(school.latestImportedAt) : '', sourceInfo(school)?.name ?? ''])
  ].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""').replace(/^[=+\-@\t\r\n]/, "'$&")}"`).join(',')).join('\r\n')));

  function sourceInfo(school: Institution) {
    const resource = school.note?.match(resourceNetwork);
    if (resource) return { name: resource[1] === '技職校院' ? '技職課程資源網' : '課程資源網', shortName: '資源網', frequency: '每週', href: '#resource-network' };
    if (school.note?.startsWith('每日更新')) return { name: '校方課程系統', shortName: '校方', frequency: '每日', href: school.website && isHttpUrl(school.website) ? school.website : undefined };
    return null;
  }

  function missingTerms(school: Institution) {
    const covered = new Set(school.terms);
    return data.coverage.terms.filter((term) => !covered.has(term));
  }

  function importState(school: Institution) {
    if (directoryStatus(school) === 'pending_import') {
      if (sourceInfo(school)?.shortName === '資源網') return '資源網已接入，待匯入班次';
      const source = school.status === 'partial' ? '部分接入' : '爬蟲已接入';
      return school.terms.length ? `${source}，目前無可查班次` : `${source}，本站尚無匯入`;
    }
    if (school.status === 'blocked') return '課程來源存取受阻';
    if (school.status === 'planned') return '已列入收錄規劃';
    return '尚未開始收錄';
  }

  function statusHref(status: string) {
    return changeQuery(new URL('#directory', page.url), (params) => {
      params.delete('page');
      if (filters.status === status) params.delete('status');
      else params.set('status', status);
    });
  }

  function depthHref(id: string) {
    return changeQuery(new URL('#directory', page.url), (params) => {
      params.delete('page');
      if (filters.depth === id) params.delete('depth');
      else params.set('depth', id);
    });
  }
  let sourceHref = $derived(changeQuery(new URL('#directory', page.url), (params) => {
    params.delete('page');
    if (filters.source) params.delete('source');
    else params.set('source', 'school');
  }));

  function systemHref(system: string) {
    return changeQuery(new URL('#directory', page.url), (params) => {
      params.delete('page');
      if (system) params.set('system', system);
      else params.delete('system');
    });
  }

  function sortHref(sort: SchoolSort) {
    return changeQuery(new URL('#directory', page.url), (params) => {
      const direction = sort === data.sort ? (data.direction === 'asc' ? 'desc' : 'asc') : sort === 'name' || sort === 'status' ? 'asc' : 'desc';
      params.delete('page');
      params.delete('directory_order');
      params.set('sort', sort);
      params.set('order', direction);
    });
  }

  function sortState(sort: SchoolSort) {
    return sort === data.sort ? (data.direction === 'asc' ? 'ascending' : 'descending') : undefined;
  }
</script>

<svelte:head><title>各校收錄狀態｜UniCourse</title></svelte:head>

{#snippet sortLabel(key: SchoolSort, label: string)}
  <a href={sortHref(key)}>{label}<span aria-hidden="true"> {data.sort === key ? (data.direction === 'asc' ? '↑' : '↓') : '↕'}</span></a>
{/snippet}

{#snippet sourceDetails(school: Institution)}
  {#if school.latestImportedAt}<p class="browse-note">最近更新 {importedAt(school.latestImportedAt)}（臺北時間）</p>{/if}
  {#if school.note}<p class="browse-note">{school.note}</p>{/if}
  {#if sourceInfo(school)?.href === '#resource-network'}<a href="#resource-network">課程資源網說明</a>{/if}
  {#if school.issue}<a href={`${ISSUES_URL}/${school.issue}`} rel="external">{school.name}收錄紀錄 ↗</a>{/if}
  {#if school.website && isHttpUrl(school.website)}<a href={school.website} rel="external">{school.name}官網 ↗</a>{/if}
{/snippet}

<div class="browse-page directory-page">
  <header class="browse-head">
    <div class="browse-stack">
      <h1>各校收錄狀態</h1>
      <p class="browse-dek">
        <span>教育部大專校院名錄 · {displayValue(data.total)} 所</span>
        <a class="source-link" href="#sources" aria-label="資料來源與統計口徑">ⓘ 資料來源</a>
        {#if data.updatedAt}<span>更新於 <time datetime={data.updatedAt}>{importedAt(data.updatedAt)}</time>（臺北時間）</span>{:else}<span>尚無課程匯入紀錄</span>{/if}
      </p>
    </div>
  </header>

  <section class="national-status" aria-label="全國收錄進度">
    <StatTile label="已收錄學校（所）" value={`${displayValue(data.coverage.schools)}／${displayValue(data.total)}`} />
    <StatTile label="已匯入班次" value={data.coverage.offerings} note={period ?? undefined} />
    {#if data.total}
      <div class="coverage-progress">
        <p class="browse-note">依收錄學期數分布</p>
        <div class="status-segments" aria-hidden="true">
          {#each depth as { id, count, color } (id)}
            <span class={id} style:flex-grow={count} style:background-color={color} hidden={!count}></span>
          {/each}
        </div>
        <ul class="depth-key" aria-label="收錄學期分布" role="list">
          {#each depth as { id, label, count, color } (id)}
            <li><a href={depthHref(id)} aria-current={filters.depth === id ? 'true' : undefined}><i class={id} style:background-color={color} aria-hidden="true"></i>{label} <strong>{displayValue(count)} 所</strong></a></li>
          {/each}
        </ul>
      </div>
    {/if}
  </section>

  <section class="browse-stack directory" aria-labelledby="directory">
    <div class="table-meta">
      <h2 id="directory">學校名錄</h2>
      {#if data.rows.length}<a class="csv-link" href={csv} download="unicourse-schools.csv">下載本頁名錄 CSV</a>{/if}
    </div>
    <form class="directory-filter" action="/schools#directory" method="GET" aria-label="學校篩選" onchange={(event) => {
      if (event.target instanceof HTMLSelectElement && ['directory_order', 'size'].includes(event.target.name)) event.currentTarget.requestSubmit();
    }}>
      {#if filters.system}<input type="hidden" name="system" value={filters.system} />{/if}
      {#if filters.depth}<input type="hidden" name="depth" value={filters.depth} />{/if}
      {#if filters.source}<input type="hidden" name="source" value={filters.source} />{/if}
      <label class="browse-field">搜尋學校{#key filters.q}<input name="q" type="search" maxlength="100" defaultValue={filters.q} placeholder="輸入校名或代碼" />{/key}</label>
      <button class="browse-button browse-primary" type="submit">搜尋</button>
      <details class="advanced-filters" open={Boolean(filters.ownership || filters.status)}>
        <summary>篩選與排序</summary>
        <div class="advanced-panel">
          <div class="advanced-controls">
            <FilterSelect name="ownership" label="公私立" value={filters.ownership} options={ownershipOptions} />
            <FilterSelect name="status" label="收錄狀態" value={filters.status} options={statusOptions} />
            <FilterSelect name="directory_order" label="名錄排序" allLabel={null} value={directoryOrder} options={sortOptions} />
            <FilterSelect name="size" label="每頁" allLabel={null} value={String(data.pageSize)} options={[{ value: '20', label: '20 所' }, { value: '50', label: '50 所' }]} />
            <button class="browse-button" type="submit">套用篩選</button>
          </div>
          <p class="browse-note">排序相同時，依學校代碼由小到大排列。</p>
          <nav class="system-filters" aria-label="依教育體系篩選">
            <a href={systemHref('')} aria-current={!filters.system ? 'true' : undefined}>所有體系 {displayValue(data.total)}</a>
            {#each data.systems as { system, count } (system)}<a href={systemHref(system)} aria-current={filters.system === system ? 'true' : undefined}>{systemLabels[system]} {displayValue(count)}</a>{/each}
          </nav>
          <ul class="system-filters" aria-label="收錄狀態統計" role="list">
            {#each data.counts.filter(({ count }) => count > 0) as { status, count } (status)}
              <li><a href={statusHref(status)} aria-current={filters.status === status ? 'true' : undefined}>{directoryStatusLabels[status]} {displayValue(count)} 所</a></li>
            {/each}
          </ul>
          {#if data.campusSources}<div class="system-filters"><a href={sourceHref} aria-current={filters.source ? 'true' : undefined}>校方來源 {displayValue(data.campusSources)} 所</a><p class="browse-note">依原始資料來源分類；收錄深度依已匯入的學期數計算。</p></div>{/if}
        </div>
      </details>
    </form>
    {#if filtered}
      <div class="filter-state">
        <p class="browse-note">已篩選{#if filters.q || filters.system || filters.ownership || filters.status || filters.source} · {[filters.q, filters.system && systemLabels[filters.system], filters.ownership && ownershipLabels[filters.ownership], filters.status && directoryStatusLabels[filters.status], filters.source && '校方來源'].filter(Boolean).join(' · ')}{/if}</p>
        {#if depthFilter}<a class="depth-chip" href={depthHref(depthFilter.id)} aria-label={`移除篩選：${depthFilter.label}`}>{depthFilter.label} ×</a>{/if}
        <a href="/schools">清除篩選</a>
      </div>
    {/if}

    {#if filters.depth === 'empty'}
      <p class="browse-note">每列標示目前的收錄進度，可展開查看來源與收錄紀錄。</p>
    {/if}

    {#if data.rows.length}
      <p id="resource-network" class="browse-note">校方每日更新。教育部課程資源網每週更新，未提供上課時間、教室及名額。</p>
      <div class="table-meta">
        <p class="browse-note">{filtered ? '符合條件' : '共'} {displayValue(data.shown)} 所 · 顯示 {data.start + 1}–{data.end} 所{#if uniformStatus} · 本頁皆{directoryStatusLabels[uniformStatus]}（{displayValue(data.rows.length)} 所）{/if}</p>
        <Pagination url={new URL('#directory', page.url)} page={data.page} totalPages={data.totalPages} label="學校名錄上方分頁" />
      </div>
      {#if data.years.length}
        <div class="legend browse-note" aria-label="學年覆蓋圖例">
          <strong>學年覆蓋{#if yearsLabel} <span class="legend-years">{yearsLabel}</span>{/if}</strong>
          {#each legend as item (item.value)}
            <span><span aria-hidden="true"><Heatstrip cells={[{ period: '覆蓋', value: item.value }]} hatchPartial /></span>{item.label}</span>
          {/each}
        </div>
      {/if}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (The named table region is horizontally scrollable.) -->
      <div class="directory-frame" role="region" aria-label="大專校院收錄狀態（表格）" tabindex="0">
        <table style:--coverage-years={Math.max(1, data.years.length)}>
          <caption>大專校院收錄狀態</caption>
          <thead>
            <!-- svelte-ignore a11y_no_redundant_roles (Keep Safari table semantics when mobile rows use grid.) -->
            <tr role="row">
            <th role="columnheader" scope="col" class="school-name" aria-sort={sortState('name')}>{@render sortLabel('name', '學校')}</th>
            {#if !uniformStatus}<th role="columnheader" scope="col" class="wide-column" aria-sort={sortState('status')}>{@render sortLabel('status', '收錄狀態')}</th>{/if}
            <th role="columnheader" scope="col" class="coverage" aria-label={yearsLabel ? `學年覆蓋 ${yearsLabel}` : '學年覆蓋'}>
              <span class="coverage-ticks" aria-hidden="true">
                {#each data.years as year, index (year)}
                  <span>{index === 0 || index === data.years.length - 1 || (index % 4 === 0 && index < data.years.length - 2) ? year : ''}</span>
                {/each}
              </span>
            </th>
            <th role="columnheader" scope="col" class="numeric term-column" aria-sort={sortState('terms')}>{@render sortLabel('terms', '學期')}</th>
            <th role="columnheader" scope="col" class="numeric offering-column" aria-sort={sortState('offerings')}>{@render sortLabel('offerings', '班次')}</th>
            <th role="columnheader" scope="col" class="wide-column" aria-sort={sortState('updated')}>{@render sortLabel('updated', '最近更新')}</th>
            <th role="columnheader" scope="col" class="note-cell">資料來源</th>
          </tr></thead>
          <tbody>
              {#each data.rows as school (school.code)}
                {@const cells = yearCoverage(school.terms, data.years)}
                {@const status = directoryStatus(school)}
                {@const imported = hasImportedOfferings(school)}
                {@const source = sourceInfo(school)}
                {@const missing = imported ? missingTerms(school) : []}
                <!-- svelte-ignore a11y_no_redundant_roles (Keep Safari table semantics when mobile rows use grid.) -->
                <tr role="row" class:unimported={!imported}>
                  <th role="rowheader" scope="row" class="school-name">
                    {#if hasSchoolPage(school)}<a href={schoolHref(school.slug)}>{school.name}</a>{:else}{school.name}{/if}
                    <span class="school-meta"><span class="browse-code">{school.code}</span><span>· {ownershipLabels[school.ownership]}</span>{#if !filters.system}<span>· {systemLabels[school.system]}</span>{/if}</span>

                  </th>
                  {#if !uniformStatus}<td role="cell" class="status-cell wide-column">
                    <StatusPill status={status === 'pending_import' ? 'planned' : status} label={directoryStatusLabels[status]} />
                    {#if !imported}<small>{importState(school)}</small>{/if}
                  </td>{/if}
                  <td role="cell" class="coverage">
                    {#if imported}
                      <Heatstrip {cells} label={school.name} hatchPartial />
                    {:else}<span title="本站尚無可查詢的班次">—</span>{#if uniformStatus}<small class="desktop-reason">{importState(school)}</small>{/if}{/if}
                  </td>
                  <td role="cell" class="numeric term-column" title={imported ? undefined : '本站尚無可查詢的班次'}>
                    {displayValue(imported ? school.terms.length : null)}
                    {#if imported}<small class="mobile-coverage latest-term" aria-label={`最近收錄 ${school.terms[0]}`}>{school.terms[0]}</small>{/if}
                  </td>
                  <td role="cell" class="numeric offering-column" title={imported ? undefined : '本站尚無可查詢的班次'}>{#if imported}
                      <span class="offering-value"><span class="offering-track" aria-hidden="true"><span style:inline-size={`${100 * Math.sqrt(school.offerings / data.maxOfferings)}%`}></span></span>{displayValue(school.offerings)}</span>
                    {:else}—{/if}</td>
                  <td role="cell" class="wide-column">{#if school.latestImportedAt}<time datetime={school.latestImportedAt} title={`${importedAt(school.latestImportedAt)}（臺北時間）`}><span aria-hidden="true">{shortImportedAt(school.latestImportedAt)}</span><span class="full-date">{importedAt(school.latestImportedAt)}（臺北時間）</span></time>{:else}<span title="未有匯入紀錄">—</span>{/if}</td>
                  <td role="cell" class="note-cell">
                    <details class="full-coverage">
                      <summary aria-label={`${school.name}的收錄明細`}>
                        <span class="source-summary">
                          {#if school.latestImportedAt}
                            <time class="mobile-date" datetime={school.latestImportedAt} title={`${importedAt(school.latestImportedAt)}（臺北時間）`}>{shortImportedAt(school.latestImportedAt).split(' ')[0]}</time>
                          {:else}<span class="mobile-date">{imported ? '更新時間未記錄' : importState(school)}</span>{/if}
                          {#if source}<span class="desktop-source">{source.shortName}・{source.frequency}更新</span>{/if}
                        </span>
                        <span class="detail-label">收錄明細</span>
                      </summary>
                      {#if imported}
                        <p class="browse-note">涵蓋 {coveragePeriod(school.terms)} · 最新 {school.terms[0]}</p>
                        {#if missing.length}<p class="browse-note">全站收錄期別中，本校缺 {missing.join('、')}。</p>{/if}
                      {/if}
                      {@render sourceDetails(school)}
                    </details>
                  </td>
                </tr>
              {/each}
            </tbody>
        </table>
      </div>
      <p class="browse-note">班次僅計可查詢資料。— 表示尚無資料。班次條採平方根尺度，滿格為 {displayValue(data.maxOfferings)} 班。</p>
      <Pagination url={new URL('#directory', page.url)} page={data.page} totalPages={data.totalPages} label="學校名錄分頁" numbered />
    {:else if filtered}
      <EmptyState title="沒有符合條件的學校" description="試試簡稱、學校代碼，或放寬篩選條件。">
        {#snippet action()}<a href="/schools">清除篩選</a>{/snippet}
      </EmptyState>
    {:else}
      <EmptyState title="目前沒有學校名錄" description="名錄正在整理，稍後再來看看。" />
    {/if}
  </section>

  <section id="sources" class="browse-stack" aria-labelledby="source-heading">
    <h2 id="source-heading">資料來源與統計口徑</h2>
    <p class="browse-note">名錄來自教育部的<a href="https://data.gov.tw/dataset/6091">大專校院名錄</a>（<a href="https://stats.moe.gov.tw/files/opendata/u1_new.csv">教育部原始 CSV ↗</a>）、<a href="https://data.gov.tw/dataset/6236">宗教研修學院概況</a>與<a href="https://data.gov.tw/dataset/6237">空大及大專進修學校概況</a>。班次與收錄期間採 UniCourse 匯入資料。</p>
  </section>
</div>

<style>
  .directory-page h1 { font-size: var(--t-2xl); font-weight: 650; }
  .directory-page { gap: var(--space-4); --t-sm: .8125rem; --t-xs: .8125rem; }
  .filter-state { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); align-items: center; }
  .filter-state a { display: inline-flex; align-items: center; min-block-size: var(--target-min); }
  .depth-chip { padding-inline: var(--space-2); background: var(--chip); border-radius: var(--radius-pill); }
  .depth-key a[aria-current] { background: var(--brand-wash); box-shadow: inset 0 -2px var(--brand); color: var(--brand-ink); }
  .directory-page .browse-stack { gap: var(--space-2); }
  .directory { padding-block-start: var(--space-4); border-block-start: 1px solid var(--line); }
  .source-link { display: inline-flex; align-items: center; gap: .2em; min-block-size: 1.5rem; font-size: var(--t-sm); white-space: nowrap; }
  .directory-page .browse-note { text-wrap: pretty; }
  :is(#directory, #sources, #resource-network) { scroll-margin-block-start: 6.25rem; }
  .national-status { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 2fr); gap: var(--space-2); }
  .coverage-progress { display: grid; align-content: center; gap: var(--space-2); padding: var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .directory-filter { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: var(--space-2); align-items: end; }
  .directory-filter:has(details[open]) .advanced-filters { grid-column: 1 / -1; }
  .advanced-panel { display: grid; gap: var(--space-2); padding: var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-control); background: var(--panel); }
  .advanced-controls { display: flex; align-items: end; gap: var(--space-2); }
  .advanced-controls { flex-wrap: wrap; }
  .advanced-filters > summary { min-block-size: var(--target-min); align-content: center; cursor: pointer; width: fit-content; color: var(--brand); font-size: var(--t-base); font-weight: 650; }
  .directory-filter button { cursor: pointer; font-family: inherit; }
  .status-segments { display: flex; block-size: .45rem; overflow: hidden; border-radius: var(--radius-pill); }
  .status-segments span:not([hidden]) { flex-basis: 0; min-inline-size: 3px; }
  :is(.status-segments span, .depth-key i).recent { background-image: repeating-linear-gradient(135deg, transparent 0 4px, color-mix(in srgb, var(--ink) 40%, transparent) 4px 5px); }
  .depth-key strong { font-variant-numeric: tabular-nums; }
  .depth-key { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-1) var(--space-2); list-style: none; padding: 0; margin: 0; color: var(--ink-2); font-size: var(--t-sm); }
  .depth-key a { min-block-size: var(--target-min); display: inline-flex; align-items: center; gap: .25em; padding-inline: var(--space-1); border: 1px solid var(--control-line); border-radius: var(--radius-control); text-decoration: none; }
  .depth-key a:hover { background: var(--hover-row); }
  .depth-key i { display: inline-block; inline-size: .6rem; block-size: .6rem; margin-inline-end: var(--space-1); border-radius: 50%; }
  small { color: var(--muted); font-size: var(--t-sm); font-weight: normal; }
  .table-meta { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: var(--space-2); }
  .legend, .legend > span { display: flex; flex-wrap: wrap; align-items: center; gap: .2rem .5rem; font-size: var(--t-sm); }
  .legend-years { font-family: var(--font-mono); font-weight: 500; }
  .legend { --heatstrip-empty-line: var(--muted); margin-block: .18rem .35rem; --heatstrip-cell-size: 10px; }
  .system-filters { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-1); margin: 0 0 var(--space-2); padding: 0; list-style: none; }
  .system-filters a { display: inline-flex; align-items: center; padding-inline: var(--space-2); min-block-size: var(--target-min); border-radius: var(--radius-pill); background: var(--chip); color: var(--ink-2); font-size: var(--t-sm); text-decoration: none; }
  .system-filters a:hover { text-decoration: underline; }
  .system-filters a[aria-current] { background: var(--brand-wash); color: var(--brand-ink); font-weight: 700; }
  .directory-frame { position: relative; overflow-x: auto; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
  table { width: 100%; min-width: 55rem; text-align: start; border-spacing: 0; font-size: var(--t-base); line-height: var(--leading-table); }
  caption { position: absolute; clip-path: inset(50%); inline-size: 1px; block-size: 1px; overflow: hidden; }
  th, td { text-align: start; padding: .18rem .55rem; border-bottom: 1px solid var(--line); background: var(--panel-raised); }
  th { font-weight: 650; }
  thead th { vertical-align: middle; padding-block: 0; height: var(--target-min); background: var(--table-head); white-space: nowrap; }
  thead a { display: inline-flex; align-items: center; min-block-size: var(--target-min); gap: .25rem; }
  .school-name { position: sticky; left: 0; z-index: 1; inline-size: 19%; min-inline-size: 10rem; box-shadow: 1px 0 var(--line); overflow-wrap: anywhere; }
  td.status-cell { inline-size: 10%; min-inline-size: 6rem; }
  .status-cell small { display: block; white-space: normal; margin-block-start: .15rem; }
  tbody .school-name a { display: block; width: fit-content; }
  .school-meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: .2rem .3rem; color: var(--muted); font-size: var(--t-xs); font-weight: 450; line-height: 1.25; }
  .school-meta .browse-code { font-size: inherit; line-height: inherit; margin-inline-start: .2rem; }
  thead .school-name { z-index: 3; }
  tbody tr:hover > * { background: var(--hover-row); }
  td time { white-space: nowrap; }
  .coverage { inline-size: 13rem; min-inline-size: 8.75rem; --coverage-cell-size: 14px; }
  .coverage-ticks, .coverage :global(.strip) {
    display: grid;
    grid-template-columns: repeat(var(--coverage-years), minmax(0, var(--coverage-cell-size)));
    gap: var(--heatstrip-gap, 2px);
  }
  .coverage-ticks { font: var(--t-sm) / 1.2 var(--font-mono); }
  .coverage-ticks span { display: grid; justify-content: center; }
  .coverage :global(.cell) { inline-size: 100%; aspect-ratio: 1; block-size: auto; }
  .directory-frame { --heatstrip-partial-hatch: repeating-linear-gradient(135deg, transparent 0 2px, var(--brand-ring) 2px 3px, transparent 3px 5px); --heatstrip-empty-line: var(--ink-2); }
  .full-coverage > summary { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 var(--space-1); min-block-size: var(--target-min); align-content: center; color: var(--ink-2); font-size: var(--t-sm); cursor: pointer; }
  .full-coverage > summary::-webkit-details-marker { display: none; }
  .detail-label { color: var(--brand-ink); font-weight: 650; white-space: nowrap; }
  summary:hover .detail-label { text-decoration: underline; }
  .detail-label::after { content: ' ▾'; }
  .full-coverage[open] .detail-label::after { content: ' ▴'; }
  .full-coverage > :not(summary) { overflow-wrap: anywhere; }
  .full-coverage a { display: flex; align-items: center; min-block-size: var(--target-min); font-size: var(--t-sm); }
  .mobile-date { display: none; }
  @media (min-width: 58.001rem) and (pointer: fine) {
    .full-coverage > summary { min-block-size: 2rem; }
  }
  .mobile-coverage { display: none; }
  .desktop-reason { margin-inline-start: var(--space-1); }
  .csv-link { min-height: var(--target-min); align-content: center; font-size: var(--t-sm); }
  .numeric { text-align: end; font-variant-numeric: tabular-nums; white-space: nowrap; }
  td time { font-variant-numeric: tabular-nums; }
  .full-date { position: absolute; clip-path: inset(50%); inline-size: 1px; block-size: 1px; overflow: hidden; }
  .note-cell { inline-size: 11.75rem; }
  .note-cell a { text-decoration: none; }
  .note-cell a:hover { text-decoration: underline; }
  .offering-column { min-inline-size: 10.5rem; border-inline-start: 1px solid var(--line); padding-inline-start: var(--space-3); }
  thead .offering-column { text-align: start; }
  .offering-value { display: grid; grid-template-columns: minmax(0, 1fr) 8ch; align-items: center; gap: var(--space-1); }
  .offering-track { height: 6px; background: var(--chip); border-radius: var(--radius-pill); }
  .offering-track span { display: block; min-inline-size: 3px; block-size: 100%; background: var(--series-1); border-radius: inherit; }
  .browse-field input::placeholder { color: var(--muted); opacity: 1; }
  .unimported :is(.numeric, .coverage, .browse-code) { color: var(--muted); }
  #sources { border-block-start: 1px solid var(--line); padding-block-start: .85rem; }
  @media (max-width: 58rem) {
    table { min-width: 0; }
    tr {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 2.75rem minmax(7rem, 24%);
      align-items: center;
      padding: 0 var(--space-2);
      border-block-end: 1px solid var(--line);
    }
    tbody tr:last-child { border-block-end: 0; }
    thead tr { background: var(--table-head); }
    th, td { min-inline-size: 0; padding-inline: .2rem; border: 0; background: transparent; }
    .wide-column, .desktop-source, thead .note-cell { display: none; }
    .school-name, .coverage, .note-cell, .offering-column { inline-size: auto; min-inline-size: 0; }
    .school-name { position: static; box-shadow: none; grid-column: 1; grid-row: 1; }
    tbody .school-name { display: flex; flex-wrap: wrap; gap: 0 .3rem; align-items: center; }
    tbody .school-name a { display: flex; align-items: center; min-block-size: var(--target-min); }
    .school-meta :not(.browse-code) { display: none; }
    .latest-term { font: var(--t-xs) / 1 var(--font-mono); }
    .term-column { grid-column: 2; grid-row: 1; }
    .offering-column { grid-column: 3; grid-row: 1; border: 0; padding: .2rem; }
    thead .offering-column { text-align: end; }
    .offering-value { grid-template-columns: minmax(0, 1fr) 6.75ch; }
    .coverage {
      grid-column: 1;
      grid-row: 2;
      --coverage-cell-size: min(10px, calc((100% - (var(--coverage-years) - 1) * 2px) / var(--coverage-years)));
      padding-inline-start: .35rem;
      --heatstrip-gap: 2px;
    }
    thead .coverage { height: auto; padding-block: 0 var(--space-1); }
    .coverage-ticks { font-size: var(--t-xs); }
    .coverage-ticks span:first-child { justify-content: start; }
    .coverage-ticks span:last-child { justify-content: end; }
    .desktop-reason { display: none; }
    .mobile-coverage { display: block; }
    .note-cell { grid-column: 2 / -1; grid-row: 2; align-self: stretch; padding-block: 0; }
    .note-cell:has(details[open]) { grid-column: 1 / -1; grid-row: 3; }
    .full-coverage > summary {
      position: relative; display: flex; justify-content: flex-end; align-items: center;
      min-block-size: 1.5rem; color: var(--muted);
    }
    .full-coverage:not([open]) > summary::before {
      content: ''; position: absolute; z-index: 1; inset: calc(1.5rem - var(--target-min)) 0 0;
    }
    .full-coverage[open] > summary { min-block-size: var(--target-min); }
    .unimported .full-coverage:not([open]) > summary::before { inset-inline-start: auto; inline-size: 5.5rem; }
    .full-coverage[open] > summary { justify-content: flex-start; }
    .mobile-date { display: inline; font-size: var(--t-base); white-space: normal; }
    .unimported .mobile-date { font-size: var(--t-sm); }
    .unimported .note-cell { grid-column: 1 / -1; }
    .unimported .coverage { grid-row: 1; display: none; }
    .unimported .full-coverage > summary { justify-content: space-between; }
    .full-coverage[open] { padding-block-end: var(--space-1); }
    tbody tr { position: relative; }
    tbody .school-name a::after {
      content: ''; position: absolute; inset: 0 0 1.5rem;
    }
    tbody tr:focus-within > * { background: var(--hover-row); }
  }
  @media (max-width: 680px) {
    .source-link { position: relative; }
    .depth-key { gap: var(--space-1); }
    .source-link::after { content: ''; position: absolute; inset: -0.625rem 0; }
    .national-status { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .directory { padding-block-start: var(--space-1); }
    .coverage-progress { grid-column: 1 / -1; padding-block: var(--space-2); }
    .directory-filter { grid-template-columns: minmax(0, 1fr) auto; }
    .advanced-filters { grid-column: 1 / -1; }
  }
</style>
