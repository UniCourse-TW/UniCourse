<script lang="ts">
  import { page } from '$app/state';
  import '$lib/community-ui.css';
  import CommunityCompose from '$lib/community-compose.svelte';
  import CommunityPostList from '$lib/community-post-list.svelte';
  import { postTypeLabels, shortDateTime } from '$lib/community-format';
  import { forumHref, loginHref, type ForumFilters } from '$lib/community-paths';
  import { displayValue } from '$lib/ui/format';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import FilterSelect from '$lib/ui/FilterSelect.svelte';
  import Pagination from '$lib/ui/Pagination.svelte';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let filters = $derived(data.filters);
  let schoolNames = $derived(Object.fromEntries(data.schools.map((school) => [school.slug, school.name])));
  let schoolOptions = $derived(data.schools.map((school) => ({ value: school.slug, label: school.name })));
  let total = $derived(data.posts.total);
  let pages = $derived(Math.max(1, Math.ceil(total / data.posts.pageSize)));
  let first = $derived((filters.page - 1) * data.posts.pageSize + 1);
  let last = $derived(first + data.posts.posts.length - 1);
  let filtered = $derived(Boolean(filters.type || filters.school || filters.courseCode || filters.q || filters.tag));
  let narrowed = $derived(Boolean(filters.school || filters.q || filters.tag));
  /** Only a category chip is active: the empty state can speak about that category. */
  let onlyType = $derived(Boolean(filters.type) && !narrowed && !filters.courseCode);
  // `form` is a failed create (it carries `title`); course checks never land here.
  let created = $derived(form && 'title' in form && typeof form.title === 'string' ? form : undefined);
  let draft = $derived(
    created ?? {
      type: filters.type || 'question',
      title: '',
      content: '',
      school: filters.school,
      courseCode: filters.courseCode,
      tags: filters.tag
    }
  );
  let composeOpen = $derived(data.compose || Boolean(created));
  let closeHref = $derived(forumHref(filters));
  let composeHref = $derived(`${forumHref(filters)}${forumHref(filters).includes('?') ? '&' : '?'}compose=1`);
  let composeOrLogin = $derived(data.user ? composeHref : loginHref(composeHref));

  const fmt = new Intl.NumberFormat('zh-TW');
  function writeHref(school: string, courseCode: string) {
    const href = `/forum?${new URLSearchParams({ type: 'article', compose: '1', school, courseCode })}`;
    return data.user ? href : loginHref(href);
  }
  function filterHref(next: ForumFilters) {
    const href = forumHref(next);
    return data.oldest ? `${href}${href.includes('?') ? '&' : '?'}sort=oldest` : href;
  }
  /** A young forum with suggestions to show: the invitation sits beside (desktop) or under (phone) the list. */
  let invite = $derived(data.young && data.posts.posts.length > 0 && !filtered && !filters.courseCode && data.suggestions.length > 0);
  let topEnrolled = $derived(Math.max(0, ...data.suggestions.map((entry) => entry.enrolledTotal ?? 0)));
  const count = (value: number | null) => (value === null ? '' : fmt.format(value));
  const typeChips = [
    { type: '', label: '全部', key: 'all' },
    { type: 'question', label: postTypeLabels.question, key: 'question' },
    { type: 'article', label: postTypeLabels.article, key: 'article' },
    { type: 'announcement', label: postTypeLabels.announcement, key: 'announcement' }
  ] as const;
</script>

<svelte:head>
  <title>論壇｜UniCourse</title>
  <meta name="description" content="UniCourse 課程論壇：各校修課心得、選課提問與公告。" />
</svelte:head>

