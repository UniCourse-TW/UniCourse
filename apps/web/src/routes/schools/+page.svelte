<script lang="ts">
  import '$lib/overview-page.css';
  import { importedAt, isHttpUrl } from '$lib/format';
  import {
    ISSUES_URL,
    hasSchoolPage,
    kindLabel,
    ownershipLabels,
    ownerships,
    statusLabels,
    statuses,
    systemLabels,
    type CrawlStatus
  } from '$lib/institutions';
  import { schoolHref } from '$lib/overview-paths';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let filters = $derived(data.filters);
  let filtered = $derived(!!(filters.system || filters.ownership || filters.status || filters.q));
  const number = new Intl.NumberFormat('zh-TW');

  /** Summary chips filter by status while keeping the other filters. */
  function statusHref(status: CrawlStatus) {
    const params = new URLSearchParams();
    if (filters.system) params.set('system', filters.system);
    if (filters.ownership) params.set('ownership', filters.ownership);
    if (filters.q) params.set('q', filters.q);
    if (filters.status !== status) params.set('status', status);
    const query = params.toString();
    return query ? `/schools?${query}` : '/schools';
  }
</script>

<svelte:head>
  <title>各校收錄狀態｜UniCourse</title>
  <meta name="description" content="全國大專校院的課程資料收錄狀態：已收錄的學期、開課班次與尚未收錄的原因。" />
</svelte:head>

