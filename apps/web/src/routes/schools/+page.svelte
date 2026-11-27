<script lang="ts">
  import { page } from '$app/state';
  import type { Institution } from '@unicourse/api-client';
  import { importedAt, isHttpUrl } from '$lib/format';
  import { ISSUES_URL, coveragePeriod, directoryStatus, directoryStatusLabels, hasImportedOfferings, hasSchoolPage, ownerships, ownershipLabels, statuses, systemLabels, yearCoverage, type DirectoryStatus, type SchoolSort } from '$lib/institutions';
  import { schoolHref } from '$lib/overview-paths';
  import { changeQuery, displayValue } from '$lib/ui/format';
  import Badge from '$lib/ui/Badge.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import FilterSelect from '$lib/ui/FilterSelect.svelte';
  import Heatstrip from '$lib/ui/Heatstrip.svelte';
  import Pagination from '$lib/ui/Pagination.svelte';
  import StatusPill from '$lib/ui/StatusPill.svelte';
  import '$lib/schools-browse.css';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let filters = $derived(data.filters);
  let filtered = $derived(Boolean(filters.q || filters.status || filters.ownership || filters.system));
  let period = $derived(coveragePeriod(data.coverage.terms));
  let yearsLabel = $derived(data.years.length > 1 ? `${data.years[0]}–${data.years.at(-1)}` : data.years[0]);
  let recentYears = $derived(data.years.slice(-4));
  let awaitingImport = $derived(data.counts.find(({ status }) => status === 'pending_import')?.count ?? 0);
  const resourceNetwork = /^資料來源：(大學校院|技職校院)課程資源網（每週更新）(?:；\s*)?/;
  const ownershipOptions = ownerships.map((value) => ({ value, label: ownershipLabels[value] }));
  const statusOptions = statuses.map((value) => ({ value, label: directoryStatusLabels[value] }));
  const statusColors: Record<DirectoryStatus, string> = {
    live: 'var(--up)', partial: 'var(--warn)', pending_import: 'var(--brand)',
    blocked: 'var(--down)', planned: 'var(--info)', none: 'var(--control-line)'
  };
  const shortDate = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });

  function shortImportedAt(value: string) {
    const parts = Object.fromEntries(shortDate.formatToParts(new Date(value)).map(({ type, value }) => [type, value]));
    return `${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
  }

  function statusHref(status: string) {
    return changeQuery(page.url, (params) => {
      params.delete('page');
      if (filters.status === status) params.delete('status');
      else params.set('status', status);
    });
  }

  function sortHref(sort: SchoolSort) {
    return changeQuery(page.url, (params) => {
      const direction = sort === data.sort ? (data.direction === 'asc' ? 'desc' : 'asc') : sort === 'name' || sort === 'status' ? 'asc' : 'desc';
      params.delete('page');
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

{#snippet source(school: Institution)}
  {@const resource = school.note?.match(resourceNetwork)}
  {@const label = resource ? (resource[1] === '技職校院' ? '技職課程資源網' : '課程資源網') : school.note?.startsWith('每日更新') ? '每日更新' : school.note || school.issue ? '收錄紀錄' : school.website ? '校方網站' : null}
  {#if label}
    <details class="row-source">
      <summary aria-label={`${school.name}：${label}`}><Badge {label} /></summary>
      {#if school.note}<p class="browse-note">{school.note}</p>{/if}
      {#if resource}<a href="#resource-network">課程資源網說明</a>{/if}
      {#if school.issue}<a href={`${ISSUES_URL}/${school.issue}`} rel="external">{school.name}收錄紀錄 ↗</a>{/if}
      {#if school.website && isHttpUrl(school.website)}<a href={school.website} rel="external">{school.name}官網 ↗</a>{/if}
    </details>
  {:else}<span title="尚無來源說明">—</span>{/if}
{/snippet}

<div class="browse-page directory-page">
  <header class="browse-head">
    <div class="browse-stack">
      <h1>各校收錄狀態</h1>
      <p class="browse-dek">
        <span>教育部大專校院開放資料 · {displayValue(data.total)} 所</span>
        {#if data.updatedAt}<span>課程資料更新於 <time datetime={data.updatedAt}>{importedAt(data.updatedAt)}</time>（臺北時間）</span>{:else}<span>尚無課程匯入紀錄</span>{/if}
      </p>
    </div>
    <div class="browse-actions">
      <a class="browse-button" href="#sources">資料來源</a>
      <a class="browse-button" href="https://stats.moe.gov.tw/files/opendata/u1_new.csv" aria-label="下載教育部大專校院名錄 CSV">原始名錄 CSV ↗</a>
    </div>
  </header>

  <div class="directory-controls">
  <form class="directory-filter" action="/schools#directory" method="GET" aria-label="學校篩選">
    <input type="hidden" name="sort" value={data.sort} />
    <input type="hidden" name="order" value={data.direction} />
    <div class="search-row">
      <label class="browse-field">搜尋學校<input name="q" type="search" maxlength="100" value={filters.q} placeholder="輸入校名或代碼" /></label>
      <button class="browse-button browse-primary" type="submit">搜尋</button>
    </div>
    <details class="advanced-filters" open={Boolean(filters.system || filters.ownership || filters.status)}>
      <summary>更多篩選</summary>
      <div class="advanced-controls">
        <FilterSelect name="system" label="體系" value={filters.system} options={data.systems.map((value) => ({ value, label: systemLabels[value] }))} />
        <FilterSelect name="ownership" label="公私立" value={filters.ownership} options={ownershipOptions} />
        <FilterSelect name="status" label="收錄狀態" value={filters.status} options={statusOptions} />
        <button class="browse-button" type="submit">套用篩選</button>
      </div>
    </details>
  </form>

  <section class="browse-stack national-status" aria-labelledby="national-status">
    <div class="table-meta"><h2 id="national-status">全國收錄進度</h2><p class="browse-note"><strong class="ui-tabular">{displayValue(data.coverage.schools)}／{displayValue(data.total)} 所</strong> · {displayValue(data.coverage.offerings)} 班次{#if period} · {period}（{displayValue(data.coverage.terms.length)} 個學期）{/if}</p></div>
    {#if data.total}
      <div class="status-segments" aria-hidden="true">
        {#each data.counts.filter(({ count }) => count > 0) as { status, count } (status)}
          <span style:flex-grow={count} style:background={statusColors[status]}></span>
        {/each}
      </div>
    {/if}
    <ul class="status-grid" aria-label="收錄狀態統計">
      {#each data.counts.filter(({ status, count }) => count > 0 || filters.status === status) as { status, count } (status)}
        <li>
          <a href={statusHref(status)} aria-current={filters.status === status ? 'true' : undefined}>
            <StatusPill status={status === 'pending_import' ? 'planned' : status} label={directoryStatusLabels[status]} />
            <strong class="ui-tabular">{displayValue(count)} <small>所</small></strong>
          </a>
        </li>
      {/each}
    </ul>
    {#if !awaitingImport && filters.status !== 'pending_import'}<p class="browse-note"><a href={statusHref('pending_import')}>待匯入 0 所</a>{#if data.notStarted.length && data.notStarted.length <= 3} · 尚未開始：{data.notStarted.join('、')}{/if}</p>{/if}
  </section>
  </div>

  <section class="browse-stack" aria-labelledby="directory">
    <h2 id="directory">學校名錄</h2>
    {#if filtered}<p class="browse-note">已篩選：{[filters.q, filters.system && systemLabels[filters.system], filters.ownership && ownershipLabels[filters.ownership], filters.status && directoryStatusLabels[filters.status]].filter(Boolean).join(' · ')} · <a href="/schools">清除篩選</a></p>{/if}

    {#if data.groups.length}
      <div class="table-meta">
        <p class="browse-note">{filtered ? '符合條件' : '共'} {displayValue(data.shown)} 所 · 顯示 {data.start + 1}–{data.end} 所</p>
        <div class="browse-note legend"><Heatstrip cells={[{ period: '一', value: 0 }, { period: '二', value: 1 }, { period: '三', value: 2 }]} label="覆蓋圖例" showCounts /> <span>各學年已收錄的學期數</span></div>
        <Pagination url={page.url} page={data.page} totalPages={data.totalPages} label="學校名錄上方分頁" />
      </div>
      <p class="browse-note swipe-hint" id="directory-hint">往右滑看更新時間與資料來源 <span aria-hidden="true">→</span></p>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (The named table region is horizontally scrollable.) -->
      <div class="directory-frame" role="region" aria-label="大專校院收錄狀態（表格）" aria-describedby="directory-hint" tabindex="0">
        <table>
          <caption>大專校院收錄狀態</caption>
          <thead><tr>
            <th scope="col" class="school-name" aria-sort={sortState('name')}>{@render sortLabel('name', '學校')}</th>
            <th scope="col" aria-sort={sortState('status')}>{@render sortLabel('status', '收錄狀態')}</th>
            <th scope="col" class="coverage"><span class="desktop-coverage">學年覆蓋 {yearsLabel ?? ''}</span><span class="mobile-coverage">近 {recentYears.length} 學年{#if recentYears.length}<span class="recent-years">{#each recentYears as year (year)}<span>{year}</span>{/each}</span>{/if}</span></th>
            <th scope="col" class="numeric term-count" aria-sort={sortState('terms')}>{@render sortLabel('terms', '學期')}</th>
            <th scope="col" class="numeric" aria-sort={sortState('offerings')}>{@render sortLabel('offerings', '已匯入班次')}</th>
            <th scope="col" aria-sort={sortState('updated')}>{@render sortLabel('updated', '最近更新')}</th>
            <th scope="col">資料來源</th>
          </tr></thead>
          {#each data.groups as group (group.system)}
            <tbody>
              <tr class="group"><th scope="rowgroup" colspan="7">{group.label} <small>本頁 {group.institutions.length} 所</small></th></tr>
              {#each group.institutions as school (school.code)}
                {@const cells = yearCoverage(school.terms, data.years)}
                {@const status = directoryStatus(school)}
                {@const imported = hasImportedOfferings(school)}
                <tr class:unimported={!imported}>
                  <th scope="row" class="school-name">
                    {#if hasSchoolPage(school)}<a href={schoolHref(school.slug)}>{school.name}</a>{:else}{school.name}{/if}
                    <div class="school-meta"><span class="browse-code">{school.code}</span><span class="ownership">{ownershipLabels[school.ownership]}</span>{#if imported}<span class="mobile-coverage">{displayValue(school.offerings)} 班</span>{/if}</div>
                  </th>
                  <td class="status-cell">
                    <StatusPill status={status === 'pending_import' ? 'planned' : status} label={directoryStatusLabels[status]} />
                    {#if status === 'pending_import'}
                      <small>{school.status === 'partial' ? '部分接入' : '爬蟲已接入'}，{school.terms.length ? '目前無可查班次' : '本站尚無匯入'}</small>
                    {/if}
                  </td>
                  <td class="coverage">
                    {#if imported}
                      <div class="desktop-coverage" title={coveragePeriod(school.terms)}><Heatstrip {cells} label={`${school.name}：${coveragePeriod(school.terms)}；${cells.map(({ period, value }) => `${period} 學年 ${value} 學期`).join('、')}`} /></div>
                      <div class="mobile-coverage">
                        <Heatstrip cells={cells.slice(-recentYears.length)} label={school.name} showCounts />
                        <details class="full-coverage"><summary aria-label={`${school.name}完整學年覆蓋`}>{displayValue(school.terms.length)} 學期</summary>
                          <small>{yearsLabel} 學年</small><Heatstrip {cells} label={`${school.name}完整學年覆蓋`} showCounts />
                          {@render source(school)}
                        </details>
                      </div>
                    {:else}<span title="本站尚無可查詢的班次">—</span>{/if}
                  </td>
                  <td class="numeric term-count" title={imported ? undefined : '本站尚無可查詢的班次'}>{displayValue(imported ? school.terms.length : null)}</td>
                  <td class="numeric" title={imported ? undefined : '本站尚無可查詢的班次'}>{displayValue(imported ? school.offerings : null)}</td>
                  <td>{#if school.latestImportedAt}<time datetime={school.latestImportedAt} title={`${importedAt(school.latestImportedAt)}（臺北時間）`}><span aria-hidden="true">{shortImportedAt(school.latestImportedAt)}</span><span class="full-date">{importedAt(school.latestImportedAt)}（臺北時間）</span></time>{:else}<span title="未有匯入紀錄">—</span>{/if}</td>
                  <td class="note-cell">{@render source(school)}</td>
                </tr>
              {/each}
            </tbody>
          {/each}
        </table>
      </div>
      <p class="browse-note">排序後分頁，同一頁按教育體系分組。班次只計目前可查詢的資料；— 表示該項尚無資料。</p>
      <Pagination url={page.url} page={data.page} totalPages={data.totalPages} label="學校名錄分頁" />
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
    <p class="browse-note">名錄來自教育部的<a href="https://data.gov.tw/dataset/6091">大專校院名錄</a>、<a href="https://data.gov.tw/dataset/6236">宗教研修學院概況</a>與<a href="https://data.gov.tw/dataset/6237">空大及大專進修學校概況</a>。CSV 是教育部原始名錄，不含本站的收錄狀態。班次與收錄期間採 UniCourse 匯入資料。</p>
    <p id="resource-network" class="browse-note"><Badge label="課程資源網" /> <Badge label="技職課程資源網" /> 分別標示一般大學及技職校院的課程資源網（每週更新），不含上課時間、教室及名額。</p>
  </section>
</div>

<style>
  .directory-page, .directory-page .browse-stack { gap: var(--space-2); }
  .directory-controls { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--space-4); padding: var(--space-2) var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .directory-filter, .advanced-filters[open] { display: grid; gap: var(--space-2); }
  .directory-filter { align-content: start; }
  .search-row, .advanced-controls { display: flex; align-items: end; gap: var(--space-2); max-inline-size: 38rem; }
  .advanced-controls { flex-wrap: wrap; }
  .advanced-filters summary { min-block-size: var(--target-min); align-content: center; cursor: pointer; width: fit-content; color: var(--brand); font-size: var(--t-base); font-weight: 650; }
  .directory-filter button { cursor: pointer; font-family: inherit; }
  .national-status h2 { font-size: var(--t-lg); }
  .table-meta strong { color: var(--ink); }
  .status-segments { display: flex; block-size: .45rem; overflow: hidden; border-radius: var(--radius-pill); }
  .status-segments span { flex-basis: 0; }
  .status-grid { list-style: none; display: flex; flex-wrap: wrap; gap: var(--space-1); margin: 0; padding: 0; }
  .status-grid a { display: inline-flex; align-items: center; gap: .3rem; min-block-size: var(--target-min); padding-inline: var(--space-1); border: 1px solid var(--line); background: var(--panel-raised); border-radius: var(--radius-control); color: var(--ink); text-decoration: none; font-size: var(--t-base); }
  .status-grid a:hover, .status-grid a[aria-current] { border-color: var(--brand); background: var(--brand-wash); }
  small { color: var(--muted); font-size: var(--t-sm); font-weight: normal; }
  .table-meta { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: var(--space-2); }
  .legend { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
  .swipe-hint { display: none; }
  .directory-frame { position: relative; overflow-x: auto; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
  table { width: 100%; min-width: 55rem; text-align: start; border-spacing: 0; font-size: var(--t-base); line-height: var(--leading-table); }
  caption { position: absolute; clip-path: inset(50%); inline-size: 1px; block-size: 1px; overflow: hidden; }
  th, td { text-align: start; padding: .5rem .6rem; border-bottom: 1px solid var(--line); background: var(--panel-raised); }
  th { font-weight: 650; }
  thead th { padding-block: 0; height: var(--target-min); background: var(--table-head); white-space: nowrap; }
  thead a { display: inline-flex; align-items: center; min-block-size: var(--target-min); gap: .25rem; }
  .school-name { position: sticky; left: 0; z-index: 1; inline-size: 9.5rem; min-inline-size: 9.5rem; max-inline-size: 9.5rem; box-shadow: 1px 0 var(--line); overflow-wrap: anywhere; }
  td.status-cell { min-inline-size: 10rem; }
  .status-cell small { display: block; white-space: normal; margin-block-start: .15rem; }
  .school-meta { display: flex; align-items: baseline; gap: .3rem; color: var(--muted); font-size: var(--t-xs); font-weight: 450; }
  .school-meta .browse-code { font-size: inherit; }
  .ownership { padding-inline: .25em; border: 1px solid var(--line); border-radius: .2rem; }
  thead .school-name { z-index: 3; }
  .group th { background: var(--panel); color: var(--ink-2); }
  .group small { margin-inline-start: .4rem; }
  tbody tr:not(.group):hover > * { background: var(--hover-row); }
  td time { white-space: nowrap; }
  .coverage { min-inline-size: 8.75rem; }
  .coverage :global(.strip) { flex-wrap: nowrap; }
  .directory-frame { --heatstrip-cell-size: 14px; }
  .legend, .mobile-coverage { --heatstrip-cell-size: 15px; }
  .coverage :global(.cell:not(.full, .partial)), .legend :global(.cell:not(.full, .partial)) { background: var(--table-head); border-color: var(--line); }
  .coverage :global(.cell.partial), .legend :global(.cell.partial) { background: repeating-linear-gradient(135deg, var(--brand-wash) 0 2px, color-mix(in srgb, var(--brand) 58%, var(--brand-wash)) 2px 3px, var(--brand-wash) 3px 5px); }
  .coverage .full-coverage :global(.strip) { flex-wrap: wrap; max-inline-size: 5.25rem; }
  .full-coverage > summary { min-block-size: var(--target-min); align-content: center; color: var(--brand-ink); font-size: var(--t-xs); cursor: pointer; }
  .mobile-coverage { display: none; }
  .numeric { text-align: end; font-variant-numeric: tabular-nums; white-space: nowrap; }
  td time { font-variant-numeric: tabular-nums; }
  .full-date { position: absolute; clip-path: inset(50%); inline-size: 1px; block-size: 1px; overflow: hidden; }
  .note-cell { min-inline-size: 10rem; }
  .row-source { max-inline-size: 15rem; }
  .row-source summary { min-block-size: var(--target-min); align-content: center; white-space: nowrap; cursor: pointer; color: var(--brand-ink); }
  .row-source a { display: flex; align-items: center; min-block-size: var(--target-min); font-size: var(--t-sm); }
  .browse-field input::placeholder { color: var(--muted); }
  .unimported :is(.numeric, .coverage, .browse-code) { color: var(--muted); }
  #sources { border-block-start: 1px solid var(--line); padding-block-start: .85rem; }
  @media (max-width: 938px) { .swipe-hint { display: block; } }
  @media (max-width: 680px) {
    .directory-controls { grid-template-columns: minmax(0, 1fr); gap: var(--space-2); }
    .school-name { inline-size: 8.5rem; min-inline-size: 8.5rem; max-inline-size: 8.5rem; }
    .school-meta .ownership { display: none; }
    td.status-cell { min-inline-size: 5.5rem; }
    .coverage { min-inline-size: 5.75rem; }
    .term-count { display: none; }
    .table-meta :global(nav) { display: none; }
    .desktop-coverage { display: none; }
    .mobile-coverage { display: block; }
    th, td { padding-inline: .45rem; }
    .coverage { padding-block: .25rem; --heatstrip-cell-size: 17px; }
    .recent-years { display: flex; gap: 2px; font: 9px var(--font-mono); }
    .recent-years span { inline-size: 17px; text-align: center; }
    .full-coverage > summary { margin-block-end: calc(-1 * var(--space-1)); }
    .full-coverage .row-source :is(summary, a) { white-space: normal; }
  }
</style>
