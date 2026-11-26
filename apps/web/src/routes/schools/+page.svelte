<script lang="ts">
  import { page } from '$app/state';
  import { importedAt, isHttpUrl } from '$lib/format';
  import { ISSUES_URL, directoryStatus, directoryStatusLabels, hasSchoolPage, kindLabel, ownerships, ownershipLabels, statuses, systemLabels, yearCoverage, type DirectoryStatus, type SchoolSort } from '$lib/institutions';
  import { schoolHref } from '$lib/overview-paths';
  import { changeQuery, displayValue } from '$lib/ui/format';
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
  let yearsLabel = $derived(`${data.years[0]}–${data.years.at(-1)}`);
  const ownershipOptions = ownerships.map((value) => ({ value, label: ownershipLabels[value] }));
  const statusOptions = statuses.map((value) => ({ value, label: directoryStatusLabels[value] }));
  const statusColors: Record<DirectoryStatus, string> = {
    live: 'var(--up)', partial: 'var(--warn)', pending_import: 'var(--brand)',
    blocked: 'var(--down)', planned: 'var(--info)', none: 'var(--control-line)'
  };
  const percent = new Intl.NumberFormat('zh-TW', { style: 'percent', maximumFractionDigits: 1 });
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

<div class="browse-page">
  <header class="browse-head">
    <div class="browse-stack">
      <h1>各校收錄狀態</h1>
      <p class="browse-dek">
        <span>教育部大專校院開放資料 · {displayValue(data.total)} 所</span>
        {#if data.updatedAt}<span>課程資料更新於 <time datetime={data.updatedAt}>{importedAt(data.updatedAt)}</time>（台灣時間）</span>{:else}<span>尚無課程匯入紀錄</span>{/if}
      </p>
    </div>
    <div class="browse-actions">
      <a class="browse-button" href="#sources">資料來源</a>
      <a class="browse-button" href="https://stats.moe.gov.tw/files/opendata/u1_new.csv" aria-label="下載教育部大專校院名錄 CSV">原始名錄 CSV ↗</a>
    </div>
  </header>

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
    <div class="table-meta"><h2 id="national-status">全國收錄進度</h2><p class="browse-note"><strong class="ui-tabular">{displayValue(data.offerings)}</strong> 班次已匯入 · 全國合計</p></div>
    {#if data.total}
      <div class="status-segments" aria-hidden="true">
        {#each data.counts.filter(({ count }) => count > 0) as { status, count } (status)}
          <span style:flex-grow={count} style:background={statusColors[status]}></span>
        {/each}
      </div>
    {/if}
    <ul class="status-grid" aria-label="收錄狀態統計">
      {#each data.counts as { status, count } (status)}
        <li>
          <a href={statusHref(status)} aria-current={filters.status === status ? 'true' : undefined}>
            <StatusPill status={status === 'pending_import' ? 'planned' : status} label={directoryStatusLabels[status]} />
            <strong class="ui-tabular">{displayValue(count)} <small>所</small></strong>
            <small class="ui-tabular">{percent.format(data.total ? count / data.total : 0)}</small>
          </a>
        </li>
      {/each}
    </ul>
    <p class="browse-note">「已收錄」指爬蟲已接入，且本站已有可查詢的班次；「待匯入」指已接入，但目前沒有可查詢的班次。</p>
  </section>

  <section class="browse-stack" aria-labelledby="directory">
    <h2 id="directory">學校名錄</h2>
    {#if filtered}<p class="browse-note">已篩選：{[filters.q, filters.system && systemLabels[filters.system], filters.ownership && ownershipLabels[filters.ownership], filters.status && directoryStatusLabels[filters.status]].filter(Boolean).join(' · ')} · <a href="/schools">清除篩選</a></p>{/if}

    {#if data.groups.length}
      <div class="table-meta">
        <p class="browse-note">{filtered ? '符合條件' : '共'} {displayValue(data.shown)} 所 · 顯示 {data.start + 1}–{data.end} 所</p>
        <div class="browse-note legend"><Heatstrip cells={[{ period: '一', value: 0 }, { period: '二', value: 1 }, { period: '三', value: 2 }]} label="覆蓋圖例" /> <span>空格、淺色、深色各表示 0、1、2 個學期有資料</span></div>
      </div>
      <p class="browse-note swipe-hint" id="directory-hint">往右捲動可查看學年覆蓋、更新時間與說明。</p>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (The named table region is horizontally scrollable.) -->
      <div class="directory-frame" role="region" aria-label="大專校院收錄狀態（表格）" aria-describedby="directory-hint" tabindex="0">
        <table>
          <caption>大專校院收錄狀態</caption>
          <thead><tr>
            <th scope="col" class="school-name" aria-sort={sortState('name')}>{@render sortLabel('name', '學校')}</th>
            <th scope="col" aria-sort={sortState('status')}>{@render sortLabel('status', '收錄狀態')}</th>
            <th scope="col" class="coverage">學年覆蓋 <span>{yearsLabel}</span></th>
            <th scope="col" class="numeric" aria-sort={sortState('terms')}>{@render sortLabel('terms', '學期')}</th>
            <th scope="col" class="numeric" aria-sort={sortState('offerings')}>{@render sortLabel('offerings', '已匯入班次')}</th>
            <th scope="col">類型</th>
            <th scope="col" aria-sort={sortState('updated')}>{@render sortLabel('updated', '最近更新')}</th>
            <th scope="col">說明</th>
          </tr></thead>
          {#each data.groups as group (group.system)}
            <tbody>
              <tr class="group"><th scope="rowgroup" colspan="8">{group.label} <small>本頁 {group.institutions.length} 所</small></th></tr>
              {#each group.institutions as school (school.code)}
                {@const cells = yearCoverage(school.terms, data.years)}
                {@const status = directoryStatus(school)}
                <tr>
                  <th scope="row" class="school-name">
                    {#if hasSchoolPage(school)}<a href={schoolHref(school.slug)}>{school.name}</a>{:else}{school.name}{/if}
                    <span class="browse-code">{school.code}</span>
                  </th>
                  <td class="status-cell">
                    <StatusPill status={status === 'pending_import' ? 'planned' : status} label={directoryStatusLabels[status]} />
                    {#if status === 'pending_import'}
                      <small>{school.status === 'partial' ? '部分接入' : '爬蟲已接入'}，{school.terms.length ? '目前無可查班次' : '本站尚無匯入'}</small>
                    {:else}
                      <small class="mobile-count ui-tabular">{displayValue(school.offerings)} 班次</small>
                    {/if}
                  </td>
                  <td class="coverage">
                    {#if school.terms.length}
                      <Heatstrip {cells} label={`${school.name}：${cells.map(({ period, value }) => `${period} 學年 ${value} 學期`).join('、')}`} />
                    {:else}<span class="browse-note">尚無匯入</span>{/if}
                  </td>
                  <td class="numeric">{displayValue(school.terms.length)}</td>
                  <td class="numeric">{displayValue(school.offerings)}</td>
                  <td>{kindLabel(school)}</td>
                  <td>{#if school.latestImportedAt}<time datetime={school.latestImportedAt} title={`${importedAt(school.latestImportedAt)}（台灣時間）`}><span aria-hidden="true">{shortImportedAt(school.latestImportedAt)}</span><span class="full-date">{importedAt(school.latestImportedAt)}（台灣時間）</span></time>{:else}—{/if}</td>
                  <td class="note-cell">
                    {school.note ?? ''}
                    {#if school.issue}<a href={`${ISSUES_URL}/${school.issue}`} rel="external">#{school.issue}</a>{/if}
                    {#if !hasSchoolPage(school) && school.website && isHttpUrl(school.website)}<a href={school.website} rel="external" aria-label={`${school.name}官方網站`}>官網 ↗</a>{:else if !school.note && !school.issue}—{/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          {/each}
        </table>
      </div>
      <p class="browse-note">排序後分頁，同一頁按教育體系分組。班次只計目前可查詢的資料。</p>
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
  </section>
</div>

<style>
  .directory-filter, .advanced-filters[open] { display: grid; gap: var(--space-2); }
  .search-row, .advanced-controls { display: flex; align-items: end; gap: var(--space-2); max-inline-size: 38rem; }
  .advanced-controls { flex-wrap: wrap; }
  .advanced-filters summary { min-block-size: var(--target-min); align-content: center; cursor: pointer; width: fit-content; color: var(--brand); font-size: var(--t-base); font-weight: 650; }
  .directory-filter button { cursor: pointer; font-family: inherit; }
  .national-status h2 { font-size: var(--t-lg); }
  .table-meta strong { color: var(--ink); }
  .status-segments { display: flex; block-size: .45rem; overflow: hidden; border-radius: var(--radius-pill); }
  .status-segments span { flex-basis: 0; }
  .status-grid { list-style: none; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: var(--space-2); margin: 0; padding: 0; }
  .status-grid a { display: grid; grid-template-columns: auto auto; justify-content: space-between; justify-items: start; align-items: baseline; gap: .15rem .35rem; height: 100%; padding: .45rem .6rem; border: 1px solid var(--line); background: var(--panel); border-radius: var(--radius-card); color: var(--ink); text-decoration: none; font-size: var(--t-base); }
  .status-grid a :global(.badge) { grid-column: 1 / -1; }
  .status-grid a:hover, .status-grid a[aria-current] { border-color: var(--brand); background: var(--brand-wash); }
  .status-grid strong { font-size: var(--t-lg); line-height: var(--leading-tight); }
  small { color: var(--muted); font-size: var(--t-sm); font-weight: normal; }
  .table-meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-2); }
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
  .status-cell .mobile-count { display: none; }
  thead .school-name { z-index: 3; }
  .group th { background: var(--panel); color: var(--ink-2); }
  .group small { margin-inline-start: .4rem; }
  tbody tr:not(.group):hover > * { background: var(--hover-row); }
  td:nth-child(6), td time { white-space: nowrap; }
  .coverage { min-inline-size: 8.75rem; }
  .coverage :global(.strip) { flex-wrap: nowrap; }
  .directory-frame, .legend { --seq-2: color-mix(in srgb, var(--brand) 62%, var(--panel-raised)); --seq-4: var(--brand); }
  .coverage :global(.cell:not(.full, .partial)), .legend :global(.cell:not(.full, .partial)) { background: transparent; border-color: var(--control-line); }
  .coverage > span { display: block; font: var(--t-xs) var(--font-mono); color: var(--muted); }
  .numeric { text-align: end; font-variant-numeric: tabular-nums; white-space: nowrap; }
  td time { font-variant-numeric: tabular-nums; }
  .full-date { position: absolute; clip-path: inset(50%); inline-size: 1px; block-size: 1px; overflow: hidden; }
  .note-cell { min-inline-size: 8.5rem; }
  .note-cell a { white-space: nowrap; }
  #sources { border-block-start: 1px solid var(--line); padding-block-start: .85rem; }
  @media (max-width: 938px) { .swipe-hint { display: block; } }
  @media (max-width: 680px) {
    .status-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .status-grid a { padding-inline: .45rem; }
    .status-grid small { white-space: nowrap; }
    .school-name { inline-size: 8rem; min-inline-size: 8rem; max-inline-size: 8rem; }
    .school-name .browse-code { display: inline; margin-inline-start: .25rem; font-size: var(--t-xs); }
    td.status-cell { inline-size: 9rem; min-inline-size: 9rem; }
    .status-cell .mobile-count { display: block; }
    th, td { padding-inline: .45rem; }
  }
</style>