<div class="cm forum">
  <header class="cm-head">
    <h1>論壇</h1>
    <!-- What the forum is for and when it last moved; how many posts match is said once, above the list. -->
    <p class="cm-dek facts">
      <span>修課心得、選課提問與公告</span>
      {#if data.latest}<span>最新發文 <time class="num" datetime={data.latest}>{shortDateTime(data.latest)}</time></span>{/if}
    </p>
    <div class="cm-actions">
      <a class="rules" href="/terms#account" aria-label="發文規則"><span aria-hidden="true">ⓘ</span>規則</a>
      {#if data.user}
        <CommunityCompose
          open={composeOpen}
          {draft}
          schools={data.schools}
          isAdmin={data.user.isAdmin}
          {closeHref}
          message={created?.message}
        />
      {:else}
        <a class="cm-btn" href={loginHref('/forum?compose=1')}><span aria-hidden="true">＋</span> 發表文章</a>
      {/if}
    </div>
  </header>

  <!-- Search covers title and body; the course scope (school + code) is a separate, visible control. -->
  <form method="GET" action="/forum" class="toolbar" aria-label="篩選文章">
    <label class="search">
      <span class="cm-sr">關鍵字</span>
      <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
      <input name="q" type="search" maxlength="100" defaultValue={filters.q} placeholder="搜尋標題與內文" />
    </label>
    <!-- The same submit button applies the keyword, course scope and sort selection. -->
    <button class="cm-btn submit">搜尋</button>
    <details class="scope">
      <summary>
        {data.sortable ? '篩選與排序' : '更多篩選'}
        <span class="chev" aria-hidden="true"></span>
        {#if !filters.school}<span class="scope-note">全部學校</span>{/if}
        {#if data.oldest}<span class="scope-note">最早發文</span>{/if}
      </summary>
      <div class="scope-fields" role="group" aria-label={data.sortable ? '篩選與排序' : '進階篩選'}>
        <FilterSelect name="school" label="學校" options={schoolOptions} value={filters.school} allLabel="全部學校" />
        <label class="code-field">
          <span>課號</span>
          <input name="courseCode" maxlength="100" defaultValue={filters.courseCode} placeholder="例如 CS2001"
            autocapitalize="characters" spellcheck="false" />
        </label>
        <label class="code-field">
          <span>標籤</span>
          <input name="tag" maxlength="100" defaultValue={filters.tag} placeholder="例如 作業" spellcheck="false" />
        </label>
        {#if data.sortable}
          <div class="sort-field">
            <label for="forum-sort">排序</label>
            <select id="forum-sort" name="sort" value={data.oldest ? 'oldest' : ''}>
              <option value="">最新發文</option>
              <option value="oldest">最早發文</option>
            </select>
          </div>
        {/if}
      </div>
    </details>
    {#if filters.type}<input type="hidden" name="type" value={filters.type} />{/if}
    {#if filtered || filters.courseCode}<a class="clear" href="/forum">清除</a>{/if}
  </form>

  <div class="chip-bar">
    <nav class="cm-chips types" aria-label="文章分類">
      {#each typeChips as chip (chip.key)}
        {@const n = data.counts[chip.key]}
        {#if n === 0 && chip.type && filters.type !== chip.type}
          <span class="cm-chip chip-empty" aria-disabled="true" aria-label="目前沒有{chip.label}">{chip.label}<span class="n">0</span></span>
        {:else}
          <a class="cm-chip" href={filterHref({ ...filters, type: chip.type, page: 1 })}
            aria-current={filters.type === chip.type ? 'true' : undefined}>
            {chip.label}{#if n !== null}<span class="n">{count(n)}</span>{/if}
          </a>
        {/if}
      {/each}
    </nav>
    {#if narrowed || filters.courseCode}
      <div class="cm-chips" role="group" aria-label="已套用的篩選">
        {#if filters.school}
          <a class="cm-chip remove" href={filterHref({ ...filters, school: '', courseCode: '', page: 1 })} aria-label="移除篩選：學校 {schoolNames[filters.school] ?? filters.school}{filters.courseCode ? '與課號' : ''}">
            {schoolNames[filters.school] ?? filters.school} <span aria-hidden="true">×</span>
          </a>
        {/if}
        {#if filters.courseCode}
          <a class="cm-chip remove" href={filterHref({ ...filters, courseCode: '', page: 1 })} aria-label="移除篩選：課號 {filters.courseCode}">
            課號 <span class="mono">{filters.courseCode}</span> <span aria-hidden="true">×</span>
          </a>
        {/if}
        {#if filters.tag}
          <a class="cm-chip remove" href={filterHref({ ...filters, tag: '', page: 1 })} aria-label="移除篩選：標籤 {filters.tag}">#{filters.tag} <span aria-hidden="true">×</span></a>
        {/if}
        {#if filters.q}
          <a class="cm-chip remove" href={filterHref({ ...filters, q: '', page: 1 })} aria-label="移除篩選：關鍵字 {filters.q}">「{filters.q}」 <span aria-hidden="true">×</span></a>
        {/if}
      </div>
    {/if}
  </div>

  <!-- A young forum (fewer than 10 posts) puts the course suggestions beside the list on wide screens, and
       right under it on phones, with a jump link after the list. -->
  <div class="board" class:rail={invite}>
  <section aria-labelledby="results" class="results">
    {#if data.posts.posts.length === 0}
      <h2 id="results" class="cm-sr">{filtered ? '符合的文章' : '最新文章'}（{total}）</h2>
      {#if onlyType}
        <EmptyState title="還沒有{postTypeLabels[filters.type || 'question']}" description={filters.type === 'announcement' ? '公告由管理員發布；有新公告時會出現在這裡。' : `第一篇${postTypeLabels[filters.type || 'question']}就從你開始，發文時選「${postTypeLabels[filters.type || 'question']}」即可。`}>
          {#snippet action()}
            <div class="state-actions">
              {#if filters.type !== 'announcement'}<a class="cm-btn" href={composeOrLogin}>發表第一篇{postTypeLabels[filters.type || 'question']}</a>{/if}
              <a class="cm-btn secondary" href="/forum">看全部文章</a>
            </div>
          {/snippet}
        </EmptyState>
      {:else if filtered || filters.courseCode}
        <EmptyState title="沒有符合的文章" description={filters.courseCode ? `${schoolNames[filters.school] ?? filters.school} ${filters.courseCode} 還沒有人發文，你可以發表第一篇。` : '換個關鍵字或分類，或清除篩選看全部文章。'}>
          {#snippet action()}
            <div class="state-actions">
              {#if filters.courseCode}
                <a class="cm-btn" href={composeOrLogin}>發表這門課的第一篇</a>
              {/if}
              <a class="cm-btn secondary" href="/forum">清除篩選</a>
            </div>
          {/snippet}
        </EmptyState>
      {:else}
        <EmptyState title="還沒有文章，來發表第一篇吧。" description="修課心得、選課提問都歡迎；從課程頁的「相關討論」進來會自動帶上課號。">
          {#snippet action()}
            <div class="state-actions">
              <a class="cm-btn" href={data.user ? '/forum?compose=1' : loginHref('/forum?compose=1')}>發表文章</a>
              <a class="cm-btn secondary" href="/">先去查課</a>
            </div>
          {/snippet}
        </EmptyState>
      {/if}
    {:else}
      <div class="list-head">
        <h2 id="results">{filtered ? '符合的文章' : data.oldest ? '文章' : '最新文章'}<span class="count num">{fmt.format(total)} 篇</span></h2>
      </div>
      <CommunityPostList posts={data.posts.posts} {schoolNames} courseTitles={data.courseTitles} dense label={filtered ? '符合的文章' : '文章'} />
      {#if invite}<a class="young-note" href="#sparse-title">論壇剛開張，從熱門課程寫心得 <span aria-hidden="true">↓</span></a>{/if}
      {#if pages > 1}
        <footer class="pager">
          <p class="num">第 {fmt.format(first)}–{fmt.format(last)} 篇<span class="sep">·</span>共 {fmt.format(total)} 篇</p>
          <Pagination url={page.url} page={filters.page} totalPages={pages} label="文章分頁" />
        </footer>
      {/if}
    {/if}
  </section>
  {#if invite}
    <!-- A young forum: a short, open list of well-attended courses to write about, apart from the results. -->
    <aside class="sparse" aria-labelledby="sparse-title">
      <div class="sparse-head">
        <div class="sparse-title">
          <h2 id="sparse-title">{data.suggestionsSchool ? `${data.suggestionsSchool}熱門課程` : '熱門課程'} <span>依修課人次</span></h2>
          <a href="/">查其他課程 →</a>
        </div>
        <p class="sparse-dek" id="suggest-scale">
          <span>各課收錄期間累計</span>
          {#if topEnrolled > 0}<span class="scale num">尺度 0–{fmt.format(topEnrolled)} 人次</span>{/if}
        </p>
      </div>
      <div class="suggest-frame">
        <table class="suggest" aria-describedby="suggest-scale">
          <caption class="cm-sr">依{data.suggestionsSchool ?? '各校'}累計修課人次推薦的課程</caption>
          <thead>
            <tr><th scope="col">課程</th><th scope="col" class="count-col">累計修課人次</th><th scope="col"><span class="cm-sr">動作</span></th></tr>
          </thead>
          <tbody>
            {#each data.suggestions as entry (entry.school + entry.courseCode)}
              {@const share = entry.enrolledTotal != null && topEnrolled ? (entry.enrolledTotal / topEnrolled) * 100 : null}
              <tr>
                <th scope="row" class="suggest-course">
                  <a class="row-link" href="/courses/{entry.offeringId}">{entry.title}</a>
                  <span class="muted"><span>{entry.schoolName}</span><span class="mono">{entry.courseCode}</span></span>
                </th>
                <td class="suggest-count">
                  <!-- Bars share one scale starting at 0 (the footnote names the full bar), so the courses compare at a glance. -->
                  {#if share !== null}<span class="bar" aria-hidden="true"><span style:inline-size="{share > 0 ? `max(3px, ${share}%)` : '0'}"></span></span>{/if}
                  <span class="num value" title={entry.enrolledTotal == null ? '目前沒有收錄累計修課人次' : undefined}>{displayValue(entry.enrolledTotal)}<small> 人次</small></span>
                  {#if entry.terms}<span class="range num">{entry.terms.count} 期 · {entry.terms.first === entry.terms.last ? entry.terms.first : `${entry.terms.first}–${entry.terms.last}`}</span>{/if}
                </td>
                <td class="suggest-act">
                  <a class="write" href={writeHref(entry.school, entry.courseCode)} aria-label={`寫心得：${entry.title}`}>寫心得 <span aria-hidden="true">→</span></a>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </aside>
  {/if}
  </div>
</div>

<style>
  .forum .sep { margin-inline: 0.35em; color: var(--axis); }
  .toolbar { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
  .search {
    position: relative;
    display: flex;
    flex: 1 1 16rem;
    min-inline-size: 0;
  }
  .search svg {
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: 0.75rem;
    inline-size: 1rem;
    block-size: 1rem;
    translate: 0 -50%;
    fill: none;
    stroke: var(--muted);
    stroke-width: 1.8;
    stroke-linecap: round;
    pointer-events: none;
  }
  .search input, .code-field input {
    inline-size: 100%;
    min-block-size: var(--target-min);
    padding: 0 0.75rem 0 2.25rem;
    border: 1px solid var(--control-line);
    border-radius: var(--radius-control);
    color: var(--ink);
    background: var(--panel-raised);
    color-scheme: var(--ui-color-scheme);
    font: var(--t-base) / 1.4 var(--font-sans);
  }
  .search input::placeholder, .code-field input::placeholder { color: var(--muted); }
  .search input:focus-visible, .code-field input:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); border-color: var(--brand); }
  .toolbar :global(.field) { min-block-size: var(--target-min); }
  .scope { order: 2; }
  .scope[open] { flex-basis: 100%; }
  .scope summary {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-block-size: var(--target-min);
    padding: 0 var(--space-2);
    border-radius: var(--radius-control);
    color: var(--brand-ink);
    font-size: var(--t-base);
    font-weight: 600;
    cursor: pointer;
    list-style: none;
  }
  .scope summary::-webkit-details-marker { display: none; }
  .scope .chev::before { content: '+' / ''; }
  .scope[open] .chev::before { content: '−' / ''; }
  .scope summary:hover { background: var(--hover-row); }
  .scope-note { color: var(--muted); font-size: var(--t-sm); font-weight: 400; }
  .scope-fields { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; padding-block-start: var(--space-2); }
  .scope-fields :global(.field label) { font-size: 0.8125rem; }
  .code-field {
    display: inline-flex;
    align-items: center;
    min-block-size: var(--target-min);
    border: 1px solid var(--control-line);
    border-radius: var(--radius-control);
    background: var(--panel-raised);
    color: var(--muted);
    font: 600 var(--t-sm) / var(--leading-tight) var(--font-sans);
  }
  .code-field span { padding-inline-start: var(--space-2); white-space: nowrap; }
  .code-field input { inline-size: 8.5rem; padding-inline: var(--space-2); border: 0; background: transparent; font-family: var(--font-mono); }
  .code-field:has(input:focus-visible) { outline: var(--focus-ring); outline-offset: var(--focus-offset); }
  .code-field input:focus-visible { outline: none; }
  .clear {
    display: inline-flex;
    align-items: center;
    min-block-size: var(--target-min);
    padding-inline: var(--space-2);
    font-size: var(--t-base);
    font-weight: 600;
  }
  .chip-bar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
    align-items: center;
    justify-content: space-between;
    margin-block: var(--space-3) var(--space-4);
  }
  .results { min-inline-size: 0; }
  .pager {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
    align-items: center;
    justify-content: space-between;
    margin-block-start: var(--space-3);
    color: var(--muted);
    font-size: var(--t-base);
  }
  .pager p { min-block-size: var(--target-min); display: flex; align-items: center; }
  .state-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); justify-content: center; }
  /* Young forum: on wide screens the invitation is a right column beside the list, so the list is narrower
     (its numbers sit near the titles) and the call to write is in the first screen. */
  .board { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-6); align-items: start; }
  @media (min-width: 64rem) {
    .board.rail { grid-template-columns: minmax(0, 1fr) 20rem; gap: var(--space-8); }
    .board.rail .list-head { min-block-size: var(--target-min); }
  }
  .sparse { display: grid; gap: var(--space-2); min-inline-size: 0; container: suggest / inline-size; }
  .sparse h2 { scroll-margin-block-start: 7rem; margin: 0; font-size: var(--t-lg); font-weight: 650; letter-spacing: var(--tracking-heading); }
  .sparse-dek { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); margin-block-start: var(--space-1) !important; color: var(--muted); font-size: var(--t-sm); text-wrap: pretty; }
  .sparse-dek .scale { white-space: nowrap; }
  .suggest-frame { border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); overflow: hidden; }
  .suggest { inline-size: 100%; border-collapse: collapse; font-size: var(--t-base); }
  .suggest thead th { padding: var(--space-2) var(--space-4); border-block-end: 1px solid var(--line); color: var(--muted); background: var(--table-head); font-size: var(--t-sm); font-weight: 600; text-align: start; }
  .suggest tbody :is(th, td) { padding: var(--space-2) var(--space-4); text-align: start; vertical-align: middle; font-weight: 400; }
  .suggest tbody tr + tr :is(th, td) { border-block-start: 1px solid var(--line); }
  .suggest tr { position: relative; }
  .suggest tbody tr:hover, .suggest tbody tr:focus-within { background: var(--hover-row); }
  .suggest-course { min-inline-size: 0; }
  .row-link::after { content: ''; position: absolute; inset: 0; }
  .row-link:focus-visible::after { outline: var(--focus-ring); outline-offset: -3px; border-radius: var(--radius-control); }
  .suggest-course a { font-weight: 650; }
  .suggest .muted { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); color: var(--muted); font-size: 0.8125rem; }
  .suggest .count-col { inline-size: 45%; }
  .suggest-count { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0 var(--space-3); align-items: center; }
  /* Thin bars use the same solid brand fill as the first three rows on the homepage. */
  .suggest-count .bar { block-size: 0.375rem; border-radius: 2px; background: var(--chip); overflow: hidden; }
  .suggest-count .bar > span { display: block; block-size: 100%; border-radius: 2px; background: var(--brand); }
  .suggest-count .value { color: var(--ink); font-weight: 600; text-align: end; white-space: nowrap; }
  .suggest-count small { margin-inline-start: 0.25em; color: var(--muted); font-size: var(--t-sm); font-weight: 500; }
  .suggest-count .range { grid-column: 1 / -1; color: var(--muted); font-size: var(--t-sm); }
  .suggest-act { inline-size: 1%; text-align: end !important; }
  .write { position: relative; z-index: 1; display: inline-flex; gap: 0.25em; align-items: center; min-block-size: var(--target-min); color: var(--brand-ink); font-size: var(--t-sm); font-weight: 600; white-space: nowrap; }
  .sparse-title { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0 var(--space-2); }
  .sparse-title h2 > span { color: var(--muted); font-size: var(--t-sm); font-weight: 500; white-space: nowrap; }
  .sparse-title a { display: inline-flex; min-block-size: var(--target-min); align-items: center; font-size: 0.8125rem; }
  .forum .mono, .forum :is(.cm-chip, .rules, .young-note, .sparse-dek, .suggest th, .suggest small, .suggest .range, .write, .code-field, .sort-field) {
    font-size: max(0.8125rem, var(--t-sm));
  }
  .forum .cm-chip[aria-current='true'] .n { opacity: 1; }
  .forum .cm-chip.remove { max-inline-size: 100%; white-space: normal; overflow-wrap: anywhere; }
  /* Narrow (the right column, or a phone): course and 寫心得 on the first line, the bar with its count
     under them across the row, then the term range. */
  @container suggest (max-width: 34rem) {
    .suggest thead { display: none; }
    .suggest, .suggest tbody { display: block; }
    .suggest tbody tr { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0 var(--space-3); align-items: center; padding: var(--space-1) var(--space-3); }
    .suggest tbody tr + tr { border-block-start: 1px solid var(--line); }
    .suggest tbody tr > :is(th, td):nth-child(n) { display: block; padding: 0; border: 0; }
    .suggest-count { grid-column: 1 / -1; grid-row: 2; display: grid !important; }
    .suggest-act { grid-column: 2; grid-row: 1; inline-size: auto; }
  }
  .types .chip-empty { color: var(--muted); background: transparent; border: 1px solid var(--line); cursor: default; }
  .list-head { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); justify-content: space-between; align-items: center; margin-block-end: var(--space-1); }
  .list-head h2 { display: flex; gap: var(--space-2); align-items: baseline; margin: 0; font-size: var(--t-lg); }
  .list-head .count { color: var(--ink-2); font-size: var(--t-base); font-weight: 600; letter-spacing: 0; white-space: nowrap; }
  .young-note { display: inline-flex; align-items: center; gap: 0.25em; min-block-size: var(--target-min); color: var(--brand-ink); font-size: var(--t-sm); font-weight: 600; }
  .sort-field {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    min-block-size: var(--target-min);
    padding-inline-start: var(--space-2);
    border: 1px solid var(--control-line);
    border-radius: var(--radius-control);
    background: var(--panel-raised);
    color: var(--muted);
    font-size: var(--t-sm);
    font-weight: 600;
  }
  .sort-field select { min-block-size: var(--target-min); padding: 0 var(--space-2); border: 0; border-radius: var(--radius-control); background: transparent; color: var(--ink); font: inherit; color-scheme: var(--ui-color-scheme); }
  .submit { flex: none; order: 1; }
  .toolbar > .clear { order: 2; }
  .facts { display: flex; flex-wrap: wrap; gap: 0 var(--space-2); }
  .facts > span { white-space: nowrap; }
  /* A real target next to the main button, not a stray small link. */
  .rules { display: inline-flex; gap: 0.35em; align-items: center; min-block-size: var(--target-min); padding-inline: var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-control); color: var(--ink-2); font-size: var(--t-sm); font-weight: 600; text-decoration: none; }
  .rules:hover { border-color: var(--control-line); background: var(--hover-row); color: var(--ink); }

  @media (max-width: 40rem) {
    .search { flex: 1 1 10rem; }
    .toolbar > .submit { flex: 0 0 auto; padding-inline: var(--space-4); }
    .scope { flex: 1 1 100%; }
    .facts > span:first-child { flex-basis: 100%; }
    .scope-fields :global(.field) { flex: 1 1 100%; }
    .scope-fields :global(.field select) { flex: 1; max-inline-size: none; }
    .code-field, .sort-field { flex: 1 1 100%; }
    .sort-field select { flex: 1; }
    .code-field input { flex: 1; inline-size: auto; min-inline-size: 0; }
    /* The removable chips below already clear each filter; the text link only adds a wrapped row here. */
    .toolbar > .clear { display: none; }
    .chip-bar { margin-block-end: var(--space-2); }
    .board { gap: var(--space-3); }
    .cm-head { margin-block-end: var(--space-4); }
    .rules { padding-inline: var(--space-2); }
  }
</style>
