<script lang="ts">
  import { page } from '$app/state';
  import type { Institution } from '@unicourse/api-client';
  import { importedAt, isHttpUrl, shortImportedAt } from '$lib/format';
  import { ISSUES_URL, coveragePeriod, directoryStatus, directoryStatusLabels, hasImportedOfferings, hasSchoolPage, ownerships, ownershipLabels, statuses, systemLabels, yearCoverage, type DirectoryStatus, type SchoolSort } from '$lib/institutions';
  import { schoolHref } from '$lib/overview-paths';
  import { changeQuery, displayValue } from '$lib/ui/format';
  import Badge from '$lib/ui/Badge.svelte';
  import BarCell from '$lib/ui/BarCell.svelte';
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
    : [...directorySortOptions, { value: directoryOrder, label: '沿用目前排序' }]);
  const resourceNetwork = /^資料來源：(大學校院|技職校院)課程資源網（每週更新）(?:；\s*)?/;
  const ownershipOptions = ownerships.map((value) => ({ value, label: ownershipLabels[value] }));
  const statusOptions = statuses.map((value) => ({ value, label: directoryStatusLabels[value] }));
  let depth = $derived([
    { id: 'longer', label: '收錄 4 期以上', count: data.breadth.longer, color: 'var(--brand)' },
    { id: 'recent', label: '收錄 1–3 期', count: data.breadth.recent, color: 'var(--series-2)' },
    { id: 'empty', label: '尚無班次', count: data.total - data.coverage.schools, color: 'var(--control-line)' }
  ]);
  let csv = $derived('data:text/csv;charset=utf-8,' + encodeURIComponent('\ufeff' + [
    ['學校', '代碼', '收錄狀態', '學期', '已匯入班次', '更新時間（臺北時間）', '資料來源'],
    ...data.rows.map((school) => [school.name, school.code, directoryStatusLabels[directoryStatus(school)],
      hasImportedOfferings(school) ? school.terms.length : '', hasImportedOfferings(school) ? school.offerings : '',
      school.latestImportedAt ? importedAt(school.latestImportedAt) : '', sourceInfo(school)?.name ?? ''])
  ].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""').replace(/^[=+\-@\t\r\n]/, "'$&")}"`).join(',')).join('\r\n')));

  function sourceInfo(school: Institution) {
    const resource = school.note?.match(resourceNetwork);
    if (resource) return { name: resource[1] === '技職校院' ? '技職課程資源網' : '課程資源網', frequency: '每週更新', href: '#resource-network' };
    if (school.note?.startsWith('每日更新')) return { name: '校方課程系統', frequency: '每日更新', href: school.website && isHttpUrl(school.website) ? school.website : undefined };
    return null;
  }

  function statusHref(status: string) {
    return changeQuery(page.url, (params) => {
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
    return changeQuery(page.url, (params) => {
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
  {#if school.latestImportedAt}<p class="browse-note">最近更新：<time datetime={school.latestImportedAt}>{importedAt(school.latestImportedAt)}</time>（臺北時間）</p>{/if}
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
        <span>教育部大專校院開放資料 · {displayValue(data.total)} 所</span>
        {#if data.updatedAt}<span>課程資料更新於 <time datetime={data.updatedAt}>{importedAt(data.updatedAt)}</time>（臺北時間）</span>{:else}<span>尚無課程匯入紀錄</span>{/if}
      </p>
    </div>
    <div class="browse-actions">
      <a class="browse-button" href="#sources">資料來源</a>
    </div>
  </header>

  <section class="national-status" aria-label="全國收錄進度">
    <StatTile label="已收錄學校（所）" value={`${displayValue(data.coverage.schools)}／${displayValue(data.total)}`} />
    <StatTile label="已匯入班次" value={data.coverage.offerings} note={period ?? undefined} />
    {#if data.total}
      <div class="coverage-progress">
        <div class="status-segments" aria-hidden="true">
          {#each depth as { label, count, color } (label)}
            <span style:flex-grow={count} style:background={color}></span>
          {/each}
        </div>
        <ul class="depth-key" aria-label="收錄學期分布" role="list">
          {#each depth as { label, count, color } (label)}
            <li><i style:background={color} aria-hidden="true"></i>{label} <strong>{displayValue(count)} 所</strong></li>
          {/each}
        </ul>
      </div>
    {/if}
  </section>

  <section class="browse-stack" aria-labelledby="directory">
    <div class="table-meta">
      <h2 id="directory">學校名錄</h2>
      {#if data.rows.length}<a class="csv-link" href={csv} download="unicourse-schools.csv">下載本頁名錄 CSV</a>{/if}
    </div>
  <form class="directory-filter" action="/schools#directory" method="GET" aria-label="學校篩選">
    <input type="hidden" name="sort" value={data.sort} />
    <input type="hidden" name="order" value={data.direction} />
    {#if filters.system}<input type="hidden" name="system" value={filters.system} />{/if}
    {#if filters.depth}<input type="hidden" name="depth" value={filters.depth} />{/if}
    {#if filters.source}<input type="hidden" name="source" value={filters.source} />{/if}
    {#if data.pageSize !== 20}<input type="hidden" name="size" value={data.pageSize} />{/if}
      <label class="browse-field">搜尋學校{#key filters.q}<input name="q" type="search" maxlength="100" defaultValue={filters.q} placeholder="輸入校名或代碼" />{/key}</label>
      <button class="browse-button browse-primary" type="submit">搜尋</button>
    <details class="advanced-filters" open={Boolean(filters.ownership || filters.status)}>
      <summary>更多篩選</summary>
      <div class="advanced-controls">

        <FilterSelect name="ownership" label="公私立" value={filters.ownership} options={ownershipOptions} />
        <FilterSelect name="status" label="收錄狀態" value={filters.status} options={statusOptions} />
        <button class="browse-button" type="submit">套用篩選</button>
      </div>
    </details>
  </form>
    <details class="directory-categories">
      <summary>體系、收錄與來源捷徑</summary>
      <nav class="system-filters" aria-label="依教育體系篩選">
        <a href={systemHref('')} aria-current={!filters.system ? 'true' : undefined}>所有體系 {displayValue(data.total)}</a>
        {#each data.systems as { system, count } (system)}<a href={systemHref(system)} aria-current={filters.system === system ? 'true' : undefined}>{systemLabels[system]} {displayValue(count)}</a>{/each}
      </nav>
      <nav class="system-filters" aria-label="依收錄深度篩選">
        {#each depth as { id, label, count } (id)}<a href={depthHref(id)} aria-current={filters.depth === id ? 'true' : undefined}>{label} {displayValue(count)} 所</a>{/each}
      </nav>
      <ul class="system-filters" aria-label="收錄狀態統計" role="list">
        {#each data.counts.filter(({ count }) => count > 0) as { status, count } (status)}
          <li><a href={statusHref(status)} aria-current={filters.status === status ? 'true' : undefined}>{directoryStatusLabels[status]} {displayValue(count)} 所</a></li>
        {/each}
      </ul>
      {#if data.campusSources}<div class="system-filters"><a href={sourceHref} aria-current={filters.source ? 'true' : undefined}>校方來源 {displayValue(data.campusSources)} 所</a><p class="browse-note">依資料來源分類。收錄 4 期以上則按學期數計算。</p></div>{/if}
    </details>
    {#if filtered}<p class="browse-note">已篩選：{[filters.q, filters.system && systemLabels[filters.system], filters.ownership && ownershipLabels[filters.ownership], filters.status && directoryStatusLabels[filters.status], depth.find(({ id }) => id === filters.depth)?.label, filters.source && '校方來源'].filter(Boolean).join(' · ')} · <a href="/schools">清除篩選</a></p>{/if}

    {#if data.rows.length}
      <div class="table-meta">
        <p class="browse-note">{filtered ? '符合條件' : '共'} {displayValue(data.shown)} 所 · 顯示 {data.start + 1}–{data.end} 所{#if uniformStatus} · 本頁皆{directoryStatusLabels[uniformStatus]}{/if}</p>
      <form class="directory-sort" action="/schools#directory" method="GET" onchange={(event) => event.currentTarget.requestSubmit()}>
        {#each Object.entries(filters).filter(([, value]) => value) as [name, value] (name)}<input type="hidden" {name} {value} />{/each}
        <FilterSelect name="directory_order" label="名錄排序" allLabel={null} value={directoryOrder} options={sortOptions} />
        <FilterSelect name="size" label="每頁" allLabel={null} value={String(data.pageSize)} options={[{ value: '20', label: '20 所' }, { value: '50', label: '50 所' }]} />
        <noscript><button class="browse-button">套用排序</button></noscript>
      </form>
        <div class="desktop-pagination"><Pagination url={page.url} page={data.page} totalPages={data.totalPages} label="學校名錄上方分頁" /></div>
      </div>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (The named table region is horizontally scrollable.) -->
      <div class="directory-frame" role="region" aria-label="大專校院收錄狀態（表格）" tabindex="0">
        <table>
          <caption>大專校院收錄狀態</caption>
          <thead><tr>
            <th scope="col" class="school-name" aria-sort={sortState('name')}>{@render sortLabel('name', '學校')}</th>
            {#if !uniformStatus}<th scope="col" class="wide-column" aria-sort={sortState('status')}>{@render sortLabel('status', '收錄狀態')}</th>{/if}
            <th scope="col" class="coverage">
              學年覆蓋 {yearsLabel ?? ''}
              <span class="browse-note legend">{#each legend as item (item.value)}<span><span aria-hidden="true"><Heatstrip cells={[{ period: '覆蓋', value: item.value }]} hatchPartial /></span>{item.label}</span>{/each}</span>
              <Heatstrip cells={data.years.map((period) => ({ period, value: null }))} yearTicks="only" />
            </th>
            <th scope="col" class="numeric wide-column" aria-sort={sortState('terms')}>{@render sortLabel('terms', '學期')}</th>
            <th scope="col" class="numeric wide-column offering-column" aria-sort={sortState('offerings')}>{@render sortLabel('offerings', '已匯入班次')}</th>
            <th scope="col" class="wide-column" aria-sort={sortState('updated')}>{@render sortLabel('updated', '最近更新')}</th>
            <th scope="col" class="wide-column">資料來源</th>
          </tr></thead>
          <tbody>
              {#each data.rows as school (school.code)}
                {@const cells = yearCoverage(school.terms, data.years)}
                {@const status = directoryStatus(school)}
                {@const imported = hasImportedOfferings(school)}
                {@const source = sourceInfo(school)}
                <tr class:unimported={!imported}>
                  <th scope="row" class="school-name">
                    {#if hasSchoolPage(school)}<a href={schoolHref(school.slug)}>{school.name}</a>{:else}{school.name}{/if}
                    <span class="school-meta"><span class="browse-code">{school.code}</span><span class="ownership">{ownershipLabels[school.ownership]}</span>{#if !filters.system}<span>{systemLabels[school.system]}</span>{/if}</span>
                    {#if source}<small class="mobile-coverage mobile-source">{source.name}</small>{/if}
                    {#if !uniformStatus && status !== 'live'}<div class="mobile-coverage"><StatusPill status={status === 'pending_import' ? 'planned' : status} label={directoryStatusLabels[status]} /></div>{/if}
                  </th>
                  {#if !uniformStatus}<td class="status-cell wide-column">
                    <StatusPill status={status === 'pending_import' ? 'planned' : status} label={directoryStatusLabels[status]} />
                    {#if status === 'pending_import'}
                      <small>{school.status === 'partial' ? '部分接入' : '爬蟲已接入'}，{school.terms.length ? '目前無可查班次' : '本站尚無匯入'}</small>
                    {/if}
                  </td>{/if}
                  <td class="coverage">
                    {#if imported}
                      <Heatstrip {cells} label={school.name} hatchPartial />
                      <p class="mobile-coverage coverage-count">{displayValue(school.terms.length)} 期 · <strong>{displayValue(school.offerings)} 班</strong></p>
                      <p class="mobile-coverage coverage-count">最近一期 {school.terms[0]}</p>
                    {:else}<span title="本站尚無可查詢的班次">—</span>{/if}
                    <details class="full-coverage mobile-coverage"><summary aria-label={`${school.name}的收錄明細`}>收錄明細</summary>
                      {#if imported}<p class="browse-note">涵蓋 {coveragePeriod(school.terms)}</p>{/if}
                      {#if status === 'pending_import'}<small>{school.status === 'partial' ? '部分接入' : '爬蟲已接入'}，{school.terms.length ? '目前無可查班次' : '本站尚無匯入'}</small>{/if}
                      {@render sourceDetails(school)}
                    </details>
                  </td>
                  <td class="numeric wide-column" title={imported ? undefined : '本站尚無可查詢的班次'}>{displayValue(imported ? school.terms.length : null)}</td>
                  <td class="numeric wide-column offering-column" title={imported ? undefined : '本站尚無可查詢的班次'}><BarCell value={imported ? school.offerings : null} max={data.maxOfferings} /></td>
                  <td class="wide-column">{#if school.latestImportedAt}<time datetime={school.latestImportedAt} title={`${importedAt(school.latestImportedAt)}（臺北時間）`}><span aria-hidden="true">{shortImportedAt(school.latestImportedAt)}</span><span class="full-date">{importedAt(school.latestImportedAt)}（臺北時間）</span></time>{:else}<span title="未有匯入紀錄">—</span>{/if}</td>
                  <td class="note-cell wide-column">
                    {#if source}
                      {#if source.href}<a href={source.href} title={school.note ?? undefined}><Badge label={source.name} /></a>{:else}<Badge label={source.name} />{/if}
                      <small class="frequency">{source.frequency}</small>
                    {:else if school.issue}<a href={`${ISSUES_URL}/${school.issue}`} rel="external" title={school.note ?? undefined}>收錄紀錄 ↗</a>
                    {:else}<span title={school.note ?? '尚無來源說明'}>—</span>{/if}
                  </td>
                </tr>
              {/each}
            </tbody>
        </table>
      </div>
      <p class="browse-note">班次只計目前可查詢的資料；— 表示該項尚無資料。班次條以名錄最多班次的學校為基準，採線性尺度。</p>
      <Pagination url={page.url} page={data.page} totalPages={data.totalPages} label="學校名錄分頁" numbered />
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
    <p id="resource-network" class="browse-note"><Badge label="課程資源網" /> <Badge label="技職課程資源網" /> 分別標示一般大學及技職校院的課程資源網（每週更新），不含上課時間、教室及名額。</p>
  </section>
</div>

<style>
  .directory-page, .directory-page .browse-stack { gap: var(--space-2); }
  .national-status { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 2fr); gap: var(--space-2); }
  .coverage-progress { display: grid; align-content: center; gap: var(--space-2); padding: var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .directory-filter { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: var(--space-2); align-items: end; }
  .directory-filter:has(details[open]) .advanced-filters { grid-column: 1 / -1; }
  .advanced-controls { display: flex; align-items: end; gap: var(--space-2); }
  .advanced-controls { flex-wrap: wrap; }
  :is(.advanced-filters, .directory-categories) > summary { min-block-size: var(--target-min); align-content: center; cursor: pointer; width: fit-content; color: var(--brand); font-size: var(--t-base); font-weight: 650; }
  .directory-filter button { cursor: pointer; font-family: inherit; }
  .status-segments { display: flex; block-size: .45rem; overflow: hidden; border-radius: var(--radius-pill); }
  .status-segments span { flex-basis: 0; }
  .depth-key { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-1) var(--space-2); list-style: none; padding: 0; margin: 0; color: var(--ink-2); font-size: var(--t-sm); }
  .depth-key i { display: inline-block; inline-size: .6rem; block-size: .6rem; margin-inline-end: var(--space-1); border-radius: 50%; }
  small { color: var(--muted); font-size: var(--t-sm); font-weight: normal; }
  .table-meta { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: var(--space-2); }
  .legend, .legend > span { display: flex; flex-wrap: wrap; align-items: center; gap: .2rem .5rem; font-size: var(--t-sm); }
  .legend { margin-block: .18rem .35rem; --heatstrip-cell-size: 10px; }
  .system-filters { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-1); margin: 0 0 var(--space-2); padding: 0; list-style: none; }
  .system-filters a { display: inline-flex; align-items: center; padding-inline: var(--space-2); min-block-size: var(--target-min); border-radius: var(--radius-pill); background: var(--chip); color: var(--ink-2); font-size: var(--t-sm); text-decoration: none; }
  .system-filters a:hover { text-decoration: underline; }
  .system-filters a[aria-current] { background: var(--brand-wash); color: var(--brand-ink); font-weight: 700; }
  .directory-frame { position: relative; overflow-x: auto; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
  table { width: 100%; min-width: 55rem; text-align: start; border-spacing: 0; font-size: var(--t-base); line-height: var(--leading-table); }
  caption { position: absolute; clip-path: inset(50%); inline-size: 1px; block-size: 1px; overflow: hidden; }
  th, td { text-align: start; padding: .18rem .55rem; border-bottom: 1px solid var(--line); background: var(--panel-raised); }
  th { font-weight: 650; }
  thead th { padding-block: var(--space-1); height: var(--target-min); background: var(--table-head); white-space: nowrap; }
  thead a { display: inline-flex; align-items: center; min-block-size: var(--target-min); gap: .25rem; }
  .school-name { position: sticky; left: 0; z-index: 1; inline-size: 19%; min-inline-size: 10rem; box-shadow: 1px 0 var(--line); overflow-wrap: anywhere; }
  td.status-cell { inline-size: 10%; min-inline-size: 6rem; }
  .status-cell small { display: block; white-space: normal; margin-block-start: .15rem; }
  .school-name a { display: block; width: fit-content; }
  .school-meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: .2rem .3rem; color: var(--muted); font-size: var(--t-xs); font-weight: 450; }
  .school-meta .browse-code { font-size: inherit; margin-inline-start: .2rem; }
  .ownership { padding-inline: .25em; border: 1px solid var(--line); border-radius: .2rem; }
  thead .school-name { z-index: 3; }
  tbody tr:hover > * { background: var(--hover-row); }
  td time { white-space: nowrap; }
  .coverage { inline-size: 13rem; min-inline-size: 8.75rem; }
  .directory-frame { --heatstrip-cell-size: 14px; --heatstrip-tick-size: var(--t-base); --heatstrip-partial-hatch: repeating-linear-gradient(135deg, transparent 0 2px, var(--brand-ring) 2px 3px, transparent 3px 5px); --heatstrip-empty-line: var(--muted); }
  .full-coverage > summary { min-block-size: var(--target-min); align-content: center; color: var(--brand-ink); font-size: var(--t-sm); cursor: pointer; font-weight: 650; }
  .full-coverage a { display: flex; align-items: center; min-block-size: var(--target-min); font-size: var(--t-sm); }
  .mobile-coverage { display: none; }
  .csv-link { min-height: var(--target-min); align-content: center; font-size: var(--t-sm); }
  .directory-sort { display: flex; gap: var(--space-2); }
  .numeric { text-align: end; font-variant-numeric: tabular-nums; white-space: nowrap; }
  td time { font-variant-numeric: tabular-nums; }
  .full-date { position: absolute; clip-path: inset(50%); inline-size: 1px; block-size: 1px; overflow: hidden; }
  .note-cell { inline-size: 11rem; }
  .note-cell a { text-decoration: none; }
  .note-cell a:hover { text-decoration: underline; }
  .frequency { display: inline-block; margin-inline-start: var(--space-1); }
  .offering-column { min-inline-size: 10.5rem; border-inline-start: 1px solid var(--line); padding-inline-start: var(--space-3); }
  thead .offering-column { text-align: start; }
  .offering-column :global(.bar-cell) { display: grid; grid-template-columns: minmax(0, 1fr) 8ch; }
  .offering-column :global(.bar-cell > .ui-tabular) { grid-column: 2; }
  .browse-field input::placeholder { color: var(--muted); }
  .unimported :is(.numeric, .coverage, .browse-code) { color: var(--muted); }
  #sources { border-block-start: 1px solid var(--line); padding-block-start: .85rem; }
  @media (max-width: 58rem) {
    table { min-width: 0; }
    .wide-column, .desktop-pagination { display: none; }
    .mobile-coverage { display: block; }
    .school-meta { display: flex; }
    .coverage-count, .mobile-source { color: var(--ink-2); font-size: var(--t-sm); }
    .school-name a { min-block-size: var(--target-min); align-content: center; }
  }
  @media (max-width: 680px) {
    .national-status { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .coverage-progress { grid-column: 1 / -1; padding-block: var(--space-2); }
    .directory-filter { grid-template-columns: minmax(0, 1fr) auto; }
    .advanced-filters { grid-column: 1 / -1; }
    .school-name { position: static; inline-size: 45%; min-inline-size: 0; max-inline-size: 9rem; }
    th, td { padding-inline: .45rem; }
    .coverage { padding-block: .25rem; --heatstrip-cell-size: clamp(7px, 2.8vw, 14px); }
  }
</style>
