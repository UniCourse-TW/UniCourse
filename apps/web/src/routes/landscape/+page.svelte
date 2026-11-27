<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { navigating, page } from '$app/state';
  import { ISSUES_URL, statusLabels as crawlLabels, systemLabels, systems } from '$lib/institutions';
  import {
    categories, categoryLabels, indexPolicy, indexPolicyLabels, institutionsByCode, kindLabels, loginLabel,
    operatorLabels, siteStatuses, statusLabels, type Site
  } from '$lib/landscape-data';
  import SitesList from '$lib/landscape-sites.svelte';
  import Badge from '$lib/ui/Badge.svelte';
  import BarList from '$lib/ui/BarList.svelte';
  import DataTable from '$lib/ui/DataTable.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import FilterChip from '$lib/ui/FilterChip.svelte';
  import FilterSelect from '$lib/ui/FilterSelect.svelte';
  import SectionHeader from '$lib/ui/SectionHeader.svelte';
  import StatRow from '$lib/ui/StatRow.svelte';
  import StatTile from '$lib/ui/StatTile.svelte';
  import StatusPill from '$lib/ui/StatusPill.svelte';
  import ChartValues from '$lib/ui/ChartValues.svelte';
  import type { BadgeTone } from '$lib/ui/types';
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
  /** The third-party table is a summary: the per-school sections below hold every site. */
  const THIRD_PREVIEW = 25;
  let thirdLimit = $state(THIRD_PREVIEW);
  let thirdRows = $derived(data.thirdParty.slice(0, thirdLimit));
  let schoolJump: HTMLSelectElement | undefined = $state();
  function jumpToSchool(event: Event) {
    const id = (event.currentTarget as HTMLSelectElement).value;
    if (!id) return;
    location.hash = id;
    (event.currentTarget as HTMLSelectElement).value = '';
  }

  // Type-to-find: 清大 or 北科 match the full name character by character, so nobody scrolls a 150-item menu.
  let finderQuery = $state('');
  let finderActive = $state(0);
  let finderOpen = $state(false);
  function nameMatches(name: string, query: string) {
    const q = query.replace(/\s+/g, '');
    if (!q) return false;
    if (name.includes(q)) return true;
    let at = 0;
    for (const char of name.replace('臺', '台')) if (char === q.replace('臺', '台')[at]) at += 1;
    return at >= q.length;
  }
  let finderMatches = $derived(finderQuery.trim() ? data.schools.filter((school) => nameMatches(school.name, finderQuery)).slice(0, 8) : []);
  function goToSchool(id: string) {
    finderOpen = false;
    finderQuery = '';
    location.hash = id;
    document.getElementById(id)?.focus({ preventScroll: true });
  }
  function finderKey(event: KeyboardEvent) {
    if (!finderMatches.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); finderOpen = true; finderActive = (finderActive + 1) % finderMatches.length; }
    else if (event.key === 'ArrowUp') { event.preventDefault(); finderActive = (finderActive - 1 + finderMatches.length) % finderMatches.length; }
    else if (event.key === 'Enter') { event.preventDefault(); goToSchool(finderMatches[finderActive].id); }
    else if (event.key === 'Escape') finderOpen = false;
  }
  let form: HTMLFormElement | undefined = $state();
  let debounce: ReturnType<typeof setTimeout> | undefined;
  // Phones open on the directory: the two summary charts start folded behind one summary line.
  let vizOpen = $state(true);
  onMount(() => {
    hydrated = true;
    if (window.matchMedia('(max-width: 40rem)').matches) vizOpen = false;
    return () => clearTimeout(debounce);
  });
  function submitSoon(delay = 0) {
    clearTimeout(debounce);
    debounce = setTimeout(apply, delay);
  }
  /** Navigates with only the non-empty fields, so shared URLs stay short (`?q=臺大&kind=third`). */
  function apply() {
    if (!form) return;
    const params = new URLSearchParams();
    for (const [name, value] of new FormData(form)) if (typeof value === 'string' && value) params.set(name, value);
    const query = params.toString();
    goto(query ? `/landscape?${query}` : '/landscape', { keepFocus: true, noScroll: true, replaceState: true });
  }

  const siteTones: Record<Site['status'], BadgeTone> = { active: 'live', inactive: 'blocked', unknown: 'none' };
  const systemOptions = systems.map((system) => ({ value: system, label: systemLabels[system] }));
  const kindOptions = (['official', 'third'] as const).map((kind) => ({ value: kind, label: kindLabels[kind] }));
  const categoryOptions = categories.map((category) => ({ value: category, label: categoryLabels[category] }));
  const statusOptions = siteStatuses.map((status) => ({ value: status, label: statusLabels[status] }));

  function schoolsOf(site: Site) {
    if (site.schools.length === 0) return site.scope === 'national' ? '全國' : '跨校';
    if (site.schools.length > 3) return `${site.schools.length} 校`;
    return site.schools.map((code) => institutionsByCode.get(code)?.name ?? code).join('、');
  }

  const allThirdColumns: TableColumn<Site>[] = [
    { id: 'site', label: '網站', value: (site) => site.name, sortable: true, width: '18rem' },
    { id: 'schools', label: '學校', value: schoolsOf, sortable: true, width: '11rem' },
    { id: 'category', label: '功能', value: (site) => site.category.map((c) => categoryLabels[c]).join('、') },
    { id: 'operator', label: '營運者', value: (site) => operatorLabels[site.operator], sortable: true, width: '5rem' },
    { id: 'login', label: '登入', value: (site) => loginLabel(site.loginRequired), width: '6.5rem' },
    { id: 'status', label: '狀態', value: (site) => statusLabels[site.status], sortable: true, width: '5.5rem' },
    { id: 'policy', label: '收錄策略', value: (site) => indexPolicyLabels[indexPolicy(site)], width: '6rem' }
  ];
  /** When every listed site has the same policy, the column says nothing; the section dek states it once. */
  let onePolicy = $derived(new Set(data.thirdParty.map((site) => indexPolicy(site))).size <= 1);
  let thirdColumns = $derived(onePolicy ? allThirdColumns.filter((column) => column.id !== 'policy') : allThirdColumns);

  let totalBySystem = $derived(data.bySystem.map((row) => row.active + row.inactive + row.unknown));
  let largestSystem = $derived(Math.max(1, ...totalBySystem));
  const pct = (part: number, total: number) => (total ? (part / total) * 100 : 0);
  const pctLabel = (part: number, total: number) => `${Math.round(pct(part, total))}%`;
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

