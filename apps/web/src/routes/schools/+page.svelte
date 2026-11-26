<script lang="ts">
  import { page } from '$app/state';
  import { importedAt, isHttpUrl } from '$lib/format';
  import { ISSUES_URL, hasSchoolPage, kindLabel, ownerships, ownershipLabels, statuses, statusLabels, systemLabels, yearCoverage, type SchoolSort } from '$lib/institutions';
  import { schoolHref } from '$lib/overview-paths';
  import { changeQuery, displayValue } from '$lib/ui/format';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import FilterBar from '$lib/ui/FilterBar.svelte';
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
  const statusOptions = statuses.map((value) => ({ value, label: statusLabels[value] }));
  const percent = new Intl.NumberFormat('zh-TW', { style: 'percent', maximumFractionDigits: 1 });

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

  <ul class="status-grid" aria-label="收錄狀態統計">
    {#each data.counts as { status, count } (status)}
      <li>
        <a href={statusHref(status)} aria-current={filters.status === status ? 'true' : undefined}>
          <StatusPill {status} /> <strong class="ui-tabular">{displayValue(count)}</strong>
          <small>{percent.format(data.total ? count / data.total : 0)}</small>
        </a>
      </li>
    {/each}
    <li class="grand-total"><span>已匯入班次</span><strong class="ui-tabular">{displayValue(data.offerings)}</strong><small>全校合計</small></li>
  </ul>

  <section class="browse-stack" aria-labelledby="directory">
    <h2 id="directory">學校名錄</h2>
    <FilterBar action="/schools" label="學校篩選" applyLabel="篩選" clearHref={filtered ? '/schools' : undefined}
      hidden={{ sort: data.sort, order: data.direction }}>
      <label class="browse-field">關鍵字<input name="q" type="search" maxlength="100" value={filters.q} placeholder="校名或代碼" /></label>
      <FilterSelect name="system" label="體系" value={filters.system} options={data.systems.map((value) => ({ value, label: systemLabels[value] }))} />
      <FilterSelect name="ownership" label="公私立" value={filters.ownership} options={ownershipOptions} />
      <FilterSelect name="status" label="狀態" value={filters.status} options={statusOptions} />
    </FilterBar>

    {#if data.groups.length}
      <div class="table-meta">
        <p class="browse-note">{filtered ? '符合條件' : '共'} {displayValue(data.shown)} 所 · 顯示 {data.start + 1}–{data.end} 所</p>
        <div class="browse-note legend"><Heatstrip cells={[{ period: '一', value: 0 }, { period: '二', value: 1 }, { period: '三', value: 2 }]} label="覆蓋圖例" /> <span>空格、淺色、深色各表示 0、1、2 個學期有資料</span></div>
      </div>
      <p class="browse-note swipe-hint" id="directory-hint">左右捲動可查看學期數、班次與說明。</p>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (The named table region is horizontally scrollable.) -->
      <div class="directory-frame" role="region" aria-label="大專校院收錄狀態（表格）" aria-describedby="directory-hint" tabindex="0">
        <table>
          <caption>大專校院收錄狀態</caption>
          <thead><tr>
            <th scope="col" class="school-name" aria-sort={sortState('name')}>{@render sortLabel('name', '學校')}</th>
            <th scope="col" aria-sort={sortState('status')}>{@render sortLabel('status', '狀態')}</th>
            <th scope="col" class="coverage">學年覆蓋 <span>{yearsLabel}</span></th>
            <th scope="col" class="numeric" aria-sort={sortState('terms')}>{@render sortLabel('terms', '學期')}</th>
            <th scope="col" class="numeric" aria-sort={sortState('offerings')}>{@render sortLabel('offerings', '班次')}</th>
            <th scope="col">類型</th>
            <th scope="col" aria-sort={sortState('updated')}>{@render sortLabel('updated', '最近更新')}</th>
            <th scope="col">說明</th>
          </tr></thead>
          {#each data.groups as group (group.system)}
            <tbody>
              <tr class="group"><th scope="rowgroup" colspan="8">{group.label} <small>本頁 {group.institutions.length} 所</small></th></tr>
              {#each group.institutions as school (school.code)}
                {@const cells = yearCoverage(school.terms, data.years)}
                <tr>
                  <th scope="row" class="school-name">
                    {#if hasSchoolPage(school)}<a href={schoolHref(school.slug)}>{school.name}</a>{:else}{school.name}{/if}
                    <span class="browse-code">（{school.code}）</span>
                  </th>
                  <td><StatusPill status={school.status} /></td>
                  <td class="coverage">
                    {#if school.terms.length}
                      <Heatstrip {cells} label={`${school.name}：${cells.map(({ period, value }) => `${period} 學年 ${value} 學期`).join('、')}`} />
                    {:else}<span class="browse-note">尚無匯入</span>{/if}
                  </td>
                  <td class="numeric">{displayValue(school.terms.length)}</td>
                  <td class="numeric">{displayValue(school.offerings)}</td>
                  <td>{kindLabel(school)}</td>
                  <td>{#if school.latestImportedAt}<time datetime={school.latestImportedAt}>{importedAt(school.latestImportedAt)}</time>{:else}—{/if}</td>
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
      <p class="browse-note">排序後分頁，同一頁按教育體系分組；狀態反映收錄進度，不代表已有匯入資料。</p>
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
  .status-grid { list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(8.75rem, 1fr)); gap: var(--space-2); margin: 0; padding: 0; }
  .status-grid a, .grand-total { display: grid; justify-items: start; gap: .25rem; height: 100%; padding: .65rem .75rem; border: 1px solid var(--line); background: var(--panel); border-radius: var(--radius-card); color: var(--ink); text-decoration: none; font-size: var(--t-base); }
  .status-grid a:hover, .status-grid a[aria-current] { border-color: var(--brand); background: var(--brand-wash); }
  .status-grid strong { font-size: var(--t-xl); line-height: var(--leading-tight); }
  small { color: var(--muted); font-size: var(--t-sm); font-weight: normal; }
  .table-meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-2); }
  .legend { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
  .swipe-hint { display: none; }
  .directory-frame { position: relative; max-height: 40rem; overflow: auto; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
  table { width: 100%; min-width: 55rem; text-align: start; border-spacing: 0; font-size: var(--t-base); line-height: var(--leading-table); }
  caption { position: absolute; clip-path: inset(50%); inline-size: 1px; block-size: 1px; overflow: hidden; }
  th, td { text-align: start; padding: .5rem .6rem; border-bottom: 1px solid var(--line); background: var(--panel-raised); }
  th { font-weight: 650; }
  thead th { position: sticky; top: 0; z-index: 2; padding-block: 0; height: var(--target-min); background: var(--table-head); white-space: nowrap; }
  thead a { display: inline-flex; align-items: center; min-block-size: var(--target-min); gap: .25rem; }
  .school-name { position: sticky; left: 0; z-index: 1; min-inline-size: 8.5rem; max-inline-size: 11rem; box-shadow: 1px 0 var(--line); overflow-wrap: anywhere; }
  thead .school-name { z-index: 3; }
  .group th { background: var(--panel); color: var(--ink-2); }
  .group small { margin-inline-start: .4rem; }
  tbody tr:not(.group):hover > * { background: var(--hover-row); }
  td:nth-child(2), td:nth-child(6) { white-space: nowrap; }
  .coverage { min-inline-size: 8.75rem; }
  .coverage :global(.strip) { flex-wrap: nowrap; }
  .coverage > span { display: block; font: var(--t-xs) var(--font-mono); color: var(--muted); }
  .numeric { text-align: end; font-variant-numeric: tabular-nums; white-space: nowrap; }
  td time { font-variant-numeric: tabular-nums; }
  .note-cell { min-inline-size: 8.5rem; }
  .note-cell a { white-space: nowrap; }
  #sources { border-block-start: 1px solid var(--line); padding-block-start: .85rem; }
  @media (max-width: 938px) { .swipe-hint { display: block; } }
  @media (350px <= width <= 640px) {
    .status-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .status-grid a, .grand-total { padding-inline: .5rem; }
    .status-grid small { white-space: nowrap; }
    .school-name { min-inline-size: 7.5rem; }
    th, td { padding-inline: .45rem; }
  }
</style>
