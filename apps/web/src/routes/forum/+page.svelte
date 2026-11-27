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
      <input name="q" type="search" maxlength="100" defaultValue={filters.q} placeholder="搜尋標題與內文" />
    </label>
    <details class="scope" open={scopeCount > 0 || undefined}>
      <!-- Phones: one button for both fields; it names the chosen school and code once there are any. -->
      <summary>{#if scopeCount}<span class="scope-part">限定：<b>{[filters.school ? (schoolNames[filters.school] ?? filters.school) : '', filters.courseCode].filter(Boolean).join('・')}</b></span>{:else}<span class="scope-part">限定學校或課號</span>{/if}</summary>
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
        {#if n === 0 && filters.type !== chip.type}
          <!-- An empty category is plain text, not a link: there is nothing to open (still 4.5:1 contrast). -->
          <span class="cm-chip empty" title={`目前沒有${chip.label}`}>{chip.label}<span class="n">0</span></span>
        {:else}
          <a class="cm-chip" href={forumHref({ ...filters, type: chip.type, page: 1 })}
            aria-current={filters.type === chip.type ? 'true' : undefined}>
            {chip.label}{#if n !== null}<span class="n">{count(n)}</span>{/if}
          </a>
        {/if}
      {/each}
    </nav>
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
      <!-- How many posts the current filters match, and the one order the list has. -->
      <p class="list-head"><span>{filtered || filters.courseCode ? '符合目前條件' : '全部'} <b class="num">{fmt.format(total)}</b> 篇</span><span class="order">最新發文在前</span></p>
      <CommunityPostList posts={data.posts.posts} {schoolNames} courseTitles={data.courseTitles} dense label={filtered ? '符合的文章' : '最新文章'} />
      {#if pages > 1}
        <footer class="pager">
          <p class="num">第 {fmt.format(first)}–{fmt.format(last)} 篇<span class="sep">·</span>共 {fmt.format(total)} 篇</p>
          <Pagination url={page.url} page={filters.page} totalPages={pages} label="文章分頁" />
        </footer>
      {/if}
      {#if !filtered && !filters.courseCode && total <= SPARSE_POSTS}
        <!-- A young forum: a short, open list of well-attended courses to write about, apart from the results. -->
        <aside class="sparse" aria-labelledby="sparse-title">
          <h2 id="sparse-title">分享修課心得：這幾門課修的人最多</h2>
          {#if data.suggestions.length}
            <ul class="suggest" aria-label="修課人數多、還沒有心得的課">
              {#each data.suggestions as entry (entry.school + entry.courseCode)}
                <li>
                  <span class="suggest-course"><b>{entry.title}</b><span class="muted">{entry.schoolName}・<span class="mono">{entry.courseCode}</span>{#if entry.enrolledTotal != null}・{entry.terms} 學期累計 {displayValue(entry.enrolledTotal)} 人次{/if}</span></span>
                  <a class="suggest-write" href={writeHref(entry.school, entry.courseCode)} aria-label={`寫「${entry.title}」的心得`}>寫心得 <span aria-hidden="true">→</span></a>
                </li>
              {/each}
            </ul>
          {/if}
          <p class="find-line">修的是別門課？<a class="find" href="/">先查課，從課程頁發文會自動帶上課號 →</a></p>
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
  /* Suggestions are their own small section under the results, each course one row with its action. */
  .sparse { display: grid; gap: var(--space-2); margin-block-start: var(--space-6); }
  .sparse h2 { margin: 0; font-size: var(--t-lg); font-weight: 650; letter-spacing: var(--tracking-heading); }
  .suggest { display: grid; margin: 0; padding: 0; list-style: none; border: 1px solid var(--line); border-radius: var(--radius-panel); background: var(--panel-raised); }
  .suggest li { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-4); align-items: center; justify-content: space-between; padding: var(--space-2) var(--space-4); }
  .suggest li + li { border-block-start: 1px solid var(--line); }
  .suggest-course { display: grid; gap: 0; min-inline-size: 0; }
  .suggest-course b { color: var(--ink); font-weight: 600; }
  .suggest .muted { color: var(--muted); font-size: var(--t-sm); }
  .suggest-write { display: inline-flex; align-items: center; min-block-size: 2.25rem; padding-inline: var(--space-3); border: 1px solid var(--brand); border-radius: var(--radius-control); color: var(--brand-ink); font-size: var(--t-sm); font-weight: 600; text-decoration: none; white-space: nowrap; }
  .suggest-write:hover { background: var(--brand-wash); }
  .find-line { margin: 0 !important; color: var(--muted); font-size: var(--t-sm); }
  .find { color: var(--brand-ink); font-weight: 600; }
  .list-head { display: flex; flex-wrap: wrap; gap: 0 var(--space-3); justify-content: space-between; margin: 0 0 var(--space-2) !important; color: var(--ink-2); font-size: var(--t-sm); }
  .list-head b { color: var(--ink); font-weight: 650; }
  .list-head .order { color: var(--muted); }
  /* Empty category: muted plain text with a dashed outline, readable (ink-2) but clearly not a link. */
  .cm-chip.empty { border: 1px dashed var(--control-line); background: transparent; color: var(--ink-2) !important; cursor: default; }
  .cm-chip.empty:hover { background: transparent; }
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
    /* A disclosure, not a fake select: ＋/－ before the label, sized to its text. */
    .scope summary { gap: var(--space-2); }
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
    .scope summary::before { content: '＋'; color: var(--brand-ink); font-weight: 700; }
    .scope[open] summary::before { content: '－'; }
    .scope summary { border-style: dashed; border-radius: var(--radius-pill); }
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