<header class="overview-header">
  <h1>各校收錄狀態</h1>
  <p class="overview-muted">
    依教育部大專校院名錄列出全國 {number.format(data.total)} 所學校，說明 UniCourse 目前收錄的課程資料。
    {#if data.updatedAt}最近匯入：<time datetime={data.updatedAt}>{importedAt(data.updatedAt)}</time>{/if}
  </p>
  <ul class="chips" aria-label="收錄狀態統計">
    {#each data.counts as { status, count } (status)}
      <li>
        <a
          href={statusHref(status)}
          class={`chip status-${status}`}
          aria-current={filters.status === status ? 'true' : undefined}
        >
          {statusLabels[status]} <strong>{number.format(count)}</strong>
        </a>
      </li>
    {/each}
  </ul>
</header>

<!-- `selected` on options keeps a choice made before hydration; `value` on the select would reset it. -->
<form method="GET" action="/schools" class="filters" aria-label="篩選學校">
  <label>
    體系
    <select name="system">
      <option value="" selected={!filters.system}>全部</option>
      {#each data.systems as system (system)}
        <option value={system} selected={filters.system === system}>{systemLabels[system]}</option>
      {/each}
    </select>
  </label>
  <label>
    公私立
    <select name="ownership">
      <option value="" selected={!filters.ownership}>全部</option>
      {#each ownerships as ownership (ownership)}
        <option value={ownership} selected={filters.ownership === ownership}>{ownershipLabels[ownership]}</option>
      {/each}
    </select>
  </label>
  <label>
    狀態
    <select name="status">
      <option value="" selected={!filters.status}>全部</option>
      {#each statuses as status (status)}
        <option value={status} selected={filters.status === status}>{statusLabels[status]}</option>
      {/each}
    </select>
  </label>
  <label class="keyword">
    關鍵字
    <input name="q" type="search" value={filters.q} maxlength="100" placeholder="校名或學校代碼" />
  </label>
  <div class="actions">
    <button>篩選</button>
    {#if filtered}<a href="/schools">清除篩選</a>{/if}
  </div>
</form>

{#if data.groups.length}
  <p class="scroll-hint overview-muted">表格可左右捲動查看更多欄位。</p>
  <!-- Focusable so keyboard users can scroll the table horizontally on narrow screens. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="table-wrap" role="region" aria-labelledby="schools-caption" tabindex="0">
    <table>
      <caption id="schools-caption">
        大專校院收錄狀態（{filtered ? `符合條件 ${number.format(data.shown)} 所` : `共 ${number.format(data.shown)} 所`}，時間以台灣時間顯示）
      </caption>
      <thead>
        <tr>
          <th scope="col" class="name">學校（代碼）</th>
          <th scope="col">類型</th>
          <th scope="col">狀態</th>
          <th scope="col">收錄學期數 / 班次數</th>
          <th scope="col">最近更新</th>
          <th scope="col">說明</th>
        </tr>
      </thead>
      {#each data.groups as group (group.system)}
        <tbody>
          <tr class="group">
            <th scope="rowgroup" colspan="6">
              <span>{group.label}<small>{number.format(group.institutions.length)} 所</small></span>
            </th>
          </tr>
          {#each group.institutions as institution (institution.code)}
            <tr>
              <th scope="row" class="name">
                {#if hasSchoolPage(institution)}
                  <a href={schoolHref(institution.slug)}>{institution.name}</a>
                {:else}
                  {institution.name}
                {/if}
                <span class="code">（{institution.code}）</span>
                {#if !hasSchoolPage(institution) && institution.website && isHttpUrl(institution.website)}
                  <a
                    class="website"
                    href={institution.website}
                    rel="external noopener noreferrer"
                    aria-label={`${institution.name}官方網站`}>官網</a
                  >
                {/if}
              </th>
              <td class="kind">{kindLabel(institution)}</td>
              <td><span class={`badge status-${institution.status}`}>{statusLabels[institution.status]}</span></td>
              <td class="count">
                {#if institution.terms.length || institution.offerings}
                  {number.format(institution.terms.length)} 學期 / {number.format(institution.offerings)} 班次
                {:else}
                  —
                {/if}
              </td>
              <td>
                {#if institution.latestImportedAt}
                  <time datetime={institution.latestImportedAt}>{importedAt(institution.latestImportedAt)}</time>
                {:else}
                  —
                {/if}
              </td>
              <td class="note">
                {#if institution.note || institution.issue}
                  {institution.note ?? ''}
                  {#if institution.issue}
                    <a href={`${ISSUES_URL}/${institution.issue}`} rel="external noopener noreferrer">#{institution.issue}</a>
                  {/if}
                {:else}
                  —
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      {/each}
    </table>
  </div>
{:else}
  <p>沒有符合條件的學校。<a href="/schools">清除篩選</a></p>
{/if}

<style>
  .chips { display: flex; flex-wrap: wrap; gap: 0.45rem; margin: 0.85rem 0 0; padding: 0; list-style: none; }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 2.5rem;
    padding: 0.3rem 0.7rem;
    border: 1px solid transparent;
    border-radius: 999px;
    font-size: 0.9rem;
    font-weight: 650;
    text-decoration: none;
    font-variant-numeric: tabular-nums;
  }
  .chip[aria-current='true'] { border-color: currentColor; box-shadow: inset 0 0 0 1px currentColor; }
  .status-live { background: #e2f3e7; color: #1c5a30; }
  .status-partial { background: #fff1d8; color: #694217; }
  .status-blocked { background: #fde5e5; color: #8b1e1e; }
  .status-planned { background: #e5edfb; color: #234a8a; }
  .status-none { background: #f1eef5; color: #4f465d; }

  .filters {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: end;
    gap: 0.65rem;
    padding: 0.85rem;
    margin: 0 0 1.25rem;
    border: 1px solid #e5dfef;
    border-radius: 0.85rem;
    background: white;
  }
  label { display: grid; gap: 0.25rem; min-width: 0; font-weight: 650; }
  .keyword { grid-column: 1 / 3; }
  input, select, button {
    width: 100%;
    min-height: 2.75rem;
    padding: 0.45rem 0.75rem;
    border: 1px solid #aca0bc;
    border-radius: 0.45rem;
    background: white;
    color: inherit;
    font: inherit;
  }
  .actions { display: flex; align-items: center; gap: 0.75rem; }
  .actions a { white-space: nowrap; }
  button { border-color: #5630a5; background: #5630a5; color: white; font-weight: 650; cursor: pointer; }

  .scroll-hint { margin: 0 0 0.4rem; font-size: 0.85rem; }
  .table-wrap {
    overflow-x: auto;
    border: 1px solid #e5dfef;
    border-radius: 0.8rem;
    background: white;
  }
  .table-wrap:focus-visible { outline: 2px solid #5630a5; outline-offset: 2px; }
  table { width: 100%; min-width: 50rem; border-collapse: collapse; font-size: 0.875rem; }
  caption { padding: 0.7rem 0.8rem; color: #594f69; text-align: left; font-weight: 650; }
  th, td { padding: 0.55rem 0.6rem; border-top: 1px solid #ece7f3; text-align: left; vertical-align: top; }
  thead th { background: #f5f1fa; white-space: nowrap; }
  /* The school column stays in view while the rest of the row scrolls. */
  .name {
    position: sticky;
    left: 0;
    z-index: 1;
    width: min(38vw, 14rem);
    min-width: 8.5rem;
    background: white;
    box-shadow: 1px 0 0 #ece7f3;
    overflow-wrap: anywhere;
  }
  thead .name { background: #f5f1fa; }
  th.name { font-weight: 650; }
  .code { color: #594f69; font-weight: 400; font-variant-numeric: tabular-nums; }
  .website { display: inline-block; margin-inline-start: 0.2rem; font-weight: 400; font-size: 0.8rem; }
  .group th { padding-block: 0.5rem; background: #faf8fd; font-size: 0.95rem; }
  /* A full-width cell cannot stick, so its label does. */
  .group span { position: sticky; left: 0.6rem; display: inline-flex; gap: 0.5rem; align-items: baseline; }
  .group small { color: #594f69; font-weight: 400; }
  .badge { display: inline-block; padding: 0.08rem 0.45rem; border-radius: 0.3rem; font-weight: 650; white-space: nowrap; }
  .kind, .count, time { white-space: nowrap; font-variant-numeric: tabular-nums; }
  td { color: #3b3150; }
  .note { min-width: 14rem; overflow-wrap: anywhere; }

  @media (max-width: 38rem) {
    .filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .filters label:nth-child(3) { grid-column: 1 / -1; }
    .keyword, .actions { grid-column: 1 / -1; }
  }
  @media (min-width: 52rem) {
    .filters { grid-template-columns: repeat(3, minmax(0, 0.7fr)) minmax(10rem, 1.3fr) auto; }
    .keyword { grid-column: auto; }
    .scroll-hint { display: none; }
  }
</style>
