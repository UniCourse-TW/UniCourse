<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { afterNavigate, goto } from '$app/navigation';
  import { navigating, page } from '$app/state';
  import { ISSUES_URL, directoryStatusLabels, systemLabels, systems } from '$lib/institutions';
  import {
    categories, categoryLabels, indexPolicy, indexPolicyLabels, INDEXED_PTT_BOARDS, institutions, institutionsByCode, isSchoolSite, kindLabels,
    loginLabel, matchesSchoolName, operatorLabels, siteStatuses, sites as allSites, statusLabels, type SchoolSection, type Site
  } from '$lib/landscape-data';
  import SectionLinks from '$lib/section-jumps.svelte';
  import SitesList from '$lib/landscape-sites.svelte';
  import DataTable from '$lib/ui/DataTable.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import FilterChip from '$lib/ui/FilterChip.svelte';
  import Pagination from '$lib/ui/Pagination.svelte';
  import FilterSelect from '$lib/ui/FilterSelect.svelte';
  import SectionHeader from '$lib/ui/SectionHeader.svelte';
  import StatRow from '$lib/ui/StatRow.svelte';
  import StatTile from '$lib/ui/StatTile.svelte';
  import StatusPill from '$lib/ui/StatusPill.svelte';
  import ChartValues from '$lib/ui/ChartValues.svelte';
  import { changeQuery } from '$lib/ui/format';
  import type { TableColumn } from '$lib/ui/types';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let filters = $derived(data.filters);
  let filtered = $derived(
    !!(filters.q || filters.system || filters.kind || filters.category || filters.status || filters.third)
  );
  let selectCount = $derived(
    [filters.system, filters.kind, filters.category, filters.status].filter(Boolean).length + (filters.third ? 1 : 0)
  );
  const number = new Intl.NumberFormat('zh-TW');
  const DATA_URL = 'https://github.com/UniCourse-TW/UniCourse/blob/main/data/course-sites.json';

  // The toolbar looks the same with or without JavaScript: 套用 always submits. With JavaScript,
  // changes also apply themselves after a short pause, and the result line says so while loading.
  let hydrated = $state(false);
  let updating = $derived(Boolean(navigating.to?.url.pathname === '/landscape'));
  const PHONE_PAGE_SIZE = 10;
  const DESKTOP_PAGE_SIZE = 20;
  let pageSize = $state(PHONE_PAGE_SIZE);
  let schoolHash = $state('');
  let schoolAnchorIndex = $derived(schoolHash ? data.schools.findIndex(({ id }) => id === schoolHash) : -1);

  function listPage(parameter: string, total: number, anchoredIndex = -1) {
    const pages = Math.ceil(total / pageSize);
    const requested = Math.trunc(Number(page.url.searchParams.get(parameter))) || 1;
    const current = anchoredIndex >= 0 ? Math.floor(anchoredIndex / pageSize) + 1 : Math.max(1, Math.min(pages, requested));
    const offset = (current - 1) * pageSize;
    return { current, pages, offset, end: Math.min(offset + pageSize, total), total };
  }
  let thirdStatus = $derived(Object.fromEntries(siteStatuses.map((status) => [status, data.thirdParty.filter((site) => site.status === status).length])) as Record<Site['status'], number>);
  /** Every school for the search box's 「跳到該校」 suggestions, whatever the current filter shows. */
  const siteCounts = new Map<string, number>();
  for (const site of allSites) if (isSchoolSite(site)) siteCounts.set(site.schools[0], (siteCounts.get(site.schools[0]) ?? 0) + 1);
  const finderSchools = institutions.map((school) => ({
    code: school.code,
    id: school.slug ?? `s-${school.code}`,
    name: school.name,
    count: siteCounts.get(school.code) ?? 0
  }));

  let finderQuery = $state('');
  let finderActive = $state(0);
  let finderOpen = $state(false);
  let finderMatches = $derived(finderQuery.trim() ? finderSchools.filter((school) =>
    school.code === finderQuery.trim() || school.id === finderQuery.trim().toLowerCase() || matchesSchoolName(school.name, finderQuery)
  ).slice(0, 6) : []);
  // The box keeps what is typed; it only follows the URL when the filter changes elsewhere (a removed chip,
  // 清除), since a value attribute would be re-applied on every keystroke's re-render.
  const initialQuery = () => data.filters.q;
  let searchValue = $state(initialQuery());
  $effect.pre(() => {
    const q = filters.q;
    if (untrack(() => searchValue.trim()) !== q) searchValue = q;
  });
  /** Jumps to a school's section; the typed name was only a lookup, so the filter is cleared. */
  async function goToSchool(id: string) {
    clearTimeout(debounce);
    finderOpen = false;
    finderQuery = '';
    searchValue = '';
    await goto(`/landscape#${id}`, { keepFocus: true });
    await revealHash();
    document.getElementById(id)?.querySelector('summary')?.focus({ preventScroll: true });
  }
  /** A school fragment can address a row on any page of the directory. */
  async function revealHash() {
    schoolHash = location.hash.slice(1);
    await tick();
    if (location.hash === '#about') {
      aboutOpen = true;
      requestAnimationFrame(() => document.getElementById('about')?.scrollIntoView());
      return;
    }
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    if (!(target instanceof HTMLDetailsElement) || !target.classList.contains('school')) return;
    target.open = true;
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
  function finderKey(event: KeyboardEvent) {
    if (!finderMatches.length) return;
    if (event.key === 'Tab') finderOpen = false;
    if (event.key === 'ArrowDown') { event.preventDefault(); finderOpen = true; finderActive = (finderActive + 1) % finderMatches.length; }
    else if (event.key === 'ArrowUp') { event.preventDefault(); finderActive = (finderActive - 1 + finderMatches.length) % finderMatches.length; }
    else if (event.key === 'Enter' && finderOpen) { event.preventDefault(); goToSchool(finderMatches[finderActive].id); }
    else if (event.key === 'Escape') finderOpen = false;
  }
  let form: HTMLFormElement | undefined = $state();
  let debounce: ReturnType<typeof setTimeout> | undefined;
  /** Status bars: each system's mix (default) or the systems' sizes on one scale. */
  let stackMode = $state<'share' | 'count'>('share');
  let aboutOpen = $state(false);
  let filtersOpen = $state(false);
  let schoolPage = $derived(listPage('school_page', data.schools.length, schoolAnchorIndex));
  let platformPage = $derived(listPage('platform_page', data.cross.length));
  /** A narrow filter (one to three schools) opens their site lists right away. */
  let openSchools = $derived(filtered && data.schools.length <= 3);
  let sections = $derived([
    ...(data.schools.length ? [{ id: 'schools-title', label: '各校網站', count: number.format(data.schools.length) }] : []),
    ...(data.thirdParty.length ? [{ id: 'third-party', label: '第三方', count: number.format(data.thirdParty.length) }] : []),
    ...(data.cross.length ? [{ id: 'cross', label: '平台', count: number.format(data.cross.length) }] : []),
    { id: 'by-system', label: '體系', count: number.format(data.bySystem.length) }
  ]);
  /** UniCourse's own crawl status, said once above the school list instead of a column of identical pills. */
  let importedSchools = $derived(data.crawl ? data.schools.filter((school) => data.crawl?.[school.code]?.hasCourses).length : null);
  let topMax = $derived(Math.max(1, ...data.topThird.map((row) => row.count)));
  afterNavigate(() => { void revealHash(); });
  onMount(() => {
    hydrated = true;
    const desktop = matchMedia('(min-width: 64.001rem)');
    const updatePageSize = () => {
      pageSize = desktop.matches ? DESKTOP_PAGE_SIZE : PHONE_PAGE_SIZE;
      if (schoolHash) void revealHash();
    };
    updatePageSize();
    desktop.addEventListener('change', updatePageSize);
    window.addEventListener('hashchange', revealHash);
    return () => {
      clearTimeout(debounce);
      desktop.removeEventListener('change', updatePageSize);
      window.removeEventListener('hashchange', revealHash);
    };
  });
  function submitSoon(delay = 0) {
    clearTimeout(debounce);
    debounce = setTimeout(() => apply(), delay);
  }
  /** Navigates with only the non-empty fields, so shared URLs stay short (`?q=臺大&kind=third`). */
  function apply(status?: Site['status'] | '') {
    if (!form) return;
    const params = new URLSearchParams();
    for (const [name, value] of new FormData(form)) if (typeof value === 'string' && value) params.set(name, value);
    if (status === '') params.delete('status');
    else if (status) params.set('status', status);
    const query = params.toString();
    goto(query ? `/landscape?${query}` : '/landscape', { keepFocus: true, noScroll: true, replaceState: true });
  }

  const systemOptions = systems.map((system) => ({ value: system, label: systemLabels[system] }));
  const kindOptions = (['official', 'third'] as const).map((kind) => ({ value: kind, label: kindLabels[kind] }));
  const categoryOptions = categories.map((category) => ({ value: category, label: categoryLabels[category] }));
  let activeHref = $derived(changeQuery(new URL(page.url.pathname + page.url.search, page.url), (params) => {
    if (filters.status === 'active') params.delete('status');
    else params.set('status', 'active');
  }));
  const statusOptions = siteStatuses.map((status) => ({ value: status, label: statusLabels[status] }));

  function schoolsOf(site: Site) {
    if (site.schools.length === 0) return site.scope === 'national' ? '全國' : '跨校';
    if (site.schools.length > 3) return `${site.schools.length} 校`;
    return site.schools.map((code) => institutionsByCode.get(code)?.name ?? code).join('、');
  }

  const allThirdColumns: TableColumn<Site>[] = [
    { id: 'site', label: '網站', value: (site) => site.name, sortable: true, width: '18em' },
    { id: 'schools', label: '學校', value: schoolsOf, sortable: true, width: 'min(20%, 14rem)' },
    { id: 'category', label: '功能', value: (site) => site.category.map((c) => categoryLabels[c]).join('、') },
    { id: 'operator', label: '營運者', value: (site) => operatorLabels[site.operator], sortable: true, width: '5rem' },
    { id: 'login', label: '登入', value: (site) => loginLabel(site.loginRequired), width: '6.5rem' },
    { id: 'status', label: '狀態', value: (site) => statusLabels[site.status], sortable: true, width: '5.5rem' },
    { id: 'policy', label: '收錄策略', value: (site) => indexPolicyLabels[indexPolicy(site)], width: '6rem' },
    { id: 'detail', label: '查核', width: '4.25rem' }
  ];
  const collator = new Intl.Collator('zh-TW', { numeric: true });
  let thirdPage = $derived(listPage('third_page', data.thirdParty.length));
  let thirdOrder = $derived.by(() => {
    const column = allThirdColumns.find((entry) => entry.sortable && entry.id === page.url.searchParams.get('third_sort'));
    const direction = page.url.searchParams.get('third_order') === 'desc' ? 'descending' : 'ascending';
    return column ? { column: column.id, direction } as const : undefined;
  });
  let thirdRows = $derived.by(() => {
    const value = allThirdColumns.find(({ id }) => id === thirdOrder?.column)?.value;
    const direction = thirdOrder?.direction === 'descending' ? -1 : 1;
    const ordered = value ? data.thirdParty.toSorted((left, right) =>
      direction * collator.compare(String(value(left)), String(value(right)))
    ) : data.thirdParty;
    return ordered.slice(thirdPage.offset, thirdPage.end);
  });
  function thirdSortHref(column: string) {
    return changeQuery(new URL('#third-party', page.url), (params) => {
      params.delete('third_page');
      params.set('third_sort', column);
      if (thirdOrder?.column === column && thirdOrder.direction === 'ascending') params.set('third_order', 'desc');
      else params.delete('third_order');
    });
  }

  // Links are the default; flag the exceptions that UniCourse indexes.
  let thirdColumns = $derived(thirdRows.some((site) => indexPolicy(site) === 'excerpt')
    ? allThirdColumns
    : allThirdColumns.filter((column) => column.id !== 'policy'));


  let totalBySystem = $derived(data.bySystem.map((row) => row.active + row.inactive + row.unknown));
  let largestSystem = $derived(Math.max(1, ...totalBySystem));
  const pct = (part: number, total: number) => (total ? (part / total) * 100 : 0);

  const statusColumns: TableColumn<(typeof data.bySystem)[number]>[] = [
    { id: 'system', label: '體系', value: (row) => row.label },
    { id: 'active', label: '運作中', numeric: true, value: (row) => row.active },
    { id: 'inactive', label: '停止', numeric: true, value: (row) => row.inactive },
    { id: 'unknown', label: '不明', numeric: true, value: (row) => row.unknown },
    { id: 'total', label: '合計', numeric: true, value: (row) => row.active + row.inactive + row.unknown }
  ];
</script>

<svelte:head>
  <title>課程網站總覽｜UniCourse</title>
  <meta
    name="description"
    content="全國 {data.totalSchools} 所大專校院的課程查詢、選課、教學大綱系統與第三方查課工具，共 {data.totalSites} 個，含運作狀態與 UniCourse 的收錄策略。"
  />
</svelte:head>

{#snippet schoolRow(school: SchoolSection)}
  {@const crawl = data.crawl?.[school.code]}
  {@const total = school.official.length + school.third.length}
  <!-- A school row opens its site list. -->
  <details class="school" id={school.id} open={openSchools || undefined}>
    <summary>
      <!-- The list gives the coverage count once. Only exceptions carry a row-level status. -->
      <h3 id={`${school.id}-title`} class="s-name">{school.name} <small class="code">{school.code}</small>{#if crawl && crawl.status !== 'live'} <StatusPill status={crawl.status === 'pending_import' ? 'planned' : crawl.status} label={directoryStatusLabels[crawl.status]} />{/if}</h3>
      <span class="s-where"><span>{school.systemLabel}</span><span>{school.ownership === 'public' ? '公立' : '私立'}</span>{#if school.city}<span>{school.city}</span>{/if}</span>
      <span class="s-stats">
        <span class="s-n official-count ui-tabular"><span class="s-lbl">官方 </span>{school.official.length}</span>
        <span class="s-n third-count-cell ui-tabular" class:zero={!school.third.length}><span class="s-lbl">第三方 </span>{school.third.length}</span>
        <span class="s-mix">
          {#if total}
            <span class="mini" aria-hidden="true">
              <i class="active" class:positive={school.status.active > 0} style:inline-size={`${pct(school.status.active, total)}%`}></i><i class="inactive" class:positive={school.status.inactive > 0} style:inline-size={`${pct(school.status.inactive, total)}%`}></i><i class="unknown" class:positive={school.status.unknown > 0} style:inline-size={`${pct(school.status.unknown, total)}%`}></i>
            </span>
            <span class="school-status ui-tabular">
              <span>運作 <b>{school.status.active}</b></span>
              <span>停止 <b>{school.status.inactive}</b></span>
              <span>不明 <b>{school.status.unknown}</b></span>
            </span>
          {:else}
            <span class="muted">尚未盤點</span>
          {/if}
        </span>
      </span>
      <span class="school-disclosure"><span class="see">查看網站</span><span class="hide">收合網站</span></span>
    </summary>
    <div class="school-body">
      {#if crawl?.href || school.via.length}
        <p class="school-meta">
          {#if crawl?.href}<a class="strong" href={crawl.href}>看 UniCourse 收錄的 {school.name} <span class="nowrap">課程 →</span></a>{/if}
          {#if school.via.length}<span>也可透過跨校平台：{#each school.via as via, index (via.url)}{index ? '、' : ''}<a href={via.url} rel="noopener external">{via.name}</a>{/each}</span>{/if}
        </p>
      {/if}
      {#if total}
        <SitesList label={`${school.name}的課程網站`} sites={[...school.official, ...school.third]} />
      {:else}
        <p class="none">尚未盤點到這所學校的課程網站。<a href={ISSUES_URL} rel="noopener external">補充資料 ↗</a></p>
      {/if}
    </div>
  </details>
{/snippet}

{#snippet schoolResults()}
  <section aria-labelledby="schools-title" class="schools">
    <SectionHeader id="schools-title" level={2} title={`各校（${number.format(data.schools.length)} 所）`} />
    <div class="school-context">
      {#if importedSchools !== null}
        <p class="crawl-line"><span>有查課網站 <strong>{number.format(filtered ? data.stats.schools : data.surveyedSchools)}</strong> 所（含跨校）</span><a href="/schools">名錄中有 UniCourse 課程 <strong>{number.format(importedSchools)}</strong> 所</a></p>
      {/if}
      {#if data.schools.length}
        <p class="legend" aria-label="各校網站狀態圖例">
          <span><i class="active" aria-hidden="true"></i>運作中</span><span><i class="inactive" aria-hidden="true"></i>停止</span><span><i class="unknown" aria-hidden="true"></i>不明</span><a href="#about">查核定義</a>
        </p>
      {/if}
    </div>
    {#if data.schools.length === 0}
      <EmptyState title="沒有符合的學校" description="換個校名，或取消「有第三方站的學校」。">
        {#snippet action()}<a class="action" href="/landscape">清除篩選</a>{/snippet}
      </EmptyState>
    {:else}
      {#key data.schools}
        <div class="school-table">
          <div class="school-cols" aria-hidden="true">
            <span>學校</span><span>體系・地區</span><span class="n">官方</span><span class="n">第三方</span><span>網站狀態</span>
          </div>
          {#each data.schools.slice(schoolPage.offset, schoolPage.end) as school (school.code)}
            {@render schoolRow(school)}
          {/each}
        </div>
      {/key}
      {@render listFooter(schoolPage, 'school_page', 'schools-title', '各校網站', '所')}
    {/if}
  </section>
{/snippet}

{#snippet listFooter(list: ReturnType<typeof listPage>, parameter: string, id: string, label: string, unit: string)}
  {#if list.pages > 1}
    <div class="table-foot">
      <p class="shown-count">第 {number.format(list.offset + 1)}–{number.format(list.end)} {unit}，共 {number.format(list.total)} {unit}</p>
      <Pagination url={new URL('#' + id, page.url)} page={list.current} totalPages={list.pages}
        {parameter} label={label + '分頁'} compact showPageWords jump />
    </div>
  {/if}
{/snippet}

{#snippet siteDetails(site: Site)}
  <details class="site-details">
    <summary aria-label={`${site.name}的網站查核明細`}><span aria-hidden="true">▾</span></summary>
    <div>
      <p>營運者：{operatorLabels[site.operator]}{site.operatorName ? `（${site.operatorName}）` : ''}</p>
      <p>查核日期：<time datetime={site.lastChecked}>{site.lastChecked.replaceAll('-', '/')}</time></p>
      {#if site.notes}<p>{site.notes}</p>{:else}<p>此站無其他查核備註。</p>{/if}
    </div>
  </details>
{/snippet}

<svelte:window onkeydown={(event) => { if (event.key === 'Escape' && filtersOpen) filtersOpen = false; }} />

<div class="landscape" id="top">
  <header class="page-head">
    <div class="title-row">
      <h1>臺灣大專校院課程網站總覽</h1>
      <div class="head-actions">
        <a href="#about" onclick={() => (aboutOpen = true)}>資料來源 <span aria-hidden="true">ⓘ</span></a>
        <a href={DATA_URL} rel="noopener external">資料檔 JSON <span aria-hidden="true">↗</span></a>
      </div>
    </div>
    <p class="dek">
      <span>全國課程查詢、選課與第三方工具名錄</span>
      <span>查核於 <time datetime={data.checkedAt}>{data.checkedAt.replaceAll('-', '/')}</time></span>
      {#if !data.crawl}<span class="warn">各校收錄狀態暫時無法取得</span>{/if}
    </p>
  </header>

  <div class="toolbar">
    <form
      method="GET"
      action="/landscape"
      aria-label="篩選網站"
      bind:this={form}
      onsubmit={(event) => { if (hydrated) { event.preventDefault(); apply(); } }}
    >
      <!-- The page's one search box: it filters the guide, and a typed school name also offers a jump to that school. -->
      <div class="finder">
        <label class="finder-label" for="landscape-query">搜尋校名、網站或功能</label>
        <div class="search">
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="8.5" cy="8.5" r="5.5" /><path d="m12.5 12.5 4 4" stroke-linecap="round" />
          </svg>
          <input
            bind:value={searchValue}
            type="search"
            name="q"
            id="landscape-query"
            placeholder="清大、0002、排課"
            maxlength="100"
            autocomplete="off"
            role={hydrated ? 'combobox' : undefined}
            aria-autocomplete={hydrated ? 'list' : undefined}
            aria-expanded={hydrated ? finderOpen && finderMatches.length > 0 : undefined}
            aria-controls={hydrated ? 'school-finder' : undefined}
            aria-activedescendant={finderOpen && finderMatches.length ? `finder-${finderMatches[finderActive]?.id}` : undefined}
            oninput={() => { finderQuery = searchValue; finderOpen = true; finderActive = 0; submitSoon(350); }}
            onkeydown={finderKey}
            onblur={() => setTimeout(() => (finderOpen = false), 150)}
          />
        </div>
        <ul class="finder-list" id="school-finder" role="listbox" aria-label="跳到學校段落" hidden={!hydrated || !finderOpen || !finderMatches.length}>
          <li class="finder-head" role="presentation">依校查看網站。全頁結果仍可篩選。</li>
          {#each finderMatches as school, index (school.code)}
            <li id={`finder-${school.id}`} role="option" aria-selected={index === finderActive}>
              <button type="button" tabindex="-1" onmousedown={(event) => event.preventDefault()} onclick={() => goToSchool(school.id)}>
                <span>{school.name}</span><small>{school.count ? `${school.count} 個網站` : '尚未盤點'} ↓</small>
              </button>
            </li>
          {/each}
        </ul>
      </div>
      <a class="active-only" href={activeHref} aria-current={filters.status === 'active' ? 'true' : undefined} onclick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        clearTimeout(debounce);
        filtersOpen = false;
        apply(filters.status === 'active' ? '' : 'active');
      }}>
        {filters.status === 'active' ? '取消只看運作中' : '只看運作中'}
      </a>
      <details class="more" bind:open={filtersOpen}>
        <summary>篩選{#if selectCount}<span class="badge-count">{selectCount}</span>{/if}</summary>
        <!-- svelte-ignore a11y_no_static_element_interactions (change events bubble from the selects inside) -->
        <div class="fields" onchange={() => submitSoon()}>
          <FilterSelect name="system" label="體系" options={systemOptions} value={filters.system} />
          <FilterSelect name="kind" label="類型" options={kindOptions} value={filters.kind} allLabel="官方＋第三方" />
          <FilterSelect name="category" label="功能" options={categoryOptions} value={filters.category} />
          <FilterSelect name="status" label="狀態" options={statusOptions} value={filters.status} />
          <label class="check">
            <input type="checkbox" name="third" value="1" checked={filters.third} />
            有第三方站的學校
          </label>
        </div>
      </details>
      <!-- Without JavaScript 套用 submits; with it, every change applies itself, so the button goes away. -->
      {#if !hydrated}<button type="submit" class="apply">套用</button>{/if}
    </form>
  </div>

  <div class="filter-summary">
    <p class="result" role="status" aria-live="polite">
      {#if updating}<span class="dot" aria-hidden="true"></span>更新中…
      {:else if filtered}符合 <strong class="ui-tabular">{number.format(data.shownSites)}</strong> / {number.format(data.totalSites)} 個網站
        <a class="clear inline-clear" href="/landscape">清除全部條件</a>
      {:else}
        共 <strong class="ui-tabular">{number.format(data.totalSites)}</strong> 個網站（網址去重）
      {/if}
    </p>
    {#if filtered}
      <div class="chips" role="group" aria-label="已套用的篩選">
        {#if filters.q}<FilterChip url={page.url} name="q" label={`「${filters.q}」`} />{/if}
        {#if filters.system}<FilterChip url={page.url} name="system" label={systemLabels[filters.system]} />{/if}
        {#if filters.kind}<FilterChip url={page.url} name="kind" label={kindLabels[filters.kind]} />{/if}
        {#if filters.category}<FilterChip url={page.url} name="category" label={categoryLabels[filters.category]} />{/if}
        {#if filters.status}<FilterChip url={page.url} name="status" label={statusLabels[filters.status]} />{/if}
        {#if filters.third}<FilterChip url={page.url} name="third" label="有第三方站的學校" />{/if}
      </div>
    {/if}
  </div>

  {#if data.shownSites}<SectionLinks id="filters" {sections} label="跳至" trackCurrent={false} />{/if}

  <div class="landscape-metrics"><StatRow label="網站統計">
    <StatTile label={filtered ? '有符合網站的學校' : '已盤點到網站的學校'} value={filtered ? data.stats.schools : `${number.format(data.surveyedSchools)}／${number.format(data.totalSchools)}`} unit="所"
      note={filtered ? `全國已盤點 ${number.format(data.surveyedSchools)}／${number.format(data.totalSchools)} 所` : '含跨校平台涵蓋的學校'} />
    <StatTile label="官方網站" value={data.stats.official} unit="個" note="校方或政府營運" />
    <StatTile label="第三方網站" value={data.stats.third} unit="個" note="含第三方跨校與全國平台" />
    <StatTile label="運作中" value={`${number.format(data.stats.active)}／${number.format(data.shownSites)}`} unit="個"
      note={filtered ? '占符合的網站' : '占全部盤點網站'} />
  </StatRow></div>

  {#if data.shownSites === 0}
    <EmptyState title="沒有符合的網站" description="換個關鍵字，或放寬體系、功能與狀態。">
      {#snippet action()}<a class="action" href="/landscape">清除篩選</a>{/snippet}
    </EmptyState>
  {:else}
    <div class="viz">
      <section class="panel" aria-labelledby="by-system">
        <div class="panel-head">
          <SectionHeader id="by-system" level={2} title="各體系網站狀態"
            description={`${stackMode === 'share' ? '各體系網站占比，滿格為 100%' : `各體系網站數，滿格為 ${number.format(largestSystem)} 個`}。跨校平台按體系計入，全國平台另計。`} />
          {#if hydrated && data.bySystem.length}
            <div class="mode" role="group" aria-label="長條顯示方式">
              <button type="button" aria-pressed={stackMode === 'share'} onclick={() => (stackMode = 'share')}>比例</button>
              <button type="button" aria-pressed={stackMode === 'count'} onclick={() => (stackMode = 'count')}>數量</button>
            </div>
          {/if}
        </div>
        {#if data.bySystem.length}
          <ul class="stack" class:share={stackMode === 'share'} aria-label="各體系網站狀態">
            {#each data.bySystem as row, index (row.system)}
              {@const total = totalBySystem[index]}
              {@const share = stackMode === 'share' ? 1 : total / largestSystem}
              <li>
                <span class="stack-label">{row.label} <small class="ui-tabular">{number.format(total)} 個</small></span>
                <span class="track" role="img" style:inline-size={`${share * 100}%`}
                  title={`運作中 ${row.active}・停止 ${row.inactive}・不明 ${row.unknown}`}
                  aria-label={`${row.label}：運作中 ${row.active}、停止 ${row.inactive}、不明 ${row.unknown}，共 ${total} 個`}>
                  <span class="seg active" class:positive={row.active > 0} style:inline-size={`${pct(row.active, total)}%`}></span>
                  <span class="seg inactive" class:positive={row.inactive > 0} style:inline-size={`${pct(row.inactive, total)}%`}></span>
                  <span class="seg unknown" class:positive={row.unknown > 0} style:inline-size={`${pct(row.unknown, total)}%`}></span>
                </span>
                <!-- The numbers sit beside the bar, never inside it, so every row reads the same way. -->
                <span class="stack-values ui-tabular" aria-hidden="true">
                  <span class="v active"><i></i>運作 {row.active}</span>
                  <span class="v inactive"><i></i>停止 {row.inactive}</span>
                  <span class="v unknown"><i></i>不明 {row.unknown}</span>
                </span>
              </li>
            {/each}
          </ul>
          <ChartValues label="各體系網站狀態" columns={statusColumns} rows={data.bySystem} rowKey={(row) => row.system} />
        {:else}
          <p class="quiet">目前的篩選沒有歸屬任何體系的網站。</p>
        {/if}
      </section>
      <section class="panel" aria-labelledby="top-third">
        <SectionHeader id="top-third" level={2} title="第三方工具最多的學校"
          description={`${filtered ? '依目前篩選' : '依全部資料'}統計單校第三方網站數。滿格為 ${number.format(topMax)} 個。`} />
        {#if data.topThird.length}
          <ol class="rank" aria-label="第三方工具最多的學校">
            {#each data.topThird as row (row.code)}
              {@const rank = data.topThird.findIndex((entry) => entry.count === row.count) + 1}
              {@const tied = data.topThird.filter((entry) => entry.count === row.count).length > 1}
              <li>
                <span class="rank-index" title={tied ? `並列第 ${rank} 名` : `第 ${rank} 名`}>{tied ? '=' : ''}{rank}</span>
                <a href={hydrated ? `#${row.id}` : `/landscape?${new URLSearchParams({ q: row.code })}#schools-title`}>{row.name}</a>
                <span class="rank-track" aria-hidden="true"><span style:inline-size={`${(row.count / topMax) * 100}%`}></span></span>
                <span class="rank-n ui-tabular">{row.count} 個</span>
              </li>
            {/each}
          </ol>
        {:else}
          <p class="quiet">目前的篩選沒有單一學校的第三方網站。</p>
        {/if}
      </section>
    </div>

    {@render schoolResults()}
    <section aria-labelledby="third-party" class="third">
      <SectionHeader id="third-party" level={2} title="第三方查課網站"
        description={data.thirdParty.length ? `含下方的第三方平台。運作中 ${number.format(thirdStatus.active)}、停止 ${number.format(thirdStatus.inactive)}、不明 ${number.format(thirdStatus.unknown)}` : undefined} />
      <div class="third-table">
      <DataTable caption="第三方查課網站（表頭可排序）" columns={thirdColumns}
        rows={thirdRows} rowKey={(site) => site.url} rowHeaderColumn="site" stickyColumn="site"
        rowHref={(site) => site.url} order={thirdOrder} minWidth="50rem" maxHeight="none">
        {#snippet header(column, direction)}
          {#if column.sortable}
            <a href={thirdSortHref(column.id)}>{column.label} <span aria-hidden="true">{direction === 'ascending' ? '↑' : direction === 'descending' ? '↓' : '↕'}</span></a>
          {:else}{column.label}{/if}
        {/snippet}
        {#snippet cell(site, column)}
          {#if column.id === 'site'}
            <span class="site-cell">{site.name}<span class="ext" aria-hidden="true">&nbsp;↗</span>{#if !isSchoolSite(site)} <span class="cat">{site.scope === 'national' ? '全國' : '跨校'}</span>{/if}{#if site.operatorName}<small>{site.operatorName}</small>{/if}</span>
          {:else if column.id === 'login' || column.id === 'operator'}
            <span class="nowrap">{column.value?.(site)}</span>
          {:else if column.id === 'category'}
            <span class="cats">{#each site.category as category (category)}<span class="cat">{categoryLabels[category]}</span>{/each}</span>
          {:else if column.id === 'status'}
            <span class="st {site.status}"><i aria-hidden="true"></i>{statusLabels[site.status]}</span>
          {:else if column.id === 'detail'}
            {@render siteDetails(site)}
          {:else if column.id === 'policy'}
            <span class="nowrap" class:policy-excerpt={indexPolicy(site) === 'excerpt'}>{indexPolicyLabels[indexPolicy(site)]}</span>
          {:else}
            {column.value?.(site) ?? '—'}
          {/if}
        {/snippet}
        {#snippet empty()}
          <span>這組篩選沒有第三方網站。</span>
        {/snippet}
      </DataTable>
      </div>
      <!-- Phones use compact rows for the same preview. -->
      <ul class="third-rows" aria-label="第三方查課網站">
        {#each thirdRows as site (site.url)}
          <li>
            <a class="third-name" href={site.url} rel="noopener external">{site.name}<span class="ext" aria-hidden="true">&nbsp;↗</span></a>
            <span class="st {site.status}"><i aria-hidden="true"></i>{statusLabels[site.status]}</span>
            <span class="third-meta">
              <span>{!isSchoolSite(site) && site.schools.length ? `${site.scope === 'national' ? '全國' : '跨校'} ` : ''}{schoolsOf(site)}</span><span>{loginLabel(site.loginRequired)}</span>
              {#each site.category as category (category)}<span class="cat">{categoryLabels[category]}</span>{/each}
              {#if indexPolicy(site) === 'excerpt'}<span class="cat excerpt">索引摘要</span>{/if}
            </span>
            {@render siteDetails(site)}
          </li>
        {:else}
          <li class="third-empty">這組篩選沒有第三方網站。</li>
        {/each}
      </ul>
      {@render listFooter(thirdPage, 'third_page', 'third-party', '第三方查課網站', '個')}
    </section>

    {#if data.cross.length}
      <section class="cross" id="cross" aria-labelledby="cross-title">
        <SectionHeader id="cross-title" level={2} title={`跨校與全國平台（${number.format(data.cross.length)} 個）`}
          description="含官方與第三方；第三方平台也列於上方。" />
        <SitesList label="跨校與全國平台" sites={data.cross.slice(platformPage.offset, platformPage.end)} showOperator header />
        {@render listFooter(platformPage, 'platform_page', 'cross', '跨校與全國平台', '個')}
      </section>
    {/if}
  {/if}

  <section class="about" aria-labelledby="about-title">
    <details bind:open={aboutOpen}>
      <summary><h2 id="about-title">資料來源與統計口徑</h2></summary>
      <ul id="about">
        <li>學校名錄來自教育部「大專校院名錄」等開放資料，共 {number.format(data.totalSchools)} 所；網站清單由 UniCourse 逐校盤點，記錄在 repo 的 <code>data/course-sites.json</code>。</li>
        <li>「運作中」指查核當日可連線且約一年內有更新；「停止」含無法連線、已下架或公告停用；「不明」多為需登入的校內系統，暫無法確認。登入條件與 robots.txt（如有記錄）請見各站查核明細。</li>
        <li>「官方」是校方或政府營運的網站，其餘（學生、社群、公司）算第三方。體系圖合計 {number.format(totalBySystem.reduce((sum, count) => sum + count, 0))} 次，即符合的 {number.format(data.shownSites)} 個網站，扣除 {number.format(data.systemTally.national)} 個全國平台{#if data.systemTally.repeats}，加上 {number.format(data.systemTally.repeats)} 次跨體系重計{/if}。</li>
        <li>統計與清單依目前篩選計算。各校名錄按教育部學校代碼排序，逐校所列官網與第三方網站數不含跨校或全國平台。</li>
        <li>UniCourse 只為 PTT 的 {INDEXED_PTT_BOARDS.length} 個課程看板（{INDEXED_PTT_BOARDS.join('、')}）索引不超過 120 字的摘要，與<a href="/terms#reviews">使用條款</a>列出的看板相同；其他網站只給連結。</li>
        <li>各校的「{Object.values(directoryStatusLabels).join('／')}」是 UniCourse 自己的資料收錄狀態，與<a href="/schools">各校收錄狀態</a>頁一致。</li>
        <li>發現錯誤或遺漏，歡迎到 <a href={ISSUES_URL} rel="noopener external">GitHub issues ↗</a> 回報。</li>
      </ul>
    </details>
  </section>
  <a class="action back-to-top" href="#top">↑ 回到頂端</a>
</div>

<style>
  .landscape {
    display: grid;
    gap: var(--space-3);
    min-inline-size: 0;
    --section-jump-top: calc(3.75rem + 1px);
    --t-sm: .8125rem;
    --t-xs: .8125rem;
    color: var(--ink);
    font: var(--t-md) / var(--leading-body) var(--font-sans);
  }
  .muted { color: var(--muted); }

  /* Page head: one h1, a one-line dek with the survey date, actions on the right. */
  .page-head { display: grid; gap: var(--space-1); }
  .title-row { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); align-items: baseline; justify-content: space-between; }
  h1 { margin: 0; font-size: var(--t-2xl); font-weight: 650; line-height: var(--leading-tight); letter-spacing: var(--tracking-heading); text-wrap: balance; }
  .head-actions { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-4); font-size: var(--t-sm); font-weight: 600; }
  .head-actions a, .action, .clear, .none a, .about a, .school-meta a { color: var(--brand-ink); text-underline-offset: 0.15em; }
  .head-actions a { display: inline-flex; align-items: center; min-block-size: 2rem; }
  .dek { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); margin: 0; color: var(--muted); font-size: var(--t-base); }
  .warn { color: var(--ink-2); }
  .landscape :global(:focus-visible) { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .school-disclosure { color: var(--brand-ink); font-size: var(--t-sm); font-weight: 650; white-space: nowrap; }
  .school-disclosure::after { content: ' ▾'; }
  .school[open] .school-disclosure::after { content: ' ▴'; }
  .school[open] .see, .school:not([open]) .hide { display: none; }
  .school-context { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-3); align-items: baseline; }
  .third-rows li, .rank li { position: relative; }
  .rank a::after { content: ''; position: absolute; inset: 0; }
  .third-rows li:hover, .rank li:hover { background: var(--hover-row); }
  /* Site status in tables: a small dot and the word, not a pill, so a column of them stays quiet. */
  .st { display: inline-flex; gap: 0.4em; align-items: center; color: var(--ink-2); font-size: var(--t-sm); white-space: nowrap; }
  .st i { inline-size: 8px; block-size: 8px; border-radius: 50%; }
  .st.active { color: var(--ink); }
  .st.active i { background: var(--up); }
  .st.inactive i { background: var(--muted); }
  .st.unknown i { border: 1.5px solid var(--muted); }

  .toolbar { position: relative; z-index: 6; }
  .active-only { display: inline-flex; align-items: center; justify-content: center; min-block-size: var(--target-min); padding-inline: var(--space-2); border: 1px solid var(--control-line); border-radius: var(--radius-control); color: var(--brand-ink); font-size: var(--t-sm); font-weight: 650; text-decoration: none; }
  .active-only[aria-current] { border-color: var(--brand); background: var(--brand-wash); }
  .active-only:hover { text-decoration: underline; }
  form { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: end; }
  .search {
    display: flex;
    flex: 1 1 16rem;
    align-items: center;
    gap: var(--space-2);
    min-inline-size: 0;
    padding-inline-start: var(--space-3);
    border: 1px solid var(--control-line);
    border-radius: var(--radius-control);
    background: var(--panel-raised);
    color: var(--muted);
  }
  .search:has(input:focus-visible) { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .search input {
    flex: 1;
    min-inline-size: 0;
    min-block-size: var(--target-min);
    padding: 0 var(--space-2) 0 0;
    border: 0;
    background: transparent;
    color: var(--ink);
    font: var(--t-base) / var(--leading-table) var(--font-sans);
  }
  .search input:focus { outline: none; }
  .search input::placeholder { color: var(--muted); opacity: 1; }
  .fields { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
  .more[open] .fields {
    position: absolute;
    z-index: 6;
    inset-inline: 0;
    inset-block-start: calc(100% + var(--space-1));
    padding: var(--space-3);
    border: 1px solid var(--control-line);
    border-radius: var(--radius-control);
    background: var(--panel-raised);
  }
  .more summary {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-block-size: var(--target-min);
    padding: 0 var(--space-3);
    border: 1px solid var(--control-line);
    border-radius: var(--radius-control);
    background: var(--panel-raised);
    color: var(--ink-2);
    font-size: var(--t-base);
    font-weight: 600;
    cursor: pointer;
    list-style: none;
  }
  .more summary::-webkit-details-marker { display: none; }
  .more summary::after { content: '▾'; color: var(--muted); }
  .more[open] summary::after { content: '▴'; }
  .more summary:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .badge-count { display: inline-grid; place-items: center; min-inline-size: 1.25rem; block-size: 1.25rem; padding: 0 5px; border-radius: var(--radius-pill); background: var(--brand); color: var(--on-brand); font-size: var(--t-xs); }
  /* The school-level switch looks like a toggle chip, so it does not read as a fifth select. */
  .check {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-block-size: var(--target-min);
    padding-inline: var(--space-3);
    border: 1px solid var(--control-line);
    border-radius: var(--radius-pill);
    background: var(--panel-raised);
    color: var(--ink-2);
    font-size: var(--t-base);
    white-space: nowrap;
    cursor: pointer;
  }
  .check:has(input:checked) { border-color: var(--brand); background: var(--brand-wash); color: var(--brand-ink); font-weight: 600; }
  .check input { inline-size: 1rem; block-size: 1rem; margin: 0; accent-color: var(--brand); }
  .check:has(input:focus-visible) { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .apply, .clear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-block-size: var(--target-min);
    min-inline-size: var(--target-min);
    padding: 0 var(--space-3);
    border: 1px solid transparent;
    border-radius: var(--radius-control);
    font: inherit;
    font-size: var(--t-base);
    font-weight: 600;
    touch-action: manipulation;
  }
  .apply { color: var(--on-brand); background: var(--brand); cursor: pointer; }
  .clear:hover { background: var(--brand-wash); }
  :is(.apply, .clear, .action):focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .filter-summary { display: grid; gap: var(--space-2); }
  .site-details { font-size: var(--t-sm); }
  .site-details summary {
    display: grid; place-items: center; inline-size: var(--target-min); min-block-size: var(--target-min);
    border-radius: var(--radius-control); color: var(--muted); cursor: pointer; list-style: none;
  }
  .site-details summary::-webkit-details-marker { display: none; }
  .site-details[open] summary span { rotate: 180deg; }
  .site-details summary:hover { color: var(--brand-ink); background: var(--hover-row); }
  .site-details div { min-inline-size: 0; padding: var(--space-2); color: var(--ink-2); background: var(--panel); border-radius: var(--radius-control); }
  .site-details p { margin: 0; overflow-wrap: anywhere; }
  .third-table .site-details[open] div { position: relative; inline-size: min(22rem, 42vw); margin-inline-start: calc(var(--target-min) - min(22rem, 42vw)); }
  .third-table :global(tbody td:last-child) { padding-block: 0; }
  .result { display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--space-1); margin: 0; min-block-size: 1.25rem; color: var(--muted); font-size: var(--t-sm); }
  .result .dot { inline-size: 8px; block-size: 8px; border-radius: 50%; background: var(--brand); }
  .result strong { color: var(--ink); font-weight: 600; }
  .chips { display: flex; flex-wrap: wrap; gap: var(--space-2); }

  /* Charts: stacked status bars per system and a ranked bar list, side by side and about as tall. */
  .viz { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr)); gap: var(--space-3); align-items: stretch; }
  .finder { position: relative; display: grid; gap: var(--space-1); flex: 1 1 16rem; min-inline-size: 0; }
  .finder-label { color: var(--ink-2); font-size: var(--t-sm); }
  .finder-list[hidden] { display: none; }
  .finder-list { position: absolute; inset-inline: 0; inset-block-start: calc(100% + 4px); z-index: 10; display: grid; margin: 0; padding: var(--space-1); list-style: none; border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); box-shadow: 0 8px 24px color-mix(in srgb, var(--ink) 14%, transparent); }
  .finder-head { padding: var(--space-1) var(--space-2); color: var(--ink-2); font-size: var(--t-sm); text-wrap: pretty; }
  .finder-list button { display: flex; gap: var(--space-2); align-items: baseline; justify-content: space-between; inline-size: 100%; min-block-size: var(--target-min); padding: 0 var(--space-2); border: 0; border-radius: calc(var(--radius-control) - 2px); background: transparent; color: var(--ink); font: var(--t-base) / 1.3 var(--font-sans); text-align: start; cursor: pointer; }
  .finder-list small { color: var(--muted); font-size: var(--t-xs); white-space: nowrap; }
  .finder-list [aria-selected='true'] button, .finder-list button:hover { background: var(--brand-wash); color: var(--brand-ink); }
  .third-rows { display: none; margin: 0; padding: 0; list-style: none; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
  .panel { display: grid; gap: var(--space-3); align-content: start; padding: var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); min-inline-size: 0; }
  .stack { display: grid; gap: var(--space-2); margin: 0; padding: 0; list-style: none; font-size: var(--t-base); }
  /* Fixed label and value columns, so every row's 100% bar has the same length. */
  .stack li { display: grid; grid-template-columns: 7.5rem minmax(0, 1fr) 12rem; grid-template-areas: 'label track values'; gap: var(--space-1) var(--space-3); align-items: center; }
  .stack-label { grid-area: label; color: var(--ink-2); font-size: var(--t-sm); }
  .stack-label small { color: var(--muted); font-size: var(--t-xs); }
  .stack .track { grid-area: track; }
  .stack.share .track { background: none; }
  .track { display: flex; block-size: 12px; overflow: hidden; border-radius: 3px; background: var(--chip); }
  .seg { display: block; block-size: 100%; }
  .positive { min-inline-size: 3px; }
  .stack .track { min-inline-size: 3px; }
  /* No text sits on the bars, so the status colours can be strong in both themes. */
  .seg.active, .legend i.active, .v.active i, .mini .active { background: color-mix(in srgb, var(--up) 80%, var(--panel)); }
  .seg.inactive, .legend i.inactive, .v.inactive i, .mini .inactive { background: color-mix(in srgb, var(--muted) 65%, var(--panel)); }
  /* Status segments differ by texture as well as color. */
  .seg.unknown, .legend i.unknown, .v.unknown i, .mini .unknown { background: repeating-linear-gradient(135deg, var(--muted) 0 2px, var(--chip) 2px 5px); }
  .stack-values { grid-area: values; display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); color: var(--ink-2); font-size: var(--t-sm); white-space: nowrap; }
  .v { display: inline-flex; align-items: center; gap: 4px; }
  .v i { display: inline-block; inline-size: 8px; block-size: 8px; border-radius: 2px; }
  .v.active { color: var(--ink); font-weight: 650; }
  .legend { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-4); margin: 0; color: var(--ink-2); font-size: var(--t-sm); }
  .legend a { position: relative; color: var(--brand-ink); }
  .legend a::after { content: ''; position: absolute; inset: calc((1lh - var(--target-min)) / 2) 0; }
  .legend i { display: inline-block; inline-size: 10px; block-size: 10px; margin-inline-end: 6px; border-radius: 2px; vertical-align: -1px; }
  .table-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-1); }
  .table-foot :global(nav) { margin-inline-start: auto; }
  .quiet { margin: 0; color: var(--muted); font-size: var(--t-base); }

  /* Ranking: one 32 px row per school, the count right-aligned beside a thin bar. */
  .rank { display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; font-size: var(--t-base); }
  .rank li { display: grid; grid-template-columns: 1.25rem minmax(7rem, 11rem) minmax(0, 1fr) 3.5rem; gap: var(--space-3); align-items: center; min-block-size: 2rem; }
  .rank-index { white-space: nowrap; color: var(--muted); font: var(--t-sm) var(--font-mono); text-align: end; }
  .rank a { color: var(--brand-ink); font-weight: 600; text-underline-offset: 0.15em; overflow-wrap: anywhere; }
  .rank-track { block-size: 8px; border-radius: var(--radius-pill); background: var(--chip); overflow: hidden; }
  .rank-track span { display: block; min-inline-size: 3px; block-size: 100%; border-radius: inherit; background: var(--brand); }
  .rank-n { color: var(--ink); text-align: end; white-space: nowrap; }

  section { display: grid; gap: var(--space-3); min-inline-size: 0; }
  .action { display: inline-flex; align-items: center; min-block-size: 2rem; padding: 0 var(--space-1); border-radius: var(--radius-control); font-size: var(--t-base); font-weight: 600; }
  .site-cell { display: block; overflow-wrap: anywhere; }
  .third-table :global(table) { table-layout: fixed; }
  .third-table :global(thead a) {
    display: inline-flex; gap: var(--space-1); align-items: center; min-block-size: var(--target-min);
    min-inline-size: var(--target-min); text-decoration: none;
  }
  .third-table :global(thead th:has(a)) { padding-block: 0; }
  @media (min-width: 58rem) {
    .third-table :global(.hint) { display: none; }
  }
  .third-table :global(th a:is(:hover, :focus-visible)) { text-decoration: underline; }
  .ext { color: var(--muted); font-weight: 400; white-space: nowrap; }
  /* Inline-block stops the row link's underline from reaching the operator line. */
  .site-cell small { display: inline-block; inline-size: 100%; color: var(--muted); font-size: var(--t-xs); font-weight: 400; text-decoration: none; }
  .inline-clear { min-block-size: var(--target-min); margin-inline-start: var(--space-2); padding: 0 !important; background: none !important; text-decoration: underline; }
  .panel-head { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: start; justify-content: space-between; }
  .panel-head > :global(:first-child) { flex: 1 1 16rem; min-inline-size: 0; }
  .mode { display: inline-flex; flex: none; padding: 2px; border: 1px solid var(--line); border-radius: calc(var(--radius-control) + 2px); background: var(--panel-raised); }
  .mode button { min-block-size: var(--target-min); padding: 0 var(--space-3); border: 0; border-radius: var(--radius-control); background: transparent; color: var(--muted); font: 600 var(--t-sm) / 1 var(--font-sans); cursor: pointer; }
  .mode button[aria-pressed='true'] { background: var(--brand-wash); color: var(--brand-ink); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--brand) 40%, transparent); }
  .mode button:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .nowrap { white-space: nowrap; }
  .cats { display: flex; flex-wrap: wrap; gap: 2px var(--space-1); }
  .cat { padding: 0 6px; border-radius: var(--radius-pill); background: var(--chip); color: var(--ink-2); font-size: var(--t-sm); font-weight: 500; line-height: 1.6; white-space: nowrap; }
  .cat.excerpt { background: var(--brand-wash); color: var(--brand-ink); font-weight: 600; }
  .policy-excerpt { color: var(--up); font-weight: 600; }
  #top { scroll-margin-block-start: var(--section-jump-top); }
  :is(#about, .cross, .school), .landscape :global(:is(#third-party, #schools-title, #by-system, #top-third)) { scroll-margin-block-start: calc(var(--target-min) + var(--space-2) - 0.75rem); }
  .landscape-metrics { margin-block-end: var(--space-3); }
  .shown-count { margin: 0; color: var(--muted); font-size: var(--t-sm); }
  .back-to-top { justify-self: start; min-block-size: var(--target-min); }
  :is(.dek, .quiet, .legend, .about li) { text-wrap: pretty; }

  /* Schools: a compact index, one summary row per school; a row opens that school's site list. */
  .schools { gap: var(--space-3); }
  .school-table { border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); overflow: hidden; }
  .school-cols, .school > summary {
    display: grid;
    grid-template-columns: minmax(14rem, 1.5fr) minmax(10rem, 1fr) 3.5rem 3.5rem minmax(17.5rem, 1.4fr) 4.25rem;
    gap: var(--space-3);
    align-items: center;
    padding: 0 var(--space-3);
  }
  .school-cols { min-block-size: 2.25rem; border-block-end: 1px solid var(--line); background: var(--table-head); color: var(--muted); font-size: var(--t-sm); font-weight: 600; }
  .school-cols::after { content: ''; }
  .crawl-line { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); margin: 0; color: var(--ink-2); font-size: var(--t-sm); }
  .crawl-line a { color: var(--brand-ink); }
  .s-name :global(.pill), .s-name :global(span) { vertical-align: 1px; }
  .school-cols .n, .s-n { text-align: end; }
  .school { border-block-start: 1px solid var(--line); }
  .school-cols + .school { border-block-start: 0; }
  .school > summary { min-block-size: var(--target-min); padding-block: var(--space-1); list-style: none; cursor: pointer; }
  .school > summary::-webkit-details-marker { display: none; }
  .school > summary:hover { background: var(--hover-row); }
  .school > summary:focus-visible { outline: var(--focus-ring); outline-offset: calc(-1 * var(--focus-offset)); }
  .school[open] > summary { background: var(--brand-wash); }
  .s-name { margin: 0; color: var(--ink); font-size: var(--t-base); font-weight: 650; line-height: 1.35; overflow-wrap: anywhere; }
  .code { color: var(--muted); font: 400 var(--t-xs) var(--font-mono); }
  .s-where { display: flex; flex-wrap: wrap; gap: 0 var(--space-1); color: var(--ink-2); font-size: var(--t-sm); }
  .s-n { color: var(--ink); font-size: var(--t-base); font-weight: 600; }
  .s-n.zero { color: var(--muted); font-weight: 400; }
  .s-lbl { display: none; margin-inline-end: 0.25em; }
  /* Desktop: the counts and the mix are grid cells; narrow screens put them on their own line. */
  .s-stats { display: contents; }
  .s-mix { display: flex; gap: var(--space-2); align-items: center; min-inline-size: 0; color: var(--ink-2); font-size: var(--t-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .school-status { display: flex; gap: var(--space-2); }
  .mini { display: flex; flex: none; inline-size: 6rem; block-size: 8px; overflow: hidden; border-radius: 2px; background: var(--chip); }
  .mini i { display: block; block-size: 100%; }
  .school-body { display: grid; gap: var(--space-2); padding: var(--space-2) var(--space-3) var(--space-3); border-block-start: 1px solid var(--line); background: var(--panel); }
  .school-meta { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-4); margin: 0; color: var(--muted); font-size: var(--t-sm); overflow-wrap: anywhere; }
  .school-meta .strong { font-weight: 600; }
  .none { margin: 0; padding: var(--space-3) var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); color: var(--muted); font-size: var(--t-base); }
  .none a { margin-inline-start: var(--space-2); font-weight: 600; }

  .about { gap: var(--space-2); padding: var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); color: var(--ink-2); font-size: var(--t-base); }
  .about summary { display: flex; align-items: center; justify-content: space-between; min-block-size: var(--target-min); cursor: pointer; list-style: none; }
  .about summary::-webkit-details-marker { display: none; }
  .about summary::after { content: '▾'; color: var(--muted); }
  .about details[open] summary::after { content: '▴'; }
  .about h2 { margin: 0; font-size: var(--t-lg); font-weight: 650; letter-spacing: var(--tracking-heading); }
  .about ul { margin: 0; padding-inline-start: 1.25em; display: grid; gap: var(--space-1); }
  .about code { font-family: var(--font-mono); font-size: 0.9em; }

  @media (min-width: 64.001rem) {
    .panel { gap: var(--space-2); padding-block: var(--space-3); }
    .schools { gap: var(--space-2); }
    .head-actions a { position: relative; }
    .head-actions a::after { content: ''; position: absolute; inset: -.375rem 0; }
  }
  @media (max-width: 64rem) {
    .school-cols { display: none; }
    /* Narrow: name + UniCourse status on the first line, then where, counts and the status mix. */
    .school > summary { position: relative; display: flex; flex-wrap: wrap; gap: 2px var(--space-3); align-items: baseline; padding-block: var(--space-2); padding-inline-end: var(--space-2); }
    .s-name { flex: 0 1 auto; }
    .s-where { flex: 1 1 auto; font-size: var(--t-xs); color: var(--muted); }
    /* Second line: fixed slots for the two counts, then the status words; never wraps to a third line. */
    .s-stats { display: grid; flex: 1 1 100%; grid-template-columns: 3.5rem 4.75rem minmax(0, 1fr); gap: var(--space-2); align-items: center; }
    .s-n { text-align: start; white-space: nowrap; }
    .s-n { font-size: var(--t-sm); }
    .s-lbl { display: inline; color: var(--muted); font-weight: 400; }
  }
  @media (max-width: 40rem) {
    .landscape > section:not(.about) { gap: var(--space-2); }
    .table-foot { display: grid; justify-content: start; }
    .table-foot :global(nav) { margin-inline-start: 0; }
    .dek { font-size: var(--t-sm); }
    .head-actions a { min-block-size: var(--target-min); }
    .panel { gap: var(--space-1); padding: var(--space-2); }
    .about { padding: var(--space-3); }
    /* Keep the two filters beside search; the section shortcuts stay visible while scrolling. */
    .finder { flex: 1 1 9rem; }
    .more summary { padding-inline: var(--space-2); }

    .more summary, .apply { flex: none; }
    .fields { flex-basis: 100%; padding-block-start: var(--space-2); }
    /* The wide table becomes short rows: name + status, then schools · login · functions. */
    .third-table { display: none; }
    .third-rows { display: block; }
    .third-rows li { display: grid; grid-template-columns: minmax(0, 1fr) auto var(--target-min); gap: 0 var(--space-1); align-items: center; padding: 0 var(--space-2) var(--space-1); border-block-end: 1px solid var(--line); }
    .third-rows li:last-child { border-block-end: 0; }
    /* Inline, so a wrapped name keeps ↗ after its last character (the nbsp glues them). */
    .third-name { display: inline; padding-block: 0.375rem; color: var(--brand-ink); font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; }
    .third-rows .third-empty { display: block; color: var(--muted); }
    .third-meta { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 2px var(--space-1); align-items: center; color: var(--ink-2); font-size: var(--t-sm); }
    .third-rows .site-details { grid-column: 3; grid-row: 1; }
    .third-rows .site-details[open] { display: contents; }
    .third-rows .site-details summary { grid-column: 3; grid-row: 1; }
    .third-rows .site-details div { grid-column: 1 / -1; grid-row: 3; margin-block-start: var(--space-1); }
    .third-meta > span:first-child { margin-inline-end: var(--space-1); }
    .fields > :global(.field) { flex: 1 1 45%; }
    .check { flex: 1 1 100%; justify-content: center; }
    .stack li { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: 'label values' 'track track'; gap: 3px var(--space-1); }
    .stack-label { min-inline-size: 0; }
    .stack-values { grid-template-columns: repeat(3, 3.5rem); gap: var(--space-1); }
    .rank { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-1) var(--space-2); }
    .rank li { grid-template-columns: 1.4rem minmax(0, 1fr) max-content; gap: 0 var(--space-1); font-size: var(--t-sm); }
    .rank a { display: grid; align-items: center; min-block-size: var(--target-min); padding-block-end: var(--space-2); line-height: 1.3; }
    .rank-index, .rank-n { padding-block-end: var(--space-2); }
    .rank-track { grid-column: 1 / -1; grid-row: 1; align-self: end; block-size: 5px; }
    .rank-n { grid-column: 3; grid-row: 1; }
    .rank li > a, .rank-index { grid-row: 1; }
    .rank li > a { grid-column: 2; }
    .rank-index { grid-column: 1; }
    .school > summary { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0 var(--space-2); padding: var(--space-1) var(--space-2); }
    .s-where { display: none; }
    .s-stats { display: flex; flex-wrap: wrap; grid-row: 2; grid-column: 1 / -1; gap: 0 var(--space-1); }
    .s-name { grid-column: 1 / -1; }
    .s-mix { margin-inline-start: auto; gap: var(--space-1); }
    .school-disclosure { grid-row: 3; grid-column: 1 / -1; font-weight: 500; }
    .school-status { gap: var(--space-1); }
    .mini { display: none; }
    .head-actions { column-gap: var(--space-2); }
    .landscape-metrics :global(.tile) { padding: var(--space-2); }
    .landscape-metrics :global(.tile dd) { font-size: var(--t-xl); }
    .landscape-metrics :global(.tile > p) { font-size: var(--t-xs); }
    .third-name { min-block-size: var(--target-min); align-content: center; text-decoration: none; padding-block: var(--space-1); }
    .third-name:is(:hover, :focus-visible) { text-decoration: underline; }
  }
  @media (max-width: 39rem) {
    .landscape { --section-jump-top: calc(2 * var(--target-min) + var(--space-1) + 1px); }
  }
</style>
