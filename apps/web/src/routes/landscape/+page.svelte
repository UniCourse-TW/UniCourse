<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { navigating, page } from '$app/state';
  import { ISSUES_URL, statusLabels as crawlLabels, systemLabels, systems } from '$lib/institutions';
  import {
    categories, categoryLabels, indexPolicy, indexPolicyLabels, INDEXED_PTT_BOARDS, institutions, institutionsByCode, isSchoolSite, kindLabels,
    loginLabel, operatorLabels, siteStatuses, sites as allSites, statusLabels, type SchoolSection, type Site
  } from '$lib/landscape-data';
  import SitesList from '$lib/landscape-sites.svelte';
  import Badge from '$lib/ui/Badge.svelte';
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
  let finderMatches = $derived(finderQuery.trim() ? finderSchools.filter((school) => nameMatches(school.name, finderQuery)).slice(0, 6) : []);
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
    if (filtered) await goto(`/landscape#${id}`, { keepFocus: true });
    else location.hash = id;
    revealHash();
    document.getElementById(id)?.querySelector('summary')?.focus({ preventScroll: true });
  }
  /** Opens the school row (and the folded rest of the list) that the URL fragment points at. */
  function revealHash() {
    const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (!(target instanceof HTMLDetailsElement) || !target.classList.contains('school')) return;
    if (target.closest('.rest-schools')) restOpen = true;
    target.open = true;
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
  function finderKey(event: KeyboardEvent) {
    if (!finderMatches.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); finderOpen = true; finderActive = (finderActive + 1) % finderMatches.length; }
    else if (event.key === 'ArrowUp') { event.preventDefault(); finderActive = (finderActive - 1 + finderMatches.length) % finderMatches.length; }
    else if (event.key === 'Enter' && finderOpen) { event.preventDefault(); goToSchool(finderMatches[finderActive].id); }
    else if (event.key === 'Escape') finderOpen = false;
  }
  let form: HTMLFormElement | undefined = $state();
  let debounce: ReturnType<typeof setTimeout> | undefined;
  /** Status bars: each system's mix (default) or the systems' sizes on one scale. */
  let stackMode = $state<'share' | 'count'>('share');
  /** Phones list the third-party sites ten at a time. */
  const THIRD_PHONE = 10;
  /** School rows listed before 「顯示其餘 N 所」; a fragment link to a later school opens the rest. */
  const SCHOOL_PREVIEW = 40;
  let restOpen = $state(false);
  let schoolHead = $derived(data.schools.length > SCHOOL_PREVIEW + 5 ? data.schools.slice(0, SCHOOL_PREVIEW) : data.schools);
  let schoolTail = $derived(data.schools.slice(schoolHead.length));
  /** A narrow filter (one to three schools) opens their site lists right away. */
  let openSchools = $derived(filtered && data.schools.length <= 3);
  /** UniCourse's own crawl status, said once above the school list instead of a column of identical pills. */
  let crawlSummary = $derived.by(() => {
    if (!data.crawl) return null;
    const rows = data.schools.map((school) => ({ name: school.name, status: data.crawl?.[school.code]?.status })).filter((row) => row.status);
    const others = rows.filter((row) => row.status !== 'live') as { name: string; status: keyof typeof crawlLabels }[];
    return { live: rows.length - others.length, others };
  });
  let topMax = $derived(Math.max(1, ...data.topThird.map((row) => row.count)));
  onMount(() => {
    hydrated = true;
    if (window.matchMedia('(max-width: 40rem)').matches) thirdLimit = THIRD_PHONE;
    revealHash();
    window.addEventListener('hashchange', revealHash);
    return () => {
      clearTimeout(debounce);
      window.removeEventListener('hashchange', revealHash);
    };
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
  /**
   * The policy column only appears while the listed rows differ; otherwise the section dek states the
   * policy once (rule: a column with one value on every row is noise).
   */
  let shownPolicies = $derived(new Set(thirdRows.map((site) => indexPolicy(site))).size);
  let thirdColumns = $derived(shownPolicies <= 1 ? allThirdColumns.filter((column) => column.id !== 'policy') : allThirdColumns);

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

{#snippet schoolRow(school: SchoolSection)}
  {@const crawl = data.crawl?.[school.code]}
  {@const total = school.official.length + school.third.length}
  <!-- One summary line per school (counts, status mix, UniCourse status); the row opens its site list. -->
  <details class="school" id={school.id} open={openSchools || undefined}>
    <summary>
      <!-- 147 of 150 schools are 已收錄, so only the exceptions carry a pill (the line above the list says the rest). -->
      <h3 id={`${school.id}-title`} class="s-name">{school.name} <small class="code">{school.code}</small>{#if crawl && crawl.status !== 'live'} <StatusPill status={crawl.status} />{/if}</h3>
      <span class="s-where">{school.systemLabel}・{school.ownership === 'public' ? '公立' : '私立'}{#if school.city}・{school.city}{/if}</span>
      <span class="s-stats">
      <span class="s-n ui-tabular"><span class="s-lbl">官方 </span>{school.official.length}</span>
      <span class="s-n ui-tabular" class:zero={!school.third.length}><span class="s-lbl">第三方 </span>{school.third.length}</span>
      <span class="s-mix">
        {#if total}
          <span class="mini" aria-hidden="true">
            <i class="active" style:inline-size={`${pct(school.status.active, total)}%`}></i><i class="inactive" style:inline-size={`${pct(school.status.inactive, total)}%`}></i><i class="unknown" style:inline-size={`${pct(school.status.unknown, total)}%`}></i>
          </span>
          <span class="ui-tabular">運作 {school.status.active}{#if school.status.inactive}・停止 {school.status.inactive}{/if}{#if school.status.unknown}・不明 {school.status.unknown}{/if}</span>
        {:else}
          <span class="muted">尚未盤點</span>
        {/if}
      </span>
      </span>
    </summary>
    <div class="school-body">
      {#if crawl?.href || school.via.length}
        <p class="school-meta">
          {#if crawl?.href}<a class="strong" href={crawl.href}>看 UniCourse 收錄的 {school.name} 課程 →</a>{/if}
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
      全國 {number.format(data.totalSchools)} 所大專校院已盤點 {number.format(data.surveyedSchools)} 所，共 {number.format(data.totalSites)} 個課程網站（每個網站只算一次，跨校平台不重複計）・查核於 <time datetime={data.checkedAt}>{data.checkedAt.replaceAll('-', '/')}</time>，狀態為當日探測結果
      {#if !data.crawl}・<span class="warn">各校收錄狀態暫時無法取得</span>{/if}
    </p>
    <!-- Section shortcuts as one short line; looking up one school is done in the single search box below. -->
    <nav class="routes" aria-label="跳到本頁段落">
      <span class="routes-label">跳到</span>
      <a href="#third-party">第三方網站</a>
      {#if data.cross.length}<a href="#cross">跨校平台</a>{/if}
      <a href="#schools-title">各校清單</a>
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
      <!-- The page's one search box: it filters the guide, and a typed school name also offers a jump to that school. -->
      <div class="finder">
        <label class="search">
          <span class="sr-only">搜尋校名、網站或功能</span>
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="8.5" cy="8.5" r="5.5" /><path d="m12.5 12.5 4 4" stroke-linecap="round" />
          </svg>
          <input
            bind:value={searchValue}
            type="search"
            name="q"
            placeholder="校名、網站或功能，如 清大、排課"
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
        </label>
        {#if hydrated && finderOpen && finderMatches.length}
          <ul class="finder-list" id="school-finder" role="listbox" aria-label="跳到學校段落">
            <li class="finder-head" role="presentation">跳到學校段落（Enter 前往；不選則篩選整頁）</li>
            {#each finderMatches as school, index (school.code)}
              <li id={`finder-${school.id}`} role="option" aria-selected={index === finderActive}>
                <button type="button" tabindex="-1" onmousedown={(event) => event.preventDefault()} onclick={() => goToSchool(school.id)}>
                  <span>{school.name}</span><small>{school.count ? `${school.count} 個網站` : '尚未盤點'} ↓</small>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
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
            有第三方站的學校
          </label>
        </div>
      </details>
      <!-- Without JavaScript 套用 submits; with it, every change applies itself, so the button goes away. -->
      {#if !hydrated}<button type="submit" class="apply">套用</button>{/if}
    </form>
    <p class="result" role="status" aria-live="polite">
      {#if updating}<span class="dot" aria-hidden="true"></span>更新中…
      {:else if filtered}符合 <strong class="ui-tabular">{number.format(data.shownSites)}</strong> / {number.format(data.totalSites)} 個網站
        {#if data.thirdParty.length}・<a class="action" href="#third-party">看第三方清單 ↓</a>{/if}
        {#if data.schools.length}・<a class="action" href="#schools-title">看 {number.format(data.schools.length)} 所學校 ↓</a>{/if}
        <a class="clear inline-clear" href="/landscape">清除全部條件</a>
      {:else}這些條件會一起篩選下方的統計、圖表與清單{#if hydrated}，輸入即套用{/if}{/if}
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
      note={filtered ? `已盤點 ${number.format(data.surveyedSchools)} / ${number.format(data.totalSchools)} 所` : `全國 ${number.format(data.totalSchools)} 所，${number.format(data.totalSchools - data.surveyedSchools)} 所未盤點`} />
    <StatTile label="官方網站" value={data.stats.official} unit="個" note="校方與政府營運" />
    <StatTile label="第三方網站" value={data.stats.third} unit="個" note="學生、社群與公司" />
    <StatTile label="運作中" value={data.stats.active} unit="個"
      note={`停止 ${number.format(data.stats.inactive)}・不明 ${number.format(data.stats.unknown)}`} />
  </StatRow>

  {#if data.shownSites === 0}
    <EmptyState title="沒有符合的網站" description="換個關鍵字，或放寬體系、功能與狀態。">
      {#snippet action()}<a class="action" href="/landscape">清除篩選</a>{/snippet}
    </EmptyState>
  {:else}
    <div class="viz">
      <section class="panel" aria-labelledby="by-system">
        <div class="panel-head">
          <SectionHeader id="by-system" level={2} title="各體系網站狀態"
            description={`${filtered ? '依目前篩選' : `全部 ${number.format(data.totalSites)} 個網站`}・${stackMode === 'share'
              ? '每列是該體系網站的狀態比例；跨校平台計入每個涵蓋的體系。'
              : '條長是該體系的網站數（以最多的體系為滿格）；跨校平台計入每個涵蓋的體系。'}`} />
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
                <!-- The numbers sit beside the bar, never inside it, so every row reads the same way. -->
                <span class="stack-values ui-tabular" aria-hidden="true">
                  <span class="v active"><i></i>運作 {row.active}</span>
                  <span class="v inactive"><i></i>停止 {row.inactive}</span>
                  <span class="v unknown"><i></i>不明 {row.unknown}</span>
                </span>
                <span class="track" role="img" style:inline-size={`${share * 100}%`}
                  aria-label={`${row.label}：運作中 ${row.active}、停止 ${row.inactive}、不明 ${row.unknown}，共 ${total} 個`}>
                  <span class="seg active" style:inline-size={`${pct(row.active, total)}%`}></span>
                  <span class="seg inactive" style:inline-size={`${pct(row.inactive, total)}%`}></span>
                  <span class="seg unknown" style:inline-size={`${pct(row.unknown, total)}%`}></span>
                </span>
              </li>
            {/each}
          </ul>
          <p class="legend">
            <span aria-hidden="true"><i class="active"></i>運作中</span><span aria-hidden="true"><i class="inactive"></i>停止</span><span><i class="unknown" aria-hidden="true"></i>不明＝無法確認是否仍維護，多半是要登入的校內系統；知道近況歡迎<a href={ISSUES_URL} rel="noopener external">回報 ↗</a></span>
          </p>
          <ChartValues label="各體系網站狀態" columns={statusColumns} rows={data.bySystem} rowKey={(row) => row.system} />
        {:else}
          <p class="quiet">目前的篩選沒有歸屬任何體系的網站。</p>
        {/if}
      </section>
      <section class="panel" aria-labelledby="top-third">
        <SectionHeader id="top-third" level={2} title="第三方工具最多的學校"
          description={`${filtered ? '依目前篩選' : '全部資料'}・以單一學校為對象的學生、社群與公司網站數；點校名看該校清單。`} />
        {#if data.topThird.length}
          <ol class="rank" aria-label="第三方工具最多的學校">
            {#each data.topThird as row (row.code)}
              <li>
                <a href={`#${row.id}`}>{row.name}</a>
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

    <section aria-labelledby="third-party" class="third">
      <div class="third-head">
        <SectionHeader id="third-party" level={2} title="第三方查課網站"
          description={`學生、社群與公司做的評價、排課、成績分布與彙整服務。UniCourse 只給連結；PTT 的 ${INDEXED_PTT_BOARDS.length} 個課程看板另外索引短摘要。`} />
      </div>
      {#if data.thirdParty.length}
        <p class="third-count">
          共 <strong class="ui-tabular">{number.format(data.thirdParty.length)}</strong> 個：運作中 {number.format(thirdStatus.active)}・停止 {number.format(thirdStatus.inactive)}・不明 {number.format(thirdStatus.unknown)}，運作中排在前面
          {#if !filters.status}<a class="action" href={`/landscape?${new URLSearchParams({ ...(filters.q ? { q: filters.q } : {}), kind: 'third', status: 'active' })}`}>只看運作中</a>{/if}
          <a class="action" href="/terms#reviews">收錄原則</a>
        </p>
      {/if}
      <div class="third-table">
      <DataTable caption="第三方查課網站（點網站名稱開新頁；表頭可排序）" columns={thirdColumns}
        rows={thirdRows} rowKey={(site) => site.url} rowHeaderColumn="site" stickyColumn="site"
        rowHref={(site) => site.url} clientSort minWidth="58rem" maxHeight="none">
        {#snippet cell(site, column)}
          {#if column.id === 'site'}
            <span class="site-cell">{site.name}<span class="ext" aria-hidden="true">&nbsp;↗</span>{#if site.operatorName}<small>{site.operatorName}</small>{/if}</span>
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
      <!-- Phones: two short lines per site (name + status; school · login · functions), nothing folded. -->
      <ul class="third-rows" aria-label="第三方查課網站">
        {#each thirdRows as site (site.url)}
          <li>
            <a class="third-name" href={site.url} rel="noopener external">{site.name}<span aria-hidden="true">&nbsp;↗</span></a>
            <Badge tone={siteTones[site.status]} label={statusLabels[site.status]} dot />
            <span class="third-meta">
              <span>{schoolsOf(site)}・{loginLabel(site.loginRequired)}</span>
              {#each site.category as category (category)}<span class="cat">{categoryLabels[category]}</span>{/each}
              {#if indexPolicy(site) === 'excerpt'}<span class="cat excerpt">索引摘要</span>{/if}
            </span>
          </li>
        {:else}
          <li class="third-empty">這組篩選沒有第三方網站。</li>
        {/each}
      </ul>
      {#if thirdRows.length < data.thirdParty.length}
        <p class="table-foot">
          已列出 {number.format(thirdRows.length)} / {number.format(data.thirdParty.length)} 個・
          {#if hydrated}
            <button type="button" class="action" onclick={() => (thirdLimit = data.thirdParty.length)}>顯示其餘 {number.format(data.thirdParty.length - thirdRows.length)} 個</button>
          {:else}
            其餘列在下方各校段落，或<a class="action" href="/landscape?kind=third">只看第三方網站</a>
          {/if}
        </p>
      {/if}
    </section>

    {#if data.cross.length}
      <section class="cross" id="cross" aria-labelledby="cross-title">
        <SectionHeader id="cross-title" level={2} title={`跨校與全國平台（${number.format(data.cross.length)} 個）`}
          description="教育部與聯盟平台、跨校 LMS，以及涵蓋多校的第三方服務；每個平台只列一次。" />
        <SitesList label="跨校與全國平台" sites={data.cross} showOperator collapseAfter={8} header />
      </section>
    {/if}

    <section aria-labelledby="schools-title" class="schools">
      <SectionHeader id="schools-title" level={2} title={`各校（${number.format(data.schools.length)} 所）`}
        description={`依教育部學校代碼排序${filtered ? '，只列出符合篩選的學校' : '，沒有盤點到網站的學校也列出'}。官方／第三方是該校自己的網站數，不含跨校平台；點一列展開該校網站。`}>
        {#snippet actions()}
          <a class="action" href="/schools">UniCourse 各校收錄狀態 →</a>
        {/snippet}
      </SectionHeader>
      {#if crawlSummary}
        <p class="crawl-line">
          UniCourse 已收錄其中 <strong class="ui-tabular">{number.format(crawlSummary.live)}</strong> 所的課程{#if crawlSummary.others.length}；{crawlSummary.others.map((school) => `${school.name}（${crawlLabels[school.status]}）`).join('、')}在列中另外標示{/if}；展開一列可前往該校在 UniCourse 的課程頁。
        </p>
      {/if}
      {#if data.schools.length === 0}
        <EmptyState title="沒有符合的學校" description="換個校名，或取消「有第三方站的學校」。">
          {#snippet action()}<a class="action" href="/landscape">清除篩選</a>{/snippet}
        </EmptyState>
      {:else}
        <div class="school-table">
          <div class="school-cols" aria-hidden="true">
            <span>學校</span><span>體系・地區</span><span class="n">官方</span><span class="n">第三方</span><span>網站狀態</span>
          </div>
          {#each schoolHead as school (school.code)}{@render schoolRow(school)}{/each}
          {#if schoolTail.length}
            <details class="rest-schools" bind:open={restOpen}>
              <summary>顯示其餘 {number.format(schoolTail.length)} 所</summary>
              {#each schoolTail as school (school.code)}{@render schoolRow(school)}{/each}
            </details>
          {/if}
        </div>
      {/if}
    </section>
  {/if}

  <section class="about" id="about" aria-labelledby="about-title">
    <h2 id="about-title">本頁的資料來源與計算方式</h2>
    <ul>
      <li>學校名錄來自教育部「大專校院名錄」等開放資料，共 {number.format(data.totalSchools)} 所；網站清單由 UniCourse 逐校盤點，記錄在 repo 的 <code>data/course-sites.json</code>。</li>
      <li>「運作中」指查核當日可連線且約一年內有更新；「停止」含無法連線、已下架或公告停用；「不明」指無法確認。</li>
      <li>「官方」是校方或政府營運的網站；其餘（學生、社群、公司）算第三方。每個網站只算一次；只有「各體系網站狀態」圖把跨校平台計入每個涵蓋的體系。</li>
      <li>統計磚、兩張圖與所有清單都依目前篩選計算；沒有篩選時就是全部資料。</li>
      <li>UniCourse 只為 PTT 的 {INDEXED_PTT_BOARDS.length} 個課程看板（{INDEXED_PTT_BOARDS.join('、')}）索引不超過 120 字的摘要，與<a href="/terms#reviews">使用條款</a>列出的看板相同；其他網站只給連結。</li>
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
  .muted { color: var(--muted); }

  /* Page head: one h1, a one-line dek with the survey date, actions on the right. */
  .page-head { display: grid; gap: var(--space-1); }
  .title-row { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); align-items: baseline; justify-content: space-between; }
  h1 { margin: 0; font-size: var(--t-2xl); font-weight: 650; line-height: var(--leading-tight); letter-spacing: var(--tracking-heading); text-wrap: balance; }
  .head-actions { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-4); font-size: var(--t-sm); font-weight: 600; }
  .head-actions a, .action, .clear, .none a, .about a, .legend a, .school-meta a { color: var(--brand-ink); text-underline-offset: 0.15em; }
  .head-actions a { display: inline-flex; align-items: center; min-block-size: 2rem; }
  .dek { margin: 0; color: var(--muted); font-size: var(--t-base); }
  .warn { color: var(--warn); }
  .routes { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); align-items: center; font-size: var(--t-sm); }
  .routes-label { color: var(--muted); }
  .routes a { display: inline-flex; align-items: center; min-block-size: 2rem; color: var(--ink-2); font-weight: 600; text-underline-offset: 0.15em; }
  .routes a::after { content: '↓'; margin-inline-start: 0.2em; color: var(--muted); font-weight: 400; }
  .routes a:hover { color: var(--brand-ink); }

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
  .result { display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--space-1); margin: 0; min-block-size: 1.25rem; color: var(--muted); font-size: var(--t-sm); }
  .result .action { min-block-size: 0; font-size: var(--t-sm); }
  .result .dot { inline-size: 8px; block-size: 8px; border-radius: 50%; background: var(--brand); }
  .result strong { color: var(--ink); font-weight: 600; }
  .chips { display: flex; flex-wrap: wrap; gap: var(--space-2); }

  /* Charts: stacked status bars per system and a ranked bar list, side by side and about as tall. */
  .viz { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr)); gap: var(--space-3); align-items: stretch; }
  .finder { position: relative; display: flex; flex: 1 1 16rem; min-inline-size: 0; }
  .finder .search { flex: 1 1 auto; }
  .finder-head { padding: var(--space-1) var(--space-2); color: var(--muted); font-size: var(--t-xs); }
  .finder-list { position: absolute; inset-inline: 0; inset-block-start: calc(100% + 4px); z-index: 10; display: grid; margin: 0; padding: var(--space-1); list-style: none; border: 1px solid var(--control-line); border-radius: var(--radius-control); background: var(--panel-raised); box-shadow: 0 8px 24px color-mix(in srgb, var(--ink) 14%, transparent); }
  .finder-list button { display: flex; gap: var(--space-2); align-items: baseline; justify-content: space-between; inline-size: 100%; min-block-size: var(--target-min); padding: 0 var(--space-2); border: 0; border-radius: calc(var(--radius-control) - 2px); background: transparent; color: var(--ink); font: var(--t-base) / 1.3 var(--font-sans); text-align: start; cursor: pointer; }
  .finder-list small { color: var(--muted); font-size: var(--t-xs); white-space: nowrap; }
  .finder-list [aria-selected='true'] button, .finder-list button:hover { background: var(--brand-wash); color: var(--brand-ink); }
  .third-head { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); align-items: end; justify-content: space-between; }
  .third-head > :global(:first-child) { flex: 1 1 32rem; min-inline-size: 0; }
  .third-rows { display: none; margin: 0; padding: 0; list-style: none; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
  .panel { display: grid; gap: var(--space-3); align-content: start; padding: var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); min-inline-size: 0; }
  .stack { display: grid; gap: var(--space-2); margin: 0; padding: 0; list-style: none; font-size: var(--t-base); }
  .stack li { display: grid; grid-template-columns: 7.5rem minmax(0, 1fr) auto; grid-template-areas: 'label track values'; gap: var(--space-1) var(--space-3); align-items: center; }
  .stack-label { grid-area: label; color: var(--ink-2); font-size: var(--t-sm); }
  .stack-label small { color: var(--muted); font-size: var(--t-xs); }
  .stack .track { grid-area: track; }
  .stack.share .track { background: none; }
  .track { display: flex; min-inline-size: 3rem; block-size: 14px; overflow: hidden; border-radius: 3px; background: var(--chip); }
  .seg { display: block; block-size: 100%; }
  /* No text sits on the bars, so the status colours can be strong in both themes. */
  .seg.active, .legend i.active, .v.active i, .mini .active { background: color-mix(in srgb, var(--up) 80%, var(--panel)); }
  .seg.inactive, .legend i.inactive, .v.inactive i, .mini .inactive { background: color-mix(in srgb, var(--down) 80%, var(--panel)); }
  /* Unknown is a pale hatched fill, so it neither dominates nor competes with the red. */
  .seg.unknown, .legend i.unknown, .v.unknown i, .mini .unknown { background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--muted) 70%, transparent) 0 2px, var(--chip) 2px 5px); }
  .stack-values { grid-area: values; display: flex; gap: var(--space-3); justify-content: flex-end; color: var(--ink-2); font-size: var(--t-sm); white-space: nowrap; }
  .v { display: inline-flex; align-items: center; gap: 4px; }
  .v i { display: inline-block; inline-size: 8px; block-size: 8px; border-radius: 2px; }
  .v.active { color: var(--ink); font-weight: 650; }
  .legend { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-4); margin: 0; color: var(--ink-2); font-size: var(--t-sm); }
  .legend i { display: inline-block; inline-size: 10px; block-size: 10px; margin-inline-end: 6px; border-radius: 2px; vertical-align: -1px; }
  .table-foot { margin: 0; color: var(--muted); font-size: var(--t-base); }
  .table-foot button.action { border: 0; background: transparent; cursor: pointer; font: inherit; font-weight: 600; color: var(--brand-ink); text-decoration: underline; text-underline-offset: 0.15em; }
  .quiet { margin: 0; color: var(--muted); font-size: var(--t-base); }

  /* Ranking: one 32 px row per school, the count right-aligned beside a thin bar. */
  .rank { display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; counter-reset: rank; font-size: var(--t-base); }
  .rank li { display: grid; grid-template-columns: 1.25rem minmax(7rem, 11rem) minmax(0, 1fr) 3.5rem; gap: var(--space-3); align-items: center; min-block-size: 2rem; counter-increment: rank; }
  .rank li::before { content: counter(rank); color: var(--muted); font: var(--t-sm) var(--font-mono); text-align: end; }
  .rank a { color: var(--brand-ink); font-weight: 600; text-underline-offset: 0.15em; overflow-wrap: anywhere; }
  .rank-track { block-size: 8px; border-radius: var(--radius-pill); background: var(--chip); overflow: hidden; }
  .rank-track span { display: block; block-size: 100%; border-radius: inherit; background: var(--brand); }
  .rank-n { color: var(--ink); text-align: end; white-space: nowrap; }

  section { display: grid; gap: var(--space-3); min-inline-size: 0; }
  .action { display: inline-flex; align-items: center; min-block-size: 2rem; padding: 0 var(--space-1); border-radius: var(--radius-control); font-size: var(--t-base); font-weight: 600; }
  .site-cell { display: block; overflow-wrap: anywhere; min-inline-size: 13rem; }
  .site-cell .ext { color: var(--muted); font-weight: 400; white-space: nowrap; }
  /* Inline-block stops the row link's underline from reaching the operator line. */
  .site-cell small { display: inline-block; inline-size: 100%; color: var(--muted); font-size: var(--t-xs); font-weight: 400; text-decoration: none; }
  .inline-clear { min-block-size: 0 !important; margin-inline-start: var(--space-2); padding: 0 !important; background: none !important; text-decoration: underline; }
  .panel-head { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-3); align-items: start; justify-content: space-between; }
  .panel-head > :global(:first-child) { flex: 1 1 16rem; min-inline-size: 0; }
  .mode { display: inline-flex; flex: none; padding: 2px; border: 1px solid var(--line); border-radius: calc(var(--radius-control) + 2px); background: var(--panel-raised); }
  .mode button { min-block-size: 2.25rem; padding: 0 var(--space-3); border: 0; border-radius: var(--radius-control); background: transparent; color: var(--muted); font: 600 var(--t-sm) / 1 var(--font-sans); cursor: pointer; }
  .mode button[aria-pressed='true'] { background: var(--brand-wash); color: var(--brand-ink); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--brand) 40%, transparent); }
  .mode button:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .third-count { margin: 0; color: var(--ink-2); font-size: var(--t-sm); }
  .third-count strong { color: var(--ink); }
  .third-count .action { min-block-size: 0; margin-inline-start: var(--space-2); font-size: var(--t-sm); }
  .nowrap { white-space: nowrap; }
  .cats { display: flex; flex-wrap: wrap; gap: 2px var(--space-1); }
  .cat { padding: 0 6px; border-radius: var(--radius-pill); background: var(--chip); color: var(--ink-2); font-size: 0.75rem; font-weight: 500; line-height: 1.6; white-space: nowrap; }
  .cat.excerpt { background: var(--brand-wash); color: var(--brand-ink); font-weight: 600; }
  .policy-excerpt { color: var(--up); font-weight: 600; }
  .cross { scroll-margin-block-start: 7rem; }

  /* Schools: a compact index, one summary row per school; a row opens that school's site list. */
  .schools { gap: var(--space-3); scroll-margin-block-start: 7rem; }
  .school-table { border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); overflow: hidden; }
  .school-cols, .school > summary {
    display: grid;
    grid-template-columns: minmax(14rem, 1.5fr) minmax(10rem, 1fr) 3.5rem 3.5rem minmax(14rem, 1.4fr) 1rem;
    gap: var(--space-3);
    align-items: center;
    padding: 0 var(--space-3);
  }
  .school-cols { min-block-size: 2.25rem; border-block-end: 1px solid var(--line); background: var(--table-head); color: var(--muted); font-size: var(--t-sm); font-weight: 600; }
  .school-cols::after { content: ''; }
  .crawl-line { margin: 0; color: var(--ink-2); font-size: var(--t-sm); }
  .crawl-line strong { color: var(--ink); }
  .s-name :global(.pill), .s-name :global(span) { vertical-align: 1px; }
  .school-cols .n, .s-n { text-align: end; }
  .school { border-block-start: 1px solid var(--line); scroll-margin-block-start: 8rem; }
  .school-cols + .school { border-block-start: 0; }
  .school > summary { min-block-size: 2.5rem; padding-block: var(--space-1); list-style: none; cursor: pointer; }
  .school > summary::-webkit-details-marker { display: none; }
  .school > summary::after { content: '▾'; color: var(--muted); text-align: center; }
  .school[open] > summary::after { content: '▴'; }
  .school > summary:hover { background: var(--hover-row); }
  .school > summary:focus-visible { outline: var(--focus-ring); outline-offset: calc(-1 * var(--focus-offset)); }
  .school[open] > summary { background: var(--brand-wash); }
  .s-name { margin: 0; color: var(--ink); font-size: var(--t-base); font-weight: 650; line-height: 1.35; overflow-wrap: anywhere; }
  .code { color: var(--muted); font: 400 var(--t-xs) var(--font-mono); }
  .s-where { color: var(--ink-2); font-size: var(--t-sm); }
  .s-n { color: var(--ink); font-size: var(--t-base); font-weight: 600; }
  .s-n.zero { color: var(--muted); font-weight: 400; }
  .s-lbl { display: none; }
  /* Desktop: the counts and the mix are grid cells; narrow screens put them on their own line. */
  .s-stats { display: contents; }
  .s-mix { display: flex; gap: var(--space-2); align-items: center; min-inline-size: 0; color: var(--ink-2); font-size: var(--t-sm); white-space: nowrap; }
  .mini { display: flex; flex: none; inline-size: 4.5rem; block-size: 8px; overflow: hidden; border-radius: 2px; background: var(--chip); }
  .mini i { display: block; block-size: 100%; }
  .school-body { display: grid; gap: var(--space-2); padding: var(--space-2) var(--space-3) var(--space-3); border-block-start: 1px solid var(--line); background: var(--panel); }
  .school-meta { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-4); margin: 0; color: var(--muted); font-size: var(--t-sm); overflow-wrap: anywhere; }
  .school-meta .strong { font-weight: 600; }
  .rest-schools > summary { display: flex; align-items: center; gap: var(--space-2); min-block-size: var(--target-min); padding: 0 var(--space-3); border-block-start: 1px solid var(--line); color: var(--brand-ink); font-weight: 600; cursor: pointer; list-style: none; }
  .rest-schools > summary::-webkit-details-marker { display: none; }
  .rest-schools > summary::before { content: '＋'; color: var(--muted); }
  .rest-schools[open] > summary::before { content: '－'; }
  .rest-schools > summary:focus-visible { outline: var(--focus-ring); outline-offset: calc(-1 * var(--focus-offset)); }
  .none { margin: 0; padding: var(--space-3) var(--space-4); border: 1px dashed var(--line); border-radius: var(--radius-panel); color: var(--muted); font-size: var(--t-base); }
  .none a { margin-inline-start: var(--space-2); font-weight: 600; }

  .about { gap: var(--space-2); padding: var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel); color: var(--ink-2); font-size: var(--t-base); }
  .about h2 { margin: 0; font-size: var(--t-lg); font-weight: 650; letter-spacing: var(--tracking-heading); }
  .about ul { margin: 0; padding-inline-start: 1.25em; display: grid; gap: var(--space-1); }
  .about code { font-family: var(--font-mono); font-size: 0.9em; }

  @media (max-width: 64rem) {
    .school-cols { display: none; }
    /* Narrow: name + UniCourse status on the first line, then where, counts and the status mix. */
    .school > summary { position: relative; display: flex; flex-wrap: wrap; gap: 2px var(--space-3); align-items: baseline; padding-block: var(--space-2); padding-inline-end: 2.25rem; }
    .s-name { flex: 0 1 auto; }
    .s-where { flex: 1 1 auto; font-size: var(--t-xs); color: var(--muted); }
    .school > summary::after { position: absolute; inset-block-start: var(--space-2); inset-inline-end: var(--space-3); }
    .s-stats { display: flex; flex: 1 1 100%; flex-wrap: wrap; gap: 2px var(--space-3); align-items: center; }
    .s-n { font-size: var(--t-sm); }
    .s-lbl { display: inline; color: var(--muted); font-weight: 400; }
  }
  @media (max-width: 40rem) {
    .dek { font-size: var(--t-sm); }
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
    .finder { flex: 1 1 7rem; }
    .more summary, .apply { flex: none; }
    .fields { flex-basis: 100%; padding-block-start: var(--space-2); }
    /* The wide table becomes short rows: name + status, then schools · login · functions. */
    .third-table { display: none; }
    .third-rows { display: block; }
    .third-rows li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px var(--space-2); align-items: center; padding: var(--space-2) var(--space-3); border-block-end: 1px solid var(--line); }
    .third-rows li:last-child { border-block-end: 0; }
    /* Inline, so a wrapped name keeps ↗ after its last character (the nbsp glues them). */
    .third-name { display: inline; padding-block: 0.375rem; color: var(--brand-ink); font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; }
    .third-rows .third-empty { display: block; color: var(--muted); }
    .third-meta { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 2px var(--space-1); align-items: center; color: var(--ink-2); font-size: var(--t-sm); }
    .third-meta > span:first-child { margin-inline-end: var(--space-1); }
    .fields > :global(.field) { flex: 1 1 45%; }
    .check { flex: 1 1 100%; justify-content: center; }
    .stack li { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: 'label values' 'track track'; row-gap: 2px; }
    .stack-values { gap: var(--space-2); font-size: var(--t-sm); }
    .rank li { grid-template-columns: 1rem minmax(0, max-content) minmax(3rem, 1fr) 3rem; gap: var(--space-2); min-block-size: 2.25rem; }
    .rank a { display: inline-flex; align-items: center; min-block-size: 2.25rem; }
    .school { scroll-margin-block-start: 8rem; }
  }
  @media (min-width: 40.01rem) {
    .badge-count { display: none; }
  }
</style>