<div class="landscape" class:hydrated id="top">
  <header class="page-head">
    <div class="title-row">
      <h1>臺灣大專校院課程網站總覽</h1>
      <div class="head-actions">
        <a href="#about">本頁的資料來源與計算方式 <span aria-hidden="true">ⓘ</span></a>
        <a href={DATA_URL} rel="noopener external">資料檔 JSON <span aria-hidden="true">↗</span></a>
      </div>
    </div>
    <p class="dek">
      全國 {number.format(data.totalSchools)} 所大專校院，已盤點其中 {number.format(data.surveyedSchools)} 所的官方課程系統與第三方查課工具，共 {number.format(data.totalSites)} 個
      · 查核於 <time datetime={data.checkedAt}>{data.checkedAt.replaceAll('-', '/')}</time>
      · 狀態為當日探測結果
      {#if !data.crawl}· <span class="warn">各校收錄狀態暫時無法取得</span>{/if}
    </p>
    <!-- Two audiences, two shortcuts: students look up their own school, maintainers scan the tables. -->
    <nav class="routes" aria-label="快速前往">
      <!-- With JavaScript the select jumps to the school's anchor; without it, the form filters by the name. -->
      <form method="GET" action="/landscape" class="jump" onsubmit={(event) => { if (hydrated) event.preventDefault(); }}>
        {#if hydrated}
          <div class="finder">
            <label class="jump-field">
              <span>找我的學校</span>
              <input type="search" role="combobox" aria-describedby="finder-hint" placeholder="輸入校名，例如 清大" autocomplete="off"
                aria-autocomplete="list" aria-expanded={finderOpen && finderMatches.length > 0} aria-controls="school-finder"
                aria-activedescendant={finderOpen && finderMatches.length ? `finder-${finderMatches[finderActive]?.id}` : undefined}
                bind:value={finderQuery} oninput={() => { finderOpen = true; finderActive = 0; }} onkeydown={finderKey}
                onblur={() => setTimeout(() => (finderOpen = false), 150)} />
            </label>
            {#if finderOpen && finderQuery.trim()}
              <ul class="finder-list" id="school-finder" role="listbox" aria-label="符合的學校">
                {#each finderMatches as school, index (school.code)}
                  <li id={`finder-${school.id}`} role="option" aria-selected={index === finderActive}>
                    <button type="button" tabindex="-1" onmousedown={(event) => event.preventDefault()} onclick={() => goToSchool(school.id)}>
                      {school.name}<small>{school.official.length + school.third.length} 個網站</small>
                    </button>
                  </li>
                {:else}
                  <li class="finder-none" role="option" aria-selected="false" aria-disabled="true">沒有符合「{finderQuery.trim()}」的學校</li>
                {/each}
              </ul>
            {/if}
          </div>
          <span class="route-hint" id="finder-hint">選一所學校，直接跳到它的段落</span>
        {:else}
          <label class="jump-field">
            <span>找我的學校</span>
            <select name="q" bind:this={schoolJump} onchange={jumpToSchool}>
              <option value="">選擇學校</option>
              {#each data.schools as school (school.code)}<option value={school.name}>{school.name}</option>{/each}
            </select>
          </label>
          <button type="submit" class="apply small">前往</button>
        {/if}
      </form>
      <span class="route-links">
        <a href="#third-party">第三方網站 <span aria-hidden="true">↓</span></a>
        {#if data.cross.length}<a href="#cross">跨校平台 <span aria-hidden="true">↓</span></a>{/if}
        <a href="#schools-title">各校清單 <span aria-hidden="true">↓</span></a>
        <a href="/schools">UniCourse 收錄狀態 <span aria-hidden="true">→</span></a>
      </span>
    </nav>
  </header>

  <div class="toolbar">
    <form
      method="GET"
      action="/landscape"
      aria-label="篩選網站"
      bind:this={form}
      onsubmit={(event) => { if (hydrated) { event.preventDefault(); apply(); } }}
    >
      <label class="search">
        <span class="sr-only">校名、網站或功能</span>
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="8.5" cy="8.5" r="5.5" /><path d="m12.5 12.5 4 4" stroke-linecap="round" />
        </svg>
        <input
          type="search"
          name="q"
          value={filters.q}
          placeholder="篩選：校名、網站或功能"
          maxlength="100"
          autocomplete="off"
          oninput={() => submitSoon(350)}
        />
      </label>
      <details class="more" open={selectCount > 0 || undefined}>
        <summary>篩選{#if selectCount}<span class="badge-count">{selectCount}</span>{/if}</summary>
        <!-- svelte-ignore a11y_no_static_element_interactions (change events bubble from the selects inside) -->
        <div class="fields" onchange={() => submitSoon()}>
          <FilterSelect name="system" label="體系" options={systemOptions} value={filters.system} />
          <FilterSelect name="kind" label="類型" options={kindOptions} value={filters.kind} allLabel="官方＋第三方" />
          <FilterSelect name="category" label="功能" options={categoryOptions} value={filters.category} />
          <FilterSelect name="status" label="狀態" options={statusOptions} value={filters.status} />
          <label class="check">
            <input type="checkbox" name="third" value="1" checked={filters.third} />
            只看有第三方站的學校
          </label>
        </div>
      </details>
      <!-- Without JavaScript 套用 submits; with it, every change applies itself, so the button goes away. -->
      {#if !hydrated}<button type="submit" class="apply">套用</button>{/if}
    </form>
    <p class="result" role="status" aria-live="polite">
      {#if updating}<span class="dot" aria-hidden="true"></span>更新中…
      {:else if filtered}符合 <strong class="ui-tabular">{number.format(data.shownSites)}</strong> / {number.format(data.totalSites)} 個系統{#if data.schools.length} · <a class="action" href="#schools-title">跳到 {number.format(data.schools.length)} 所學校的結果 ↓</a>{/if}<a class="clear inline-clear" href="/landscape">清除全部條件</a>
      {:else}已盤點 {number.format(data.totalSites)} 個系統 · 這裡的條件會篩選下方的統計、圖表與清單{#if hydrated}，輸入即套用{/if}{/if}
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

  <StatRow label="網站統計">
    <StatTile label={filtered ? '符合的學校' : '已盤點到網站的學校'} value={data.stats.schools} unit="所"
      note={filtered ? `全國 ${number.format(data.totalSchools)} 所，已盤點 ${number.format(data.surveyedSchools)} 所` : `全國 ${number.format(data.totalSchools)} 所，其餘 ${number.format(data.totalSchools - data.surveyedSchools)} 所尚未盤點到`} />
    <StatTile label="官方系統" value={data.stats.official} unit="個" note="校方與政府營運" />
    <StatTile label="第三方服務" value={data.stats.third} unit="個" note="學生、社群與公司" />
    <StatTile label="運作中" value={data.stats.active} unit="個"
      note={`停止 ${number.format(data.stats.inactive)} · 不明 ${number.format(data.stats.unknown)}`} />
  </StatRow>

  {#if data.shownSites === 0}
    <EmptyState title="沒有符合的網站" description="換個關鍵字，或放寬體系、功能與狀態。">
      {#snippet action()}<a class="action" href="/landscape">清除篩選</a>{/snippet}
    </EmptyState>
  {:else}
    <details class="viz-wrap" open={vizOpen}>
      <summary>圖表：各體系網站狀態、第三方工具最多的學校</summary>
    <div class="viz">
      <section class="panel" aria-labelledby="by-system">
        <SectionHeader id="by-system" level={2} title="各體系網站狀態" description="條長是該體系的網站數（以最多的體系為滿格），條內依狀態分段；跨校平台計入每個涵蓋的學校體系。" />
        {#if data.bySystem.length}
          <p class="legend" aria-hidden="true">
            <span><i class="active"></i>運作中</span><span><i class="inactive"></i>停止</span><span><i class="unknown"></i>不明</span>
          </p>
          <ul class="stack" aria-label="各體系網站狀態">
            {#each data.bySystem as row, index (row.system)}
              {@const total = totalBySystem[index]}
              {@const share = total / largestSystem}
              <li>
                <span class="stack-label">{row.label} <small class="ui-tabular">{number.format(total)} 個</small></span>
                <span class="track" role="img" style:inline-size={`${(total / largestSystem) * 100}%`}
                  aria-label={`${row.label}：運作中 ${row.active}、停止 ${row.inactive}、不明 ${row.unknown}，共 ${total} 個`}>
                  <span class="seg active" style:inline-size={`${pct(row.active, total)}%`}>{#if pct(row.active, total) * share >= 14}{pctLabel(row.active, total)}{/if}</span>
                  <span class="seg inactive" style:inline-size={`${pct(row.inactive, total)}%`}>{#if pct(row.inactive, total) * share >= 14}{pctLabel(row.inactive, total)}{/if}</span>
                  <span class="seg unknown" style:inline-size={`${pct(row.unknown, total)}%`}></span>
                </span>
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
        <SectionHeader id="top-third" level={2} title="第三方工具最多的學校" description="以單一學校為對象的學生、社群與公司服務數，全部資料。" />
        <BarList label="第三方工具最多的學校" unit="個" showValues={false}
          items={data.topThird.map((row) => ({ label: row.name, value: row.count, href: `#${row.id}` }))} />
      </section>
    </div>
    </details>

    <section aria-labelledby="third-party" class="third">
      <div class="third-head">
        <SectionHeader id="third-party" level={2} title="第三方查課網站"
          description={onePolicy
            ? `學生、社群與公司做的評價、排課、成績分布與彙整服務。以下網站 UniCourse 都${indexPolicyLabels[indexPolicy(data.thirdParty[0] ?? { url: '' })]}，不複製內容。`
            : '學生、社群與公司做的評價、排課、成績分布與彙整服務。「收錄策略」是 UniCourse 對該站內容的處理方式：只提供連結，或依站方 robots 允許索引不超過 120 字的摘要。'} />
        <a class="action" href="/terms#reviews">收錄原則</a>
      </div>
      <div class="third-table">
      <DataTable caption={thirdRows.length < data.thirdParty.length ? `第三方查課網站，共 ${number.format(data.thirdParty.length)} 個，先列出運作中的前 ${THIRD_PREVIEW} 個` : `第三方查課網站，共 ${number.format(data.thirdParty.length)} 個`} columns={thirdColumns}
        rows={thirdRows} rowKey={(site) => site.url} rowHeaderColumn="site" stickyColumn="site"
        rowHref={(site) => site.url} clientSort minWidth="58rem" maxHeight="none">
        {#snippet cell(site, column)}
          {#if column.id === 'site'}
            <span class="site-cell">{site.name}<span class="ext" aria-hidden="true"> ↗</span>{#if site.operatorName}<small>{site.operatorName}</small>{/if}</span>
          {:else if column.id === 'login' || column.id === 'operator'}
            <span class="nowrap">{column.value?.(site)}</span>
          {:else if column.id === 'category'}
            <span class="cats">{#each site.category as category (category)}<span class="cat">{categoryLabels[category]}</span>{/each}</span>
          {:else if column.id === 'status'}
            <Badge tone={siteTones[site.status]} label={statusLabels[site.status]} dot />
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
      <!-- Phones: one short row per site with the two things a student checks first (status, login). -->
      <ul class="third-rows" aria-label="第三方查課網站">
        {#each thirdRows as site (site.url)}
          <li>
            <a class="third-name" href={site.url} rel="noopener external">{site.name}<span aria-hidden="true"> ↗</span></a>
            <Badge tone={siteTones[site.status]} label={statusLabels[site.status]} dot />
            <span class="third-meta">{schoolsOf(site)} · {loginLabel(site.loginRequired)} · {site.category.map((c) => categoryLabels[c]).join('、')}</span>
          </li>
        {:else}
          <li class="third-empty">這組篩選沒有第三方網站。</li>
        {/each}
      </ul>
      {#if thirdRows.length < data.thirdParty.length}
        <p class="table-foot">
          {#if hydrated}
            已列出 {number.format(thirdRows.length)} / {number.format(data.thirdParty.length)} 個
            <button type="button" class="action" onclick={() => (thirdLimit += THIRD_PREVIEW)}>再顯示 {Math.min(THIRD_PREVIEW, data.thirdParty.length - thirdRows.length)} 個</button>
            <button type="button" class="action" onclick={() => (thirdLimit = data.thirdParty.length)}>顯示全部</button>
          {:else}
            其餘 {number.format(data.thirdParty.length - thirdRows.length)} 個列在下方各校段落，或<a class="action" href="/landscape?kind=third">只看第三方網站</a>。
          {/if}
        </p>
      {/if}
    </section>

    {#if data.cross.length}
      <section class="school" id="cross" aria-labelledby="cross-title">
        <div class="school-head">
          <h2 id="cross-title">跨校與全國平台 <small class="ui-tabular">{number.format(data.cross.length)} 個</small></h2>
          <p class="school-meta">教育部與聯盟平台、跨校 LMS，以及涵蓋多校的第三方服務。</p>
        </div>
        <SitesList label="跨校與全國平台" sites={data.cross} showOperator collapseAfter={8} />
      </section>
    {/if}

    <section aria-labelledby="schools-title" class="schools">
      <SectionHeader id="schools-title" level={2} title="各校"
        description={`依教育部學校代碼排序，${filtered ? '只列出符合篩選的學校' : '沒有盤點到網站的學校也列出'}；收錄狀態與「各校收錄狀態」頁一致。`}>
        {#snippet actions()}
          <a class="action" href="#top">↑ 回頁首找學校</a>
          <a class="action" href="/schools">各校收錄狀態</a>
        {/snippet}
      </SectionHeader>
      {#if data.schools.length === 0}
        <EmptyState title="沒有符合的學校" description="換個校名，或取消「只看有第三方站的學校」。">
          {#snippet action()}<a class="action" href="/landscape">清除篩選</a>{/snippet}
        </EmptyState>
      {/if}
      {#each data.schools as school (school.code)}
        {@const crawl = data.crawl?.[school.code]}
        <section class="school" id={school.id} aria-labelledby={`${school.id}-title`}>
          <div class="school-head">
            <h2 id={`${school.id}-title`}>
              {school.name}
              <small class="code">{school.code}</small>
              {#if crawl}
                {#if crawl.href}<a class="crawl" href={crawl.href}><StatusPill status={crawl.status} /></a>{:else}<StatusPill status={crawl.status} />{/if}
              {/if}
            </h2>
            <p class="school-meta">
              {school.systemLabel} · {school.ownership === 'public' ? '公立' : '私立'}{#if school.city} · {school.city}{/if}
              · 官方 <span class="ui-tabular">{school.official.length}</span> · 第三方 <span class="ui-tabular">{school.third.length}</span>
              {#if school.via.length}
                · 跨校平台：{#each school.via as via, index (via.url)}{index ? '、' : ''}<a href={via.url} rel="noopener external">{via.name}</a>{/each}
              {/if}
            </p>
          </div>
          {#if school.official.length + school.third.length}
            <SitesList label={`${school.name}的課程網站`} sites={[...school.official, ...school.third]} />
          {:else}
            <p class="none">尚未盤點到這所學校的課程網站。<a href={ISSUES_URL} rel="noopener external">補充資料 ↗</a></p>
          {/if}
        </section>
      {/each}
    </section>
  {/if}

  <section class="about" id="about" aria-labelledby="about-title">
    <h2 id="about-title">本頁的資料來源與計算方式</h2>
    <ul>
      <li>學校名錄來自教育部「大專校院名錄」等開放資料，共 {number.format(data.totalSchools)} 所；網站清單由 UniCourse 逐校盤點，記錄在 repo 的 <code>data/course-sites.json</code>。</li>
      <li>「運作中」指查核當日可連線且約一年內有更新；「停止」含無法連線、已下架或公告停用；「不明」指無法確認。</li>
      <li>「官方」是校方或政府營運的系統；其餘（學生、社群、公司）算第三方。統計磚與圖表依目前篩選計算。</li>
      <li>各校的「{Object.values(crawlLabels).join('／')}」是 UniCourse 自己的資料收錄狀態，與<a href="/schools">各校收錄狀態</a>頁一致。</li>
      <li>發現錯誤或遺漏，歡迎到 <a href={ISSUES_URL} rel="noopener external">GitHub issues ↗</a> 回報。</li>
    </ul>
  </section>
</div>

<style>
  .landscape {
    display: grid;
    gap: var(--space-6);
    min-inline-size: 0;
    color: var(--ink);
    font: var(--t-md) / var(--leading-body) var(--font-sans);
  }
  .sr-only { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

  /* Page head: one h1, a one-line dek with the survey date, actions on the right. */
  .page-head { display: grid; gap: var(--space-1); }
  .title-row { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); align-items: baseline; justify-content: space-between; }
  h1 { margin: 0; font-size: var(--t-2xl); font-weight: 650; line-height: var(--leading-tight); letter-spacing: var(--tracking-heading); text-wrap: balance; }
  .head-actions { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-4); font-size: var(--t-sm); font-weight: 600; }
  .head-actions a, .action, .clear, .none a, .about a { color: var(--brand-ink); text-underline-offset: 0.15em; }
  .head-actions a { display: inline-flex; align-items: center; min-block-size: 2rem; }
  .dek { margin: 0; color: var(--muted); font-size: var(--t-base); }
  .warn { color: var(--warn); }

  /* Sticky toolbar: search, collapsible selects (phone), apply/clear, result count, chips. */
  .toolbar {
    position: sticky;
    inset-block-start: 0;
    z-index: 5;
    display: grid;
    gap: var(--space-2);
    padding: var(--space-2) 0 var(--space-3);
    border-block-end: 1px solid var(--line);
    background: var(--bg);
  }
  form { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
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
  /* Desktop shows the selects inline whether or not the disclosure is open; phone gets a 篩選 toggle. */
  .more { display: contents; }
  .more summary { display: none; }
  .more::details-content { display: contents; content-visibility: visible; }
  .fields { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
  .check {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-block-size: var(--target-min);
    padding-inline: var(--space-2);
    color: var(--ink-2);
    font-size: var(--t-base);
    cursor: pointer;
  }
  .check input { inline-size: 1.1rem; block-size: 1.1rem; margin: 0; accent-color: var(--brand); }
  .check:has(input:focus-visible) { outline: var(--focus-ring); outline-offset: var(--focus-offset); border-radius: var(--radius-control); }
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
  .apply.small { min-block-size: 2.25rem; }
  .clear:hover { background: var(--brand-wash); }
  :is(.apply, .clear, .action):focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .result { display: flex; align-items: center; gap: var(--space-2); margin: 0; min-block-size: 1.25rem; color: var(--muted); font-size: var(--t-sm); }
  .result .dot { inline-size: 8px; block-size: 8px; border-radius: 50%; background: var(--brand); }
  .result strong { color: var(--ink); font-weight: 600; }
  .chips { display: flex; flex-wrap: wrap; gap: var(--space-2); }

  /* Charts: stacked status bars per system and a ranked bar list. */
  .viz { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr)); gap: var(--space-3); align-items: start; }
  .routes { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); align-items: center; margin-block-start: var(--space-3); padding: var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); }
  .route-links { display: flex; flex-wrap: wrap; gap: var(--space-2); font-size: var(--t-sm); font-weight: 600; }
  .route-links a { display: inline-flex; gap: 0.3em; align-items: center; min-block-size: 2.25rem; padding: 0 var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-pill); background: var(--panel-raised); color: var(--ink-2); text-decoration: none; white-space: nowrap; }
  .route-links a:hover { border-color: var(--control-line); color: var(--brand-ink); }
  .route-links a span { color: var(--muted); }
  .finder { position: relative; }
  .finder .jump-field input { inline-size: 16rem; min-block-size: var(--target-min); padding: 0 var(--space-2); border: 0; background: transparent; color: var(--ink); font: var(--t-base) / var(--leading-table) var(--font-sans); }
  .finder .jump-field input:focus-visible { outline: none; }
  .jump-field:has(input:focus-visible) { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .finder-list { position: absolute; inset-inline: 0; inset-block-start: calc(100% + 4px); z-index: 10; display: grid; margin: 0; padding: var(--space-1); list-style: none; border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); box-shadow: 0 8px 24px color-mix(in srgb, var(--ink) 14%, transparent); }
  .finder-list button { display: flex; gap: var(--space-2); align-items: baseline; justify-content: space-between; inline-size: 100%; min-block-size: var(--target-min); padding: 0 var(--space-2); border: 0; border-radius: calc(var(--radius-control) - 2px); background: transparent; color: var(--ink); font: var(--t-base) / 1.3 var(--font-sans); text-align: start; cursor: pointer; }
  .finder-list small { color: var(--muted); font-size: var(--t-xs); white-space: nowrap; }
  .finder-list [aria-selected='true'] button, .finder-list button:hover { background: var(--brand-wash); color: var(--brand-ink); }
  .finder-none { padding: var(--space-2); color: var(--muted); font-size: var(--t-sm); }
  .routes .jump-field { min-block-size: var(--target-min); border-color: var(--brand); }
  .routes .jump-field span { color: var(--brand-ink); font-size: var(--t-base); }
  .routes .jump-field select { min-block-size: var(--target-min); max-inline-size: 20rem; }
  .third-head { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); align-items: end; justify-content: space-between; }
  .third-head > :global(:first-child) { flex: 1 1 32rem; min-inline-size: 0; }
  .third-rows { display: none; margin: 0; padding: 0; list-style: none; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
  .panel { display: grid; gap: var(--space-3); align-content: start; padding: var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); min-inline-size: 0; }
  .stack { display: grid; gap: var(--space-2); margin: 0; padding: 0; list-style: none; font-size: var(--t-base); }
  .stack li { display: grid; grid-template-columns: 7.5rem 1fr 13rem; gap: var(--space-2); align-items: center; }
  .stack-label { color: var(--ink-2); font-size: var(--t-sm); }
  .stack-label small { color: var(--muted); font-size: var(--t-xs); }
  .track { display: flex; min-inline-size: 3rem; block-size: 18px; overflow: hidden; border-radius: 3px; background: var(--chip); }
  .seg { display: flex; align-items: center; justify-content: center; block-size: 100%; overflow: hidden; color: var(--ink); font-size: var(--t-xs); font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
  /* Segments are softened (70%) so the large blocks are calm in dark mode; labels stay full ink. */
  .seg.active, .legend i.active, .v.active i { background: color-mix(in srgb, var(--up) 70%, var(--panel)); }
  .seg.inactive, .legend i.inactive, .v.inactive i { background: color-mix(in srgb, var(--down) 70%, var(--panel)); }
  /* Unknown is a pale hatched fill, so it neither dominates nor competes with the red. */
  .seg.unknown, .legend i.unknown, .v.unknown i { color: var(--ink-2); background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--muted) 75%, transparent) 0 2px, var(--chip) 2px 6px); }
  .stack-values { display: flex; gap: var(--space-3); justify-content: flex-end; color: var(--ink-2); font-size: var(--t-sm); white-space: nowrap; }
  .v { display: inline-flex; align-items: center; gap: 4px; }
  .v i { display: inline-block; inline-size: 8px; block-size: 8px; border-radius: 2px; }
  .v.active { color: var(--ink); font-weight: 600; }
  .legend { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-4); margin: 0; color: var(--muted); font-size: var(--t-sm); }
  .legend i { display: inline-block; inline-size: 10px; block-size: 10px; margin-inline-end: 6px; border-radius: 2px; vertical-align: -1px; }
  .table-foot { margin: 0; color: var(--muted); font-size: var(--t-base); }
  .table-foot button.action { border: 0; background: transparent; cursor: pointer; font: inherit; font-weight: 600; color: var(--brand-ink); }
  .jump { display: inline-flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
  .jump-field { display: inline-flex; align-items: center; min-block-size: 2.25rem; border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--muted); font: 600 var(--t-sm) / var(--leading-tight) var(--font-sans); }
  .jump-field span { padding-inline-start: var(--space-2); white-space: nowrap; }
  .jump-field select { max-inline-size: 12rem; min-block-size: 2.25rem; padding: 0 var(--space-1); border: 0; background: transparent; color: var(--ink); color-scheme: var(--ui-color-scheme); font: var(--t-base) / var(--leading-table) var(--font-sans); }
  .jump-field:has(select:focus-visible) { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .jump-field select:focus-visible { outline: none; }
  .quiet { margin: 0; color: var(--muted); font-size: var(--t-base); }

  section { display: grid; gap: var(--space-3); min-inline-size: 0; }
  .action { display: inline-flex; align-items: center; min-block-size: 2rem; padding: 0 var(--space-1); border-radius: var(--radius-control); font-size: var(--t-base); font-weight: 600; }
  .site-cell { display: block; overflow-wrap: anywhere; min-inline-size: 13rem; }
  .site-cell .ext { color: var(--muted); font-weight: 400; white-space: nowrap; }
  /* Inline-block stops the row link's underline from reaching the operator line. */
  .site-cell small { display: inline-block; inline-size: 100%; color: var(--muted); font-size: var(--t-xs); font-weight: 400; text-decoration: none; }
  .route-hint { color: var(--muted); font-size: var(--t-xs); }
  .inline-clear { min-block-size: 0 !important; margin-inline-start: var(--space-2); padding: 0 !important; background: none !important; text-decoration: underline; }
  .viz-wrap > summary { display: none; }
  .viz-wrap::details-content { display: contents; content-visibility: visible; }
  .nowrap { white-space: nowrap; }
  .cats { display: flex; flex-wrap: wrap; gap: 2px var(--space-1); }
  .cat { padding: 0 6px; border-radius: var(--radius-pill); background: var(--chip); color: var(--ink-2); font-size: 0.75rem; font-weight: 500; line-height: 1.6; white-space: nowrap; }
  .policy-excerpt { color: var(--up); font-weight: 600; }

  /* Schools: one compact block each, h2 with anchor id, status pill linked to the school page. */
  .schools { gap: var(--space-4); }
  .school { gap: var(--space-2); scroll-margin-block-start: 7rem; }
  .school-head { display: grid; gap: 2px; }
  .school h2 { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-2); align-items: center; margin: 0; font-size: var(--t-lg); font-weight: 650; line-height: var(--leading-tight); letter-spacing: var(--tracking-heading); }
  .school h2 small { color: var(--muted); font-size: var(--t-sm); font-weight: 400; }
  .code { font-family: var(--font-mono); }
  .crawl { display: inline-flex; min-block-size: 1.75rem; align-items: center; border-radius: var(--radius-pill); text-decoration: none; }
  .crawl:hover { filter: brightness(0.95); }
  .crawl:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .school-meta { margin: 0; color: var(--muted); font-size: var(--t-sm); overflow-wrap: anywhere; }
  .school-meta a { color: var(--brand-ink); }
  .none { margin: 0; padding: var(--space-3) var(--space-4); border: 1px dashed var(--line); border-radius: var(--radius-panel); color: var(--muted); font-size: var(--t-base); }
  .none a { margin-inline-start: var(--space-2); font-weight: 600; }

  .about { gap: var(--space-2); padding: var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); color: var(--ink-2); font-size: var(--t-base); }
  .about h2 { margin: 0; font-size: var(--t-lg); font-weight: 650; letter-spacing: var(--tracking-heading); }
  .about ul { margin: 0; padding-inline-start: 1.25em; display: grid; gap: var(--space-1); }
  .about code { font-family: var(--font-mono); font-size: 0.9em; }

  @media (max-width: 40rem) {
    .more { display: block; }
    .more::details-content { display: block; content-visibility: auto; }
    .more:not([open])::details-content { content-visibility: hidden; }
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
    /* Search, 篩選 and 套用 share one row; the fields open beneath them. */
    .search { flex: 1 1 7rem; }
    .more summary, .apply { flex: none; }
    .fields { flex-basis: 100%; padding-block-start: var(--space-2); }
    /* The wide table becomes short rows: name + status, then schools · login · functions. */
    .third-table { display: none; }
    .third-rows { display: block; }
    .third-rows li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px var(--space-2); align-items: center; padding: var(--space-2) var(--space-3); border-block-end: 1px solid var(--line); }
    .third-rows li:last-child { border-block-end: 0; }
    .third-name { display: inline-flex; align-items: center; min-block-size: 2.25rem; color: var(--brand-ink); font-weight: 600; overflow-wrap: anywhere; }
    .third-rows .third-empty { display: block; color: var(--muted); }
    .third-meta { grid-column: 1 / -1; color: var(--ink-2); font-size: var(--t-sm); }
    .routes { padding: var(--space-2) var(--space-3); }
    .routes .jump { flex: 1 1 100%; }
    .stack-values { justify-content: flex-start; font-size: var(--t-base); }
    .fields > :global(.field) { flex: 1 1 45%; }
    .stack li { grid-template-columns: minmax(0, 1fr) auto; }
    .stack li .track { grid-column: 1 / -1; }
    .jump-field { flex: 1 1 100%; }
    .finder { flex: 1 1 100%; }
    .finder .jump-field input { inline-size: auto; flex: 1; min-inline-size: 0; }
    .finder .jump-field { inline-size: 100%; }
    .routes { min-inline-size: 0; }
    .route-links { flex: 1 1 100%; flex-wrap: wrap; min-inline-size: 0; }
    .viz-wrap > summary { display: flex; align-items: center; justify-content: space-between; min-block-size: var(--target-min); padding: 0 var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); color: var(--ink-2); font-size: var(--t-base); font-weight: 600; list-style: none; cursor: pointer; }
    .viz-wrap > summary::-webkit-details-marker { display: none; }
    .viz-wrap > summary::after { content: '▾'; color: var(--muted); }
    .viz-wrap[open] > summary { margin-block-end: var(--space-3); }
    .viz-wrap[open] > summary::after { content: '▴'; }
    .viz-wrap::details-content { display: block; content-visibility: auto; }
    .viz-wrap:not([open])::details-content { content-visibility: hidden; }
    .jump-field select { flex: 1; max-inline-size: none; }
    .school { scroll-margin-block-start: 8rem; }
  }
  @media (min-width: 40.01rem) {
    .badge-count { display: none; }
  }
</style>
