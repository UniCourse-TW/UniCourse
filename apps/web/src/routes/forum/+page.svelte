<script lang="ts">
  import { page } from '$app/state';
  import '$lib/community-ui.css';
  import CommunityCompose from '$lib/community-compose.svelte';
  import CommunityPostList from '$lib/community-post-list.svelte';
  import { postTypeLabels, shortDateTime } from '$lib/community-format';
  import { forumHref, loginHref } from '$lib/community-paths';
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
  let filtered = $derived(Boolean(filters.type || filters.school || filters.q || filters.tag));
  let narrowed = $derived(Boolean(filters.school || filters.q || filters.tag));
  /** Only a category chip is active: the empty state can speak about that category. */
  let onlyType = $derived(Boolean(filters.type) && !narrowed && !filters.courseCode);
  let scopeCount = $derived(Number(Boolean(filters.school)) + Number(Boolean(filters.courseCode)));
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
  /** At most this many posts in the whole forum: the list gets an invitation underneath. */
  const SPARSE_POSTS = 5;
  function writeHref(school: string, courseCode: string) {
    const href = `/forum?${new URLSearchParams({ type: 'article', compose: '1', school, courseCode })}`;
    return data.user ? href : loginHref(href);
  }
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
    <!-- Each fact keeps its separator, so a wrapped line never starts with a lone dot. -->
    <p class="cm-dek facts">
      <span>修課心得、選課提問與公告</span>
      {#if data.counts.all !== null}<span>{narrowed || filters.courseCode ? '符合' : '全站'} <span class="num">{fmt.format(data.counts.all)}</span> 篇</span>{/if}
      {#if data.latest}<span>最新發文 <time class="num" datetime={data.latest}>{shortDateTime(data.latest)}</time></span>{/if}
    </p>
    <div class="cm-actions">
      <a class="rules" href="/terms#account"><span aria-hidden="true">ⓘ</span>發文規則</a>
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
      <input name="q" type="search" maxlength="100" defaultValue={filters.q} placeholder="搜尋標題或內文" aria-describedby="list-order" />
    </label>
    <details class="scope" open={scopeCount > 0 || undefined}>
      <!-- Phones: one button for both fields; it names the chosen school and code once there are any. -->
      <summary>{#if scopeCount}<span class="scope-part">篩選：<b>{[filters.school ? (schoolNames[filters.school] ?? filters.school) : '', filters.courseCode].filter(Boolean).join('・')}</b></span>{:else}<span class="scope-part">學校與課號篩選</span>{/if}</summary>
      <div class="scope-fields" role="group" aria-label="課程範圍">
        <FilterSelect name="school" label="學校" options={schoolOptions} value={filters.school} allLabel="全部學校" />
        <label class="code-field">
          <span>課號</span>
          <input name="courseCode" maxlength="100" defaultValue={filters.courseCode} placeholder="例如 CS2001"
            autocapitalize="characters" spellcheck="false" />
        </label>
      </div>
    </details>
    {#if filters.type}<input type="hidden" name="type" value={filters.type} />{/if}
    {#if filters.tag}<input type="hidden" name="tag" value={filters.tag} />{/if}
    <button class="cm-btn">套用</button>
    {#if filtered || filters.courseCode}<a class="clear" href="/forum">清除</a>{/if}
  </form>

  <div class="chip-bar">
    <nav class="cm-chips types" aria-label="文章分類">
      {#each typeChips as chip (chip.key)}
        {@const n = data.counts[chip.key]}
        <!-- Empty categories stay ordinary chips (their page explains the empty state); only the 0 is muted. -->
        <a class="cm-chip" class:zero={n === 0} href={forumHref({ ...filters, type: chip.type, page: 1 })}
          aria-current={filters.type === chip.type ? 'true' : undefined}>
          {chip.label}{#if n !== null}<span class="n">{count(n)}</span>{/if}
        </a>
      {/each}
    </nav>
    <!-- The posts API orders by time only, so the order is stated instead of offering a sort control. -->
    <p class="chip-scope" id="list-order">{narrowed || filters.courseCode ? '數字為符合條件的篇數' : '數字為全站篇數'}<span class="sep">·</span>關鍵字比對標題與內文<span class="sep">·</span>依發文時間新到舊（目前只有這種排序）</p>
    {#if narrowed || filters.courseCode}
      <div class="cm-chips" role="group" aria-label="已套用的篩選">
        {#if filters.school}
          <a class="cm-chip remove" href={forumHref({ ...filters, school: '', courseCode: '', page: 1 })} aria-label="移除篩選：學校 {schoolNames[filters.school] ?? filters.school}">
            {schoolNames[filters.school] ?? filters.school}{#if filters.courseCode}&nbsp;<span class="mono">{filters.courseCode}</span>{/if} <span aria-hidden="true">×</span>
          </a>
        {/if}
        {#if filters.courseCode}
          <a class="cm-chip remove" href={forumHref({ ...filters, courseCode: '', page: 1 })} aria-label="移除篩選：課號 {filters.courseCode}">
            只看課號 <span class="mono">{filters.courseCode}</span> <span aria-hidden="true">×</span>
          </a>
        {/if}
        {#if filters.tag}
          <a class="cm-chip remove" href={forumHref({ ...filters, tag: '', page: 1 })} aria-label="移除篩選：標籤 {filters.tag}">#{filters.tag} <span aria-hidden="true">×</span></a>
        {/if}
        {#if filters.q}
          <a class="cm-chip remove" href={forumHref({ ...filters, q: '', page: 1 })} aria-label="移除篩選：關鍵字 {filters.q}">「{filters.q}」 <span aria-hidden="true">×</span></a>
        {/if}
      </div>
    {/if}
  </div>

  <section aria-labelledby="results" class="results">
    <h2 id="results" class="cm-sr">{filtered ? '符合的文章' : '最新文章'}（{total}）</h2>
    {#if data.posts.posts.length === 0}
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
      <CommunityPostList posts={data.posts.posts} {schoolNames} dense label={filtered ? '符合的文章' : '最新文章'} />
      {#if pages > 1}
        <footer class="pager">
          <p class="num">第 {fmt.format(first)}–{fmt.format(last)} 篇<span class="sep">·</span>共 {fmt.format(total)} 篇</p>
          <Pagination url={page.url} page={filters.page} totalPages={pages} label="文章分頁" />
        </footer>
      {/if}
      {#if !filtered && !filters.courseCode && total <= SPARSE_POSTS}
        <!-- A young forum: say so and point at the most useful next post. -->
        <aside class="sparse" aria-labelledby="sparse-title">
          {#if data.suggestions.length}
            {@const top = data.suggestions[0]}
            <!-- One course invitation in one line; more courses fold away, so the posts above stay the main content. -->
            <p class="invite">
              <b id="sparse-title">目前只有 {fmt.format(total)} 篇{#if data.counts.article === 0}，還沒有修課心得{/if}。</b>
              修過<a class="suggest-write" href={writeHref(top.school, top.courseCode)}>「{top.title}」</a><span class="muted">（{top.schoolName}・<span class="mono">{top.courseCode}</span>）</span>嗎？<a class="suggest-write" href={writeHref(top.school, top.courseCode)} aria-label={`寫「${top.title}」的心得`}>寫心得 <span aria-hidden="true">→</span></a>
            </p>
            {#if data.suggestions.length > 1}
              <details class="others">
                <summary>其他課程（{data.suggestions.length - 1}）<span aria-hidden="true">▾</span></summary>
                <ul class="suggest" aria-label="其他修課人數多的課">
                  {#each data.suggestions.slice(1) as entry (entry.school + entry.courseCode)}
                    <li>
                      <a class="suggest-write" href={writeHref(entry.school, entry.courseCode)}>寫「{entry.title}」的心得 <span aria-hidden="true">→</span></a>
                      <span class="muted">{entry.schoolName}・<span class="mono">{entry.courseCode}</span>{#if entry.enrolledTotal != null}・{entry.terms} 學期累計 {displayValue(entry.enrolledTotal)} 人次{/if}</span>
                    </li>
                  {/each}
                </ul>
                <a class="find" href="/">修的是別門課？先查課，從課程頁發文 →</a>
              </details>
            {/if}
          {:else}
            <p class="invite"><b id="sparse-title">目前只有 {fmt.format(total)} 篇。</b>從課程頁發文會自動帶上課號，修同一門課的人最容易找到。<a class="find" href="/">先查課 →</a></p>
          {/if}
        </aside>
      {/if}
    {/if}
  </section>
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
  /* Desktop: the scope fields sit inline in the toolbar; phones collapse them behind 課程範圍. */
  .scope { display: contents; }
  .scope summary { display: none; }
  .scope::details-content { display: contents; content-visibility: visible; }
  .scope-fields { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
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
  .cm-chip.zero .n { color: var(--muted); opacity: 0.75; }
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
  /* A quiet strip under the list: no frame that could read as a drop zone or a second list. */
  .sparse { display: grid; gap: var(--space-1); margin-block-start: var(--space-3); padding: var(--space-2) var(--space-4); border-inline-start: 3px solid var(--brand); border-radius: 0 var(--radius-control) var(--radius-control) 0; background: var(--panel); }
  .invite { color: var(--ink-2); font-size: var(--t-sm); line-height: 1.7; }
  .invite b { margin-inline-end: var(--space-1); color: var(--ink); font-weight: 650; }
  .invite .muted { color: var(--muted); }
  .suggest { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
  .suggest li { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); align-items: baseline; }
  .suggest-write { color: var(--brand-ink); font-weight: 600; }
  .suggest li .suggest-write { display: inline-flex; align-items: center; min-block-size: 2.25rem; }
  .suggest .muted { color: var(--muted); font-size: var(--t-sm); }
  .find { display: inline-flex; align-items: center; min-block-size: 2.25rem; color: var(--ink-2); font-size: var(--t-sm); font-weight: 500; }
  .others summary { display: inline-flex; gap: var(--space-1); align-items: center; min-block-size: 2.25rem; color: var(--ink-2); font-size: var(--t-sm); font-weight: 600; list-style: none; cursor: pointer; }
  .others summary::-webkit-details-marker { display: none; }
  .others[open] summary span { rotate: 180deg; }
  .chip-scope { margin: 0 !important; color: var(--muted); font-size: var(--t-xs); }
  .facts { display: flex; flex-wrap: wrap; gap: 0 0.35em; }
  .facts > span { white-space: nowrap; }
  .facts > span + span::before { content: '·'; margin-inline-end: 0.35em; color: var(--axis); }
  /* A real target next to the main button, not a stray small link. */
  .rules { display: inline-flex; gap: 0.35em; align-items: center; min-block-size: var(--target-min); padding-inline: var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-control); color: var(--ink-2); font-size: var(--t-sm); font-weight: 600; text-decoration: none; }
  .rules:hover { border-color: var(--control-line); background: var(--hover-row); color: var(--ink); }
  .scope-part b { font-weight: 600; color: var(--ink); }

  @media (max-width: 40rem) {
    .search { flex: 1 1 100%; }
    .scope { display: block; flex: 1 1 auto; min-inline-size: 0; }
    .scope summary { inline-size: 100%; }
    .scope summary::after { margin-inline-start: auto !important; padding-inline-start: var(--space-2); }
    .scope summary { gap: var(--space-3); }
    .scope-part { min-inline-size: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
    .toolbar > .cm-btn { flex: 0 0 auto; padding-inline: var(--space-5); }
    /* The description takes its own line; the counts follow without a dot at the line start. */
    .facts > span:first-child { flex-basis: 100%; }
    .facts > span:nth-child(2)::before { content: none; }
    .scope::details-content { display: block; content-visibility: auto; }
    .scope:not([open])::details-content { content-visibility: hidden; }
    .scope summary {
      display: inline-flex;
      align-items: center;
      max-inline-size: 100%;
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
    .scope summary::-webkit-details-marker { display: none; }
    .scope summary::after { content: '▾'; margin-inline-start: var(--space-2); color: var(--muted); }
    .scope[open] summary::after { content: '▴'; }
    .scope-fields { flex-basis: 100%; padding-block-start: var(--space-2); }
    .scope-fields :global(.field) { flex: 1 1 100%; }
    .scope-fields :global(.field select) { flex: 1; max-inline-size: none; }
    .code-field { flex: 1 1 100%; }
    .code-field input { flex: 1; inline-size: auto; }
    /* The removable chips below already clear each filter; the text link only adds a wrapped row here. */
    .toolbar > .clear { display: none; }
    /* Category chips scroll sideways rather than wrapping into a tall block. */
    .types {
      flex-wrap: nowrap;
      overflow-x: auto;
      scrollbar-width: none;
      margin-inline: calc(-1 * var(--space-4));
      padding-inline: var(--space-4);
      inline-size: calc(100% + 2 * var(--space-4));
      mask-image: linear-gradient(to right, #000 calc(100% - 2rem), transparent);
    }
  }
</style>
